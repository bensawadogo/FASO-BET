import pandas as pd, psycopg2, os
import os
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

CSV_DIR = Path("data/fdco")

LEAGUE_MAP = {
    "E0": "Premier League",
    "SP1": "La Liga",
    "D1": "Bundesliga",
    "I1": "Serie A",
    "F1": "Ligue 1",
}

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

total_inserted = 0
total_skipped = 0

for csv_file in sorted(CSV_DIR.glob("*.csv")):
    parts = csv_file.stem.split("_")
    if len(parts) != 2:
        continue
    league_code, season_raw = parts
    competition = LEAGUE_MAP.get(league_code, league_code)

    # Format saison : "2324" → "2023-24"
    season = f"20{season_raw[:2]}-{season_raw[2:]}"

    try:
        df = pd.read_csv(csv_file, encoding='latin-1', on_bad_lines='skip')
    except Exception as e:
        print(f"  ❌ Erreur lecture {csv_file.name}: {e}")
        continue

    # Colonnes obligatoires
    required = ['Date', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG']
    if not all(c in df.columns for c in required):
        print(f"  ❌ Colonnes manquantes dans {csv_file.name}")
        continue

    df = df.dropna(subset=['HomeTeam', 'AwayTeam', 'Date'])

    inserted = 0
    for _, row in df.iterrows():
        try:
            # Parser la date (format dd/mm/yy ou dd/mm/yyyy)
            date_str = str(row['Date']).strip()
            for fmt in ['%d/%m/%y', '%d/%m/%Y']:
                try:
                    match_date = datetime.strptime(date_str, fmt).date()
                    break
                except:
                    continue
            else:
                continue

            # Extraire les cotes (None si colonne absente)
            def safe_float(val):
                try:
                    f = float(val)
                    return f if f > 0 else None
                except:
                    return None

            cur.execute("""
                INSERT INTO predictions_fdcoodds
                (home_team_fdco, away_team_fdco, match_date,
                 competition, season, fthg, ftag,
                 odds_1xb_home, odds_1xb_draw, odds_1xb_away,
                 odds_pin_home, odds_pin_draw, odds_pin_away,
                 odds_avg_home, odds_avg_draw, odds_avg_away,
                 home_shots, away_shots,
                 home_shots_target, away_shots_target,
                 home_corners, away_corners)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (home_team_fdco, away_team_fdco, match_date)
                DO NOTHING
            """, (
                str(row['HomeTeam']).strip(),
                str(row['AwayTeam']).strip(),
                match_date,
                competition, season,
                int(row['FTHG']) if pd.notna(row.get('FTHG')) else None,
                int(row['FTAG']) if pd.notna(row.get('FTAG')) else None,
                safe_float(row.get('1XBH')),
                safe_float(row.get('1XBD')),
                safe_float(row.get('1XBA')),
                safe_float(row.get('PSH') or row.get('PH')),
                safe_float(row.get('PSD') or row.get('PD')),
                safe_float(row.get('PSA') or row.get('PA')),
                safe_float(row.get('AvgH')),
                safe_float(row.get('AvgD')),
                safe_float(row.get('AvgA')),
                int(row['HS']) if pd.notna(row.get('HS')) else None,
                int(row['AS']) if pd.notna(row.get('AS')) else None,
                int(row['HST']) if pd.notna(row.get('HST')) else None,
                int(row['AST']) if pd.notna(row.get('AST')) else None,
                int(row['HC']) if pd.notna(row.get('HC')) else None,
                int(row['AC']) if pd.notna(row.get('AC')) else None
            ))
            inserted += 1

        except Exception as e:
            total_skipped += 1
            continue

    conn.commit()
    total_inserted += inserted
    print(f"  ✅ {competition} {season} : {inserted} matchs insérés")

# VÉRIFICATION FINALE OBLIGATOIRE
cur.execute("SELECT COUNT(*) FROM predictions_fdcoodds")
count = cur.fetchone()[0]
print(f"\nTotal en base fdco_odds : {count}")

cur.execute("""
    SELECT COUNT(*) FROM predictions_fdcoodds
    WHERE odds_1xb_home IS NOT NULL
""")
with_1xb = cur.fetchone()[0]
print(f"Avec cotes 1XBet : {with_1xb}")

cur.execute("""
    SELECT COUNT(*) FROM predictions_fdcoodds
    WHERE odds_pin_home IS NOT NULL
""")
with_pin = cur.fetchone()[0]
print(f"Avec cotes Pinnacle : {with_pin}")

if count == 0:
    print("ERREUR CRITIQUE : aucune donnée insérée")
    exit(1)

cur.close()
conn.close()
