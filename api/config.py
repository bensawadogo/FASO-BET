from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    # API Keys - mandatory, will fail startup if missing
    FOOTBALL_API_KEY: str
    
    # Services
    DJANGO_INTERNAL_URL: str = "http://django:8001"
    
    # Others
    ENV: str = "development"
    
    # CORS — on garde une str pour éviter la validation pydantic des listes
    CORS_ORIGINS: str = ""

    @property
    def cors_origins(self) -> List[str]:
        cors_raw = self.CORS_ORIGINS
        if cors_raw:
            return [o.strip() for o in cors_raw.split(",")]
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://nextjs:3001",
            "https://fasobet.com",
            "https://www.fasobet.com",
            "https://app.fasobet.com",
        ]

    model_config = SettingsConfigDict(env_file=".env.docker", extra='ignore')

settings = Settings()
print(f"[FastAPI Config] CORS_ORIGINS: {settings.cors_origins}")
print(f"[FastAPI Config] Environment: {settings.ENV}")
print(f"[FastAPI Config] Django URL: {settings.DJANGO_INTERNAL_URL}")
