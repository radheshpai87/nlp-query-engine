from typing import Any

from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse

logger = setup_logging()


class FallbackLLMProvider(BaseLLMProvider):
    """Try providers in order and return the first successful response.

    Order is deliberate and configured by the provider factory: Groq first,
    then Mistral, then Gemini. A provider that raises any exception is skipped
    for that request; the remaining providers are still attempted.
    """

    def __init__(self, providers: list[BaseLLMProvider]) -> None:
        names = " -> ".join(type(provider).__name__ for provider in providers) or "none"
        super().__init__(f"fallback[{names}]")
        self.providers = list(providers)

    @property
    def provider_names(self) -> list[str]:
        return [getattr(p, "provider_name", type(p).__name__) for p in self.providers]

    def is_healthy(self) -> bool:
        return any(provider.is_healthy() for provider in self.providers)

    def _no_provider_error(self) -> AppError:
        return AppError(
            "No LLM provider is configured. Set GROQ_API_KEY, MISTRAL_API_KEY or "
            "GEMINI_API_KEY, or choose LLM_PROVIDER=mock for local development."
        )

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        if not self.providers:
            raise self._no_provider_error()

        failures: list[str] = []
        for provider in self.providers:
            name = getattr(provider, "provider_name", type(provider).__name__)
            if not provider.is_healthy():
                failures.append(f"{name}: not configured")
                continue
            try:
                response = provider.generate(
                    messages, temperature=temperature, max_tokens=max_tokens, **kwargs
                )
            except Exception as error:
                # Only the provider name and exception type are retained; API
                # keys are never part of provider error messages.
                logger.warning("LLM provider %s failed: %s", name, type(error).__name__)
                failures.append(f"{name}: {type(error).__name__}")
                continue

            logger.info("LLM response produced by %s", name)
            return response

        raise AppError("All configured LLM providers failed. " + "; ".join(failures))

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        if not self.providers:
            raise self._no_provider_error()

        failures: list[str] = []
        for provider in self.providers:
            name = getattr(provider, "provider_name", type(provider).__name__)
            if not provider.is_healthy():
                failures.append(f"{name}: not configured")
                continue
            try:
                response = await provider.generate_async(
                    messages, temperature=temperature, max_tokens=max_tokens, **kwargs
                )
            except Exception as error:
                logger.warning(
                    "LLM provider %s failed: %s", name, type(error).__name__
                )
                failures.append(f"{name}: {type(error).__name__}")
                continue

            logger.info("LLM response produced by %s", name)
            return response

        raise AppError("All configured LLM providers failed. " + "; ".join(failures))
