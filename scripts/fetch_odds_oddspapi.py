"""Fetch Pinnacle odds from OddsPapi v4 for World Cup (tournamentId=16)
and update predictions_match.odds_home/draw/away by matching on team names.
"""
import os, sys, re, requests, psycopg2
from urllib.parse import urlparse

ODDSPAPI_KEY = os.environ.get('ODDSPAPI_KEY', '')
ODDSPAPI_HOST = 'https://api.oddspapi.io'

if not ODDSPAPI_KEY:
    print('[OddsPapi] SKIP: ODDSPAPI_KEY not set. Add to .env.docker')
    print('[OddsPapi] Get a free key at https://oddspapi.io -> Account settings')
    sys.exit(0)

try:
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url:
        user = os.environ.get('POSTGRES_USER', 'fasobet')
        pw = os.environ.get('POSTGRES_PASSWORD', 'changeme_prod')
        host = os.environ.get('POSTGRES_HOST', 'postgres')
        db = os.environ.get('POSTGRES_DB', 'fasobet')
        db_url = f"postgresql://{user}:{pw}@{host}/{db}"
    url = urlparse(db_url)
    conn = psycopg2.connect(dbname=url.path[1:], user=url.username, password=url.password, host=url.hostname, port=url.port)
    cur = conn.cursor()
except Exception as e:
    print(f'[OddsPapi] DB fail: {e}')
    sys.exit(1)

cur.execute("SELECT id, home_team, away_team FROM predictions_match WHERE status='upcoming'")
matches = cur.fetchall()
print(f'[OddsPapi] {len(matches)} upcoming matches in DB')

if not matches:
    sys.exit(0)

print('[OddsPapi] Fetching odds from Pinnacle (tournamentId=16)...')
try:
    resp = requests.get(f'{ODDSPAPI_HOST}/v4/odds-by-tournaments', params={
        'bookmaker': 'pinnacle', 'tournamentIds': 16,
        'oddsFormat': 'decimal', 'apiKey': ODDSPAPI_KEY
    }, timeout=30)
    if resp.status_code != 200:
        print(f'[OddsPapi] Odds error: HTTP {resp.status_code} - {resp.text[:200]}')
        sys.exit(0)
    fixtures = resp.json()
except Exception as e:
    print(f'[OddsPapi] Odds fetch failed: {e}')
    sys.exit(0)

print(f'[OddsPapi] Got {len(fixtures)} fixtures from Pinnacle')

all_ids = set()
for fx in fixtures:
    all_ids.add(fx['participant1Id'])
    all_ids.add(fx['participant2Id'])
ids_str = ','.join(str(i) for i in all_ids)
try:
    rp = requests.get(f'{ODDSPAPI_HOST}/v4/participants', params={
        'sportId': 10, 'participantIds': ids_str, 'apiKey': ODDSPAPI_KEY
    }, timeout=15)
    if rp.status_code == 200:
        participants = {k: v for k, v in rp.json().items()}
    else:
        participants = {}
except Exception:
    participants = {}

print(f'[OddsPapi] Resolved {len(participants)} team names')

ALIASES = {
    'czech republic': 'czechia',
    'czech': 'czechia',
    'south korea': 'korea republic',
    'korea': 'korea republic',
    'bosnia & herzegovina': 'bosnia and herzegovina',
    'usa': 'united states',
    'uk': 'england',
    'iran': 'ir iran',
    'ivory coast': "cote d'ivoire",
    'turkiye': 'turkiye',
}

def norm(name):
    n = name.lower().strip()
    n = n.replace(' & ', ' and ').replace(' &', ' and ').replace('&', 'and')
    n = re.sub(r'[^a-z0-9\s]', '', n).strip()
    for k, v in ALIASES.items():
        if n == k or n.startswith(k + ' ') or n.endswith(' ' + k):
            n = v
            break
    return n

updated = 0
for fx in fixtures:
    h_name = participants.get(str(fx['participant1Id']), '')
    a_name = participants.get(str(fx['participant2Id']), '')
    if not h_name or not a_name:
        continue
    nh = norm(h_name)
    na = norm(a_name)
    match_id = None
    for mid, ht, at in matches:
        nht = norm(ht)
        nat = norm(at)
        if (nh == nht or nh in nht or nht in nh) and (na == nat or na in nat or nat in na):
            match_id = mid
            break
    if match_id is None:
        continue
    markets = fx.get('bookmakerOdds', {}).get('pinnacle', {}).get('markets', {})
    ml = markets.get('101', {})
    outcomes = ml.get('outcomes', {})
    home_price = outcomes.get('101', {}).get('players', {}).get('0', {}).get('price')
    draw_price = outcomes.get('102', {}).get('players', {}).get('0', {}).get('price')
    away_price = outcomes.get('103', {}).get('players', {}).get('0', {}).get('price')
    if not (home_price and draw_price and away_price):
        continue
    cur.execute(
        "UPDATE predictions_match SET odds_home=%s, odds_draw=%s, odds_away=%s WHERE id=%s",
        (home_price, draw_price, away_price, match_id)
    )
    if cur.rowcount > 0:
        updated += 1
        print(f'  [{match_id}] {h_name} vs {a_name}: {home_price}/{draw_price}/{away_price}')

conn.commit()
print(f'[OddsPapi] Updated {updated} matches with Pinnacle odds')
cur.close()
conn.close()
