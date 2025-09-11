from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import models
from database.connection import get_db
import random
import time
from typing import Optional, List
import openai
import os
from cache.redis_cache import chatai_cache
import hashlib
import asyncio

# Импортируем новый AI провайдер
try:
    from ai.ai_providers import get_ai_completion, get_available_providers
    AI_PROVIDERS_AVAILABLE = True
except ImportError:
    AI_PROVIDERS_AVAILABLE = False
    print("⚠️ AI Providers не доступны, используется только OpenAI")

class AITokenManager:
    """Менеджер пула AI токенов с умным распределением + поддержка российских провайдеров"""
    
    def __init__(self):
        # Не создаем постоянное соединение, используем get_db() для каждого запроса
        pass
    
    def get_best_token(self, model: str = "gpt-4", user_id: int = None) -> Optional[models.AITokenPool]:
        """
        Получить лучший доступный токен для запроса
        Алгоритм:
        1. Фильтр по модели и активности
        2. Проверка лимитов
        3. Сортировка по приоритету и загруженности
        4. Выбор наименее загруженного
        """
        
        # Проверяем кэш (TTL: 1 минута)
        cached_token_data = chatai_cache.cache_best_token(model)
        if cached_token_data:
            # Получаем токен из БД по ID
            from database.connection import SessionLocal
            db = SessionLocal()
            try:
                token = db.query(models.AITokenPool).filter(
                    models.AITokenPool.id == cached_token_data['id']
                ).first()
                if token and token.is_active:
                    print(f"🚀 CACHE HIT: Лучший токен для {model}")
                    return token
            finally:
                db.close()
        
        print(f"🔍 CACHE MISS: Поиск лучшего токена для {model}")
        
        self._reset_daily_counters()
        self._reset_monthly_counters()
        
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            # Получаем все активные токены, поддерживающие нужную модель
            available_tokens = db.query(models.AITokenPool).filter(
                models.AITokenPool.is_active == True,
                models.AITokenPool.model_access.contains(model)
            ).all()
            
            if not available_tokens:
                print(f"❌ Нет доступных токенов для модели {model}")
                return None
            
            # Фильтруем токены по лимитам
            valid_tokens = []
            for token in available_tokens:
                # Проверяем дневные лимиты
                if token.daily_limit and token.current_daily_usage >= token.daily_limit:
                    print(f"⚠️ Токен {token.name}: превышен дневной лимит")
                    continue
                    
                # Проверяем месячные лимиты
                if token.monthly_limit and token.current_monthly_usage >= token.monthly_limit:
                    print(f"⚠️ Токен {token.name}: превышен месячный лимит")
                    continue
                    
                valid_tokens.append(token)
            
            if not valid_tokens:
                print(f"❌ Все токены превысили лимиты для модели {model}")
                return None
            
            # Сортировка по приоритету (больше = лучше) и загруженности (меньше = лучше)
            valid_tokens.sort(key=lambda t: (
                t.priority,  # Выше приоритет
                -t.current_daily_usage,  # Меньше текущее дневное использование
                -t.current_monthly_usage  # Меньше текущее месячное использование
            ), reverse=True)
            
            best_token = valid_tokens[0]
            print(f"🎯 Выбран лучший токен: {best_token.name} (приоритет: {best_token.priority})")
            
            # Кэшируем результат (TTL: 1 минута)
            chatai_cache.set_best_token(
                model=model,
                token_data={'id': best_token.id, 'name': best_token.name},
                ttl=60
            )
            
            return best_token
        finally:
            db.close()
    
    def log_usage(self, token_id: int, user_id: int, assistant_id: int, 
                  model_used: str, prompt_tokens: int, completion_tokens: int,
                  response_time: float, success: bool = True, error_message: str = None,
                  provider_used: str = None):
        """Логирование использования токена/провайдера"""
        
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            # Обновляем счетчики токена (только если token_id не None)
            if token_id:
                token = db.query(models.AITokenPool).filter(models.AITokenPool.id == token_id).first()
                if token:
                    token.current_daily_usage += 1
                    token.current_monthly_usage += 1
                    token.last_used = datetime.utcnow()
                    
                    if success:
                        token.error_count = 0  # Сбрасываем счетчик ошибок при успехе
                    else:
                        token.error_count += 1
                        token.last_error = datetime.utcnow()
            
            # Создаем запись об использовании
            usage_log = models.AITokenUsage(
                token_id=token_id,
                user_id=user_id,
                assistant_id=assistant_id,
                model_used=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                response_time=response_time,
                success=success,
                error_message=error_message
            )
            
            db.add(usage_log)
            db.commit()
        finally:
            db.close()
    
    def _reset_daily_counters(self):
        """Сброс дневных счетчиков в полночь"""
        now = datetime.utcnow()
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            tokens_to_reset = db.query(models.AITokenPool).filter(
                models.AITokenPool.last_reset_daily < now.replace(hour=0, minute=0, second=0, microsecond=0)
            ).all()
            
            for token in tokens_to_reset:
                token.current_daily_usage = 0
                token.last_reset_daily = now
            
            if tokens_to_reset:
                db.commit()
        finally:
            db.close()
    
    def _reset_monthly_counters(self):
        """Сброс месячных счетчиков в начале месяца"""
        now = datetime.utcnow()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            tokens_to_reset = db.query(models.AITokenPool).filter(
                models.AITokenPool.last_reset_monthly < first_day_of_month
            ).all()
            
            for token in tokens_to_reset:
                token.current_monthly_usage = 0
                token.last_reset_monthly = now
            
            if tokens_to_reset:
                db.commit()
        finally:
            db.close()
    
    def _make_embedding_request(self, text: str, model: str, user_id: int, assistant_id: int = None):
        """Генерирует embedding для текста через OpenAI API с поддержкой прокси"""
        start_time = time.time()
        
        # Получаем лучший токен (embeddings работают только с OpenAI)
        token = self.get_best_token("gpt-4o-mini", user_id)  # Используем любую модель для получения токена
        if not token:
            raise Exception("Нет доступных токенов для генерации embeddings")
        
        api_key = token.token
        embedding_model = model if model.startswith('text-embedding') else 'text-embedding-3-small'
        
        # Используем прокси систему для embeddings
        from .proxy_manager import get_proxy_manager
        proxy_manager = get_proxy_manager()
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": embedding_model,
            "input": text,
            "encoding_format": "float"
        }
        
        max_attempts = 3
        last_error = None
        
        for attempt in range(max_attempts):
            # Получаем прокси для запроса (синхронный клиент)
            proxy_url, client_kwargs = proxy_manager.get_proxy_for_request(is_stream=False, is_async=False)
            
            if not proxy_url and attempt == 0:
                # Все прокси недоступны, пробуем без прокси
                client_kwargs = {"timeout": 30.0, "trust_env": False}
                print("⚠️ [EMBEDDINGS] Все прокси недоступны, попытка без прокси")
            
            # Находим текущий прокси для метрик
            current_proxy = None
            if proxy_url:
                for proxy in proxy_manager.proxies:
                    if proxy.url == proxy_url:
                        current_proxy = proxy
                        break
                
                masked_url = proxy_manager._mask_proxy_url(proxy_url)
                print(f"🔗 [EMBEDDINGS] Попытка {attempt+1}/{max_attempts} через прокси: {masked_url}")
            
            try:
                import httpx
                
                with httpx.Client(**client_kwargs) as client:
                    response = client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers=headers,
                        json=payload
                    )
                    
                    response_time = time.time() - start_time
                    
                    # Проверяем статус код
                    if response.status_code in [500, 502, 503, 504]:
                        # Upstream ошибка, не проблема с прокси
                        if current_proxy:
                            error_type = proxy_manager.record_proxy_failure(
                                current_proxy, Exception(f"HTTP {response.status_code}"), 
                                response.status_code
                            )
                            if not proxy_manager.should_switch_proxy(error_type):
                                raise Exception(f"OpenAI API error: HTTP {response.status_code}")
                    
                    response.raise_for_status()
                    data = response.json()
                    
                    # Записываем успешное использование прокси
                    if current_proxy:
                        proxy_manager.record_proxy_success(current_proxy, response_time)
                        print(f"✅ [EMBEDDINGS] Успешный запрос через '{current_proxy.name}' за {response_time:.2f}s")
                    
                    # Логируем использование embedding
                    usage_data = data.get('usage', {})
                    self.log_usage(
                        token_id=(token.id if token else None),
                        user_id=user_id,
                        assistant_id=assistant_id,
                        model_used=embedding_model,
                        prompt_tokens=usage_data.get('prompt_tokens', 0),
                        completion_tokens=0,  # У embeddings нет completion tokens
                        response_time=response_time,
                        success=True,
                        provider_used=f"openai_embedding_via_proxy_{current_proxy.name if current_proxy else 'direct'}"
                    )
                    
                    # Создаем mock объект response в формате OpenAI
                    class MockEmbeddingResponse:
                        def __init__(self, data):
                            self.data = [MockEmbeddingData(item) for item in data.get('data', [])]
                            self.usage = MockUsage(data.get('usage', {}))
                    
                    class MockEmbeddingData:
                        def __init__(self, item):
                            self.embedding = item.get('embedding', [])
                    
                    class MockUsage:
                        def __init__(self, usage_dict):
                            self.prompt_tokens = usage_dict.get('prompt_tokens', 0)
                            self.total_tokens = usage_dict.get('total_tokens', 0)
                    
                    return MockEmbeddingResponse(data)
                    
            except httpx.HTTPStatusError as e:
                response_time = time.time() - start_time
                status = e.response.status_code if e.response else None
                body = e.response.text[:500] if e.response else ''
                
                last_error = Exception(f"HTTP {status}: {body}")
                
                if current_proxy:
                    error_type = proxy_manager.record_proxy_failure(
                        current_proxy, e, status
                    )
                    
                    if not proxy_manager.should_switch_proxy(error_type):
                        # Не переключаем прокси (например, при 5xx)
                        break
                
                print(f"⚠️ [EMBEDDINGS] HTTP ошибка через прокси (попытка {attempt+1}): {status}")
                continue
                
            except (httpx.ProxyError, httpx.ConnectError, httpx.ReadTimeout, 
                   httpx.RemoteProtocolError, httpx.ConnectTimeout) as e:
                
                response_time = time.time() - start_time
                last_error = e
                
                if current_proxy:
                    error_type = proxy_manager.record_proxy_failure(current_proxy, e)
                    
                    # Проверяем нужен ли retry с тем же прокси
                    if (proxy_manager.should_retry_with_same_proxy(error_type) and 
                        attempt < max_attempts - 1):
                        
                        print(f"⚠️ [EMBEDDINGS] Retry с тем же прокси '{current_proxy.name}': {error_type.value}")
                        time.sleep(0.5)
                        continue
                
                print(f"⚠️ [EMBEDDINGS] Сетевая ошибка прокси (попытка {attempt+1}): {repr(e)}")
                continue
                
            except Exception as e:
                response_time = time.time() - start_time
                last_error = e
                
                if current_proxy:
                    proxy_manager.record_proxy_failure(current_proxy, e)
                
                print(f"⚠️ [EMBEDDINGS] Неожиданная ошибка (попытка {attempt+1}): {repr(e)}")
                continue
        
        # Если все попытки неудачны
        response_time = time.time() - start_time
        error_msg = f"Embeddings недоступны после {max_attempts} попыток. Последняя ошибка: {last_error}"
        print(f"❌ [EMBEDDINGS] {error_msg}")
        
        # Логируем ошибку
        self.log_usage(
            token_id=(token.id if token else None),
            user_id=user_id,
            assistant_id=assistant_id,
            model_used=embedding_model,
            prompt_tokens=0,
            completion_tokens=0,
            response_time=response_time,
            success=False,
            provider_used="openai_embedding_failed",
            error_message=str(last_error)
        )
        
        raise Exception(f"Ошибка генерации embedding: {last_error}")
    
    def make_openai_request(self, messages: List[dict], model: str = "gpt-4", 
                           user_id: int = None, assistant_id: int = None,
                           temperature: float = 0.9, max_tokens: int = None,
                           presence_penalty: float = 0.3, frequency_penalty: float = 0.3,
                           is_embedding: bool = False, input_text: str = None):
        """
        Выполнить запрос к AI с автоматическим выбором токена и провайдера
        Поддерживает fallback между OpenAI через прокси и другими провайдерами
        Также поддерживает генерацию embeddings для векторного поиска
        """
        start_time = time.time()
        
        # Если это запрос на embedding, используем специальную логику
        if is_embedding and input_text:
            return self._make_embedding_request(input_text, model, user_id, assistant_id)
        
        # Пробуем использовать новую систему провайдеров
        if AI_PROVIDERS_AVAILABLE:
            try:
                # Используем новую систему с прокси и fallback
                # Создаем новый event loop для избежания конфликта с FastAPI
                import asyncio
                loop = None
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    pass
                
                if loop is not None:
                    # Если event loop уже запущен, используем thread executor
                    import concurrent.futures
                    import threading
                    
                    def run_async_in_thread():
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        try:
                            # Импортируем внутри функции для правильного scope
                            from ai.ai_providers import get_ai_completion as ai_completion
                            return new_loop.run_until_complete(ai_completion(
                                messages=messages,
                                model=model,
                                temperature=temperature,
                                max_tokens=max_tokens
                            ))
                        finally:
                            new_loop.close()
                    
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(run_async_in_thread)
                        result = future.result(timeout=30)  # 30 секунд таймаут
                else:
                    # Если event loop не запущен, используем asyncio.run
                    # Импортируем для правильного scope
                    from ai.ai_providers import get_ai_completion as ai_completion
                    result = asyncio.run(ai_completion(
                        messages=messages,
                        model=model,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ))
                
                response_time = time.time() - start_time
                
                # Проверяем корректность результата провайдера
                if not result or not isinstance(result, dict):
                    raise ValueError("Provider returned empty or invalid result")
                
                usage_dict = result.get('usage') or {}
                model_used = result.get('model', model)
                provider_used = result.get('provider_used', 'unknown')
                content_value = result.get('content') or result.get('text') or ""
                
                # Логируем успешное использование (без token_id, так как провайдер может быть не OpenAI)
                self.log_usage(
                    token_id=None,
                    user_id=user_id,
                    assistant_id=assistant_id,
                    model_used=model_used,
                    prompt_tokens=usage_dict.get('prompt_tokens', 0),
                    completion_tokens=usage_dict.get('completion_tokens', 0),
                    response_time=response_time,
                    success=True,
                    provider_used=provider_used
                )
                
                # Создаем объект ответа в формате OpenAI для совместимости
                class MockResponse:
                    def __init__(self, content, usage, model):
                        self.choices = [MockChoice(content)]
                        self.usage = MockUsage(usage)
                        self.model = model
                        
                class MockChoice:
                    def __init__(self, content):
                        self.message = MockMessage(content)
                        
                class MockMessage:
                    def __init__(self, content):
                        self.content = content
                        
                class MockUsage:
                    def __init__(self, usage_dict):
                        self.prompt_tokens = (usage_dict or {}).get('prompt_tokens', 0)
                        self.completion_tokens = (usage_dict or {}).get('completion_tokens', 0)
                        self.total_tokens = (usage_dict or {}).get('total_tokens', 
                            self.prompt_tokens + self.completion_tokens)
                
                return MockResponse(
                    content=content_value,
                    usage=usage_dict,
                    model=model_used
                )
                
            except Exception as e:
                print(f"⚠️ Ошибка новой системы провайдеров: {e}")
                # Fallback на старую систему токенов
        
        # Fallback: используем старую систему с пулом токенов OpenAI
        print("🔄 Используем fallback на систему токенов OpenAI")
        
        # Получаем лучший токен
        token = self.get_best_token(model, user_id)
        if not token:
            raise Exception("Нет доступных AI токенов для модели " + model)
        
        # Этот fallback не должен вызываться - новая система провайдеров должна работать
        response_time = time.time() - start_time
        
        # Логируем что fallback был вызван (это ошибка)
        self.log_usage(
            token_id=token.id,
            user_id=user_id,
            assistant_id=assistant_id,
            model_used=model,
            prompt_tokens=0,
            completion_tokens=0,
            response_time=response_time,
            success=False,
            error_message=f"Legacy fallback called for model {model} - this should not happen",
            provider_used='openai_legacy_fallback_error'
        )
        
        raise Exception(f"Legacy fallback disabled. New provider system should handle model {model}. Check AI_PROVIDERS_AVAILABLE import.")
    
    def get_token_stats(self) -> List[dict]:
        """Получить статистику по всем токенам"""
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            tokens = db.query(models.AITokenPool).all()
            stats = []
            
            for token in tokens:
                daily_usage_percent = (token.current_daily_usage / max(token.daily_limit, 1)) * 100
                monthly_usage_percent = (token.current_monthly_usage / max(token.monthly_limit, 1)) * 100
                
                stats.append({
                    "id": token.id,
                    "name": token.name,
                    "is_active": token.is_active,
                    "priority": token.priority,
                    "models": token.model_access.split(','),
                    "daily_usage": token.current_daily_usage,
                    "daily_limit": token.daily_limit,
                    "daily_usage_percent": round(daily_usage_percent, 1),
                    "monthly_usage": token.current_monthly_usage,
                    "monthly_limit": token.monthly_limit,
                    "monthly_usage_percent": round(monthly_usage_percent, 1),
                    "error_count": token.error_count,
                    "last_used": token.last_used.isoformat() if token.last_used else None,
                    "last_error": token.last_error.isoformat() if token.last_error else None
                })
            
            return stats
        finally:
            db.close()
    
    def add_token(self, name: str, token: str, models_str: str = "gpt-4o,gpt-4o-mini",
                  daily_limit: int = 10000, monthly_limit: int = 300000, 
                  priority: int = 1, notes: str = None):
        """Добавить новый токен в пул"""
        
        new_token = models.AITokenPool(
            name=name,
            token=token,
            model_access=models_str,
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
            priority=priority,
            notes=notes
        )
        
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            db.add(new_token)
            db.commit()
            db.refresh(new_token)
        finally:
            db.close()
        
        return new_token
    



