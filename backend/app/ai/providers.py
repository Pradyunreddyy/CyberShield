"""
Pluggable AI provider layer.

AI_PROVIDER selects which provider is used.
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
        """Sends a prompt and returns a parsed JSON object."""
        raise NotImplementedError


class GeminiProvider(BaseAIProvider):
    name = "gemini"
    API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not settings.AI_API_KEY:
            raise AIProviderError("AI_API_KEY is not configured on the server.")

        model = settings.AI_MODEL or "gemini-2.5-flash-lite"
        url = f"{self.API_URL}/{model}:generateContent"

        headers = {
            "x-goog-api-key": settings.AI_API_KEY,
            "content-type": "application/json",
        }

        body = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": 1500,
            },
        }

        try:
            response = httpx.post(
                url,
                headers=headers,
                json=body,
                timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Gemini API request failed: {exc}") from exc

        try:
            data = response.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(f"Gemini returned an unexpected response: {data}") from exc

        return _parse_json_response(raw_text)


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
                self.API_URL,
                headers=headers,
                json=body,
                timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Anthropic API request failed: {exc}") from exc

        try:
            data = response.json()
            text_blocks = [
                block["text"]
                for block in data.get("content", [])
                if block.get("type") == "text"
            ]
        except (ValueError, AttributeError, TypeError, KeyError) as exc:
            raise AIProviderError("Anthropic returned an invalid response.") from exc

        raw_text = "\n".join(text_blocks).strip()
        if not raw_text:
            raise AIProviderError("Anthropic returned empty content.")
        return _parse_json_response(raw_text)


class OpenAIProvider(BaseAIProvider):
    name = "openai"
    API_URL = "https://api.openai.com/v1/chat/completions"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not settings.AI_API_KEY:
            raise AIProviderError("AI_API_KEY is not configured on the server.")

        headers = {
            "Authorization": f"Bearer {settings.AI_API_KEY}",
            "content-type": "application/json",
        }
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
                self.API_URL,
                headers=headers,
                json=body,
                timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AIProviderError(f"OpenAI API request failed: {exc}") from exc

        try:
            data = response.json()
            raw_text = data["choices"][0]["message"].get("content", "")
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise AIProviderError("OpenAI returned an unexpected response.") from exc

        if not raw_text:
            raise AIProviderError("OpenAI returned empty content.")
        return _parse_json_response(raw_text)


class OpenRouterProvider(BaseAIProvider):
    name = "openrouter"
    API_URL = "https://openrouter.ai/api/v1/chat/completions"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not settings.AI_API_KEY:
            raise AIProviderError("AI_API_KEY is not configured on the server.")

        headers = {
            "Authorization": f"Bearer {settings.AI_API_KEY}",
            "Content-Type": "application/json",
        }

        # Do not force response_format here. OpenRouter's free model router can
        # select models with different structured-output capabilities. The
        # system prompt asks for JSON and _parse_json_response accepts both raw
        # JSON and fenced/embedded JSON, making the integration compatible with
        # a much wider range of OpenRouter models.
        body = {
            "model": settings.AI_MODEL or "openrouter/free",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 1500,
        }

        try:
            response = httpx.post(
                self.API_URL,
                headers=headers,
                json=body,
                timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            detail = ""
            try:
                detail = response.text
            except Exception:
                pass
            raise AIProviderError(f"OpenRouter API request failed: {exc}. {detail}") from exc

        try:
            data = response.json()
            raw_text = data["choices"][0]["message"].get("content", "")
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(f"OpenRouter returned an unexpected response: {data}") from exc

        if not raw_text:
            raise AIProviderError(f"OpenRouter returned empty content: {data}")
        return _parse_json_response(raw_text)


class DisabledProvider(BaseAIProvider):
    """Used when AI_PROVIDER=disabled."""

    name = "disabled"

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        raise AIProviderError("The AI service is disabled on this deployment.")


def _parse_json_response(raw_text: str) -> dict[str, Any]:
    """Parse JSON returned by strict and less-strict chat models."""
    cleaned = raw_text.strip()

    # Common markdown-fenced response: ```json ... ```
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            raise AIProviderError("AI provider returned JSON that was not an object.")
        return parsed
    except json.JSONDecodeError:
        # Some free models add a short sentence before/after the JSON object.
        # Extract the outermost object as a compatibility fallback.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
        raise AIProviderError("AI provider returned a non-JSON response.")


_PROVIDERS = {
    "gemini": GeminiProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "openrouter": OpenRouterProvider,
    "disabled": DisabledProvider,
}


def get_provider() -> BaseAIProvider:
    provider_cls = _PROVIDERS.get(settings.AI_PROVIDER.lower(), DisabledProvider)
    return provider_cls()
