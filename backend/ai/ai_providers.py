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

class CircuitBreakerState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Простой circuit breaker per-provider."""

    def __init__(
        self,
        failure_threshold: int = 3,
        reset_timeout_seconds: int = 60,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.reset_timeout_seconds = reset_timeout_seconds
        self.state: CircuitBreakerState = CircuitBreakerState.CLOSED
        self.failure_count: int = 0
        self.opened_at: Optional[datetime] = None

    def allow_request(self) -> bool:
        if self.state == CircuitBreakerState.CLOSED:
            return True
        if self.state == CircuitBreakerState.OPEN:
            if self.opened_at and (datetime.now() - self.opened_at).total_seconds() >= self.reset_timeout_seconds:
                # Переходим в полууоткрытое состояние — разрешаем одну пробу
                self.state = CircuitBreakerState.HALF_OPEN
                return True
            return False
        if self.state == CircuitBreakerState.HALF_OPEN:
            # Разрешаем одну попытку
            return True
        return True

    def on_success(self) -> None:
        # Любой успешный ответ закрывает breaker
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.opened_at = None

    def on_failure(self) -> None:
        self.failure_count += 1
        if self.state == CircuitBreakerState.HALF_OPEN or self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            self.opened_at = datetime.now()

class AIProvider(Enum):
    OPENAI = "openai"
    YANDEX = "yandex"  
    GIGACHAT = "gigachat"
    CLAUDE = "claude"
    LOCAL_LLM = "local"

class AIProvidersManager:
    def __init__(self):
        self.providers = {}
        self.breakers: Dict[AIProvider, CircuitBreaker] = {}
        self.initialize_providers()
    
    def initialize_providers(self):
        """Инициализация доступных AI провайдеров (опционально через HTTP-прокси)"""
        
        # OpenAI через зарубежный прокси (для обхода блокировок РФ)
        openai_key = os.getenv('OPENAI_API_KEY')
        openai_proxy_url = os.getenv('OPENAI_PROXY_URL')  # Только из переменных окружения
        if openai_key:
            self.providers[AIProvider.OPENAI] = OpenAIProvider(openai_key, proxy_url=openai_proxy_url)
            if openai_proxy_url:
                masked_proxy = openai_proxy_url.split('@')[1] if '@' in openai_proxy_url else openai_proxy_url
                logger.info(f"✅ OpenAI провайдер инициализирован с прокси: {masked_proxy}")
            else:
                logger.info("✅ OpenAI провайдер инициализирован (без прокси)")
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
        
        # Claude (опционально)
        claude_key = os.getenv('CLAUDE_API_KEY')
        if claude_key:
            self.providers[AIProvider.CLAUDE] = ClaudeProvider(claude_key)
            logger.info("✅ Claude провайдер инициализирован как fallback")
        
        # Локальная модель (если настроена)
        local_url = os.getenv('LOCAL_LLM_URL')
        if local_url:
            self.providers[AIProvider.LOCAL_LLM] = LocalLLMProvider(local_url)
            logger.info("✅ Локальная LLM инициализирована как fallback")

        # Инициализируем circuit breakers
        failure_threshold = int(os.getenv('AI_CB_FAILURE_THRESHOLD', '3'))
        reset_timeout_seconds = int(os.getenv('AI_CB_RESET_TIMEOUT', '60'))
        for provider_type in self.providers.keys():
            self.breakers[provider_type] = CircuitBreaker(
                failure_threshold=failure_threshold,
                reset_timeout_seconds=reset_timeout_seconds,
            )
    
    async def get_completion(self, messages: List[Dict], model: str = None, **kwargs) -> Dict:
        """
        Получение ответа с автоматическим fallback между провайдерами
        Приоритет: OpenAI -> Claude -> Local
        """
        
        # Определяем приоритет провайдеров (OpenAI первым)
        priority_order = [
            AIProvider.OPENAI,    # Приоритет 1: OpenAI
            AIProvider.CLAUDE,    # Приоритет 2: Claude (fallback)
            AIProvider.LOCAL_LLM  # Приоритет 3: Локальная модель (fallback)
        ]
        
        last_error = None
        
        for provider_type in priority_order:
            if provider_type not in self.providers:
                continue
                
            provider = self.providers[provider_type]
            breaker = self.breakers.get(provider_type)

            # Circuit breaker
            if breaker and not breaker.allow_request():
                logger.warning(f"⛔ Circuit open для {provider_type.value}, пропускаем провайдера")
                continue
            
            try:
                logger.info(f"🔄 Попытка использовать {provider_type.value}")
                
                # Адаптируем модель под провайдера  
                adapted_model = self._adapt_model_for_provider(model, provider_type)
                
                # Ретраи с экспоненциальным бэкоффом и джиттером
                max_retries = int(os.getenv('AI_RETRY_MAX_ATTEMPTS', '3'))
                base_delay = float(os.getenv('AI_RETRY_BASE_DELAY', '0.5'))
                import random
                for attempt in range(max_retries):
                    try:
                        result = await provider.get_completion(
                            messages=messages,
                            model=adapted_model,
                            **kwargs
                        )
                        if breaker:
                            breaker.on_success()
                        logger.info(f"✅ Успешный ответ от {provider_type.value} (попытка {attempt+1}/{max_retries})")
                        result['provider_used'] = provider_type.value
                        return result
                    except Exception as e:
                        last_error = e
                        if breaker:
                            breaker.on_failure()
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt) + random.uniform(0, 0.2)
                            logger.warning(f"⚠️ Ошибка {provider_type.value} на попытке {attempt+1}/{max_retries}: {str(e)}; повтор через {delay:.2f}s")
                            await asyncio.sleep(delay)
                        else:
                            logger.warning(f"❌ Провайдер {provider_type.value} не дал ответ после {max_retries} попыток")
                continue
                
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
    """OpenAI провайдер (с поддержкой прокси для обхода блокировок)"""
    
    def __init__(self, api_key: str, proxy_url: Optional[str] = None):
        super().__init__("OpenAI")
        self.api_key = api_key
        self.proxy_url = proxy_url
        self.base_url = "https://api.openai.com/v1"
        
        # Логирование настройки прокси (без вывода пароля)
        if self.proxy_url:
            masked_proxy = self.proxy_url
            if '@' in masked_proxy:
                # Маскируем пароль в логах
                parts = masked_proxy.split('@')
                if ':' in parts[0]:
                    auth_part = parts[0].split(':')
                    auth_part[-1] = '***'
                    parts[0] = ':'.join(auth_part)
                masked_proxy = '@'.join(parts)
            logger.info(f"🔗 OpenAI настроен с прокси: {masked_proxy}")
    
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
        
        client_kwargs: Dict[str, Any] = {"timeout": 60.0, "trust_env": False}
        if self.proxy_url:
            # Для установленной версии httpx используем параметр 'proxy'
            client_kwargs['proxy'] = self.proxy_url
            logger.info(f"🔗 Используется прокси: {self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url}")

        try:
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
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response else 'N/A'
            body = e.response.text[:500] if e.response else ''
            logger.warning(f"⚠️ OpenAI HTTP {status}: {body}")
            raise
        except (httpx.ProxyError, httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as e:
            logger.warning(f"⚠️ OpenAI сеть/прокси ошибка: {repr(e)} via {self.proxy_url}")
            raise


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
    """Claude провайдер"""
    
    def __init__(self, api_key: str):
        super().__init__("Claude")
        self.api_key = api_key
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
        
        async with httpx.AsyncClient(timeout=60.0) as client:
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