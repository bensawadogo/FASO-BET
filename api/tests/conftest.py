import os
import django
import pytest
from datetime import datetime, timezone
from django.conf import settings
from django.core.management import call_command


# Variables d'environnement obligatoires avant import Django
os.environ.setdefault("DJANGO_SECRET_KEY", "test-key-insecure-do-not-use")
os.environ.setdefault("DJANGO_DEBUG", "True")
os.environ.setdefault("DATABASE_URL", "sqlite:///test_fasobet.db")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "True")
os.environ.setdefault("CELERY_TASK_EAGER_PROPAGATES", "True")
os.environ.setdefault("TESTING", "True")

# Désactiver Sentry en test
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sportpred.settings")

# Configuration complète
test_settings = {
    'DATABASES': {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': 'test_fasobet.db',
        }
    },
    'INSTALLED_APPS': [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'predictions',
        'api',
    ],
    'SECRET_KEY': 'test-key',
    'DEBUG': True,
    'ROOT_URLCONF': 'sportpred.urls',
    'CELERY_TASK_ALWAYS_EAGER': True,
    'CELERY_TASK_EAGER_PROPAGATES': True,
    'TESTING': True,
}

if not settings.configured:
    settings.configure(**test_settings)
    django.setup()

    # Important: ne pas appeler migrate avant fixtures multiples.
    # On le fera une seule fois au scope session.


@pytest.fixture(scope="session", autouse=True)
def django_migrate_once():
    call_command("migrate", verbosity=0)


@pytest.fixture
def mock_agent1_response():
    return {
        "verified_matches": [
            {
                "id": "match_test_001",
                "home": "Test FC",
                "away": "Sample United",
                "competition": "Test League",
                "date": "2025-12-25T20:00:00Z",
                "match_type": "club_official",
                "odds": {"home_win": 1.9, "draw": 3.2, "away_win": 3.8, "over_2_5": 1.7, "btts": 1.8},
                "odds_source": "Pinnacle",
                "odds_movement": "stable",
            }
        ],
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "success",
        "message": "1 match collecté"
    }


@pytest.fixture
def mock_prediction_response():
    return {
        "predictions": [
            {
                "match_id": "match_test_001",
                "home": "Test FC",
                "away": "Sample United",
                "competition": "Test League",
                "date": "2025-12-25T20:00:00Z",
                "market": "1X2",
                "selection": "HOME",
                "min_odds": 1.85,
                "confidence": 0.55,
                "risk": "FAIBLE",
                "signal": "value_bet",
                "value": 0.15,
                "consensus_pct": 55.0
            }
        ],
        "combos": [],
        "strategized_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture(autouse=True)
def flush_db():
    """Reset DB between tests without re-running post-migrate handlers.

    Rationale:
    - `call_command('flush')` and repeated `migrate` can trigger fragile
      post-migrate handlers (UNIQUE constraints, contenttypes/permissions).
    - We instead delete the sqlite file and re-migrate at *session* scope.

    Note: deleting the file here is safe because we re-run migrate only once
    per test session.
    """
    db_name = settings.DATABASES["default"]["NAME"]
    if db_name and db_name not in (":memory:", ""):
        try:
            import os as _os
            if _os.path.exists(db_name):
                _os.remove(db_name)
        except Exception:
            pass

    # No additional migrate here; handled by django_migrate_once().




