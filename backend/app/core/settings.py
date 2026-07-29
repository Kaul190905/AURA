from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import secrets

class Settings(BaseSettings):
    PROJECT_NAME: str = "AURA"
    API_V1_STR: str = "/api/v1"

    # Supabase PostgreSQL Database
    DATABASE_URL: str

    # Supabase Auth
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # CORS setup — restrict to known origins in production
    BACKEND_CORS_ORIGINS: List[str] = [
        "https://aura-backend-yit7.onrender.com",
        "http://localhost:8000",
        "http://localhost:3000",
    ]

    # ── Security ────────────────────────────────────────────────────────────
    # AES-256 encryption key for PII fields.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Then set ENCRYPTION_KEY in Render environment variables.
    ENCRYPTION_KEY: Optional[str] = None

    # Rate-limiting toggle (disable in unit tests)
    RATE_LIMIT_ENABLED: bool = True

    # AI engines
    USE_ML_RISK_ENGINE: bool = False
    USE_ML_WELLNESS_ENGINE: bool = False
    USE_ML_PREDICTION_ENGINE: bool = False

    # LLM-backed recommendation phrasing (hybrid: rules.json decides eligibility,
    # the LLM only rephrases/personalizes — see app/ai/llm/recommendation_engine_ai.py)
    USE_AI_RECOMMENDATION_ENGINE: bool = False
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama3-8b-8192"
    
    # Read from .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
