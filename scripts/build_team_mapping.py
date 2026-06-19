import pandas as pd, psycopg2, os
import os
from pathlib import Path
from urllib.parse import urlparse

CSV_DIR = Path("data/fdco")

# Collecter tous les noms d'équipes des CSV
fdco_teams = set()
for f in CSV_DIR.glob("*.csv"):
    try:
        df = pd.read_csv(f, encoding='latin-1', on_bad_lines='skip')
        if 'HomeTeam' in df.columns:
            fdco_teams.update(df['HomeTeam'].dropna().unique())
            fdco_teams.update(df['AwayTeam'].dropna().unique())
    except:
        pass

# Collecter tous les noms d'équipes de la base
db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("""
    SELECT DISTINCT home_team FROM predictions_match
    UNION
    SELECT DISTINCT away_team FROM predictions_match
""")
db_teams = set(row[0] for row in cur.fetchall())

print(f"Équipes dans CSV football-data.co.uk : {len(fdco_teams)}")
print(f"Équipes dans la base FasoBet : {len(db_teams)}")

# Trouver les équipes qui matchent exactement
exact_matches = fdco_teams & db_teams
print(f"Correspondances exactes : {len(exact_matches)}")
print(f"Exemples : {list(exact_matches)[:5]}")

# Équipes dans CSV sans correspondance en base
no_match = fdco_teams - db_teams
print(f"\nÉquipes CSV sans correspondance DB ({len(no_match)}) :")
for t in sorted(no_match)[:20]:
    print(f"  '{t}'")

cur.close()
conn.close()
