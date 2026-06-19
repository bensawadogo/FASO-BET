import pytest
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
import json

# ════════════════════════════════════════════════════════════════
# Tests des Serializers (validation des données)
# ════════════════════════════════════════════════════════════════

@pytest.mark.django_db
@pytest.mark.django_db
class TestUserSerializer:
    def test_user_serializer_output(self):
        from predictions.serializers import UserSerializer
        user = User.objects.create_user(
            username="testuser",
            email="test@fasobet.com",
            first_name="Test",
            last_name="User"
        )
        serializer = UserSerializer(user)
        data = serializer.data
        assert data["username"] == "testuser"
        assert data["email"] == "test@fasobet.com"
        assert data["first_name"] == "Test"
        assert "password" not in data  # jamais exposé


@pytest.mark.django_db
@pytest.mark.django_db
class TestPredictionResultSerializer:
    def test_prediction_serializer_output(self):
        from predictions.models import PredictionResult
        from predictions.serializers import PredictionResultSerializer

        pred = PredictionResult.objects.create(
            match_id="test_match_001",
            home_team="PSG",
            away_team="Lyon",
            competition="Ligue 1",
            predicted_outcome="home_win",
            confidence_score=0.75,
            risk_level="LOW",
        )
        serializer = PredictionResultSerializer(pred)
        data = serializer.data
        assert data["match_id"] == "test_match_001"
        assert data["confidence_score"] == 0.75
        assert data["risk_level"] == "LOW"
        assert "created_at" in data


@pytest.mark.django_db
@pytest.mark.django_db
class TestSportSerializer:
    def test_sport_serializer_output(self):
        from predictions.models import Sport
        from predictions.serializers import SportSerializer

        sport = Sport.objects.create(name="Football", slug="football")
        serializer = SportSerializer(sport)
        data = serializer.data
        assert data["name"] == "Football"
        assert data["slug"] == "football"


# ════════════════════════════════════════════════════════════════
# Tests des Models (intégrité des données)
# ════════════════════════════════════════════════════════════════

@pytest.mark.django_db
@pytest.mark.django_db
class TestPredictionResultModel:
    def test_create_prediction(self):
        from predictions.models import PredictionResult
        pred = PredictionResult.objects.create(
            match_id="match_001",
            home_team="Étoile Filante",
            away_team="ASFA Yennenga",
            competition="Ligue 1 BF",
            predicted_outcome="home_win",
            confidence_score=0.68,
        )
        assert pred.match_id == "match_001"
        assert pred.pk is not None
        assert pred.created_at is not None

    def test_was_correct_property(self):
        from predictions.models import PredictionResult
        pred = PredictionResult.objects.create(
            match_id="match_002",
            home_team="A",
            away_team="B",
            competition="Test",
            predicted_outcome="home_win",
            actual_result="home_win",
        )
        assert pred.was_correct is True

    def test_was_correct_none_when_no_result(self):
        from predictions.models import PredictionResult
        pred = PredictionResult.objects.create(
            match_id="match_003",
            home_team="A",
            away_team="B",
            competition="Test",
            predicted_outcome="draw",
        )
        assert pred.was_correct is None

    def test_value_field_default(self):
        from predictions.models import PredictionResult
        pred = PredictionResult.objects.create(
            match_id="match_004",
            home_team="A",
            away_team="B",
            competition="Test",
            predicted_outcome="away_win",
        )
        assert pred.value == 0.0

    def test_kickoff_datetime_nullable(self):
        from predictions.models import PredictionResult
        pred = PredictionResult.objects.create(
            match_id="match_005",
            home_team="A",
            away_team="B",
            competition="Test",
            predicted_outcome="home_win",
        )
        assert pred.kickoff_datetime is None


@pytest.mark.django_db
@pytest.mark.django_db
class TestUserProfileModel:
    def test_accuracy_zero_when_no_predictions(self):
        from predictions.models import UserProfile
        user = User.objects.create_user(username="profiletest")
        profile = UserProfile.objects.create(user=user)
        assert profile.accuracy == 0

    def test_accuracy_calculation(self):
        from predictions.models import UserProfile
        user = User.objects.create_user(username="profiletest2")
        profile = UserProfile.objects.create(
            user=user,
            total_predictions=10,
            correct_predictions=7,
        )
        assert profile.accuracy == 70.0


