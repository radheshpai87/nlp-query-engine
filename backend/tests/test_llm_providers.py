import httpx
import pytest

from app.core.config import Settings
from app.core.exceptions import AppError
from app.nlp.providers.base import BaseLLMProvider, LLMMessage, LLMResponse
from app.nlp.providers.chain import FallbackLLMProvider
from app.nlp.providers.factory import build_cloud_providers, get_llm_provider
from app.nlp.providers.gemini_provider import GeminiProvider
from app.nlp.providers.mock_provider import MockLLMProvider
from app.nlp.providers.openai_compatible import OpenAICompatibleProvider

MESSAGES = [LLMMessage(role="user", content="show me revenue")]
SECRET = "super-secret-api-key-value"


def settings_with(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "LLM_PROVIDER": "auto",
        "GROQ_API_KEY": "",
        "MISTRAL_API_KEY": "",
        "GEMINI_API_KEY": "",
        "LLM_TIMEOUT_SECONDS": 5.0,
    }
    base.update(overrides)
    return Settings(_env_file=None, **base)


class StubProvider(BaseLLMProvider):
    def __init__(self, name: str, fail: bool = False) -> None:
        super().__init__(name)
        self.provider_name = name
        self.fail = fail
        self.calls = 0

    def generate(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: object,
    ) -> LLMResponse:
        self.calls += 1
        if self.fail:
            raise AppError(f"{self.provider_name} unavailable")
        return LLMResponse(content=f"from {self.provider_name}", model=self.provider_name)

    async def generate_async(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs: object,
    ) -> LLMResponse:
        return self.generate(messages, temperature, max_tokens, **kwargs)


def test_fallback_chain_skips_failed_provider() -> None:
    primary = StubProvider("groq", fail=True)
    backup = StubProvider("mistral")
    chain = FallbackLLMProvider([primary, backup])

    response = chain.generate(MESSAGES)

    assert response.content == "from mistral"
    assert primary.calls == 1
    assert backup.calls == 1
    assert chain.provider_names == ["groq", "mistral"]


@pytest.mark.asyncio
async def test_fallback_chain_async_skips_failed_provider() -> None:
    primary = StubProvider("groq", fail=True)
    backup = StubProvider("gemini")
    chain = FallbackLLMProvider([primary, backup])

    response = await chain.generate_async(MESSAGES)

    assert response.content == "from gemini"


def test_fallback_chain_reports_all_failures_without_keys() -> None:
    chain = FallbackLLMProvider([StubProvider("groq", fail=True), StubProvider("gemini", fail=True)])

    with pytest.raises(AppError) as error:
        chain.generate(MESSAGES)

    message = str(error.value)
    assert "All configured LLM providers failed" in message
    assert "groq" in message
    assert "gemini" in message
    assert SECRET not in message


def test_empty_fallback_chain_has_actionable_error() -> None:
    with pytest.raises(AppError) as error:
        FallbackLLMProvider([]).generate(MESSAGES)

    assert "No LLM provider is configured" in str(error.value)


def test_factory_builds_groq_mistral_gemini_in_order() -> None:
    settings = settings_with(
        GROQ_API_KEY="groq-key",
        MISTRAL_API_KEY="mistral-key",
        GEMINI_API_KEY="gemini-key",
    )

    providers = build_cloud_providers(settings)
    assert [getattr(p, "provider_name", "") for p in providers] == [
        "groq",
        "mistral",
        "gemini",
    ]

    provider = get_llm_provider(settings)
    assert isinstance(provider, FallbackLLMProvider)
    assert len(provider.providers) == 3


def test_factory_uses_single_provider_when_only_one_key_exists() -> None:
    settings = settings_with(GROQ_API_KEY="groq-key")
    provider = get_llm_provider(settings)

    assert isinstance(provider, OpenAICompatibleProvider)
    assert provider.model_name == "qwen/qwen3.8-27b"
    assert provider.base_url == "https://api.groq.com/openai/v1"


