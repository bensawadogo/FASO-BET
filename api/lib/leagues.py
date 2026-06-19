from __future__ import annotations
from typing import Optional
class LeagueInfo:
    def __init__(self, league_id, name, season, country, avg_goals):
        self.id = league_id
        self.name = name
        self.season = season
        self.country = country
        self.avg_goals = avg_goals
LEAGUES = {
    'FIFA World Cup': LeagueInfo(1, 'FIFA World Cup 2026', 2026, 'World', 2.5),
    'UEFA Champions League': LeagueInfo(2, 'UEFA Champions League', 2026, 'Europe', 2.9),
    'Premier League': LeagueInfo(39, 'Premier League', 2026, 'England', 2.9),
    'La Liga': LeagueInfo(140, 'La Liga', 2026, 'Spain', 2.6),
    'Friendlies': LeagueInfo(10, 'Friendlies', 2026, 'World', 2.5),
    'Elite Two': LeagueInfo(813, 'Elite Two', 2026, 'Africa', 2.0),
    'Tournoi Maurice Revello': LeagueInfo(914, 'Tournoi Maurice Revello', 2026, 'World', 2.3),
    'ASEAN Championship U19': LeagueInfo(928, 'ASEAN Championship U19', 2026, 'World', 2.4),
}
DEFAULT_LEAGUE_IDS = [1, 2, 39, 140, 10, 813, 914, 928]

def sport_key_for_league(league_name: str) -> Optional[str]:
    mapping = {
        "Premier League": "soccer_england_premier_league",
        "La Liga": "soccer_spain_la_liga",
        "Serie A": "soccer_italy_serie_a",
        "Bundesliga": "soccer_germany_bundesliga",
        "UEFA Champions League": "soccer_uefa_champions_league",
        "UEFA Europa League": "soccer_uefa_europa_league",
        "Ligue 1": "soccer_france_ligue_one",
        "Ligue 2": "soccer_france_ligue_two",
        "Primeira Liga": "soccer_portugal_primeira_liga",
        "Eredivisie": "soccer_netherlands_eredivisie",
        "FIFA World Cup": "soccer_world_cup",
    }
    return mapping.get(league_name)

def get_league_avg_goals(league_id: int) -> float:
    # Valeurs par défaut pour les ligues configurées
    # Format: {id: avg_goals}
    mapping = {
        61: 2.8, 39: 2.9, 140: 2.6, 135: 2.7, 78: 3.1, 
        2: 2.9, 3: 2.7, 563: 2.1, 200: 2.2, 1: 2.5, 
        10: 2.5, 813: 2.0, 914: 2.3, 928: 2.4
    }
    return mapping.get(league_id, 2.5)


