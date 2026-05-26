"""FasoBet - FastAPI Inference Engine (BLOC 2)
Routes API exposées :
  POST /predict       → Prédiction instantanée synchrone (via pipeline déterministe)
  POST /pipeline/run  → Pipeline complet async (retourne immédiatement un task_id)
  GET  /pipeline/status/{task_id} → Statut d'une tâche async
  GET  /health        → Healthcheck simple
  GET  /health/metrics → Métriques détaillées (cache, uptime, etc.)
  GET  /docs          → Documentation OpenAPI auto-générée
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ─── OpenTelemetry (BLOC 5) ──────────────────────────────────
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from prometheus_client import start_http_server
from opentelemetry.exporter.prometheus import PrometheusMetricReader

from api.lib.cache import get_cache_stats
from api.models import (
    Agent1Output,
    Agent2Output,
    Agent3Output,
    CollectorOptions,
    HealthMetrics,
    PipelineError,
    PipelineNoMatches,
    PipelineOptions,
    PipelineResult,
    PipelineSuccess,
    StatisticianOptions,
    StrategistInput,
)

# ─── App creation ────────────────────────────────────────────
start_time = time.time()

app = FastAPI(
    title="FasoBet Inference Engine",
    description="API de prédictions sportives IA — 3 agents : Collector → Statistician → Strategist",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — autoriser le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── OpenTelemetry Configuration (BLOC 5) ─────────────────────
def setup_opentelemetry():
    """Configure OpenTelemetry pour les traces et métriques."""
    # Configuration des ressources
    resource = Resource.create({
        "service.name": os.environ.get("OTEL_SERVICE_NAME", "fasobet-fastapi"),
        "service.version": "2.0.0",
        "deployment.environment": os.environ.get("FASTAPI_ENV", "development"),
    })

    # Configuration des traces
    trace_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(trace_provider)

    # Export des traces vers Jaeger
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318/v1/traces"),
        insecure=True,
    )
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace_provider.add_span_processor(span_processor)

    # Configuration des métriques
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318/v1/metrics"),
            insecure=True,
        ),
        export_interval_millis=10000,  # 10 secondes
    )

    # Export Prometheus pour les métriques
    prometheus_reader = PrometheusMetricReader()
    start_http_server(port=8002, addr="0.0.0.0")

    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[metric_reader, prometheus_reader],
    )

    # Instrumentation automatique
    FastAPIInstrumentor.instrument_app(app)
    RedisInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
    LoggingInstrumentor().instrument()

    # Créer un meter global pour les métriques personnalisées
    meter = meter_provider.get_meter("fasobet.pipeline", "2.0.0")
    return meter

# Initialiser OpenTelemetry
try:
    pipeline_meter = setup_opentelemetry()
    print("✅ OpenTelemetry configuré avec succès")
except Exception as e:
    print(f"⚠️  OpenTelemetry non configuré: {str(e)}")
    pipeline_meter = None

# ─── Logging structuré JSON (BLOC 5) ──────────────────────────
import logging
import json
from pythonjsonlogger import jsonlogger

def setup_structured_logging():
    """Configure les logs structurés en JSON."""
    logger = logging.getLogger("fasobet")

    # Configuration du format JSON
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(user_id)s',
        rename_fields={'levelname': 'severity', 'asctime': 'timestamp'},
        datefmt='%Y-%m-%dT%H:%M:%SZ',
    )
    logHandler.setFormatter(formatter)
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)

    # Désactiver la propagation pour éviter les doublons
    logger.propagate = False

    return logger

# Initialiser les logs structurés
try:
    structured_logger = setup_structured_logging()
    print("✅ Logging structuré JSON configuré")
except Exception as e:
    print(f"⚠️  Logging structuré non configuré: {str(e)}")
    structured_logger = None


# ─── Health endpoints ────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    """Healthcheck simple."""
    return {"status": "healthy", "service": "fasobet-fastapi"}


@app.get("/health/metrics", tags=["Health"])
async def health_metrics():
    """Métriques détaillées du service avec OpenTelemetry."""
    cache_stats = get_cache_stats()
    uptime = time.time() - start_time

    # Métriques OpenTelemetry (BLOC 5)
    otel_status = "disabled"
    if pipeline_meter:
        otel_status = "enabled"

    return HealthMetrics(
        redis_connected=cache_stats.get("redis_connected", False),
        cache_hits=cache_stats.get("hits", 0),
        cache_misses=cache_stats.get("misses", 0),
        uptime_seconds=round(uptime, 1),
        otel_status=otel_status,
        otel_service_name=os.environ.get("OTEL_SERVICE_NAME", "fasobet-fastapi"),
        otel_exporter_endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318"),
    )

@app.get("/admin/metrics", tags=["Admin", "Health"])
async def admin_metrics():
    """Dashboard health complet avec métriques OpenTelemetry (BLOC 5)."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

    # Métriques Prometheus
    prometheus_metrics = generate_latest()

    # Métriques personnalisées
    cache_stats = get_cache_stats()
    uptime = time.time() - start_time

    metrics_data = {
        "service": "fasobet-fastapi",
        "version": "2.0.0",
        "uptime_seconds": round(uptime, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache": {
            "connected": cache_stats.get("redis_connected", False),
            "hits": cache_stats.get("hits", 0),
            "misses": cache_stats.get("misses", 0),
            "hit_rate": round(cache_stats.get("hits", 0) / max(1, (cache_stats.get("hits", 0) + cache_stats.get("misses", 0))) * 100, 2) if (cache_stats.get("hits", 0) + cache_stats.get("misses", 0)) > 0 else 0,
        },
        "opentelemetry": {
            "status": "enabled" if pipeline_meter else "disabled",
            "service_name": os.environ.get("OTEL_SERVICE_NAME", "fasobet-fastapi"),
            "exporter_endpoint": os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318"),
            "traces_enabled": "enabled" if pipeline_meter else "disabled",
            "metrics_enabled": "enabled" if pipeline_meter else "disabled",
            "logs_enabled": "enabled" if pipeline_meter else "disabled",
        },
        "endpoints": {
            "health": "/health",
            "metrics": "/health/metrics",
            "admin_metrics": "/admin/metrics",
            "prometheus": "http://fastapi:8002",
            "openapi": "/docs",
            "redoc": "/redoc",
        },
        "pipeline_metrics": {
            "total_predictions": 0,  # À implémenter avec un compteur global
            "async_tasks": 0,  # À implémenter avec un compteur global
            "error_rate": 0,  # À implémenter avec un calcul basé sur les erreurs
            "avg_duration_seconds": 0,  # À implémenter avec un histogramme
        }
    }

    return {
        "status": "healthy",
        "metrics": metrics_data,
        "prometheus_metrics_url": "http://fastapi:8002",
        "prometheus_metrics_preview": prometheus_metrics.decode("utf-8")[:500] + "..." if len(prometheus_metrics) > 500 else prometheus_metrics.decode("utf-8"),
    }


