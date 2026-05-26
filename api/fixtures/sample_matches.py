"""FasoBet - Test fixtures (BLOC 2)
Données de test identiques aux matchs démo des agents TypeScript.
"""

from datetime import datetime, timezone

from api.models import (
    MatchOdds,
    MatchType,
    OddsMovement,
    VerifiedMatch,
)

# Matchs de test standard
SAMPLE_MATCHES = [
    VerifiedMatch(
        id="match_test_001",
        home="PSG",
        away="Lyon",
        competition="Ligue 1",
        league_id=61,
        date=datetime.now(timezone.utc).isoformat(),
        match_type=MatchType.CLUB_OFFICIAL,
        odds=MatchOdds(home_win=1.85, draw=3.4, away_win=4.2, over_2_5=1.75, btts=1.9),
        odds_source="Pinnacle",
        odds_movement=OddsMovement.HOME_DROPPING,
    ),
    VerifiedMatch(
        id="match_test_002",
        home="Liverpool",
        away="Arsenal",
        competition="Premier League",
        league_id=39,
        date=datetime.now(timezone.utc).isoformat(),
        match_type=MatchType.CLUB_OFFICIAL,
        odds=MatchOdds(home_win=2.2, draw=3.5, away_win=3.1, over_2_5=1.72, btts=1.65),
        odds_source="Pinnacle",
        odds_movement=OddsMovement.STABLE,
    ),
    VerifiedMatch(
        id="match_test_003",
        home="Real Madrid",
        away="Barcelona",
        competition="La Liga",
        league_id=140,
        date=datetime.now(timezone.utc).isoformat(),
        match_type=MatchType.CLUB_OFFICIAL,
        odds=MatchOdds(home_win=2.05, draw=3.6, away_win=3.4, over_2_5=1.68, btts=1.55),
        odds_source="Pinnacle",
        odds_movement=OddsMovement.STABLE,
    ),
    # Match amical (pour tester le risk-gate)
    VerifiedMatch(
        id="match_test_004",
        home="Equipe A",
        away="Equipe B",
        competition="International Friendly",
        league_id=None,
        date=datetime.now(timezone.utc).isoformat(),
        match_type=MatchType.NATIONAL_FRIENDLY,
        odds=MatchOdds(home_win=2.5, draw=3.2, away_win=2.8, over_2_5=1.9, btts=1.7),
        odds_source="Estimation",
        odds_movement=OddsMovement.STABLE,
    ),
]

SAMPLE_STATISTICS = {
    "match_test_001": {
        "match_id": "match_test_001",
        "composite_score": {"home": 65, "away": 35},
        "poisson": {
            "lambda_home": 1.8,
            "lambda_away": 0.9,
            "prob_over_2_5": 0.62,
            "prob_btts": 0.55,
            "prob_home_win": 0.52,
            "prob_draw": 0.26,
            "prob_away_win": 0.22,
        },
        "form_summary": {"home": "WWDLW", "away": "LWDWL"},
        "xg_diff": {"home": "+0.5", "away": "-0.3"},
        "context_flags": ["sharp_money_home"],
        "match_type_warning": None,
        "h2h_summary": "PSG 3V-1N sur 5 matchs",
    },
    "match_test_002": {
        "match_id": "match_test_002",
        "composite_score": {"home": 52, "away": 48},
        "poisson": {
            "lambda_home": 1.4,
            "lambda_away": 1.2,
            "prob_over_2_5": 0.55,
            "prob_btts": 0.60,
            "prob_home_win": 0.38,
            "prob_draw": 0.30,
            "prob_away_win": 0.32,
        },
        "form_summary": {"home": "WDWWL", "away": "WDLWW"},
        "xg_diff": {"home": "+0.2", "away": "-0.1"},
        "context_flags": [],
        "match_type_warning": None,
        "h2h_summary": "Liverpool 2V-2N sur 5 matchs",
    },
    "match_test_003": {
        "match_id": "match_test_003",
        "composite_score": {"home": 55, "away": 45},
        "poisson": {
            "lambda_home": 1.6,
            "lambda_away": 1.1,
            "prob_over_2_5": 0.58,
            "prob_btts": 0.52,
            "prob_home_win": 0.45,
            "prob_draw": 0.28,
            "prob_away_win": 0.27,
        },
        "form_summary": {"home": "WWWWL", "away": "LWDWW"},
        "xg_diff": {"home": "+0.4", "away": "-0.2"},
        "context_flags": [],
        "match_type_warning": None,
        "h2h_summary": "Real Madrid 4V-1N sur 5 matchs",
    },
    "match_test_004": {
        "match_id": "match_test_004",
        "composite_score": {"home": 50, "away": 50},
        "poisson": {
            "lambda_home": 1.3,
            "lambda_away": 1.2,
            "prob_over_2_5": 0.50,
            "prob_btts": 0.48,
            "prob_home_win": 0.35,
            "prob_draw": 0.30,
            "prob_away_win": 0.35,
        },
        "form_summary": {"home": "WDLWW", "away": "LDWWL"},
        "xg_diff": {"home": "+0.1", "away": "-0.1"},
        "context_flags": ["friendly_match"],
        "match_type_warning": "⚠️ MATCH AMICAL — confiance plafonnée 60%",
        "h2h_summary": "Pas de H2H récent",
    },
}

# Calibrations de test
SAMPLE_CALIBRATIONS = [
    {"market": "over_under", "trust_range": (0, 40), "adjusted_confidence": 35, "sample_count": 50, "total_profit": 12.5, "roi": 0.05, "avg_value": 0.03},
    {"market": "over_under", "trust_range": (40, 60), "adjusted_confidence": 52, "sample_count": 120, "total_profit": 45.2, "roi": 0.08, "avg_value": 0.06},
    {"market": "over_under", "trust_range": (60, 80), "adjusted_confidence": 68, "sample_count": 80, "total_profit": 32.1, "roi": 0.07, "avg_value": 0.05},
    {"market": "over_under", "trust_range": (80, 100), "adjusted_confidence": 78, "sample_count": 30, "total_profit": 8.5, "roi": 0.04, "avg_value": 0.02},
    {"market": "btts", "trust_range": (0, 40), "adjusted_confidence": 38, "sample_count": 45, "total_profit": 9.8, "roi": 0.04, "avg_value": 0.02},
    {"market": "btts", "trust_range": (40, 60), "adjusted_confidence": 55, "sample_count": 95, "total_profit": 38.4, "roi": 0.09, "avg_value": 0.07},
    {"market": "btts", "trust_range": (60, 80), "adjusted_confidence": 65, "sample_count": 60, "total_profit": 22.0, "roi": 0.06, "avg_value": 0.04},
    {"market": "final_result", "trust_range": (0, 40), "adjusted_confidence": 30, "sample_count": 200, "total_profit": -15.0, "roi": -0.03, "avg_value": 0.01},
    {"market": "final_result", "trust_range": (40, 60), "adjusted_confidence": 48, "sample_count": 350, "total_profit": 85.0, "roi": 0.10, "avg_value": 0.08},
    {"market": "final_result", "trust_range": (60, 80), "adjusted_confidence": 72, "sample_count": 180, "total_profit": 95.0, "roi": 0.12, "avg_value": 0.10},
    {"market": "final_result", "trust_range": (80, 100), "adjusted_confidence": 85, "sample_count": 40, "total_profit": 28.0, "roi": 0.15, "avg_value": 0.12},
]
