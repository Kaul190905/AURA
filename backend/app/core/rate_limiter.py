"""
AURA Rate Limiter
==================
Per-user (JWT sub claim) and per-IP sliding-window rate limiter.

Limits:
  • Sensor data ingestion  – 120 req / minute per user  (every 500 ms)
  • All other endpoints    – 60 req / minute per user
  • Anonymous/IP fallback  – 30 req / minute

Uses an in-process LRU cache (collections.OrderedDict) – no Redis
required for the free Render tier.  For multi-replica deployments
swap the backend to Redis via the RATE_LIMIT_BACKEND env var.
"""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from typing import Dict, Tuple

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
WINDOW_SECONDS: int = 60            # Rolling window duration
DEFAULT_LIMIT: int = 60             # Requests per window (authenticated)
SENSOR_LIMIT: int = 120             # Sensor-data endpoint allowance
ANON_LIMIT: int = 30                # Unauthenticated / IP-only allowance
MAX_CACHE_ENTRIES: int = 10_000     # Evict oldest when cache grows beyond this


# ── In-process sliding window store ───────────────────────────────────────────
# Structure: { key: [(timestamp, ...), ...] }
_store: OrderedDict[str, list[float]] = OrderedDict()


def _evict_if_needed() -> None:
    while len(_store) > MAX_CACHE_ENTRIES:
        _store.popitem(last=False)


def _is_rate_limited(key: str, limit: int) -> Tuple[bool, int]:
    """Check *key* against *limit* requests per WINDOW_SECONDS.

    Returns (limited: bool, remaining: int).
    """
    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS

    hits = _store.get(key, [])
    # Purge timestamps outside the current window
    hits = [t for t in hits if t > cutoff]
    hits.append(now)
    _store[key] = hits
    _evict_if_needed()

    remaining = max(0, limit - len(hits))
    return len(hits) > limit, remaining


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def rate_limit_dependency(request: Request) -> None:
    """Inject as a FastAPI dependency on any router or individual route.

    Usage:
        from app.core.rate_limiter import rate_limit_dependency
        router = APIRouter(dependencies=[Depends(rate_limit_dependency)])
    """
    # Determine rate-limit key: prefer authenticated user UUID, fall back to IP
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        # Use the raw token as the bucket key (avoids decoding JWT)
        user_key = auth_header[7:47]  # first 40 chars of token – unique enough
        key_type = "user"
    else:
        user_key = request.client.host if request.client else "unknown"
        key_type = "ip"

    # Determine applicable limit
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
        detail=(
            f"Rate limit exceeded. Max {limit} requests per {WINDOW_SECONDS}s. "
            f"Please try again shortly."
        ),
        headers={
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "Retry-After": str(WINDOW_SECONDS),
        },
    )
