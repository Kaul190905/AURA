from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AURA"
    API_V1_STR: str = "/api/v1"

    # Supabase PostgreSQL Database
    DATABASE_URL: str

    # Supabase Auth
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # CORS setup
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # AI engines
    USE_ML_RISK_ENGINE: bool = False
    USE_ML_WELLNESS_ENGINE: bool = False

    # LLM-backed recommendation phrasing (hybrid: rules.json decides eligibility,
    # the LLM only rephrases/personalizes — see app/ai/llm/recommendation_engine_ai.py)
    USE_AI_RECOMMENDATION_ENGINE: bool = False
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"
    
    # Read from .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
