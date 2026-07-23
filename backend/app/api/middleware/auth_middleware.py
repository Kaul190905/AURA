from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from app.core.security import get_supabase_client
import logging

logger = logging.getLogger(__name__)

class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """
    Global authentication middleware. 
    Note: For API routes, using `Depends(get_current_user)` is usually preferred 
    so it integrates with OpenAPI (Swagger) documentation automatically.
    """
    def __init__(self, app, exclude_paths: list[str] = None):
        super().__init__(app)
        # Paths that do not require authentication
        self.exclude_paths = exclude_paths or ["/api/v1/openapi.json", "/docs", "/redoc", "/health", "/api/v1/public"]

    async def dispatch(self, request: Request, call_next):
        # Allow requests to excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"}
            )

        token = auth_header.split(" ")[1]
        supabase = get_supabase_client()

        try:
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "User not found or token invalid"}
                )
            
            # Attach the user object to the request state
            request.state.user = user_response.user
            
        except Exception as e:
            error_msg = str(e).lower()
            if "expired" in error_msg:
                return JSONResponse(status_code=401, content={"detail": "Token has expired"})
            
            logger.error(f"Middleware Auth Error: {e}")
            return JSONResponse(status_code=401, content={"detail": "Could not validate credentials"})

        # Proceed to the route handler
        return await call_next(request)
