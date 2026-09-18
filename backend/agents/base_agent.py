from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod

from config import settings
from services.groq_service import GroqService


class Agent(ABC):
    name: str

    def __init__(self) -> None:
        self._groq: GroqService | None = None

    @property
    def groq(self) -> GroqService | None:
        if self._groq is None:
            self._groq = GroqService()
        return self._groq if settings.groq_api_key else None

    async def _chat(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "qwen/qwen3.8-27b",
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str | None:
        client = self.groq
        if client is None:
            return None
        try:
            result = await client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return result
        except Exception as e:
            print(f"[{self.name}] Groq API error: {e}")
            return None

    def _chat_sync(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "qwen/qwen3.8-27b",
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str | None:
        try:
            return asyncio.run(
                self._chat(system_prompt, user_prompt, model, temperature, max_tokens)
            )
        except Exception as e:
            print(f"[{self.name}] Sync chat error: {e}")
            return None

    @abstractmethod
    def analyze(self, profile: dict, months: list) -> dict:
        ...
