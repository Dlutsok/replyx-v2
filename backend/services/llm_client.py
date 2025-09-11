"""
LLM клиент с защитой от трат токенов в тестах
Предоставляет единый интерфейс для различных LLM провайдеров с автоматическим переключением на фейк в тестах
"""

import os
import logging
from typing import Dict, Any, List, Optional, Union
from abc import ABC, abstractmethod

from .ws_config import (
    LLM_PROVIDER, 
    FAKE_LLM_MODE, 
    IS_TEST_ENV, 
    BLOCK_EXTERNAL_IO, 
    ENVIRONMENT
)

logger = logging.getLogger(__name__)


class BaseLLM(ABC):
    """Базовый интерфейс для всех LLM провайдеров"""
    
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """
        Отправляет сообщения в LLM и получает ответ
        
        Args:
            messages: Список сообщений [{"role": "user", "content": "text"}]
            **kwargs: Дополнительные параметры (dialog_id, temperature, etc.)
            
        Returns:
            {"role": "assistant", "content": "response", "metadata": {...}}
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Имя провайдера для логирования"""
        pass


class FakeLLM(BaseLLM):
    """
    Фейковый LLM для тестов - НЕ ТРАТИТ ТОКЕНЫ
    Поддерживает различные режимы: echo, stub, script
    """
    
    def __init__(self, mode: str = None):
        self.mode = mode or FAKE_LLM_MODE
        logger.info(f"🔒 LLM provider: FAKE/{self.mode} (tokens will NOT be spent)")
    
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Генерирует фейковый ответ без обращения к внешним API"""
        
        if self.mode == "echo":
            # Эхо-режим: возвращает последнее сообщение пользователя с префиксом
            last_message = messages[-1]["content"] if messages else "empty"
            response = f"[FAKE/echo] {last_message}"
            
        elif self.mode == "stub":
            # Заглушка: возвращает стандартный ответ
            response = "[FAKE/stub] Привет! Это тестовый ответ ассистента."
            
        elif self.mode == "script":
            # Скриптовый режим: можно расширить для воспроизведения записанных ответов
            dialog_id = kwargs.get("dialog_id")
            response = f"[FAKE/script] Скриптовый ответ для диалога {dialog_id}"
            
        else:
            response = f"[FAKE/{self.mode}] Unknown fake mode, defaulting to stub"
            
        return {
            "role": "assistant", 
            "content": response,
            "metadata": {
                "provider": "fake",
                "mode": self.mode,
                "tokens_used": 0,
                "cost": 0.0,
                "is_fake": True
            }
        }
    
    @property
    def provider_name(self) -> str:
        return f"FAKE/{self.mode}"


class OpenAILLM(BaseLLM):
    """Реальный OpenAI провайдер - ТРАТИТ ТОКЕНЫ В PRODUCTION"""
    
    def __init__(self, api_key: str):
        # Защита от случайного использования в тестах
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError(
                f"🚫 External IO blocked in environment: {ENVIRONMENT}. "
                "OpenAI calls are prohibited in test/CI environments to prevent token spending."
            )
            
        if not api_key:
            raise ValueError("OpenAI API key is required")
            
        self.api_key = api_key
        logger.info("💰 LLM provider: OpenAI (REAL tokens will be spent)")
    
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Реальный вызов OpenAI API"""
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError("External IO is blocked - OpenAI calls prohibited")
            
        # TODO: Implement real OpenAI API call
        # Пока заглушка для демонстрации
        logger.warning("⚠️ OpenAI implementation not yet complete - using stub")
        return {
            "role": "assistant",
            "content": "[OpenAI-stub] Real implementation needed",
            "metadata": {
                "provider": "openai",
                "tokens_used": 0,
                "cost": 0.0,
                "is_fake": False
            }
        }
    
    @property
    def provider_name(self) -> str:
        return "OpenAI"


