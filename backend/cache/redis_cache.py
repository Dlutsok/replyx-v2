import os
import redis
import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
import logging
from functools import wraps
import pickle

logger = logging.getLogger(__name__)

class RedisCache:
    """Менеджер Redis кэша для оптимизации производительности"""
    
    def __init__(self, redis_url: str = None, db: int = 0):
        # Разрешаем конфигурацию через переменную окружения REDIS_URL
        # Пример: redis://:password@redis:6379/0
        effective_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            # Если URL уже содержит номер базы, параметр db передавать не нужно
            self.redis_client = redis.from_url(effective_url, decode_responses=False)
            # Тест подключения
            self.redis_client.ping()
            logger.info("✅ Redis подключен успешно")
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к Redis: {e}")
            self.redis_client = None
    
    def is_available(self) -> bool:
        """Проверка доступности Redis"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except Exception as e:
            logger.debug(f"Redis not available: {e}")
            return False
    
    def _make_key(self, namespace: str, **kwargs) -> str:
        """Создание уникального ключа для кэша"""
        # Сортируем kwargs для консистентности
        sorted_kwargs = sorted(kwargs.items())
        key_data = f"{namespace}:" + ":".join(f"{k}={v}" for k, v in sorted_kwargs)
        
        # Если ключ слишком длинный, используем хэш
        if len(key_data) > 200:
            hash_obj = hashlib.md5(key_data.encode())
            return f"{namespace}:hash:{hash_obj.hexdigest()}"
        
        return key_data
    
    def get(self, namespace: str, **kwargs) -> Optional[Any]:
        """Получение данных из кэша"""
        if not self.is_available():
            return None
        
        try:
            key = self._make_key(namespace, **kwargs)
            data = self.redis_client.get(key)
            if data:
                return pickle.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Ошибка чтения из кэша {namespace}: {e}")
            return None
    
    def set(self, namespace: str, value: Any, ttl: int = 300, **kwargs):
        """Сохранение данных в кэш"""
        if not self.is_available():
            return False
        
        try:
            key = self._make_key(namespace, **kwargs)
            serialized_data = pickle.dumps(value)
            
            if ttl > 0:
                self.redis_client.setex(key, ttl, serialized_data)
            else:
                self.redis_client.set(key, serialized_data)
            
            logger.debug(f"Кэш сохранен: {namespace} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"Ошибка записи в кэш {namespace}: {e}")
            return False
    
    def delete(self, namespace: str, **kwargs) -> bool:
        """Удаление данных из кэша"""
        if not self.is_available():
            return False
        
        try:
            key = self._make_key(namespace, **kwargs)
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.warning(f"Ошибка удаления из кэша {namespace}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Удаление всех ключей по паттерну"""
        if not self.is_available():
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Ошибка удаления по паттерну {pattern}: {e}")
            return 0
    
    def increment(self, namespace: str, ttl: int = 3600, **kwargs) -> int:
        """Инкремент счетчика с TTL"""
        if not self.is_available():
            return 0
        
        try:
            key = self._make_key(namespace, **kwargs)
            
            # Используем pipeline для атомарности
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, ttl)
            results = pipe.execute()
            
            return results[0]
        except Exception as e:
            logger.warning(f"Ошибка инкремента {namespace}: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики Redis"""
        if not self.is_available():
            return {"status": "unavailable"}
        
        try:
            info = self.redis_client.info()
            return {
                "status": "connected",
                "used_memory": info.get('used_memory_human', 'N/A'),
                "connected_clients": info.get('connected_clients', 0),
                "total_commands_processed": info.get('total_commands_processed', 0),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0),
                "hit_rate": round(
                    info.get('keyspace_hits', 0) / max(
                        info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1
                    ) * 100, 2
                )
            }
        except Exception as e:
            logger.warning(f"Ошибка получения статистики Redis: {e}")
            return {"status": "error", "error": str(e)}


# Создаем глобальный экземпляр кэша
cache = RedisCache()


