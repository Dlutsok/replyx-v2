"""Handoff service for managing operator handoffs with state machine and concurrency protection."""

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from uuid import uuid4
import asyncio

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import IntegrityError

from database import models
from schemas.handoff import HandoffStatusOut, HandoffQueueItem, HandoffStatus

# Handoff configuration constants
HANDOFF_KEYWORDS_RU = ['оператор', 'человек', 'менеджер', 'поддержка', 'помощь', 'жалоба', 'проблема']
HANDOFF_FALLBACK_PATTERNS = ['не могу ответить', 'не нашёл информации', 'обратитесь в поддержку', 'свяжитесь с']
HANDOFF_MAX_REQUESTS_PER_MINUTE = 3

logger = logging.getLogger(__name__)


class HandoffService:
    """Service for managing handoff operations with state validation and concurrency protection."""
    
    class HandoffError(Exception):
        """Base handoff error."""
        pass
    
    class Conflict(HandoffError):
        """Conflict error for invalid state transitions or concurrent access."""
        pass
    
    class RateLimit(HandoffError):
        """Rate limit error for too frequent requests."""
        pass
    
    class NotFound(HandoffError):
        """Dialog not found error."""
        pass

    def __init__(self, db: Session):
        self.db = db
        self._seq_counter = 0

    def request_handoff(
        self, 
        dialog_id: int, 
        reason: str = "manual", 
        request_id: str = None, 
        last_user_text: str = None
    ) -> HandoffStatusOut:
        """
        Request handoff with idempotency protection and state validation.
        
        Args:
            dialog_id: Dialog ID to request handoff for
            reason: Reason for handoff (keyword, fallback, retries, manual)
            request_id: UUID for idempotency (optional, will generate if not provided)
            last_user_text: Last message from user for context
            
        Returns:
            HandoffStatusOut with current status
            
        Raises:
            Conflict: If dialog is already in handoff state
            RateLimit: If too many requests for this dialog
            NotFound: If dialog doesn't exist
        """
        logger.info(f"🔍 HANDOFF REQUEST: dialog_id={dialog_id}, reason={reason}, request_id={request_id}")
        
        if not request_id:
            request_id = str(uuid4())
            logger.info(f"🆔 GENERATED NEW REQUEST_ID: {request_id}")
        else:
            logger.info(f"🔄 USING PROVIDED REQUEST_ID: {request_id}")
            
        try:
            # Check for idempotency - if request_id already exists, return current status
            existing_dialog = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id,
                models.Dialog.request_id == request_id
            ).first()
            
            if existing_dialog:
                logger.warning(f"🚨 IDEMPOTENCY TRIGGERED: dialog {dialog_id}, request_id {request_id}")
                logger.warning(f"🚨 EXISTING STATUS: {existing_dialog.handoff_status}, timestamp: {existing_dialog.handoff_requested_at}")
                # Даже при idempotency обновляем timestamp для UI
                existing_dialog.handoff_requested_at = datetime.utcnow()
                self.db.commit()
                logger.info(f"Updated timestamp for idempotent request: dialog {dialog_id}")
                return self._build_status_response(existing_dialog)
            
            # Lock dialog for update to prevent race conditions
            dialog = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id
            ).with_for_update().first()
            
            if not dialog:
                raise self.NotFound(f"Dialog {dialog_id} not found")
            
            # Validate current state - handle different scenarios
            if dialog.handoff_status == HandoffStatus.REQUESTED:
                # Обновляем timestamp и request_id для повторного запроса, но не меняем статус
                dialog.handoff_requested_at = datetime.utcnow()
                dialog.request_id = request_id  # Обновляем request_id для идемпотентности
                self.db.commit()
                logger.info(f"Updated handoff_requested_at and request_id for dialog {dialog_id}")
                return self._build_status_response(dialog)
            elif dialog.handoff_status == HandoffStatus.ACTIVE:
                raise self.Conflict(f"Dialog {dialog_id} already handled by operator")
            elif dialog.handoff_status not in [HandoffStatus.NONE, HandoffStatus.CANCELLED, HandoffStatus.RELEASED]:
                raise self.Conflict(f"Dialog {dialog_id} in incompatible state: {dialog.handoff_status}")
            
            # Check rate limiting - not more than 3 requests per minute for this dialog
            recent_requests = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id,
                models.Dialog.handoff_requested_at > datetime.utcnow() - timedelta(minutes=1)
            ).count()
            
            if recent_requests >= 3:
                raise self.RateLimit(f"Too many handoff requests for dialog {dialog_id}")
            
            # Transition to requested state - reset all previous handoff data
            old_status = dialog.handoff_status
            dialog.handoff_status = HandoffStatus.REQUESTED
            dialog.handoff_requested_at = datetime.utcnow()
            dialog.handoff_reason = reason
            dialog.request_id = request_id
            # Clear previous handoff session data for clean restart
            if old_status in [HandoffStatus.CANCELLED, HandoffStatus.RELEASED]:
                dialog.assigned_manager_id = None
                dialog.handoff_started_at = None
                dialog.handoff_resolved_at = None
            # Keep is_taken_over as False - AI can still respond in 'requested' state
            
            # Create system message
            system_message = models.DialogMessage(
                dialog_id=dialog_id,
                sender="system",
                text="Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время",
                message_kind="system",
                system_type="handoff_requested",
                timestamp=datetime.utcnow()
            )
            self.db.add(system_message)
            
            # Create audit log
            self._create_audit_log(
                dialog_id=dialog_id,
                from_status=old_status or HandoffStatus.NONE,
                to_status=HandoffStatus.REQUESTED,
                reason=reason,
                request_id=request_id,
                metadata={"last_user_text": last_user_text, "old_status": old_status}
            )
            
            self.db.commit()
            
            # Send async notifications (non-blocking)
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self._send_handoff_notifications(dialog, reason, last_user_text))
                    # Отправляем системное сообщение в Telegram при запросе оператора
                    asyncio.create_task(self._send_telegram_system_message(dialog_id, "Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время", "handoff_requested"))
                else:
                    logger.debug(f"Skipping async notifications for dialog {dialog_id} - no active event loop")
            except RuntimeError:
                # No event loop running - skip async notifications in sync context
                logger.debug(f"Skipping async notifications for dialog {dialog_id} - no event loop")
            
            logger.info(f"Handoff requested for dialog {dialog_id}, reason: {reason}")
            return self._build_status_response(dialog)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error requesting handoff for dialog {dialog_id}: {str(e)}")
            raise

    def takeover_handoff(self, dialog_id: int, manager_id: int) -> HandoffStatusOut:
        """
        Operator takes over handoff with concurrency protection.
        
        Args:
            dialog_id: Dialog ID to take over
            manager_id: Manager user ID
            
        Returns:
            HandoffStatusOut with updated status
            
        Raises:
            Conflict: If dialog not in requested state or operator at capacity
            NotFound: If dialog doesn't exist
        """
        logger.info(f"Starting takeover for dialog {dialog_id} by manager {manager_id}")
        try:
            # Lock both dialog and operator presence to prevent race conditions
            dialog = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id
            ).with_for_update().first()
            
            if not dialog:
                logger.error(f"Dialog {dialog_id} not found in database")
                raise self.NotFound(f"Dialog {dialog_id} not found")
            
            logger.info(f"Dialog {dialog_id} current state: {dialog.handoff_status}")
            
            # Validate dialog state
            if dialog.handoff_status != HandoffStatus.REQUESTED:
                logger.error(f"Dialog {dialog_id} not in requested state, current: {dialog.handoff_status}")
                raise self.Conflict(
                    f"Dialog {dialog_id} not in requested state: {dialog.handoff_status}"
                )
            
            # Check operator availability
            operator = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == manager_id
            ).with_for_update().first()
            
            if not operator:
                # Create operator presence if doesn't exist
                logger.info(f"Creating operator presence for user {manager_id}")
                operator = models.OperatorPresence(
                    user_id=manager_id,
                    status="online",
                    last_heartbeat=datetime.utcnow(),
                    active_chats=0,
                    max_active_chats_web=3,
                    max_active_chats_telegram=5
                )
                self.db.add(operator)
                self.db.flush()
            
            logger.info(f"Operator {manager_id} status: {operator.status}, active_chats: {operator.active_chats}, max: {operator.max_active_chats_web}")
            
            # Validate operator status and capacity
            if operator.status != "online":
                raise self.Conflict(f"Operator {manager_id} not online: {operator.status}")
            
            if operator.active_chats >= operator.max_active_chats_web:
                raise self.Conflict(f"Operator {manager_id} at capacity: {operator.active_chats}")
            
            # Transition to active state
            dialog.handoff_status = HandoffStatus.ACTIVE
            dialog.is_taken_over = 1  # Block AI responses (1 for True in integer field)
            dialog.assigned_manager_id = manager_id
            dialog.handoff_started_at = datetime.utcnow()
            
            # Update operator load
            operator.active_chats += 1
            operator.last_heartbeat = datetime.utcnow()
            
            # Create system message
            manager_user = self.db.query(models.User).filter(models.User.id == manager_id).first()
            manager_name = manager_user.first_name.strip() if manager_user and manager_user.first_name else f"Оператор #{manager_id}"
            
            system_message = models.DialogMessage(
                dialog_id=dialog_id,
                sender="system",
                text="✅ Оператор подключился",
                message_kind="system",
                system_type="handoff_started",
                timestamp=datetime.utcnow()
            )
            self.db.add(system_message)
            
            # Create audit log
            self._create_audit_log(
                dialog_id=dialog_id,
                from_status=HandoffStatus.REQUESTED,
                to_status=HandoffStatus.ACTIVE,
                user_id=manager_id,
                reason="takeover",
                metadata={"manager_name": manager_name}
            )
            
            self.db.commit()
            
            # Send WebSocket notification
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self._send_ws_notification(dialog_id, "handoff_started", manager_id))
                    # Отправляем системное сообщение в Telegram при подключении оператора
                    asyncio.create_task(self._send_telegram_system_message(dialog_id, "✅ Оператор подключился", "handoff_started"))
                else:
                    logger.debug(f"Skipping WS notification for dialog {dialog_id} - no active event loop")
            except RuntimeError:
                logger.debug(f"Skipping WS notification for dialog {dialog_id} - no event loop")
            
            logger.info(f"Handoff taken over for dialog {dialog_id} by manager {manager_id}")
            return self._build_status_response(dialog)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error taking over handoff for dialog {dialog_id}: {str(e)}")
            raise

    def release_handoff(self, dialog_id: int, manager_id: int) -> HandoffStatusOut:
        """
        Release handoff back to AI with validation.
        
        Args:
            dialog_id: Dialog ID to release
            manager_id: Manager user ID (must match assigned_manager_id)
            
        Returns:
            HandoffStatusOut with updated status
            
        Raises:
            Conflict: If dialog not active or wrong manager
            NotFound: If dialog doesn't exist
        """
        try:
            # Lock dialog and operator
            dialog = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id
            ).with_for_update().first()
            
            if not dialog:
                raise self.NotFound(f"Dialog {dialog_id} not found")
            
            # Validate state and ownership
            if dialog.handoff_status != HandoffStatus.ACTIVE:
                raise self.Conflict(
                    f"Dialog {dialog_id} not in active state: {dialog.handoff_status}"
                )
            
            if dialog.assigned_manager_id != manager_id:
                raise self.Conflict(
                    f"Dialog {dialog_id} assigned to different manager: {dialog.assigned_manager_id}"
                )
            
            # Update operator load
            operator = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == manager_id
            ).with_for_update().first()
            
            if operator and operator.active_chats > 0:
                operator.active_chats -= 1
            
            # Transition to released state
            dialog.handoff_status = HandoffStatus.RELEASED
            dialog.is_taken_over = 0  # Re-enable AI (0 for False in integer field)
            dialog.handoff_resolved_at = datetime.utcnow()
            
            # Create system message
            system_message = models.DialogMessage(
                dialog_id=dialog_id,
                sender="system",
                text="✅ Диалог возвращен к боту. Спасибо за обращение!",
                message_kind="system",
                system_type="handoff_released",
                timestamp=datetime.utcnow()
            )
            self.db.add(system_message)
            
            # Create audit log
            self._create_audit_log(
                dialog_id=dialog_id,
                from_status=HandoffStatus.ACTIVE,
                to_status=HandoffStatus.RELEASED,
                user_id=manager_id,
                reason="release"
            )
            
            self.db.commit()
            
            # Send WebSocket notification (only in async context)
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self._send_ws_notification(dialog_id, "handoff_released"))
                    # Отправляем системное сообщение в Telegram
                    asyncio.create_task(self._send_telegram_system_message(dialog_id, "✅ Диалог возвращен к боту. Спасибо за обращение!", "handoff_released"))
                else:
                    logger.debug(f"Skipping WS notification for dialog {dialog_id} - no active event loop")
            except RuntimeError:
                logger.debug(f"Skipping WS notification for dialog {dialog_id} - no event loop")
            
            logger.info(f"Handoff released for dialog {dialog_id} by manager {manager_id}")
            return self._build_status_response(dialog)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error releasing handoff for dialog {dialog_id}: {str(e)}")
            raise

    def cancel_handoff(self, dialog_id: int) -> HandoffStatusOut:
        """
        Cancel handoff request (can be called before active state).
        
        Args:
            dialog_id: Dialog ID to cancel handoff for
            
        Returns:
            HandoffStatusOut with updated status
        """
        try:
            dialog = self.db.query(models.Dialog).filter(
                models.Dialog.id == dialog_id
            ).with_for_update().first()
            
            if not dialog:
                raise self.NotFound(f"Dialog {dialog_id} not found")
            
            # Can only cancel from requested state
            if dialog.handoff_status not in [HandoffStatus.REQUESTED]:
                raise self.Conflict(
                    f"Cannot cancel handoff in state: {dialog.handoff_status}"
                )
            
            # Transition to cancelled state
            dialog.handoff_status = HandoffStatus.CANCELLED
            dialog.handoff_resolved_at = datetime.utcnow()
            
            # Create system message
            system_message = models.DialogMessage(
                dialog_id=dialog_id,
                sender="system",
                text="❌ Запрос оператора отменен",
                message_kind="system",
                system_type="handoff_cancelled",
                timestamp=datetime.utcnow()
            )
            self.db.add(system_message)
            
            # Create audit log
            self._create_audit_log(
                dialog_id=dialog_id,
                from_status=HandoffStatus.REQUESTED,
                to_status=HandoffStatus.CANCELLED,
                reason="cancelled"
            )
            
            self.db.commit()
            
            # Send WebSocket notification
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self._send_ws_notification(dialog_id, "handoff_cancelled"))
                else:
                    logger.debug(f"Skipping WS notification for dialog {dialog_id} - no active event loop")
            except RuntimeError:
                logger.debug(f"Skipping WS notification for dialog {dialog_id} - no event loop")
            
            logger.info(f"Handoff cancelled for dialog {dialog_id}")
            return self._build_status_response(dialog)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling handoff for dialog {dialog_id}: {str(e)}")
            raise

    def get_status(self, dialog_id: int) -> HandoffStatusOut:
        """Get current handoff status for dialog."""
        dialog = self.db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if not dialog:
            raise self.NotFound(f"Dialog {dialog_id} not found")
        
        return self._build_status_response(dialog)

    def get_queue(self) -> List[HandoffQueueItem]:
        """Get list of dialogs waiting for operator."""
        dialogs = self.db.query(models.Dialog).filter(
            models.Dialog.handoff_status == HandoffStatus.REQUESTED
        ).order_by(models.Dialog.handoff_requested_at).all()
        
        queue = []
        for i, dialog in enumerate(dialogs):
            wait_time = int((datetime.utcnow() - dialog.handoff_requested_at).total_seconds() / 60)
            
            # Get last user message
            last_message = self.db.query(models.DialogMessage).filter(
                models.DialogMessage.dialog_id == dialog.id,
                models.DialogMessage.sender == "user"
            ).order_by(models.DialogMessage.timestamp.desc()).first()
            
            queue.append(HandoffQueueItem(
                dialog_id=dialog.id,
                requested_at=dialog.handoff_requested_at,
                reason=dialog.handoff_reason,
                last_user_text=last_message.text if last_message else None,
                wait_time_minutes=wait_time,
                priority=i + 1
            ))
        
        return queue

    def should_request_handoff(self, user_text: str, ai_text: str = None, dialog=None) -> Tuple[bool, str]:
        """
        Check if handoff should be automatically requested.
        
        Args:
            user_text: User's message text
            ai_text: AI's response text (optional)
            dialog: Dialog object for context (optional)
            
        Returns:
            Tuple of (should_request, reason)
        """
        # Check for keywords in user text
        keywords_ru = ["оператор", "менеджер", "живой человек", "поддержка", "помощь", "человек"]
        keywords_en = ["operator", "manager", "human", "support", "help", "person"]
        
        user_text_lower = user_text.lower()
        
        for keyword in keywords_ru + keywords_en:
            if keyword in user_text_lower:
                return True, "keyword"
        
        # Check AI response for fallback patterns
        if ai_text:
            fallback_patterns = [
                "не нашёл информации",
                "не могу ответить",
                "обратитесь в поддержку",
                "не понимаю",
                "couldn't find",
                "can't answer",
                "contact support"
            ]
            
            ai_text_lower = ai_text.lower()
            for pattern in fallback_patterns:
                if pattern in ai_text_lower:
                    return True, "fallback"
        
        # Check dialog context for repeated failures
        if dialog and dialog.fallback_count >= 2:
            return True, "retries"
        
        return False, ""

    def _build_status_response(self, dialog) -> HandoffStatusOut:
        """Build HandoffStatusOut from dialog object."""
        assigned_manager = None
        if dialog.assigned_manager_id:
            manager = self.db.query(models.User).filter(
                models.User.id == dialog.assigned_manager_id
            ).first()
            if manager:
                assigned_manager = {
                    "id": manager.id,
                    "name": manager.first_name.strip() if manager.first_name else f"User #{manager.id}",
                    "avatar": None  # Add avatar URL if available
                }
        
        # Calculate queue position if in requested state
        queue_position = None
        estimated_wait = None
        if dialog.handoff_status == HandoffStatus.REQUESTED:
            earlier_requests = self.db.query(models.Dialog).filter(
                models.Dialog.handoff_status == HandoffStatus.REQUESTED,
                models.Dialog.handoff_requested_at < dialog.handoff_requested_at
            ).count()
            queue_position = earlier_requests + 1
            estimated_wait = queue_position * 3  # Assume 3 minutes per dialog
        
        return HandoffStatusOut(
            status=dialog.handoff_status or HandoffStatus.NONE,
            assigned_manager=assigned_manager,
            requested_at=dialog.handoff_requested_at,
            started_at=dialog.handoff_started_at,
            resolved_at=dialog.handoff_resolved_at,
            reason=dialog.handoff_reason,
            request_id=str(dialog.request_id) if dialog.request_id else None,
            queue_position=queue_position,
            estimated_wait_minutes=estimated_wait,
            sla_deadline=None
        )

    def _create_audit_log(self, dialog_id: int, from_status: str, to_status: str, 
                         user_id: int = None, reason: str = None, request_id: str = None,
                         metadata: Dict[str, Any] = None):
        """Create audit log entry for handoff transition."""
        self._seq_counter += 1
        
        audit = models.HandoffAudit(
            dialog_id=dialog_id,
            from_status=from_status,
            to_status=to_status,
            user_id=user_id,
            reason=reason,
            request_id=request_id,
            seq=self._seq_counter,
            extra_data=metadata,
            created_at=datetime.utcnow()
        )
        self.db.add(audit)

    async def _send_handoff_notifications(self, dialog, reason: str, last_user_text: str = None):
        """Send email notifications to operators (async)."""
        try:
            from backend.integrations.email_service import send_handoff_notification
            
            # Get admin users or use configured recipients
            recipients = getattr(settings, 'HANDOFF_RECIPIENTS', None)
            if not recipients:
                admins = self.db.query(models.User).filter(
                    models.User.role == 'admin'
                ).all()
                recipients = [admin.email for admin in admins if admin.email]
            
            for email in recipients:
                await send_handoff_notification(
                    to_email=email,
                    dialog_id=dialog.id,
                    user_preview=last_user_text or "",
                    reason=reason,
                    link=f"{settings.FRONTEND_URL}/admin/dialogs/{dialog.id}"
                )
                
        except Exception as e:
            logger.error(f"Error sending handoff notifications: {str(e)}")

    async def _send_ws_notification(self, dialog_id: int, event_type: str, manager_id: int = None):
        """Send WebSocket notification for handoff event."""
        try:
            from services.websocket_manager import push_dialog_message
            
            self._seq_counter += 1
            event_data = {
                "type": event_type,
                "dialog_id": dialog_id,
                "seq": self._seq_counter,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if manager_id:
                manager = self.db.query(models.User).filter(models.User.id == manager_id).first()
                if manager:
                    event_data["manager"] = {
                        "id": manager_id,
                        "name": manager.first_name.strip() if manager.first_name else f"User #{manager_id}"
                    }
            
            await push_dialog_message(dialog_id, event_data)
            
        except Exception as e:
            logger.error(f"Error sending WebSocket notification: {str(e)}")

    async def _send_telegram_system_message(self, dialog_id: int, text: str, system_type: str):
        """Send system message to Telegram bot for dialog."""
        try:
            # Получаем информацию о диалоге
            dialog = self.db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
            if not dialog or not dialog.telegram_chat_id:
                logger.debug(f"Dialog {dialog_id} is not a Telegram dialog, skipping system message")
                return

            # Импортируем здесь чтобы избежать циклических импортов
            from services.bot_manager import send_system_message_to_bot
            
            # Отправляем системное сообщение в Telegram бота
            await send_system_message_to_bot({
                'telegram_chat_id': dialog.telegram_chat_id,
                'text': text,
                'system_type': system_type,
                'dialog_id': dialog_id
            })
            
            logger.info(f"System message sent to Telegram for dialog {dialog_id}: {text}")
            
        except Exception as e:
            logger.error(f"Error sending Telegram system message: {str(e)}")