# ════════════════════════════════════════════════════════════════
# Tests des API REST (endpoints utilisés par le frontend)
# ════════════════════════════════════════════════════════════════

@pytest.mark.django_db
@pytest.mark.django_db
class TestPublicStatsEndpoint:
    """GET /api/public/stats/ — Utilisé par la landing page Next.js."""

    def test_public_stats_returns_200(self):
        client = Client()
        response = client.get("/api/public/stats/")
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_predictions" in data
        assert "win_rate" in data
        assert data["win_rate"] >= 0


@pytest.mark.django_db
@pytest.mark.django_db
class TestRegisterEndpoint:
    """POST /api/register/ — Inscription (register/page.tsx)."""

    def test_register_creates_user(self):
        client = Client()
        response = client.post("/api/register/", json.dumps({
            "email": "nouveau@fasobet.com",
            "password": "secret1234",
            "firstName": "Nouveau",
        }), content_type="application/json")
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "nouveau@fasobet.com"

    def test_register_duplicate_email(self):
        client = Client()
        User.objects.create_user(username="existant", email="existant@fasobet.com")
        response = client.post("/api/register/", json.dumps({
            "email": "existant@fasobet.com",
            "password": "secret1234",
        }), content_type="application/json")
        assert response.status_code == 400

    def test_register_missing_fields(self):
        client = Client()
        response = client.post("/api/register/", json.dumps({}), content_type="application/json")
        assert response.status_code == 400


@pytest.mark.django_db
@pytest.mark.django_db
class TestTokenEndpoint:
    """POST /api/token/ — Login (login/page.tsx)."""

    def test_token_obtain_valid_credentials(self):
        User.objects.create_user(username="logintest", password="secret1234")
        client = Client()
        response = client.post("/api/token/", json.dumps({
            "username": "logintest",
            "password": "secret1234",
        }), content_type="application/json")
        assert response.status_code == 200
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert "user" in data

    def test_token_obtain_invalid_credentials(self):
        client = Client()
        response = client.post("/api/token/", json.dumps({
            "username": "inconnu",
            "password": "faux",
        }), content_type="application/json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestHealthEndpoint:
    """GET /health/ — Healthcheck Django."""

    def test_health_returns_ok(self):
        client = Client()
        response = client.get("/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "django"


@pytest.mark.django_db
@pytest.mark.django_db
class TestSyncEndpoints:
    """Endpoints de synchronisation FastAPI → Django."""

    def test_sync_predictions_requires_internal_key(self):
        client = Client()
        response = client.post("/api/predictions/save/", json.dumps({
            "match_id": "sync_test_001",
        }), content_type="application/json")
        assert response.status_code == 401

    def test_sync_predictions_with_valid_key(self):
        client = Client()
        response = client.post(
            "/api/predictions/save/",
            json.dumps({
                "match_id": "sync_test_002",
                "home_team": "PSG",
                "away_team": "Lyon",
                "competition": "Ligue 1",
                "predicted_outcome": "home_win",
                "confidence_score": 0.75,
                "risk_level": "LOW",
                "value": 0.15,
                "recommended_bet": "1",
                "min_odds": 1.85,
                "kickoff_utc": "2025-12-25T20:00:00Z",
            }),
            content_type="application/json",
            HTTP_X_INTERNAL_KEY="fasobet-internal-2025",
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["status"] == "saved"


@pytest.mark.django_db
@pytest.mark.django_db
class TestPredictionsListEndpoint:
    """GET /api/predictions/ — Liste des prédictions."""

    def test_predictions_list_returns_array(self):
        from predictions.models import PredictionResult
        PredictionResult.objects.create(
            match_id="list_test_001",
            home_team="A",
            away_team="B",
            competition="Test",
            predicted_outcome="home_win",
        )
        client = Client()
        response = client.get("/api/predictions/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
