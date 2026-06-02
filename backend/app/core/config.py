from pydantic_settings import BaseSettings
import os
import secrets

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")  # development | production | test
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ecrm.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

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
