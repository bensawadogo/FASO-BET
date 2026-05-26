"""FasoBet - Celery tasks (BLOC 2)
Tâches asynchrones pour le pipeline non-bloquant.

Utilisation:
    celery -A api.tasks worker --loglevel=info --concurrency=4
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

# Célery configuré avec Redis comme broker
broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

try:
    from celery import Celery
    
    app = Celery(
        "fasobet",
        broker=broker_url,
        backend=result_backend,
        include=["api.tasks"],
    )
    
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=120,  # 2 minutes max par tâche
        task_soft_time_limit=90,  # 90 secondes avant avertissement
        worker_max_tasks_per_child=50,
        worker_prefetch_multiplier=1,
    )
    
    @app.task(bind=True, max_retries=3, default_retry_delay=5)
    def run_pipeline_task(self, date: str = "", leagues: list[int] | None = None):
        """Tâche Celery pour exécuter le pipeline complet."""
        from api.services.pipeline import pipeline
        from api.models import PipelineOptions
        
        import asyncio
        
        options = PipelineOptions(
            date=date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            leagues=leagues or [61, 39, 140, 78, 135, 2],
        )
        
        try:
            result = asyncio.run(pipeline.run(options))
            return result.model_dump()
        except Exception as exc:
            self.retry(exc=exc)
    
    @app.task
    def health_check():
        """Tâche de healthcheck pour Celery."""
        return {
            "status": "ok",
            "service": "celery",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "broker": broker_url,
        }
    
except ImportError:
    # Fallback si Celery n'est pas installé
    app = None
    
    async def run_pipeline_sync(date: str = "", leagues: list[int] | None = None):
        """Version synchrone sans Celery (fallback)."""
        from api.services.pipeline import pipeline
        from api.models import PipelineOptions
        
        options = PipelineOptions(
            date=date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            leagues=leagues or [61, 39, 140, 78, 135, 2],
        )
        return await pipeline.run(options)
