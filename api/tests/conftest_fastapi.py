import os

import pytest


@pytest.fixture(autouse=True, scope="session")
def ensure_fastapi_settings_env():
    """Ensure FastAPI settings can be instantiated during pytest collection.

    api/config.py currently requires FOOTBALL_API_KEY. In CI/tests we don't need
    real credentials, so we provide a dummy value.
    """
    os.environ.setdefault("FOOTBALL_API_KEY", "test-football-api-key")
    # Some environments may also rely on these; keep them harmless defaults.
    os.environ.setdefault("SENTRY_DSN", "")

