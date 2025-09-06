"""
SSE Service для управления Server-Sent Events подключениями
Заменяет WebSocket manager + ws-gateway функционал
"""
import asyncio
import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any

import redis.asyncio as redis
from sqlalchemy.orm import Session

from database import models
from services.events_pubsub import get_events_pubsub

logger = logging.getLogger(__name__)


class SSEService:
    """Сервис для управления SSE соединениями и событиями"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub_client: Optional[redis.Redis] = None
        
        # Активные клиенты по диалогам
        self.dialog_clients: Dict[int, Set[str]] = defaultdict(set)
        
        # Очереди событий для клиентов
        self.client_queues: Dict[str, asyncio.Queue] = {}
        
        # Redis Pub/Sub подписчик
        self.pubsub_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # События pubsub для получения уведомлений
        self.events_pubsub = get_events_pubsub()
        
    async def _get_redis(self) -> redis.Redis:
        """Получает Redis клиент для streams"""
        if not self.redis_client:
            from core.app_config import REDIS_URL
            self.redis_client = redis.from_url(
                self.redis_url or REDIS_URL,
                decode_responses=True,
                retry_on_timeout=True
            )
            await self.redis_client.ping()
            logger.info("✅ SSE Redis client connected")
        return self.redis_client
    
    async def _get_pubsub_redis(self) -> redis.Redis:
        """Получает отдельный Redis клиент для pub/sub"""
        if not self.pubsub_client:
            from core.app_config import REDIS_URL
            self.pubsub_client = redis.from_url(
                self.redis_url or REDIS_URL,
                decode_responses=True
            )
            await self.pubsub_client.ping()
            logger.info("✅ SSE PubSub Redis client connected")
        return self.pubsub_client
    
    def _make_stream_key(self, dialog_id: int) -> str:
        """Создает ключ Redis Stream для диалога"""
        return f"sse:dialog:{dialog_id}"
    
    def _generate_event_id(self) -> str:
        """Генерирует уникальный ID события для SSE"""
        return f"{int(time.time() * 1000)}-{id(self)}"
    
    async def start_pubsub_listener(self):
        """Запускает слушатель Redis Pub/Sub для получения событий"""
        if self.is_running:
            logger.warning("SSE PubSub listener already running")
            return
        
        self.is_running = True
        self.pubsub_task = asyncio.create_task(self._pubsub_listener_loop())
        logger.info("🎧 SSE PubSub listener started")
    
    async def _pubsub_listener_loop(self):
        """Основной цикл слушателя PubSub"""
        try:
            client = await self._get_pubsub_redis()
            pubsub = client.pubsub()
            await pubsub.psubscribe("ws:dialog:*")
            
            logger.info("🔔 SSE subscribed to ws:dialog:* events")
            
            async for message in pubsub.listen():
                try:
                    if message['type'] == 'pmessage':
                        channel = message['channel']
                        data = message['data']
                        
                        if not data:
                            continue
                        
                        # Парсим событие
                        event = json.loads(data)
                        
                        # Извлекаем dialog_id
                        dialog_id = int(channel.split(':')[-1])
                        
                        logger.debug(f"🎧 SSE received pubsub: dialog={dialog_id}, type={event.get('type')}")
                        
                        # Обрабатываем событие
                        await self._handle_pubsub_event(dialog_id, event)
                        
                except Exception as e:
                    logger.error(f"Error processing pubsub message: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"PubSub listener error: {e}", exc_info=True)
        finally:
            if pubsub:
                await pubsub.unsubscribe()
                await pubsub.aclose()
            self.is_running = False
            logger.info("🔌 SSE PubSub listener stopped")
    
    async def _handle_pubsub_event(self, dialog_id: int, event: Dict[str, Any]):
        """Обрабатывает событие из Redis PubSub"""
        try:
            # Генерируем SSE event ID
            event_id = self._generate_event_id()
            
            # Сохраняем в Redis Stream для replay
            await self._save_to_stream(dialog_id, event_id, event)
            
            # Отправляем активным SSE клиентам
            await self._broadcast_to_clients(dialog_id, event_id, event)
            
        except Exception as e:
            logger.error(f"Error handling pubsub event for dialog {dialog_id}: {e}")
    
    async def _save_to_stream(self, dialog_id: int, event_id: str, event: Dict[str, Any]):
        """Сохраняет событие в Redis Stream для replay"""
        try:
            client = await self._get_redis()
            stream_key = self._make_stream_key(dialog_id)
            
            # Подготавливаем данные для stream
            stream_data = {
                'event_id': event_id,
                'event_type': event.get('type', 'message'),
                'data': json.dumps(event, ensure_ascii=False),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Добавляем в stream
            await client.xadd(stream_key, stream_data)
            
            # Ограничиваем размер stream (последние 1000 событий)
            await client.xtrim(stream_key, maxlen=1000, approximate=True)
            
            logger.debug(f"💾 Saved event to stream: dialog={dialog_id}, event_id={event_id}")
            
        except Exception as e:
            logger.error(f"Error saving to stream for dialog {dialog_id}: {e}")
    
    async def _broadcast_to_clients(self, dialog_id: int, event_id: str, event: Dict[str, Any]):
        """Рассылает событие всем подключенным SSE клиентам диалога"""
        if dialog_id not in self.dialog_clients:
            logger.debug(f"No SSE clients for dialog {dialog_id}")
            return
        
        sse_event = {
            'id': event_id,
            'event': event.get('type', 'message'),
            'data': event
        }
        
        # Отправляем всем клиентам диалога
        clients_count = 0
        for client_id in list(self.dialog_clients[dialog_id]):
            if client_id in self.client_queues:
                try:
                    await self.client_queues[client_id].put(sse_event)
                    clients_count += 1
                except Exception as e:
                    logger.error(f"Error sending to SSE client {client_id}: {e}")
                    # Удаляем проблемного клиента
                    await self.remove_client(dialog_id, client_id)
        
        if clients_count > 0:
            logger.debug(f"📤 Broadcasted SSE event to {clients_count} clients: dialog={dialog_id}")
    
    async def add_client(self, dialog_id: int, client_id: str):
        """Добавляет SSE клиента"""
        self.dialog_clients[dialog_id].add(client_id)
        self.client_queues[client_id] = asyncio.Queue()
        
        logger.info(f"➕ SSE client added: dialog={dialog_id}, client={client_id}, "
                   f"total_clients={len(self.dialog_clients[dialog_id])}")
    
    async def remove_client(self, dialog_id: int, client_id: str):
        """Удаляет SSE клиента"""
        if client_id in self.client_queues:
            del self.client_queues[client_id]
        
        if dialog_id in self.dialog_clients:
            self.dialog_clients[dialog_id].discard(client_id)
            
            # Удаляем пустые наборы
            if not self.dialog_clients[dialog_id]:
                del self.dialog_clients[dialog_id]
        
        logger.info(f"➖ SSE client removed: dialog={dialog_id}, client={client_id}")
    
    async def get_events_for_client(self, dialog_id: int, client_id: str, timeout: float = 5.0) -> List[Dict]:
        """Получает события для конкретного SSE клиента"""
        if client_id not in self.client_queues:
            return []
        
        events = []
        queue = self.client_queues[client_id]
        
        try:
            # Получаем первое событие с таймаутом
            event = await asyncio.wait_for(queue.get(), timeout=timeout)
            events.append(event)
            
            # Собираем все остальные события без ожидания
            while not queue.empty():
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=0.1)
                    events.append(event)
                except asyncio.TimeoutError:
                    break
            
        except asyncio.TimeoutError:
            # Таймаут - это нормально
            pass
        
        return events
    
    async def get_missed_events(self, dialog_id: int, last_event_id: str) -> List[Dict]:
        """Получает пропущенные события из Redis Stream"""
        try:
            client = await self._get_redis()
            stream_key = self._make_stream_key(dialog_id)
            
            # Читаем события после last_event_id
            events = await client.xrange(stream_key, min=f"({last_event_id}", count=50)
            
            result = []
            for stream_id, fields in events:
                try:
                    event_data = {
                        'id': fields['event_id'],
                        'event': fields['event_type'],
                        'data': json.loads(fields['data'])
                    }
                    result.append(event_data)
                except Exception as e:
                    logger.error(f"Error parsing stream event {stream_id}: {e}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting missed events for dialog {dialog_id}: {e}")
            return []
    
    async def get_recent_messages(self, dialog_id: int, limit: int = 10) -> List[Dict]:
        """Получает последние сообщения диалога для первого подключения"""
        try:
            client = await self._get_redis()
            stream_key = self._make_stream_key(dialog_id)
            
            # Читаем последние события
            events = await client.xrevrange(stream_key, count=limit)
            
            result = []
            for stream_id, fields in reversed(events):  # Восстанавливаем порядок
                try:
                    event_data = {
                        'id': fields['event_id'],
                        'event': fields['event_type'],
                        'data': json.loads(fields['data'])
                    }
                    result.append(event_data)
                except Exception as e:
                    logger.error(f"Error parsing stream event {stream_id}: {e}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting recent messages for dialog {dialog_id}: {e}")
            return []
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Возвращает статус здоровья SSE сервиса"""
        try:
            # Проверяем Redis
            client = await self._get_redis()
            await client.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
        
        return {
            "pubsub_running": self.is_running,
            "redis_connected": redis_ok,
            "active_dialogs": len(self.dialog_clients),
            "total_clients": sum(len(clients) for clients in self.dialog_clients.values()),
            "client_queues": len(self.client_queues)
        }
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Возвращает подробную статистику подключений"""
        dialog_stats = {}
        for dialog_id, clients in self.dialog_clients.items():
            dialog_stats[str(dialog_id)] = {
                "client_count": len(clients),
                "clients": list(clients)
            }
        
        return {
            "dialog_stats": dialog_stats,
            "total_dialogs": len(self.dialog_clients),
            "total_clients": sum(len(clients) for clients in self.dialog_clients.values())
        }
    
    async def stop(self):
        """Останавливает SSE сервис"""
        if self.pubsub_task:
            self.pubsub_task.cancel()
            try:
                await self.pubsub_task
            except asyncio.CancelledError:
                pass
        
        # Закрываем все очереди клиентов
        for client_id in list(self.client_queues.keys()):
            del self.client_queues[client_id]
        
        self.dialog_clients.clear()
        
        if self.redis_client:
            await self.redis_client.aclose()
        
        if self.pubsub_client:
            await self.pubsub_client.aclose()
        
        logger.info("🛑 SSE Service stopped")


# Глобальный экземпляр
_sse_service: Optional[SSEService] = None

def get_sse_service() -> SSEService:
    """Получает глобальный экземпляр SSE сервиса"""
    global _sse_service
    if not _sse_service:
        _sse_service = SSEService()
    return _sse_service