from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
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
    # auto: Groq -> Mistral -> Gemini, using whichever keys are configured.
    # mock and ollama remain explicit local-development modes.
    LLM_PROVIDER: str = "auto"  # auto, groq, mistral, gemini, ollama, mock
    LLM_MODEL: str = "llama3:8b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Cloud model providers. Keys are read from the environment only and are
    # never returned by the API, embedded in prompts, or written to logs.
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "ministral-8b-latest"
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    LLM_TIMEOUT_SECONDS: float = 45.0

    # Query Safety Policies
    MAX_QUERY_EXECUTION_TIME_SECONDS: int = 30
    MAX_RESULT_ROWS: int = 1000
    MAX_RESULT_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOW_WRITE_OPERATIONS: bool = False

    # OAuth Providers
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_BASE_URL: str = "https://nlp.radhesh.me"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
