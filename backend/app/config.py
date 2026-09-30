import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Zoom Clone API"
    app_version: str = "1.0.0"
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./zoom_clone.db")
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