# ─── Prediction endpoints ───────────────────────────────────

@app.post(
    "/predict",
    response_model=Agent3Output,
    tags=["Prediction"],
    summary="Prédiction synchrone complète",
    description="Exécute le pipeline complet (3 agents) et retourne les prédictions.",
)
async def predict(
    options: Optional[PipelineOptions] = None,
):
    """Prédiction synchrone : exécute tout le pipeline et retourne les résultats.

    ATTENTION: Cette route est bloquante ~10-30s car elle exécute 3 agents en séquence.
    Pour un usage non-bloquant, utiliser POST /pipeline/run.
    """
    if options is None:
        options = PipelineOptions()

    from api.services.pipeline import pipeline

    # Métriques pipeline (BLOC 5)
    start_time = time.time()
    pipeline_counter = 0
    error_counter = 0

    try:
        result = await pipeline.run(options)

        # Enregistrer les métriques
        if pipeline_meter:
            duration = time.time() - start_time
            pipeline_counter += 1

            # Métriques personnalisées
            pipeline_meter.create_counter(
                "fasobet.pipeline.predictions.total",
                description="Nombre total de prédictions générées",
            ).add(pipeline_counter, {
                "status": "success",
                "agent": "all",
            })

            pipeline_meter.create_histogram(
                "fasobet.pipeline.duration.seconds",
                description="Durée des prédictions en secondes",
            ).record(duration, {
                "agent": "all",
            })

        if isinstance(result, PipelineSuccess):
            return result.predictions

        if isinstance(result, PipelineNoMatches):
            error_counter += 1
            if pipeline_meter:
                pipeline_meter.create_counter(
                    "fasobet.pipeline.errors.total",
                    description="Nombre total d'erreurs de pipeline",
                ).add(1, {
                    "error_type": "no_matches",
                })
            raise HTTPException(status_code=404, detail="Aucun match trouvé pour cette date")

        if isinstance(result, PipelineError):
            error_counter += 1
            if pipeline_meter:
                pipeline_meter.create_counter(
                    "fasobet.pipeline.errors.total",
                    description="Nombre total d'erreurs de pipeline",
                ).add(1, {
                    "error_type": "agent_failure",
                    "agent": result.agent,
                })
            raise HTTPException(
                status_code=502,
                detail=f"Agent {result.agent} a échoué: {result.message}",
            )

        raise HTTPException(status_code=500, detail="Erreur inconnue")
    except Exception as e:
        error_counter += 1
        if pipeline_meter:
            pipeline_meter.create_counter(
                "fasobet.pipeline.errors.total",
                description="Nombre total d'erreurs de pipeline",
            ).add(1, {
                "error_type": "unknown",
            })
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")


