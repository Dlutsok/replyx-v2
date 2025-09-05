"""
Кеширование для ускорения отправки сообщений оператора
"""

import asyncio
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class OperatorMessageCache:
    """
    Кеш для хранения связей telegram_chat_id -> bot_id
    Уменьшает количество запросов к БД при отправке сообщений оператора
    """
    
    def __init__(self, ttl_seconds: int = 300):  # 5 минут TTL
        self._cache = {}  # telegram_chat_id -> (bot_id, assistant_id, timestamp)
        self._ttl_seconds = ttl_seconds
        self._lock = asyncio.Lock()
    
    async def get_bot_mapping(self, telegram_chat_id: str) -> Optional[Tuple[int, int]]:
        """
        Получить (bot_id, assistant_id) для telegram_chat_id из кеша
        
        Returns:
            Tuple[bot_id, assistant_id] если найдено и не устарело, иначе None
        """
        async with self._lock:
            if telegram_chat_id not in self._cache:
                return None
            
            bot_id, assistant_id, timestamp = self._cache[telegram_chat_id]
            
            # Проверяем TTL
            if datetime.now() - timestamp > timedelta(seconds=self._ttl_seconds):
                del self._cache[telegram_chat_id]
                logger.debug(f"Cache expired for telegram_chat_id {telegram_chat_id}")
                return None
            
            logger.debug(f"Cache hit for telegram_chat_id {telegram_chat_id} -> bot_id {bot_id}")
            return bot_id, assistant_id
    
    async def set_bot_mapping(self, telegram_chat_id: str, bot_id: int, assistant_id: int):
        """
        Сохранить связь telegram_chat_id -> (bot_id, assistant_id) в кеше
        """
        async with self._lock:
            self._cache[telegram_chat_id] = (bot_id, assistant_id, datetime.now())
            logger.debug(f"Cached telegram_chat_id {telegram_chat_id} -> bot_id {bot_id}")
    
    async def invalidate(self, telegram_chat_id: str = None):
        """
        Инвалидировать кеш (полностью или для конкретного chat_id)
        """
        async with self._lock:
            if telegram_chat_id:
                self._cache.pop(telegram_chat_id, None)
                logger.debug(f"Invalidated cache for telegram_chat_id {telegram_chat_id}")
            else:
                self._cache.clear()
                logger.debug("Invalidated entire cache")
    
    async def cleanup_expired(self):
        """
        Очистка устаревших записей (можно вызывать периодически)
        """
        now = datetime.now()
        expired_keys = []
        
        async with self._lock:
            for telegram_chat_id, (bot_id, assistant_id, timestamp) in self._cache.items():
                if now - timestamp > timedelta(seconds=self._ttl_seconds):
                    expired_keys.append(telegram_chat_id)
            
            for key in expired_keys:
                del self._cache[key]
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get_stats(self) -> dict:
        """Получить статистику кеша"""
        return {
            "cache_size": len(self._cache),
            "ttl_seconds": self._ttl_seconds,
            "entries": list(self._cache.keys()) if len(self._cache) < 10 else f"{len(self._cache)} entries"
        }


# Глобальный экземпляр кеша
operator_message_cache = OperatorMessageCache()