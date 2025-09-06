"""
Message Queue с ACK + deduplication для WebSocket
Обеспечивает гарантированную доставку сообщений один раз
"""
import asyncio
import time
import uuid
from typing import Dict, Set, Optional, Any, Tuple
import logging
from dataclasses import dataclass, field
from collections import defaultdict
from itertools import count

logger = logging.getLogger(__name__)

# Импортируем централизованную конфигурацию
from .ws_config import (
    ACK_TIMEOUT_SECONDS,
    MAX_RETRY_ATTEMPTS,
    MESSAGE_CLEANUP_INTERVAL_SECONDS as CLEANUP_INTERVAL_SECONDS,
    MESSAGE_TTL_SECONDS
)


@dataclass
class PendingMessage:
    """Сообщение, ожидающее ACK"""
    message_id: str
    payload: dict
    dialog_id: int
    websocket_id: str
    created_at: float = field(default_factory=time.time)
    retry_count: int = 0
    next_retry_at: float = field(default_factory=lambda: time.time() + ACK_TIMEOUT_SECONDS)
    ack_received: bool = False


class WSMessageQueue:
    """
    Менеджер очереди сообщений с гарантией доставки и дедупликацией
    
    Features:
    - Генерация уникальных message_id
    - Retry механизм с exponential backoff
    - Deduplication по message_id
    - Автоматическая очистка устаревших сообщений
    - ACK handling
    """
    
    def __init__(self):
        # Счётчик для генерации sequence numbers
        self._sequence_counter = count(1)
        
        # Очередь сообщений, ожидающих ACK: message_id -> PendingMessage  
        self.pending_messages: Dict[str, PendingMessage] = {}
        
        # Множество обработанных message_id для дедупликации
        self.processed_messages: Set[str] = set()
        
        # Мапинг websocket_id -> dialog_id для быстрого поиска
        self.websocket_dialogs: Dict[str, int] = {}
        
        # Таймер для периодической очистки
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Запускает фоновую задачу очистки"""
        try:
            # Проверяем есть ли running event loop
            asyncio.get_running_loop()
            if not self._cleanup_task or self._cleanup_task.done():
                self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        except RuntimeError:
            # В тестах или при импорте модуля event loop может отсутствовать
            self._cleanup_task = None
            logger.debug("No event loop running, cleanup task will be started later")
    
    async def _periodic_cleanup(self):
        """Периодическая очистка устаревших сообщений"""
        while True:
            try:
                await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
                await self._cleanup_expired_messages()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    async def _cleanup_expired_messages(self):
        """Удаляет устаревшие сообщения из очередей"""
        now = time.time()
        expired_ids = []
        
        for msg_id, msg in self.pending_messages.items():
            if now - msg.created_at > MESSAGE_TTL_SECONDS:
                expired_ids.append(msg_id)
        
        for msg_id in expired_ids:
            logger.warning(f"Message {msg_id} expired after {MESSAGE_TTL_SECONDS}s")
            self.pending_messages.pop(msg_id, None)
        
        # Очистка processed_messages (оставляем только последние 10k)
        if len(self.processed_messages) > 10000:
            # Преобразуем в list, сортируем и оставляем последние
            processed_list = list(self.processed_messages)
            self.processed_messages = set(processed_list[-5000:])
        
        logger.debug(f"Cleanup completed. Pending: {len(self.pending_messages)}, Processed: {len(self.processed_messages)}")
    
    def generate_message_id(self, dialog_id: int, websocket_id: str) -> str:
        """
        Генерирует уникальный message_id
        Format: {dialog_id}_{websocket_id}_{timestamp}_{sequence}_{random}
        """
        sequence = next(self._sequence_counter)
        timestamp = int(time.time() * 1000)  # milliseconds
        random_suffix = str(uuid.uuid4())[:8]
        
        return f"{dialog_id}_{websocket_id}_{timestamp}_{sequence}_{random_suffix}"
    
    def register_websocket(self, websocket_id: str, dialog_id: int):
        """Регистрирует соответствие websocket -> dialog"""
        self.websocket_dialogs[websocket_id] = dialog_id
        logger.debug(f"Registered websocket {websocket_id} for dialog {dialog_id}")
    
    def unregister_websocket(self, websocket_id: str):
        """Удаляет соответствие websocket -> dialog"""
        self.websocket_dialogs.pop(websocket_id, None)
        
        # Удаляем все pending messages для этого websocket
        to_remove = []
        for msg_id, msg in self.pending_messages.items():
            if msg.websocket_id == websocket_id:
                to_remove.append(msg_id)
        
        for msg_id in to_remove:
            self.pending_messages.pop(msg_id, None)
        
        logger.debug(f"Unregistered websocket {websocket_id}")
    
    async def send_message_with_ack(
        self, 
        dialog_id: int, 
        websocket_id: str, 
        payload: dict,
        message_type: str = "message"
    ) -> Tuple[str, dict]:
        """
        Отправляет сообщение с ожиданием ACK
        
        Returns:
            (message_id, enhanced_payload) - готовое сообщение для отправки
        """
        # Генерируем message_id
        message_id = self.generate_message_id(dialog_id, websocket_id)
        
        # Добавляем метаданные к payload
        enhanced_payload = {
            **payload,
            "message_id": message_id,
            "type": message_type,
            "requires_ack": True,
            "timestamp": time.time(),
            "seq": next(self._sequence_counter)
        }
        
        # Сохраняем в pending очередь
        pending_msg = PendingMessage(
            message_id=message_id,
            payload=enhanced_payload,
            dialog_id=dialog_id,
            websocket_id=websocket_id
        )
        
        self.pending_messages[message_id] = pending_msg
        
        logger.debug(f"Queued message {message_id} for delivery")
        return message_id, enhanced_payload
    
    async def handle_ack(self, message_id: str, websocket_id: str) -> bool:
        """
        Обрабатывает ACK от клиента
        
        Returns:
            True if ACK was processed successfully, False if message not found
        """
        if message_id not in self.pending_messages:
            logger.warning(f"Received ACK for unknown message: {message_id}")
            return False
        
        pending_msg = self.pending_messages[message_id]
        
        # Проверяем, что ACK пришел от правильного websocket
        if pending_msg.websocket_id != websocket_id:
            logger.warning(f"ACK websocket mismatch for {message_id}: expected {pending_msg.websocket_id}, got {websocket_id}")
            return False
        
        # Помечаем как обработанное
        pending_msg.ack_received = True
        self.processed_messages.add(message_id)
        
        # Удаляем из pending
        self.pending_messages.pop(message_id, None)
        
        logger.debug(f"ACK received for message {message_id}")
        return True
    
    def is_message_processed(self, message_id: str) -> bool:
        """Проверяет, было ли сообщение уже обработано (deduplication)"""
        return message_id in self.processed_messages
    
    async def get_retry_messages(self) -> list[PendingMessage]:
        """
        Возвращает сообщения, готовые для повторной отправки
        """
        now = time.time()
        retry_messages = []
        
        for msg in self.pending_messages.values():
            if msg.ack_received:
                continue
                
            if now >= msg.next_retry_at and msg.retry_count < MAX_RETRY_ATTEMPTS:
                # Обновляем retry parameters
                msg.retry_count += 1
                backoff_delay = min(ACK_TIMEOUT_SECONDS * (2 ** msg.retry_count), 60)  # max 60s
                msg.next_retry_at = now + backoff_delay
                
                retry_messages.append(msg)
                logger.info(f"Retry {msg.retry_count}/{MAX_RETRY_ATTEMPTS} for message {msg.message_id}")
            
            elif msg.retry_count >= MAX_RETRY_ATTEMPTS:
                # Превышен лимит попыток - помечаем как failed
                logger.error(f"Message {msg.message_id} failed after {MAX_RETRY_ATTEMPTS} attempts")
                self.pending_messages.pop(msg.message_id, None)
        
        return retry_messages
    
    def get_stats(self) -> dict:
        """Возвращает статистику очереди"""
        now = time.time()
        pending_count = len(self.pending_messages)
        retry_ready_count = sum(1 for msg in self.pending_messages.values() 
                               if now >= msg.next_retry_at and not msg.ack_received)
        
        return {
            "pending_messages": pending_count,
            "processed_messages": len(self.processed_messages),
            "retry_ready": retry_ready_count,
            "registered_websockets": len(self.websocket_dialogs)
        }
    
    async def shutdown(self):
        """Graceful shutdown"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("WSMessageQueue shutdown completed")


# Глобальный экземпляр
message_queue = WSMessageQueue()


# Utility functions
async def send_with_ack(dialog_id: int, websocket_id: str, payload: dict, message_type: str = "message") -> Tuple[str, dict]:
    """Convenience wrapper для отправки сообщения с ACK"""
    return await message_queue.send_message_with_ack(dialog_id, websocket_id, payload, message_type)


async def handle_client_ack(message_id: str, websocket_id: str) -> bool:
    """Convenience wrapper для обработки ACK"""
    return await message_queue.handle_ack(message_id, websocket_id)


def is_duplicate_message(message_id: str) -> bool:
    """Convenience wrapper для проверки дубликатов"""
    return message_queue.is_message_processed(message_id)