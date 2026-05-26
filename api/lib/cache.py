"""FasoBet - Redis cache layer (BLOC 2)
Équivalent Python de src/lib/cache.ts

Utilise Redis pour le cache distribué avec TTL.
Fallback: cache mémoire si Redis indisponible.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Optional

_CACHE_TTL_DEFAULT = 1800  # 30 minutes

# Cache mémoire de fallback
_memory_cache: dict[str, tuple[float, Any]] = {}
_cache_hits = 0
_cache_misses = 0

# Redis client (lazy loading)
_redis_client = None


def _get_redis():
    """Retourne le client Redis ou None si non configuré."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    
    redis_url = os.environ.get("FASTAPI_REDIS_URL", "")
    if not redis_url:
        return None
    
    try:
        import redis
        _redis_client = redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception:
        _redis_client = None
        return None


def get_cache_key(date: str, leagues: list[int]) -> str:
    """Génère une clé de cache pour le pipeline."""
    league_str = "_".join(str(l) for l in sorted(leagues))
    return f"pipeline:{date}:{league_str}"


def get_cached(key: str) -> Optional[Any]:
    """Récupère une valeur du cache."""
    global _cache_hits, _cache_misses
    
    client = _get_redis()
    if client:
        try:
            data = client.get(key)
            if data:
                _cache_hits += 1
                return json.loads(data)
        except Exception:
            pass
    
    # Fallback mémoire
    if key in _memory_cache:
        expiry, data = _memory_cache[key]
        if time.time() < expiry:
            _cache_hits += 1
            return data
    
    _cache_misses += 1
    return None


def set_cached(key: str, value: Any, ttl: int = _CACHE_TTL_DEFAULT) -> None:
    """Stocke une valeur dans le cache."""
    client = _get_redis()
    if client:
        try:
            client.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception:
            pass
    
    # Fallback mémoire
    _memory_cache[key] = (time.time() + ttl, value)


def invalidate_key(key: str) -> None:
    """Invalide une clé du cache."""
    client = _get_redis()
    if client:
        try:
            client.delete(key)
        except Exception:
            pass
    _memory_cache.pop(key, None)


def get_cache_stats() -> dict:
    """Retourne les statistiques du cache."""
    return {
        "hits": _cache_hits,
        "misses": _cache_misses,
        "hit_rate": round(_cache_hits / (_cache_hits + _cache_misses) * 100, 1) if (_cache_hits + _cache_misses) > 0 else 0,
        "memory_entries": len(_memory_cache),
        "redis_connected": _get_redis() is not None,
    }
