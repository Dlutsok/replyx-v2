from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List
import asyncio
import json
import jwt
import os
import logging
from datetime import datetime, timedelta

from database import models, schemas, auth, get_db
from ai import prompt_variations
from ai.ai_token_manager import ai_token_manager
# WebSocket removed - using SSE instead
# from services.websocket_manager import (...) - REMOVED
from services.sse_manager import push_sse_event
from services.handoff_service import HandoffService
from services.balance_service import BalanceService
from api.dialogs import broadcast_dialog_message

# Настройка логгера
logger = logging.getLogger(__name__)

router = APIRouter()

# Migrated to SSE - removed WebSocket connections

# JWT settings for site tokens
from core.app_config import SITE_SECRET
# Токены теперь бессрочные - проверяем только существование ассистента

# Импортируем функцию авторизации из отдельного модуля
from core.site_auth import get_current_site_user, get_current_site_user_simple

# Helper functions
def is_user_blocked(user: models.User) -> bool:
    """Проверка блокировки пользователя"""
    # Логика проверки пробного периода и блокировки
    # TODO: Реализовать проверку статуса пользователя
    return False

def get_user_message_limit(user: models.User) -> int:
    """Получает лимит сообщений для пользователя"""
    # TODO: Реализовать логику лимитов по тарифу
    return 1000

@router.get('/site-token')
def get_site_token(current_user: models.User = Depends(auth.get_current_user)):
    """Получает site token для пользователя"""
    payload = {
        'user_id': current_user.id,
        'type': 'site'
        # Убираем exp - токен бессрочный
    }
    token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    return {'site_token': token}

