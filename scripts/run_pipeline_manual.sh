#!/bin/bash
echo "=== FasoBet Pipeline Manuel - $(date) ==="
docker compose exec -T fasobet-fastapi python -c "
from api.tasks import collect_task, analyze_task, predict_task
from celery import chain
import time
r = chain(collect_task.s(), analyze_task.s(), predict_task.s()).apply_async()
time.sleep(50)
print('Status:', r.status)
"
echo "=== Termine ==="
