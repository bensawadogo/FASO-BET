import psycopg2, os
from urllib.parse import urlparse
from datetime import date

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Calendrier officiel CdM 2026 — matchs africains + chocs majeurs
WC2026_FIXTURES = [
    # JOUR 1 — 11 juin
    ("Mexico",      "South Africa",  date(2026,6,11), "Mexico City", False),
    # JOUR 2 — 12 juin
    ("Argentina",   "Algeria",       date(2026,6,12), "Dallas",      True),
    # JOUR 3 — 13 juin
    ("Brazil",      "Morocco",       date(2026,6,13), "Los Angeles", True),
    ("Ghana",       "Croatia",       date(2026,6,13), "Miami",       True),
    # JOUR 4 — 14 juin
    ("Egypt",       "New Zealand",   date(2026,6,14), "Atlanta",     True),
    ("Senegal",     "Norway",        date(2026,6,14), "New York",    True),
    # JOUR 5 — 15 juin
    ("Ivory Coast", "Curacao",       date(2026,6,15), "Houston",     True),
    ("Spain",       "Cape Verde",    date(2026,6,15), "Atlanta",     True),
    # JOUR 6 — 16 juin
    ("France",      "Senegal",       date(2026,6,16), "New York",    True),
    ("Belgium",     "Egypt",         date(2026,6,16), "Dallas",      True),
    ("Sweden",      "Tunisia",       date(2026,6,16), "San Jose",    True),
    # JOUR 7 — 17 juin
    ("Portugal",    "DR Congo",      date(2026,6,17), "Houston",     True),
    ("Germany",     "Ivory Coast",   date(2026,6,17), "New York",    True),
    # JOUR 8 — 18 juin
    ("Morocco",     "Scotland",      date(2026,6,18), "Boston",      True),
    ("Algeria",     "Austria",       date(2026,6,18), "San Jose",    True),
    # JOUR 9 — 19 juin
    ("South Africa","South Korea",   date(2026,6,19), "Dallas",      True),
    ("Tunisia",     "Japan",         date(2026,6,19), "Houston",     True),
    # JOUR 10 — 20 juin
    ("Netherlands", "Senegal",       date(2026,6,20), "Atlanta",     True),
    ("Ivory Coast", "Ecuador",       date(2026,6,20), "Miami",       True),
    # JOUR 11 — 21 juin
    ("Ghana",       "England",       date(2026,6,21), "Dallas",      True),
    ("DR Congo",    "Colombia",      date(2026,6,21), "Los Angeles", True),
    # JOUR 12 — 22 juin
    ("Egypt",       "Iran",          date(2026,6,22), "Seattle",     True),
    ("Cape Verde",  "Saudi Arabia",  date(2026,6,22), "Atlanta",     True),
    # JOUR 13 — 23 juin
    ("France",      "Iraq",          date(2026,6,23), "Philadelphia",True),
    ("Algeria",     "Jordan",        date(2026,6,23), "Kansas City", True),
    # JOUR 14 — 24 juin
    ("Brazil",      "Haiti",         date(2026,6,24), "San Francisco",True),
    # JOUR 15 — 25 juin
    ("Morocco",     "Haiti",         date(2026,6,25), "Boston",      True),
    ("Tunisia",     "Netherlands",   date(2026,6,25), "Houston",     True),
    ("Ivory Coast", "Germany",       date(2026,6,25), "Chicago",     True),
    # JOUR 16 — 26 juin
    ("France",      "Norway",        date(2026,6,26), "Boston",      True),
    ("Senegal",     "Iraq",          date(2026,6,26), "New York",    True),
    ("Egypt",       "Belgium",       date(2026,6,26), "Miami",       True),
    # JOUR 17 — 27 juin
    ("South Africa","Czech Republic",date(2026,6,27), "Kansas City", True),
    ("Ghana",       "Turkey",        date(2026,6,27), "Los Angeles", True),
    ("DR Congo",    "Portugal",      date(2026,6,27), "Houston",     True),
    ("Cape Verde",  "Spain",         date(2026,6,27), "Dallas",      True),
]

# Insérer dans predictions_internationalmatch
inserted = 0
for home, away, d, city, neutral in WC2026_FIXTURES:
    try:
        cur.execute("""
            INSERT INTO predictions_internationalmatch
            (home_team, away_team, match_date, tournament, city, neutral,
             home_score, away_score, country, home_logo, away_logo)
            VALUES (%s,%s,%s,%s,%s,%s,NULL,NULL,'United States',%s,%s)
            ON CONFLICT (home_team, away_team, match_date, tournament)
            DO NOTHING
        """, (home, away, d, "FIFA World Cup", city, neutral, "", ""))
        if cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"Erreur {home} vs {away}: {e}")

conn.commit()

# Vérification obligatoire
cur.execute("""
    SELECT COUNT(*) FROM predictions_internationalmatch
    WHERE tournament = 'FIFA World Cup'
    AND match_date >= '2026-06-11'
    AND home_score IS NULL
""")
count = cur.fetchone()[0]
print(f"Matchs CdM 2026 à prédire : {count}")

if count == 0:
    print("ERREUR : aucun match inséré")
    exit(1)

# Afficher les matchs africains
cur.execute("""
    SELECT home_team, away_team, match_date
    FROM predictions_internationalmatch
    WHERE tournament = 'FIFA World Cup'
    AND match_date >= '2026-06-11'
    AND (home_team IN ('Morocco','Algeria','Senegal','Egypt','Tunisia',
                       'Ivory Coast','Ghana','South Africa','DR Congo',
                       'Cape Verde')
      OR away_team IN ('Morocco','Algeria','Senegal','Egypt','Tunisia',
                       'Ivory Coast','Ghana','South Africa','DR Congo',
                       'Cape Verde'))
    ORDER BY match_date
""")
print("\nMATCHS AFRICAINS CdM 2026 :")
for row in cur.fetchall():
    print(f"  {row[2]} : {row[0]} vs {row[1]}")

cur.close()
conn.close()
