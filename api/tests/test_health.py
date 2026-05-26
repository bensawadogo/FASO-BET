"""Tests santé avancés pour le BLOC 3
Teste les endpoints health, les connexions Redis, et le pipeline.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from api.main import app


@pytest_asyncio.fixture
async def client():
    """Fixture client HTTP asynchrone pour FastAPI."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
class TestHealth:
    async def test_health_endpoint(self, client):
        """GET /health retourne un status healthy."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "fasobet-fastapi"

    async def test_health_metrics(self, client):
        """GET /health/metrics retourne les métriques."""
        response = await client.get("/health/metrics")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "cache_hits" in data
        assert "cache_misses" in data
        assert "uptime_seconds" in data
        assert "redis_connected" in data
        # Redis peut être connecté ou non selon l'environnement de test
        assert isinstance(data["redis_connected"], bool)


@pytest.mark.asyncio
class TestPrediction:
    async def test_predict_no_options(self, client):
        """POST /predict sans options retourne les prédictions démo."""
        response = await client.post("/predict", json={})
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 3
        assert "combos" in data
        assert len(data["combos"]) == 8

    async def test_predict_with_date(self, client):
        """POST /predict avec une date spécifique."""
        response = await client.post("/predict", json={"date": "2025-12-25"})
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) > 0

    async def test_predict_with_leagues(self, client):
        """POST /predict avec des ligues spécifiques."""
        response = await client.post("/predict", json={"leagues": [61, 39]})
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) > 0


@pytest.mark.asyncio
class TestCollector:
    async def test_collect_matches(self, client):
        """POST /matches/collect retourne les matchs collectés."""
        response = await client.post("/matches/collect", json={})
        assert response.status_code == 200
        data = response.json()
        assert "verified_matches" in data
        assert "collection_timestamp" in data
        # Au moins les matchs démo
        assert len(data["verified_matches"]) >= 1

    async def test_collect_with_leagues(self, client):
        """POST /matches/collect avec ligues spécifiques."""
        response = await client.post("/matches/collect", json={"leagues": [61]})
        assert response.status_code == 200
        data = response.json()
        assert len(data["verified_matches"]) >= 0


@pytest.mark.asyncio
class TestAnalyze:
    async def test_analyze_matches(self, client):
        """POST /matches/analyze avec des matchs valides."""
        match_payload = {
            "matches": [{
                "id": "match_test_001",
                "home": "PSG",
                "away": "Lyon",
                "competition": "Ligue 1",
                "league_id": 61,
                "date": "2025-12-25T20:00:00Z",
                "match_type": "club_official",
                "is_verified": True,
                "odds": {
                    "home_win": 1.85,
                    "draw": 3.4,
                    "away_win": 4.2,
                    "over_2_5": 1.75,
                    "btts": 1.9,
                },
                "odds_source": "Pinnacle",
                "odds_movement": "home_dropping",
            }]
        }
        response = await client.post("/matches/analyze", json=match_payload)
        assert response.status_code == 200
        data = response.json()
        assert "analyses" in data
        assert len(data["analyses"]) == 1
        analysis = data["analyses"][0]
        assert analysis["match_id"] == "match_test_001"
        assert "poisson" in analysis
        assert "composite_score" in analysis
        assert analysis["poisson"]["lambda_home"] > 0

    async def test_analyze_no_matches(self, client):
        """POST /matches/analyze sans matchs → 400."""
        response = await client.post("/matches/analyze", json={"matches": []})
        assert response.status_code == 400


@pytest.mark.asyncio
class TestPipelineStatus:
    async def test_pipeline_status_no_celery(self, client):
        """GET /pipeline/status/{id} sans Celery retourne 501."""
        response = await client.get("/pipeline/status/test-123")
        assert response.status_code in (501, 200)  # 501 si pas Celery, 200 si fallback

    async def test_pipeline_async_no_celery(self, client):
        """POST /pipeline/run sans Celery exécute le pipeline en synchrone."""
        response = await client.post("/pipeline/run", json={})
        assert response.status_code == 200
        data = response.json()
        # Soit "completed" (fallback synchrone) soit "queued" (avec Celery)
        assert data["status"] in ("completed", "queued")


@pytest.mark.asyncio
class TestCacheMetrics:
    async def test_cache_hits_and_misses(self, client):
        """Le compteur de cache doit exister et être un entier."""
        response = await client.get("/health/metrics")
        data = response.json()
        assert isinstance(data["cache_hits"], int)
        assert isinstance(data["cache_misses"], int)
        assert data["cache_hits"] >= 0
        assert data["cache_misses"] >= 0


@pytest.mark.asyncio
class TestEndToEnd:
    """Test d'intégration cross-service complet."""

    async def test_pipeline_then_health(self, client):
        """Exécute le pipeline puis vérifie que le service répond toujours."""
        # Étape 1 : Lancer le pipeline
        pipeline_resp = await client.post("/predict", json={})
        assert pipeline_resp.status_code == 200
        pipeline_data = pipeline_resp.json()
        assert len(pipeline_data["predictions"]) > 0

        # Étape 2 : Vérifier la santé après
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200

        # Étape 3 : Vérifier que les métriques existent
        metrics_resp = await client.get("/health/metrics")
        assert metrics_resp.status_code == 200

        # Étape 4 : Vérifier les prédictions individuelles
        for pred in pipeline_data["predictions"]:
            assert pred["match_id"]
            assert pred["confidence"] > 0
            assert pred["min_odds"] > 0
            assert pred["signal"] in ("value_bet", "neutral", "avoid")
            assert pred["risk"] in ("FAIBLE", "MOYEN", "ELEVE")
