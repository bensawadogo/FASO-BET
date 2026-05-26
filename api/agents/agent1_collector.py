"""FasoBet - Agent 1: Collecteur (BLOC 2)
Équivalent Python de src/agents/agent-collector.ts

Rôle : Récupérer les matchs du jour depuis l'API Football, 
valider les cotes, détecter les mouvements suspects.
Fallback : matchs démo si pas de clé API.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from api.lib.leagues import DEFAULT_LEAGUE_IDS, LEAGUES, sport_key_for_league
from api.models import (
    Agent1Output,
    CollectorOptions,
    MatchOdds,
    MatchType,
    OddsMovement,
    RejectedMatch,
    VerifiedMatch,
)


# Constantes (identiques au TS)
SUSPICIOUS_ODDS_MIN = 1.01
SUSPICIOUS_ODDS_MAX = 50
IMPLIED_MIN = 0.95
IMPLIED_MAX = 1.15
DEFAULT_HOME_WIN = 2.1
DEFAULT_DRAW = 3.3
DEFAULT_AWAY_WIN = 3.5
DEFAULT_OVER_2_5 = 1.85
DEFAULT_BTTS = 1.75
HOME_DROPPING_THRESHOLD = 1.65
AWAY_DROPPING_THRESHOLD = 2.8
MAX_FIXTURES_PER_LEAGUE = 8


def today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def detect_match_type(league_name: str, round_name: str = "") -> MatchType:
    """Détecte le type de match (officiel, amical, national, club).
    Équivalent de detectMatchType() dans agent-collector.ts
    """
    name_lower = league_name.lower()
    round_lower = round_name.lower()
    
    if "friendly" in round_lower or "friendly" in name_lower:
        is_national = (
            "nation" in name_lower
            or "international" in round_lower
        )
        return MatchType.NATIONAL_FRIENDLY if is_national else MatchType.CLUB_FRIENDLY
    
    if any(x in name_lower for x in ["nation", "world cup", "euro", "can"]):
        return MatchType.NATIONAL_OFFICIAL
    
    return MatchType.CLUB_OFFICIAL


def is_odds_suspicious(odds: MatchOdds) -> Optional[str]:
    """Vérifie si les cotes sont suspectes."""
    for val in [odds.home_win, odds.draw, odds.away_win, odds.over_2_5, odds.btts]:
        if val < SUSPICIOUS_ODDS_MIN or val > SUSPICIOUS_ODDS_MAX:
            return f"Cote anormale: {val}"
    
    implied = 1 / odds.home_win + 1 / odds.draw + 1 / odds.away_win
    if implied < IMPLIED_MIN or implied > IMPLIED_MAX:
        return "Marge bookmaker suspecte"
    
    return None


def detect_odds_movement(home_odds: float) -> OddsMovement:
    """Détecte le mouvement des cotes."""
    if home_odds < HOME_DROPPING_THRESHOLD:
        return OddsMovement.HOME_DROPPING
    if home_odds > AWAY_DROPPING_THRESHOLD:
        return OddsMovement.AWAY_DROPPING
    return OddsMovement.STABLE


def default_odds() -> MatchOdds:
    """Cotes par défaut."""
    return MatchOdds(
        home_win=DEFAULT_HOME_WIN,
        draw=DEFAULT_DRAW,
        away_win=DEFAULT_AWAY_WIN,
        over_2_5=DEFAULT_OVER_2_5,
        btts=DEFAULT_BTTS,
    )


def demo_matches() -> list[VerifiedMatch]:
    """Matchs démo quand aucune API n'est configurée."""
    d = datetime.now(timezone.utc).replace(hour=20, minute=45, second=0, microsecond=0)
    
    return [
        VerifiedMatch(
            id="match_demo_001",
            home="PSG",
            away="Lyon",
            competition="Ligue 1",
            league_id=61,
            date=d.isoformat(),
            match_type=MatchType.CLUB_OFFICIAL,
            odds=MatchOdds(home_win=1.85, draw=3.4, away_win=4.2, over_2_5=1.75, btts=1.9),
            odds_source="Pinnacle",
            odds_movement=OddsMovement.HOME_DROPPING,
        ),
        VerifiedMatch(
            id="match_demo_002",
            home="Liverpool",
            away="Arsenal",
            competition="Premier League",
            league_id=39,
            date=d.isoformat(),
            match_type=MatchType.CLUB_OFFICIAL,
            odds=MatchOdds(home_win=2.2, draw=3.5, away_win=3.1, over_2_5=1.72, btts=1.65),
            odds_source="Pinnacle",
            odds_movement=OddsMovement.STABLE,
        ),
        VerifiedMatch(
            id="match_demo_003",
            home="Real Madrid",
            away="Barcelona",
            competition="La Liga",
            league_id=140,
            date=d.isoformat(),
            match_type=MatchType.CLUB_OFFICIAL,
            odds=MatchOdds(home_win=2.05, draw=3.6, away_win=3.4, over_2_5=1.68, btts=1.55),
            odds_source="Pinnacle",
            odds_movement=OddsMovement.STABLE,
        ),
    ]


