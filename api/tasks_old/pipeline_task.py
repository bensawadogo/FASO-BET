import asyncio, json, logging
from datetime import datetime, timezone
from celery import shared_task
import httpx
import os

logger = logging.getLogger("fasobet.pipeline_task")

DJANGO_INTERNAL = os.getenv("DJANGO_INTERNAL_URL", "http://django:8001")

@shared_task(
    name="pipeline.run_prediction",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    soft_time_limit=180,
    time_limit=240
)
def run_prediction_task(self, options_dict: dict = None) -> dict:
    """
    Celery task: runs pipeline and saves to Django DB.
    """
    logger.info(f"[TASK START] Pipeline options: {options_dict}")

    try:
        # On utilise asyncio.run pour exécuter le pipeline asynchrone
        from api.services.pipeline import pipeline
        from api.models import PipelineOptions
        
        options = PipelineOptions(**(options_dict or {}))
        
        # Le pipeline s'occupe déjà de la persistance vers Django via les agents
        result = asyncio.run(pipeline.run(options))
        
        if hasattr(result, "status") and result.status == "success":
            logger.info(f"[TASK DONE] Pipeline completed successfully")
            return {"status": "completed", "matches": result.total_matches}
        else:
            logger.warning(f"[TASK WARN] Pipeline failed or no matches: {result}")
            return {"status": "failed", "result": str(result)}

    except Exception as exc:
        logger.error(f"[TASK FAIL]: {exc}")
        raise self.retry(exc=exc)
