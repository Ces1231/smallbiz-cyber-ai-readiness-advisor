"""
AI Provider Abstract Base Class.
All AI backend adapters implement this interface.
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class AIProvider(ABC):
    """
    Unified interface for AI completion providers.
    Implementations must handle all exceptions internally — callers
    are never expected to catch exceptions from stream_completion().
    """

    @abstractmethod
    async def stream_completion(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Streams text chunks from the AI provider.

        Each yielded string is a raw text delta (not JSON-wrapped).
        Never raises — catches all exceptions and yields error text
        as the final chunk if the provider fails.

        Args:
            system_prompt: Role/context instructions for the AI.
            user_message: The user-facing input or question.
            max_tokens: Maximum tokens to generate.
            temperature: Sampling temperature (0.0–1.0).

        Yields:
            str: Raw text deltas as they arrive from the provider.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Returns True if the provider API is reachable and configured.
        Should make a minimal API call to verify connectivity.
        Never raises — returns False on any error.
        """
        ...
