"""
FasoBet — Admin metrics dashboard.
Accessible via /admin/metrics/ (staff only).
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Q
from .models import PredictionResult
from django.contrib.auth import get_user_model


@staff_member_required
def metrics_dashboard(request):
    User   = get_user_model()
    now    = timezone.now()
    week   = now - timedelta(days=7)
    month  = now - timedelta(days=30)

    predictions_week  = PredictionResult.objects.filter(
        created_at__gte=week
    ).count()
    predictions_month = PredictionResult.objects.filter(
        created_at__gte=month
    ).count()

    # Calculer le taux de réussite
    finished = PredictionResult.objects.exclude(
        actual_result__isnull=True
    ).exclude(actual_result='')
    total_with_result = finished.count()
    correct = 0
    for p in finished:
        if p.was_correct:
            correct += 1

    win_rate = (
        round(correct / total_with_result * 100, 1)
        if total_with_result > 0 else 0
    )

    recent_preds = PredictionResult.objects.order_by(
        '-created_at'
    )[:10]

    context = {
        'total_users':        User.objects.count(),
        'active_week':        User.objects.filter(
                                  last_login__gte=week
                              ).count(),
        'predictions_week':   predictions_week,
        'predictions_month':  predictions_month,
        'win_rate':           win_rate,
        'recent_predictions': recent_preds,
        'total_predictions':  PredictionResult.objects.count(),
    }
    return render(request, 'admin/metrics.html', context)


@staff_member_required
def odds_quota_status(request):
    """Dashboard surveillance quota TheOddsApi — accessible /admin/odds-quota/"""
    from ml.odds_api_quota import get_quota_remaining, compute_refresh_interval_seconds
    from predictions.models import InternationalMatch
    from django.utils import timezone
    import redis, os, json

    now = timezone.now()
    nb_live = InternationalMatch.objects.filter(status="live").count()
    nb_today = InternationalMatch.objects.filter(
        tournament="FIFA World Cup", match_date=now.date()
    ).count()
    quota = get_quota_remaining()
    interval = compute_refresh_interval_seconds(nb_live) if nb_live > 0 else None

    r = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
    cached = r.get("live_match_status:all")
    cache_size = len(json.loads(cached)) if cached else 0

    context = {
        "quota_remaining": quota,
        "quota_total": 500,
        "quota_usage_pct": round((500 - quota) / 500 * 100, 1),
        "nb_live_matches": nb_live,
        "nb_today_matches": nb_today,
        "refresh_interval_seconds": interval,
        "tournament_end": "2026-06-27",
        "days_remaining": (date(2026, 6, 27) - now.date()).days,
        "cache_size": cache_size,
    }
    return render(request, "admin/odds_quota.html", context)
