"""
FasoBet — Seed matches for off-season (summer 2026).
Provides realistic upcoming fixtures when live APIs return 0 matches.

Matches cover:
  - African competitions (CAN, WCQ, Ligue 1 BF, Botola)
  - European competitions (Champions League, Nations League)
  - South American (Copa Libertadores)
"""

from datetime import datetime, timezone, timedelta

# Base date = tomorrow to ensure matches are always "upcoming"
_tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
_d = lambda h, m: _tomorrow.replace(hour=h, minute=m, second=0, microsecond=0).isoformat()

UPCOMING_2026 = [
    {
        "match_id": "seed_wcq_sn_cm",
        "home_team": "Sénégal",
        "away_team": "Cameroun",
        "competition": "Qualif. CDM 2026 — CAF",
        "kickoff_utc": _d(18, 0),
        "league_id": 6,
        "odds_home": 2.10, "odds_draw": 3.00, "odds_away": 3.60,
    },
    {
        "match_id": "seed_wcq_ma_eg",
        "home_team": "Maroc",
        "away_team": "Égypte",
        "competition": "Qualif. CDM 2026 — CAF",
        "kickoff_utc": _d(20, 0),
        "league_id": 6,
        "odds_home": 1.75, "odds_draw": 3.40, "odds_away": 4.80,
    },
    {
        "match_id": "seed_wcq_ci_ng",
        "home_team": "Côte d'Ivoire",
        "away_team": "Nigeria",
        "competition": "Qualif. CDM 2026 — CAF",
        "kickoff_utc": _d(17, 0),
        "league_id": 6,
        "odds_home": 2.30, "odds_draw": 3.10, "odds_away": 3.20,
    },
    {
        "match_id": "seed_ligue1_bf_001",
        "home_team": "ASFA Yennenga",
        "away_team": "Étoile Filante",
        "competition": "Ligue 1 Burkina Faso",
        "kickoff_utc": _d(16, 0),
        "league_id": 563,
        "odds_home": 1.95, "odds_draw": 2.90, "odds_away": 4.10,
    },
    {
        "match_id": "seed_ligue1_bf_002",
        "home_team": "Salitas FC",
        "away_team": "AS Douanes",
        "competition": "Ligue 1 Burkina Faso",
        "kickoff_utc": _d(16, 0),
        "league_id": 563,
        "odds_home": 1.85, "odds_draw": 3.10, "odds_away": 4.30,
    },
    {
        "match_id": "seed_botola_001",
        "home_team": "Wydad AC",
        "away_team": "Raja Casablanca",
        "competition": "Botola Pro",
        "kickoff_utc": _d(19, 0),
        "league_id": 200,
        "odds_home": 2.05, "odds_draw": 3.00, "odds_away": 3.70,
    },
    {
        "match_id": "seed_nations_fr_es",
        "home_team": "France",
        "away_team": "Espagne",
        "competition": "UEFA Nations League",
        "kickoff_utc": _d(20, 45),
        "league_id": 5,
        "odds_home": 2.40, "odds_draw": 3.20, "odds_away": 2.90,
    },
    {
        "match_id": "seed_nations_de_it",
        "home_team": "Allemagne",
        "away_team": "Italie",
        "competition": "UEFA Nations League",
        "kickoff_utc": _d(20, 45),
        "league_id": 5,
        "odds_home": 2.25, "odds_draw": 3.25, "odds_away": 3.10,
    },
    {
        "match_id": "seed_libertadores_001",
        "home_team": "Flamengo",
        "away_team": "River Plate",
        "competition": "Copa Libertadores",
        "kickoff_utc": _d(22, 0),
        "league_id": 13,
        "odds_home": 1.90, "odds_draw": 3.30, "odds_away": 4.00,
    },
    {
        "match_id": "seed_cl_qf_001",
        "home_team": "Real Madrid",
        "away_team": "Manchester City",
        "competition": "UEFA Champions League",
        "kickoff_utc": _d(21, 0),
        "league_id": 2,
        "odds_home": 2.60, "odds_draw": 3.40, "odds_away": 2.55,
    },
    {
        "match_id": "seed_pl_ars_liv",
        "home_team": "Arsenal",
        "away_team": "Liverpool",
        "competition": "Premier League",
        "kickoff_utc": _d(18, 30),
        "league_id": 39,
        "odds_home": 2.15, "odds_draw": 3.50, "odds_away": 3.10,
    },
    {
        "match_id": "seed_ligue1_psg_om",
        "home_team": "PSG",
        "away_team": "Marseille",
        "competition": "Ligue 1",
        "kickoff_utc": _d(21, 0),
        "league_id": 61,
        "odds_home": 1.55, "odds_draw": 4.20, "odds_away": 5.50,
    },
]


def get_upcoming_matches() -> list[dict]:
    """Returns seed matches — filtered to future dates only."""
    now = datetime.now(timezone.utc).isoformat()
    return [m for m in UPCOMING_2026 if m["kickoff_utc"] > now]
