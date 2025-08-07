"""
Rate Limiting система для ChatAI MVP
Защищает API от злоупотреблений и контролирует расходы
"""

import time
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from functools import wraps
from fastapi import HTTPException, Request
import logging
from cache.redis_cache import cache

logger = logging.getLogger(__name__)

class RateLimiter:
    """Система ограничения скорости запросов"""
    
    def __init__(self):
        self.redis = cache
    
    def check_rate_limit(self, 
                        identifier: str, 
                        limit: int, 
                        window: int, 
                        namespace: str = "rate_limit") -> Tuple[bool, Dict]:
        """
        Проверка rate limit с sliding window
        
        Args:
            identifier: Уникальный идентификатор (user_id, IP, etc.)
            limit: Максимальное количество запросов
            window: Временное окно в секундах
            namespace: Пространство имен для группировки лимитов
            
        Returns:
            (allowed: bool, info: dict)
        """
        if not self.redis.is_available():
            # Если Redis недоступен, разрешаем запрос (graceful degradation)
            return True, {"remaining": limit, "reset_time": int(time.time() + window)}
        
        current_time = int(time.time())
        key = f"{namespace}:{identifier}"
        
        try:
            # Удаляем старые записи
            self.redis.redis_client.zremrangebyscore(key, 0, current_time - window)
            
            # Считаем текущие запросы
            current_count = self.redis.redis_client.zcard(key)
            
            # Проверяем лимит
            allowed = current_count < limit
            
            if allowed:
                # Добавляем текущий запрос с уникальным ключом
                unique_key = f"{current_time}_{uuid.uuid4().hex[:8]}"
                self.redis.redis_client.zadd(key, {unique_key: current_time})
                self.redis.redis_client.expire(key, window + 10)
                request_count = current_count + 1
                remaining = limit - request_count
            else:
                request_count = current_count
                remaining = 0  # Если лимит превышен, остается 0
            
            # Время сброса (начало следующего окна)
            reset_time = current_time + window
            
            info = {
                "allowed": allowed,
                "limit": limit,
                "remaining": remaining,
                "reset_time": reset_time,
                "current_count": request_count,
                "window_seconds": window
            }
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {identifier}: {request_count}/{limit} in {window}s")
            
            return allowed, info
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # При ошибке разрешаем запрос
            return True, {"remaining": limit, "reset_time": int(time.time() + window), "error": str(e)}
    
    def get_user_stats(self, user_id: int) -> Dict:
        """Получение статистики rate limiting для пользователя"""
        try:
            stats = {}
            
            # Проверяем различные лимиты (AI лимиты убраны - реализованы через тарифы)
            limits = {
                "api_general": (100, 3600),  # 100 запросов в час
                "metrics": (20, 300),        # 20 запросов к метрикам за 5 минут
                "admin": (200, 3600),        # 200 админских запросов в час
            }
            
            for limit_type, (limit, window) in limits.items():
                key = f"rate_limit_{limit_type}:{user_id}"
                if self.redis.is_available():
                    current_time = int(time.time())
                    count = self.redis.redis_client.zcount(key, current_time - window, current_time)
                    stats[limit_type] = {
                        "current": count,
                        "limit": limit,
                        "window": window,
                        "remaining": max(0, limit - count)
                    }
                else:
                    stats[limit_type] = {"status": "redis_unavailable"}
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting user rate limit stats: {e}")
            return {"error": str(e)}

# Глобальный экземпляр
rate_limiter = RateLimiter()

# Декораторы для различных типов лимитов

