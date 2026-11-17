from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    role: str  # system, user, assistant
    content: str


class LLMResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int] = Field(default_factory=dict)
    latency_ms: float = 0.0

    @property
    def tokens_used(self) -> int:
        return self.usage.get("total_tokens", 0)


class BaseLLMProvider(ABC):
    """Abstract contract for model inference providers."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name

    def is_healthy(self) -> bool:
        """Health check for provider availability."""
        return True

    @abstractmethod
    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        """Synchronously generate text completion from chat messages."""
        pass

    @abstractmethod
    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: Any,
    ) -> LLMResponse:
        """Asynchronously generate text completion from chat messages."""
        pass
