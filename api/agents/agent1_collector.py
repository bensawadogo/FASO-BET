import os
import httpx
import logging
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
from api.data_sources.seed_matches import get_upcoming_matches
from api.data_sources.multi_source import fetch_matches_with_fallback

logger = logging.getLogger('fasobet.collector')

class CollectorAuthError(Exception):
    """Levee quand la collecte echoue (cle API, DB, etc)"""
    pass

# Constantes (si elles n'étaient pas déjà définies ailleurs)
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
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

def detect_odds_movement(home_odds: float) -> OddsMovement:
    if home_odds < HOME_DROPPING_THRESHOLD:
        return OddsMovement.HOME_DROPPING
    if home_odds > AWAY_DROPPING_THRESHOLD:
        return OddsMovement.AWAY_DROPPING
    return OddsMovement.STABLE

def default_odds() -> MatchOdds:
    return MatchOdds(
        home_win=DEFAULT_HOME_WIN, draw=DEFAULT_DRAW, away_win=DEFAULT_AWAY_WIN,
        over_2_5=DEFAULT_OVER_2_5, btts=DEFAULT_BTTS,
    )

def is_odds_suspicious(odds: MatchOdds) -> Optional[str]:
    for val in [odds.home_win, odds.draw, odds.away_win, odds.over_2_5, odds.btts]:
        if val < SUSPICIOUS_ODDS_MIN or val > SUSPICIOUS_ODDS_MAX:
            return f"Cote anormale: {val}"
    implied = 1 / odds.home_win + 1 / odds.draw + 1 / odds.away_win
    if implied < IMPLIED_MIN or implied > IMPLIED_MAX:
        return "Marge bookmaker suspecte"
    return None

