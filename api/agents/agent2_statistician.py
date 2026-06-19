"""FasoBet - Agent 2: Statistician (BLOC 2)
Équivalent Python de src/agents/agent-statistician.ts

Rôle : Analyser les matchs, calculer les probabilités via Poisson,
évaluer la forme, les xG, et le H2H.
Utilise Claude Sonnet 4 si ANTHROPIC_API_KEY est configuré,
sinon fallback déterministe.
"""

from __future__ import annotations

import json
import os
import re
import asyncio
from datetime import datetime, timezone
from typing import Optional

from api.lib.llm_json import parse_llm_json_payload
from api.lib.leagues import LEAGUES, get_league_avg_goals
from api.lib.poisson import compute_lambdas, prob_1x2, prob_btts, prob_over_25
from api.models import (
    Agent2Output,
    CompositeScore,
    FormSummary,
    MatchStatistics,
    PoissonProbs,
    StatisticianOptions,
    VerifiedMatch,
    XgDiff,
)


MAX_FORM_MATCHES = 5
POINTS_PER_WIN = 3
POINTS_PER_DRAW = 1
MAX_FORM_POINTS = MAX_FORM_MATCHES * POINTS_PER_WIN
DEFAULT_FORM_SCORE = 50
DEFAULT_XG_ATT = 1.3
DEFAULT_XG_DEF = 1.2
XG_SCALE_FACTOR = 20
XG_BASELINE = 50
FRIENDLY_FORM_WEIGHT = 0.25
COMPETITIVE_FORM_WEIGHT = 0.4
XG_WEIGHT = 0.3
H2H_WEIGHT = 0.15
HOME_BIAS = 55
AWAY_BIAS = 45


def form_to_score(form: Optional[str]) -> int:
    if not form:
        return DEFAULT_FORM_SCORE
    chars = form[-MAX_FORM_MATCHES:]
    pts = 0
    for c in chars:
        if c == "W":
            pts += POINTS_PER_WIN
        elif c == "D":
            pts += POINTS_PER_DRAW
    return min(100, round((pts / MAX_FORM_POINTS) * 100))


def parse_xg_from_stats(stats: Optional[dict]) -> dict:
    if not stats:
        return {"att": DEFAULT_XG_ATT, "def": DEFAULT_XG_DEF}
    try:
        gf = float(stats.get("goals", {}).get("for", {}).get("average", {}).get("total", DEFAULT_XG_ATT))
        ga = float(stats.get("goals", {}).get("against", {}).get("average", {}).get("total", DEFAULT_XG_DEF))
    except (ValueError, TypeError, AttributeError):
        gf = DEFAULT_XG_ATT
        ga = DEFAULT_XG_DEF
    return {"att": gf, "def": ga}


def h2h_summary(h2h: list[dict], home_name: str) -> str:
    if not h2h:
        return "Pas de H2H récent"
    home_wins = 0
    draws = 0
    for m in h2h:
        is_home = m.get("teams", {}).get("home", {}).get("name", "") == home_name
        hg = m.get("goals", {}).get("home") or 0
        ag = m.get("goals", {}).get("away") or 0
        home_goals = hg if is_home else ag
        away_goals = ag if is_home else hg
        if home_goals > away_goals:
            home_wins += 1
        elif home_goals == away_goals:
            draws += 1
    return f"{home_name} {home_wins}V-{draws}N sur {len(h2h)} matchs"


async def _fetch_team_stats(team_id: int, league_id: int, season: int) -> Optional[dict]:
    import httpx
    api_key = os.environ.get("FOOTBALL_API_KEY", "")
    base_url = os.environ.get("FOOTBALL_API_URL", "https://v3.football.api-sports.io")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/teams/statistics",
                headers={"x-apisports-key": api_key},
                params={"team": team_id, "league": league_id, "season": season},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response")
    except Exception as e:
        print(f"[Agent2] Error fetching stats: {e}")
        return None


async def _fetch_h2h(team1_id: int, team2_id: int) -> list[dict]:
    import httpx
    api_key = os.environ.get("FOOTBALL_API_KEY", "")
    base_url = os.environ.get("FOOTBALL_API_URL", "https://v3.football.api-sports.io")
    if not api_key:
        return []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/fixtures/headtohead",
                headers={"x-apisports-key": api_key},
                params={"h2h": f"{team1_id}-{team2_id}", "last": 5},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", [])
    except Exception:
        return []


