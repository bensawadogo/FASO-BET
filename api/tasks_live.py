"""Celery task: refresh live scores via TheOddsApi with quota auto-regulation + time-based fallback."""

from __future__ import annotations
import os, json, logging
from datetime import datetime, timezone, timedelta
from django.utils import timezone as tz
from sportpred.celery import app
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

ODDS_API_KEY = os.environ.get("ODDS_API_KEY", "")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CACHE_KEY = "live_match_status:all"

THEODDSAPI_SPORTS = ["soccer_fifa_world_cup"]

MATCH_DURATION_HOURS = 2.5


def _get_redis():
    import redis
    return redis.Redis.from_url(REDIS_URL)


def _get_todays_matches():
    """Return all today's InternationalMatch matches that are not finished."""
    from predictions.models import InternationalMatch
    return list(InternationalMatch.objects.filter(
        tournament="FIFA World Cup",
        match_date=tz.now().date(),
    ).exclude(status="finished").order_by("kickoff_utc"))


def _update_status_by_time(matches):
    """Time-based fallback: compute live/finished/scheduled from kickoff_utc."""
    now = tz.now()
    updated = 0
    for m in matches:
        if m.kickoff_utc is None:
            continue
        kickoff = m.kickoff_utc
        new_status = m.status
        if now < kickoff:
            new_status = "scheduled"
            new_minute = None
        elif now <= kickoff + timedelta(hours=MATCH_DURATION_HOURS):
            new_status = "live"
            elapsed = (now - kickoff).total_seconds()
            new_minute = min(int(elapsed // 60), 90)
        else:
            new_status = "finished"
            new_minute = None
        if new_status != m.status or new_status == "live":
            changed = False
            if new_status != m.status:
                m.status = new_status
                changed = True
            if new_status == "live" and m.current_minute != new_minute:
                m.current_minute = new_minute
                changed = True
            if new_status == "finished" and m.status != "finished":
                m.status = "finished"
                m.current_minute = None
                changed = True
            if changed:
                m.last_live_update = now
                m.save(update_fields=["status", "current_minute", "last_live_update"])
                updated += 1
    if updated:
        logger.info(f"Time-based status update applied to {updated} matches")
    return updated


def _fetch_oddsapi_scores():
    """Call TheOddsApi new endpoint (no /v4/ prefix, x-api-key header)."""
    if not ODDS_API_KEY:
        logger.warning("ODDS_API_KEY not set")
        return None

    import requests
    headers = {"x-api-key": ODDS_API_KEY}
    results = []
    for sport in THEODDSAPI_SPORTS:
        url = f"https://api.theoddsapi.com/scores/"
        params = {"sport_key": sport, "daysFrom": 3}
        try:
            r = requests.get(url, headers=headers, params=params, timeout=15)
            quota = r.headers.get("x-requests-remaining", "unknown")
            logger.info(f"TheOddsApi quota: {quota}")

            from ml.odds_api_quota import record_quota_remaining
            try:
                record_quota_remaining(int(quota))
            except (ValueError, TypeError):
                pass

            if r.status_code == 200:
                data = r.json()
                results.extend(data)
            elif r.status_code == 401:
                logger.error("TheOddsApi: unauthorized (key invalid for new API)")
                return None
            else:
                logger.error(f"TheOddsApi: HTTP {r.status_code} {r.text[:200]}")
                return None
        except ImportError:
            logger.error("requests not available")
            return None
        except Exception as e:
            logger.error(f"TheOddsApi: {e}")
            return None

    return results


@app.task(name="api.tasks.refresh_live_odds_and_scores", bind=True, max_retries=1)
def refresh_live_odds_and_scores(self):
    """Main Celery task: refresh live scores in Redis DB and reschedule dynamically.

    Two-phase approach:
      1. Time-based status update (always runs, no quota cost)
      2. TheOddsApi fetch if available (quota-budgeted)
    """
    from ml.odds_api_quota import compute_refresh_interval_seconds, get_quota_remaining

    matches = _get_todays_matches()
    nb_today = len(matches)
    logger.info(f"Today's WC matches (non-finished): {nb_today}")

    # Phase 1: time-based status from kickoff_utc (always, zero cost)
    _update_status_by_time(matches)

    # Phase 2: try TheOddsApi for real scores
    odds_data = _fetch_oddsapi_scores()
    if odds_data is None:
        # API unavailable — keep time-based status, degrade gracefully
        logger.warning("TheOddsApi unavailable — using time-based status only")
        r = _get_redis()
        cache_data = {}
        for m in _get_todays_matches():
            cache_data[str(m.id)] = {
                "status": m.status,
                "score_home": m.home_score,
                "score_away": m.away_score,
                "current_minute": m.current_minute,
                "last_live_update": m.last_live_update.isoformat() if m.last_live_update else None,
            }
        r.set(CACHE_KEY, json.dumps(cache_data), ex=3600)
        # Keep polling at 60s for live detection, 300s if none live
        live_count = sum(1 for m in _get_todays_matches() if m.status == "live")
        interval = 60 if live_count > 0 else None
        if interval:
            self.apply_async(countdown=interval)
        return {
            "status": "time_based_fallback",
            "live_matches": live_count,
            "matches_today": nb_today,
            "next_interval_seconds": interval,
        }

    # Merge odds data into DB + Redis
    scores_by_team = {}
    for game in odds_data:
        home = game.get("home_team", "")
        away = game.get("away_team", "")
        scores_list = game.get("scores", [])
        status = "live" if game.get("status") == "inprogress" else "scheduled"
        if game.get("completed"):
            status = "finished"
        score_h = score_a = None
        for s in scores_list:
            if s.get("name") == home:
                score_h = s.get("score")
            if s.get("name") == away:
                score_a = s.get("score")
        scores_by_team[(home, away)] = {
            "status": status,
            "score_home": score_h,
            "score_away": score_a,
        }

    from predictions.models import InternationalMatch
    now = tz.now()
    r = _get_redis()
    cache_data = {}

    for m in matches:
        key = (m.home_team, m.away_team)
        api = scores_by_team.get(key, {})
        new_status = api.get("status", "scheduled")
        changed = False

        if new_status == "live" and m.status != "live":
            m.status = "live"
            changed = True
        elif new_status == "finished" and m.status != "finished":
            m.status = "finished"
            changed = True

        if api.get("score_home") is not None and m.home_score != api["score_home"]:
            m.home_score = api["score_home"]
            changed = True
        if api.get("score_away") is not None and m.away_score != api["score_away"]:
            m.away_score = api["score_away"]
            changed = True
        if changed:
            m.last_live_update = now
            m.save(update_fields=["status", "home_score", "away_score", "last_live_update"])

        cache_data[str(m.id)] = {
            "status": m.status,
            "score_home": m.home_score,
            "score_away": m.away_score,
            "current_minute": m.current_minute,
            "last_live_update": m.last_live_update.isoformat() if m.last_live_update else None,
        }

    r.set(CACHE_KEY, json.dumps(cache_data), ex=3600)
    r.set("odds_api_quota_remaining", get_quota_remaining())

    nb_live = sum(1 for v in cache_data.values() if v["status"] == "live")
    interval = compute_refresh_interval_seconds(nb_live)
    logger.info(f"Next refresh in {interval}s ({nb_live} live matches)")
    if interval:
        self.apply_async(countdown=interval)

    return {
        "status": "ok",
        "live_matches_refreshed": nb_live,
        "next_interval_seconds": interval,
    }
