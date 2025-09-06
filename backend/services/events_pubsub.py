"""
Redis Pub/Sub модуль для реал-тайм событий между backend и ws-gateway
"""
import os
import asyncio
import json
import logging
from typing import Callable, Awaitable, Optional, Dict, Any
import redis.asyncio as redis
from datetime import datetime

logger = logging.getLogger(__name__)

class EventsPubSub:
    """Менеджер Redis Pub/Sub для реал-тайм событий"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self._subscriber_task: Optional[asyncio.Task] = None
        self._is_running = False
        
    async def _get_client(self) -> redis.Redis:
        """Получает Redis клиент с проверкой подключения"""
        if not self.redis_client:
            try:
                self.redis_client = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                await self.redis_client.ping()
                logger.info("✅ Events Redis подключен успешно")
            except Exception as e:
                logger.error(f"❌ Ошибка подключения Events Redis: {e}")
                raise
        return self.redis_client
    
    async def is_available(self) -> bool:
        """Проверка доступности Redis"""
        try:
            client = await self._get_client()
            await client.ping()
            return True
        except Exception as e:
            logger.debug(f"Events Redis not available: {e}")
            return False
    
    def _make_channel(self, dialog_id: int) -> str:
        """Создает имя канала для диалога"""
        return f"ws:dialog:{dialog_id}"
    
    async def publish_dialog_event(self, dialog_id: int, event: Dict[str, Any]) -> bool:
        """
        Публикует событие диалога в Redis Pub/Sub
        
        Args:
            dialog_id: ID диалога
            event: Словарь с данными события
        
        Returns:
            bool: True если успешно опубликовано
        """
        try:
            client = await self._get_client()
            channel = self._make_channel(dialog_id)
            
            # Добавляем метаданные
            enriched_event = {
                **event,
                "timestamp": datetime.utcnow().isoformat(),
                "dialog_id": dialog_id,
                "source": "backend"
            }
            
            payload = json.dumps(enriched_event, ensure_ascii=False)
            
            # Публикуем в канал
            subscribers_count = await client.publish(channel, payload)
            
            logger.info(f"📢 Published event {event.get('type', 'unknown')} to dialog {dialog_id} "
                       f"({subscribers_count} subscribers)")
            logger.debug(f"Event payload: {payload}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish dialog event: {e}", exc_info=True)
            return False
    
    async def start_ws_bridge_subscriber(self, 
                                       on_event: Callable[[Dict[str, Any]], Awaitable[None]]) -> None:
        """
        Запускает подписчик на события WebSocket мост
        
        Args:
            on_event: Асинхронная функция обработки событий
        """
        if self._is_running:
            logger.warning("WS Bridge subscriber уже запущен")
            return
            
        self._is_running = True
        
        try:
            client = await self._get_client()
            self.pubsub = client.pubsub()
            
            # Подписываемся на все каналы ws:dialog:*
            await self.pubsub.psubscribe("ws:dialog:*")
            logger.info("🔔 WS-BRIDGE subscriber запущен, подписка на ws:dialog:*")
            
            # Запускаем задачу обработки сообщений
            self._subscriber_task = asyncio.create_task(
                self._subscriber_loop(on_event)
            )
            
            await self._subscriber_task
            
        except asyncio.CancelledError:
            logger.info("WS-BRIDGE subscriber остановлен")
            raise
        except Exception as e:
            logger.error(f"❌ WS-BRIDGE subscriber error: {e}", exc_info=True)
        finally:
            self._is_running = False
            if self.pubsub:
                await self.pubsub.unsubscribe()
                await self.pubsub.aclose()
                self.pubsub = None
    
    async def _subscriber_loop(self, on_event: Callable[[Dict[str, Any]], Awaitable[None]]) -> None:
        """Основной цикл подписчика"""
        if not self.pubsub:
            raise RuntimeError("PubSub не инициализирован")
            
        async for message in self.pubsub.listen():
            try:
                if message['type'] == 'pmessage':
                    channel = message['channel']
                    data = message['data']
                    
                    if not data:
                        continue
                        
                    # Парсим JSON payload
                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON in channel {channel}: {e}")
                        continue
                    
                    # Извлекаем dialog_id из канала ws:dialog:123
                    try:
                        dialog_id = int(channel.split(':')[-1])
                        event['dialog_id'] = dialog_id
                    except (ValueError, IndexError):
                        logger.error(f"Cannot extract dialog_id from channel: {channel}")
                        continue
                    
                    logger.debug(f"🔔 WS-BRIDGE received: {event.get('type', 'unknown')} "
                                f"dialog={dialog_id} from channel={channel}")
                    
                    # Вызываем обработчик события
                    try:
                        await on_event(event)
                    except Exception as e:
                        logger.error(f"Event handler failed: {e}", exc_info=True)
                        
            except Exception as e:
                logger.error(f"Subscriber loop error: {e}", exc_info=True)
                # Не прерываем цикл, продолжаем слушать
    
    async def stop_subscriber(self) -> None:
        """Останавливает подписчик"""
        if self._subscriber_task and not self._subscriber_task.done():
            self._subscriber_task.cancel()
            try:
                await self._subscriber_task
            except asyncio.CancelledError:
                pass
        
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.aclose()
            self.pubsub = None
        
        self._is_running = False
        logger.info("WS-BRIDGE subscriber остановлен")
    
    async def get_subscriber_status(self) -> Dict[str, Any]:
        """Возвращает статус подписчика для health check"""
        return {
            "subscriber": "running" if self._is_running else "stopped",
            "redis": "ok" if await self.is_available() else "error",
            "channels": ["ws:dialog:*"] if self._is_running else []
        }
    
    async def close(self) -> None:
        """Закрывает соединения"""
        await self.stop_subscriber()
        
        if self.redis_client:
            await self.redis_client.aclose()
            self.redis_client = None


# Глобальный экземпляр для использования в приложении
_events_pubsub: Optional[EventsPubSub] = None

def get_events_pubsub() -> EventsPubSub:
    """Получает глобальный экземпляр EventsPubSub"""
    global _events_pubsub
    if not _events_pubsub:
        _events_pubsub = EventsPubSub()
    return _events_pubsub

async def publish_dialog_event(dialog_id: int, event: Dict[str, Any]) -> bool:
    """Утилита для быстрой публикации события диалога"""
    pubsub = get_events_pubsub()
    return await pubsub.publish_dialog_event(dialog_id, event)

async def start_ws_bridge_subscriber(on_event: Callable[[Dict[str, Any]], Awaitable[None]]) -> None:
    """Утилита для запуска подписчика WS моста"""
    pubsub = get_events_pubsub()
    await pubsub.start_ws_bridge_subscriber(on_event)

async def get_subscriber_status() -> Dict[str, Any]:
    """Утилита для получения статуса подписчика"""
    pubsub = get_events_pubsub()
    return await pubsub.get_subscriber_status()
