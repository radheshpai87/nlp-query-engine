import time
from typing import Any

import httpx

from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse

logger = setup_logging()


class OpenAICompatibleProvider(BaseLLMProvider):
    """Chat-completions provider for OpenAI-compatible HTTP APIs.

    Both Groq and Mistral expose the same request/response shape, so they share
    this implementation and differ only in base URL, model and credentials.
    """

    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str,
        provider_name: str = "openai-compatible",
        timeout: float = 45.0,
    ) -> None:
        super().__init__(model_name)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.provider_name = provider_name
        self.timeout = timeout

    def is_healthy(self) -> bool:
        return bool(self.api_key and self.base_url)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _payload(
        self,
        messages: list[LLMMessage],
        temperature: float,
        max_tokens: int,
    ) -> dict[str, Any]:
        return {
            "model": self.model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    def _parse(
        self,
        data: dict[str, Any],
        started_at: float,
    ) -> LLMResponse:
        choices = data.get("choices") or []
        if not choices:
            raise AppError(f"{self.provider_name} returned no completion choices")

        message = choices[0].get("message") or {}
        content = message.get("content") or ""
        usage = data.get("usage") or {}
        prompt_tokens = int(usage.get("prompt_tokens") or 0)
        completion_tokens = int(usage.get("completion_tokens") or 0)

        return LLMResponse(
            content=content,
            model=str(data.get("model") or self.model_name),
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": int(
                    usage.get("total_tokens") or prompt_tokens + completion_tokens
                ),
            },
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )

    def _request_failed(self, error: Exception) -> AppError:
        # Deliberately does not include headers, request bodies or URL query
        # strings, so credentials cannot leak into error messages or logs.
        if isinstance(error, httpx.HTTPStatusError):
            status = error.response.status_code
            logger.warning("%s request failed with HTTP %s", self.provider_name, status)
            return AppError(f"{self.provider_name} request failed (HTTP {status})")
        logger.warning("%s request failed: %s", self.provider_name, type(error).__name__)
        return AppError(f"{self.provider_name} request failed ({type(error).__name__})")

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        started_at = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json=self._payload(messages, temperature, max_tokens),
                )
                response.raise_for_status()
                data = response.json()
        except Exception as error:  # network, timeout, HTTP status or bad JSON
            raise self._request_failed(error) from error

        return self._parse(data, started_at)

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        started_at = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json=self._payload(messages, temperature, max_tokens),
                )
                response.raise_for_status()
                data = response.json()
        except Exception as error:
            raise self._request_failed(error) from error

        return self._parse(data, started_at)