def rate_limit_api(limit: int = 100, window: int = 3600):
    """
    Декоратор для общего API rate limiting
    По умолчанию: 100 запросов в час
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Получаем request и current_user из аргументов
            request = None
            current_user = None
            
            for arg in args:
                if hasattr(arg, 'client'):  # Request object
                    request = arg
                elif hasattr(arg, 'id'):    # User object
                    current_user = arg
            
            # Определяем identifier для rate limiting
            if current_user:
                identifier = f"user_{current_user.id}"
            elif request:
                identifier = f"ip_{request.client.host}"
            else:
                identifier = "unknown"
            
            # Проверяем rate limit
            allowed, info = rate_limiter.check_rate_limit(
                identifier=identifier,
                limit=limit,
                window=window,
                namespace="rate_limit_api"
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit: {limit} per {window} seconds",
                        "retry_after": info["reset_time"] - int(time.time()),
                        "limit_info": info
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset_time"]),
                        "Retry-After": str(info["reset_time"] - int(time.time()))
                    }
                )
            
            # Проверяем, является ли функция асинхронной
            import asyncio
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Если результат Response объект, добавляем headers
            if hasattr(result, 'headers'):
                result.headers["X-RateLimit-Limit"] = str(limit)
                result.headers["X-RateLimit-Remaining"] = str(info["remaining"])
                result.headers["X-RateLimit-Reset"] = str(info["reset_time"])
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Получаем request и current_user из аргументов
            request = None
            current_user = None
            
            for arg in args:
                if hasattr(arg, 'client'):  # Request object
                    request = arg
                elif hasattr(arg, 'id'):    # User object
                    current_user = arg
            
            # Определяем identifier для rate limiting
            if current_user:
                identifier = f"user_{current_user.id}"
            elif request:
                identifier = f"ip_{request.client.host}"
            else:
                identifier = "unknown"
            
            # Проверяем rate limit
            allowed, info = rate_limiter.check_rate_limit(
                identifier=identifier,
                limit=limit,
                window=window,
                namespace="rate_limit_api"
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit: {limit} per {window} seconds",
                        "retry_after": info["reset_time"] - int(time.time()),
                        "limit_info": info
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset_time"]),
                        "Retry-After": str(info["reset_time"] - int(time.time()))
                    }
                )
            
            result = func(*args, **kwargs)
            
            # Если результат Response объект, добавляем headers
            if hasattr(result, 'headers'):
                result.headers["X-RateLimit-Limit"] = str(limit)
                result.headers["X-RateLimit-Remaining"] = str(info["remaining"])
                result.headers["X-RateLimit-Reset"] = str(info["reset_time"])
            
            return result
        
        # Возвращаем правильный wrapper в зависимости от типа функции
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    return decorator

# AI rate limiting убран - ограничения реализованы через систему тарифов

def rate_limit_metrics(limit: int = 20, window: int = 300):
    """
    Декоратор для запросов метрик
    По умолчанию: 20 запросов за 5 минут
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_user = None
            
            # Ищем current_user в аргументах
            for arg in args:
                if hasattr(arg, 'id') and hasattr(arg, 'email'):
                    current_user = arg
                    break
            
            if current_user:
                identifier = f"user_{current_user.id}"
                
                # Проверяем metrics rate limit
                allowed, info = rate_limiter.check_rate_limit(
                    identifier=identifier,
                    limit=limit,
                    window=window,
                    namespace="rate_limit_metrics"
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Metrics rate limit exceeded", 
                            "message": f"Too many metrics requests. Limit: {limit} per {window} seconds",
                            "retry_after": info["reset_time"] - int(time.time())
                        }
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def rate_limit_by_ip(limit: int = 200, window: int = 3600):
    """
    Декоратор для ограничения по IP
    По умолчанию: 200 запросов в час с одного IP
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            
            # Ищем Request в аргументах
            for arg in args:
                if hasattr(arg, 'client'):
                    request = arg
                    break
            
            if request:
                ip = request.client.host
                identifier = f"ip_{ip}"
                
                # Проверяем IP rate limit
                allowed, info = rate_limiter.check_rate_limit(
                    identifier=identifier,
                    limit=limit,
                    window=window,
                    namespace="rate_limit_ip"
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "IP rate limit exceeded",
                            "message": f"Too many requests from your IP. Limit: {limit} per {window} seconds",
                            "retry_after": info["reset_time"] - int(time.time())
                        }
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Дополнительные утилиты

# Функция check_user_can_make_ai_request убрана - проверка через систему тарифов

def get_rate_limit_headers(limit: int, remaining: int, reset_time: int) -> Dict[str, str]:
    """Генерация стандартных rate limit headers"""
    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(remaining), 
        "X-RateLimit-Reset": str(reset_time),
        "Retry-After": str(max(0, reset_time - int(time.time())))
    }