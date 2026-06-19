import os
import sys
import httpx
import django

# Ajouter le répertoire courant au chemin Python
sys.path.insert(0, '/app')

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')
django.setup()

from predictions.models import Match
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q

# Configuration
key = os.environ.get('ODDS_API_KEY')
if not key:
    print("ERREUR: ODDS_API_KEY non trouvée")
    exit(1)

SPORTS = [
    'soccer_fifa_world_cup',
    'soccer_epl',
    'soccer_uefa_champs_league',
    'soccer_la_liga',
    'soccer_bundesliga',
    'soccer_serie_a',
    'soccer_ligue_1'
]

# Récupérer les matchs à mettre à jour
today = timezone.now().date()
matches = Match.objects.filter(
    Q(status__in=['upcoming','scheduled','NS','FIXTURE']),
    kickoff_utc__date__gte=today,
    kickoff_utc__date__lte=today + timedelta(days=7)
)
print(f"Matchs à mettre à jour: {matches.count()}")

updated = 0

for sport in SPORTS:
    try:
        print(f"\nTraitement de {sport}...")
        r = httpx.get(
            f'https://api.the-odds-api.com/v4/sports/{sport}/odds',
            params={
                'apiKey': key,
                'regions': 'eu',
                'markets': 'h2h',
                'oddsFormat': 'decimal'
            },
            timeout=15
        )

        if r.status_code != 200:
            print(f"{sport}: HTTP {r.status_code} - {r.text}")
            continue

        events = r.json()
        print(f"{sport}: {len(events)} événements reçus")

        for ev in events:
            home = ev.get('home_team', '')
            away = ev.get('away_team', '')
            bookmakers = ev.get('bookmakers', [])

            if not bookmakers:
                continue

            # Extraire les cotes du premier bookmaker
            outcomes = bookmakers[0]['markets'][0]['outcomes']
            odds = {o['name']: o['price'] for o in outcomes}

            # Trouver les matchs correspondants dans la base de données
            for m in matches:
                # Vérification flexible des noms d'équipes
                home_match = (home.lower() in m.home_team.lower() or m.home_team.lower() in home.lower())
                away_match = (away.lower() in m.away_team.lower() or m.away_team.lower() in away.lower())

                if home_match and away_match:
                    # Mettre à jour les cotes
                    m.odds_home = odds.get(home, m.odds_home)
                    m.odds_away = odds.get(away, m.odds_away)
                    m.odds_draw = odds.get('Draw', m.odds_draw)
                    m.save()
                    updated += 1
                    print(f"  ✓ MAJ: {m.home_team} vs {m.away_team} -> "
                          f"H:{m.odds_home} D:{m.odds_draw} A:{m.odds_away}")

    except Exception as e:
        print(f"{sport}: erreur {e}")

print(f"\n✅ Total matchs mis à jour: {updated}")