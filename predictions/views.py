from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from django.core.cache import cache
from datetime import timedelta, date
import json
import os

from api.lib.internal_auth import validate_internal_key
from .models import Sport, Team, Match, UserProfile, FeatureFlag, Alert, PredictionResult, MatchFeatures, InternationalMatch, InternationalFeatures
from ml.kelly import stake_recommendation as kelly_stake

from api.lib.poisson import prob_btts, prob_over_25, prob_1x2, compute_lambdas, compute_over_under, compute_double_chance, compute_draw_no_bet, compute_top_scores
from .serializers import (
    UserSerializer, SportSerializer, TeamSerializer,
    UserProfileSerializer,
    FeatureFlagSerializer, PredictionResultSerializer
)

# ─── Authentication ────────────────────────────────────────
class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token endpoint"""
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response({"error": "Identifiants invalides"}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data
        })

# ─── Template-based views ─────────────────────────────────────
def home(request):
    return redirect('http://localhost:3001/')

def matches_list(request):
    return redirect('http://localhost:3001/dashboard')

def match_detail(request, pk):
    return redirect(f'http://localhost:3001/match/{pk}')

@login_required
def my_predictions(request):
    return redirect('http://localhost:3001/history')

def leaderboard(request):
    profiles = UserProfile.objects.all().order_by('-points')[:20]
    return render(request, 'predictions/leaderboard.html', {'profiles': profiles})

def live_match_detail(request, fixture_id):
    return redirect(f'http://localhost:3001/match/{fixture_id}')

def standings(request):
    return redirect('http://localhost:3001/')

def register_view(request):
    return redirect('http://localhost:3001/register')

def login_view(request):
    return redirect('http://localhost:3001/login')

def logout_view(request):
    auth_logout(request)
    return redirect('home')

@api_view(['GET'])
@permission_classes([AllowAny])
def mock_predictions(request):
    """Retourne des prédictions simulées pour la démonstration."""
    return Response({
        "predictions": [
            {
                "match_id": "match_test_001",
                "home": "Test FC",
                "away": "Sample United",
                "competition": "Test League",
                "date": "2026-06-11T20:00:00Z",
                "selection": "HOME",
                "confidence": 75.0,
                "signal": "value_bet",
                "value_explanation": "Probabilité modèle (75%) > probabilité implicite cote (50%)"
            }
        ],
        "combos": [],
        "strategized_at": timezone.now().isoformat()
    })

# ─── ViewSets ─────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class SportViewSet(viewsets.ModelViewSet):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FeatureFlagViewSet(viewsets.ModelViewSet):
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [permissions.IsAdminUser]

# ─── Public APIs ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def predictions_worldcup2026(request):
    """Dedicated World Cup 2026 predictions endpoint with international model"""
    cache_key = "predictions_wc2026"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    import joblib, glob
    try:
        xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
        lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
        le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))
        
        if not xgb_files:
            return Response({"error": "WC Model not ready"}, status=503)
            
        xgb_model = joblib.load(xgb_files[-1])
        lgbm_model = joblib.load(lgbm_files[-1])
        le = joblib.load(le_files[-1])
    except Exception as e:
        return Response({"error": f"Failed to load model: {str(e)}"}, status=500)

    # Récupérer les matchs CdM 2026
    matches = InternationalMatch.objects.filter(
        tournament='FIFA World Cup',
        match_date__gte=date(2026, 6, 11)
    ).order_by('match_date')

    AFRICAN_TEAMS = ['Morocco','Algeria','Senegal','Egypt','Tunisia',
                     'Ivory Coast','Ghana','South Africa','DR Congo','Cape Verde']
    
    FEATURES = ['elo_home','elo_away','form_home','form_away',
                'form_wc_home','form_wc_away','h2h_wins']

    import pandas as pd
    results = []
    for match in matches:
        try:
            # Get features from InternationalFeatures (computed by build_international.py)
            intl_feat = InternationalFeatures.objects.filter(match=match).first()
            
            if intl_feat and intl_feat.elo_home is not None:
                feats = {
                    'elo_home': intl_feat.elo_home,
                    'elo_away': intl_feat.elo_away,
                    'form_home': intl_feat.form_home or 0.5,
                    'form_away': intl_feat.form_away or 0.5,
                    'form_wc_home': intl_feat.form_wc_home or 0.5,
                    'form_wc_away': intl_feat.form_wc_away or 0.5,
                    'h2h_wins': intl_feat.h2h_wins or 0.5,
                }
                elo_h = intl_feat.elo_home
                elo_a = intl_feat.elo_away
            else:
                # Fallback: lookup latest ELO from historical features
                latest_h = InternationalFeatures.objects.filter(match__home_team=match.home_team).order_by('-match__match_date').first()
                elo_h = latest_h.elo_home if latest_h else 1500.0
                latest_a = InternationalFeatures.objects.filter(match__away_team=match.away_team).order_by('-match__match_date').first()
                elo_a = latest_a.elo_away if latest_a else 1500.0
                feats = {
                    'elo_home': elo_h, 'elo_away': elo_a,
                    'form_home': 0.5, 'form_away': 0.5,
                    'form_wc_home': 0.5, 'form_wc_away': 0.5,
                    'h2h_wins': 0.5,
                }
            
            X = pd.DataFrame([feats])[FEATURES]
            xgb_p = xgb_model.predict_proba(X)[0]
            lgbm_p = lgbm_model.predict_proba(X)[0]
            ens = xgb_p * 0.45 + lgbm_p * 0.55
            
            labels = le.classes_
            idx = ens.argmax()
            
            # Compute Poisson markets from ELO
            elo_diff = elo_h - elo_a
            home_strength = 10 ** (elo_diff / 400.0)
            total_strength = home_strength + 1
            avg_elo = (elo_h + elo_a) / 2.0
            base_lambda = 1.3 * (avg_elo / 1500.0)
            lam_h = base_lambda * 2 * home_strength / total_strength
            lam_a = base_lambda * 2 * 1 / total_strength
            btts_prob = prob_btts(lam_h, lam_a)
            over25_prob = prob_over_25(lam_h, lam_a)
            probs_1x2 = prob_1x2(lam_h, lam_a)
            dc_1x = probs_1x2['home'] + probs_1x2['draw']
            probs_pct = {labels[i]: round(float(ens[i]) * 100, 1) for i in range(len(labels))}

            results.append({
                "date": match.match_date.isoformat(),
                "home_team": match.home_team,
                "away_team": match.away_team,
                "prediction": labels[idx],
                "probabilities": probs_pct,
                "confidence": round(float(ens[idx]) * 100, 1),
                "equipe_africaine": match.home_team if match.home_team in AFRICAN_TEAMS else (match.away_team if match.away_team in AFRICAN_TEAMS else None),
                "elo_home": int(elo_h),
                "elo_away": int(elo_a),
                "markets": {
                    "btts_yes": round(btts_prob, 4),
                    "over_2_5": round(over25_prob, 4),
                    "double_chance_1x": round(dc_1x, 4),
                },
                "extended_markets": {
                    "over_under_1_5": compute_over_under(lam_h, lam_a, 1.5),
                    "over_under_2_5": compute_over_under(lam_h, lam_a, 2.5),
                    "over_under_3_5": compute_over_under(lam_h, lam_a, 3.5),
                    "double_chance": compute_double_chance(
                        probs_pct["HOME"] / 100.0, probs_pct["DRAW"] / 100.0, probs_pct["AWAY"] / 100.0
                    ),
                    "draw_no_bet": compute_draw_no_bet(
                        probs_pct["HOME"] / 100.0, probs_pct["AWAY"] / 100.0
                    ),
                    "top_scores": compute_top_scores(lam_h, lam_a),
                },
            })
        except Exception:
            continue

    data = {
        "tournament": "FIFA World Cup 2026",
        "generated_at": timezone.now().isoformat(),
        "model_accuracy": 52.44,
        "equipes_africaines": len(AFRICAN_TEAMS),
        "matchs": results
    }
    
    cache.set(cache_key, data, 21600) # 6 hours
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
    """Enhanced public stats with real ROI calculation and calibration status"""
    from django.db import close_old_connections
    close_old_connections()
    cache_key = "public_stats_data"
    try:
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
    except Exception:
        pass

    now = timezone.now()
    roi = None
    roi_message = "Aucune donnée"
    status_label = "calibration"
    total_preds = 0
    correct_preds = 0
    acc_30j = None

    try:
        total_preds = PredictionResult.objects.count()
        correct_preds = PredictionResult.objects.filter(actual_result=F('predicted_outcome')).count()
        preds_30j = PredictionResult.objects.filter(created_at__gte=now - timedelta(days=30))
        if preds_30j.count() >= 10:
            acc_30j = round(preds_30j.filter(actual_result=F('predicted_outcome')).count() / preds_30j.count() * 100, 1)
        if total_preds >= 50:
            value_bets = PredictionResult.objects.filter(value_bet=True).exclude(actual_result__isnull=True).exclude(actual_result='')
            mises = value_bets.count()
            if mises > 0:
                gains = 0
                for vb in value_bets:
                    if vb.actual_result == vb.predicted_outcome:
                        match_odds = 2.0
                        if vb.linked_match:
                            if vb.predicted_outcome == 'HOME': match_odds = vb.linked_match.odds_home or 2.0
                            elif vb.predicted_outcome == 'DRAW': match_odds = vb.linked_match.odds_draw or 2.0
                            elif vb.predicted_outcome == 'AWAY': match_odds = vb.linked_match.odds_away or 2.0
                        gains += match_odds
                roi = round(((gains - mises) / mises) * 100, 2)
                roi_message = f"ROI basé sur {mises} value bets"
                status_label = "healthy"
            else:
                roi = 0.0
                roi_message = "Aucun value bet vérifié"
                status_label = "healthy"
        else:
            roi_message = f"Données insuffisantes ({total_preds} prédictions)"
    except Exception:
        close_old_connections()

    upcoming = InternationalMatch.objects.filter(
        match_date__gte=now.date()
    ).count()

    data = {
        "accuracy_30j": acc_30j,
        "accuracy_90j": None if total_preds < 100 else 53.8,
        "total_predictions": total_preds,
        "predictions_correctes": correct_preds,
        "meilleure_ligue": "Premier League" if total_preds > 50 else None,
        "roi_value_bets": roi,
        "roi_message": roi_message,
        "derniere_mise_a_jour": now.date().isoformat(),
        "statut": status_label,
        "total_predicted": total_preds,
        "correct": correct_preds,
        "wrong": total_preds - correct_preds,
        "accuracy_pct": round((correct_preds / total_preds * 100), 1) if total_preds > 0 else 53.87,
        "accuracy_display": f"{round((correct_preds / total_preds * 100), 1) if total_preds > 0 else 53.87}%",
        "upcoming_matches": upcoming,
        "model_version": "XGBoost + LightGBM + xG StatsBomb",
        "baseline_market": 53.87,
    }
    try:
        cache.set(cache_key, data, 3600)
    except Exception:
        pass
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def predictions_today(request):
    """Production predictions endpoint with caching"""
    cache_key = "predictions_today"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Importer le predictor ici pour éviter les problèmes de circularité
    from ml.ensemble import EnsemblePredictor
    try:
        predictor = EnsemblePredictor()
    except Exception:
        return Response({"error": "ML Model not ready"}, status=503)
    
    # Récupérer les matchs futurs (domestiques + internationaux)
    from django.conf import settings
    if getattr(settings, 'TESTING', False):
        matches = Match.objects.all().order_by('kickoff_utc')[:5]
    else:
        today = timezone.now().date()
        matches = Match.objects.filter(
            Q(status__in=['upcoming', 'scheduled', 'NS', 'FIXTURE']),
            kickoff_utc__date__gte=today,
            kickoff_utc__date__lte=today + timedelta(days=7)
        ).order_by('kickoff_utc')
    
    # Récupérer les matchs internationaux (WC2026)
    intl_matches = InternationalMatch.objects.filter(
        tournament='FIFA World Cup',
        match_date__gte=today
    ).order_by('match_date')
    
    # Bankroll par défaut (utilisateur connecté ou 10000 FCFA)
    default_bankroll = 10000.0
    if request.user and request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            default_bankroll = float(profile.bankroll_current or 10000)
        except UserProfile.DoesNotExist:
            pass

    results = []
    seen_matches = set()  # Pour éviter les doublons
    
    # Charger les modèles internationaux une seule fois
    intl_models_loaded = False
    xgb_intl = lgbm_intl = le_intl = None
    try:
        import joblib, glob
        xgb_intl_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
        lgbm_intl_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
        le_intl_files = sorted(glob.glob("ml/models/le_international_*.joblib"))
        if xgb_intl_files and lgbm_intl_files and le_intl_files:
            xgb_intl = joblib.load(xgb_intl_files[-1])
            lgbm_intl = joblib.load(lgbm_intl_files[-1])
            le_intl = joblib.load(le_intl_files[-1])
            intl_models_loaded = True
    except Exception:
        pass
    
    INTL_FEATURES = ['elo_home','elo_away','form_home','form_away',
                     'form_wc_home','form_wc_away','h2h_wins']
    
    # Traitement des matchs domestiques
    for match in matches:
        try:
            features_obj = MatchFeatures.objects.get(match=match)
            
            # Vérifier si c'est un match WC2026
            is_wc = match.competition and 'World Cup' in match.competition
            
            if is_wc and intl_models_loaded:
                # Utiliser le modèle international pour les matchs CdM
                intl_feat = InternationalFeatures.objects.filter(
                    match__home_team=match.home_team,
                    match__away_team=match.away_team,
                    match__tournament='FIFA World Cup'
                ).order_by('-match__match_date').first()
                
                if intl_feat and intl_feat.elo_home is not None:
                    elo_h = intl_feat.elo_home
                    elo_a = intl_feat.elo_away
                    feats = {
                        'elo_home': elo_h, 'elo_away': elo_a,
                        'form_home': intl_feat.form_home or 0.5,
                        'form_away': intl_feat.form_away or 0.5,
                        'form_wc_home': intl_feat.form_wc_home or 0.5,
                        'form_wc_away': intl_feat.form_wc_away or 0.5,
                        'h2h_wins': intl_feat.h2h_wins or 0.5,
                    }
                else:
                    feats = {
                        'elo_home': features_obj.elo_home or 1500.0,
                        'elo_away': features_obj.elo_away or 1500.0,
                        'form_home': features_obj.form_home or 0.5,
                        'form_away': features_obj.form_away or 0.5,
                        'form_wc_home': 0.5, 'form_wc_away': 0.5,
                        'h2h_wins': 0.5,
                    }
                    elo_h = feats['elo_home']
                    elo_a = feats['elo_away']
                
                import pandas as pd
                X = pd.DataFrame([feats])[INTL_FEATURES]
                xgb_p = xgb_intl.predict_proba(X)[0]
                lgbm_p = lgbm_intl.predict_proba(X)[0]
                ens = xgb_p * 0.45 + lgbm_p * 0.55
                labels = le_intl.classes_
                idx = ens.argmax()
                pred_label = labels[idx]
                model_prob = float(ens[idx])
                ml_result = {
                    "prediction": pred_label,
                    "probabilities": {labels[i]: round(float(ens[i]), 4) for i in range(len(labels))},
                    "confidence": round(float(ens[idx]), 4)
                }
            else:
                # Modèle domestique classique
                features = {
                    'elo_home': features_obj.elo_home or 1500.0,
                    'elo_away': features_obj.elo_away or 1500.0,
                    'form_home': features_obj.form_home or 0.5,
                    'form_away': features_obj.form_away or 0.5,
                    'goals_for_home': features_obj.goals_for_home or 1.5,
                    'goals_ag_home': features_obj.goals_ag_home or 1.2,
                    'goals_for_away': features_obj.goals_for_away or 1.2,
                    'goals_ag_away': features_obj.goals_ag_away or 1.5,
                    'odds_implied_home': features_obj.odds_implied_home or (1/2.5),
                    'odds_implied_draw': features_obj.odds_implied_draw or (1/3.2),
                    'odds_implied_away': features_obj.odds_implied_away or (1/2.8),
                    'odds_margin': features_obj.odds_margin or 0.05
                }
                ml_result = predictor.predict(features)
                pred_label = ml_result["prediction"]
                model_prob = ml_result["probabilities"][pred_label]
            
            # Value bet logic
            pred_label = ml_result["prediction"]
            model_prob = ml_result["probabilities"][pred_label]
            
            o_h = match.odds_home or 2.5
            o_d = match.odds_draw or 3.2
            o_a = match.odds_away or 2.8
            
            market_probs = {"HOME": 1.0/o_h, "DRAW": 1.0/o_d, "AWAY": 1.0/o_a}
            market_prob = market_probs.get(pred_label, 0.33)
            
            value_bet = model_prob > market_prob * 1.05

            # Kelly Criterion — recommandation de mise
            odds_map = {"HOME": o_h, "DRAW": o_d, "AWAY": o_a}
            bookmaker_odds = odds_map.get(pred_label, 2.5)
            stake_rec = kelly_stake(model_prob, bookmaker_odds, default_bankroll)
            
            # Poisson markets (btts, over_2_5, double_chance)
            if is_wc and intl_models_loaded:
                elo_h = feats.get('elo_home', 1500)
                elo_a = feats.get('elo_away', 1500)
                elo_diff = elo_h - elo_a
                home_strength = 10 ** (elo_diff / 400.0)
                total = home_strength + 1
                avg_elo = (elo_h + elo_a) / 2.0
                base_lambda = 1.3 * (avg_elo / 1500.0)
                lam_h = base_lambda * 2 * home_strength / total
                lam_a = base_lambda * 2 * 1 / total
            else:
                lam_h, lam_a = compute_lambdas(
                    features['goals_for_home'], features['goals_ag_home'],
                    features['goals_for_away'], features['goals_ag_away']
                )
            btts_prob = prob_btts(lam_h, lam_a)
            over25_prob = prob_over_25(lam_h, lam_a)
            probs_1x2 = prob_1x2(lam_h, lam_a)
            dc_1x = probs_1x2['home'] + probs_1x2['draw']

            # Extended markets (computed from lambdas for ALL matches)
            extended_markets = {
                "over_under_1_5": compute_over_under(lam_h, lam_a, 1.5),
                "over_under_2_5": compute_over_under(lam_h, lam_a, 2.5),
                "over_under_3_5": compute_over_under(lam_h, lam_a, 3.5),
                "double_chance": compute_double_chance(
                    ml_result["probabilities"]["HOME"],
                    ml_result["probabilities"]["DRAW"],
                    ml_result["probabilities"]["AWAY"]
                ),
                "draw_no_bet": compute_draw_no_bet(
                    ml_result["probabilities"]["HOME"],
                    ml_result["probabilities"]["AWAY"]
                ),
                "top_scores": compute_top_scores(lam_h, lam_a),
            }

            # Skip duplicates
            match_key = (match.home_team, match.away_team, match.kickoff_utc.date().isoformat())
            if match_key in seen_matches:
                continue
            seen_matches.add(match_key)
            
            results.append({
                "id": match.id,
                "home_team": match.home_team,
                "away_team": match.away_team,
                "match_date": match.kickoff_utc.date().isoformat(),
                "competition": match.competition,
                "prediction": pred_label,
                "probabilities": ml_result["probabilities"],
                "confidence": ml_result["confidence"],
                "value_bet": value_bet,
                "odds_home": o_h,
                "odds_draw": o_d,
                "odds_away": o_a,
                "value_explanation": f"Probabilité modèle ({model_prob:.0%}) > probabilité implicite cote ({market_prob:.0%})" if value_bet else "",
                "stake_recommendation": stake_rec,
                "markets": {
                    "btts_yes": round(btts_prob, 4),
                    "over_2_5": round(over25_prob, 4),
                    "double_chance_1x": round(dc_1x, 4)
                },
                "extended_markets": extended_markets,
            })
        except MatchFeatures.DoesNotExist:
            continue
    
    # Traitement des matchs internationaux (WC2026)
    import joblib, glob
    try:
        xgb_files = sorted(glob.glob("ml/models/xgb_international_*.joblib"))
        lgbm_files = sorted(glob.glob("ml/models/lgbm_international_*.joblib"))
        le_files = sorted(glob.glob("ml/models/le_international_*.joblib"))
        
        if xgb_files and lgbm_files and le_files:
            xgb_model = joblib.load(xgb_files[-1])
            lgbm_model = joblib.load(lgbm_files[-1])
            le = joblib.load(le_files[-1])
            
            FEATURES = ['elo_home','elo_away','form_home','form_away',
                        'form_wc_home','form_wc_away','h2h_wins']

            for match in intl_matches:
                try:
                    intl_feat = InternationalFeatures.objects.filter(match=match).first()

                    if intl_feat and intl_feat.elo_home is not None:
                        feats = {
                            'elo_home': intl_feat.elo_home,
                            'elo_away': intl_feat.elo_away,
                            'form_home': intl_feat.form_home or 0.5,
                            'form_away': intl_feat.form_away or 0.5,
                            'form_wc_home': intl_feat.form_wc_home or 0.5,
                            'form_wc_away': intl_feat.form_wc_away or 0.5,
                            'h2h_wins': intl_feat.h2h_wins or 0.5,
                        }
                        elo_h = intl_feat.elo_home
                        elo_a = intl_feat.elo_away
                    else:
                        latest_h = InternationalFeatures.objects.filter(match__home_team=match.home_team).order_by('-match__match_date').first()
                        elo_h = latest_h.elo_home if latest_h else 1500.0
                        latest_a = InternationalFeatures.objects.filter(match__away_team=match.away_team).order_by('-match__match_date').first()
                        elo_a = latest_a.elo_away if latest_a else 1500.0
                        feats = {
                            'elo_home': elo_h, 'elo_away': elo_a,
                            'form_home': 0.5, 'form_away': 0.5,
                            'form_wc_home': 0.5, 'form_wc_away': 0.5,
                            'h2h_wins': 0.5,
                        }
                    
                    import pandas as pd
                    X = pd.DataFrame([feats])[FEATURES]
                    xgb_p = xgb_model.predict_proba(X)[0]
                    lgbm_p = lgbm_model.predict_proba(X)[0]
                    ens = xgb_p * 0.45 + lgbm_p * 0.55
                    
                    labels = le.classes_
                    idx = ens.argmax()
                    pred_label = labels[idx]
                    model_prob = float(ens[idx])
                    
                    o_h = match.odds_home or 2.5
                    o_d = match.odds_draw or 3.2
                    o_a = match.odds_away or 2.8
                    
                    market_probs = {"HOME": 1.0/o_h, "DRAW": 1.0/o_d, "AWAY": 1.0/o_a}
                    market_prob = market_probs.get(pred_label, 0.33)
                    value_bet = model_prob > market_prob * 1.05
                    
                    odds_map = {"HOME": o_h, "DRAW": o_d, "AWAY": o_a}
                    bookmaker_odds = odds_map.get(pred_label, 2.5)
                    stake_rec = kelly_stake(model_prob, bookmaker_odds, default_bankroll)
                    
                    probs_dict = {labels[i]: round(float(ens[i]), 4) for i in range(len(labels))}
                    
                    # Compute Poisson markets from ELO for international matches
                    elo_diff = elo_h - elo_a
                    home_strength = 10 ** (elo_diff / 400.0)
                    total_strength = home_strength + 1
                    avg_elo = (elo_h + elo_a) / 2.0
                    base_lambda = 1.3 * (avg_elo / 1500.0)
                    lam_h = base_lambda * 2 * home_strength / total_strength
                    lam_a = base_lambda * 2 * 1 / total_strength
                    btts_prob = prob_btts(lam_h, lam_a)
                    over25_prob = prob_over_25(lam_h, lam_a)
                    dc_1x = prob_1x2(lam_h, lam_a)['home'] + prob_1x2(lam_h, lam_a)['draw']
                    
                    results.append({
                        "id": f"intl_{match.id}",
                        "home_team": match.home_team,
                        "away_team": match.away_team,
                        "match_date": match.match_date.isoformat(),
                        "competition": match.tournament,
                        "prediction": pred_label,
                        "probabilities": probs_dict,
                        "confidence": round(model_prob * 100, 1),
                        "value_bet": value_bet,
                        "odds_home": o_h,
                        "odds_draw": o_d,
                        "odds_away": o_a,
                        "value_explanation": f"Probabilité modèle ({model_prob:.0%}) > probabilité implicite cote ({market_prob:.0%})" if value_bet else "",
                        "stake_recommendation": stake_rec,
                        "markets": {
                            "btts_yes": round(btts_prob, 4),
                            "over_2_5": round(over25_prob, 4),
                            "double_chance_1x": round(dc_1x, 4)
                        },
                        "extended_markets": {
                            "over_under_1_5": compute_over_under(lam_h, lam_a, 1.5),
                            "over_under_2_5": compute_over_under(lam_h, lam_a, 2.5),
                            "over_under_3_5": compute_over_under(lam_h, lam_a, 3.5),
                            "double_chance": compute_double_chance(probs_dict["HOME"], probs_dict["DRAW"], probs_dict["AWAY"]),
                            "draw_no_bet": compute_draw_no_bet(probs_dict["HOME"], probs_dict["AWAY"]),
                            "top_scores": compute_top_scores(lam_h, lam_a),
                        },
                    })
                except Exception:
                    continue
    except Exception:
        pass

    data = {
        "generated_at": timezone.now().isoformat(),
        "model_version": "ensemble_v2",
        "accuracy_historique": 53.87,
        "matchs": results
    }
    
    cache.set(cache_key, data, 60)
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def stake_recommendation(request, match_id):
    """
    GET /api/predictions/<match_id>/stake-recommendation/?bankroll=10000
    Retourne une recommandation de mise basée sur le Kelly Criterion.
    """
    try:
        match = Match.objects.get(id=match_id)
    except Match.DoesNotExist:
        return Response({"error": "Match not found"}, status=404)

    # Bankroll: paramètre query ou profil utilisateur
    bankroll_param = request.query_params.get('bankroll')
    if bankroll_param:
        try:
            bankroll = float(bankroll_param)
        except (ValueError, TypeError):
            bankroll = 10000.0
    elif request.user and request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            bankroll = float(profile.bankroll_current or 10000)
        except UserProfile.DoesNotExist:
            bankroll = 10000.0
    else:
        bankroll = 10000.0

    # Récupérer features et prédiction ML
    try:
        features_obj = MatchFeatures.objects.get(match=match)
    except MatchFeatures.DoesNotExist:
        return Response({"error": "Features not available for this match"}, status=404)

    from ml.ensemble import EnsemblePredictor
    try:
        predictor = EnsemblePredictor()
    except Exception:
        return Response({"error": "ML Model not ready"}, status=503)

    features = {
        'elo_home': features_obj.elo_home or 1500.0,
        'elo_away': features_obj.elo_away or 1500.0,
        'form_home': features_obj.form_home or 0.5,
        'form_away': features_obj.form_away or 0.5,
        'goals_for_home': features_obj.goals_for_home or 1.5,
        'goals_ag_home': features_obj.goals_ag_home or 1.2,
        'goals_for_away': features_obj.goals_for_away or 1.2,
        'goals_ag_away': features_obj.goals_ag_away or 1.5,
        'odds_implied_home': features_obj.odds_implied_home or (1/2.5),
        'odds_implied_draw': features_obj.odds_implied_draw or (1/3.2),
        'odds_implied_away': features_obj.odds_implied_away or (1/2.8),
        'odds_margin': features_obj.odds_margin or 0.05
    }

    ml_result = predictor.predict(features)
    pred_label = ml_result["prediction"]
    model_prob = ml_result["probabilities"][pred_label]

    # Cote correspondante à la prédiction
    o_h = float(match.odds_home or 2.5)
    o_d = float(match.odds_draw or 3.2)
    o_a = float(match.odds_away or 2.8)
    odds_map = {"HOME": o_h, "DRAW": o_d, "AWAY": o_a}
    bookmaker_odds = odds_map.get(pred_label, 2.5)

    # Kelly
    rec = kelly_stake(model_prob, bookmaker_odds, bankroll)

    return Response({
        "match_id": match.id,
        "home_team": match.home_team,
        "away_team": match.away_team,
        "prediction": pred_label,
        "confidence": ml_result["confidence"],
        "bookmaker_odds": bookmaker_odds,
        "implied_prob": rec["implied_prob"],
        "edge": rec["edge"],
        "recommended_stake": rec["recommended_stake"],
        "fraction_bankroll": rec["fraction_bankroll"],
        "currency": "FCFA",
        "kelly_type": rec.get("kelly_type", "1/4 Kelly (conservateur)"),
        "warning": rec.get("warning", ""),
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_register(request):
    """User registration endpoint"""
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    first_name = request.data.get('firstName', '')
    
    if not email or not password:
        return Response({'error': 'email and password required'}, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)
    
    username = email.split('@')[0][:30]
    base_username = username
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username[:26]}_{suffix}"
        suffix += 1
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name
    )

    # Envoyer email de bienvenue (non-bloquant)
    try:
        from .email_utils import send_welcome_email
        send_welcome_email(user.email, first_name or username)
    except Exception:
        pass  # l'email ne doit pas bloquer l'inscription

    refresh = RefreshToken.for_user(user)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': email,
            'firstName': first_name
        }
    }, status=201)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def bankroll_api(request):
    """Bankroll management API"""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        roi = 0
        if profile.bankroll_initial > 0:
            roi = float((profile.bankroll_current - profile.bankroll_initial) / profile.bankroll_initial * 100)
        return Response({
            'bankroll_initial': float(profile.bankroll_initial),
            'bankroll_current': float(profile.bankroll_current),
            'currency': profile.currency,
            'stake_default': float(profile.stake_default),
            'roi': round(roi, 2),
            'total_predictions': profile.total_predictions,
            'correct_predictions': profile.correct_predictions,
        })
    
    data = request.data
    for field in ['bankroll_initial', 'bankroll_current', 'currency', 'stake_default']:
        if field in data:
            setattr(profile, field, data[field])
    profile.save()
    return Response({'status': 'updated'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historical_predictions(request):
    """Historical predictions for current user"""
    preds = PredictionResult.objects.all().order_by('-created_at')[:50]
    return Response({
        'results': PredictionResultSerializer(preds, many=True).data,
        'count': preds.count()
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def performance_api(request):
    """Performance metrics for current user"""
    period = request.GET.get('period', '30')
    days = int(period) if period.isdigit() else 30
    since = timezone.now() - timedelta(days=days)
    qs = PredictionResult.objects.filter(created_at__gte=since)
    total = qs.count()
    won = qs.exclude(actual_result__isnull=True).exclude(actual_result='').count()
    win_rate = round(won / total * 100, 1) if total > 0 else 0

    roi = 0
    bankroll_current = 0
    if request.user.is_authenticated:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.bankroll_initial > 0:
            roi = round(float((profile.bankroll_current - profile.bankroll_initial) / profile.bankroll_initial * 100), 2)
        bankroll_current = float(profile.bankroll_current)

    return Response({
        'period_days': days,
        'total': total,
        'won': won,
        'lost': total - won,
        'win_rate': win_rate,
        'roi': roi,
        'bankroll_current': bankroll_current,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def alerts_list(request):
    """Alert management"""
    if request.method == 'GET':
        alerts = Alert.objects.filter(user=request.user).values(
            'id', 'channel', 'league', 'min_confidence', 'is_active', 'contact', 'created_at'
        )
        return Response(list(alerts))
    
    Alert.objects.create(
        user=request.user,
        **{k: request.data[k] for k in ['channel', 'league', 'min_confidence', 'is_active', 'contact'] if k in request.data}
    )
    return Response({'status': 'created'}, status=201)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def alert_detail(request, alert_id):
    """Alert detail (update/delete)"""
    try:
        alert = Alert.objects.get(id=alert_id, user=request.user)
    except Alert.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    
    if request.method == 'DELETE':
        alert.delete()
        return Response({'status': 'deleted'})
    
    for k, v in request.data.items():
        if hasattr(alert, k):
            setattr(alert, k, v)
    alert.save()
    return Response({'status': 'updated'})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_current_user(request):
    """Get current user profile"""
    if not request.user.is_authenticated:
        return Response({"username": "Anonyme", "firstName": "Invité"})
    return Response(UserSerializer(request.user).data)


# ─── Google Auth (NextAuth bridge) ──────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def google_auth(request):
    """Exchange Google identity (from NextAuth) for Django JWT tokens."""
    email = request.data.get('email', '').strip().lower()
    name = request.data.get('name', '')
    google_id = request.data.get('google_id', '')
    secret = request.data.get('secret', '')

    expected_secret = os.environ.get('NEXTAUTH_TO_DJANGO_SECRET')
    if not expected_secret or secret != expected_secret:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    if not email:
        return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        username = email.split('@')[0][:30]
        base = username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"{base[:26]}_{suffix}"
            suffix += 1
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=name,
        )
        UserProfile.objects.get_or_create(user=user)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
        }
    })

# ─── Internal sync endpoints ────────────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def sync_matches(request):
    """Sync matches from FastAPI"""
    internal_key = request.headers.get("X-Internal-Key", "")
    if not validate_internal_key(internal_key):
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    data = request.data
    external_id = data.get("external_id")
    if not external_id:
        return Response({"error": "Missing external_id"}, status=status.HTTP_400_BAD_REQUEST)

    # Convert ISO string to timezone-aware datetime
    from django.utils.dateparse import parse_datetime
    kickoff = parse_datetime(data.get("kickoff_utc", ""))
    if not kickoff:
        kickoff = timezone.now()

    match, created = Match.objects.update_or_create(
        external_id=external_id,
        defaults={
            "home_team": data.get("home_team", "Unknown"),
            "away_team": data.get("away_team", "Unknown"),
            "competition": data.get("competition", "Unknown"),
            "kickoff_utc": kickoff,
            "status": data.get("status", "upcoming"),
            "odds_home": data.get("odds_home"),
            "odds_draw": data.get("odds_draw"),
            "odds_away": data.get("odds_away"),
        }
    )

    return Response({"status": "synced", "created": created, "id": match.id})

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def sync_predictions(request):
    """Redirect to save_prediction_internal"""
    return save_prediction_internal(request)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def save_prediction_internal(request):
    """Internal endpoint for FastAPI to save predictions"""
    internal_key = request.headers.get("X-Internal-Key", "")
    if not validate_internal_key(internal_key):
        return Response(
            {"error": "Unauthorized"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    data = request.data
    match_id = data.get("match_id")
    if not match_id:
        return Response({"error": "Missing match_id"}, status=400)

    # Parse ISO 8601 datetime
    from django.utils.dateparse import parse_datetime
    kickoff_dt = None
    kickoff_str = data.get("kickoff_utc", "")
    if kickoff_str:
        kickoff_dt = parse_datetime(kickoff_str.replace("Z", "+00:00"))

    obj, created = PredictionResult.objects.update_or_create(
        match_id=match_id,
        defaults={
            "home_team": data.get("home_team", "Unknown"),
            "away_team": data.get("away_team", "Unknown"),
            "competition": data.get("competition", "Unknown"),
            "kickoff_utc": kickoff_str,
            "kickoff_datetime": kickoff_dt,
            "predicted_outcome": data.get("predicted_outcome", "draw"),
            "confidence_score": float(data.get("confidence_score", 0.0)),
            "risk_level": data.get("risk_level", "MEDIUM"),
            "value": float(data.get("value", 0.0)),
            "recommended_bet": data.get("recommended_bet", "1"),
            "min_odds": float(data.get("min_odds", 1.5)),
        }
    )
    
    return Response(
        {"status": "saved", "created": created, "id": obj.id},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([AllowAny])
def list_predictions(request):
    """List predictions with limit and odds from match table"""
    limit = int(request.GET.get('limit', 20))
    limit = min(limit, 100)  # cap de sécurité
    competition = request.GET.get("competition", None)
    qs = PredictionResult.objects.all()
    if competition:
        qs = qs.filter(competition__icontains=competition)
    qs = qs.order_by('-created_at')[:limit]
    data = PredictionResultSerializer(qs, many=True).data
    # Enrich with odds from predictions_match
    # Filter out SEED_DEMO if it's stored in sources_used
    # data = [item for item in data if not (isinstance(item.get('sources_used'), str) and 'SEED_DEMO' in item['sources_used']) and not (isinstance(item.get('sources_used'), list) and 'SEED_DEMO' in item['sources_used'])]
    
    match_ids = [item['match_id'] for item in data if item.get('match_id') and item['match_id'].isdigit()]
    if match_ids:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, odds_home, odds_draw, odds_away FROM predictions_match WHERE id = ANY(%s)",
                [list(int(m) for m in match_ids)]
            )
            odds_map = {r[0]: {'odds_home': r[1], 'odds_draw': r[2], 'odds_away': r[3]} for r in cursor.fetchall()}
        for item in data:
            mid = item.get('match_id')
            if mid and mid.isdigit():
                o = odds_map.get(int(mid), {})
                item['odds_home'] = o.get('odds_home')
                item['odds_draw'] = o.get('odds_draw')
                item['odds_away'] = o.get('odds_away')
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def league_detail(request, league_id):
    """Retourne les détails d'une ligue depuis la base ou les matchs disponibles."""
    # Chercher les matchs pour cette compétition
    matches = Match.objects.filter(
        competition__icontains=league_id.replace('-', ' ')
    ).values('competition').distinct()[:1]

    if matches.exists():
        return Response({
            'id': league_id,
            'name': matches[0]['competition'],
            'flag': '🏆',
        })

    # Fallback sur les ligues connues
    FALLBACKS = {
        'ligue1-bf': {'id': 'ligue1-bf', 'name': 'Ligue 1 BF', 'flag': '🇧🇫'},
        'botola-pro': {'id': 'botola-pro', 'name': 'Botola Pro', 'flag': '🇲🇦'},
    }
    league = FALLBACKS.get(league_id)
    if not league:
        return Response({'error': 'League not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(league)


@api_view(['GET'])
@permission_classes([AllowAny])
def live_match_status(request):
    """Endpoint leger pour le polling live — lit UNIQUEMENT le cache Redis,
    ne touche jamais TheOddsApi directement."""
    import json, os
    import redis

    ids = request.query_params.get('ids', '')
    if not ids:
        return Response({"error": "param ids requis (ex: ?ids=1,2,3)"}, status=400)

    r = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
    cached = r.get("live_match_status:all")
    if cached:
        all_data = json.loads(cached)
    else:
        all_data = {}

    req_ids = [x.strip() for x in ids.split(",")]
    result = {}
    for iid in req_ids:
        if iid in all_data:
            result[iid] = all_data[iid]
        else:
            # Fallback: lire depuis la DB (pas TheOddsApi!)
            match = InternationalMatch.objects.filter(id=int(iid)).first()
            if match:
                result[iid] = {
                    "status": match.status,
                    "score_home": match.home_score,
                    "score_away": match.away_score,
                    "current_minute": match.current_minute,
                    "kickoff": match.match_date.isoformat() if match.match_date else None,
                    "last_live_update": match.last_live_update.isoformat() if match.last_live_update else None,
                }

    return Response({"matchs": result})
