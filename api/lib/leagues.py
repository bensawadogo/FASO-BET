"""FasoBet - League constants and helpers (BLOC 2)
Équivalent Python de src/lib/leagues.ts
"""

from __future__ import annotations

from typing import Optional

# Structure de ligue
class LeagueInfo:
    def __init__(self, league_id: int, name: str, season: int, country: str, avg_goals: float):
        self.id = league_id
        self.name = name
        self.season = season
        self.country = country
        self.avg_goals = avg_goals

# Ligues disponibles
LEAGUES: dict[str, LeagueInfo] = {
    "Ligue 1": LeagueInfo(61, "Ligue 1", 2025, "France", 2.8),
    "Premier League": LeagueInfo(39, "Premier League", 2025, "England", 2.9),
    "La Liga": LeagueInfo(140, "La Liga", 2025, "Spain", 2.6),
    "Serie A": LeagueInfo(135, "Serie A", 2025, "Italy", 2.7),
    "Bundesliga": LeagueInfo(78, "Bundesliga", 2025, "Germany", 3.1),
    "Champions League": LeagueInfo(2, "UEFA Champions League", 2025, "Europe", 2.9),
    "Europa League": LeagueInfo(3, "UEFA Europa League", 2025, "Europe", 2.7),
}

# IDs par défaut
DEFAULT_LEAGUE_IDS = [61, 39, 140, 78, 135, 2]

def get_league_by_id(league_id: int) -> Optional[LeagueInfo]:
    """Trouve une ligue par son ID."""
    for liga in LEAGUES.values():
        if liga.id == league_id:
            return liga
    return None

def get_league_avg_goals(league_id: int) -> float:
    """Retourne la moyenne de buts d'une ligue."""
    liga = get_league_by_id(league_id)
    return liga.avg_goals if liga else 2.5

def sport_key_for_league(league_name: str) -> Optional[str]:
    """Mapping nom de ligue → clé API The Odds API."""
    mapping = {
        "Ligue 1": "soccer_france_ligue_one",
        "Premier League": "soccer_epl",
        "La Liga": "soccer_spain_la_liga",
        "Serie A": "soccer_italy_serie_a",
        "Bundesliga": "soccer_germany_bundesliga",
        "UEFA Champions League": "soccer_uefa_champions_league",
        "UEFA Europa League": "soccer_uefa_europa_league",
        "Ligue 2": "soccer_france_ligue_two",
        "Primeira Liga": "soccer_portugal_primeira_liga",
        "Eredivisie": "soccer_netherlands_eredivisie",
    }
    return mapping.get(league_name)
