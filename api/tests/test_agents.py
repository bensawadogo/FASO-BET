"""Tests for the 3 agents (BLOC 2)
Teste le comportement déterministe de chaque agent.
"""

import pytest

from api.agents.agent1_collector import (
    AgentCollector,
    detect_match_type,
    is_odds_suspicious,
    detect_odds_movement,
    default_odds,
    demo_matches,
)
from api.agents.agent2_statistician import (
    form_to_score,
    parse_xg_from_stats,
    h2h_summary,
)
from api.agents.agent3_strategist import (
    calc_value,
    resolve_signal,
    needs_double_chance,
    build_prediction,
    build_combos,
    run_deterministic,
)
from api.lib.calibration import get_calibrated_confidence, risk_gate
from api.lib.poisson import compute_lambdas, prob_1x2, prob_over_25, prob_btts
from api.models import (
    MatchOdds,
    MatchType,
    OddsMovement,
    Signal,
    VerifiedMatch,
    Agent1Output,
    Agent2Output,
    StrategistInput,
)
from api.fixtures.sample_matches import (
    SAMPLE_MATCHES,
    SAMPLE_STATISTICS,
    SAMPLE_CALIBRATIONS,
)


# ─── Agent 1: Collector ─────────────────────────────────────

class TestDetectMatchType:
    def test_club_official(self):
        assert detect_match_type("Ligue 1", "Regular Season") == MatchType.CLUB_OFFICIAL

    def test_club_friendly(self):
        assert detect_match_type("Club Friendly", "") == MatchType.CLUB_FRIENDLY

    def test_national_official(self):
        assert detect_match_type("World Cup", "") == MatchType.NATIONAL_OFFICIAL
        assert detect_match_type("Euro 2024", "") == MatchType.NATIONAL_OFFICIAL
        assert detect_match_type("CAN 2025", "") == MatchType.NATIONAL_OFFICIAL

    def test_national_friendly(self):
        assert detect_match_type("International Friendly", "Friendly") == MatchType.NATIONAL_FRIENDLY


class TestIsOddsSuspicious:
    def test_valid_odds(self):
        odds = MatchOdds(home_win=2.0, draw=3.3, away_win=3.5, over_2_5=1.8, btts=1.7)
        assert is_odds_suspicious(odds) is None

    def test_too_low_odd(self):
        odds = MatchOdds(home_win=1.001, draw=10.0, away_win=10.0, over_2_5=2.0, btts=2.0)
        assert is_odds_suspicious(odds) is not None

    def test_too_high_odd(self):
        odds = MatchOdds(home_win=100.0, draw=3.3, away_win=3.5, over_2_5=1.8, btts=1.7)
        assert is_odds_suspicious(odds) is not None

    def test_suspicious_implied(self):
        # Implied > 1.15
        odds = MatchOdds(home_win=1.1, draw=2.0, away_win=2.0, over_2_5=1.8, btts=1.7)
        assert is_odds_suspicious(odds) is not None


class TestDetectOddsMovement:
    def test_home_dropping(self):
        assert detect_odds_movement(1.5) == OddsMovement.HOME_DROPPING

    def test_away_dropping(self):
        assert detect_odds_movement(3.0) == OddsMovement.AWAY_DROPPING

    def test_stable(self):
        assert detect_odds_movement(2.0) == OddsMovement.STABLE


class TestDemoMatches:
    def test_returns_three_matches(self):
        matches = demo_matches()
        assert len(matches) == 3

    def test_all_verified(self):
        for m in demo_matches():
            assert m.is_verified is True

    def test_all_club_official(self):
        for m in demo_matches():
            assert m.match_type == MatchType.CLUB_OFFICIAL


# ─── Agent 2: Statistician ──────────────────────────────────

class TestFormToScore:
    def test_perfect_form(self):
        assert form_to_score("WWWWW") == 100

    def test_all_losses(self):
        assert form_to_score("LLLLL") == 0

    def test_mixed(self):
        # 3 wins + 1 draw + 1 loss = 10 pts / 15 * 100 = 67
        assert form_to_score("WWDLW") == 67  # arrondi de 66.67
        assert form_to_score("DLWWD") == 53  # D=1,L=0,W=3,W=3,D=1 = 8/15*100 = 53.3

    def test_none_form(self):
        assert form_to_score(None) == 50
        assert form_to_score("") == 50


class TestParseXgFromStats:
    def test_valid_stats(self):
        stats = {
            "goals": {
                "for": {"average": {"total": "1.8"}},
                "against": {"average": {"total": "1.2"}},
            }
        }
        result = parse_xg_from_stats(stats)
        assert result["att"] == 1.8
        assert result["def"] == 1.2

    def test_empty_stats(self):
        result = parse_xg_from_stats(None)
        assert result["att"] == 1.3
        assert result["def"] == 1.2


class TestH2HSummary:
    def test_no_h2h(self):
        assert h2h_summary([], "PSG") == "Pas de H2H récent"

    def test_some_h2h(self):
        h2h = [
            {"teams": {"home": {"name": "PSG"}, "away": {"name": "Lyon"}}, "goals": {"home": 2, "away": 1}},
            {"teams": {"home": {"name": "Lyon"}, "away": {"name": "PSG"}}, "goals": {"home": 0, "away": 1}},
            {"teams": {"home": {"name": "PSG"}, "away": {"name": "Lyon"}}, "goals": {"home": 1, "away": 1}},
        ]
        result = h2h_summary(h2h, "PSG")
        assert "2V" in result
        assert "1N" in result
        assert "3 matchs" in result


# ─── Agent 3: Strategist ────────────────────────────────────

