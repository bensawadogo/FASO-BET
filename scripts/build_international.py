import pandas as pd, psycopg2, os
import os
from pathlib import Path
from datetime import date
from urllib.parse import urlparse

CSV_PATH = Path("data/international/results.csv")
XG_PATH = Path("ml/data/statsbomb_xg.csv")

# Load xG lookup: (home, away, date) -> (xg_home, xg_away)
xg_lookup = {}
if XG_PATH.exists():
    df_xg = pd.read_csv(XG_PATH)
    for _, r in df_xg.iterrows():
        key = (r["home_team"], r["away_team"], str(pd.to_datetime(r["match_date"]).date()))
        xg_lookup[key] = (r["xg_home"], r["xg_away"])
    print(f"xG lookup charge : {len(xg_lookup)} matchs")
else:
    print("AVERTISSEMENT : statsbomb_xg.csv introuvable, pas d'enrichissement xG")
if not CSV_PATH.exists():
    print("ERREUR : data/international/results.csv introuvable")
    exit(1)

df = pd.read_csv(CSV_PATH)
df['date'] = pd.to_datetime(df['date']).dt.date
df = df.dropna(subset=['home_team','away_team','date'])
df = df.sort_values('date').reset_index(drop=True)

# Filtrer : uniquement depuis 2000 (données plus fiables)
df = df[df['date'] >= date(2000, 1, 1)]
print(f"Matchs depuis 2000 : {len(df)}")

if len(df) == 0:
    print("ERREUR : aucun match depuis 2000")
    exit(1)

# Convertir en liste de dicts pour les calculs Python
matches = df.to_dict('records')

# Initialiser ELO
elo = {}
def get_elo(team):
    return elo.get(team, 1500.0)

def get_form(team, before_date, n=5, tournaments=None):
    history = []
    for m in matches:
        if m['date'] >= before_date:
            continue
        if pd.isna(m.get('home_score')) or pd.isna(m.get('away_score')):
            continue
        is_home = m['home_team'] == team
        is_away = m['away_team'] == team
        if not (is_home or is_away):
            continue
        if tournaments and m.get('tournament') not in tournaments:
            continue
        history.append(m)
    recent = history[-n:]
    if not recent:
        return 0.5
    wins = sum(
        1 for m in recent
        if (m['home_team']==team and m['home_score'] > m['away_score'])
        or (m['away_team']==team and m['away_score'] > m['home_score'])
    )
    return round(wins / len(recent), 4)

def get_h2h(home, away, before_date, n=5):
    h2h = [
        m for m in matches
        if ((m['home_team']==home and m['away_team']==away)
            or (m['home_team']==away and m['away_team']==home))
        and m['date'] < before_date
        and pd.notna(m.get('home_score'))
    ][-n:]
    if not h2h:
        return 0.5
    wins = sum(
        1 for m in h2h
        if (m['home_team']==home and m['home_score'] > m['away_score'])
        or (m['away_team']==home and m['away_score'] > m['home_score'])
    )
    return round(wins / len(h2h), 4)

# WC_TOURNAMENTS
WC_TOURNAMENTS = [
    'FIFA World Cup', 'FIFA World Cup qualification',
    'Confederations Cup', 'UEFA Euro', 'Copa América',
    'Africa Cup of Nations', 'African Cup of Nations qualification',
    'CHAN'
]

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

inserted = 0
features_built = 0

for i, m in enumerate(matches):
    try:
        home_score = int(m['home_score']) if pd.notna(m.get('home_score')) else None
        away_score = int(m['away_score']) if pd.notna(m.get('away_score')) else None

        # Insérer le match
        cur.execute("""
            INSERT INTO predictions_internationalmatch
            (home_team, away_team, home_score, away_score,
             match_date, tournament, city, country, neutral)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (home_team, away_team, match_date, tournament)
            DO NOTHING
            RETURNING id
        """, (
            m['home_team'], m['away_team'],
            home_score, away_score,
            m['date'], m.get('tournament',''),
            m.get('city',''), m.get('country',''),
            bool(m.get('neutral', False))
        ))
        row = cur.fetchone()
        if not row:
            # Match might already exist, get its ID
            cur.execute("""
                SELECT id FROM predictions_internationalmatch
                WHERE home_team=%s AND away_team=%s AND match_date=%s AND tournament=%s
            """, (m['home_team'], m['away_team'], m['date'], m.get('tournament','')))
            row = cur.fetchone()
            if not row: continue
        
        match_db_id = row[0]
        inserted += 1

        # Calculer les features si le match a un résultat
        if home_score is not None and away_score is not None:
            elo_h = get_elo(m['home_team'])
            elo_a = get_elo(m['away_team'])

            form_h = get_form(m['home_team'], m['date'])
            form_a = get_form(m['away_team'], m['date'])
            form_wc_h = get_form(m['home_team'], m['date'], tournaments=WC_TOURNAMENTS)
            form_wc_a = get_form(m['away_team'], m['date'], tournaments=WC_TOURNAMENTS)
            h2h = get_h2h(m['home_team'], m['away_team'], m['date'])

            # Label
            if home_score > away_score: label = 'HOME'
            elif home_score < away_score: label = 'AWAY'
            else: label = 'DRAW'

            # Lookup xG
            xg_key_homefirst = (m['home_team'], m['away_team'], str(m['date']))
            xg_key_awayfirst = (m['away_team'], m['home_team'], str(m['date']))
            if xg_key_homefirst in xg_lookup:
                xg_h, xg_a = xg_lookup[xg_key_homefirst]
            elif xg_key_awayfirst in xg_lookup:
                xg_a, xg_h = xg_lookup[xg_key_awayfirst]
            else:
                xg_h, xg_a = None, None

            cur.execute("""
                INSERT INTO predictions_internationalfeatures
                (match_id, elo_home, elo_away, form_home, form_away,
                 form_wc_home, form_wc_away, h2h_wins,
                 home_neutral, label, xg_home, xg_away, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
            """, (
                match_db_id, elo_h, elo_a,
                form_h, form_a, form_wc_h, form_wc_a,
                h2h, bool(m.get('neutral',False)), label,
                xg_h, xg_a
            ))
            features_built += 1

            # Mettre à jour ELO
            K = 32
            exp_h = 1 / (1 + 10**((elo_a - elo_h)/400))
            res = 1 if home_score > away_score else (0.5 if home_score == away_score else 0)
            elo[m['home_team']] = elo_h + K*(res - exp_h)
            elo[m['away_team']] = elo_a + K*((1-res) - (1-exp_h))

        if i % 1000 == 0:
            conn.commit()
            print(f"Traité {i}/{len(matches)} — insérés:{inserted} features:{features_built}")

    except Exception as e:
        print(f"Erreur {m['home_team']} vs {m['away_team']}: {e}")
        conn.rollback()
        continue

conn.commit()

# VÉRIFICATION FINALE
cur.execute("SELECT COUNT(*) FROM predictions_internationalmatch")
m_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM predictions_internationalfeatures WHERE label IS NOT NULL")
f_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(elo_home) FROM predictions_internationalfeatures WHERE elo_home IS NOT NULL")
elo_count = cur.fetchone()[0]

print(f"\n{'='*40}")
print(f"Matchs importés     : {m_count}")
print(f"Features calculées  : {f_count}")
print(f"Avec ELO réel       : {elo_count}")

if m_count == 0:
    print("ERREUR CRITIQUE : aucun match importé")
    exit(1)
if f_count == 0:
    print("ERREUR CRITIQUE : aucune feature calculée")
    exit(1)

cur.close()
conn.close()
