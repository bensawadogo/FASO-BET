"""FasoBet - Pydantic models (BLOC 2)
Équivalent Python des types TypeScript :
- agent1.types.ts → CollectorModels
- agent2.types.ts → StatisticianModels
- agent3.types.ts → StrategistModels
- match.types.ts → MatchModels
- historical.types.ts → HistoricalModels
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field


# ─── Match Types ───────────────────────────────────────────────

class MatchType(str, Enum):
    CLUB_OFFICIAL = "club_official"
    CLUB_FRIENDLY = "club_friendly"
    NATIONAL_OFFICIAL = "national_official"
    NATIONAL_FRIENDLY = "national_friendly"


class OddsMovement(str, Enum):
    HOME_DROPPING = "home_dropping"
    AWAY_DROPPING = "away_dropping"
    DRAW_RISING = "draw_rising"
    STABLE = "stable"


class MatchOdds(BaseModel):
    home_win: float = Field(..., gt=0)
    draw: float = Field(..., gt=0)
    away_win: float = Field(..., gt=0)
    over_2_5: float = Field(..., gt=0)
    btts: float = Field(..., gt=0)


class VerifiedMatch(BaseModel):
    id: str
    home: str
    away: str
    home_id: Optional[int] = None
    away_id: Optional[int] = None
    competition: str
    league_id: Optional[int] = None
    date: str
    match_type: MatchType
    is_verified: bool = True
    odds: MatchOdds
    odds_source: str = "Estimation"
    odds_movement: OddsMovement = OddsMovement.STABLE


# ─── Agent 1 : Collector ────────────────────────────────────────

class RejectedMatch(BaseModel):
    id: Optional[str] = None
    home: Optional[str] = None
    away: Optional[str] = None
    reason: str


class CollectorOptions(BaseModel):
    date: Optional[str] = None
    leagues: Optional[list[int]] = None


class Agent1Output(BaseModel):
    verified_matches: list[VerifiedMatch]
    rejected_matches: list[RejectedMatch] = []
    collection_timestamp: str


# ─── Agent 2 : Statistician ─────────────────────────────────────

class CompositeScore(BaseModel):
    home: int = Field(..., ge=0, le=100)
    away: int = Field(..., ge=0, le=100)


class PoissonProbs(BaseModel):
    lambda_home: float
    lambda_away: float
    prob_over_2_5: float = Field(..., ge=0, le=1)
    prob_btts: float = Field(..., ge=0, le=1)
    prob_home_win: float = Field(..., ge=0, le=1)
    prob_draw: float = Field(..., ge=0, le=1)
    prob_away_win: float = Field(..., ge=0, le=1)


class FormSummary(BaseModel):
    home: str
    away: str


class XgDiff(BaseModel):
    home: str
    away: str


class MatchStatistics(BaseModel):
    match_id: str
    composite_score: CompositeScore
    poisson: PoissonProbs
    form_summary: FormSummary
    xg_diff: XgDiff
    context_flags: list[str] = []
    match_type_warning: Optional[str] = None
    h2h_summary: Optional[str] = None


class Agent2Output(BaseModel):
    analyses: list[MatchStatistics]
    analyzed_at: str


class StatisticianOptions(BaseModel):
    matches: list[VerifiedMatch]
    historical: Optional[dict] = None


# ─── Agent 3 : Strategist ───────────────────────────────────────

class Signal(str, Enum):
    VALUE_BET = "value_bet"
    NEUTRAL = "neutral"
    AVOID = "avoid"


class RiskLevel(str, Enum):
    FAIBLE = "FAIBLE"
    MOYEN = "MOYEN"
    ELEVE = "ELEVE"


class MatchPrediction(BaseModel):
    match_id: str
    home: str
    away: str
    competition: str
    date: str
    market: str
    selection: str
    min_odds: float
    confidence: float = Field(..., ge=0, le=100)
    risk: RiskLevel
    signal: Signal
    value: float
    consensus_pct: float = Field(..., ge=0, le=100)
    double_chance: Optional[bool] = None
    match_type_warning: Optional[str] = None
    form_display: Optional[FormSummary] = None
    xg_display: Optional[XgDiff] = None
    h2h_display: Optional[str] = None


class ComboLeg(BaseModel):
    match_label: str
    selection: str
    odds: float
    confidence: float
    double_chance: Optional[bool] = None


class ExpressCombo(BaseModel):
    target_multiplier: float
    legs: list[ComboLeg]
    total_odds: float
    coupon_probability_pct: float = Field(..., ge=0, le=100)
    stake_1000_gain: Optional[float] = None
    stake_5000_gain: Optional[float] = None


class Agent3Output(BaseModel):
    predictions: list[MatchPrediction]
    combos: list[ExpressCombo] = []
    strategized_at: str


class StrategistInput(BaseModel):
    matches: list[VerifiedMatch]
    statistics: Agent2Output
    historical: Optional[dict] = None


# ─── Pipeline ───────────────────────────────────────────────────

class PipelineOptions(BaseModel):
    date: Optional[str] = None
    leagues: Optional[list[int]] = None
    skip_cache: bool = False


class PipelineSuccess(BaseModel):
    status: str = "success"
    pipeline_ran_at: str
    total_matches: int
    collected: Agent1Output
    statistics: Agent2Output
    predictions: Agent3Output


class PipelineNoMatches(BaseModel):
    status: str = "no_matches"
    data: Optional[None] = None
    pipeline_ran_at: str


class PipelineError(BaseModel):
    status: str = "error"
    agent: int
    message: str
    pipeline_ran_at: str


# Type Union pour le pipeline (equivalent de PipelineResult en TS)
PipelineResult = Union[PipelineSuccess, PipelineNoMatches, PipelineError]


class PipelineError(BaseModel):
    status: str = "error"
    agent: int
    message: str
    pipeline_ran_at: str


# ─── Health ─────────────────────────────────────────────────────

class HealthMetrics(BaseModel):
    status: str = "healthy"
    service: str = "fasobet-fastapi"
    version: str = "2.0.0"
    redis_connected: bool = False
    agents_available: list[str] = ["collector", "statistician", "strategist"]
    cache_hits: int = 0
    cache_misses: int = 0
    uptime_seconds: float = 0.0
