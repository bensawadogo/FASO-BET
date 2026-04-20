from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from django.utils import timezone
from django.db.models import Count, Q
from django.conf import settings
import os

# Chargement du fichier .env
env_path = os.path.join(settings.BASE_DIR, '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

# Chargement du SKILL en mémoire (chargé une seule fois)
skill_path = os.path.join(settings.BASE_DIR, 'predictions', 'ia-paris-sportif-SKILL.md')
SKILL_CONTENT = ""
if os.path.exists(skill_path):
    with open(skill_path, 'r', encoding='utf-8') as f:
        SKILL_CONTENT = f.read()

from .models import Sport, Match, Prediction, UserProfile, Team
from .forms import PredictionForm, RegisterForm


def home(request):
    """Page d'accueil — dashboard principal."""
    sports = Sport.objects.all()
    upcoming_matches = Match.objects.filter(status='upcoming').order_by('date')[:6]
    live_matches = Match.objects.filter(status='live')
    recent_results = Match.objects.filter(status='finished').order_by('-date')[:5]
    top_users = UserProfile.objects.order_by('-points')[:5]

    # Stats globales
    total_predictions = Prediction.objects.count()
    total_matches = Match.objects.count()
    total_users = UserProfile.objects.count()

    context = {
        'sports': sports,
        'upcoming_matches': upcoming_matches,
        'live_matches': live_matches,
        'recent_results': recent_results,
        'top_users': top_users,
        'total_predictions': total_predictions,
        'total_matches': total_matches,
        'total_users': total_users,
        'api_football_key': os.environ.get('API_FOOTBALL_KEY', ''),
    }
    return render(request, 'predictions/home.html', context)


def matches_list(request):
    """Liste de tous les matchs avec filtrage par sport."""
    sport_slug = request.GET.get('sport', '')
    status_filter = request.GET.get('status', '')

    matches = Match.objects.select_related('sport', 'team_a', 'team_b').all()

    if sport_slug:
        matches = matches.filter(sport__slug=sport_slug)
    if status_filter:
        matches = matches.filter(status=status_filter)

    sports = Sport.objects.all()

    context = {
        'matches': matches,
        'sports': sports,
        'current_sport': sport_slug,
        'current_status': status_filter,
    }
    return render(request, 'predictions/matches.html', context)


def match_detail(request, pk):
    """Détail d'un match + formulaire de prédiction."""
    match = get_object_or_404(Match.objects.select_related('sport', 'team_a', 'team_b'), pk=pk)
    user_prediction = None
    prediction_form = None

    if request.user.is_authenticated:
        user_prediction = Prediction.objects.filter(user=request.user, match=match).first()

        if match.is_predictable and not user_prediction:
            if request.method == 'POST':
                prediction_form = PredictionForm(request.POST)
                if prediction_form.is_valid():
                    prediction = prediction_form.save(commit=False)
                    prediction.user = request.user
                    prediction.match = match
                    prediction.save()

                    # Update user profile
                    profile, _ = UserProfile.objects.get_or_create(user=request.user)
                    profile.total_predictions += 1
                    profile.save()

                    messages.success(request, '✨ Prédiction enregistrée !')
                    return redirect('match_detail', pk=pk)
            else:
                prediction_form = PredictionForm()

    # Statistiques de prédictions pour ce match
    predictions_stats = {
        'team_a': match.predictions.filter(predicted_outcome='team_a').count(),
        'draw': match.predictions.filter(predicted_outcome='draw').count(),
        'team_b': match.predictions.filter(predicted_outcome='team_b').count(),
        'total': match.predictions.count(),
    }

    context = {
        'match': match,
        'user_prediction': user_prediction,
        'prediction_form': prediction_form,
        'predictions_stats': predictions_stats,
        'skill_content': SKILL_CONTENT,
        'gemini_api_key': os.environ.get('GEMINI_API_KEY', ''),
        'groq_api_key': os.environ.get('GROQ_API_KEY', ''),
    }
    return render(request, 'predictions/match_detail.html', context)


@login_required
def my_predictions(request):
    """Historique des prédictions de l'utilisateur."""
    predictions = Prediction.objects.filter(user=request.user).select_related(
        'match', 'match__team_a', 'match__team_b', 'match__sport'
    )
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    context = {
        'predictions': predictions,
        'profile': profile,
    }
    return render(request, 'predictions/my_predictions.html', context)


def leaderboard(request):
    """Classement des meilleurs pronostiqueurs."""
    profiles = UserProfile.objects.select_related('user').order_by('-points', '-correct_predictions')[:50]

    context = {
        'profiles': profiles,
    }
    return render(request, 'predictions/leaderboard.html', context)


def register_view(request):
    """Inscription d'un nouvel utilisateur."""
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            UserProfile.objects.create(user=user)
            login(request, user)
            messages.success(request, '🚀 Bienvenue dans l\'arène !')
            return redirect('home')
    else:
        form = RegisterForm()

    return render(request, 'predictions/register.html', {'form': form})


def login_view(request):
    """Connexion utilisateur."""
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f'👋 Bon retour, {user.username} !')
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)
    else:
        form = AuthenticationForm()

    return render(request, 'predictions/login.html', {'form': form})


def logout_view(request):
    """Déconnexion."""
    logout(request)
    messages.info(request, 'À bientôt ! 👋')
    return redirect('home')


def live_match_detail(request, fixture_id):
    """Page d'analyse d'un match en direct de l'API."""
    context = {
        'fixture_id': fixture_id,
        'skill_content': SKILL_CONTENT,
        'gemini_api_key': os.environ.get('GEMINI_API_KEY', ''),
        'groq_api_key': os.environ.get('GROQ_API_KEY', ''),
        'api_football_key': os.environ.get('API_FOOTBALL_KEY', ''),
    }
    return render(request, 'predictions/live_match_detail.html', context)


def standings(request):
    """Classements en direct depuis l'API Football."""
    context = {
        'api_football_key': os.environ.get('API_FOOTBALL_KEY', ''),
    }
    return render(request, 'predictions/standings.html', context)