class AgentCollector:
    """Agent collecteur : récupère et valide les matchs."""
    
    async def run(self, options: Optional[CollectorOptions] = None) -> Agent1Output:
        if options is None:
            options = CollectorOptions()
        
        date = options.date or today_iso()
        league_ids = options.leagues or DEFAULT_LEAGUE_IDS
        
        football_key = os.environ.get("FOOTBALL_API_KEY", "")
        
        if not football_key:
            return Agent1Output(
                verified_matches=demo_matches(),
                rejected_matches=[],
                collection_timestamp=datetime.now(timezone.utc).isoformat(),
            )
        
        verified: list[VerifiedMatch] = []
        rejected: list[RejectedMatch] = []
        
        for league_id in league_ids:
            league_entry = None
            for liga in LEAGUES.values():
                if liga.id == league_id:
                    league_entry = liga
                    break
            
            season = league_entry.season if league_entry else 2025
            league_name = league_entry.name if league_entry else "Ligue 1"
            
            try:
                fixtures = await self._fetch_fixtures(league_id, date, season)
            except Exception as e:
                print(f"[Agent1] fixtures league {league_id}: {e}")
                continue
            
            sport_key = sport_key_for_league(league_name)
            odds_events = []
            if sport_key:
                try:
                    odds_events = await self._fetch_odds(sport_key)
                except Exception:
                    odds_events = []
            
            for fixture in fixtures[:MAX_FIXTURES_PER_LEAGUE]:
                result = self._fixture_to_match(fixture, odds_events)
                if result["reject"]:
                    rejected.append(result["reject"])
                elif result.get("match"):
                    verified.append(result["match"])
        
        if not verified:
            verified.extend(demo_matches())
        
        return Agent1Output(
            verified_matches=verified,
            rejected_matches=rejected,
            collection_timestamp=datetime.now(timezone.utc).isoformat(),
        )
    
    async def _fetch_fixtures(self, league_id: int, date: str, season: int) -> list[dict]:
        """Récupère les fixtures depuis l'API Football. À implémenter avec httpx."""
        import httpx
        api_key = os.environ.get("FOOTBALL_API_KEY", "")
        base_url = os.environ.get("FOOTBALL_API_URL", "https://v3.football.api-sports.io")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/fixtures",
                headers={"x-apisports-key": api_key},
                params={"league": league_id, "season": season, "date": date},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", [])
    
    async def _fetch_odds(self, sport_key: str) -> list[dict]:
        """Récupère les cotes depuis The Odds API."""
        import httpx
        api_key = os.environ.get("ODDS_API_KEY", "")
        base_url = os.environ.get("ODDS_API_URL", "https://api.the-odds-api.com/v4")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/sports/{sport_key}/odds",
                params={
                    "apiKey": api_key,
                    "regions": "eu",
                    "markets": "h2h,over_under,both_teams_to_score",
                    "oddsFormat": "decimal",
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
    
    def _fixture_to_match(self, fixture: dict, odds_events: list[dict]) -> dict:
        """Transforme une fixture API en VerifiedMatch.
        Équivalent de fixtureToMatch() dans agent-collector.ts
        """
        home = fixture["teams"]["home"]["name"]
        away = fixture["teams"]["away"]["name"]
        
        league_entry = None
        league_id = fixture.get("league", {}).get("id")
        for liga in LEAGUES.values():
            if liga.id == (league_id or 0):
                league_entry = liga
                break
        
        odds = default_odds()
        source = "Estimation"
        
        # Tentative d'extraction des cotes depuis The Odds API
        if odds_events:
            extracted = self._extract_odds_from_event(odds_events, home, away)
            if extracted:
                odds = MatchOdds(**extracted["odds"])
                source = extracted.get("source", "Pinnacle")
        
        suspicious = is_odds_suspicious(odds)
        if suspicious:
            return {"reject": RejectedMatch(home=home, away=away, reason=suspicious)}
        
        competition_name = fixture.get("league", {}).get("name", "Unknown")
        round_name = fixture.get("league", {}).get("round", "")
        
        match = VerifiedMatch(
            id=f"match_{fixture.get('fixture', {}).get('id', 0)}",
            home=home,
            away=away,
            home_id=fixture.get("teams", {}).get("home", {}).get("id"),
            away_id=fixture.get("teams", {}).get("away", {}).get("id"),
            competition=competition_name,
            league_id=league_id,
            date=fixture.get("fixture", {}).get("date", ""),
            match_type=detect_match_type(competition_name, round_name),
            is_verified=True,
            odds=odds,
            odds_source=source,
            odds_movement=detect_odds_movement(odds.home_win),
        )
        
        return {"match": match}
    
    @staticmethod
    def _extract_odds_from_event(events: list[dict], home: str, away: str) -> Optional[dict]:
        """Extrait les cotes d'un événement The Odds API."""
        for event in events:
            event_home = event.get("home_team", "")
            event_away = event.get("away_team", "")
            
            if event_home.lower() == home.lower() and event_away.lower() == away.lower():
                outcomes = event.get("bookmakers", [{}])[0].get("markets", [])
                h2h = None
                over_under = None
                btts = None
                
                for market in outcomes:
                    key = market.get("key", "")
                    if key == "h2h":
                        h2h = market
                    elif key == "over_under":
                        over_under = market
                    elif key == "btts":
                        btts = market
                
                if h2h:
                    h_odd = next((o["price"] for o in h2h.get("outcomes", []) if o["name"] == event_home), None)
                    d_odd = next((o["price"] for o in h2h.get("outcomes", []) if o["name"] == "Draw"), None)
                    a_odd = next((o["price"] for o in h2h.get("outcomes", []) if o["name"] == event_away), None)
                    
                    over = None
                    if over_under:
                        over = next(
                            (o["price"] for o in over_under.get("outcomes", [])
                             if o.get("name", "").startswith("Over")),
                            None
                        )
                    
                    btts_yes = None
                    if btts:
                        btts_yes = next(
                            (o["price"] for o in btts.get("outcomes", []) if o.get("name") == "Yes"),
                            None
                        )
                    
                    if h_odd and d_odd and a_odd:
                        return {
                            "odds": {
                                "home_win": float(h_odd),
                                "draw": float(d_odd),
                                "away_win": float(a_odd),
                                "over_2_5": float(over or DEFAULT_OVER_2_5),
                                "btts": float(btts_yes or DEFAULT_BTTS),
                            },
                            "source": event.get("bookmakers", [{}])[0].get("title", "Pinnacle"),
                        }
        return None


# Singleton
agent_collector = AgentCollector()
