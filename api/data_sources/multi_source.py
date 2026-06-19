import httpx
import asyncio
import os
from datetime import date, timedelta
from typing import Optional

# ─── SOURCE 2 : OpenFootball CM2026 ──────────────────────────────
async def fetch_openfootball_worldcup(
    target_date: Optional[date] = None
) -> list[dict]:
    """
    Retourne les matchs CM2026 depuis OpenFootball (gratuit, sans clé).
    """
    url = (
        "https://raw.githubusercontent.com/"
        "openfootball/worldcup.json/master/2026/worldcup.json"
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        print(f"[OpenFootball] Erreur: {e}")
        return []

    matches = data.get("matches", [])
    today_date_obj = target_date or date.today()

    result = []
    for m in matches:
        try:
            match_date = date.fromisoformat(m["date"])
        except (KeyError, ValueError):
            continue

        # Inclure matchs du jour + 7 jours à venir
        if today_date_obj <= match_date <= today_date_obj + timedelta(days=7):
            time_str = m.get('time', '12:00 UTC+00:00') # Default to UTC
            # Clean up potential 'UTC-X:00' to a simple time for isoformat
            if 'UTC' in time_str:
                time_str = time_str.split(' ')[0] # Keep only HH:MM
            
            result.append({
                "id": abs(hash(f"{m['date']}_{m['team1']}_{m['team2']}")) % 2147483647,
                "home_team": m["team1"],
                "away_team": m["team2"],
                "kickoff_utc": f"{m['date']}T{time_str}:00+00:00", # Assume UTC if no explicit offset
                "competition": "FIFA World Cup 2026",
                "season": "2026",
                "status": "SCHEDULED",
                "source": "openfootball",
                "odds_home": None,
                "odds_draw": None,
                "odds_away": None,
            })

    print(f"[OpenFootball] {len(result)} matchs CM2026 trouvés")
    return result


# ─── SOURCE 3 : football-data.org ────────────────────────────────
async def fetch_football_data_org(
    target_date: Optional[date] = None
) -> list[dict]:
    """
    Retourne les matchs depuis football-data.org (gratuit, 10 req/min).
    Nécessite FOOTBALL_DATA_ORG_KEY dans .env (clé gratuite sur football-data.org)
    """
    api_key = os.environ.get("FOOTBALL_DATA_ORG_KEY")
    if not api_key:
        print("[football-data.org] Clé FOOTBALL_DATA_ORG_KEY manquante, skip")
        return []

    today = target_date or date.today()
    date_to = today + timedelta(days=7)
    headers = {"X-Auth-Token": api_key}

    url = "https://api.football-data.org/v4/matches"
    params = {
        "dateFrom": today.isoformat(),
        "dateTo": date_to.isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        print(f"[football-data.org] Erreur: {e}")
        return []

    matches = data.get("matches", [])
    result = []
    for m in matches:
        try:
            home = m["homeTeam"]["name"]
            away = m["awayTeam"]["name"]
            utc = m["utcDate"]
            competition = m["competition"]["name"]
            match_id = str(m["id"])
            result.append({
                "id": f"fdorg_{match_id}",
                "home_team": home,
                "away_team": away,
                "kickoff_utc": utc,
                "competition": competition,
                "season": "2026",
                "status": "SCHEDULED",
                "source": "football_data_org",
                "odds_home": None,
                "odds_draw": None,
                "odds_away": None,
            })
        except KeyError:
            continue

    print(f"[football-data.org] {len(result)} matchs trouvés")
    return result


# ─── SOURCE 4 : TheSportsDB ──────────────────────────────────────
async def fetch_thesportsdb(
    target_date: Optional[date] = None
) -> list[dict]:
    """
    Retourne les matchs depuis TheSportsDB (totalement gratuit, sans clé).
    Couvre les grandes ligues européennes.
    """
    today = target_date or date.today()
    date_str = today.isoformat()

    # Ligues TheSportsDB ID (grands championnats + CM)
    league_ids = {
        "4328": "English Premier League",
        "4335": "La Liga",
        "4331": "Bundesliga",
        "4332": "Serie A",
        "4334": "Ligue 1",
        "4399": "FIFA World Cup",
    }

    result = []
    async with httpx.AsyncClient(timeout=15) as client:
        for league_id, league_name in league_ids.items():
            url = (
                f"https://www.thesportsdb.com/api/v1/json/3/"
                f"eventsday.php?d={date_str}&l={league_id}"
            )
            try:
                r = await client.get(url)
                r.raise_for_status()
                data = r.json()
                events = data.get("events") or []
                for e in events:
                    try:
                        result.append({
                            "id": f"tsdb_{e['idEvent']}",
                            "home_team": e["strHomeTeam"],
                            "away_team": e["strAwayTeam"],
                            "kickoff_utc": f"{e['dateEvent']}T{e.get('strTime','12:00:00')}",
                            "competition": league_name,
                            "season": "2026",
                            "status": "SCHEDULED",
                            "source": "thesportsdb",
                            "odds_home": None,
                            "odds_draw": None,
                            "odds_away": None,
                        })
                    except KeyError:
                        continue
            except Exception as e:
                print(f"[TheSportsDB] Erreur league {league_id}: {e}")
                continue
            await asyncio.sleep(0.2)  # respecter le rate limit

    print(f"[TheSportsDB] {len(result)} matchs trouvés")
    return result


# ─── ORCHESTRATEUR FALLBACK ──────────────────────────────────────
async def fetch_matches_with_fallback(
    api_sports_matches: list,
    target_date: Optional[date] = None
) -> tuple[list, str]:
    """
    Retourne (matches, source_utilisée).
    Essaie chaque source dans l'ordre jusqu'à trouver des matchs.
    """
    # Source 1 : API-Sports (résultat déjà calculé, passé en paramètre)
    if api_sports_matches:
        print(f"[Fallback] Source 1 (API-Sports): {len(api_sports_matches)} matchs")
        return api_sports_matches, "api_sports"

    # Source 2 : OpenFootball
    matches = await fetch_openfootball_worldcup(target_date)
    if matches:
        print(f"[Fallback] Source 2 (OpenFootball): {len(matches)} matchs")
        return matches, "openfootball"

    # Source 3 : football-data.org
    matches = await fetch_football_data_org(target_date)
    if matches:
        print(f"[Fallback] Source 3 (football-data.org): {len(matches)} matchs")
        return matches, "football_data_org"

    # Source 4 : TheSportsDB
    matches = await fetch_thesportsdb(target_date)
    if matches:
        print(f"[Fallback] Source 4 (TheSportsDB): {len(matches)} matchs")
        return matches, "thesportsdb"

    print("[Fallback] Toutes les sources vides pour cette date")
    return [], "none"
