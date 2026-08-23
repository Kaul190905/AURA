"""
AURA HMAC Request Signing Verification Middleware
==================================================
Verifies request authenticity using HMAC-SHA256 signatures to prevent
Man-In-The-Middle (MITM) attacks and replay attacks from unauthorized scripts.

Headers Required:
  - X-Signature: HMAC-SHA256(timestamp + payload, HMAC_SECRET)
  - X-Timestamp: Unix timestamp in seconds

Graceful Fallback:
  If HMAC_STRICT_MODE is False (default in dev), invalid or missing signatures
  log a warning while allowing the app to operate smoothly.
"""

from __future__ import annotations

import hmac
import hashlib
import logging
import os
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

HMAC_SECRET = os.getenv("HMAC_SECRET", "aura_hmac_secret_key_2026_default")
HMAC_STRICT_MODE = os.getenv("HMAC_STRICT_MODE", "false").lower() == "true"
MAX_TIMESTAMP_DELTA = 300  # 5 minutes window for replay prevention


def verify_hmac_signature(payload_bytes: bytes, timestamp_str: str, signature: str) -> bool:
    """Verifies HMAC-SHA256 signature for a payload and timestamp."""
    try:
        ts = float(timestamp_str)
        now = time.time()
        if abs(now - ts) > MAX_TIMESTAMP_DELTA:
            logger.warning("HMAC Firewall: Request timestamp expired (delta > %ss)", MAX_TIMESTAMP_DELTA)
            return False

        message = timestamp_str.encode() + payload_bytes
        expected_sig = hmac.new(
            HMAC_SECRET.encode(),
            message,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature)
    except Exception as exc:
        logger.warning("HMAC signature verification failed: %s", exc)
        return False


class HMACVerificationMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware verifying HMAC request signatures on mutation endpoints."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if os.environ.get("IS_TESTING") == "1":
            return await call_next(request)

        if request.method in ("POST", "PUT", "PATCH"):
            signature = request.headers.get("X-Signature")
            timestamp = request.headers.get("X-Timestamp")

            if signature and timestamp:
                body = await request.body()
                is_valid = verify_hmac_signature(body, timestamp, signature)
                if not is_valid and HMAC_STRICT_MODE:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "HMAC Request Signature Verification Failed"}
                    )
            elif HMAC_STRICT_MODE and "/api/v1/sensor-data" in request.url.path:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing HMAC Security Signature Headers"}
                )

        return await call_next(request)
