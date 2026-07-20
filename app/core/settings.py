from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

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
    
    # Read from .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
