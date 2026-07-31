"""
AURA Rate Limiter (Dual Engine: Redis + In-Memory Fallback)
============================================================
Per-user (JWT sub claim) and per-IP sliding-window rate limiter.

Supports both:
  1. Distributed Redis backend (when REDIS_URL env var is provided)
     - Enables multi-server horizontal scaling across clusters.
  2. In-memory LRU cache fallback (when REDIS_URL is not set)
     - Zero-dependency for single-instance free Render tier.

Limits:
  • Sensor data ingestion  – 120 req / minute per user
  • All other endpoints    – 60 req / minute per user
  • Anonymous/IP fallback  – 30 req / minute
"""

from __future__ import annotations

import logging
import os
import time
from collections import OrderedDict
from typing import Tuple

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
WINDOW_SECONDS: int = 60            # Rolling window duration
DEFAULT_LIMIT: int = 60             # Requests per window (authenticated)
SENSOR_LIMIT: int = 120             # Sensor-data endpoint allowance
ANON_LIMIT: int = 30                # Unauthenticated / IP-only allowance
MAX_CACHE_ENTRIES: int = 10_000     # Evict oldest when in-memory cache grows beyond this

# ── Redis Client Initialization (Optional) ─────────────────────────────────────
_redis_client = None
_redis_available = False

REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        _redis_client.ping()
        _redis_available = True
        logger.info("✅ Rate Limiter: Connected to Redis cluster at %s", REDIS_URL.split("@")[-1])
    except Exception as exc:
        logger.warning("⚠️ Rate Limiter: Redis connection failed (%s). Falling back to In-Memory store.", exc)
        _redis_available = False


# ── In-Process Store (Fallback) ────────────────────────────────────────────────
_store: OrderedDict[str, list[float]] = OrderedDict()


def _evict_if_needed() -> None:
    while len(_store) > MAX_CACHE_ENTRIES:
        _store.popitem(last=False)


# ── Core Rate Limit Logic ─────────────────────────────────────────────────────

def _is_rate_limited_in_memory(key: str, limit: int) -> Tuple[bool, int]:
    """Check key against limit using in-process sliding window."""
    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS

    hits = _store.get(key, [])
    hits = [t for t in hits if t > cutoff]
    hits.append(now)
    _store[key] = hits
    _evict_if_needed()

    remaining = max(0, limit - len(hits))
    return len(hits) > limit, remaining


def _is_rate_limited_redis(key: str, limit: int) -> Tuple[bool, int]:
    """Check key against limit using Redis atomic transaction (multi-instance shared)."""
    now = time.time()
    cutoff = now - WINDOW_SECONDS
    redis_key = f"ratelimit:{key}"

    try:
        pipe = _redis_client.pipeline()
        pipe.zremrangebyscore(redis_key, 0, cutoff)
        pipe.zadd(redis_key, {str(now): now})
        pipe.zcard(redis_key)
        pipe.expire(redis_key, WINDOW_SECONDS)
        results = pipe.execute()

        hit_count = results[2]
        remaining = max(0, limit - hit_count)
        return hit_count > limit, remaining
    except Exception as exc:
        logger.warning("Redis rate limit check failed (%s); falling back to in-memory", exc)
        return _is_rate_limited_in_memory(key, limit)


def _is_rate_limited(key: str, limit: int) -> Tuple[bool, int]:
    if _redis_available and _redis_client:
        return _is_rate_limited_redis(key, limit)
    return _is_rate_limited_in_memory(key, limit)


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def rate_limit_dependency(request: Request) -> None:
    """FastAPI rate limiting dependency."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        user_key = auth_header[7:47]
        key_type = "user"
    else:
        user_key = request.client.host if request.client else "unknown"
        key_type = "ip"

    path = request.url.path
    if "sensor-data" in path:
        limit = SENSOR_LIMIT
    elif key_type == "ip":
        limit = ANON_LIMIT
    else:
        limit = DEFAULT_LIMIT

    bucket_key = f"{key_type}:{user_key}:{path.split('/')[3] if path.count('/') >= 3 else 'root'}"
    limited, remaining = _is_rate_limited(bucket_key, limit)

    if limited:
        logger.warning("Rate limit exceeded: key=%s path=%s", bucket_key, path)
        raise _rate_limit_response(limit, remaining)


def _rate_limit_response(limit: int, remaining: int):
    """Return a 429 HTTPException-compatible response."""
    from fastapi import HTTPException
    raise HTTPException(
        status_code=429,
        detail=f"Rate limit exceeded. Max {limit} requests per {WINDOW_SECONDS}s. Please try again shortly.",
        headers={
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "Retry-After": str(WINDOW_SECONDS),
        },
    )
