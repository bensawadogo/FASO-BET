import asyncio
import pytest
import os
from api.db.repositories import get_scheduled_matches
from api.agents.agent2_statistician import analyze_match_deterministic
from api.agents.agent3_strategist import build_prediction, run_deterministic
from api.models import StatisticianOptions, StrategistInput, Agent2Output, MatchStatistics, VerifiedMatch, MatchOdds, MatchType, OddsMovement

@pytest.mark.asyncio
async def test():
    os.environ['TESTING'] = 'True'
    # Récupérer les matchs depuis la base de données
    seed_data = get_scheduled_matches()
    matches: list[VerifiedMatch] = []

    # Mapper vers VerifiedMatch
    for item in seed_data:
        # Construire MatchOdds
        odds = MatchOdds(
            home_win=item.get("odds_home") or 1.0,
            draw=item.get("odds_draw") or 1.0,
            away_win=item.get("odds_away") or 1.0,
            over_2_5=2.0, # Par défaut
            btts=1.8,    # Par défaut
        )

        matches.append(VerifiedMatch(
            id=str(item["id"]),
            home=item["home_team"],
            away=item["away_team"],
            competition=item["competition"],
            date=str(item["kickoff_utc"]),
            league_id=None,
            match_type=MatchType.CLUB_OFFICIAL,
            is_verified=True,
            odds=odds,
            odds_source="Seed",
            odds_movement=OddsMovement.STABLE,
        ))

    print(f'Matches traités: {len(matches)}', flush=True)

    # Exécuter le pipeline pour chaque match
    for m in matches:
        stats = await analyze_match_deterministic(m)
        pred = await run_deterministic(StrategistInput(match=m, statistics=stats))
        print(f'Match {m.home} vs {m.away}: {pred.prediction}')

    # Agent 2
    analyses = []
    for m in matches:
        stats = await analyze_match_deterministic(m)
        analyses.append(stats)

    stats_output = Agent2Output(
        analyses=analyses,
        analyzed_at='2026-06-04T00:00:00Z'
    )
    print(f'Agent2: {len(analyses)} analyses done', flush=True)

    # Agent 3
    input_data = StrategistInput(
        matches=matches,
        statistics=stats_output,
        historical={"marketCalibrations": []}
    )

    try:
        result = run_deterministic(input_data)
        print(f'Agent3: {len(result.predictions)} predictions, {len(result.combos)} combos', flush=True)
        for p in result.predictions[:3]:
            print(f'  {p.home} vs {p.away}: {p.selection} (conf={p.confidence})', flush=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f'Agent3 FAILED: {e}', flush=True)

if __name__ == "__main__":
    asyncio.run(test())
