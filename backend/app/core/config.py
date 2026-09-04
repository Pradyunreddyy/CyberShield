"""
Central application configuration.

Every sensitive value (database URL, JWT secret, AI API key) is read from
environment variables and MUST NOT be hardcoded. See `.env.example` for the
full list of variables the application expects.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- General -----------------------------------------------------
    APP_NAME: str = "AI-Assisted Cybersecurity Incident Response Platform"
    ENVIRONMENT: str = "development"  # development | production
    API_V1_PREFIX: str = "/api"

    # --- Database ------------------------------------------------------
    # Example (Postgres): postgresql+psycopg2://user:password@host:5432/dbname
    # Falls back to a local SQLite file so the project also runs without
    # Postgres installed (useful for quick demos / automated tests).
    DATABASE_URL: str = "sqlite:///./dev.db"

    # --- Auth / JWT ------------------------------------------------------
    JWT_SECRET_KEY: str = "CHANGE_ME_DEV_ONLY_INSECURE_SECRET"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # --- CORS ------------------------------------------------------
    # Comma separated list of allowed origins, e.g.
    # "http://localhost:5173,https://my-frontend.vercel.app"
    CORS_ORIGINS: str = "http://localhost:5173"

    # --- AI Service ------------------------------------------------------
    AI_PROVIDER: str = "anthropic"  # anthropic | openai | disabled
    AI_API_KEY: str = ""
    AI_MODEL: str = "claude-sonnet-4-6"
    AI_REQUEST_TIMEOUT_SECONDS: int = 30

    # --- File Uploads ------------------------------------------------------
    UPLOAD_MAX_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    UPLOAD_ALLOWED_EXTENSIONS: str = ".zip"
    UPLOAD_TMP_DIR: str = "/tmp/incident_platform_uploads"
    MAX_FILES_PER_ARCHIVE: int = 2000
    MAX_UNCOMPRESSED_ARCHIVE_BYTES: int = 200 * 1024 * 1024  # 200 MB, anti zip-bomb

    # --- Demo / seed data ------------------------------------------------------
    ENABLE_DEMO_SEED: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.UPLOAD_ALLOWED_EXTENSIONS.split(",") if ext.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
