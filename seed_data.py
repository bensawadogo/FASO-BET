"""Seed script — demo data for Antigravity Predictions."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from predictions.models import Sport, Team, Match, Prediction, UserProfile

# Sports
football = Sport.objects.get_or_create(name='Football', slug='football', defaults={'icon': '⚽'})[0]
basket = Sport.objects.get_or_create(name='Basketball', slug='basketball', defaults={'icon': '🏀'})[0]
tennis = Sport.objects.get_or_create(name='Tennis', slug='tennis', defaults={'icon': '🎾'})[0]
mma = Sport.objects.get_or_create(name='MMA', slug='mma', defaults={'icon': '🥊'})[0]

# Teams
teams_data = [
    (football, 'PSG', '🔵'), (football, 'Real Madrid', '⚪'),
    (football, 'Man City', '🩵'), (football, 'Bayern Munich', '🔴'),
    (football, 'Barcelone', '🟡'), (football, 'Liverpool', '🟠'),
    (basket, 'Lakers', '💛'), (basket, 'Warriors', '💙'),
    (basket, 'Celtics', '💚'), (basket, 'Heat', '❤️'),
    (tennis, 'Sinner', '🇮🇹'), (tennis, 'Alcaraz', '🇪🇸'),
    (tennis, 'Djokovic', '🇷🇸'), (tennis, 'Medvedev', '🇷🇺'),
    (mma, 'McGregor', '🇮🇪'), (mma, 'Makhachev', '🇷🇺'),
]
teams = {}
for sport, name, emoji in teams_data:
    teams[name] = Team.objects.get_or_create(name=name, sport=sport, defaults={'logo_emoji': emoji})[0]

now = timezone.now()

# Upcoming matches
matches_upcoming = [
    (football, 'PSG', 'Real Madrid', now + timedelta(days=2), 'Ligue des Champions'),
    (football, 'Man City', 'Bayern Munich', now + timedelta(days=3), 'Ligue des Champions'),
    (basket, 'Lakers', 'Warriors', now + timedelta(days=1), 'NBA Playoffs'),
    (basket, 'Celtics', 'Heat', now + timedelta(days=2), 'NBA Playoffs'),
    (tennis, 'Sinner', 'Alcaraz', now + timedelta(days=4), 'Roland Garros'),
    (mma, 'McGregor', 'Makhachev', now + timedelta(days=7), 'UFC 320'),
]
for sport, ta, tb, date, league in matches_upcoming:
    Match.objects.get_or_create(sport=sport, team_a=teams[ta], team_b=teams[tb],
        defaults={'date': date, 'status': 'upcoming', 'league': league})

# Finished matches
matches_finished = [
    (football, 'Barcelone', 'Liverpool', now - timedelta(days=3), 3, 1, 'Ligue des Champions'),
    (football, 'PSG', 'Man City', now - timedelta(days=5), 2, 2, 'Ligue des Champions'),
    (basket, 'Lakers', 'Celtics', now - timedelta(days=2), 112, 108, 'NBA'),
]
for sport, ta, tb, date, sa, sb, league in matches_finished:
    Match.objects.get_or_create(sport=sport, team_a=teams[ta], team_b=teams[tb],
        defaults={'date': date, 'status': 'finished', 'score_a': sa, 'score_b': sb, 'league': league})

# Live match
Match.objects.get_or_create(sport=football, team_a=teams['Barcelone'], team_b=teams['Bayern Munich'],
    defaults={'date': now - timedelta(hours=1), 'status': 'live', 'score_a': 1, 'score_b': 0, 'league': 'UCL'})

# Users & profiles
demo_users = [
    ('AlphaProno', 850, 45, 32, 8, 12, '🦅'),
    ('BetKing', 720, 38, 26, 5, 9, '👑'),
    ('OracleSport', 680, 42, 27, 3, 7, '🔮'),
    ('LuckyShot', 510, 30, 18, 2, 6, '🍀'),
    ('PronoMaster', 490, 35, 20, 4, 5, '🧠'),
]
for username, pts, total, correct, streak, best, emoji in demo_users:
    user, _ = User.objects.get_or_create(username=username, defaults={'email': f'{username}@demo.com'})
    UserProfile.objects.update_or_create(user=user, defaults={
        'points': pts, 'total_predictions': total, 'correct_predictions': correct,
        'current_streak': streak, 'best_streak': best, 'avatar_emoji': emoji,
    })

print("✅ Demo data seeded successfully!")