# Создаем глобальный экземпляр менеджера
ai_token_manager = AITokenManager() 

def get_available_token(db: Session, model: str = "gpt-4o-mini"):
    """Простая функция для получения доступного токена"""
    try:
        # Пытаемся получить токен из пула
        token = db.query(models.AITokenPool).filter(
            models.AITokenPool.is_active == True,
            models.AITokenPool.model_access.contains(model)
        ).first()
        
        if token:
            return {
                'token': token.token,
                'id': token.id,
                'model': model
            }
        
        # Если нет токенов в пуле, возвращаем None
        return None
    except Exception as e:
        print(f"Ошибка получения AI токена: {e}")
        return None


def count_tokens(text: str) -> int:
    """
    Простая функция для подсчета токенов в тексте
    Приблизительный подсчет: 1 токен ≈ 4 символа для английского, 6 символов для русского
    """
    if not text or not isinstance(text, str):
        return 0
    
    # Базовый подсчет: английские слова + русские слова + спецсимволы
    import re
    
    # Разделяем на слова и символы
    words = re.findall(r'\w+', text, re.UNICODE)
    spaces_and_punctuation = len(re.findall(r'[^\w]', text, re.UNICODE))
    
    # Приблизительная оценка токенов
    token_count = 0
    for word in words:
        if re.match(r'^[a-zA-Z]+$', word):  # Английские слова
            token_count += max(1, len(word) // 4)
        else:  # Русские и другие слова
            token_count += max(1, len(word) // 3)
    
    # Добавляем токены для пунктуации и пробелов
    token_count += max(1, spaces_and_punctuation // 2)
    
    return max(1, token_count)  # Минимум 1 токен