@app.post(
    "/pipeline/run",
    response_model=dict,
    tags=["Pipeline"],
    summary="Lancer le pipeline en mode async",
    description="Lance le pipeline en tâche de fond (Celery) et retourne un task_id.",
)
async def run_pipeline_async(options: Optional[PipelineOptions] = None):
    """Lance le pipeline de manière asynchrone via Celery.

    Retourne immédiatement un task_id. Utiliser GET /pipeline/status/{task_id}
    pour récupérer le résultat.
    """
    if options is None:
        options = PipelineOptions()

    try:
        from api.tasks import app as celery_app, run_pipeline_task

        # Métriques pipeline async (BLOC 5)
        if pipeline_meter:
            pipeline_meter.create_counter(
                "fasobet.pipeline.async.total",
                description="Nombre total de pipelines async lancés",
            ).add(1, {
                "status": "queued",
            })

        if celery_app is None:
            # Fallback synchrone si Celery pas installé
            from api.services.pipeline import pipeline
            result = await pipeline.run(options)

            if pipeline_meter:
                pipeline_meter.create_counter(
                    "fasobet.pipeline.async.fallback",
                    description="Nombre de fallbacks synchrones",
                ).add(1)

            return {
                "status": "completed",
                "result": result.model_dump(),
            }

        task = run_pipeline_task.delay(
            date=options.date or "",
            leagues=options.leagues or [],
        )

        if pipeline_meter:
            pipeline_meter.create_counter(
                "fasobet.pipeline.async.success",
                description="Nombre de pipelines async réussis",
            ).add(1)

        return {
            "status": "queued",
            "task_id": task.id,
            "check_url": f"/pipeline/status/{task.id}",
        }

    except Exception as e:
        if pipeline_meter:
            pipeline_meter.create_counter(
                "fasobet.pipeline.async.errors",
                description="Nombre d'erreurs de pipelines async",
            ).add(1, {
                "error_type": "queue_error",
            })
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")


@app.get(
    "/pipeline/status/{task_id}",
    tags=["Pipeline"],
)
async def get_pipeline_status(task_id: str):
    """Récupère le statut d'une tâche pipeline async."""
    try:
        from api.tasks import app as celery_app
        
        if celery_app is None:
            raise HTTPException(status_code=501, detail="Celery non configuré")
        
        task = celery_app.AsyncResult(task_id)
        
        if task.state == "PENDING":
            return {"status": "pending", "task_id": task_id}
        elif task.state == "STARTED":
            return {"status": "running", "task_id": task_id}
        elif task.state == "SUCCESS":
            return {"status": "completed", "result": task.result}
        elif task.state == "FAILURE":
            return {
                "status": "failed",
                "task_id": task_id,
                "error": str(task.info),
            }
        else:
            return {
                "status": task.state.lower(),
                "task_id": task_id,
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Match endpoints ────────────────────────────────────────

@app.post(
    "/matches/collect",
    response_model=Agent1Output,
    tags=["Matches"],
    summary="Collecter les matchs disponibles",
)
async def collect_matches(options: Optional[CollectorOptions] = None):
    """Exécute uniquement l'Agent 1 (Collector)."""
    from api.agents.agent1_collector import agent_collector
    
    if options is None:
        options = CollectorOptions()
    
    return await agent_collector.run(options)


@app.post(
    "/matches/analyze",
    response_model=Agent2Output,
    tags=["Matches"],
    summary="Analyser les matchs (Agent 2)",
)
async def analyze_matches(input_data: dict):
    """Exécute uniquement l'Agent 2 (Statistician) sur des matchs fournis."""
    from api.agents.agent2_statistician import agent_statistician
    
    matches = input_data.get("matches", [])
    if not matches:
        raise HTTPException(status_code=400, detail="Aucun match fourni")
    
    # Convertir les dictionnaires en objets VerifiedMatch
    from api.models import VerifiedMatch
    verified = [VerifiedMatch(**m) for m in matches]
    
    return await agent_statistician.run(
        StatisticianOptions(matches=verified)
    )


# ─── Startup / Shutdown ─────────────────────────────────────

@app.on_event("startup")
async def startup():
    print("🚀 FasoBet FastAPI démarré")
    print(f"   Docs: http://localhost:8001/docs")
    print(f"   Health: http://localhost:8001/health")


@app.on_event("shutdown")
async def shutdown():
    print("👋 FasoBet FastAPI arrêté")
