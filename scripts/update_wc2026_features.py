import psycopg2, os

db_url = os.environ.get('DATABASE_URL', 'postgresql://fasobet:changeme_prod@postgres/fasobet')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Get WC2026 matches in Match table
cur.execute("""
    SELECT m.id, m.home_team, m.away_team
    FROM predictions_match m
    WHERE m.kickoff_utc::date >= '2026-06-11'
    AND m.home_team IN (SELECT home_team FROM predictions_internationalmatch WHERE tournament='FIFA World Cup')
""")
matches = cur.fetchall()
print(f"WC2026 matches to update: {len(matches)}")

updated = 0
for match_id, home_team, away_team in matches:
    # Find corresponding international features
    cur.execute("""
        SELECT f.elo_home, f.elo_away, f.form_home, f.form_away
        FROM predictions_internationalfeatures f
        JOIN predictions_internationalmatch m ON f.match_id = m.id
        WHERE m.home_team = %s AND m.away_team = %s
        AND m.tournament = 'FIFA World Cup'
        ORDER BY m.match_date DESC
        LIMIT 1
    """, (home_team, away_team))
    
    row = cur.fetchone()
    if row:
        elo_h, elo_a, form_h, form_a = row
        # Update MatchFeatures
        cur.execute("""
            UPDATE predictions_matchfeatures
            SET elo_home = %s, elo_away = %s, form_home = %s, form_away = %s
            WHERE match_id = %s
        """, (elo_h, elo_a, form_h, form_a, match_id))
        updated += 1
        print(f"Updated: {home_team} vs {away_team} (ELO: {elo_h:.0f} vs {elo_a:.0f})")

conn.commit()
print(f"Updated {updated} matches")

cur.close()
conn.close()