async def analyze_match_deterministic(match: VerifiedMatch) -> MatchStatistics:
    season = 2025
    for liga in LEAGUES.values():
        if liga.id == (match.league_id or 0):
            season = liga.season
            break

    home_stats = None
    away_stats = None
    h2h = []

    if match.home_id and match.league_id:
        home_stats = await _fetch_team_stats(match.home_id, match.league_id, season)
    if match.away_id and match.league_id:
        away_stats = await _fetch_team_stats(match.away_id, match.league_id, season)
    if match.home_id and match.away_id:
        h2h = await _fetch_h2h(match.home_id, match.away_id)

    home_xg = parse_xg_from_stats(home_stats)
    away_xg = parse_xg_from_stats(away_stats)
    league_avg = get_league_avg_goals(match.league_id or 0)

    # Poisson calculation in executor
    loop = asyncio.get_event_loop()
    lambda_home, lambda_away = await loop.run_in_executor(None, compute_lambdas,
        home_xg["att"], home_xg["def"],
        away_xg["att"], away_xg["def"],
        league_avg,
    )

    form_home = form_to_score(home_stats.get("form") if home_stats else None)
    form_away = form_to_score(away_stats.get("form") if away_stats else None)

    xg_score_home = min(100, round(XG_BASELINE + (home_xg["att"] - away_xg["def"]) * XG_SCALE_FACTOR))
    xg_score_away = min(100, round(XG_BASELINE + (away_xg["att"] - home_xg["def"]) * XG_SCALE_FACTOR))

    # H2H score calculation
    if h2h:
        hw = 0
        dr = 0
        for m in h2h:
            is_home = m.get("teams", {}).get("home", {}).get("name", "") == match.home
            hg = m.get("goals", {}).get("home") or 0
            ag = m.get("goals", {}).get("away") or 0
            home_goals = hg if is_home else ag
            away_goals = ag if is_home else hg
            if home_goals > away_goals:
                hw += 1
            elif home_goals == away_goals:
                dr += 1
        h2h_score = round(((hw * 3 + dr) / (len(h2h) * 3)) * 100)
    else:
        h2h_score = DEFAULT_FORM_SCORE

    is_friendly = "friendly" in match.match_type.value if hasattr(match.match_type, "value") else False
    form_weight = FRIENDLY_FORM_WEIGHT if is_friendly else COMPETITIVE_FORM_WEIGHT

    # ✅ FIX: Correction des poids et du biais
    composite_home = round(
        form_home * form_weight
        + xg_score_home * XG_WEIGHT
        + h2h_score * H2H_WEIGHT
        + (HOME_BIAS * 0.1) # Petit boost domicile
    )
    composite_away = round(
        form_away * form_weight
        + xg_score_away * XG_WEIGHT
        + (100 - h2h_score) * H2H_WEIGHT
        + (AWAY_BIAS * 0.1)
    )

    # Normalisation pour que le total soit proche de 100
    total = composite_home + composite_away
    if total > 0:
        composite_home = min(100, round((composite_home / total) * 100))
        composite_away = 100 - composite_home

    probs_1x2 = prob_1x2(lambda_home, lambda_away)

    context_flags = []
    if is_friendly:
        context_flags.append("friendly_match")
    if match.odds_movement.value == "home_dropping":
        context_flags.append("sharp_money_home")

    # ─── Facteurs numériques (pour la confidence Rust) ───
    # Form scores numériques dérivés depuis la forme string
    home_form_score = form_to_score(home_stats.get("form") if home_stats else None)
    away_form_score = form_to_score(away_stats.get("form") if away_stats else None)

    # H2H wins/draws
    h2h_home_wins = None
    h2h_away_wins = None
    h2h_draws = None
    h2h_total_matches = None

    if h2h:
        h2h_total_matches = len(h2h)
        hw = 0
        aw = 0
        dr = 0
        for m in h2h:
            is_home = m.get("teams", {}).get("home", {}).get("name", "") == match.home
            hg = m.get("goals", {}).get("home") or 0
            ag = m.get("goals", {}).get("away") or 0
            home_goals = hg if is_home else ag
            away_goals = ag if is_home else hg
            if home_goals > away_goals:
                hw += 1
            elif home_goals == away_goals:
                dr += 1
            else:
                aw += 1
        h2h_home_wins = hw
        h2h_away_wins = aw
        h2h_draws = dr

    # data_quality + home_advantage : disponibles via le collector, mais pas forcément ici.
    # On remplit en fallback robuste.
    data_quality = getattr(match, "data_quality", None) if hasattr(match, "data_quality") else None
    is_home_advantage = True

    # Résoudre le vrai ID PostgreSQL depuis external_id
    from predictions.models import Match as DjangoMatch
    from asgiref.sync import sync_to_async
    try:
        db_match = await sync_to_async(DjangoMatch.objects.get)(external_id=match.id)
        real_match_id = str(db_match.id)  # bigint converti en str
    except DjangoMatch.DoesNotExist:
        real_match_id = match.id  # fallback

    return MatchStatistics(
        match_id=real_match_id,
        composite_score=CompositeScore(home=composite_home, away=composite_away),
        poisson=PoissonProbs(
            lambda_home=round(lambda_home, 2),
            lambda_away=round(lambda_away, 2),
            prob_over_2_5=round(prob_over_25(lambda_home, lambda_away), 2),
            prob_btts=round(prob_btts(lambda_home, lambda_away), 2),
            prob_home_win=round(probs_1x2["home"], 2),
            prob_draw=round(probs_1x2["draw"], 2),
            prob_away_win=round(probs_1x2["away"], 2),
        ),
        form_summary=FormSummary(
            home=(home_stats.get("form", "")[-5:] if home_stats and home_stats.get("form") else "WDWWL"),
            away=(away_stats.get("form", "")[-5:] if away_stats and away_stats.get("form") else "LWDWL"),
        ),
        xg_diff=XgDiff(
            home=f"{'+' if home_xg['att'] - away_xg['def'] >= 0 else ''}{home_xg['att'] - away_xg['def']:.1f}",
            away=f"{'+' if away_xg['att'] - home_xg['def'] >= 0 else ''}{away_xg['att'] - home_xg['def']:.1f}",
        ),
        context_flags=context_flags,
        match_type_warning="Confiance plafonnee 60% (match amical)" if is_friendly else None,
        h2h_summary=h2h_summary(h2h, match.home),

        home_form_score=home_form_score,
        away_form_score=away_form_score,
        h2h_home_wins=h2h_home_wins,
        h2h_away_wins=h2h_away_wins,
        h2h_draws=h2h_draws,
        h2h_total_matches=h2h_total_matches,
        data_quality=data_quality,
        is_home_advantage=is_home_advantage,
    )



