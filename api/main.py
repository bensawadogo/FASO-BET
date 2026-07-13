"""FasoBet - FastAPI Inference Engine
Routes API exposées :
  POST /pipeline/execute
  POST /predictions/save/
  GET  /predictions
  GET  /health
"""

import os
import time
import httpx
import logging
import asyncio
from fastapi import FastAPI, Request, Query
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List

from api.config import settings

# ─── Django minimal setup (nécessaire pour les agents qui importent des modèles Django) ───
import django
from django.conf import settings as django_settings
if not django_settings.configured:
    django_settings.configure(
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.environ.get('POSTGRES_DB', 'fasobet'),
                'USER': os.environ.get('POSTGRES_USER', 'fasobet'),
                'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'changeme_prod'),
                'HOST': os.environ.get('DJANGO_DB_HOST', 'postgres'),
                'PORT': os.environ.get('DJANGO_DB_PORT', '5432'),
            }
        },
        INSTALLED_APPS=[
            'django.contrib.contenttypes',
            'django.contrib.auth',
            'predictions',
        ],
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
        USE_TZ=True,
        TIME_ZONE='UTC',
    )
    django.setup()

# ─── Sentry error monitoring ──────────────────────────────────
try:
    import sentry_sdk
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN", ""),
        traces_sample_rate=0.1,
        environment=settings.ENV,
    )
except ImportError:
    pass  # Sentry optionnel — pas de crash si absent

from api.services.pipeline import pipeline
from api.models import PipelineOptions, PipelineSuccess, PipelineError, PipelineNoMatches, CollectorOptions
from api.data_sources.seed_matches import get_upcoming_matches

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fasobet")
app = FastAPI(title="FasoBet Inference Engine")

# CORS — origines explicites (obligatoire avec allow_credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DJANGO_URL = settings.DJANGO_INTERNAL_URL
START_TIME = time.time()

# ─── Log Middleware ──────────────────────────────────────────
if not os.environ.get('TESTING'):
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger.info(f"REQUEST: {request.method} {request.url}")
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"CRASH: {str(e)}")
            return JSONResponse(status_code=500, content={"error": "Internal server error"})

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "fasobet-fastapi",
        "version": "2.0.0"
    }

@app.get("/health/metrics")
async def health_metrics():
    from api.lib.cache import get_cache_stats
    stats = get_cache_stats()
    return {
        "status": "healthy",
        "cache_hits": stats["hits"],
        "cache_misses": stats["misses"],
        "redis_connected": stats["redis_connected"],
        "uptime_seconds": time.time() - START_TIME
    }

@app.post("/predict")
async def predict(options: Optional[PipelineOptions] = None):
    try:
        result = await pipeline.run(options)
        if hasattr(result, "predictions"):
            # S'assurer de retourner une structure simple pour FastAPI
            return {
                "predictions": [p.model_dump() for p in result.predictions.predictions],
                "combos": [c.model_dump() for c in result.predictions.combos],
                "strategized_at": result.predictions.strategized_at
            }
        # Si pipeline vide (ex: no_matches)
        return {
            "predictions": [],
            "combos": [],
            "status": "no_matches",
            "message": "Aucun match à prédire pour cette période"
        }
    except Exception as e:
        logger.exception("[predict] failed")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Internal server error"}
        )


@app.post("/matches/collect")
async def collect_matches(options: Optional[CollectorOptions] = None):
    from api.agents.agent1_collector import agent_collector
    return await agent_collector.run(options)

@app.post("/matches/analyze")
async def analyze_matches(data: dict):
    from api.agents.agent2_statistician import agent_statistician, StatisticianOptions
    matches = data.get("matches", [])
    if not matches:
        return JSONResponse(status_code=400, content={"error": "No matches provided"})
    from api.models import VerifiedMatch
    verified = [VerifiedMatch(**m) for m in matches]
    return await agent_statistician.run(StatisticianOptions(matches=verified))

@app.get("/matches/{match_id}")
async def get_match_by_id(match_id: str):
    matches = get_upcoming_matches()
    for match in matches:
        if match["match_id"] == match_id:
            return {
                "id": match["match_id"],
                "match_id": match["match_id"],
                "teamA": match["home_team"],
                "teamB": match["away_team"],
                "league": match["competition"],
                "date": match["kickoff_utc"],
                "h2h": [
                    {"date": "12/01/2025", "home": match["home_team"], "away": match["away_team"], "score": "2-1", "winner": "home"},
                    {"date": "05/08/2024", "home": match["away_team"], "away": match["home_team"], "score": "0-0", "winner": "draw"},
                    {"date": "15/03/2024", "home": match["home_team"], "away": match["away_team"], "score": "1-3", "winner": "away"},
                ],
            }
    return JSONResponse(status_code=404, content={"detail": "Match not found"})

