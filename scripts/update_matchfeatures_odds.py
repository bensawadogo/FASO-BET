import os
import sys
import django

# Ajouter le répertoire courant au chemin Python
sys.path.insert(0, '/app')

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')
django.setup()

from predictions.models import Match, MatchFeatures
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q

# Récupérer les matchs à mettre à jour
today = timezone.now().date()
matches = Match.objects.filter(
    Q(status__in=['upcoming','scheduled','NS','FIXTURE']),
    kickoff_utc__date__gte=today,
    kickoff_utc__date__lte=today + timedelta(days=7)
)
print(f"Matchs à mettre à jour: {matches.count()}")

updated = 0

for match in matches:
    try:
        # Vérifier si le match a des cotes valides
        if match.odds_home and match.odds_draw and match.odds_away:
            # Mettre à jour les MatchFeatures
            features = MatchFeatures.objects.get(match=match)

            # Calculer les probabilités implicites
            implied_home = 1.0 / match.odds_home
            implied_draw = 1.0 / match.odds_draw
            implied_away = 1.0 / match.odds_away

            # Mettre à jour les champs
            features.odds_implied_home = implied_home
            features.odds_implied_draw = implied_draw
            features.odds_implied_away = implied_away
            features.save()

            updated += 1
            print(f"  ✓ MAJ Features: {match.home_team} vs {match.away_team} -> "
                  f"H:{implied_home:.4f} D:{implied_draw:.4f} A:{implied_away:.4f}")

    except MatchFeatures.DoesNotExist:
        print(f"  ⚠ MatchFeatures non trouvé pour {match.home_team} vs {match.away_team}")
    except Exception as e:
        print(f"  ✗ Erreur pour {match.home_team} vs {match.away_team}: {e}")

print(f"\n✅ Total MatchFeatures mis à jour: {updated}")