from pathlib import Path
from typing import List

ROOT_DIR = Path(__file__).resolve().parent.parent

try:
    # pydantic v2.12+ moved BaseSettings to pydantic-settings
    from pydantic_settings import BaseSettings
    from pydantic import Field, AnyUrl
except Exception:
    from pydantic import BaseSettings, Field, AnyUrl


class Settings(BaseSettings):
    # Accept either a generic DB URL (MySQL/Postgres). Prefer URBANIQ_DATABASE_URL
    database_url: AnyUrl | None = Field(None, env="URBANIQ_DATABASE_URL")
    # fallback to older env var name
    database_url_fallback: AnyUrl | None = Field(None, env="DATABASE_URL")
    supabase_url: str | None = Field(None, env="SUPABASE_URL")
    supabase_anon_key: str | None = Field(None, env="SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = Field(None, env="SUPABASE_SERVICE_ROLE_KEY")
    admin_emails: List[str] = Field(default_factory=lambda: ["admin@urbaniq.com"])
    model_dir: Path = ROOT_DIR / "backend" / "ml" / "trained_models"
    data_dir: Path = ROOT_DIR / "data"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# If only DATABASE_URL provided, populate database_url with it
if not settings.database_url and settings.database_url_fallback:
    settings.database_url = settings.database_url_fallback

# Development fallback: if still missing, use a local SQLite file to allow local runs
if not settings.database_url:
    settings.database_url = "sqlite:///./urbaniq_dev.db"