@app.post("/pipeline/run")
async def pipeline_run(options: Optional[PipelineOptions] = None):
    try:
        result = await pipeline.run(options)

        # Sauvegarder les prédictions dans Django après le pipeline
        if hasattr(result, 'predictions') and result.predictions:
            preds = result.predictions.predictions if hasattr(result.predictions, 'predictions') else result.predictions
            stats = result.statistics if hasattr(result, 'statistics') else None
            print(f"[Pipeline] Saving {len(preds) if isinstance(preds, list) else 0} predictions to DB...")
            await _save_predictions(preds, stats)

        # Retourner systématiquement une réponse structurée 200
        if isinstance(result, dict):
            return result
        return result.model_dump()
    except Exception:
        logger.exception("Pipeline execution failed")
        return {
            "status": "error",
            "message": "Pipeline execution failed",
            "pipeline_ran_at": datetime.now(timezone.utc).isoformat()
        }


def _map_predicted_outcome(pred) -> str:
    """Map Agent 3 market/selection to PredictionResult predicted_outcome."""
    market = (pred.market or "").lower()
    sel = (pred.selection or "").lower()
    if "domicile" in market or market == "home_win":
        return "home_win"
    if "exterieure" in market or market == "away_win":
        return "away_win"
    if "nul" in market or market == "draw":
        return "draw"
    if sel in ("1", "home"):
        return "home_win"
    if sel in ("2", "away"):
        return "away_win"
    if sel in ("n", "draw"):
        return "draw"
    return "draw"

def _map_risk_level(risk) -> str:
    """Map Agent 3 risk to PredictionResult risk_level."""
    if not risk:
        return "LOW"
    r = str(risk).upper()
    if "FAIBLE" in r or "LOW" in r:
        return "LOW"
    if "MOYEN" in r or "MEDIUM" in r:
        return "MEDIUM"
    if "ELEVE" in r or "HIGH" in r:
        return "HIGH"
    return "LOW"

def _map_recommended_bet(predicted_outcome: str) -> str:
    return {"home_win": "1", "draw": "N", "away_win": "2"}.get(predicted_outcome, "N")

def _build_key_factors(pred, stats_for_match):
    """Build key_factors JSON with probabilities, markets, extended_markets."""
    kf = {}
    if stats_for_match and hasattr(stats_for_match, 'poisson'):
        p = stats_for_match.poisson
        kf["probabilities"] = {
            "HOME": round(p.prob_home_win, 4),
            "DRAW": round(p.prob_draw, 4),
            "AWAY": round(p.prob_away_win, 4),
        }
        kf["markets"] = {
            "btts_yes": round(p.prob_btts, 4),
            "over_2_5": round(p.prob_over_2_5, 4),
        }
        # Compute extended markets from Poisson
        prob_under_2_5 = 1.0 - p.prob_over_2_5
        prob_no_btts = 1.0 - p.prob_btts
        prob_home = p.prob_home_win
        prob_draw = p.prob_draw
        prob_away = p.prob_away_win
        prob_home_or_draw = prob_home + prob_draw
        prob_away_or_draw = prob_away + prob_draw

        # Over/Under 1.5 (rough estimate from Poisson)
        import math
        lh, la = p.lambda_home, p.lambda_away
        def poisson_prob_under(k, lam):
            return sum(math.exp(-lam) * (lam**i) / math.factorial(i) for i in range(k+1))
        prob_under_1_5_h = poisson_prob_under(1, lh)
        prob_under_1_5_a = poisson_prob_under(1, la)
        prob_under_1_5 = prob_under_1_5_h * prob_under_1_5_a
        prob_over_1_5 = 1.0 - prob_under_1_5
        prob_under_3_5_h = poisson_prob_under(3, lh)
        prob_under_3_5_a = poisson_prob_under(3, la)
        prob_under_3_5 = prob_under_3_5_h * prob_under_3_5_a
        prob_over_3_5 = 1.0 - prob_under_3_5

        # Draw no bet
        total_h_away = prob_home + prob_away
        dnb_home = prob_home / total_h_away if total_h_away > 0 else 0.5
        dnb_away = prob_away / total_h_away if total_h_away > 0 else 0.5

        # Top scores
        top_scores = []
        prob_sum = 0
        for hs in range(6):
            for aw in range(6):
                sc_prob = (math.exp(-lh) * (lh**hs) / math.factorial(hs)) * (math.exp(-la) * (la**aw) / math.factorial(aw))
                if sc_prob > 0.02:
                    top_scores.append({"score": f"{hs}-{aw}", "probability": round(sc_prob, 4)})
                    prob_sum += sc_prob
                    if len(top_scores) >= 5:
                        break
            if len(top_scores) >= 5:
                break

        kf["extended_markets"] = {
            "over_under_1_5": {"over": round(prob_over_1_5, 4), "under": round(prob_under_1_5, 4)},
            "over_under_3_5": {"over": round(prob_over_3_5, 4), "under": round(prob_under_3_5, 4)},
            "draw_no_bet": {"home": round(dnb_home, 4), "away": round(dnb_away, 4)},
            "double_chance": {
                "1X": round(prob_home_or_draw, 4),
                "X2": round(prob_away_or_draw, 4),
                "12": round(prob_home + prob_away, 4),
            },
            "top_scores": top_scores,
        }
        kf["lambdas"] = {"home": round(lh, 4), "away": round(la, 4)}
        kf["form_summary"] = {
            "home": stats_for_match.form_summary.home if hasattr(stats_for_match, 'form_summary') else "",
            "away": stats_for_match.form_summary.away if hasattr(stats_for_match, 'form_summary') else "",
        }
        kf["xg_diff"] = {
            "home": stats_for_match.xg_diff.home if hasattr(stats_for_match, 'xg_diff') else "",
            "away": stats_for_match.xg_diff.away if hasattr(stats_for_match, 'xg_diff') else "",
        }
    else:
        kf["probabilities"] = {"HOME": 0.33, "DRAW": 0.34, "AWAY": 0.33}
        kf["markets"] = {}
        kf["extended_markets"] = {}

    # Agent 3 info
    kf["signal"] = str(pred.signal) if hasattr(pred, 'signal') and pred.signal else "neutral"
    kf["consensus_pct"] = float(pred.consensus_pct) if hasattr(pred, 'consensus_pct') and pred.consensus_pct else 0
    return kf

