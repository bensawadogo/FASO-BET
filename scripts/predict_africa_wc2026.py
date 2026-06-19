import joblib, glob, pandas as pd, psycopg2, os
import os
from urllib.parse import urlparse

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Charger les modèles
xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))

if not xgb_files:
    print("ERREUR : aucun modèle international. Lancer train_international.py")
    exit(1)

xgb = joblib.load(xgb_files[-1])
lgbm = joblib.load(lgbm_files[-1])
le = joblib.load(le_files[-1])

FEATURES = ['elo_home','elo_away','form_home','form_away',
            'form_wc_home','form_wc_away','h2h_wins']

AFRICAN_TEAMS = ['Morocco','Algeria','Senegal','Egypt','Tunisia',
                 'Ivory Coast','Ghana','South Africa','DR Congo','Cape Verde']

def get_latest_elo(team, cur):
    cur.execute("""
        SELECT f.elo_home FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE m.home_team = %s AND f.elo_home IS NOT NULL
        ORDER BY m.match_date DESC LIMIT 1
    """, (team,))
    r = cur.fetchone()
    if r: return float(r[0])
    cur.execute("""
        SELECT f.elo_away FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE m.away_team = %s AND f.elo_away IS NOT NULL
        ORDER BY m.match_date DESC LIMIT 1
    """, (team,))
    r = cur.fetchone()
    return float(r[0]) if r else 1500.0

def get_recent_form(team, cur, n=5):
    cur.execute("""
        SELECT
            CASE WHEN m.home_team = %s AND f.label = 'HOME' THEN 1
                 WHEN m.away_team = %s AND f.label = 'AWAY' THEN 1
                 ELSE 0 END as win
        FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE (m.home_team = %s OR m.away_team = %s)
        AND f.label IS NOT NULL
        ORDER BY m.match_date DESC LIMIT %s
    """, (team, team, team, team, n))
    rows = cur.fetchall()
    if not rows: return 0.5
    return round(sum(r[0] for r in rows) / len(rows), 4)

# Récupérer les matchs africains à prédire
cur.execute("""
    SELECT id, home_team, away_team, match_date, city
    FROM predictions_internationalmatch
    WHERE tournament = 'FIFA World Cup'
    AND match_date >= '2026-06-11'
    AND home_score IS NULL
    AND (home_team = ANY(%s) OR away_team = ANY(%s))
    ORDER BY match_date
""", (AFRICAN_TEAMS, AFRICAN_TEAMS))

matchs = cur.fetchall()
print(f"\n{'='*60}")
print(f"FASOBET — PRÉDICTIONS CdM 2026 — ÉQUIPES AFRICAINES")
print(f"Modèle : XGBoost+LightGBM | Accuracy historique : 52.44%")
print(f"{'='*60}\n")

results = []
for match_id, home, away, d, city in matchs:
    elo_h = get_latest_elo(home, cur)
    elo_a = get_latest_elo(away, cur)
    form_h = get_recent_form(home, cur)
    form_a = get_recent_form(away, cur)

    feats = {
        'elo_home': elo_h, 'elo_away': elo_a,
        'form_home': form_h, 'form_away': form_a,
        'form_wc_home': form_h, 'form_wc_away': form_a,
        'h2h_wins': 0.5
    }
    X = pd.DataFrame([feats])[FEATURES]
    xgb_p = xgb.predict_proba(X)[0]
    lgbm_p = lgbm.predict_proba(X)[0]
    ens = xgb_p * 0.45 + lgbm_p * 0.55

    labels = le.classes_
    idx = ens.argmax()
    pred = labels[idx]
    conf = round(float(ens[idx]) * 100, 1)

    # Identifier l'équipe africaine
    african = home if home in AFRICAN_TEAMS else away
    flag = "🌍"

    result_line = {
        "date": str(d),
        "match": f"{home} vs {away}",
        "african_team": african,
        "prediction": pred,
        "confidence": conf,
        "HOME": round(float(ens[list(labels).index('HOME')])*100,1) if 'HOME' in labels else 0,
        "DRAW": round(float(ens[list(labels).index('DRAW')])*100,1) if 'DRAW' in labels else 0,
        "AWAY": round(float(ens[list(labels).index('AWAY')])*100,1) if 'AWAY' in labels else 0,
    }
    results.append(result_line)

    print(f"{flag} {d} | {home} vs {away}")
    print(f"   ELO : {home}={elo_h:.0f} vs {away}={elo_a:.0f}")
    print(f"   HOME {result_line['HOME']}% | DRAW {result_line['DRAW']}% | AWAY {result_line['AWAY']}%")
    print(f"   → {pred} ({conf}%)")
    print()

# Résumé africain
print(f"{'='*60}")
print(f"RÉSUMÉ AFRIQUE — {len(matchs)} matchs analysés")
home_wins = sum(1 for r in results
    if (r['prediction']=='HOME' and r['african_team']==r['match'].split(' vs ')[0])
    or (r['prediction']=='AWAY' and r['african_team']==r['match'].split(' vs ')[1]))
draws = sum(1 for r in results if r['prediction']=='DRAW')
losses = len(results) - home_wins - draws
print(f"  Victoires africaines prédites : {home_wins}")
print(f"  Nuls prédits                  : {draws}")
print(f"  Défaites prédites             : {losses}")
print(f"{'='*60}")

cur.close()
conn.close()