def cache_result(namespace: str, ttl: int = 300, key_func=None):
    """
    Декоратор для кэширования результатов функций
    
    Args:
        namespace: Пространство имен для кэша
        ttl: Время жизни кэша в секундах
        key_func: Функция для генерации дополнительных параметров ключа
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not cache.is_available():
                return func(*args, **kwargs)
            
            # Генерируем ключ кэша
            cache_kwargs = {}
            if key_func:
                cache_kwargs = key_func(*args, **kwargs)
            else:
                # Используем имя функции и аргументы
                cache_kwargs = {
                    'func': func.__name__,
                    'args': str(hash(str(args))),
                    'kwargs': str(hash(str(sorted(kwargs.items()))))
                }
            
            # Пытаемся получить из кэша
            cached_result = cache.get(namespace, **cache_kwargs)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {namespace}")
                return cached_result
            
            # Вызываем функцию и кэшируем результат
            logger.debug(f"Cache MISS: {namespace}")
            result = func(*args, **kwargs)
            cache.set(namespace, result, ttl, **cache_kwargs)
            
            return result
        return wrapper
    return decorator


# Специализированные функции кэширования для ChatAI

class ChatAICache:
    """Специализированный кэш для ChatAI"""
    
    @staticmethod
    def cache_user_metrics(user_id: int, period: str, date: str = None):
        """Кэширование метрик пользователя"""
        cache_key = {"user_id": user_id, "period": period}
        if date:
            cache_key["date"] = date
        
        return cache.get("user_metrics", **cache_key)
    
    @staticmethod
    def set_user_metrics(user_id: int, period: str, data: Dict, date: str = None, ttl: int = 300):
        """Сохранение метрик пользователя"""
        cache_key = {"user_id": user_id, "period": period}
        if date:
            cache_key["date"] = date
        
        return cache.set("user_metrics", data, ttl, **cache_key)
    
    @staticmethod
    def cache_system_stats():
        """Получение системной статистики из кэша"""
        return cache.get("system_stats")
    
    @staticmethod
    def set_system_stats(data: Dict, ttl: int = 60):
        """Сохранение системной статистики"""
        return cache.set("system_stats", data, ttl)
    
    @staticmethod
    def cache_ai_response(messages_hash: str, model: str, user_id: int, *, assistant_id: int, knowledge_version: int = 0):
        """Получение AI ответа из кэша
        Ключ включает assistant_id и knowledge_version, чтобы исключить устаревшие ответы
        после изменения системного промпта/знаний.
        """
        return cache.get(
            "ai_response",
            messages_hash=messages_hash,
            model=model,
            user_id=user_id,
            assistant_id=assistant_id,
            knowledge_version=knowledge_version,
        )
    
    @staticmethod
    def set_ai_response(messages_hash: str, model: str, user_id: int, response: str, ttl: int = 86400, *, assistant_id: int, knowledge_version: int = 0):
        """Сохранение AI ответа в кэш
        Ключ включает assistant_id и knowledge_version.
        """
        return cache.set(
            "ai_response",
            response,
            ttl,
            messages_hash=messages_hash,
            model=model,
            user_id=user_id,
            assistant_id=assistant_id,
            knowledge_version=knowledge_version,
        )
    
    @staticmethod
    def cache_best_token(model: str):
        """Получение лучшего токена из кэша"""
        return cache.get("best_token", model=model)
    
    @staticmethod
    def set_best_token(model: str, token_data: Dict, ttl: int = 60):
        """Сохранение лучшего токена в кэш"""
        return cache.set("best_token", token_data, ttl, model=model)
    
    @staticmethod
    def invalidate_user_cache(user_id: int):
        """Инвалидация всех кэшей пользователя"""
        patterns = [
            f"user_metrics:*user_id={user_id}*",
            f"ai_response:*user_id={user_id}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += cache.delete_pattern(pattern)
        
        return total_deleted
    
    @staticmethod
    def invalidate_system_cache():
        """Инвалидация системных кэшей"""
        patterns = [
            "system_stats:*",
            "best_token:*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += cache.delete_pattern(pattern)
        
        return total_deleted
    
    @staticmethod
    def invalidate_assistant_cache(assistant_id: int):
        """Инвалидация всех кэшей, связанных с ассистентом"""
        patterns = [
            f"assistant:*assistant_id={assistant_id}*",
            f"assistant_analytics:*assistant_id={assistant_id}*",
            f"assistant_knowledge:*assistant_id={assistant_id}*",
            f"ai_response:*assistant_id={assistant_id}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += cache.delete_pattern(pattern)
        
        logger.info(f"Инвалидирован кэш ассистента {assistant_id}, удалено ключей: {total_deleted}")
        return total_deleted
    
    @staticmethod
    def invalidate_knowledge_cache(user_id: int, assistant_id: int = None):
        """Инвалидация кэша базы знаний"""
        if assistant_id:
            patterns = [
                f"user_knowledge:*user_id={user_id}*assistant_id={assistant_id}*",
                f"assistant_knowledge:*assistant_id={assistant_id}*"
            ]
        else:
            patterns = [
                f"user_knowledge:*user_id={user_id}*"
            ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += cache.delete_pattern(pattern)
        
        logger.info(f"Инвалидирован кэш знаний user_id={user_id}, assistant_id={assistant_id}, удалено ключей: {total_deleted}")
        return total_deleted

    # === RAG / Retrieval cache ===
    @staticmethod
    def get_retrieved_chunks(user_id: int, assistant_id: int, knowledge_version: int, query_hash: str):
        """Получение кэша результата ретрива топ-K чанков для запроса
        Ключ включает user_id, assistant_id и knowledge_version, чтобы исключить устаревшие результаты.
        """
        try:
            return cache.get(
                "rag_retrieval",
                user_id=user_id,
                assistant_id=assistant_id or 0,
                knowledge_version=knowledge_version or 0,
                query_hash=query_hash,
            )
        except Exception:
            return None

    @staticmethod
    def cache_retrieved_chunks(user_id: int, assistant_id: int, knowledge_version: int, query_hash: str, chunks: list, ttl: int = 60):
        """Сохранение результата ретрива топ-K чанков (короткий TTL)"""
        try:
            return cache.set(
                "rag_retrieval",
                chunks,
                ttl,
                user_id=user_id,
                assistant_id=assistant_id or 0,
                knowledge_version=knowledge_version or 0,
                query_hash=query_hash,
            )
        except Exception:
            return False


# Экспортируем для использования
chatai_cache = ChatAICache()