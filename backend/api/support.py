from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime
import logging

from database import models, get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post('/support/send-to-admins')
def send_message_to_admins(data: dict, db: Session = Depends(get_db)):
    """
    Принимает сообщения от виджета и создает диалог для администраторов
    """
    try:
        guest_id = data.get('guest_id')
        message = data.get('message')
        timestamp = data.get('timestamp')
        source = data.get('source', 'dashboard_chat')
        
        if not guest_id or not message:
            raise HTTPException(status_code=400, detail="Missing required fields: guest_id and message")
        
        logger.info(f"Получено сообщение от виджета: guest_id={guest_id}, source={source}")
        
        # Ищем существующий диалог для этого guest_id
        dialog = db.query(models.Dialog).filter(
            models.Dialog.guest_id == guest_id
        ).order_by(models.Dialog.started_at.desc()).first()
        
        # Если диалог не найден или закрыт, создаем новый
        if not dialog or dialog.ended_at is not None:
            # Создаем новый диалог для анонимного пользователя
            # user_id = 1 - можно использовать ID администратора или системного пользователя
            admin_user = db.query(models.User).filter(models.User.role == 'admin').first()
            if not admin_user:
                # Если админа нет, используем первого пользователя
                admin_user = db.query(models.User).first()
            
            if not admin_user:
                raise HTTPException(status_code=500, detail="No users found in system")
            
            dialog = models.Dialog(
                user_id=admin_user.id,  # Привязываем к администратору
                guest_id=guest_id,
                started_at=datetime.utcnow(),
                auto_response=0,
                fallback=0,
                is_taken_over=0
            )
            db.add(dialog)
            db.commit()
            db.refresh(dialog)
            
            logger.info(f"Создан новый диалог #{dialog.id} для guest_id={guest_id}")
        
        # Создаем сообщение в диалоге
        dialog_message = models.DialogMessage(
            dialog_id=dialog.id,
            sender='user',  # Сообщение от пользователя виджета
            text=message,
            timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.utcnow()
        )
        db.add(dialog_message)
        db.commit()
        db.refresh(dialog_message)
        
        # 🔥 ПУБЛИКАЦИЯ СОБЫТИЯ В REDIS PUB/SUB ДЛЯ РЕАЛ-ТАЙМ ДОСТАВКИ
        try:
            from services.events_pubsub import publish_dialog_event
            import asyncio
            # Поскольку это sync функция, запускаем async операцию
            asyncio.create_task(publish_dialog_event(dialog.id, {
                "type": "message:new",
                "message": {
                    "id": dialog_message.id,
                    "sender": dialog_message.sender,
                    "text": dialog_message.text,
                    "timestamp": dialog_message.timestamp.isoformat() + 'Z'
                }
            }))
            logger.debug(f"📢 [SUPPORT] Published Redis event for dialog {dialog.id}, message {dialog_message.id}")
        except Exception as e:
            logger.error(f"❌ [SUPPORT] Failed to publish Redis event for dialog {dialog.id}: {e}")
        
        logger.info(f"Создано сообщение #{dialog_message.id} в диалоге #{dialog.id}")
        
        return {
            "success": True,
            "message": "Message sent to administrators",
            "dialog_id": dialog.id,
            "message_id": dialog_message.id
        }
        
    except Exception as e:
        logger.error(f"Ошибка при обработке сообщения от виджета: {e}")
        raise HTTPException(status_code=500, detail="Произошла ошибка при обработке запроса. Попробуйте позже.")