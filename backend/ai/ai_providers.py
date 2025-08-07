"""
AI Providers Manager - Поддержка множественных AI провайдеров
Поддерживает OpenAI, YandexGPT, GigaChat, Claude с автоматическим fallback
"""

import os
import json
import httpx
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    OPENAI = "openai"
    YANDEX = "yandex"  
    GIGACHAT = "gigachat"
    CLAUDE = "claude"
    LOCAL_LLM = "local"

class AIProvidersManager:
    def __init__(self):
        self.providers = {}
        self.proxy_config = None
        self.initialize_providers()
    
    def initialize_providers(self):
        """Инициализация только OpenAI провайдера через прокси"""
        
        # 🌐 Настройка прокси для OpenAI
        proxy_url = os.getenv('AI_PROXY_URL')  # http://username:password@proxy:port
        if proxy_url:
            self.proxy_config = {
                "http://": proxy_url,
                "https://": proxy_url
            }
            logger.info(f"🌐 Настроен прокси для OpenAI: {proxy_url}")
        else:
            logger.warning("⚠️ AI_PROXY_URL не настроен, OpenAI может не работать из РФ")
        
        # OpenAI (обязательно через прокси из РФ)
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            self.providers[AIProvider.OPENAI] = OpenAIProvider(openai_key, self.proxy_config)
            logger.info("✅ OpenAI провайдер инициализирован")
        else:
            logger.error("❌ OPENAI_API_KEY не настроен!")
        
        # YandexGPT (отключен пользователем)
        # yandex_key = os.getenv('YANDEX_API_KEY')
        # yandex_folder = os.getenv('YANDEX_FOLDER_ID')
        # if yandex_key and yandex_folder:
        #     self.providers[AIProvider.YANDEX] = YandexProvider(yandex_key, yandex_folder)
        #     logger.info("✅ YandexGPT провайдер инициализирован")
        
        # GigaChat (отключен пользователем)
        # gigachat_client_id = os.getenv('GIGACHAT_CLIENT_ID')
        # gigachat_secret = os.getenv('GIGACHAT_CLIENT_SECRET')
        # if gigachat_client_id and gigachat_secret:
        #     self.providers[AIProvider.GIGACHAT] = GigaChatProvider(gigachat_client_id, gigachat_secret)
        #     logger.info("✅ GigaChat провайдер инициализирован")
        
        # Claude (опционально, тоже через прокси)
        claude_key = os.getenv('CLAUDE_API_KEY')
        if claude_key:
            self.providers[AIProvider.CLAUDE] = ClaudeProvider(claude_key, self.proxy_config)
            logger.info("✅ Claude провайдер инициализирован как fallback")
        
        # Локальная модель (если настроена)
        local_url = os.getenv('LOCAL_LLM_URL')
        if local_url:
            self.providers[AIProvider.LOCAL_LLM] = LocalLLMProvider(local_url)
            logger.info("✅ Локальная LLM инициализирована как fallback")
    
    async def get_completion(self, messages: List[Dict], model: str = None, **kwargs) -> Dict:
        """
        Получение ответа с автоматическим fallback между провайдерами
        Приоритет: OpenAI (через прокси) -> Claude -> Local
        """
        
        # Определяем приоритет провайдеров (OpenAI первым)
        priority_order = [
            AIProvider.OPENAI,    # Приоритет 1: OpenAI (через прокси)
            AIProvider.CLAUDE,    # Приоритет 2: Claude (через прокси, fallback)
            AIProvider.LOCAL_LLM  # Приоритет 3: Локальная модель (fallback)
        ]
        
        last_error = None
        
        for provider_type in priority_order:
            if provider_type not in self.providers:
                continue
                
            provider = self.providers[provider_type]
            
            try:
                logger.info(f"🔄 Попытка использовать {provider_type.value}")
                
                # Адаптируем модель под провайдера  
                adapted_model = self._adapt_model_for_provider(model, provider_type)
                
                result = await provider.get_completion(
                    messages=messages,
                    model=adapted_model,
                    **kwargs
                )
                
                logger.info(f"✅ Успешный ответ от {provider_type.value}")
                result['provider_used'] = provider_type.value
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Ошибка {provider_type.value}: {str(e)}")
                continue
        
        # Если все провайдеры недоступны
        raise Exception(f"Все AI провайдеры недоступны. Последняя ошибка: {last_error}")
    
    def _adapt_model_for_provider(self, model: str, provider_type: AIProvider) -> str:
        """Адаптация названия модели под конкретного провайдера"""
        
        # Маппинг моделей
        model_mapping = {
            AIProvider.YANDEX: {
                'gpt-4o': 'yandexgpt-lite',
                'gpt-4o-mini': 'yandexgpt'
            },
            AIProvider.GIGACHAT: {
                'gpt-4o': 'GigaChat-Pro',
                'gpt-4o-mini': 'GigaChat'
            },
            AIProvider.CLAUDE: {
                'gpt-4o': 'claude-3-opus-20240229',
                'gpt-4o-mini': 'claude-3-haiku-20240307'
            }
        }
        
        if provider_type in model_mapping and model in model_mapping[provider_type]:
            return model_mapping[provider_type][model]
        
        return model or 'default'


class BaseAIProvider:
    """Базовый класс для всех AI провайдеров"""
    
    def __init__(self, name: str):
        self.name = name
    
    async def get_completion(self, messages: List[Dict], model: str = None, **kwargs) -> Dict:
        raise NotImplementedError