def test_factory_selects_gemini_when_only_gemini_key_exists() -> None:
    provider = get_llm_provider(settings_with(GEMINI_API_KEY="gemini-key"))
    assert isinstance(provider, GeminiProvider)


def test_factory_degrades_to_mock_without_keys() -> None:
    provider = get_llm_provider(settings_with(LLM_PROVIDER="auto"))
    assert isinstance(provider, MockLLMProvider)


def test_factory_honours_explicit_mock_mode() -> None:
    provider = get_llm_provider(settings_with(LLM_PROVIDER="mock", GROQ_API_KEY="groq-key"))
    assert isinstance(provider, MockLLMProvider)


class FakeResponse:
    def __init__(self, payload: dict[str, object], status: int = 200) -> None:
        self.payload = payload
        self.status_code = status

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://provider.example/v1/chat/completions")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("failed", request=request, response=response)

    def json(self) -> dict[str, object]:
        return self.payload


class FakeClient:
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.payload: dict[str, object] = {
            "model": "qwen/qwen3.8-27b",
            "choices": [{"message": {"content": '{"ok": true}'}}],
            "usage": {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7},
        }
        self.status = 200
        self.calls: list[dict[str, object]] = []

    def __enter__(self) -> "FakeClient":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def post(
        self,
        url: str,
        headers: dict[str, str] | None = None,
        json: dict[str, object] | None = None,
    ) -> FakeResponse:
        self.calls.append({"url": url, "headers": headers, "json": json})
        return FakeResponse(self.payload, self.status)


def test_openai_compatible_request_and_response(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeClient()
    monkeypatch.setattr(httpx, "Client", lambda **kwargs: client)

    provider = OpenAICompatibleProvider(
        model_name="qwen/qwen3.8-27b",
        api_key=SECRET,
        base_url="https://api.groq.com/openai/v1",
        provider_name="groq",
    )
    response = provider.generate(MESSAGES, temperature=0.0, max_tokens=120)

    assert response.content == '{"ok": true}'
    assert response.usage["total_tokens"] == 7
    assert client.calls[0]["url"] == "https://api.groq.com/openai/v1/chat/completions"
    headers = client.calls[0]["headers"]
    assert isinstance(headers, dict)
    assert headers["Authorization"] == f"Bearer {SECRET}"
    payload = client.calls[0]["json"]
    assert isinstance(payload, dict)
    assert payload["model"] == "qwen/qwen3.8-27b"


def test_provider_error_does_not_leak_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeClient()
    client.status = 401
    monkeypatch.setattr(httpx, "Client", lambda **kwargs: client)

    provider = OpenAICompatibleProvider(
        model_name="qwen/qwen3.8-27b",
        api_key=SECRET,
        base_url="https://api.groq.com/openai/v1",
        provider_name="groq",
    )

    with pytest.raises(AppError) as error:
        provider.generate(MESSAGES)

    assert "HTTP 401" in str(error.value)
    assert SECRET not in str(error.value)


def test_gemini_request_uses_header_key(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeClient()
    client.payload = {
        "candidates": [{"content": {"parts": [{"text": "gemini ok"}]}}],
        "usageMetadata": {
            "promptTokenCount": 2,
            "candidatesTokenCount": 3,
            "totalTokenCount": 5,
        },
    }
    monkeypatch.setattr(httpx, "Client", lambda **kwargs: client)

    provider = GeminiProvider(
        model_name="gemini-2.5-flash",
        api_key=SECRET,
        base_url="https://generativelanguage.googleapis.com/v1beta",
    )
    response = provider.generate(MESSAGES)

    assert response.content == "gemini ok"
    assert response.usage["total_tokens"] == 5
    assert client.calls[0]["url"].endswith(
        "/models/gemini-2.5-flash:generateContent"
    )
    headers = client.calls[0]["headers"]
    assert isinstance(headers, dict)
    assert headers["x-goog-api-key"] == SECRET
