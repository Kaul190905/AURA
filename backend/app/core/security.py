from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.settings import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

def get_supabase_client() -> Client:
    """Initialize and return the Supabase client."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

import time

# Simple token cache to prevent Supabase GoTrue concurrent request flakiness
# Maps token -> (user_object, expiry_timestamp)
_token_cache = {}

import asyncio
_token_lock = asyncio.Lock()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get the current authenticated user from Supabase.
    Validates the JWT token against the Supabase Auth server.
    Handles expired and invalid tokens gracefully.
    """
    token = credentials.credentials
    
    # Check cache first (fast path)
    if token in _token_cache:
        cached_user, expiry = _token_cache[token]
        if time.time() < expiry:
            return cached_user
            
    async with _token_lock:
        # Check cache again inside lock (prevent concurrent API calls)
        if token in _token_cache:
            cached_user, expiry = _token_cache[token]
            if time.time() < expiry:
                return cached_user
                
        supabase = get_supabase_client()
        
        try:
            # get_user automatically verifies the token on the Supabase backend
            user_response = supabase.auth.get_user(token)
            
            if not user_response or not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or token invalid",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            # Cache the successful validation for 60 seconds
            _token_cache[token] = (user_response.user, time.time() + 60)
            return user_response.user

        except Exception as e:
            error_msg = str(e).lower()
            
            # Explicitly handle expired tokens based on Supabase error responses
            if "expired" in error_msg:
                logger.warning(f"Expired token attempt: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Generic authentication failure
            logger.error(f"Authentication failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
