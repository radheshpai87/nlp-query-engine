import time
from typing import Any

import httpx

from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse

logger = setup_logging()


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider using the v1beta generateContent API.

    The API key is sent in the ``x-goog-api-key`` header rather than a query
    string so it cannot end up in URLs, proxy logs or error messages.
    """

    provider_name = "gemini"

    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout: float = 45.0,
    ) -> None:
        super().__init__(model_name)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_healthy(self) -> bool:
        return bool(self.api_key and self.base_url)

    def _headers(self) -> dict[str, str]:
        return {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    def _payload(
        self,
        messages: list[LLMMessage],
        temperature: float,
        max_tokens: int,
    ) -> dict[str, Any]:
        system_parts = [m.content for m in messages if m.role == "system"]
        contents = [
            {
                "role": "model" if m.role == "assistant" else "user",
                "parts": [{"text": m.content}],
            }
            for m in messages
            if m.role != "system"
        ]
        if not contents:
            contents = [{"role": "user", "parts": [{"text": ""}]}]

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_parts:
            payload["systemInstruction"] = {
                "parts": [{"text": "\n\n".join(system_parts)}]
            }
        return payload

    def _parse(self, data: dict[str, Any], started_at: float) -> LLMResponse:
        candidates = data.get("candidates") or []
        if not candidates:
            raise AppError("gemini returned no candidates")

        parts = (candidates[0].get("content") or {}).get("parts") or []
        content = "".join(str(part.get("text") or "") for part in parts)
        usage = data.get("usageMetadata") or {}
        prompt_tokens = int(usage.get("promptTokenCount") or 0)
        completion_tokens = int(usage.get("candidatesTokenCount") or 0)

        return LLMResponse(
            content=content,
            model=self.model_name,
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": int(
                    usage.get("totalTokenCount") or prompt_tokens + completion_tokens
                ),
            },
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )

    def _request_failed(self, error: Exception) -> AppError:
        if isinstance(error, httpx.HTTPStatusError):
            status = error.response.status_code
            logger.warning("gemini request failed with HTTP %s", status)
            return AppError(f"gemini request failed (HTTP {status})")
        logger.warning("gemini request failed: %s", type(error).__name__)
        return AppError(f"gemini request failed ({type(error).__name__})")

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
                    f"{self.base_url}/models/{self.model_name}:generateContent",
                    headers=self._headers(),
                    json=self._payload(messages, temperature, max_tokens),
                )
                response.raise_for_status()
                data = response.json()
        except Exception as error:
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
                    f"{self.base_url}/models/{self.model_name}:generateContent",
                    headers=self._headers(),
                    json=self._payload(messages, temperature, max_tokens),
                )
                response.raise_for_status()
                data = response.json()
        except Exception as error:
            raise self._request_failed(error) from error

        return self._parse(data, started_at)
