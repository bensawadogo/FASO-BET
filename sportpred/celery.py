import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')

app = Celery('sportpred')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()
import api.tasks
import api.tasks_live

app.conf.beat_schedule = {
    'build-features-daily': {
        'task': 'api.tasks.build_features_task',
        'schedule': crontab(hour=3, minute=0),
    },
    'monitor-accuracy-weekly': {
        'task': 'api.tasks.monitor_accuracy_task',
        'schedule': crontab(hour=6, minute=0, day_of_week=1),
    },
    'live-score-heartbeat': {
        'task': 'api.tasks_live.refresh_live_odds_and_scores',
        'schedule': 300.0,  # toutes les 5 min — se reprogramme dynamiquement si matchs live
        'options': {'expires': 240},
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
