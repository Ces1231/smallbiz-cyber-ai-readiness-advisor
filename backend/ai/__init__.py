"""
SmallBiz Advisor — AI Provider Package
Provides a unified interface to multiple AI backends.
"""
from backend.ai.base import AIProvider
from backend.ai.factory import get_ai_provider

__all__ = ["AIProvider", "get_ai_provider"]
