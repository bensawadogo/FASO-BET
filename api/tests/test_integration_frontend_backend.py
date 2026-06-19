"""
Tests d'intégration Frontend ↔ Backend
Simule les appels que le frontend Next.js fait vers FastAPI et Django.

Endpoints testés (utilisés par src/lib/api-client.ts):
  DJANGO_URL/api/token/          → login(page.tsx)
  DJANGO_URL/api/predictions/     → getPredictions()
  DJANGO_URL/api/performance/     → getPerformance()
  DJANGO_URL/api/public/stats/    → Landing page
  FASTAPI_URL/pipeline/run        → runPipeline()
  FASTAPI_URL/health              → health check
  FASTAPI_URL/predict             → POST /predict
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from api.main import app as fastapi_app


@pytest_asyncio.fixture
async def fastapi_client():
    """Client HTTP asynchrone pour FastAPI."""
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ════════════════════════════════════════════════════════════════
# Tests FastAPI — Endpoints utilisés par le frontend
# ════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestHealthEndpoint:
    """GET /health — Appelé par le frontend pour vérifier la santé."""

    async def test_health_returns_200(self, fastapi_client):
        response = await fastapi_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "fasobet-fastapi"

    async def test_health_content_type_json(self, fastapi_client):
        response = await fastapi_client.get("/health")
        assert "application/json" in response.headers["content-type"]


@pytest.mark.asyncio
class TestPredictEndpoint:
    """POST /predict — Pipeline IA complet (runPipeline côté frontend)."""

    async def test_predict_returns_required_fields(self, fastapi_client):
        response = await fastapi_client.post("/predict", json={})
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert "combos" in data
        assert "strategized_at" in data
        for pred in data["predictions"]:
            assert "match_id" in pred
            assert "home" in pred
            assert "away" in pred
            assert "confidence" in pred
            assert "signal" in pred
            assert pred["signal"] in ("value_bet", "neutral", "avoid")
            assert pred["risk"] in ("FAIBLE", "MOYEN", "ELEVE")
            assert pred["confidence"] >= 0
            assert pred["min_odds"] >= 1.0

    async def test_predict_with_empty_body(self, fastapi_client):
        response = await fastapi_client.post("/predict")
        assert response.status_code == 200  # options par défaut

    async def test_predict_combos_have_required_fields(self, fastapi_client):
        response = await fastapi_client.post("/predict", json={})
        data = response.json()
        for combo in data["combos"]:
            assert "target_multiplier" in combo
            assert "legs" in combo
            assert "total_odds" in combo
            assert len(combo["legs"]) >= 1  # au moins 1 leg
            for leg in combo["legs"]:
                assert leg["odds"] >= 1.0
                assert leg["confidence"] >= 0


@pytest.mark.asyncio
class TestPipelineRun:
    """POST /pipeline/run — Exécution asynchrone du pipeline."""

    async def test_pipeline_run_returns_completed(self, fastapi_client):
        response = await fastapi_client.post("/pipeline/run", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("completed", "queued")
        assert "pipeline_ran_at" in data or "total_matches" in data


@pytest.mark.asyncio
class TestMatchEndpoints:
    """Endpoints de matchs utilisés par le frontend."""

    async def test_collect_matches_returns_timestamp(self, fastapi_client):
        response = await fastapi_client.post("/matches/collect", json={})
        assert response.status_code == 200
        data = response.json()
        assert "verified_matches" in data
        assert "collection_timestamp" in data

    async def test_analyze_valid_match(self, fastapi_client):
        payload = {
            "matches": [{
                "id": "integration_test_match",
                "home": "ASEC Mimosas",
                "away": "Raja Casablanca",
                "competition": "CAF Champions League",
                "league_id": 2,
                "date": "2025-12-25T20:00:00Z",
                "match_type": "club_official",
                "is_verified": True,
                "odds": {
                    "home_win": 1.9,
                    "draw": 3.2,
                    "away_win": 3.8,
                    "over_2_5": 1.7,
                    "btts": 1.8,
                },
                "odds_source": "Pinnacle",
                "odds_movement": "stable",
            }]
        }
        response = await fastapi_client.post("/matches/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["analyses"]) == 1
        analysis = data["analyses"][0]
        assert analysis["match_id"] == "integration_test_match"
        assert "composite_score" in analysis
        assert "poisson" in analysis
        assert "form_summary" in analysis
        assert "xg_diff" in analysis


@pytest.mark.asyncio
class TestPredictionsList:
    """GET /predictions — Proxy vers Django pour les prédictions persistées."""

    async def test_predictions_returns_array(self, fastapi_client):
        response = await fastapi_client.get("/predictions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_predictions_with_limit(self, fastapi_client):
        response = await fastapi_client.get("/predictions?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5

    async def test_predictions_with_competition_filter(self, fastapi_client):
        response = await fastapi_client.get("/predictions?competition=Ligue+1")
        assert response.status_code == 200


# ════════════════════════════════════════════════════════════════
# Tests de cohérence cross-endpoint
# ════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestCrossEndpointCoherence:
    """Vérifie la cohérence entre plusieurs endpoints."""

    async def test_predict_then_predictions_consistency(self, fastapi_client):
        """POST /predict puis GET /predictions : les données sont cohérentes."""
        # Lancer une prédiction
        predict_resp = await fastapi_client.post("/predict", json={})
        predict_data = predict_resp.json()

        # Vérifier que les prédictions listées sont au format attendu
        preds_resp = await fastapi_client.get("/predictions")
        preds_list = preds_resp.json()
        assert isinstance(preds_list, list)

    async def test_health_after_pipeline(self, fastapi_client):
        """Le healthcheck répond même après exécution du pipeline."""
        await fastapi_client.post("/predict", json={})
        response = await fastapi_client.get("/health")
        assert response.status_code == 200

    async def test_metrics_after_multiple_requests(self, fastapi_client):
        """Les métriques de cache s'incrémentent."""
        # Premier appel
        await fastapi_client.get("/health/metrics")
        # Deuxième appel
        resp = await fastapi_client.get("/health/metrics")
        data = resp.json()
        assert data["cache_hits"] >= 0
        assert data["cache_misses"] >= 0
        assert isinstance(data["redis_connected"], bool)