@router.post('/embed-code')
def generate_site_token(data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Генерирует embed код для ассистента"""
    assistant_id = data.get('assistant_id')
    if not assistant_id:
        raise HTTPException(status_code=400, detail="assistant_id required")
    
    # Проверяем, что ассистент принадлежит пользователю
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Создаем embed код с assistant_id (бессрочный токен)
    payload = {
        'user_id': current_user.id,
        'assistant_id': assistant_id,
        'type': 'site'
        # Убираем exp - токен бессрочный пока существует ассистент
    }
    site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    
    # Генерируем embed код
    theme = data.get('theme', 'blue')
    from core.app_config import FRONTEND_URL
    embed_code = f'''<div id="chatai-widget" data-assistant="{assistant_id}" data-token="{site_token}" data-theme="{theme}"></div>
<script src="{FRONTEND_URL}/widget.js?token={site_token}&assistant_id={assistant_id}&theme={theme}&host={FRONTEND_URL}"></script>'''
    
    return {'embed_code': embed_code}

@router.get('/site/dialogs')
def site_get_dialogs(
    guest_id: str = Query(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_site_user)
):
    """Получает диалоги site пользователя"""
    q = db.query(models.Dialog).filter(
        models.Dialog.user_id == current_user.id, 
        models.Dialog.guest_id == guest_id
    )
    dialogs = q.order_by(models.Dialog.started_at.desc()).all()
    
    result = []
    for d in dialogs:
        result.append({
            "id": d.id,
            "user_id": d.user_id,
            "guest_id": d.guest_id,
            "started_at": d.started_at.strftime('%Y-%m-%d %H:%M:%S') if d.started_at else None,
            "ended_at": d.ended_at.strftime('%Y-%m-%d %H:%M:%S') if d.ended_at else None,
            "auto_response": d.auto_response,

            "first_response_time": d.first_response_time,
            "fallback": d.fallback,
            "is_taken_over": d.is_taken_over or 0,
            "telegram_chat_id": d.telegram_chat_id,
            "telegram_username": d.telegram_username
        })
    return result

@router.get('/site/dialogs/{dialog_id}/messages')
def site_get_dialog_messages(
    dialog_id: int, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_site_user)
):
    """Получает сообщения site диалога"""
    # Используем eager loading для загрузки сообщений вместе с диалогом
    dialog = db.query(models.Dialog).options(
        joinedload(models.Dialog.messages)
    ).filter(
        models.Dialog.id == dialog_id, 
        models.Dialog.user_id == current_user.id, 
        models.Dialog.guest_id == guest_id
    ).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    messages = [
        {
            "id": m.id,
            "sender": m.sender,
            "text": m.text,
            "timestamp": m.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        } for m in sorted(dialog.messages, key=lambda x: x.timestamp)
    ]
    return messages

@router.post('/site/dialogs/{dialog_id}/messages')
async def site_add_dialog_message(
    dialog_id: int, 
    data: dict, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_site_user)
):
    """Добавляет сообщение в site диалог"""
    dialog = db.query(models.Dialog).filter(
        models.Dialog.id == dialog_id, 
        models.Dialog.user_id == current_user.id, 
        models.Dialog.guest_id == guest_id
    ).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # CHECK IF DIALOG IS TAKEN OVER - блокируем AI при запросе И взятии оператором (как в телеграме)
    is_taken_over = getattr(dialog, 'handoff_status', 'none') in ['requested', 'active']
    
    # If dialog is taken over, only allow manager messages, no AI responses
    if is_taken_over and data.get('sender') == 'user':
        logger.info(f"Dialog {dialog_id} is taken over, blocking AI response")
        # Don't generate AI response for taken over dialogs
        pass
    
    sender = data.get('sender')
    text = data.get('text')
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    
    # Проверка блокировки пользователя
    if is_user_blocked(current_user):
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "trial_expired",
                "message": "Ваш пробный период завершился. Обновите план для продолжения использования.",
                "needsUpgrade": True
            }
        )

    # Лимит по тарифу
    limit = get_user_message_limit(current_user)
    month_ago = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    msg_count = db.query(models.DialogMessage).join(models.Dialog).filter(
        models.Dialog.user_id == current_user.id,
        models.Dialog.guest_id == guest_id,
        models.DialogMessage.timestamp >= month_ago,
        models.DialogMessage.sender == 'assistant'
    ).count()
    
    if msg_count > limit:
        raise HTTPException(
            status_code=403, 
            detail="Лимит сообщений по вашему тарифу исчерпан. Для продолжения выберите другой тариф."
        )
    
    # Создаем сообщение
    msg = models.DialogMessage(dialog_id=dialog_id, sender=sender, text=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # 🔥 ПУБЛИКАЦИЯ СОБЫТИЯ В REDIS PUB/SUB ДЛЯ РЕАЛ-ТАЙМ ДОСТАВКИ
    message_data = {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.isoformat() + 'Z'
    }
    
    logger.info(f"🚀 [WIDGET→ADMIN] Отправляем сообщение от {sender} в диалоге {dialog_id}")
    logger.info(f"🚀 [WIDGET→ADMIN] Данные сообщения: {message_data}")
    
    try:
        from services.events_pubsub import publish_dialog_event
        success = await publish_dialog_event(dialog_id, {
            "type": "message:new",
            "message": message_data
        })
        
        if success:
            logger.info(f"✅ [WIDGET→ADMIN] Redis Pub/Sub успешно: dialog_id={dialog_id}, message_id={msg.id}")
        else:
            logger.error(f"❌ [WIDGET→ADMIN] Redis Pub/Sub НЕУДАЧНО: dialog_id={dialog_id}, message_id={msg.id}")
            
    except Exception as e:
        logger.error(f"❌ [WIDGET→ADMIN] ОШИБКА Redis Pub/Sub для dialog {dialog_id}: {e}")
        import traceback
        logger.error(f"❌ [WIDGET→ADMIN] Traceback: {traceback.format_exc()}")
    
    # Для сообщений пользователя отправляем только в админ панель
    # ИСПРАВЛЕНО: Отправляем в виджет тоже через SSE для консистентности
    if msg.sender == 'user':
        user_message_data = {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() + 'Z'
        }
        # Диагностическое логирование для отладки доставки в админку
        from services.sse_manager import get_sse_stats as get_connection_stats
        stats = get_connection_stats()
        logger.info(
            f"[MSG_BROADCAST] dialog={dialog_id} sender=user admin_conns={stats['connection_details']['admin_connections']} site_conns={stats['connection_details']['site_connections']}"
        )
        
        # Отправляем в ОБА канала: админ И виджет для консистентности SSE
        # 🔥 ПУБЛИКУЕМ СОБЫТИЕ ЧЕРЕЗ REDIS PUB/SUB ДЛЯ ДОСТАВКИ В АДМИНКУ
        try:
            from services.events_pubsub import publish_dialog_event
            await publish_dialog_event(dialog_id, {
                "type": "message:new",
                "message": user_message_data
            })
            logger.info(f"✅ [WIDGET→ADMIN] Сообщение пользователя опубликовано в Redis: dialog_id={dialog_id}, message_id={msg.id}")
        except Exception as e:
            logger.error(f"❌ [WIDGET→ADMIN] Ошибка публикации в Redis для dialog {dialog_id}: {e}")
        
        # СТРАХОВОЧНЫЙ механизм: если админ не подключён, предупреждаем
        if stats['connection_details']['admin_connections'] == 0:
            logger.warning(f"[MSG_BROADCAST] ❌ No admin connections for dialog {dialog_id} - user message may be lost!")
    else:
        # Для сообщений НЕ от пользователя (менеджер, система) отправляем в оба канала
        message_data = {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() + 'Z'
        }
        # 🔥 ПУБЛИКУЕМ СОБЫТИЕ ЧЕРЕЗ REDIS PUB/SUB ДЛЯ ДОСТАВКИ В АДМИНКУ
        try:
            from services.events_pubsub import publish_dialog_event
            await publish_dialog_event(dialog_id, {
                "type": "message:new",
                "message": message_data
            })
            logger.info(f"✅ [WIDGET→ADMIN] Сообщение НЕ-пользователя опубликовано в Redis: dialog_id={dialog_id}, message_id={msg.id}")
        except Exception as e:
            logger.error(f"❌ [WIDGET→ADMIN] Ошибка публикации в Redis для dialog {dialog_id}: {e}")
    
    response_msg = None
    if sender == 'user' and not is_taken_over:
        # АВТОТРИГГЕР: Улучшенная система определения handoff с контекстным анализом
        from services.improved_handoff_detector import ImprovedHandoffDetector
        handoff_service = HandoffService(db)
        detector = ImprovedHandoffDetector()
        
        # Проверяем не был ли недавно освобожден диалог (избегаем ложных срабатываний)
        recent_release = db.query(models.HandoffAudit).filter(
            models.HandoffAudit.dialog_id == dialog_id,
            models.HandoffAudit.to_status == 'released',
            models.HandoffAudit.created_at > datetime.now() - timedelta(minutes=5)
        ).first()
        
        # Используем улучшенную систему определения handoff
        should_handoff_detected, handoff_reason, handoff_details = detector.should_request_handoff(
            user_text=text or '',
            dialog=dialog
        )
        
        should_trigger_handoff = (
            should_handoff_detected and
            not recent_release and
            dialog.handoff_status != 'requested' and
            dialog.handoff_status != 'active'
        )
        
        # 🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА HANDOFF ЛОГИКИ
        logger.info(f"🔍 HANDOFF DIAGNOSIS for dialog {dialog_id}:")
        logger.info(f"   should_handoff_detected: {should_handoff_detected} (reason: {handoff_reason})")
        logger.info(f"   recent_release: {'Yes' if recent_release else 'No'}")
        logger.info(f"   dialog.handoff_status: {dialog.handoff_status}")
        logger.info(f"   FINAL should_trigger_handoff: {should_trigger_handoff}")
        if should_handoff_detected and not should_trigger_handoff:
            logger.warning(f"🚨 HANDOFF BLOCKED! Detection worked but conditions failed")
        
        if should_trigger_handoff:
            try:
                from uuid import uuid4
                new_request_id = str(uuid4())
                # Подробное логирование причин handoff
                matched_patterns = [p['description'] for p in handoff_details.get('matched_patterns', [])]
                logger.info(f"🔄 Auto-triggering handoff for dialog {dialog_id}")
                logger.info(f"   Reason: {handoff_reason}")
                logger.info(f"   Score: {handoff_details.get('total_score', 0):.2f}")
                logger.info(f"   Patterns: {matched_patterns}")
                logger.info(f"   User text: {text[:100] if text else 'None'}...")
                
                handoff_result = handoff_service.request_handoff(
                    dialog_id=dialog_id,
                    reason=handoff_reason,  # Используем точную причину от детектора
                    request_id=new_request_id,
                    last_user_text=text[:200] if text else None
                )
                
                # Уведомление о handoff будет отправлено через handoff_service автоматически
                
                # Останавливаем генерацию AI ответа
                await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
                
                return {
                    "user_message": {
                        "id": msg.id,
                        "sender": msg.sender,
                        "text": msg.text,
                        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    },
                    "handoff_triggered": True,
                    "handoff_status": handoff_result.status
                }
                
            except Exception as e:
                logger.error(f"Failed to auto-trigger handoff: {e}")
                # НЕ продолжаем с AI ответом даже при ошибке handoff
                return {
                    "user_message": {
                        "id": msg.id,
                        "sender": msg.sender,
                        "text": msg.text,
                        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    },
                    "handoff_triggered": True,
                    "handoff_error": str(e)
                }
        
        # Отправляем typing_start только если handoff НЕ сработал
        await ws_push_site_dialog_message(dialog_id, {"type": "typing_start"})
        
        # Списываем средства за AI сообщение ПЕРЕД генерацией ответа
        balance_service = BalanceService(db)
        try:
            transaction = balance_service.charge_for_service(
                current_user.id,
                'widget_message',
                f"AI сообщение в виджете (диалог #{dialog_id})",
                msg.id  # related_id - ID пользовательского сообщения
            )
            logger.info(f"Списано {abs(transaction.amount)} руб. за AI сообщение в виджете пользователя {current_user.id}")
        except ValueError as e:
            logger.error(f"Ошибка списания средств за AI сообщение в виджете: {e}")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_funds",
                    "message": "Недостаточно средств для отправки AI сообщения",
                    "needsTopUp": True
                }
            )
        except Exception as e:
            logger.error(f"Ошибка списания средств за AI сообщение в виджете: {e}")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "payment_failed",
                    "message": "Ошибка списания средств. Попробуйте позже.",
                    "needsTopUp": True
                }
            )
        
        # Генерируем AI ответ только если диалог не перехвачен
        response_msg = await generate_ai_response(dialog_id, current_user, db)
        
        # 🔥 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА HANDOFF ПЕРЕД ОТПРАВКОЙ ОТВЕТА (как в телеграме)
        dialog_after_ai = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if dialog_after_ai and getattr(dialog_after_ai, 'handoff_status', 'none') in ['requested', 'active']:
            logger.info(f"🛑 Диалог {dialog_id} перехвачен во время обработки AI ответа, не отправляем ответ")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            return {
                "user_message": {
                    "id": msg.id,
                    "sender": msg.sender,
                    "text": msg.text,
                    "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                },
                "ai_blocked": True,
                "reason": "dialog_taken_over_during_processing"
            }
        
        # Отправляем typing_stop и ответ
        await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
        
        if response_msg:
            # Отправляем AI ответ в оба канала (админ и виджет)
            ai_response_data = {
                "id": response_msg.id,
                "sender": response_msg.sender,
                "text": response_msg.text,
                "timestamp": response_msg.timestamp.isoformat() + 'Z'
            }
            # Используем универсальный broadcast для гарантированной доставки
            await broadcast_dialog_message(dialog_id, ai_response_data)
    elif sender == 'user' and is_taken_over:
        # Диалог перехвачен - только уведомляем о получении сообщения
        await ws_push_site_dialog_message(dialog_id, {
            "type": "message_received",
            "message": "Ваше сообщение получено. Оператор ответит в ближайшее время."
        })
    
    return {
        "user_message": {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        },
        "assistant_message": response_msg and {
            "id": response_msg.id,
            "sender": response_msg.sender,
            "text": response_msg.text,
            "timestamp": response_msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }
    }

@router.post('/site/dialogs')
def site_create_dialog(
    guest_id: str = Query(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_site_user)
):
    """Создает новый site диалог (идемпотентно)"""
    # Проверяем, есть ли уже активный диалог для этого guest_id и пользователя
    existing_dialog = db.query(models.Dialog).filter(
        models.Dialog.guest_id == guest_id,
        models.Dialog.user_id == current_user.id,
        models.Dialog.ended_at.is_(None)  # только активные диалоги
    ).order_by(models.Dialog.started_at.desc()).first()
    
    if existing_dialog:
        logger.info(f"Returning existing dialog {existing_dialog.id} for guest_id={guest_id}, user_id={current_user.id}")
        return {"id": existing_dialog.id}
    
    # Создаем новый диалог только если активного нет
    dialog = models.Dialog(
        user_id=current_user.id, 
        guest_id=guest_id, 
        started_at=datetime.utcnow(), 
        auto_response=0, 
        fallback=0, 
        is_taken_over=0
    )
    db.add(dialog)
    db.commit()
    db.refresh(dialog)
    logger.info(f"Created new dialog {dialog.id} for guest_id={guest_id}, user_id={current_user.id}")
    return {"id": dialog.id}

# Widget endpoints (без авторизации)
@router.get('/widget/dialogs')
def widget_get_dialogs(
    assistant_id: int, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db)
):
    """Получает диалоги widget пользователя"""
    # Получаем ассистента и его пользователя
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    dialogs = db.query(models.Dialog).filter(
        models.Dialog.guest_id == guest_id, 
        models.Dialog.user_id == assistant.user_id
    ).order_by(models.Dialog.started_at.desc()).all()
    
    result = []
    for d in dialogs:
        result.append({
            "id": d.id,
            "user_id": d.user_id,
            "guest_id": d.guest_id,
            "started_at": d.started_at.strftime('%Y-%m-%d %H:%M:%S') if d.started_at else None,
            "ended_at": d.ended_at.strftime('%Y-%m-%d %H:%M:%S') if d.ended_at else None,
            "auto_response": d.auto_response,

            "first_response_time": d.first_response_time,
            "fallback": d.fallback,
            "is_taken_over": d.is_taken_over or 0,
            "telegram_chat_id": d.telegram_chat_id,
            "telegram_username": d.telegram_username
        })
    return result

@router.post('/widget/dialogs')
def widget_create_dialog(
    assistant_id: int, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db)
):
    """Создает новый widget диалог (идемпотентно)"""
    # Получаем ассистента и его пользователя
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Проверяем, есть ли уже активный диалог для этого guest_id и ассистента
    existing_dialog = db.query(models.Dialog).filter(
        models.Dialog.guest_id == guest_id,
        models.Dialog.user_id == assistant.user_id,
        models.Dialog.ended_at.is_(None)  # только активные диалоги
    ).order_by(models.Dialog.started_at.desc()).first()
    
    if existing_dialog:
        logger.info(f"Returning existing widget dialog {existing_dialog.id} for guest_id={guest_id}, assistant_id={assistant_id}")
        return {"id": existing_dialog.id}
    
    # Создаем новый диалог только если активного нет
    dialog = models.Dialog(
        user_id=assistant.user_id, 
        guest_id=guest_id, 
        started_at=datetime.utcnow(), 
        auto_response=0, 
        fallback=0, 
        is_taken_over=0
    )
    db.add(dialog)
    db.commit()
    db.refresh(dialog)
    logger.info(f"Created new widget dialog {dialog.id} for guest_id={guest_id}, assistant_id={assistant_id}")
    return {"id": dialog.id}

@router.get('/widget/dialogs/{dialog_id}/messages')
def widget_get_dialog_messages(
    dialog_id: int, 
    assistant_id: int, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db)
):
    """Получает сообщения widget диалога"""
    # Получаем ассистента и его пользователя
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    dialog = db.query(models.Dialog).options(
        joinedload(models.Dialog.messages)
    ).filter(
        models.Dialog.id == dialog_id, 
        models.Dialog.user_id == assistant.user_id, 
        models.Dialog.guest_id == guest_id
    ).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    messages = [
        {
            "id": m.id,
            "sender": m.sender,
            "text": m.text,
            "timestamp": m.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        } for m in sorted(dialog.messages, key=lambda x: x.timestamp)
    ]
    return messages

@router.post('/widget/dialogs/{dialog_id}/messages')
async def widget_add_dialog_message(
    dialog_id: int, 
    data: dict, 
    assistant_id: int, 
    guest_id: str = Query(...), 
    db: Session = Depends(get_db)
):
    """Добавляет сообщение в widget диалог"""
    # Получаем ассистента и его пользователя
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    dialog = db.query(models.Dialog).filter(
        models.Dialog.id == dialog_id, 
        models.Dialog.user_id == assistant.user_id, 
        models.Dialog.guest_id == guest_id
    ).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # CHECK IF WIDGET DIALOG IS TAKEN OVER - блокируем AI при запросе И взятии оператором (как в телеграме)
    is_taken_over = getattr(dialog, 'handoff_status', 'none') in ['requested', 'active']
    
    # If dialog is taken over, only allow manager messages, no AI responses
    if is_taken_over and data.get('sender') == 'user':
        logger.info(f"Widget dialog {dialog_id} is taken over, blocking AI response")
    
    sender = data.get('sender')
    text = data.get('text')
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    
    # Создаем сообщение
    msg = models.DialogMessage(dialog_id=dialog_id, sender=sender, text=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Для сообщений пользователя отправляем только в админ панель
    # ИСПРАВЛЕНО: Отправляем в виджет тоже через SSE для консистентности
    if msg.sender == 'user':
        user_message_data = {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() + 'Z'
        }
        # Диагностическое логирование для отладки доставки в админку
        from services.sse_manager import get_sse_stats as get_connection_stats
        stats = get_connection_stats()
        logger.info(
            f"[MSG_BROADCAST] dialog={dialog_id} sender=user admin_conns={stats['connection_details']['admin_connections']} site_conns={stats['connection_details']['site_connections']}"
        )
        
        # Отправляем в ОБА канала: админ И виджет для консистентности SSE
        # 🔥 ПУБЛИКУЕМ СОБЫТИЕ ЧЕРЕЗ REDIS PUB/SUB ДЛЯ ДОСТАВКИ В АДМИНКУ
        try:
            from services.events_pubsub import publish_dialog_event
            await publish_dialog_event(dialog_id, {
                "type": "message:new",
                "message": user_message_data
            })
            logger.info(f"✅ [WIDGET→ADMIN] Сообщение пользователя опубликовано в Redis: dialog_id={dialog_id}, message_id={msg.id}")
        except Exception as e:
            logger.error(f"❌ [WIDGET→ADMIN] Ошибка публикации в Redis для dialog {dialog_id}: {e}")
        
        # СТРАХОВОЧНЫЙ механизм: если админ не подключён, предупреждаем
        if stats['connection_details']['admin_connections'] == 0:
            logger.warning(f"[MSG_BROADCAST] ❌ No admin connections for dialog {dialog_id} - user message may be lost!")
    else:
        # Для сообщений НЕ от пользователя (менеджер, система) отправляем в оба канала
        message_data = {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() + 'Z'
        }
        # 🔥 ПУБЛИКУЕМ СОБЫТИЕ ЧЕРЕЗ REDIS PUB/SUB ДЛЯ ДОСТАВКИ В АДМИНКУ
        try:
            from services.events_pubsub import publish_dialog_event
            await publish_dialog_event(dialog_id, {
                "type": "message:new",
                "message": message_data
            })
            logger.info(f"✅ [WIDGET→ADMIN] Сообщение НЕ-пользователя опубликовано в Redis: dialog_id={dialog_id}, message_id={msg.id}")
        except Exception as e:
            logger.error(f"❌ [WIDGET→ADMIN] Ошибка публикации в Redis для dialog {dialog_id}: {e}")
    
    response_msg = None
    if sender == 'user' and not is_taken_over:
        # АВТОТРИГГЕР для widget: Улучшенная система определения handoff
        from services.improved_handoff_detector import ImprovedHandoffDetector
        handoff_service = HandoffService(db)
        detector = ImprovedHandoffDetector()
        
        # Проверяем не был ли недавно освобожден диалог (избегаем ложных срабатываний)
        recent_release = db.query(models.HandoffAudit).filter(
            models.HandoffAudit.dialog_id == dialog_id,
            models.HandoffAudit.to_status == 'released',
            models.HandoffAudit.created_at > datetime.now() - timedelta(minutes=5)
        ).first()
        
        # Используем улучшенную систему определения handoff
        should_handoff_detected, handoff_reason, handoff_details = detector.should_request_handoff(
            user_text=text or '',
            dialog=dialog
        )
        
        should_trigger_handoff = (
            should_handoff_detected and
            not recent_release and
            dialog.handoff_status != 'requested' and
            dialog.handoff_status != 'active'
        )
        
        # 🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА HANDOFF ЛОГИКИ
        logger.info(f"🔍 HANDOFF DIAGNOSIS for dialog {dialog_id}:")
        logger.info(f"   should_handoff_detected: {should_handoff_detected} (reason: {handoff_reason})")
        logger.info(f"   recent_release: {'Yes' if recent_release else 'No'}")
        logger.info(f"   dialog.handoff_status: {dialog.handoff_status}")
        logger.info(f"   FINAL should_trigger_handoff: {should_trigger_handoff}")
        if should_handoff_detected and not should_trigger_handoff:
            logger.warning(f"🚨 HANDOFF BLOCKED! Detection worked but conditions failed")
        
        if should_trigger_handoff:
            try:
                from uuid import uuid4
                new_request_id = str(uuid4())
                # Подробное логирование причин handoff для widget
                matched_patterns = [p['description'] for p in handoff_details.get('matched_patterns', [])]
                logger.info(f"🔄 Auto-triggering handoff for widget dialog {dialog_id}")
                logger.info(f"   Reason: {handoff_reason}")
                logger.info(f"   Score: {handoff_details.get('total_score', 0):.2f}")
                logger.info(f"   Patterns: {matched_patterns}")
                logger.info(f"   User text: {text[:100] if text else 'None'}...")
                
                handoff_result = handoff_service.request_handoff(
                    dialog_id=dialog_id,
                    reason=handoff_reason,  # Используем точную причину от детектора
                    request_id=new_request_id,
                    last_user_text=text[:200] if text else None
                )
                
                # Уведомление о handoff будет отправлено через handoff_service автоматически
                
                # Останавливаем генерацию AI ответа
                await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
                
                return {
                    "user_message": {
                        "id": msg.id,
                        "sender": msg.sender,
                        "text": msg.text,
                        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    },
                    "handoff_triggered": True,
                    "handoff_status": handoff_result.status
                }
                
            except Exception as e:
                logger.error(f"Failed to auto-trigger handoff: {e}")
                # НЕ продолжаем с AI ответом даже при ошибке handoff
                return {
                    "user_message": {
                        "id": msg.id,
                        "sender": msg.sender,
                        "text": msg.text,
                        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    },
                    "handoff_triggered": True,
                    "handoff_error": str(e)
                }
        
        # Отправляем typing_start только если handoff НЕ сработал
        await ws_push_site_dialog_message(dialog_id, {"type": "typing_start"})
        
        # Списываем средства за AI сообщение ПЕРЕД генерацией ответа (widget)
        user = db.query(models.User).filter(models.User.id == assistant.user_id).first()
        if not user:
            logger.error(f"User not found for assistant {assistant_id}")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            raise HTTPException(status_code=404, detail="User not found")
        
        balance_service = BalanceService(db)
        try:
            transaction = balance_service.charge_for_service(
                user.id,
                'widget_message',
                f"AI сообщение в виджете (диалог #{dialog_id})",
                msg.id  # related_id - ID пользовательского сообщения
            )
            logger.info(f"Списано {abs(transaction.amount)} руб. за AI сообщение в виджете пользователя {user.id}")
        except ValueError as e:
            logger.error(f"Ошибка списания средств за AI сообщение в виджете: {e}")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_funds",
                    "message": "Недостаточно средств для отправки AI сообщения",
                    "needsTopUp": True
                }
            )
        except Exception as e:
            logger.error(f"Ошибка списания средств за AI сообщение в виджете: {e}")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "payment_failed",
                    "message": "Ошибка списания средств. Попробуйте позже.",
                    "needsTopUp": True
                }
            )
        
        # Генерируем AI ответ для widget только если диалог не перехвачен
        user.widget_assistant_id = assistant_id
        response_msg = await generate_ai_response(dialog_id, user, db)
        
        # 🔥 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА HANDOFF ПЕРЕД ОТПРАВКОЙ ОТВЕТА (как в телеграме)
        dialog_after_ai = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if dialog_after_ai and getattr(dialog_after_ai, 'handoff_status', 'none') in ['requested', 'active']:
            logger.info(f"🛑 Widget диалог {dialog_id} перехвачен во время обработки AI ответа, не отправляем ответ")
            await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
            return {
                "user_message": {
                    "id": msg.id,
                    "sender": msg.sender,
                    "text": msg.text,
                    "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                },
                "ai_blocked": True,
                "reason": "dialog_taken_over_during_processing"
            }
        
        # Отправляем typing_stop и ответ
        await ws_push_site_dialog_message(dialog_id, {"type": "typing_stop"})
        
        # Отправляем ответ бота через Redis Pub/Sub (SSE менеджер доставит всем подписчикам)
        if response_msg:
            ai_response_data = {
                "id": response_msg.id,
                "sender": response_msg.sender,
                "text": response_msg.text,
                "timestamp": response_msg.timestamp.isoformat() + 'Z'
            }
            try:
                from services.events_pubsub import publish_dialog_event
                await publish_dialog_event(dialog_id, {
                    "type": "message:new",
                    "message": ai_response_data
                })
            except Exception as e:
                logger.error(f"❌ Failed to publish AI response via Redis for dialog {dialog_id}: {e}")
    elif sender == 'user' and is_taken_over:
        # Widget диалог перехвачен - только уведомляем о получении сообщения через Redis Pub/Sub
        try:
            from services.events_pubsub import publish_dialog_event
            await publish_dialog_event(dialog_id, {
                "type": "message_received",
                "message": "Ваше сообщение получено. Оператор ответит в ближайшее время."
            })
        except Exception as e:
            logger.error(f"❌ Failed to publish 'message_received' via Redis for dialog {dialog_id}: {e}")
    
    return {
        "user_message": {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        },
        "assistant_message": response_msg and {
            "id": response_msg.id,
            "sender": response_msg.sender,
            "text": response_msg.text,
            "timestamp": response_msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }
    }

# Helper functions - migrated to SSE
async def push_site_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение через SSE"""
    try:
        await push_sse_event(dialog_id, message)
    except Exception as e:
        logger.error(f"Failed to push SSE event: {e}")

async def push_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение через SSE"""
    try:
        await push_sse_event(dialog_id, message)
    except Exception as e:
        logger.error(f"Failed to push SSE event: {e}")

async def ws_push_site_dialog_message(dialog_id: int, message: dict):
    """Alias for SSE compatibility"""
    await push_site_dialog_message(dialog_id, message)

def get_connection_stats():
    """SSE connection stats"""
    try:
        from services.sse_manager import get_sse_stats
        return get_sse_stats()
    except Exception:
        return {'connection_details': {'admin_connections': 0, 'site_connections': 0}}

async def generate_ai_response(dialog_id: int, current_user: models.User, db: Session) -> models.DialogMessage:
    """Генерирует AI ответ для диалога"""
    try:
        messages = db.query(models.DialogMessage).filter(
            models.DialogMessage.dialog_id == dialog_id
        ).order_by(models.DialogMessage.timestamp).all()
        
        prompt_messages = []
        for m in messages:
            role = 'assistant' if m.sender == 'assistant' else 'user'
            prompt_messages.append({"role": role, "content": m.text})
        
        # Получаем ассистента из токена виджета или активного ассистента пользователя
        target_assistant = None
        if hasattr(current_user, 'widget_assistant_id') and current_user.widget_assistant_id:
            target_assistant = db.query(models.Assistant).filter(
                models.Assistant.id == current_user.widget_assistant_id,
                models.Assistant.user_id == current_user.id
            ).first()
        
        if not target_assistant:
            target_assistant = db.query(models.Assistant).filter(
                models.Assistant.user_id == current_user.id,
                models.Assistant.is_active == True
            ).first()
        
        # Используем настройки целевого ассистента или дефолтные
        ai_model = 'gpt-4o-mini'
        base_system_prompt = 'Ты ассистент службы поддержки этой компании. Помогай клиентам с вопросами о продуктах и услугах компании.\n\nПРИОРИТЕТЫ:\n1. База знаний компании (основной источник)\n2. Практические советы в контексте деятельности компании\n3. Общие рекомендации если они полезны клиенту\n\nОТВЕЧАЙ на вопросы о:\n- Продуктах/услугах компании\n- Технических проблемах с сайтом\n- Процедурах и процессах компании\n\nНЕ ОТВЕЧАЙ на:\n- Вопросы не связанные с компанией\n- Математику, программирование (если не относится к услугам)\n- Другие компании/конкуренты\n\nПри недостатке информации направляй к менеджеру.'
        
        if target_assistant:
            ai_model = target_assistant.ai_model or ai_model
            base_system_prompt = target_assistant.system_prompt or base_system_prompt
        
        # Добавляем вариативность и контекстные инструкции
        system_prompt = prompt_variations.add_response_variety_instructions(base_system_prompt)
        
        # ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПРОМПТА В SITE.PY
        logger.info("🔍 [SITE_PROMPT_DEBUG] ===== СИСТЕМНЫЙ ПРОМПТ В SITE.PY =====")
        logger.info(f"🔍 [SITE_PROMPT_DEBUG] Базовый промпт: {base_system_prompt[:300]}...")
        logger.info(f"🔍 [SITE_PROMPT_DEBUG] Финальный промпт: {system_prompt}")
        logger.info("🔍 [SITE_PROMPT_DEBUG] ===== КОНЕЦ ПРОМПТА =====")

        # ВСТАВЛЯЕМ ОСНОВНОЙ СИСТЕМНЫЙ ПРОМПТ В НАЧАЛО МАССИВА СООБЩЕНИЙ
        try:
            prompt_messages.insert(0, {"role": "system", "content": system_prompt})
        except Exception as e:
            logger.error(f"Failed to insert base system prompt into messages: {e}")
        
        # 🚀 RETRIEVAL-BASED ПОИСК ДЛЯ ВЕБ-ВИДЖЕТА
        # Получаем последнее сообщение пользователя для поиска релевантного контекста
        user_message = ""
        if prompt_messages:
            for msg in reversed(prompt_messages):
                if msg["role"] == "user":
                    user_message = msg["content"]
                    break
        
        relevant_chunks = []
        if user_message:
            # Сначала пробуем embeddings
            try:
                from services.embeddings_service import embeddings_service
                
                # Ищем релевантные чанки для запроса
                from core.app_config import RAG_TOP_K_WIDGET
                relevant_chunks = embeddings_service.search_relevant_chunks(
                    query=user_message,
                    user_id=current_user.id,
                    assistant_id=target_assistant.id if target_assistant else None,
                    top_k=RAG_TOP_K_WIDGET,
                    min_similarity=0.1,   # Временно понижен для диагностики S3 проблемы
                    include_qa=True,  # Включаем Q&A поиск
                    qa_limit=2,       # Максимум 2 Q&A результата для виджета
                    db=db
                )
                
                logger.info(f"Web widget embeddings: found {len(relevant_chunks)} chunks")
                
            except Exception as e:
                logger.warning(f"Embeddings search failed: {e}")
                relevant_chunks = []
            
            # Если embeddings не дали результатов, используем fallback
            if not relevant_chunks:
                logger.info("Web widget using fallback knowledge system...")
                
                # Fallback к старой системе
                if target_assistant:
                    knowledge_entries = db.query(models.UserKnowledge).filter(
                        models.UserKnowledge.user_id == current_user.id,
                        models.UserKnowledge.assistant_id == target_assistant.id
                    ).all()
                else:
                    knowledge_entries = db.query(models.UserKnowledge).filter(
                        models.UserKnowledge.user_id == current_user.id
                    ).all()
                
                logger.info(f"Web widget fallback: found {len(knowledge_entries)} knowledge entries")
                
                for entry in knowledge_entries[:3]:  # Ограничиваем количество
                    relevant_chunks.append({
                        'text': entry.content,
                        'doc_type': entry.doc_type or 'document',
                        'importance': entry.importance or 10,
                        'similarity': 0.8,
                        'token_count': len(entry.content) // 4
                    })
        
        # Добавляем релевантный контекст в промпт
        if relevant_chunks:
            from core.app_config import RAG_MAX_CONTEXT_TOKENS_WIDGET
            from services.embeddings_service import embeddings_service
            context_parts, total_tokens = embeddings_service.build_context_messages(relevant_chunks, max_context_tokens=RAG_MAX_CONTEXT_TOKENS_WIDGET)
            
            if context_parts:
                docs_text = '\n---\n'.join(context_parts)
                prompt_messages.insert(1, {
                    "role": "system", 
                    "content": f"ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ из базы знаний компании (используй только если вопрос относится к твоей компетенции согласно основным ограничениям):\n\n{docs_text}\n\nВАЖНО: Соблюдай все ограничения из основного промпта. Если вопрос НЕ касается компании (например, математика, программирование), НЕ отвечай на него, даже если есть какая-то информация в базе знаний."
                })
                logger.info(f"Added {len(context_parts)} chunks to web widget context ({total_tokens} tokens)")
        
        # ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ВСЕГО МАССИВА СООБЩЕНИЙ
        try:
            logger.info("🔍 [SITE_MESSAGES_DEBUG] ===== ВСЕ СООБЩЕНИЯ ДЛЯ AI =====")
            for i, m in enumerate(prompt_messages):
                preview = (m.get('content') or '')[:500]
                logger.info(f"🔍 [SITE_MESSAGES_DEBUG] Сообщение {i+1} ({m.get('role')}): {preview}...")
            logger.info("🔍 [SITE_MESSAGES_DEBUG] ===== КОНЕЦ СООБЩЕНИЙ =====")
        except Exception as e:
            logger.error(f"Failed to log messages for AI: {e}")

        # 🚀 КРИТИЧНО: Оборачиваем синхронный AI запрос в async чтобы не блокировать event loop
        completion = await asyncio.to_thread(
            ai_token_manager.make_openai_request,
            messages=prompt_messages,
            model=ai_model,
            user_id=current_user.id,
            assistant_id=target_assistant.id if target_assistant else None,
            temperature=0.9,
            max_tokens=1000,
            presence_penalty=0.3,
            frequency_penalty=0.3,
            is_widget=True  # 🚀 Используем более быстрый timeout для виджета (15сек вместо 30сек)
        )
        
        response = completion.choices[0].message.content.strip()
        
        response_msg = models.DialogMessage(
            dialog_id=dialog_id, 
            sender='assistant', 
            text=response
        )
        db.add(response_msg)
        db.commit()
        db.refresh(response_msg)
        
        # Рассчитываем время ответа (если это первый ответ ассистента в диалоге)
        dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if dialog and not dialog.first_response_time:
            # Ищем первое сообщение пользователя в этом диалоге
            first_user_msg = db.query(models.DialogMessage).filter(
                models.DialogMessage.dialog_id == dialog_id,
                models.DialogMessage.sender == 'user'
            ).order_by(models.DialogMessage.timestamp).first()
            
            if first_user_msg:
                response_time = (response_msg.timestamp - first_user_msg.timestamp).total_seconds()
                dialog.first_response_time = response_time
                db.commit()
        
        # Инвалидируем кэш метрик пользователя после успешного ответа ИИ
        try:
            from cache.redis_cache import chatai_cache
            chatai_cache.invalidate_user_cache(current_user.id)
            logger.info(f"Invalidated metrics cache for user {current_user.id}")
        except Exception as e:
            logger.warning(f"Failed to invalidate user cache: {e}")
        
        return response_msg
    
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        # Возвращаем стандартный ответ в случае ошибки
        error_msg = models.DialogMessage(
            dialog_id=dialog_id, 
            sender='assistant', 
            text="Извините, произошла ошибка при генерации ответа. Попробуйте еще раз."
        )
        db.add(error_msg)
        db.commit()
        db.refresh(error_msg)
        
        # Рассчитываем время ответа даже для ошибок (если это первый ответ ассистента в диалоге)
        try:
            dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
            if dialog and not dialog.first_response_time:
                # Ищем первое сообщение пользователя в этом диалоге
                first_user_msg = db.query(models.DialogMessage).filter(
                    models.DialogMessage.dialog_id == dialog_id,
                    models.DialogMessage.sender == 'user'
                ).order_by(models.DialogMessage.timestamp).first()
                
                if first_user_msg:
                    response_time = (error_msg.timestamp - first_user_msg.timestamp).total_seconds()
                    dialog.first_response_time = response_time
                    db.commit()
        except Exception:
            # Игнорируем ошибки при расчёте времени ответа в блоке ошибок
            pass
        
        # Инвалидируем кэш метрик пользователя после ответа ИИ (даже при ошибке)
        try:
            from cache.redis_cache import chatai_cache
            chatai_cache.invalidate_user_cache(current_user.id)
            logger.info(f"Invalidated metrics cache for user {current_user.id}")
        except Exception as e:
            logger.warning(f"Failed to invalidate user cache: {e}")
        
        return error_msg

# === EMBED CODE ENDPOINTS ===

@router.get("/embed-code")
def get_embed_code(
    theme: str = Query('blue', enum=['blue', 'green', 'purple', 'orange']),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Генерирует embed код для сайта с разными вариантами интеграции"""
    
    # Используем переменные окружения для URL
    from core.app_config import FRONTEND_URL
    
    payload = {
        'user_id': current_user.id,
        'type': 'site'
        # Убираем exp - токен бессрочный
    }
    site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    
    # Разные варианты embed кода
    codes = {
        "floating": f'<iframe src="{FRONTEND_URL}/chat-iframe?site_token={site_token}&theme={theme}" width="350" height="500" frameborder="0" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);"></iframe>',
        "inline": f'<iframe src="{FRONTEND_URL}/chat-iframe?site_token={site_token}&theme={theme}" width="100%" height="600" frameborder="0" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);"></iframe>',
        "mobile": f'<iframe src="{FRONTEND_URL}/chat-iframe?site_token={site_token}&theme={theme}" width="100%" height="100%" frameborder="0" style="position: fixed; top: 0; left: 0; z-index: 10000; display: none;" id="mobile-chat"></iframe>'
    }
    
    return {
        "embed_code": codes["floating"],
        "codes": codes,
        "theme": theme,
        "instructions": {
            "floating": "🚀 Плавающий чат в правом нижнем углу (рекомендуется)",
            "inline": "📄 Встроенный чат для страницы",
            "mobile": "📱 Полноэкранный чат для мобильных устройств"
        },
        "themes": {
            "blue": "💙 Синяя тема (деловая)",
            "green": "💚 Зеленая тема (экологичная)", 
            "purple": "💜 Фиолетовая тема (креативная)",
            "orange": "🧡 Оранжевая тема (энергичная)"
        }
    }

@router.get("/chat-iframe", response_class=HTMLResponse)
def chat_iframe(user_id: int = Query(...)):
    """Возвращает HTML iframe для встраивания чата на сайт"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Чат поддержки</title>
      <style>
        body {{ margin:0; font-family:sans-serif; }}
        #chat {{ width:100%; height:100vh; border:none; }}
      </style>
    </head>
    <body>
      <div id="chat"></div>
      <script>
        // Здесь будет логика чата (WebSocket или REST)
        // user_id: {user_id}
        // Можно использовать fetch или WebSocket для общения с backend
        // Пример: просто выводим user_id
        document.getElementById('chat').innerText = 'Ваш user_id: {user_id}';
      </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@router.post("/embed-code")
def generate_site_token(data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Генерирует site token для конкретного ассистента"""
    
    assistant_id = data.get('assistant_id')
    if not assistant_id:
        raise HTTPException(status_code=400, detail="assistant_id required")
    
    # Проверяем, что ассистент принадлежит пользователю
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    payload = {
        'user_id': current_user.id,
        'assistant_id': assistant_id,
        'type': 'site'
        # Убираем exp - токен бессрочный пока существует ассистент
    }
    token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    return {'site_token': token}