class TestCalcValue:
    def test_positive_value(self):
        assert calc_value(0.6, 2.0) == pytest.approx(0.2, rel=0.01)

    def test_negative_value(self):
        assert calc_value(0.4, 2.0) == pytest.approx(-0.2, rel=0.01)

    def test_zero_value(self):
        assert calc_value(0.5, 2.0) == pytest.approx(0.0, rel=0.01)


class TestResolveSignal:
    def test_value_bet(self):
        assert resolve_signal(80, 0.10, 75, False) == Signal.VALUE_BET

    def test_avoid(self):
        assert resolve_signal(30, -0.05, 40, False) == Signal.AVOID

    def test_neutral(self):
        assert resolve_signal(55, 0.06, 50, False) == Signal.NEUTRAL

    def test_friendly_caps_confidence(self):
        sig = resolve_signal(100, 0.10, 75, True)
        # La confiance est plafonnée à 60, donc has_conf = False
        # has_value=True, has_consensus=True → 2/3 = NEUTRAL
        assert sig == Signal.NEUTRAL


class TestNeedsDoubleChance:
    def test_final_match(self):
        match = SAMPLE_MATCHES[0]
        match.competition = "Coupe de France Final"
        assert needs_double_chance(match) is True

    def test_low_home_odds(self):
        match = SAMPLE_MATCHES[0]
        match.competition = "Ligue 1"
        match.odds.home_win = 1.3
        assert needs_double_chance(match) is True


class TestBuildPrediction:
    def test_returns_valid_prediction(self):
        match = SAMPLE_MATCHES[0]
        analysis = SAMPLE_STATISTICS["match_test_001"]
        pred = build_prediction(match, analysis)
        assert pred.match_id == "match_test_001"
        assert pred.home == "PSG"
        assert pred.confidence > 0
        assert pred.min_odds > 0
        assert pred.signal in (Signal.VALUE_BET, Signal.NEUTRAL, Signal.AVOID)

    def test_with_calibrations(self):
        match = SAMPLE_MATCHES[0]
        analysis = SAMPLE_STATISTICS["match_test_001"]
        pred = build_prediction(match, analysis, SAMPLE_CALIBRATIONS)
        assert pred.confidence > 0

    def test_friendly_match(self):
        match = SAMPLE_MATCHES[3]
        analysis = SAMPLE_STATISTICS["match_test_004"]
        pred = build_prediction(match, analysis)
        assert pred.match_type_warning is not None


class TestBuildCombos:
    def test_returns_combos(self):
        from api.agents.agent3_strategist import build_prediction
        predictions = []
        for match in SAMPLE_MATCHES[:2]:
            analysis = SAMPLE_STATISTICS.get(match.id, SAMPLE_STATISTICS["match_test_001"])
            pred = build_prediction(match, analysis)
            predictions.append(pred)
        
        combos = build_combos(predictions)
        assert len(combos) == 8  # 8 cibles COMBO_TARGETS
        assert combos[0].target_multiplier == 5
        assert len(combos[0].legs) > 0


# ─── Calibration ────────────────────────────────────────────

class TestCalibration:
    def test_no_calibrations(self):
        conf = get_calibrated_confidence(50, "over_under", None)
        assert conf == 50

    def test_empty_calibrations(self):
        conf = get_calibrated_confidence(50, "over_under", [])
        assert conf == 50

    def test_calibrated_confidence(self):
        conf = get_calibrated_confidence(45, "over_under", SAMPLE_CALIBRATIONS)
        assert conf == 52  # bucket 40-60 → adjusted = 52

    def test_out_of_range(self):
        conf = get_calibrated_confidence(95, "unknown", SAMPLE_CALIBRATIONS)
        assert conf == 95  # fallback à la valeur brute


class TestRiskGate:
    def test_friendly_match(self):
        gate = risk_gate(50, 50, 0.05, SAMPLE_CALIBRATIONS, "national_friendly", "over_under")
        assert gate.accepted is False
        assert "friendly" in gate.reason.lower()

    def test_no_calibrations(self):
        gate = risk_gate(50, 50, 0.05, None, "club_official", "over_under")
        assert gate.accepted is False

    def test_insufficient_samples(self):
        few_samples = [{"market": "over_under", "sample_count": 5}]
        gate = risk_gate(50, 50, 0.05, few_samples, "club_official", "over_under")
        assert gate.accepted is False

    def test_ok(self):
        gate = risk_gate(55, 45, 0.10, SAMPLE_CALIBRATIONS, "club_official", "over_under")
        assert gate.accepted is True


# ─── Pipeline end-to-end ────────────────────────────────────

class TestPipelineDeterministic:
    @pytest.mark.asyncio
    async def test_full_pipeline_with_demo_data(self):
        """Teste le pipeline complet avec les données démo."""
        from api.agents.agent1_collector import agent_collector
        from api.agents.agent2_statistician import agent_statistician
        from api.agents.agent3_strategist import agent_strategist
        from api.models import CollectorOptions, StatisticianOptions, StrategistInput
        
        # Agent 1
        collected = await agent_collector.run(CollectorOptions())
        assert len(collected.verified_matches) == 3
        
        # Agent 2
        stats = await agent_statistician.run(
            StatisticianOptions(matches=collected.verified_matches)
        )
        assert len(stats.analyses) == 3
        assert all(a.match_id for a in stats.analyses)
        
        # Agent 3
        predictions = await agent_strategist.run(
            StrategistInput(
                matches=collected.verified_matches,
                statistics=stats,
            )
        )
        assert len(predictions.predictions) == 3
        assert len(predictions.combos) == 8
        assert predictions.predictions[0].signal in (
            Signal.VALUE_BET, Signal.NEUTRAL, Signal.AVOID
        )
