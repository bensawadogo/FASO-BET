"""
Gestion du quota TheOddsApi — calcule l'intervalle de rafraîchissement
Celery EN FONCTION du quota restant et du nombre de matchs live, plutôt
qu'un intervalle fixe code en dur.

Pourquoi ce module existe : un intervalle fixe base sur une hypothese de
repartition moyenne des matchs casse silencieusement les jours de forte
densite (ex: 4 matchs simultanes en phase de poules). Ce module rend le
systeme robuste a cette variation au lieu de l'esperer.

Stocke le quota restant dans Redis (mis a jour a chaque appel API reel,
lu depuis le header x-requests-remaining de la reponse TheOddsApi).
"""
import redis
import os
from datetime import datetime, timedelta

REDIS_KEY_QUOTA_REMAINING = "theoddsapi:quota_remaining"
REDIS_KEY_LIVE_MATCH_COUNT = "theoddsapi:live_match_count"

# Plan gratuit TheOddsApi — a ajuster si le plan change
MONTHLY_QUOTA = 500
TOURNAMENT_END_DATE = datetime(2026, 6, 27)  # fin CdM2026

# Garde-fou dur : ne jamais descendre sous cette reserve
SAFETY_RESERVE = 50


def get_redis_client():
    return redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))


def record_quota_remaining(remaining: int):
    r = get_redis_client()
    r.set(REDIS_KEY_QUOTA_REMAINING, remaining)


def get_quota_remaining() -> int:
    r = get_redis_client()
    val = r.get(REDIS_KEY_QUOTA_REMAINING)
    return int(val) if val else MONTHLY_QUOTA


def compute_refresh_interval_seconds(nb_live_matches: int):
    if nb_live_matches == 0:
        return None

    quota_left = get_quota_remaining() - SAFETY_RESERVE
    if quota_left <= 0:
        return None

    days_left = max(1, (TOURNAMENT_END_DATE - datetime.utcnow()).days)
    daily_budget = quota_left / days_left
    requests_per_match_today = max(1, daily_budget / nb_live_matches)
    match_live_duration_seconds = 2 * 3600
    interval = match_live_duration_seconds / requests_per_match_today
    return int(max(60, min(interval, 20 * 60)))


def get_live_match_count() -> int:
    r = get_redis_client()
    val = r.get(REDIS_KEY_LIVE_MATCH_COUNT)
    return int(val) if val else 0