class AgentCollector:
    """Agent collecteur : récupère et valide les matchs."""

    async def run(self, options: Optional[CollectorOptions] = None) -> Agent1Output:
        if options is None:
            options = CollectorOptions()

        date = options.date or today_iso()
        league_ids = options.leagues or DEFAULT_LEAGUE_IDS

        api_sports_fixtures: list = []
        for league_id in league_ids:
            league_entry = next((liga for liga in LEAGUES.values() if liga.id == league_id), None)
            season = league_entry.season if league_entry else 2025

            # Tenter de récupérer les fixtures d'API-Sports
            try:
                # Modifié pour gérer la date dynamiquement
                fetched_fixtures = await self._fetch_fixtures(league_id, date, season)
                api_sports_fixtures.extend(fetched_fixtures)
            except Exception as e:
                logger.warning(f"Erreur API-Sports pour league {league_id}: {e}")
                # Continuer avec les autres ligues ou passer au fallback

        # Utiliser le nouvel orchestrateur de fallback
        from datetime import date as date_obj
        date_for_fallback = date_obj.fromisoformat(date) if isinstance(date, str) else date
        all_fixtures, source_used = await fetch_matches_with_fallback(api_sports_fixtures, date_for_fallback)

        # DÉSACTIVÉ EN PRODUCTION - ne jamais afficher de matchs fictifs
        # if not all_fixtures:
        #     logger.error("[Agent1] ECHEC COLLECTE REELLE: Aucune source disponible")
        #     logger.error("[Agent1] FALLBACK SEED_DEMO ACTIVE - donnees fictives")
        #     from api.data_sources.seed_matches import get_upcoming_matches
        #     all_fixtures = get_upcoming_matches()
        #     source_used = "SEED_DEMO"
        #     for m in all_fixtures:
        #         m['source'] = 'SEED_DEMO'
        #     logger.info(f"[Agent1] Fallback vers SEED_DEMO: {len(all_fixtures)} matchs")

        if not all_fixtures: # Si toutes les sources sont vides
             logger.info("[Agent1] Toutes les sources vides pour cette date. Graceful exit.")
             return Agent1Output(
                 verified_matches=[],
                 rejected_matches=[],
                 collection_timestamp=datetime.now(timezone.utc).isoformat(),
                 status="no_data",
                 message="Aucun match disponible pour cette période"
             )

        verified: list[VerifiedMatch] = []
        rejected: list[RejectedMatch] = []

        for fixture in all_fixtures[:MAX_FIXTURES_PER_LEAGUE]:
            # Assurez-vous que odds_events est passé même si vide
            result = self._fixture_to_match(fixture, [])
            if result.get("reject"):
                rejected.append(result["reject"])
            elif result.get("match"):
                verified.append(result["match"])

        if not verified:
            print("[Agent1] Info: No matches collected for this run. Graceful exit.", flush=True)
            return Agent1Output(
                verified_matches=[],
                rejected_matches=rejected,
                collection_timestamp=datetime.now(timezone.utc).isoformat(),
                status="no_data",
                message="Aucun match disponible pour cette période"
            )

        await self._persist_to_django(verified)

        return Agent1Output(
            verified_matches=verified,
            rejected_matches=rejected,
            collection_timestamp=datetime.now(timezone.utc).isoformat(),
            status="success",
            message=f"{len(verified)} matchs collectés depuis {source_used}"
        )

    async def _persist_to_django(self, matches: list[VerifiedMatch]):
        """Persiste les matchs vers Postgres directement via repository."""
        import asyncio
        from api.db.repositories import save_match

        for match in matches:
            payload = {
                "external_id": match.id, # C'est l'ID string d'origine
                "home_team": match.home,
                "away_team": match.away,
                "home_logo": match.home_logo,
                "away_logo": match.away_logo,
                "competition": match.competition,
                "kickoff_utc": match.date,
                "status": "upcoming",
            }
            # save_match retourne maintenant l'ID entier du match en BDD
            db_match_id = await asyncio.to_thread(save_match, payload)
            # Mettre à jour l'ID du VerifiedMatch pour qu'il contienne l'ID entier
            match.id = str(db_match_id) # On le re-stringifie pour le VerifiedMatch

    async def _fetch_fixtures(self, league_id: int, date: str, season: int) -> list:
        api_key = os.environ.get("FOOTBALL_API_KEY", "")
        base_url = os.environ.get("FOOTBALL_API_URL", "https://v3.football.api-sports.io")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/fixtures",
                headers={"x-apisports-key": api_key},
                params={"league": league_id, "season": season, "date": date},
                timeout=10,
            )

            if response.status_code == 403:
                raise CollectorAuthError(f"API-Sports 403: League {league_id}")

            response.raise_for_status()
            return response.json().get("response", [])

    async def _fetch_odds(self, sport_key: str) -> list[dict]:
        api_key = os.environ.get("ODDS_API_KEY", "")
        base_url = os.environ.get("ODDS_API_URL", "https://api.the-odds-api.com/v4")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/sports/{sport_key}/odds",
                params={"apiKey": api_key, "regions": "eu", "markets": "h2h", "oddsFormat": "decimal"},
                timeout=10,
            )
            return response.json() if response.status_code == 200 else []

    def _fixture_to_match(self, fixture: dict, odds_events: list[dict]) -> dict:
        home = (
            fixture.get("home_team")
            or fixture.get("teams", {}).get("home", {}).get("name", "")
        )
        away = (
            fixture.get("away_team")
            or fixture.get("teams", {}).get("away", {}).get("name", "")
        )
        home_logo = fixture.get("home_logo") or fixture.get("teams", {}).get("home", {}).get("logo", "")
        away_logo = fixture.get("away_logo") or fixture.get("teams", {}).get("away", {}).get("logo", "")

        kickoff = (
            fixture.get("kickoff_utc")
            or fixture.get("fixture", {}).get("date", "")
        )

        competition = (
            fixture.get("competition")
            or fixture.get("league", {}).get("name", "Unknown")
        )

        match_id_val = fixture.get('id', '') # Fallback to generic 'id'
        if not match_id_val and fixture.get('fixture'):
            match_id_val = fixture['fixture'].get('id', '')
        if not match_id_val:
            match_id_val = f"{home}-{away}-{kickoff}" # Generate a unique ID if none is found
        match_id = f"match_{match_id_val}"

        match = VerifiedMatch(
            id=match_id,
            home=home,
            away=away,
            home_logo=home_logo,
            away_logo=away_logo,
            competition=competition,
            date=kickoff,
            match_type=MatchType.CLUB_OFFICIAL,
            odds=default_odds(),
            odds_source="Estimation",
            odds_movement=OddsMovement.STABLE,
        )
        return {"match": match, "reject": None}

agent_collector = AgentCollector()