class AnthropicLLM(BaseLLM):
    """Реальный Anthropic провайдер - ТРАТИТ ТОКЕНЫ В PRODUCTION"""
    
    def __init__(self, api_key: str):
        # Защита от случайного использования в тестах
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError(
                f"🚫 External IO blocked in environment: {ENVIRONMENT}. "
                "Anthropic calls are prohibited in test/CI environments to prevent token spending."
            )
            
        if not api_key:
            raise ValueError("Anthropic API key is required")
            
        self.api_key = api_key
        logger.info("💰 LLM provider: Anthropic (REAL tokens will be spent)")
    
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Реальный вызов Anthropic API"""
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError("External IO is blocked - Anthropic calls prohibited")
            
        # TODO: Implement real Anthropic API call
        logger.warning("⚠️ Anthropic implementation not yet complete - using stub")
        return {
            "role": "assistant", 
            "content": "[Anthropic-stub] Real implementation needed",
            "metadata": {
                "provider": "anthropic",
                "tokens_used": 0,
                "cost": 0.0,
                "is_fake": False
            }
        }
    
    @property
    def provider_name(self) -> str:
        return "Anthropic"


def get_llm(dry_run: bool = False, provider_override: str = None) -> BaseLLM:
    """
    Фабрика LLM клиентов с автоматической защитой от трат токенов
    
    Args:
        dry_run: Принудительно использовать FakeLLM даже в продукшене
        provider_override: Переопределение провайдера (для тестов)
        
    Returns:
        BaseLLM: Клиент LLM (реальный или фейк)
        
    Raises:
        RuntimeError: Если внешние вызовы заблокированы но пытаемся использовать реальный провайдер
    """
    
    # Определяем провайдера
    provider = provider_override or LLM_PROVIDER
    
    # Автоматическое переключение на fake в тестах или при dry_run
    if IS_TEST_ENV or BLOCK_EXTERNAL_IO or dry_run or provider == "fake":
        return FakeLLM()
    
    # Производственные провайдеры
    try:
        if provider == "openai":
            # Используем AI Token Pool вместо env переменной
            logger.info("OpenAI LLM будет использовать токены из AI Token Pool")
            return OpenAILLM(api_key="from_token_pool")
            
        elif provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY not found, falling back to FakeLLM")
                return FakeLLM()
            return AnthropicLLM(api_key)
            
        else:
            logger.warning(f"Unknown LLM provider: {provider}, falling back to FakeLLM")
            return FakeLLM()
            
    except Exception as e:
        logger.error(f"Failed to initialize {provider} LLM: {e}, falling back to FakeLLM")
        return FakeLLM()


def check_dry_run_request(headers: Dict[str, str] = None, query_params: Dict[str, str] = None) -> bool:
    """
    Проверяет, требует ли запрос dry-run режим
    
    Args:
        headers: HTTP заголовки
        query_params: GET параметры
        
    Returns:
        bool: True если нужен dry-run
    """
    headers = headers or {}
    query_params = query_params or {}
    
    # Проверяем заголовок X-Dry-Run (case-insensitive)
    dry_run_header = next(
        (v.lower() in ("1", "true", "yes") for k, v in headers.items() 
         if k.lower() == "x-dry-run"), 
        False
    )
    
    # Проверяем query параметр
    dry_run_query = query_params.get("dry_run", "").lower() in ("1", "true", "yes")
    
    return dry_run_header or dry_run_query


# Удобные алиасы для быстрого использования
async def generate_ai_response(
    messages: List[Dict[str, str]], 
    dialog_id: int = None, 
    dry_run: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Удобная функция для генерации AI ответа
    Автоматически выбирает подходящий провайдер с защитой от трат токенов
    """
    llm = get_llm(dry_run=dry_run)
    
    response = await llm.chat(
        messages=messages,
        dialog_id=dialog_id,
        **kwargs
    )
    
    # Добавляем метаданные для мониторинга
    response["metadata"]["dialog_id"] = dialog_id
    response["metadata"]["provider_used"] = llm.provider_name
    
    return response


# Экспорт основных классов и функций
__all__ = [
    "BaseLLM",
    "FakeLLM", 
    "OpenAILLM",
    "AnthropicLLM",
    "get_llm",
    "generate_ai_response",
    "check_dry_run_request"
]