AFRICA_SYSTEM_PROMPT = """
Tu es un statisticien expert du football africain avec 15 ans d'experience.

CONTEXTE AFRIQUE :
1. Les stats xG sont rarement disponibles -> compense avec forme recente + H2H
2. Les conditions meteo (chaleur, saison des pluies) impactent le jeu de 10-15%
3. Les matchs de Coupe > Championnat en enjeu psychologique
4. Les equipes nord-africaines sont structurellement differentes des subsahariennes
5. La motivation varie selon les enjeux (relegation, titre, coupe)

Reponds UNIQUEMENT en JSON valide avec cette structure:
{
  "analyses": [ { "match_id", "composite_score", "poisson", "form_summary", "xg_diff", "context_flags", "match_type_warning", "h2h_summary" } ],
  "analyzed_at": "ISO8601"
}

REGLES :
- Si donnees insuffisantes -> confidence_score < 0.5
- Si H2H < 3 matchs -> indiquer dans h2h_summary
- Toujours justifier le match_type_warning si present
- Ne jamais inventer des statistiques
"""


class AgentStatistician:
    def __init__(self):
        self.system_prompt = AFRICA_SYSTEM_PROMPT

    async def run(self, options: StatisticianOptions) -> Agent2Output:
        matches = options.matches
        historical = options.historical

        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            try:
                return await self._run_with_claude(matches, historical)
            except Exception as e:
                print(f"[Agent2] Claude failed, fallback deterministic: {e}")

        analyses = []
        for match in matches:
            stats = await analyze_match_deterministic(match)
            analyses.append(stats)

        return Agent2Output(
            analyses=analyses,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
        )

    async def _run_with_claude(self, matches: list[VerifiedMatch],
                                historical: Optional[dict] = None) -> Agent2Output:
        import anthropic
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

        skill_path = os.path.join(os.path.dirname(__file__), "..", "data", "football_skill.txt")
        skill = ""
        if os.path.exists(skill_path):
            with open(skill_path) as f:
                skill = f.read()

        matches_json = json.dumps([m.model_dump() for m in matches], default=str)
        prompt = self.system_prompt + "\n\n=== SKILL : PREDICTION FOOTBALL ===\n" + skill

        client = anthropic.AsyncAnthropic(api_key=anthropic_key)
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=prompt,
            messages=[{"role": "user", "content": matches_json}],
        )
        content = response.content[0].text
        return parse_llm_json_payload(content, Agent2Output)


agent_statistician = AgentStatistician()