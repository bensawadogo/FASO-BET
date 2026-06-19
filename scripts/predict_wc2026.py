import joblib, glob, pandas as pd, psycopg2, os
import os
from urllib.parse import urlparse
from datetime import date

WC2026_MATCHES = [
    ("Morocco", "Croatia", "2026-06-13", "FIFA World Cup"),
    ("Senegal", "Netherlands", "2026-06-14", "FIFA World Cup"),
    ("Argentina", "Saudi Arabia", "2026-06-15", "FIFA World Cup"),
    ("France", "Australia", "2026-06-16", "FIFA World Cup"),
    ("Brazil", "Serbia", "2026-06-17", "FIFA World Cup"),
    ("Portugal", "Ghana", "2026-06-18", "FIFA World Cup"),
    ("Cameroon", "Switzerland", "2026-06-19", "FIFA World Cup"),
    ("Mali", "South Korea", "2026-06-20", "FIFA World Cup"),
    ("Nigeria", "Poland", "2026-06-21", "FIFA World Cup"),
    ("Ivory Coast", "Wales", "2026-06-22", "FIFA World Cup"),
]

# Charger le dernier modèle international
xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))

if not xgb_files:
    print("ERREUR : aucun modèle international. Lancer train_international.py")
    exit(1)

xgb_model = joblib.load(xgb_files[-1])
lgbm_model = joblib.load(lgbm_files[-1])
le = joblib.load(le_files[-1])

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

FEATURES = [
    'elo_home', 'elo_away',
    'form_home', 'form_away',
    'form_wc_home', 'form_wc_away',
    'h2h_wins'
]

def get_team_elo(team, cur):
    # Dernier ELO calculé pour l'équipe
    cur.execute("""
        SELECT f.elo_home FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE m.home_team = %s AND f.elo_home IS NOT NULL
        ORDER BY m.match_date DESC LIMIT 1
    """, (team,))
    row = cur.fetchone()
    if row: return float(row[0])
    cur.execute("""
        SELECT f.elo_away FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE m.away_team = %s AND f.elo_away IS NOT NULL
        ORDER BY m.match_date DESC LIMIT 1
    """, (team,))
    row = cur.fetchone()
    return float(row[0]) if row else 1500.0

print(f"\n{'='*50}")
print(f"PRÉDICTIONS COUPE DU MONDE 2026 — FasoBet")
print(f"{'='*50}\n")

for home, away, match_date, tournament in WC2026_MATCHES:
    elo_h = get_team_elo(home, cur)
    elo_a = get_team_elo(away, cur)

    # Features simplifiées pour les matchs futurs
    features = {
        'elo_home': elo_h, 'elo_away': elo_a,
        'form_home': 0.5, 'form_away': 0.5,
        'form_wc_home': 0.5, 'form_wc_away': 0.5,
        'h2h_wins': 0.5
    }

    X = pd.DataFrame([features])[FEATURES]
    xgb_proba = xgb_model.predict_proba(X)[0]
    lgbm_proba = lgbm_model.predict_proba(X)[0]
    ensemble = (xgb_proba * 0.45 + lgbm_proba * 0.55)

    labels = le.classes_
    idx = ensemble.argmax()

    print(f"{home} vs {away} ({match_date})")
    print(f"  ELO : {home}={elo_h:.0f} / {away}={elo_a:.0f}")
    for i, lab in enumerate(labels):
        print(f"  {lab}: {ensemble[i]*100:.1f}%")
    print(f"  → PRÉDICTION : {labels[idx].upper()} ({ensemble[idx]*100:.1f}%)")
    print()

cur.close()
conn.close()
