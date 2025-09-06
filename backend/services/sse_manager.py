"""
SSE Manager для ReplyX - управление Server-Sent Events соединениями и Redis Streams
"""
import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, AsyncGenerator, Set
from dataclasses import dataclass
from contextlib import asynccontextmanager

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import redis.asyncio as aioredis

import os
import jwt

# Local auth helpers (migrated from websocket_manager)
def _is_domain_allowed_by_token(origin: str, token: str, parent_origin: str = None) -> bool:
    """Check if domain is allowed by token"""
    try:
        from core.app_config import SITE_SECRET
        payload = jwt.decode(token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
        allowed_domains = payload.get('allowed_domains', '')
        
        # Simple domain check
        if origin and parent_origin:
            parent_domain = _normalize_host_from_origin(parent_origin)
            return parent_domain in allowed_domains
        elif origin:
            domain = _normalize_host_from_origin(origin) 
            return domain in allowed_domains
            
        return False
    except Exception:
        return False

def _normalize_host_from_origin(origin: str) -> str:
    """Normalize host from origin URL"""
    if not origin:
        return ""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        host = parsed.hostname or parsed.netloc.split(':')[0]
        return host.lower().replace('www.', '')
    except Exception:
        return origin.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]

logger = logging.getLogger(__name__)

# Глобальные переменные для SSE соединений
sse_connections: Dict[int, Set] = {}  # dialog_id -> set of SSE client IDs
sse_clients: Dict[str, 'SSEClient'] = {}  # client_id -> SSE client info
sse_stats = {
    'active_connections': 0,
    'total_connections': 0,
    'heartbeats_sent': 0,
    'events_sent': 0,
    'redis_errors': 0
}

@dataclass
class SSEClient:
    """Информация о SSE клиенте"""
    client_id: str
    dialog_id: int
    connected_at: float
    last_event_id: Optional[str] = None
    origin: Optional[str] = None
    user_agent: Optional[str] = None
    auth_type: str = 'unknown'  # 'site', 'widget', 'admin'

