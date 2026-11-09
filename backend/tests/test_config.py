from app.core.config import Settings


def test_settings_defaults() -> None:
    settings = Settings(SECRET_KEY="a" * 32)
    assert settings.APP_NAME == "Ambiguity-Aware Natural Language Query Engine"
    assert settings.PORT == 8000
    assert settings.LLM_PROVIDER in ["mock", "ollama", "huggingface"]
    assert settings.MAX_RESULT_ROWS == 1000
    assert settings.ALLOW_WRITE_OPERATIONS is False


def test_settings_cors_parsing() -> None:
    settings = Settings(
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="http://localhost:3000,http://app.internal:8000",
    )
    assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://app.internal:8000"]
