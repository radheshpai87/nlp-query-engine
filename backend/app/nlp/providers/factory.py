from fastapi import Depends

from app.core.config import Settings, get_settings
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.nlp.providers.mock_provider import MockLLMProvider
from app.nlp.providers.ollama_provider import OllamaProvider


def get_llm_provider(
    settings: Settings = Depends(get_settings),
) -> BaseLLMProvider:
    """Instantiate appropriate LLM provider based on application configuration."""
    provider_name = settings.LLM_PROVIDER.lower().strip()

    if provider_name == "ollama":
        return OllamaProvider(
            model_name=settings.LLM_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
    return MockLLMProvider(model_name=settings.LLM_MODEL)


__all__ = [
    "BaseLLMProvider",
    "LLMMessage",
    "LLMResponse",
    "MockLLMProvider",
    "OllamaProvider",
    "get_llm_provider",
]
