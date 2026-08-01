"""
AURA Input Sanitization Middleware
====================================
Intercepts every incoming request and:
1. Strips HTML / JavaScript from text payloads (XSS prevention)
2. Blocks known SQL-injection patterns
3. Enforces a maximum request body size (10 KB) to prevent
   oversized payload abuse
4. Adds security response headers (HSTS, X-Content-Type-Options, etc.)
"""

from __future__ import annotations

import json
import logging
import re
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Patterns ───────────────────────────────────────────────────────────────────

# HTML / script tags
_HTML_RE = re.compile(r"<[^>]+>", re.IGNORECASE)

# Basic SQLi probes: union-select, drop/alter/truncate, comment sequences
_SQLI_RE = re.compile(
    r"(union\s+select|drop\s+table|alter\s+table|truncate\s+table"
    r"|--\s|;\s*drop|;\s*delete|;\s*insert|;\s*update"
    r"|'\s*or\s+'1'\s*=\s*'1|'\s*or\s+1\s*=\s*1)",
    re.IGNORECASE,
)

# Maximum body size (bytes)
_MAX_BODY_BYTES = 10 * 1024  # 10 KB


def _sanitize_string(value: str) -> str:
    """Strip HTML tags and detect SQLi patterns from a string field."""
    cleaned = _HTML_RE.sub("", value)
    if _SQLI_RE.search(cleaned):
        raise ValueError("Blocked: potential injection in field value")
    return cleaned


def _sanitize_recursive(obj: object) -> object:
    """Walk a decoded JSON object and sanitize all string leaves."""
    if isinstance(obj, str):
        return _sanitize_string(obj)
    if isinstance(obj, dict):
        return {k: _sanitize_recursive(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_recursive(item) for item in obj]
    return obj


# ── Middleware ─────────────────────────────────────────────────────────────────

class SecuritySanitizationMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that sanitizes request bodies and adds security headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Block oversized bodies
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > _MAX_BODY_BYTES:
            logger.warning(
                "Blocked oversized request from %s (%s bytes)",
                request.client.host if request.client else "unknown",
                content_length,
            )
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (max 10 KB)"},
            )

        # 2. Sanitize JSON bodies (POST / PUT / PATCH only)
        if request.method in ("POST", "PUT", "PATCH"):
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    raw_body = await request.body()
                    if raw_body:
                        payload = json.loads(raw_body)
                        _sanitize_recursive(payload)  # raises ValueError on injection
                except ValueError as exc:
                    logger.warning("Sanitization blocked request: %s", exc)
                    return JSONResponse(
                        status_code=422,
                        content={"detail": str(exc)},
                    )
                except json.JSONDecodeError:
                    pass  # let FastAPI's own parser handle malformed JSON

        response = await call_next(request)

        # 3. Attach security response headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        # Remove server fingerprinting header if Uvicorn added it
        try:
            del response.headers["server"]
        except (KeyError, Exception):
            pass

        return response
