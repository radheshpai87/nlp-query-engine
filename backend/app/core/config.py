from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Ambiguity-Aware Natural Language Query Engine"
    APP_ENV: str = Field(default="development", description="development, staging, production")
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Security
    SECRET_KEY: str = Field(default="dev-secret-key-must-be-changed-in-production-min-32-chars")
    ENCRYPTION_KEY: str = Field(
        default="dGhpcy1pcy1hLWR1bW15LWtleS1mb3ItZGV2LW9ubHk=",
        description="Fernet 32 url-safe base64 key for connection credential encryption",
    )

    # Application Metadata MongoDB
    APP_MONGO_URI: str = (
        "mongodb://root:appsecret@localhost:27017/nlp_query_engine_meta?authSource=admin"
    )
    APP_MONGO_DB_NAME: str = "nlp_query_engine_meta"

    # LLM & NLP
    LLM_PROVIDER: str = "mock"  # mock, ollama, huggingface
    LLM_MODEL: str = "llama3:8b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Query Safety Policies
    MAX_QUERY_EXECUTION_TIME_SECONDS: int = 30
    MAX_RESULT_ROWS: int = 1000
    MAX_RESULT_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOW_WRITE_OPERATIONS: bool = False

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
