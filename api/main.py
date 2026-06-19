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

            # Utiliser l'endpoint today qui contient les extended_markets
            resp = await client.get(f"{DJANGO_URL}/api/predictions/today/", params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Failed to fetch predictions from Django")
        return []

