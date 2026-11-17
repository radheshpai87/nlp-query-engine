import time
from typing import Any

import httpx

from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse

logger = setup_logging()


class OllamaProvider(BaseLLMProvider):
    """Local model inference provider via Ollama HTTP API."""

    def __init__(
        self,
        model_name: str = "llama3:8b",
        base_url: str = "http://localhost:11434",
    ) -> None:
        super().__init__(model_name)
        self.base_url = base_url.rstrip("/")

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        start = time.perf_counter()
        payload = {
            "model": self.model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        try:
            with httpx.Client(base_url=self.base_url, timeout=60.0) as client:
                res = client.post("/api/chat", json=payload)
                res.raise_for_status()
                data = res.json()

            duration = (time.perf_counter() - start) * 1000
            content = data.get("message", {}).get("content", "")
            prompt_tokens = data.get("prompt_eval_count", 0)
            completion_tokens = data.get("eval_count", 0)

            return LLMResponse(
                content=content,
                model=self.model_name,
                usage={
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                },
                latency_ms=round(duration, 2),
            )
        except Exception as e:
            logger.error("Ollama generation failed: %s", e)
            raise AppError(f"Ollama inference error: {e}") from e

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        start = time.perf_counter()
        payload = {
            "model": self.model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=60.0) as client:
                res = await client.post("/api/chat", json=payload)
                res.raise_for_status()
                data = res.json()

            duration = (time.perf_counter() - start) * 1000
            content = data.get("message", {}).get("content", "")
            prompt_tokens = data.get("prompt_eval_count", 0)
            completion_tokens = data.get("eval_count", 0)

            return LLMResponse(
                content=content,
                model=self.model_name,
                usage={
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                },
                latency_ms=round(duration, 2),
            )
        except Exception as e:
            logger.error("Ollama async generation failed: %s", e)
            raise AppError(f"Ollama inference error: {e}") from e