class SSEManager:
    """Управление SSE соединениями и интеграция с Redis Streams"""
    
    def __init__(self):
        self.redis = None
        self.pubsub_task = None
        self.heartbeat_task = None
        self.cleanup_task = None
        # Очереди событий на клиента
        self.client_queues: Dict[str, asyncio.Queue] = {}
        
    async def initialize(self):
        """Инициализация Redis подключения и background задач"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.redis = aioredis.from_url(redis_url, decode_responses=True)
            await self.redis.ping()
            logger.info("✅ [SSE Manager] Redis connection established")
            
            # Запускаем background задачи
            self.pubsub_task = asyncio.create_task(self._pubsub_worker())
            self.heartbeat_task = asyncio.create_task(self._heartbeat_worker())
            self.cleanup_task = asyncio.create_task(self._cleanup_worker())
            
            logger.info("✅ [SSE Manager] Background tasks started")
            
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Failed to initialize: {e}")
            raise
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("🔄 [SSE Manager] Shutting down...")
        
        # Останавливаем background задачи
        for task in [self.pubsub_task, self.heartbeat_task, self.cleanup_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # Закрываем Redis соединение
        if self.redis:
            await self.redis.close()
        
        logger.info("✅ [SSE Manager] Shutdown complete")
    
    async def add_event_to_stream(self, dialog_id: int, event_data: dict):
        """
        Добавляет событие в Redis Stream для SSE клиентов
        Это дополняет существующий Pub/Sub механизм
        """
        try:
            stream_key = f"sse:dialog:{dialog_id}"
            event_id = await self.redis.xadd(
                stream_key,
                {"data": json.dumps(event_data)},
                maxlen=1000  # Храним последние 1000 событий
            )
            
            logger.debug(f"📝 [SSE Manager] Added event to stream {stream_key}: {event_id}")
            return event_id
            
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Failed to add event to stream: {e}")
            sse_stats['redis_errors'] += 1
            raise

    async def broadcast_event(self, dialog_id: int, event_data: dict) -> Optional[str]:
        """Добавляет событие в Stream и рассылает всем активным клиентам диалога"""
        try:
            event_id = await self.add_event_to_stream(dialog_id, event_data)
            sse_formatted = self._format_sse_event(event_data, event_id)
            # Отправляем всем клиентам диалога
            if dialog_id in sse_connections:
                for client_id in list(sse_connections[dialog_id]):
                    queue = self.client_queues.get(client_id)
                    if queue is not None:
                        try:
                            await queue.put(sse_formatted)
                            sse_stats['events_sent'] += 1
                        except Exception as qe:
                            logger.error(f"❌ [SSE Manager] Failed to enqueue event for {client_id}: {qe}")
            return event_id
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Failed to broadcast event: {e}")
            return None
    
    async def get_events_since(self, dialog_id: int, last_event_id: str = None, limit: int = 50) -> List[dict]:
        """
        Получает события из Stream начиная с last_event_id
        Используется для догона пропущенных событий при переподключении
        """
        try:
            stream_key = f"sse:dialog:{dialog_id}"
            
            # Если last_event_id не указан, читаем только новые события
            if not last_event_id:
                start_id = "$"  # Читаем только новые события
            else:
                # Проверяем формат ID (должен быть Redis Stream ID)
                if not self._is_valid_stream_id(last_event_id):
                    logger.warning(f"⚠️ [SSE Manager] Invalid last_event_id format: {last_event_id}")
                    start_id = "$"
                else:
                    start_id = f"({last_event_id}"  # Исключаем сам last_event_id
            
            # Получаем события
            events = await self.redis.xread({stream_key: start_id}, count=limit, block=0)
            
            result = []
            if events:
                for stream, messages in events:
                    for event_id, fields in messages:
                        try:
                            data = json.loads(fields['data'])
                            result.append({
                                'id': event_id,
                                'data': data
                            })
                        except (json.JSONDecodeError, KeyError) as e:
                            logger.error(f"❌ [SSE Manager] Failed to parse event {event_id}: {e}")
                            continue
            
            logger.debug(f"📥 [SSE Manager] Retrieved {len(result)} events for dialog {dialog_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Failed to get events since {last_event_id}: {e}")
            sse_stats['redis_errors'] += 1
            return []
    
    def _is_valid_stream_id(self, stream_id: str) -> bool:
        """Проверяет корректность формата Redis Stream ID (timestamp-sequence)"""
        try:
            parts = stream_id.split('-')
            return len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit()
        except:
            return False
    
    async def create_sse_stream(
        self, 
        dialog_id: int, 
        client_id: str,
        last_event_id: str = None,
        origin: str = None,
        user_agent: str = None,
        auth_type: str = 'unknown'
    ) -> AsyncGenerator[str, None]:
        """
        Создает SSE stream для клиента
        Отправляет исторические события и подписывается на новые
        """
        
        # Регистрируем клиента
        client = SSEClient(
            client_id=client_id,
            dialog_id=dialog_id,
            connected_at=time.time(),
            last_event_id=last_event_id,
            origin=origin,
            user_agent=user_agent,
            auth_type=auth_type
        )
        
        sse_clients[client_id] = client
        
        if dialog_id not in sse_connections:
            sse_connections[dialog_id] = set()
        sse_connections[dialog_id].add(client_id)
        # Регистрируем очередь клиента
        self.client_queues[client_id] = asyncio.Queue()
        
        sse_stats['active_connections'] += 1
        sse_stats['total_connections'] += 1
        
        logger.info(f"🔌 [SSE Manager] Client {client_id} connected to dialog {dialog_id} ({auth_type})")
        logger.info(f"📊 [SSE Manager] Active connections for dialog {dialog_id}: {len(sse_connections[dialog_id])}")
        
        try:
            # 1. Отправляем replay событий если есть last_event_id
            if last_event_id:
                historical_events = await self.get_events_since(dialog_id, last_event_id, limit=100)
                for event in historical_events:
                    yield self._format_sse_event(event['data'], event['id'])
                    sse_stats['events_sent'] += 1
                
                logger.info(f"📤 [SSE Manager] Sent {len(historical_events)} historical events to {client_id}")
            
            # 2. Отправляем последние события для новых подключений
            elif not last_event_id:
                recent_events = await self.get_events_since(dialog_id, None, limit=10)
                for event in recent_events:
                    yield self._format_sse_event(event['data'], event['id'])
                    sse_stats['events_sent'] += 1
                
                logger.info(f"📤 [SSE Manager] Sent {len(recent_events)} recent events to {client_id}")
            
            # 3. Основной цикл: отдаём новые события из очереди клиента + heartbeat
            queue = self.client_queues.get(client_id)
            while client_id in sse_clients:
                try:
                    # Ждём следующее событие с таймаутом для heartbeat
                    item = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield item
                except asyncio.TimeoutError:
                    # Heartbeat комментарий (не влияет на lastEventId)
                    heartbeat_line = ": heartbeat\n\n"
                    yield heartbeat_line
                    sse_stats['heartbeats_sent'] += 1
                
        except asyncio.CancelledError:
            logger.info(f"🔌 [SSE Manager] Client {client_id} disconnected (cancelled)")
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Error in SSE stream for {client_id}: {e}")
        finally:
            # Cleanup
            self._cleanup_client(client_id)
    
    def _cleanup_client(self, client_id: str):
        """Удаляет клиента из всех структур данных"""
        if client_id in sse_clients:
            client = sse_clients[client_id]
            dialog_id = client.dialog_id
            
            # Удаляем из connections
            if dialog_id in sse_connections:
                sse_connections[dialog_id].discard(client_id)
                if len(sse_connections[dialog_id]) == 0:
                    del sse_connections[dialog_id]
            
            # Удаляем из clients
            del sse_clients[client_id]
            # Удаляем очередь клиента
            self.client_queues.pop(client_id, None)
            
            sse_stats['active_connections'] = max(0, sse_stats['active_connections'] - 1)
            
            logger.info(f"🔌 [SSE Manager] Client {client_id} cleanup completed")
            logger.info(f"📊 [SSE Manager] Remaining connections for dialog {dialog_id}: {len(sse_connections.get(dialog_id, []))}")
    
    def _format_sse_event(self, data: dict, event_id: str = None) -> str:
        """Форматирует событие в SSE формат"""
        lines = []
        
        if event_id:
            lines.append(f"id: {event_id}")
        
        lines.append("event: message")
        lines.append(f"data: {json.dumps(data)}")
        lines.append("")  # Пустая строка для завершения события
        
        return "\n".join(lines) + "\n"
    
    async def _pubsub_worker(self):
        """
        Background задача для подписки на Redis Pub/Sub 
        и пересылки событий в SSE клиентов
        """
        try:
            pubsub = self.redis.pubsub()
            # Подписка по паттерну на все каналы ws:dialog:*
            await pubsub.psubscribe("ws:dialog:*")
            logger.info("✅ [SSE Manager] Subscribed (pattern) to Redis Pub/Sub ws:dialog:*")
            
            async for message in pubsub.listen():
                if message['type'] == 'pmessage':
                    try:
                        # Извлекаем dialog_id из канала
                        channel = message['channel']
                        # Ожидается формат ws:dialog:<id>
                        dialog_id = int(channel.split(':')[-1])
                        
                        # Парсим данные сообщения
                        event_data = json.loads(message['data'])
                        
                        # Добавляем в Stream и рассылаем клиентам
                        event_id = await self.add_event_to_stream(dialog_id, event_data)
                        sse_formatted = self._format_sse_event(event_data, event_id)
                        if dialog_id in sse_connections:
                            for client_id in list(sse_connections[dialog_id]):
                                queue = self.client_queues.get(client_id)
                                if queue is not None:
                                    try:
                                        await queue.put(sse_formatted)
                                        sse_stats['events_sent'] += 1
                                    except Exception as qe:
                                        logger.error(f"❌ [SSE Manager] Failed to enqueue pubsub event for {client_id}: {qe}")
                        logger.debug(f"📤 [SSE Manager] Enqueued event for dialog {dialog_id} to active SSE clients")
                        
                    except Exception as e:
                        logger.error(f"❌ [SSE Manager] Error processing pubsub message: {e}")
                        sse_stats['redis_errors'] += 1
        
        except asyncio.CancelledError:
            logger.info("🔄 [SSE Manager] Pub/Sub worker cancelled")
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Pub/Sub worker error: {e}")
        finally:
            try:
                await pubsub.unsubscribe()
                await pubsub.close()
            except:
                pass
    
    async def _heartbeat_worker(self):
        """
        Background задача для отправки heartbeat событий
        Предотвращает закрытие SSE соединений из-за таймаутов
        """
        try:
            while True:
                await asyncio.sleep(30)  # Heartbeat каждые 30 секунд
                
                if sse_clients:
                    logger.debug(f"💓 [SSE Manager] Scheduling heartbeat to {len(sse_clients)} SSE clients")
                    # Отправляем комментарий-ха́ртбит всем активным очередям
                    for client_id in list(sse_clients.keys()):
                        queue = self.client_queues.get(client_id)
                        if queue is not None:
                            try:
                                await queue.put(": heartbeat\n\n")
                                sse_stats['heartbeats_sent'] += 1
                            except Exception:
                                pass
                
        except asyncio.CancelledError:
            logger.info("🔄 [SSE Manager] Heartbeat worker cancelled")
        except Exception as e:
            logger.error(f"❌ [SSE Manager] Heartbeat worker error: {e}")
    
    async def _cleanup_worker(self):
        """
        Background задача для очистки старых Stream записей
        """
        try:
            while True:
                await asyncio.sleep(3600)  # Очистка каждый час
                
                try:
                    # Получаем все stream ключи
                    stream_keys = await self.redis.keys("sse:dialog:*")
                    
                    for key in stream_keys:
                        # Оставляем только последние 1000 записей
                        await self.redis.xtrim(key, maxlen=1000, approximate=True)
                    
                    logger.info(f"🧹 [SSE Manager] Cleaned up {len(stream_keys)} Redis Streams")
                    
                except Exception as e:
                    logger.error(f"❌ [SSE Manager] Cleanup error: {e}")
                
        except asyncio.CancelledError:
            logger.info("🔄 [SSE Manager] Cleanup worker cancelled")

# Глобальный экземпляр менеджера
sse_manager = SSEManager()

# Utility функции для интеграции с существующим кодом
async def push_sse_event(dialog_id: int, event_data: dict):
    """
    Публикует событие для SSE клиентов
    Интегрируется с существующим push_dialog_message
    """
    try:
        await sse_manager.broadcast_event(dialog_id, event_data)
    except Exception as e:
        logger.error(f"❌ [SSE] Failed to push event for dialog {dialog_id}: {e}")

def get_sse_stats() -> dict:
    """Возвращает статистику SSE соединений (совместимость с websocket_manager)"""
    # Подсчитываем типы соединений для обратной совместимости
    admin_connections = sum(1 for client_id in sse_clients.keys() if client_id.startswith('admin_'))
    site_connections = sum(1 for client_id in sse_clients.keys() if client_id.startswith('site_'))
    widget_connections = sum(1 for client_id in sse_clients.keys() if client_id.startswith('widget_'))
    
    return {
        **sse_stats,
        'active_dialogs': len(sse_connections),
        'clients_per_dialog': {
            dialog_id: len(client_ids) 
            for dialog_id, client_ids in sse_connections.items()
        },
        # Обратная совместимость с websocket_manager
        'connection_details': {
            'admin_connections': admin_connections,
            'site_connections': site_connections,
            'widget_connections': widget_connections,
            'total_connections': len(sse_clients)
        }
    }

# Authentication helpers (копируем из websocket_manager.py)
async def validate_sse_auth(
    dialog_id: int,
    token: str = None,
    site_token: str = None, 
    assistant_id: int = None,
    origin: str = None
) -> tuple[bool, str]:
    """
    Валидация авторизации для SSE подключения
    Возвращает (is_valid, auth_type)
    """
    try:
        # Admin token
        if token:
            # TODO: implement JWT validation
            return True, "admin"
        
        # Site token
        if site_token:
            # For SSE, we may not have Origin header, so we validate token structure only
            if origin and not _is_domain_allowed_by_token(origin, site_token):
                return False, "forbidden_domain"
            
            # If no origin, validate token structure only (SSE-friendly)
            try:
                from core.app_config import SITE_SECRET
                payload = jwt.decode(site_token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
                if payload.get('type') == 'site' and payload.get('user_id'):
                    return True, "site"
            except Exception:
                pass
                
            return False, "invalid_site_token"
        
        # Widget mode (assistant_id)
        if assistant_id:
            # TODO: validate assistant exists and is active
            return True, "widget"
        
        return False, "missing_auth"
        
    except Exception as e:
        logger.error(f"❌ [SSE Auth] Validation error: {e}")
        return False, "auth_error"