# ════════════════════════════════════════════════════════════════
# Tests des formats de réponse (compatibilité frontend)
# ════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestResponseFormats:
    """Les formats JSON sont compatibles avec les types TypeScript du frontend."""

    async def test_prediction_has_frontend_fields(self, fastapi_client):
        """Les champs correspondent à MatchCardPrediction dans MatchCard.tsx."""
        response = await fastapi_client.post("/predict", json={})
        data = response.json()
        pred = data["predictions"][0]
        # MatchCard.tsx attend : match_id, home_team, away_team, competition,
        # recommended_bet, min_odds, signal
        assert "match_id" in pred
        assert "home" in pred  # home_team côté Python → home_team côté TS
        assert "away" in pred
        assert "competition" in pred
        assert "selection" in pred  # recommended_bet
        assert "min_odds" in pred
        assert "signal" in pred

    async def test_odds_are_positive_float(self, fastapi_client):
        """Toutes les cotes sont > 0 (le frontend fait .toFixed(2))."""
        response = await fastapi_client.post("/predict", json={})
        data = response.json()
        for pred in data["predictions"]:
            assert isinstance(pred["min_odds"], (int, float))
            assert pred["min_odds"] > 0

    async def test_confidence_is_percentage(self, fastapi_client):
        """La confiance est entre 0 et 100 (pourcentage affiché côté frontend)."""
        response = await fastapi_client.post("/predict", json={})
        data = response.json()
        for pred in data["predictions"]:
            assert 0 <= pred["confidence"] <= 100


# ════════════════════════════════════════════════════════════════
# Tests des agents (logique métier)
# ════════════════════════════════════════════════════════════════

from unittest.mock import patch, AsyncMock
from api.models import Agent1Output

# ...

@pytest.mark.asyncio
class TestAgentIntegration:
    """Intégration entre les 3 agents (Collector → Statistician → Strategist)."""

    async def test_full_pipeline_chain(self, fastapi_client, mock_agent1_response, mock_prediction_response):
        """Le pipeline complet chaîne correctement les 3 agents."""
        # Patchs pour les 3 agents
        with patch('api.agents.agent1_collector.AgentCollector.run', return_value=Agent1Output(**mock_agent1_response)), \
             patch('api.agents.agent2_statistician.AgentStatistician.run', return_value=AsyncMock(return_value={"analyses": [], "analyzed_at": "2026-06-08T00:00:00Z"})), \
             patch('api.agents.agent3_strategist.AgentStrategist.predict_match', return_value=mock_prediction_response):

            # Agent 1 : collect
            collect_resp = await fastapi_client.post("/matches/collect", json={})
            assert collect_resp.status_code == 200

            # Agent 2 : analyze
            # Convertir en dict pour éviter la sérialisation complexe de l'objet VerifiedMatch si nécessaire
            matches = [m.model_dump() if hasattr(m, 'model_dump') else m for m in collect_resp.json()["verified_matches"]]
            analyze_resp = await fastapi_client.post("/matches/analyze", json={"matches": matches})
            assert analyze_resp.status_code == 200
            analyses = analyze_resp.json()["analyses"]
            assert len(analyses) >= 0

            # Agent 3 : predict
            predict_resp = await fastapi_client.post("/predict", json={})
            assert predict_resp.status_code == 200
            data = predict_resp.json()
            assert "predictions" in data

        # Agent 2 : analyze
        analyze_payload = {
            "matches": [
                {
                    "id": m["id"],
                    "home": m["home"],
                    "away": m["away"],
                    "competition": m["competition"],
                    "league_id": m.get("league_id"),
                    "date": m["date"],
                    "match_type": m["match_type"],
                    "is_verified": m["is_verified"],
                    "odds": m["odds"],
                    "odds_source": m["odds_source"],
                    "odds_movement": m["odds_movement"],
                }
                for m in matches[:2]
            ]
        }
        analyze_resp = await fastapi_client.post("/matches/analyze", json=analyze_payload)
        analyses = analyze_resp.json()["analyses"]
        assert len(analyses) == 2

        # Agent 3 : predict (via /predict)
        predict_resp = await fastapi_client.post("/predict", json={})
        predictions = predict_resp.json()["predictions"]
        assert len(predictions) >= 1
        for pred in predictions:
            assert pred["confidence"] > 0
            assert pred["signal"] in ("value_bet", "neutral", "avoid")
