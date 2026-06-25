"""Free LLM provider client for Bloomy AI.

Supports OpenRouter, Groq, Gemini, Cerebras, NVIDIA NIM with streaming.
All providers use OpenAI-compatible chat completions API.
"""

from __future__ import annotations

import os
import json
import httpx
from typing import AsyncIterator, Optional


# Provider configurations
PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "default_model": "meta-llama/llama-3.3-70b-instruct:free",
        "models": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "meta-llama/llama-4-maverick:free",
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "deepseek/deepseek-chat:free",
            "mistralai/mistral-7b-instruct:free",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
        ],
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "default_model": "gemini-2.0-flash",
        "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"],
    },
    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "env_key": "CEREBRAS_API_KEY",
        "default_model": "llama-3.3-70b",
        "models": ["llama-3.3-70b", "llama-3.1-8b"],
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_NIM_API_KEY",
        "default_model": "meta/llama-3.3-70b-instruct",
        "models": ["meta/llama-3.3-70b-instruct", "meta/llama-3.1-8b-instruct"],
    },
}


class FreeLLMClient:
    """Client for calling free LLM providers with streaming support."""

    def __init__(self, provider: str = "openrouter", model: Optional[str] = None):
        """Initialize the LLM client.

        Args:
            provider: Provider name (openrouter, groq, gemini, cerebras, nvidia)
            model: Optional model override
        """
        if provider not in PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}. Available: {list(PROVIDERS.keys())}")
        
        self.provider = provider
        self.config = PROVIDERS[provider]
        self.model = model or self.config["default_model"]
        self.api_key = os.getenv(self.config["env_key"], "")
        
        if not self.api_key:
            raise ValueError(
                f"No API key for {provider}. "
                f"Set {self.config['env_key']} environment variable."
            )

    def _get_headers(self) -> dict[str, str]:
        """Get headers for the provider."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        # OpenRouter specific headers
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://bloomy.ai"
            headers["X-Title"] = "Bloomy AI"
        # Gemini uses x-goog-api-key instead of Bearer token
        elif self.provider == "gemini":
            headers["Authorization"] = ""
            headers["x-goog-api-key"] = self.api_key
        return headers

    def _build_request(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> dict:
        """Build the request body."""
        full_messages = []
        
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        
        full_messages.extend(messages)
        
        return {
            "model": self.model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

    async def stream_chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Stream a chat completion response.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Optional system prompt
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate

        Yields:
            Content chunks as they arrive
        """
        url = f"{self.config['base_url']}/chat/completions"
        body = self._build_request(messages, system_prompt, temperature, max_tokens)
        headers = self._get_headers()
        
        timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                url,
                json=body,
                headers=headers,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise Exception(
                        f"LLM API error ({response.status_code}): {error_text.decode()}"
                    )
                
                buffer = ""
                async for raw_line in response.aiter_lines():
                    buffer += raw_line
                    if "\n" not in buffer:
                        continue
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                return
                            try:
                                chunk = json.loads(data)
                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue

    async def complete(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Get a complete response (non-streaming)."""
        chunks = []
        async for chunk in self.stream_chat(
            messages, system_prompt, temperature, max_tokens
        ):
            chunks.append(chunk)
        return "".join(chunks)


def get_available_providers() -> dict[str, dict]:
    """Get list of available providers based on API keys."""
    available = {}
    for name, config in PROVIDERS.items():
        api_key = os.getenv(config["env_key"], "")
        if api_key:
            available[name] = {
                "name": name,
                "models": config["models"],
                "default_model": config["default_model"],
                "has_key": True,
            }
        else:
            available[name] = {
                "name": name,
                "models": config["models"],
                "default_model": config["default_model"],
                "has_key": False,
            }
    return available


def get_best_provider_for_agent(agent_type: str) -> tuple[str, str]:
    """Get the best provider and model for an agent type.

    Args:
        agent_type: Agent type (flash, core, pro, coder)

    Returns:
        Tuple of (provider_name, model_name)
    """
    # Check which providers have API keys - OpenRouter first (has free models)
    available = {
        name: config
        for name, config in PROVIDERS.items()
        if os.getenv(config["env_key"], "")
    }
    
    if not available:
        raise ValueError(
            "No LLM providers configured. Set at least one API key:\n"
            "- OPENROUTER_API_KEY (recommended - has free models)\n"
            "- GROQ_API_KEY (fast, free tier)\n"
            "- GEMINI_API_KEY (free with Google)\n"
            "- CEREBRAS_API_KEY (free inference)\n"
            "- NVIDIA_NIM_API_KEY (free credits)"
        )
    
    # Route based on agent type - prefer OpenRouter for free models
    if agent_type in ("flash", "mini"):
        # Flash: Use fastest/cheapest
        if "openrouter" in available:
            return "openrouter", "meta-llama/llama-4-maverick:free"
        elif "groq" in available:
            return "groq", "llama-3.1-8b-instant"
        elif "cerebras" in available:
            return "cerebras", "llama-3.1-8b"
        elif "gemini" in available:
            return "gemini", "gemini-2.0-flash-lite"
    
    elif agent_type in ("core", "standard"):
        # Core: Balanced
        if "openrouter" in available:
            return "openrouter", "meta-llama/llama-3.3-70b-instruct:free"
        elif "groq" in available:
            return "groq", "llama-3.3-70b-versatile"
        elif "gemini" in available:
            return "gemini", "gemini-2.0-flash"
        elif "cerebras" in available:
            return "cerebras", "llama-3.3-70b"
    
    elif agent_type in ("pro", "research", "writing", "business", "school", "design"):
        # Pro: Best reasoning
        if "openrouter" in available:
            return "openrouter", "qwen/qwen-2.5-72b-instruct:free"
        elif "gemini" in available:
            return "gemini", "gemini-2.0-flash"
        elif "groq" in available:
            return "groq", "llama-3.3-70b-versatile"
        elif "nvidia" in available:
            return "nvidia", "meta/llama-3.3-70b-instruct"
    
    elif agent_type in ("coder", "code", "minecraft", "automation"):
        # Coder: Best for code
        if "openrouter" in available:
            return "openrouter", "deepseek/deepseek-chat:free"
        elif "groq" in available:
            return "groq", "llama-3.3-70b-versatile"
        elif "nvidia" in available:
            return "nvidia", "meta/llama-3.3-70b-instruct"
        elif "gemini" in available:
            return "gemini", "gemini-2.0-flash"
    
    # Fallback: first available provider
    provider_name = next(iter(available))
    return provider_name, available[provider_name]["default_model"]


__all__ = [
    "FreeLLMClient",
    "PROVIDERS",
    "get_available_providers",
    "get_best_provider_for_agent",
]
