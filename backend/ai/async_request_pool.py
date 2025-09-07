"""
Асинхронный пул запросов для предотвращения блокировки сервера
Реализует semaphore для ограничения количества одновременных запросов
"""

import asyncio
import logging
from typing import Optional, Callable, Any
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class AsyncRequestPool:
    """Пул для управления асинхронными запросами с ограничением конкуренции"""
    
    def __init__(self, max_concurrent_requests: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrent_requests)
        self.active_requests = 0
        self.total_requests = 0
        self.failed_requests = 0
        
    @asynccontextmanager
    async def acquire_slot(self):
        """Контекстный менеджер для получения слота для запроса"""
        async with self.semaphore:
            self.active_requests += 1
            self.total_requests += 1
            try:
                logger.debug(f"🔄 Активных запросов: {self.active_requests}/{self.semaphore._value + self.active_requests}")
                yield
            except Exception as e:
                self.failed_requests += 1
                logger.warning(f"⚠️ Ошибка в пуле запросов: {e}")
                raise
            finally:
                self.active_requests -= 1
    
    async def execute_with_limit(self, coro: Callable, *args, **kwargs) -> Any:
        """Выполняет корутину с ограничением конкуренции"""
        async with self.acquire_slot():
            return await coro(*args, **kwargs)
    
    def get_stats(self) -> dict:
        """Возвращает статистику пула"""
        return {
            "active_requests": self.active_requests,
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "success_rate": ((self.total_requests - self.failed_requests) / max(self.total_requests, 1)) * 100
        }


# Глобальный экземпляр пула
request_pool = AsyncRequestPool(max_concurrent_requests=20)


def get_request_pool() -> AsyncRequestPool:
    """Получить глобальный пул запросов"""
    return request_pool