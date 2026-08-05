from pydantic_settings import BaseSettings
import os
import secrets
import json

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")  # development | production | test
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ecrm.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    # Keep as string to avoid pydantic-settings JSON parsing of lists in .env.
    # Accept both:
    # - JSON list: ["http://localhost:5173","http://localhost:3000"]
    # - Comma-separated: http://localhost:5173,http://localhost:3000
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "no-reply@ecrm.local")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("1", "true", "yes", "on")

    @property
    def cors_origins(self) -> list[str]:
        v = (self.CORS_ORIGINS or "").strip()
        if not v:
            return []
        if v.startswith("["):
            try:
                arr = json.loads(v)
                if isinstance(arr, list):
                    return [str(x).strip() for x in arr if str(x).strip()]
            except Exception:
                pass
        return [s.strip() for s in v.split(",") if s.strip()]

    def __init__(self, **data):
        super().__init__(**data)
        if not self.SECRET_KEY:
            if self.ENV.lower() in ["development", "dev", "test", "testing"]:
                # Avoid blocking local dev when .env is missing; production still requires explicit secret.
                self.SECRET_KEY = secrets.token_urlsafe(32)
            else:
                raise ValueError("SECRET_KEY environment variable must be set and non-empty")

    class Config:
        env_file = ".env"

settings = Settings()
