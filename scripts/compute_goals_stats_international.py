"""
Compute weighted goals_for/goals_ag for InternationalFeatures.
Uses match_date (not kickoff_utc) for ordering, since most historical
matches have NULL kickoff_utc.
"""
import os, sys, psycopg2
os.environ.setdefault('DJANGO_SETTINGS_MODULE','sportpred.settings')
sys.path.insert(0, '/app')
import django
django.setup()
from django.conf import settings
from django.db import connection as dj_conn
import pandas as pd
import numpy as np

def classify_weight(competition):
    if not competition:
        return 0.8
    t = competition.lower()
    if ('world cup' in t and 'qualif' not in t) or 'confederations cup' in t:
        return 1.5
    if any(k in t for k in ['euro', 'copa america', 'africa cup', 'afcon',
                             'asian cup', 'gold cup']) and 'qualif' not in t:
        return 1.3
    if 'qualif' in t:
        return 1.0
    if 'nations league' in t:
        return 0.9
    if 'friendly' in t:
        return 0.5
    return 0.8

def recency_weight(match_date, ref_date, half_life_days=730):
    days = (ref_date - match_date).days
    if days < 0:
        return 0.0
    return 0.5 ** (days / half_life_days)

def get_weighted_stats(team, ref_date, df, max_matches=15):
    mask = (
        ((df['home_team'] == team) | (df['away_team'] == team)) &
        (df['match_date'] < ref_date)
    )
    team_matches = df[mask].sort_values('match_date', ascending=False).head(max_matches)
    if len(team_matches) == 0:
        return None, None, 0

    w_gf = 0.0
    w_ga = 0.0
    w_sum = 0.0
    for _, m in team_matches.iterrows():
        is_home = m['home_team'] == team
        gf = m['home_score'] if is_home else m['away_score']
        ga = m['away_score'] if is_home else m['home_score']
        cw = classify_weight(m.get('tournament', ''))
        rw = recency_weight(m['match_date'], ref_date)
        tw = cw * rw
        w_gf += gf * tw
        w_ga += ga * tw
        w_sum += tw

    if w_sum == 0:
        return None, None, len(team_matches)
    return round(w_gf / w_sum, 3), round(w_ga / w_sum, 3), len(team_matches)

# ---- LOAD DATA ----
print("Chargement historique depuis Django...")
with dj_conn.cursor() as c:
    c.execute("""
        SELECT home_team, away_team, home_score, away_score, tournament, match_date
        FROM predictions_internationalmatch
        WHERE home_score IS NOT NULL AND away_score IS NOT NULL
          AND match_date IS NOT NULL
        ORDER BY match_date ASC
    """)
    rows = c.fetchall()
df_all = pd.DataFrame(rows, columns=['home_team', 'away_team', 'home_score', 'away_score', 'tournament', 'match_date'])
df_all['match_date'] = pd.to_datetime(df_all['match_date'])
print(f"  {len(df_all)} matchs historiques charges")

with dj_conn.cursor() as c:
    c.execute("""
        SELECT m.id, m.home_team, m.away_team, m.match_date
        FROM predictions_internationalmatch m
        WHERE m.tournament ILIKE '%World Cup%'
          AND m.match_date IS NOT NULL
    """)
    rows2 = c.fetchall()
target = pd.DataFrame(rows2, columns=['id', 'home_team', 'away_team', 'match_date'])
target['match_date'] = pd.to_datetime(target['match_date'])
print(f"  {len(target)} matchs CdM a enrichir")

# ---- COMPUTE ----
db = settings.DATABASES['default']
db_url = f'postgresql://{db["USER"]}:{db["PASSWORD"]}@{db["HOST"]}:{db["PORT"]}/{db["NAME"]}'
conn = psycopg2.connect(db_url)
cur = conn.cursor()

updated = 0
skipped = []

for _, m in target.iterrows():
    mid = m['id']
    home = m['home_team']
    away = m['away_team']
    ref_date = m['match_date']

    gf_h, ga_h, n_h = get_weighted_stats(home, ref_date, df_all)
    gf_a, ga_a, n_a = get_weighted_stats(away, ref_date, df_all)

    if gf_h is None or gf_a is None:
        skipped.append(f'{home} vs {away}')
        continue

    cur.execute("""
        UPDATE predictions_internationalfeatures
        SET goals_for_home = %s, goals_ag_home = %s,
            goals_for_away = %s, goals_ag_away = %s
        WHERE match_id = %s
    """, (gf_h, ga_h, gf_a, ga_a, mid))
    updated += 1
    if updated % 200 == 0:
        print(f"  {updated}/{len(target)}")
        conn.commit()

conn.commit()
print(f"\nMis a jour: {updated}/{len(target)}")
print(f"Pas d'historique: {len(skipped)}")
if skipped[:5]:
    print(f"  Exemples: {skipped[:5]}")

# Verification
cur.execute("""
    SELECT COUNT(*), ROUND(AVG(goals_for_home)::numeric, 3),
           ROUND(STDDEV(goals_for_home)::numeric, 3)
    FROM predictions_internationalfeatures WHERE goals_for_home IS NOT NULL
""")
cnt, avg, std = cur.fetchone()
print(f"\nCoverture: {cnt}")
print(f"goals_for_home: avg={avg} std={std}")
if std and float(std) > 0.3:
    print("VARIANCE OK: std > 0.3")
else:
    print(f"VARIANCE FAIBLE: std={std}")

cur.close()
conn.close()
