import psycopg2, os
import os
from urllib.parse import urlparse
from datetime import timedelta

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Vérification préalable
cur.execute("SELECT COUNT(*) FROM predictions_fdcoodds WHERE odds_pin_home IS NOT NULL")
fdco_count = cur.fetchone()[0]
print(f"Lignes fdco_odds avec cotes Pinnacle : {fdco_count}")
if fdco_count == 0:
    print("ERREUR : fdco_odds vide ou sans cotes. Lancer import_fdco.py d'abord.")
    exit(1)

# Activer pg_trgm si pas encore fait
try:
    cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    conn.commit()
    print("Extension pg_trgm : OK")
except Exception as e:
    print(f"pg_trgm non disponible : {e}")
    conn.rollback()

# Matching via date exacte + similarity sur noms
# On priorise 1XBet, sinon Pinnacle, sinon Avg
cur.execute("""
    WITH matched AS (
        SELECT
            mf.match_id,
            COALESCE(f.odds_1xb_home, f.odds_pin_home, f.odds_avg_home) as final_odds_home,
            COALESCE(f.odds_1xb_draw, f.odds_pin_draw, f.odds_avg_draw) as final_odds_draw,
            COALESCE(f.odds_1xb_away, f.odds_pin_away, f.odds_avg_away) as final_odds_away
        FROM predictions_matchfeatures mf
        JOIN predictions_match m ON mf.match_id = m.id
        JOIN predictions_fdcoodds f
          ON f.match_date = m.kickoff_utc::date
          AND (
            f.home_team_fdco % m.home_team
            OR
            LOWER(f.home_team_fdco) LIKE '%' || LOWER(SPLIT_PART(m.home_team, ' ', 1)) || '%'
          )
        WHERE mf.odds_home IS NULL
           OR mf.odds_home IN (2.5, 1.9, 4.0)  -- valeurs par défaut à remplacer
    )
    UPDATE predictions_matchfeatures mf
    SET
        odds_home = matched.final_odds_home,
        odds_draw = matched.final_odds_draw,
        odds_away = matched.final_odds_away,
        odds_implied_home = CASE WHEN matched.final_odds_home > 0
            THEN ROUND((1.0 / matched.final_odds_home)::numeric, 6) ELSE NULL END,
        odds_implied_draw = CASE WHEN matched.final_odds_draw > 0
            THEN ROUND((1.0 / matched.final_odds_draw)::numeric, 6) ELSE NULL END,
        odds_implied_away = CASE WHEN matched.final_odds_away > 0
            THEN ROUND((1.0 / matched.final_odds_away)::numeric, 6) ELSE NULL END,
        odds_margin = CASE
            WHEN matched.final_odds_home > 0 AND matched.final_odds_away > 0
            THEN ROUND((1.0/matched.final_odds_home - 1.0/matched.final_odds_away)::numeric, 6)
            ELSE NULL END
    FROM matched
    WHERE mf.match_id = matched.match_id
""")

updated = cur.rowcount
conn.commit()
print(f"match_features mis à jour avec vraies cotes : {updated} lignes")

# VÉRIFICATION FINALE
cur.execute("""
    SELECT
        COUNT(*) as total,
        COUNT(odds_home) as avec_cotes,
        COUNT(CASE WHEN odds_home NOT IN (2.5, 1.9, 4.0) THEN 1 END) as vraies_cotes,
        ROUND(AVG(odds_home)::numeric, 3) as moy_odds_home
    FROM predictions_matchfeatures
""")
row = cur.fetchone()
print(f"\nVérification match_features :")
print(f"  Total : {row[0]}")
print(f"  Avec cotes : {row[1]}")
print(f"  Vraies cotes (non-défaut) : {row[2]}")
print(f"  Moy odds home : {row[3]}")

if row[2] == 0:
    print("AVERTISSEMENT : aucune vraie cote injectée. Vérifier le matching d'équipes.")

cur.close()
conn.close()