async def _save_predictions(pred_list, statistics=None):
    """Sauvegarde les prédictions dans Postgres via le repository direct."""
    import asyncio
    import json
    from api.db.repositories import save_prediction

    # Build match_id → statistics lookup
    stats_map = {}
    if statistics and hasattr(statistics, 'analyses'):
        for a in statistics.analyses:
            stats_map[a.match_id] = a

    for pred in pred_list:
        try:
            match_id = str(pred.match_id)
            stats_for_match = stats_map.get(match_id)

            predicted_outcome = _map_predicted_outcome(pred)
            risk_level = _map_risk_level(pred.risk if hasattr(pred, 'risk') else None)
            recommended_bet = _map_recommended_bet(predicted_outcome)
            value_bet = (hasattr(pred, 'signal') and pred.signal == "value_bet") or False

            kf = _build_key_factors(pred, stats_for_match)

            payload = {
                "match_id": match_id,
                "home_team": pred.home or "Unknown",
                "away_team": pred.away or "Unknown",
                "competition": pred.competition or "Unknown",
                "predicted_outcome": predicted_outcome,
                "confidence": float(pred.confidence / 100.0 if hasattr(pred, 'confidence') and pred.confidence > 1 else (pred.confidence if hasattr(pred, 'confidence') else 0.5)),
                "value": float(pred.value if hasattr(pred, 'value') else 0),
                "recommended_bet": recommended_bet,
                "min_odds": float(pred.min_odds if hasattr(pred, 'min_odds') else 2.0),
                "risk_level": risk_level,
                "model_version": "pipeline-v1",
                "prediction_source": "pipeline",
                "features_snapshot": {},
                "value_bet": value_bet,
                "key_factors": json.dumps(kf),
                "kickoff_utc": pred.date or "",
                "match_date": (pred.date or "")[:10],
                "sources_used": "[]",
                "data_quality": "MINIMAL",
            }
            print(f"[Save] Saving match {match_id} (outcome={predicted_outcome}, risk={risk_level})...")
            await asyncio.to_thread(save_prediction, payload)
            print(f"[Save] Saved match {match_id} OK")
        except Exception as e:
            print(f"[Save] Failed for {match_id}: {e}")
            logger.warning(f"Failed to save prediction for {match_id}: {e}")



@app.get("/pipeline/status/{task_id}")
async def pipeline_status(task_id: str):
    return JSONResponse(status_code=501, content={"message": "Celery status not implemented in main.py"})

@app.post("/pipeline/execute")
async def run_pipeline(options: Optional[PipelineOptions] = None, request: Request = None):
    logger.info("Pipeline execution triggered")
    try:
        result = await pipeline.run(options)
        if hasattr(result, "status") and result.status == "error":
            return JSONResponse(status_code=500, content=result.model_dump())
        return result
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/predictions")
async def get_predictions(limit: int = 20, competition: Optional[str] = None):
    """Proxy vers Django pour récupérer les prédictions persistées avec extended markets."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            params = {"limit": limit}
            if competition:
                params["competition"] = competition

            # Utiliser l'endpoint list qui contient les prédictions persistées
            resp = await client.get(f"{DJANGO_URL}/api/predictions/", params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Failed to fetch predictions from Django")
        return []

