from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.core.exceptions import AURAException, aura_exception_handler
from app.core.logging import setup_logging
from app.core.sanitization import SecuritySanitizationMiddleware
from app.core.hmac_firewall import HMACVerificationMiddleware
from app.core.rate_limiter import rate_limit_dependency
from app.api.v1.routes import api_router

# Setup logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="AURA IoT Healthcare Backend",
    version="1.0.0",
)

# ── 1. Security Sanitization Middleware (XSS / SQLi / oversized body) ─────────
app.add_middleware(SecuritySanitizationMiddleware)

# ── 2. HMAC Request Signing Verification Middleware ───────────────────────────
app.add_middleware(HMACVerificationMiddleware)

# ── 3. CORS Middleware ──────────────────────────────────────────────────────────
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── 4. Exception handlers ───────────────────────────────────────────────────────
app.add_exception_handler(AURAException, aura_exception_handler)

# ── 5. API Routes (with rate-limiting applied to all routes) ────────────────────
app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
    dependencies=[Depends(rate_limit_dependency)],
)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
