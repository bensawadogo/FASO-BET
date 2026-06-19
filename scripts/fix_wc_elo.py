import psycopg2, os, csv
from pathlib import Path
from datetime import date

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_prod@postgres/fasobet')
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Step 1: Load international results
CSV_PATH = Path("data/international/results.csv")
if not CSV_PATH.exists():
    print("ERROR: data/international/results.csv not found")
    exit(1)

matches = []
with open(CSV_PATH, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['date'] and row['home_team'] and row['away_team']:
            matches.append(row)

print(f"Loaded {len(matches)} international matches")

# Step 2: Calculate ELO from 2000 onwards (same logic as build_international.py)
matches_sorted = sorted(
    [m for m in matches if m['date'] >= '2000-01-01'],
    key=lambda x: x['date']
)
print(f"Matches since 2000: {len(matches_sorted)}")

elo = {}
def get_elo(team):
    return elo.get(team, 1500.0)

for m in matches_sorted:
    try:
        home_score = int(m['home_score']) if m.get('home_score') else None
        away_score = int(m['away_score']) if m.get('away_score') else None
        if home_score is None or away_score is None:
            continue
        
        elo_h = get_elo(m['home_team'])
        elo_a = get_elo(m['away_team'])
        
        K = 32
        exp_h = 1 / (1 + 10**((elo_a - elo_h)/400))
        res = 1 if home_score > away_score else (0.5 if home_score == away_score else 0)
        elo[m['home_team']] = elo_h + K*(res - exp_h)
        elo[m['away_team']] = elo_a + K*((1-res) - (1-exp_h))
    except:
        continue

print(f"Teams with ELO history: {len(elo)}")

# Step 3: Show some sample ELOs
for team in sorted(elo.keys()):
    if team in ['Qatar', 'Switzerland', 'Canada', 'Bosnia & Herzegovina']:
        print(f"  {team}: {elo[team]:.0f}")

# Step 4: Update WC 2026 match features
cur.execute("""
    SELECT m.id, m.home_team, m.away_team
    FROM predictions_match m
    JOIN predictions_matchfeatures mf ON mf.match_id = m.id
    WHERE m.kickoff_utc >= CURRENT_DATE
      AND mf.elo_home = 1500 AND mf.elo_away = 1500
""")
wc_matches = cur.fetchall()
print(f"\nWC matches to fix: {len(wc_matches)}")

updated = 0
for match_id, home, away in wc_matches:
    elo_h = elo.get(home, 1500.0)
    elo_a = elo.get(away, 1500.0)
    
    # Calculate implied probability from ELO
    odds_h = round(1.0 / (1 + 10**((elo_a - elo_h)/400.0)), 6)
    
    cur.execute("""
        UPDATE predictions_matchfeatures
        SET elo_home=%s, elo_away=%s, odds_implied_home=%s
        WHERE match_id=%s
    """, (elo_h, elo_a, odds_h, match_id))
    print(f"  {home} (ELO {elo_h:.0f}) vs {away} (ELO {elo_a:.0f}) odds_home={odds_h}")
    updated += 1

conn.commit()
print(f"\nUpdated: {updated}/{len(wc_matches)}")

if updated == 0 and wc_matches:
    print("ERROR: no WC matches were updated — check team name matching")
    # Debug: show all WC match team names
    for mid, h, a in wc_matches:
        in_elo_h = h in elo
        in_elo_a = a in elo
        if not in_elo_h or not in_elo_a:
            print(f"  Missing: {h}({in_elo_h}) vs {a}({in_elo_a})")

cur.close()
conn.close()