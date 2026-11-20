from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.logging import setup_logging
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.nlp.providers.chain import FallbackLLMProvider
from app.nlp.providers.gemini_provider import GeminiProvider
from app.nlp.providers.mock_provider import MockLLMProvider
from app.nlp.providers.ollama_provider import OllamaProvider
from app.nlp.providers.openai_compatible import OpenAICompatibleProvider

logger = setup_logging()


def build_cloud_providers(settings: Settings) -> list[BaseLLMProvider]:
    """Build the configured cloud providers in fallback order.

    Order is intentional: Groq (Qwen) primary, Mistral secondary, Gemini last.
    Only providers with a non-empty API key are included, so the chain adapts
    to whichever keys are present in the environment.
    """
    providers: list[BaseLLMProvider] = []

    if settings.GROQ_API_KEY.strip():
        providers.append(
            OpenAICompatibleProvider(
                model_name=settings.GROQ_MODEL,
                api_key=settings.GROQ_API_KEY.strip(),
                base_url=settings.GROQ_BASE_URL,
                provider_name="groq",
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
        )

    if settings.MISTRAL_API_KEY.strip():
        providers.append(
            OpenAICompatibleProvider(
                model_name=settings.MISTRAL_MODEL,
                api_key=settings.MISTRAL_API_KEY.strip(),
                base_url=settings.MISTRAL_BASE_URL,
                provider_name="mistral",
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
        )

    if settings.GEMINI_API_KEY.strip():
        providers.append(
            GeminiProvider(
                model_name=settings.GEMINI_MODEL,
                api_key=settings.GEMINI_API_KEY.strip(),
                base_url=settings.GEMINI_BASE_URL,
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
        )

    return providers


def get_llm_provider(
    settings: Settings = Depends(get_settings),
) -> BaseLLMProvider:
    """Instantiate the LLM provider (or fallback chain) for the current config.

    ``LLM_PROVIDER=mock`` and ``ollama`` are explicit local modes. Every other
    value (including the default ``auto``) uses the cloud chain and degrades to
    the deterministic mock provider when no key is configured, so the
    application still boots in a fresh checkout.
    """
    provider_name = (settings.LLM_PROVIDER or "auto").lower().strip()

    if provider_name == "mock":
        return MockLLMProvider(model_name="mock-llm-v1")

    if provider_name == "ollama":
        return OllamaProvider(
            model_name=settings.LLM_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )

    providers = build_cloud_providers(settings)
    if not providers:
        logger.warning(
            "LLM_PROVIDER=%s but no GROQ/MISTRAL/GEMINI key is configured; "
            "using the deterministic mock provider",
            provider_name,
        )
        return MockLLMProvider(model_name="mock-llm-v1")

    if len(providers) == 1:
        return providers[0]

    logger.info(
        "LLM fallback chain enabled: %s",
        " -> ".join(getattr(p, "provider_name", type(p).__name__) for p in providers),
    )
    return FallbackLLMProvider(providers)


__all__ = [
    "BaseLLMProvider",
    "FallbackLLMProvider",
    "GeminiProvider",
    "LLMMessage",
    "LLMResponse",
    "MockLLMProvider",
    "OllamaProvider",
    "OpenAICompatibleProvider",
    "build_cloud_providers",
    "get_llm_provider",
]
