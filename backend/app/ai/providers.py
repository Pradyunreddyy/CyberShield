"""
Pluggable AI provider layer.

`AI_PROVIDER` in the environment selects which provider class is used. Adding
a new provider (e.g. a future dedicated malware-scanning API) only requires
implementing `BaseAIProvider.complete_json` and registering it in
`get_provider()` - nothing else in the application needs to change.
"""
import json
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings


class AIProviderError(Exception):
    """Raised when the underlying AI provider cannot be reached or fails."""


class BaseAIProvider(ABC):
    name: str = "base"

    @abstractmethod
    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Sends a prompt and returns a parsed JSON object from the model's reply."""
        raise NotImplementedError


class AnthropicProvider(BaseAIProvider):
    name = "anthropic"
    API_URL = "https://api.anthropic.com/v1/messages"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not settings.AI_API_KEY:
            raise AIProviderError("AI_API_KEY is not configured on the server.")

        headers = {
            "x-api-key": settings.AI_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": settings.AI_MODEL,
            "max_tokens": 1500,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        try:
            response = httpx.post(
                self.API_URL, headers=headers, json=body, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Anthropic API request failed: {exc}") from exc

        data = response.json()
        text_blocks = [block["text"] for block in data.get("content", []) if block.get("type") == "text"]
        raw_text = "\n".join(text_blocks).strip()
        return _parse_json_response(raw_text)


class OpenAIProvider(BaseAIProvider):
    name = "openai"
    API_URL = "https://api.openai.com/v1/chat/completions"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not settings.AI_API_KEY:
            raise AIProviderError("AI_API_KEY is not configured on the server.")

        headers = {"Authorization": f"Bearer {settings.AI_API_KEY}", "content-type": "application/json"}
        body = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
        }
        try:
            response = httpx.post(
                self.API_URL, headers=headers, json=body, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderError(f"OpenAI API request failed: {exc}") from exc

        data = response.json()
        raw_text = data["choices"][0]["message"]["content"]
        return _parse_json_response(raw_text)


class DisabledProvider(BaseAIProvider):
    """Used when AI_PROVIDER=disabled - always raises so callers fall back gracefully."""

    name = "disabled"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        raise AIProviderError("The AI service is disabled on this deployment.")


def _parse_json_response(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIProviderError(f"AI provider returned a non-JSON response: {exc}") from exc


_PROVIDERS: dict[str, type[BaseAIProvider]] = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "disabled": DisabledProvider,
}


def get_provider() -> BaseAIProvider:
    provider_cls = _PROVIDERS.get(settings.AI_PROVIDER.lower(), DisabledProvider)
    return provider_cls()
