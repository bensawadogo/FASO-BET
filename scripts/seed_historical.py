import os
import requests
import psycopg2
from datetime import datetime

# Configuration base de données via variables d'environnement
DB_NAME = os.environ.get('POSTGRES_DB', 'fasobet')
DB_USER = os.environ.get('POSTGRES_USER', 'fasobet')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod')
DB_HOST = 'postgres'

# Saisons et Ligues cibles
SEASONS = ["2018-19", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
LEAGUES = {
    "en.1": "Premier League",
    "es.1": "La Liga",
    "de.1": "Bundesliga",
    "it.1": "Serie A",
    "fr.1": "Ligue 1"
}

def seed():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST)
    cur = conn.cursor()
    print("Début du seeding historique...")

    for season in SEASONS:
        for league_code, competition in LEAGUES.items():
            url = f"https://raw.githubusercontent.com/openfootball/football.json/master/{season}/{league_code}.json"
            try:
                r = requests.get(url, timeout=10)
                if r.status_code != 200: continue
                data = r.json()
                
                count = 0
                for match in data.get("matches", []):
                    home = match["team1"]
                    away = match["team2"]
                    date_str = match["date"]
                    
                    # Scores
                    score = match.get("score")
                    h_score = score["ft"][0] if score and "ft" in score else None
                    a_score = score["ft"][1] if score and "ft" in score else None
                    status = "finished" if h_score is not None else "upcoming"

                    # external_id unique pour ON CONFLICT
                    external_id = f"{league_code}_{season}_{date_str}_{home}_{away}"

                    # Insertion uniquement dans les colonnes existantes
                    cur.execute("""
                        INSERT INTO predictions_match 
                        (external_id, home_team, away_team, home_score, away_score, kickoff_utc, competition, status, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT (external_id) DO NOTHING;
                    """, (external_id, home, away, h_score, a_score, date_str, competition, status))
                    
                    if cur.rowcount > 0: count += 1
                
                print(f"Ligue {competition} saison {season} : {count} matchs insérés")
                conn.commit()
            except Exception as e:
                print(f"Erreur {season}/{league_code}: {e}")
                conn.rollback()

    # Requête finale demandée
    print("\n--- Résultat Final (Source = 'openfootball' simulée par external_id) ---")
    cur.execute("""
        SELECT competition, season, COUNT(*) as total
        FROM (
            SELECT competition, 
                   substring(external_id from 6 for 7) as season 
            FROM predictions_match
        ) sub
        GROUP BY competition, season
        ORDER BY competition, season;
    """)
    for row in cur.fetchall():
        print(f"{row[0]} | {row[1]} | {row[2]}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
