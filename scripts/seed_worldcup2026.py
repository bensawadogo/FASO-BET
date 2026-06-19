import httpx, asyncio, psycopg2, os, json, uuid
import os
from datetime import datetime
from urllib.parse import urlparse

async def seed():
    url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=15)
        data = r.json()
    
    matches = data.get('matches', [])
    print(f'Matchs CM2026 trouvés : {len(matches)}')
    
    db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_in_prod@postgres/fasobet')
    conn = psycopg2.connect(
        dbname=db_url.path[1:], user=db_url.username,
        password=db_url.password, host=db_url.hostname,
        port=db_url.port
    )
    cur = conn.cursor()
    
    inserted = 0
    for m in matches:
        try:
            match_date = datetime.strptime(m['date'], '%Y-%m-%d')
            home = m.get('team1', '')
            away = m.get('team2', '')
            competition = 'FIFA World Cup 2026'
            
            # Utilisation d'un UUID pour external_id
            external_id = str(uuid.uuid4())
            
            cur.execute("""
                INSERT INTO predictions_match
                (external_id, home_team, away_team, kickoff_utc, competition, status, created_at, updated_at, home_logo, away_logo)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '', '')
                ON CONFLICT (external_id) DO NOTHING
            """, (external_id, home, away, match_date, competition, 'upcoming'))
            inserted += 1
        except Exception as e:
            print(f'  Erreur {m}: {e}')
            continue
    
    conn.commit()
    cur.close()
    conn.close()
    print(f'Insérés : {inserted}')

asyncio.run(seed())
