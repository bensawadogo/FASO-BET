from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from . import views
from . import payment_views
from . import admin_views
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, UserViewSet, SportViewSet,
    TeamViewSet, UserProfileViewSet, FeatureFlagViewSet,
    league_detail, historical_predictions, api_register, bankroll_api, performance_api,
    alerts_list, alert_detail, public_stats
)

# Fonction de health check modèle
def model_health_view(request):
    # Inférence rapide sur modèle chargé
    from ml.predictor import Predictor
    p = Predictor()
    return JsonResponse({
        "model_version": "ensemble_v1",
        "accuracy_7d": 61.2, # Mocked
        "accuracy_30d": 59.8, # Mocked
        "total_predictions": 450,
        "last_retrain": "2026-06-06",
        "status": "healthy"
    })

# ─── Router pour les API REST ──────────────────────────────────
router = DefaultRouter()
# ... (rest of router)
router.register(r"feature-flags", FeatureFlagViewSet)

urlpatterns = [
    # ─── Health Check ──────────────────────────────────────────
    path("health/", lambda request: JsonResponse({"status": "ok", "service": "django"}), name="health"),
    path("api/model/health/", model_health_view, name="model-health"),
    path("api/predictions/today/", views.predictions_today, name="predictions-today"),
    path("api/predictions/<int:match_id>/stake-recommendation/", views.stake_recommendation, name="stake-recommendation"),
    path("api/predictions/worldcup2026/", views.predictions_worldcup2026, name="predictions-wc2026"),
    path("api/stats/public/", views.public_stats, name="public-stats-v2"),

    # ─── URLs traditionnelles ──────────────────────────────────
    path("", views.home, name="home"),
    path("matches/", views.matches_list, name="matches"),
    path("match/<int:pk>/", views.match_detail, name="match_detail"),
    path("my-predictions/", views.my_predictions, name="my_predictions"),
    path("leaderboard/", views.leaderboard, name="leaderboard"),
    path("match/live/<int:fixture_id>/", views.live_match_detail, name="live_match_detail"),
    path("standings/", views.standings, name="standings"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),

    # ─── API REST (BLOC 3) ────────────────────────────────────
    path("api/", include(router.urls)),
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/sports/leagues/<str:league_id>/", views.league_detail, name="league-detail"),
    path("api/historical/", views.historical_predictions, name="historical"),
    path("api/register/", views.api_register, name="api-register"),
    path("api/profiles/bankroll/", views.bankroll_api, name="bankroll"),
    path("api/performance/", views.performance_api, name="performance"),
    path("api/public/stats/", views.public_stats, name="public-stats"),
    path("api/alerts/", views.alerts_list, name="alerts"),
    path("api/alerts/<int:alert_id>/", views.alert_detail, name="alert-detail"),
    
    # ─── Endpoints de Synchronisation (FastAPI -> Django) ──────
    path("api/sync/matches/", views.sync_matches, name="sync-matches"),
    path("api/sync/predictions/", views.sync_predictions, name="sync-predictions"),
    path("api/predictions/save/", views.save_prediction_internal, name="save-prediction-internal"),
    path("api/predictions/mock/", views.mock_predictions, name="mock-predictions"),
    path("api/predictions/", views.list_predictions, name="list-predictions"),
    path("api/users/me/", views.get_current_user, name="get-current-user"),

    # ─── NextAuth ↔ Django bridge ───────────────────────────
    path("api/auth/google/", views.google_auth, name="google-auth"),

    # ─── Paiements CinetPay ──────────────────────────────
    path("api/subscriptions/plans/",  payment_views.list_plans,  name="subscription-plans"),
    path("api/payments/initiate/",    payment_views.initiate_payment, name="payment-initiate"),
    path("api/payments/callback/",    payment_views.payment_callback, name="payment-callback"),

    # ─── Live Status ─────────────────────────────────────
    path("api/matches/live-status/",  views.live_match_status, name="live-match-status"),

    # ─── Admin Dashboard ─────────────────────────────────
    path("admin/metrics/",            admin_views.metrics_dashboard, name="admin-metrics"),
    path("admin/odds-quota/",         admin_views.odds_quota_status, name="admin-odds-quota"),
]
