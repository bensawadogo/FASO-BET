import django, os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')
django.setup()
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from predictions.models import Match, MatchFeatures

# ELO approximatifs équipes CM2026 (base sur classement FIFA 2025)
TEAM_ELO = {
    'Brazil': 2100, 'Argentina': 2080, 'France': 2070, 'Spain': 2050,
    'England': 2040, 'Portugal': 2020, 'Netherlands': 2000,
    'Germany': 1990, 'Belgium': 1970, 'Mexico': 1850,
    'Morocco': 1830, 'Senegal': 1800, 'Switzerland': 1820,
    'South Korea': 1780, 'Canada': 1750, 'Qatar': 1650,
    'Scotland': 1740, 'Haiti': 1550, 'South Africa': 1600,
    'Czech Republic': 1760, 'Cameroon': 1720,
    'Bosnia & Herzegovina': 1700,
}
DEFAULT_ELO = 1650

today = timezone.now().date()
matches = Match.objects.filter(
    Q(status__in=['upcoming','scheduled','NS','FIXTURE']),
    kickoff_utc__date__gte=today,
    kickoff_utc__date__lte=today + timedelta(days=7)
)

updated = 0
for m in matches:
    elo_h = TEAM_ELO.get(m.home_team, DEFAULT_ELO)
    elo_a = TEAM_ELO.get(m.away_team, DEFAULT_ELO)

    # Goals attendus bases sur force relative (formule simple)
    base_goals = 1.3
    diff = (elo_h - elo_a) / 400.0
    gf_h = round(base_goals * (1 + diff * 0.3), 2)
    ga_h = round(base_goals * (1 - diff * 0.3), 2)
    gf_a = round(base_goals * (1 - diff * 0.3), 2)
    ga_a = round(base_goals * (1 + diff * 0.3), 2)

    features, created = MatchFeatures.objects.get_or_create(match=m)
    features.elo_home = elo_h
    features.elo_away = elo_a
    features.form_home = 0.5
    features.form_away = 0.5
    features.goals_for_home = max(0.5, gf_h)
    features.goals_ag_home = max(0.5, ga_h)
    features.goals_for_away = max(0.5, gf_a)
    features.goals_ag_away = max(0.5, ga_a)
    features.odds_implied_home = round(1/(m.odds_home or 2.5), 4)
    features.odds_implied_draw = round(1/(m.odds_draw or 3.2), 4)
    features.odds_implied_away = round(1/(m.odds_away or 2.8), 4)
    features.odds_margin = round(
        (features.odds_implied_home or 0) - (features.odds_implied_away or 0), 4)
    features.save()
    updated += 1
    print(f"{m.home_team} vs {m.away_team}: elo {elo_h}/{elo_a}, "
          f"goals {gf_h:.2f}/{gf_a:.2f}")

print(f"\nTotal mis à jour: {updated}")