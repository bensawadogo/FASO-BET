from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    CustomTokenObtainPairView, UserViewSet, SportViewSet,
    TeamViewSet, MatchViewSet, PredictionViewSet,
    UserProfileViewSet, FeatureFlagViewSet, AgentConfigViewSet
)

# ─── Router pour les API REST ──────────────────────────────────
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'sports', SportViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'matches', MatchViewSet)
router.register(r'predictions', PredictionViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'feature-flags', FeatureFlagViewSet)
router.register(r'agent-configs', AgentConfigViewSet)

urlpatterns = [
    # ─── URLs traditionnelles ──────────────────────────────────
    path('', views.home, name='home'),
    path('matches/', views.matches_list, name='matches'),
    path('match/<int:pk>/', views.match_detail, name='match_detail'),
    path('my-predictions/', views.my_predictions, name='my_predictions'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('match/live/<int:fixture_id>/', views.live_match_detail, name='live_match_detail'),
    path('standings/', views.standings, name='standings'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # ─── API REST (BLOC 3) ────────────────────────────────────
    path('api/', include(router.urls)),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', views.TokenRefreshView.as_view(), name='token_refresh'),
]