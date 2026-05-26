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
from datetime import datetime, timezone
from typing import Optional

from api.lib.leagues import LEAGUES, get_league_avg_goals
from api.lib.poisson import compute_lambdas, prob_1x2, prob_btts, prob_over_25
from api.models import (
    Agent2Output,
    CompositeScore,
    FormSummary,
    MatchStatistics,
    MatchType,
    PoissonProbs,
    StatisticianOptions,
    VerifiedMatch,
    XgDiff,
)


# Constantes (identiques au TS)
MAX_FORM_MATCHES = 5
POINTS_PER_WIN = 3
POINTS_PER_DRAW = 1
MAX_FORM_POINTS = MAX_FORM_MATCHES * POINTS_PER_WIN  # = 15
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
    """Convertit une chaîne de forme (ex: 'WWDLW') en score 0-100.
    Équivalent de formToScore() dans agent-statistician.ts
    """
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
    """Extrait les xG des statistiques d'équipe.
    Équivalent de parseXgFromStats().
    """
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
    """Résumé des confrontations directes.
    Équivalent de h2hSummary().
    """
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
    """Récupère les stats d'une équipe via API Football."""
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
    """Récupère l'historique H2H via API Football."""
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


async def analyze_match_deterministic(
    match: VerifiedMatch,
) -> MatchStatistics:
    """Analyse déterministe complète d'un match (fallback si pas d'API IA).
    Équivalent de analyzeMatchDeterministic() dans agent-statistician.ts
    """
    # Trouver la saison
    season = 2025
    for liga in LEAGUES.values():
        if liga.id == (match.league_id or 0):
            season = liga.season
            break
    
    # Récupérer les stats et H2H en parallèle
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
    
    lambda_home, lambda_away = compute_lambdas(
        home_xg["att"], home_xg["def"],
        away_xg["att"], away_xg["def"],
        league_avg,
    )
    
    form_home = form_to_score(home_stats.get("form") if home_stats else None)
    form_away = form_to_score(away_stats.get("form") if away_stats else None)
    
    xg_score_home = min(100, round(XG_BASELINE + (home_xg["att"] - away_xg["def"]) * XG_SCALE_FACTOR))
    xg_score_away = min(100, round(XG_BASELINE + (away_xg["att"] - home_xg["def"]) * XG_SCALE_FACTOR))
    h2h_score = form_to_score("WWDLW") if h2h else DEFAULT_FORM_SCORE
    
    is_friendly = "friendly" in match.match_type.value if hasattr(match.match_type, "value") else False
    form_weight = FRIENDLY_FORM_WEIGHT if is_friendly else COMPETITIVE_FORM_WEIGHT
    
    composite_home = round(
        form_home * form_weight
        + xg_score_home * XG_WEIGHT
        + h2h_score * H2H_WEIGHT
        + HOME_BIAS * H2H_WEIGHT
    )
    composite_away = round(
        form_away * form_weight
        + xg_score_away * XG_WEIGHT
        + (100 - h2h_score) * H2H_WEIGHT
        + AWAY_BIAS * H2H_WEIGHT
    )
    
    probs_1x2 = prob_1x2(lambda_home, lambda_away)
    
    context_flags = []
    if is_friendly:
        context_flags.append("friendly_match")
    if match.odds_movement.value == "home_dropping":
        context_flags.append("sharp_money_home")
    
    return MatchStatistics(
        match_id=match.id,
        composite_score=CompositeScore(
            home=composite_home,
            away=composite_away,
        ),
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
        match_type_warning="⚠️ MATCH AMICAL — confiance plafonnée 60%" if is_friendly else None,
        h2h_summary=h2h_summary(h2h, match.home),
    )


class AgentStatistician:
    """Agent statisticien : analyse les matchs et calcule les probabilités."""
    
    async def run(self, options: StatisticianOptions) -> Agent2Output:
        matches = options.matches
        historical = options.historical
        
        # Si clé Anthropic configurée, tenter l'IA
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            try:
                return await self._run_with_claude(matches, historical)
            except Exception as e:
                print(f"[Agent2] Claude failed, fallback deterministic: {e}")
        
        # Fallback déterministe
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
        """Utilise Claude Sonnet 4 pour l'analyse."""
        import httpx
        
        # Charger le skill football
        skill_path = os.path.join(os.path.dirname(__file__), "..", "data", "football_skill.txt")
        skill = ""
        if os.path.exists(skill_path):
            with open(skill_path) as f:
                skill = f.read()
        
        system_prompt = f"""Tu es un agent statisticien football spécialisé.
Tu dois OBLIGATOIREMENT suivre les directives du skill ci-dessous.
Ne jamais dévier de la méthodologie décrite.

=== SKILL : PRÉDICTION FOOTBALL & PARIS SPORTIFS ===
{skill}
=====================================================

Réponds UNIQUEMENT en JSON valide avec cette structure:
{{
  "analyses": [ {{ "match_id", "composite_score", "poisson", "form_summary", "xg_diff", "context_flags", "match_type_warning", "h2h_summary" }} ],
  "analyzed_at": "ISO8601"
}}"""
        
        matches_json = json.dumps([m.model_dump() for m in matches], default=str)
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 4000,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": matches_json}],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["content"][0]["text"]
            
            # Extraire le JSON de la réponse
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return Agent2Output(**result)
            
            raise ValueError("No JSON found in Claude response")


agent_statistician = AgentStatistician()
