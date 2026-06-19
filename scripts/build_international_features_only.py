import pandas as pd, psycopg2, os
from pathlib import Path
from datetime import date

CSV_PATH = Path("data/international/results.csv")
df = pd.read_csv(CSV_PATH)
df['date'] = pd.to_datetime(df['date']).dt.date
df = df.dropna(subset=['home_team','away_team','date'])
df = df.sort_values('date').reset_index(drop=True)
df = df[df['date'] < date(2026, 1, 1)]  # Only historical
matches = df.to_dict('records')

elo = {}
def get_elo(team): return elo.get(team, 1500.0)

def get_form(team, before_date, n=5, tournaments=None):
    history = []
    for m in matches:
        if m['date'] >= before_date: continue
        if pd.isna(m.get('home_score')) or pd.isna(m.get('away_score')): continue
        is_home = m['home_team'] == team
        is_away = m['away_team'] == team
        if not (is_home or is_away): continue
        if tournaments and m.get('tournament') not in tournaments: continue
        history.append(m)
    recent = history[-n:]
    if not recent: return 0.5
    wins = sum(1 for m in recent
        if (m['home_team']==team and m['home_score'] > m['away_score'])
        or (m['away_team']==team and m['away_score'] > m['home_score']))
    return round(wins / len(recent), 4)

def get_h2h(home, away, before_date, n=5):
    h2h = [m for m in matches
        if ((m['home_team']==home and m['away_team']==away)
            or (m['home_team']==away and m['away_team']==home))
        and m['date'] < before_date
        and pd.notna(m.get('home_score'))][-n:]
    if not h2h: return 0.5
    wins = sum(1 for m in h2h
        if (m['home_team']==home and m['home_score'] > m['away_score'])
        or (m['away_team']==home and m['away_score'] > m['home_score']))
    return round(wins / len(h2h), 4)

WC_TOURNAMENTS = ['FIFA World Cup', 'FIFA World Cup qualification', 'Confederations Cup',
    'UEFA Euro', 'Copa América', 'Africa Cup of Nations', 'African Cup of Nations qualification', 'CHAN']

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Build ELO from historical data
print("Building ELO ratings...")
for m in matches:
    if pd.isna(m.get('home_score')) or pd.isna(m.get('away_score')): continue
    home_score = int(m['home_score'])
    away_score = int(m['away_score'])
    elo_h = get_elo(m['home_team'])
    elo_a = get_elo(m['away_team'])
    K = 32
    exp_h = 1 / (1 + 10**((elo_a - elo_h)/400))
    res = 1 if home_score > away_score else (0.5 if home_score == away_score else 0)
    elo[m['home_team']] = elo_h + K*(res - exp_h)
    elo[m['away_team']] = elo_a + K*((1-res) - (1-exp_h))

print(f"Built ELO for {len(elo)} teams")

# Get WC2026 matches without features
cur.execute("""
    SELECT m.id, m.home_team, m.away_team, m.match_date, m.neutral
    FROM predictions_internationalmatch m
    LEFT JOIN predictions_internationalfeatures f ON f.match_id = m.id
    WHERE m.tournament = 'FIFA World Cup' AND m.match_date >= '2026-01-01'
    AND f.id IS NULL
""")
upcoming = cur.fetchall()
print(f"WC2026 matches without features: {len(upcoming)}")

inserted = 0
for match_id, home_team, away_team, match_date, neutral in upcoming:
    elo_h = get_elo(home_team)
    elo_a = get_elo(away_team)
    form_h = get_form(home_team, match_date)
    form_a = get_form(away_team, match_date)
    form_wc_h = get_form(home_team, match_date, tournaments=WC_TOURNAMENTS)
    form_wc_a = get_form(away_team, match_date, tournaments=WC_TOURNAMENTS)
    h2h = get_h2h(home_team, away_team, match_date)

    cur.execute("""
        INSERT INTO predictions_internationalfeatures
        (match_id, elo_home, elo_away, form_home, form_away,
         form_wc_home, form_wc_away, h2h_wins, home_neutral, label, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL, CURRENT_TIMESTAMP)
        ON CONFLICT (match_id) DO NOTHING
    """, (match_id, elo_h, elo_a, form_h, form_a, form_wc_h, form_wc_a, h2h, neutral))
    inserted += 1

conn.commit()
print(f"Inserted {inserted} features for WC2026 matches")

cur.execute("SELECT COUNT(*) FROM predictions_internationalfeatures WHERE elo_home IS NOT NULL")
f_count = cur.fetchone()[0]
print(f"Total features with ELO: {f_count}")

cur.close()
conn.close()