class OpenAIProvider(BaseAIProvider):
    """OpenAI провайдер с поддержкой прокси"""
    
    def __init__(self, api_key: str, proxy_config: Optional[Dict] = None):
        super().__init__("OpenAI")
        self.api_key = api_key
        self.proxy_config = proxy_config
        self.base_url = "https://api.openai.com/v1"
    
    async def get_completion(self, messages: List[Dict], model: str = "gpt-4o-mini", **kwargs) -> Dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 1000)
        }
        
        # Настройка клиента с прокси
        client_kwargs = {}
        if self.proxy_config:
            client_kwargs['proxies'] = self.proxy_config
            client_kwargs['timeout'] = 60.0
        
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["choices"][0]["message"]["content"],
                "usage": data.get("usage", {}),
                "model": data.get("model", model)
            }


class YandexProvider(BaseAIProvider):
    """YandexGPT провайдер (работает из РФ без прокси)"""
    
    def __init__(self, api_key: str, folder_id: str):
        super().__init__("YandexGPT")
        self.api_key = api_key
        self.folder_id = folder_id
        self.base_url = "https://llm.api.cloud.yandex.net/foundationModels/v1"
    
    async def get_completion(self, messages: List[Dict], model: str = "yandexgpt", **kwargs) -> Dict:
        headers = {
            "Authorization": f"Api-Key {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Конвертируем сообщения в формат Yandex
        yandex_messages = []
        for msg in messages:
            role = msg["role"]
            if role == "system":
                role = "system"
            elif role == "assistant":
                role = "assistant"
            else:
                role = "user"
            
            yandex_messages.append({
                "role": role,
                "text": msg["content"]
            })
        
        payload = {
            "modelUri": f"gpt://{self.folder_id}/{model}",
            "completionOptions": {
                "stream": False,
                "temperature": kwargs.get('temperature', 0.7),
                "maxTokens": kwargs.get('max_tokens', 1000)
            },
            "messages": yandex_messages
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/completion",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["result"]["alternatives"][0]["message"]["text"],
                "usage": data["result"].get("usage", {}),
                "model": model
            }


class GigaChatProvider(BaseAIProvider):
    """GigaChat провайдер (работает из РФ без прокси)"""
    
    def __init__(self, client_id: str, client_secret: str):
        super().__init__("GigaChat")
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expires_at = None
        self.base_url = "https://gigachat.devices.sberbank.ru/api/v1"
    
    async def _get_access_token(self):
        """Получение access token для GigaChat"""
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            return self.access_token
        
        import base64
        
        credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "RqUID": str(datetime.now().timestamp()),
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {"scope": "GIGACHAT_API_PERS"}
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:  # GigaChat требует verify=False
            response = await client.post(
                "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
                headers=headers,
                data=data
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data["access_token"]
            # Токен действует 30 минут
            self.token_expires_at = datetime.now() + timedelta(minutes=25)
            
            return self.access_token
    
    async def get_completion(self, messages: List[Dict], model: str = "GigaChat", **kwargs) -> Dict:
        access_token = await self._get_access_token()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 1000)
        }
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["choices"][0]["message"]["content"],
                "usage": data.get("usage", {}),
                "model": data.get("model", model)
            }


class ClaudeProvider(BaseAIProvider):
    """Claude провайдер (через прокси)"""
    
    def __init__(self, api_key: str, proxy_config: Optional[Dict] = None):
        super().__init__("Claude")
        self.api_key = api_key
        self.proxy_config = proxy_config
        self.base_url = "https://api.anthropic.com/v1"
    
    async def get_completion(self, messages: List[Dict], model: str = "claude-3-haiku-20240307", **kwargs) -> Dict:
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Claude требует отдельный system prompt
        system_prompt = ""
        claude_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_prompt += msg["content"] + "\n"
            else:
                claude_messages.append(msg)
        
        payload = {
            "model": model,
            "max_tokens": kwargs.get('max_tokens', 1000),
            "messages": claude_messages
        }
        
        if system_prompt:
            payload["system"] = system_prompt.strip()
        
        client_kwargs = {}
        if self.proxy_config:
            client_kwargs['proxies'] = self.proxy_config
            client_kwargs['timeout'] = 60.0
        
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["content"][0]["text"],
                "usage": data.get("usage", {}),
                "model": data.get("model", model)
            }


class LocalLLMProvider(BaseAIProvider):
    """Локальная LLM (Ollama, vLLM и т.д.)"""
    
    def __init__(self, base_url: str):
        super().__init__("LocalLLM")
        self.base_url = base_url.rstrip('/')
    
    async def get_completion(self, messages: List[Dict], model: str = "llama2", **kwargs) -> Dict:
        headers = {"Content-Type": "application/json"}
        
        # Поддержка разных форматов локальных API
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": kwargs.get('temperature', 0.7),
                "num_predict": kwargs.get('max_tokens', 1000)
            }
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["message"]["content"],
                "usage": {},
                "model": model
            }


# Глобальный экземпляр менеджера
ai_providers_manager = AIProvidersManager()


async def get_ai_completion(messages: List[Dict], model: str = None, **kwargs) -> Dict:
    """
    Основная функция для получения ответа от AI
    Автоматически выбирает лучший доступный провайдер
    """
    return await ai_providers_manager.get_completion(messages, model, **kwargs)


def get_available_providers() -> List[str]:
    """Получить список доступных провайдеров"""
    return [provider.value for provider in ai_providers_manager.providers.keys()]


def get_provider_status() -> Dict:
    """Получить статус всех провайдеров"""
    status = {}
    for provider_type, provider in ai_providers_manager.providers.items():
        status[provider_type.value] = {
            "available": True,
            "name": provider.name
        }
    return status