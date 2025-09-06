from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, select
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
import logging
import hashlib
import asyncio

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db
# from services.handoff_service import HandoffService  # Temporarily commented

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# Helper functions to avoid circular imports
def get_user_message_limit(user):
    """Import function only when called"""
    try:
        from main import get_user_message_limit as _get_limit
        return _get_limit(user)
    except ImportError:
        return 1000  # fallback

def is_user_blocked(user):
    """Import function only when called"""
    try:
        from main import is_user_blocked as _is_blocked
        return _is_blocked(user)
    except ImportError:
        return False  # fallback

# Import WebSocket helpers from websocket_manager
from services.websocket_manager import push_dialog_message, push_site_dialog_message, broadcast_dialog_message

# ---- Dialog context helpers ----
def _detect_follow_up(user_text: str) -> bool:
    text = (user_text or '').lower()
    if len(text) <= 60:
        return True
    follow_tokens = [
        'кто', 'он', 'она', 'они', 'оно', 'там', 'тут', 'это', 'тот', 'та', 'те',
        'какой', 'какая', 'какие', 'какое', 'еще', 'а именно', 'о нем', 'о ней',
        'which', 'who', 'they', 'it', 'that', 'those'
    ]
    return any(tok in text for tok in follow_tokens)

def _load_recent_messages(db: Session, dialog_id: int, up_to_message_id: int, max_messages: int) -> List[Dict]:
    msgs = db.query(models.DialogMessage).filter(
        models.DialogMessage.dialog_id == dialog_id,
        models.DialogMessage.id < up_to_message_id
    ).order_by(models.DialogMessage.timestamp.desc()).limit(max_messages).all()
    msgs = list(reversed(msgs))
    result: List[Dict] = []
    for m in msgs:
        role = 'user' if m.sender == 'user' else 'assistant'
        result.append({"role": role, "content": m.text, "id": m.id})
    return result

def _extract_user_name(text: str) -> Optional[str]:
    try:
        import re
        t = (text or '').strip()
        # Примеры: "меня зовут Дан", "я Дан", "я — Дан"
        m = re.search(r"меня\s+зовут\s+([A-Za-zА-Яа-яЁё\-]{2,30})", t, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
        m = re.search(r"^я\s*[—-]?\s*([A-Za-zА-Яа-яЁё\-]{2,30})\b", t, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    except Exception:
        pass
    return None

# --- Main Dialog Endpoints ---

@router.get("/dialogs")
def get_dialogs(
    user_id: int = Query(None),
    all: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    # Фильтры
    search: str = Query(None, description="Поиск по имени, email, содержимому сообщений, Telegram username"),
    status: str = Query(None, description="Фильтр по статусу: active, taken_over, handoff_requested, handoff_active"),
    channel: str = Query(None, description="Фильтр по каналу: telegram, website"),
    assistant_id: int = Query(None, description="Фильтр по ассистенту"),
    time_filter: str = Query(None, description="Временной фильтр: today, week, month"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    is_admin = getattr(current_user, 'role', None) == 'admin'
    filter_user_id = None
    if is_admin and all:
        filter_user_id = None
    elif is_admin and user_id:
        filter_user_id = user_id
    else:
        # Используем эффективный user_id (для сотрудников - ID владельца)
        filter_user_id = auth.get_effective_user_id(current_user, db)
    
    # Базовый запрос
    q = db.query(models.Dialog)
    if filter_user_id:
        q = q.filter(models.Dialog.user_id == filter_user_id)
    
    # Применяем фильтры
    if status:
        if status == 'active':
            q = q.filter(models.Dialog.is_taken_over == 0, 
                        models.Dialog.handoff_status.in_(['none', 'cancelled', 'released']))
        elif status == 'taken_over':
            q = q.filter(models.Dialog.is_taken_over == 1)
        elif status == 'handoff_requested':
            q = q.filter(models.Dialog.handoff_status == 'requested')
        elif status == 'handoff_active':
            q = q.filter(models.Dialog.handoff_status == 'active')
    
    if channel:
        if channel == 'telegram':
            q = q.filter(models.Dialog.telegram_chat_id.isnot(None))
        elif channel == 'website':
            q = q.filter(models.Dialog.telegram_chat_id.is_(None))
    
    if assistant_id:
        q = q.filter(models.Dialog.assistant_id == assistant_id)
    
    if time_filter:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        if time_filter == 'today':
            q = q.filter(models.Dialog.started_at >= now.replace(hour=0, minute=0, second=0, microsecond=0))
        elif time_filter == 'week':
            q = q.filter(models.Dialog.started_at >= now - timedelta(days=7))
        elif time_filter == 'month':
            q = q.filter(models.Dialog.started_at >= now - timedelta(days=30))
    
    if search:
        # Расширенный поиск по имени, email, guest_id, telegram_username и содержимому сообщений
        search_filter = f"%{search}%"
        
        # Подзапрос для поиска диалогов по содержимому сообщений (используем ilike для кириллицы)
        message_subquery = db.query(models.DialogMessage.dialog_id).filter(
            models.DialogMessage.text.ilike(search_filter)
        ).distinct().subquery()
        
        # Подзапрос для поиска диалогов по email пользователя (используем ilike для кириллицы)
        user_email_subquery = db.query(models.Dialog.id).join(
            models.User, models.Dialog.user_id == models.User.id
        ).filter(
            models.User.email.ilike(search_filter)
        ).subquery()
        
        q = q.filter(
            or_(
                # Поиск по полям диалога (используем ilike для кириллицы)
                models.Dialog.first_name.ilike(search_filter),
                models.Dialog.last_name.ilike(search_filter),
                models.Dialog.telegram_username.ilike(search_filter),
                models.Dialog.guest_id.ilike(search_filter),
                # Поиск по содержимому сообщений
                models.Dialog.id.in_(select(message_subquery.c.dialog_id)),
                # Поиск по email пользователя
                models.Dialog.id.in_(select(user_email_subquery.c.id))
            )
        )
    
    # Подсчет общего количества
    total = q.count()
    
    # Пагинация - сортируем по ID убывающем порядке (самые новые сначала)
    offset = (page - 1) * limit
    dialogs = q.order_by(models.Dialog.id.desc()).offset(offset).limit(limit).all()
    
    # Формируем удобный для фронта ответ
    items = []
    for d in dialogs:
        # Получаем время последнего сообщения в диалоге
        last_message = db.query(models.DialogMessage).filter(
            models.DialogMessage.dialog_id == d.id
        ).order_by(models.DialogMessage.timestamp.desc()).first()
        
        last_message_at = None
        last_message_text = None
        if last_message:
            # Убираем переменную last_message_at - используем объект напрямую
            last_message_text = last_message.text
        # Убираем elif - логика перенесена в строку where используется last_message
        
        # Получаем информацию о пользователе диалога
        dialog_user = db.query(models.User).filter(models.User.id == d.user_id).first()
        user_email = dialog_user.email if dialog_user else None
        
        # Функция для очистки любого строкового поля от лишних "0" в конце
        def clean_field(value):
            if not value or not isinstance(value, str):
                return value
            if value.endswith('0'):
                cleaned = value.rstrip('0').rstrip()
                return cleaned if cleaned else value  # Если после очистки остается пустая строка, возвращаем оригинал
            return value
        
        # Очищаем все текстовые поля от лишних "0"
        cleaned_first_name = clean_field(d.first_name)
        cleaned_last_name = clean_field(d.last_name)
        cleaned_telegram_username = clean_field(d.telegram_username)
        
        # Приоритет отображения имени: Telegram данные -> Guest ID (сайт) -> User данные -> username -> ID
        user_name = None
        if cleaned_first_name and cleaned_last_name:
            user_name = f"{cleaned_first_name} {cleaned_last_name}"
        elif cleaned_first_name:
            user_name = cleaned_first_name
        elif cleaned_telegram_username:
            user_name = f"@{cleaned_telegram_username}"
        elif d.guest_id:
            # Для анонимных пользователей сайта (виджета) генерируем уникальное имя
            # Используем ID диалога для создания уникального номера
            user_name = f"Пользователь#{d.id}"
        elif dialog_user and dialog_user.first_name:
            user_name = clean_field(dialog_user.first_name)
        
        # Дополнительная очистка user_name от лишних символов "0" в конце
        if user_name and user_name.endswith('0'):
            user_name = user_name.rstrip('0').rstrip()
        
        items.append({
            "id": d.id,
            "user_id": d.user_id,
            "assistant_id": d.assistant_id,  # Добавляем assistant_id
            "started_at": d.started_at.isoformat() + 'Z' if d.started_at else None,
            "ended_at": d.ended_at.isoformat() + 'Z' if d.ended_at else None,
            "last_message_at": last_message.timestamp.isoformat() + 'Z' if last_message else (d.started_at.isoformat() + 'Z' if d.started_at else None),  # Добавляем время последнего сообщения
            "last_message_text": last_message_text,  # Добавляем текст последнего сообщения
            "auto_response": d.auto_response,

            "first_response_time": d.first_response_time,
            "fallback": d.fallback,
            "is_taken_over": d.is_taken_over or 0,
            "telegram_chat_id": d.telegram_chat_id,
            "telegram_username": cleaned_telegram_username,
            "first_name": cleaned_first_name,
            "last_name": cleaned_last_name,
            "guest_id": d.guest_id,
            # Handoff поля
            "handoff_status": getattr(d, 'handoff_status', 'none'),
            "handoff_requested_at": d.handoff_requested_at.isoformat() + 'Z' if getattr(d, 'handoff_requested_at', None) else None,
            "handoff_started_at": d.handoff_started_at.isoformat() + 'Z' if getattr(d, 'handoff_started_at', None) else None,
            "handoff_resolved_at": d.handoff_resolved_at.isoformat() + 'Z' if getattr(d, 'handoff_resolved_at', None) else None,
            "handoff_reason": getattr(d, 'handoff_reason', None),
            "assigned_manager_id": getattr(d, 'assigned_manager_id', None),
            "request_id": getattr(d, 'request_id', None),
            # Канал общения (для HandoffQueue)
            "channel_type": "telegram" if d.telegram_chat_id else "web",
            # Дополнительные поля для фронтенда
            "name": user_name,
            "email": user_email,
            "topic": "Общий вопрос",  # По умолчанию
            "comment": "",  # Можно добавить первое сообщение пользователя
            "sentiment": "neutral"  # По умолчанию
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "limit": limit
    }

@router.get("/dialogs/filters-data")
def get_filters_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Получить данные для фильтров (каналы и статистика)
    """
    try:
        # Проверяем права доступа
        if current_user.role not in ['admin', 'manager']:
            # Фильтруем только диалоги пользователя
            base_query = db.query(models.Dialog).filter(models.Dialog.user_id == current_user.id)
        else:
            # Администраторы и менеджеры видят все диалоги
            base_query = db.query(models.Dialog)

        # Статистика каналов - используем ту же логику что в основном API
        telegram_count = base_query.filter(
            models.Dialog.telegram_chat_id.isnot(None)
        ).count()
        
        website_count = base_query.filter(
            models.Dialog.telegram_chat_id.is_(None)
        ).count()

        channels = []
        if telegram_count > 0:
            channels.append({
                'type': 'telegram',
                'name': 'Telegram',
                'count': telegram_count
            })
        if website_count > 0:
            channels.append({
                'type': 'website', 
                'name': 'Сайт (Виджет)',
                'count': website_count
            })

        # Получаем всех ассистентов, используемых в диалогах (через assistant_id)
        assistants_query = db.query(
            models.Assistant.id,
            models.Assistant.name,
            func.count(models.Dialog.id).label('dialogs_count')
        ).join(
            models.Dialog, models.Dialog.assistant_id == models.Assistant.id
        ).filter(
            models.Dialog.id.in_(base_query.with_entities(models.Dialog.id))
        ).group_by(
            models.Assistant.id,
            models.Assistant.name
        ).all()

        bots = []
        for assistant_id, assistant_name, dialogs_count in assistants_query:
            bots.append({
                'id': assistant_id,
                'name': assistant_name,
                'dialogs_count': dialogs_count
            })

        return {
            'channels': channels,
            'bots': bots
        }

    except Exception as e:
        logger.error(f"Error getting filters data: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка при загрузке данных. Попробуйте позже.")

@router.get("/dialogs/{dialog_id}")
def get_dialog(dialog_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    # Проверка прав: админы, владельцы и сотрудники имеют доступ к соответствующим диалогам
    if not auth.check_employee_access(current_user, dialog.user_id, db):
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "id": dialog.id,
        "user_id": dialog.user_id,
        "assistant_id": dialog.assistant_id,  # Добавляем assistant_id
        "started_at": dialog.started_at.isoformat() + 'Z' if dialog.started_at else None,
        "ended_at": dialog.ended_at.isoformat() + 'Z' if dialog.ended_at else None,
        "auto_response": dialog.auto_response,

        "first_response_time": dialog.first_response_time,
        "fallback": dialog.fallback,
        "is_taken_over": dialog.is_taken_over or 0,
        "telegram_chat_id": dialog.telegram_chat_id,
        "telegram_username": dialog.telegram_username,
        "guest_id": dialog.guest_id
    }

@router.post("/dialogs/{dialog_id}/takeover")
def takeover_dialog(dialog_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    dialog.is_taken_over = 1
    db.commit()
    return {"ok": True}

@router.post("/dialogs/{dialog_id}/release")
def release_dialog(dialog_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    dialog.is_taken_over = 0
    db.commit()
    return {"ok": True}

@router.get("/dialogs/{dialog_id}/messages")
def get_dialog_messages(dialog_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    dialog = db.query(models.Dialog).options(joinedload(models.Dialog.messages)).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    # Проверка прав: админы, владельцы и сотрудники имеют доступ к соответствующим диалогам
    if not auth.check_employee_access(current_user, dialog.user_id, db):
        raise HTTPException(status_code=403, detail="Forbidden")
    messages = [
        {
            "id": m.id,
            "sender": m.sender,
            "text": m.text,
            "timestamp": m.timestamp.isoformat() + 'Z'
        } for m in sorted(dialog.messages, key=lambda x: x.timestamp)
    ]
    return messages

@router.post("/dialogs/{dialog_id}/messages")
async def add_dialog_message(dialog_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from validators.input_validator import validate_message_data, ValidationError, create_validation_error_response
    from services.balance_service import BalanceService
    
    # Валидация входных данных
    try:
        validated_data = validate_message_data(data)
    except ValidationError as e:
        raise create_validation_error_response(e)
    
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # HANDOFF INTEGRATION: Проверка прав для менеджера
    sender = validated_data.get('sender', 'user')
    if sender == 'manager':
        logger.info(f"🔐 [DIALOGS] Проверка прав менеджера. User ID: {current_user.id}")
        logger.info(f"🔐 [DIALOGS] Диалог #{dialog_id}: user_id={dialog.user_id}")
        
        # В системе нет ролей - каждый пользователь может отвечать как менеджер в СВОИХ диалогах
        # Или админ может отвечать в любых диалогах
        is_admin = getattr(current_user, 'role', None) == 'admin'
        is_dialog_owner = dialog.user_id == current_user.id
        
        logger.info(f"🔐 [DIALOGS] is_admin: {is_admin}, is_dialog_owner: {is_dialog_owner}")
        
        if not (is_admin or is_dialog_owner):
            logger.error(f"❌ [DIALOGS] Отказано в доступе. Пользователь {current_user.id} может отвечать как менеджер только в своих диалогах (dialog.user_id={dialog.user_id})")
            raise HTTPException(status_code=403, detail="You can only reply as manager in your own dialogs")
        
        logger.info(f"✅ [DIALOGS] Права подтверждены для пользователя {current_user.id}")  
    
    text = validated_data['text']

    # --- Проверка баланса для AI сообщений ---
    balance_service = BalanceService(db)
    if sender == 'user':
        # Проверяем достаточность средств для AI сообщения
        if not balance_service.check_sufficient_balance(current_user.id, 'ai_message'):
            current_balance = balance_service.get_balance(current_user.id)
            raise HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "error": "insufficient_balance",
                    "message": f"Недостаточно средств на балансе. Текущий баланс: {current_balance} руб. Стоимость AI сообщения: 5 руб.",
                    "current_balance": current_balance,
                    "required_amount": 5.0,
                    "needsTopUp": True
                }
            )

    # CHECK TAKEOVER STATUS - блокируем AI если диалог перехвачен оператором
    is_taken_over = bool(dialog.is_taken_over)
    logger.info(f"🔒 [DIALOGS] Статус перехвата диалога #{dialog_id}: is_taken_over={is_taken_over}")
    
    msg = models.DialogMessage(dialog_id=dialog_id, sender=sender, text=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # 🔥 ПУБЛИКАЦИЯ СОБЫТИЯ В REDIS PUB/SUB ДЛЯ РЕАЛ-ТАЙМ ДОСТАВКИ
    try:
        from services.events_pubsub import publish_dialog_event
        await publish_dialog_event(dialog_id, {
            "type": "message:new",
            "message": {
                "id": msg.id,
                "sender": msg.sender,
                "text": msg.text,
                "timestamp": msg.timestamp.isoformat() + 'Z'
            }
        })
        logger.debug(f"📢 Published Redis event for dialog {dialog_id}, message {msg.id}")
    except Exception as e:
        logger.error(f"❌ Failed to publish Redis event for dialog {dialog_id}: {e}")

    # Обновляем имя пользователя из текста, если он представился
    if sender == 'user':
        maybe_name = _extract_user_name(text)
        if maybe_name:
            try:
                dialog.first_name = maybe_name
                db.commit()
            except Exception:
                db.rollback()

    # --- Учет прочтения рассылок ---
    if sender == 'user':
        # Найти все сообщения-рассылки в этом диалоге, отправленные до этого сообщения
        # Используем SQL напрямую, так как модель Broadcast удалена
        broadcasts = db.execute(text("""
            SELECT b.id as broadcast_id, dm.id as message_id, b.read_count
            FROM broadcasts b 
            JOIN dialog_messages dm ON dm.broadcast_id = b.id
            WHERE dm.dialog_id = :dialog_id 
            AND dm.sender = 'manager' 
            AND dm.timestamp < :timestamp
        """), {"dialog_id": dialog_id, "timestamp": msg.timestamp}).fetchall()
        for broadcast in broadcasts:
            # Проверить, не было ли уже прочтения этой рассылки этим диалогом (используем SQL напрямую)
            from sqlalchemy import text
            already_read = db.execute(
                text("SELECT 1 FROM broadcast_reads WHERE broadcast_id = :broadcast_id AND dialog_id = :dialog_id"),
                {"broadcast_id": broadcast.broadcast_id, "dialog_id": dialog_id}
            ).first()
            if not already_read:
                db.execute(
                    text("INSERT INTO broadcast_reads (broadcast_id, dialog_id, user_id, message_id) VALUES (:broadcast_id, :dialog_id, :user_id, :message_id)"),
                    {
                        "broadcast_id": broadcast.broadcast_id,
                        "dialog_id": dialog_id, 
                        "user_id": dialog.user_id,
                        "message_id": msg.id
                    }
                )
                # Обновляем счетчик прочтений
                db.execute(
                    text("UPDATE broadcasts SET read_count = read_count + 1 WHERE id = :broadcast_id"),
                    {"broadcast_id": broadcast.broadcast_id}
                )
        db.commit()
        
        # --- Генерация автоматического ответа ассистента (только если диалог НЕ перехвачен) ---
        if not is_taken_over:
            logger.info(f"🤖 [DIALOGS] Диалог #{dialog_id} НЕ перехвачен - генерируем AI ответ")
            try:
                # Получаем ассистента для этого диалога
                assistant = None
                if dialog.assistant_id:
                    assistant = db.query(models.Assistant).filter(models.Assistant.id == dialog.assistant_id).first()
                else:
                    # Берем первого активного ассистента пользователя
                    assistant = db.query(models.Assistant).filter(
                        models.Assistant.user_id == current_user.id,
                        models.Assistant.is_active == True
                    ).first()
                
                if assistant:
                    # Списываем средства за AI сообщение ПЕРЕД генерацией ответа
                    try:
                        transaction = balance_service.charge_for_service(
                            current_user.id,
                            'ai_message',
                            f"AI сообщение в диалоге #{dialog_id}",
                            msg.id
                        )
                        logger.info(f"Списано {abs(transaction.amount)} руб. за AI сообщение пользователя {current_user.id}")
                    except ValueError as e:
                        logger.error(f"Ошибка списания средств за AI сообщение: {e}")
                        raise HTTPException(
                            status_code=402,
                            detail={
                                "error": "payment_failed",
                                "message": str(e),
                                "needsTopUp": True
                            }
                        )
                    except Exception as e:
                        logger.error(f"Ошибка списания средств за AI сообщение: {e}")
                        raise HTTPException(
                            status_code=402,
                            detail={
                                "error": "payment_failed",
                                "message": "Ошибка списания средств. Попробуйте позже.",
                                "needsTopUp": True
                            }
                        )
                    
                    # Получаем базу знаний для ассистента
                    knowledge_query = db.query(models.UserKnowledge).filter(
                        models.UserKnowledge.user_id == current_user.id
                    )
                    if assistant.id:
                        knowledge_query = knowledge_query.filter(
                            models.UserKnowledge.assistant_id == assistant.id
                        )
                    knowledge_data = knowledge_query.all()
                    
                    # 🚀 RETRIEVAL-BASED ПОИСК ДЛЯ ВЕБ-ЧАТА
                    relevant_chunks = []
                    top_docs = []
                    
                    # Сначала пробуем embeddings
                    try:
                        from services.embeddings_service import embeddings_service
                        
                        # Ищем релевантные чанки через embeddings
                        relevant_chunks = embeddings_service.search_relevant_chunks(
                            query=text,
                            user_id=current_user.id,
                            assistant_id=assistant.id,
                            top_k=5,
                            min_similarity=0.5,  # Понижен для Q&A
                            include_qa=True,  # Включаем Q&A поиск
                            qa_limit=3,       # Максимум 3 Q&A результата
                            db=db
                        )
                        
                        logger.info(f"Web chat embeddings: found {len(relevant_chunks)} chunks")
                        
                        # Преобразуем в формат top_docs для совместимости
                        for chunk in relevant_chunks:
                            class MockDoc:
                                def __init__(self, content, doc_type):
                                    self.content = content
                                    self.doc_type = doc_type
                                    self.usage_count = 0
                                    self.last_used = None
                            
                            mock_doc = MockDoc(chunk['text'], chunk.get('doc_type', 'document'))
                            top_docs.append((mock_doc, chunk['similarity']))
                        
                    except Exception as e:
                        logger.warning(f"Embeddings search failed: {e}")
                        relevant_chunks = []
                    
                    # Если embeddings не дали результатов, используем fallback
                    if not top_docs:
                        logger.info("Web chat using fallback knowledge system...")
                        
                        # Fallback: используем все знания пользователя
                        for doc in knowledge_data:
                            if doc.content:
                                class MockDoc:
                                    def __init__(self, content, doc_type):
                                        self.content = content
                                        self.doc_type = doc_type
                                        self.usage_count = 0
                                        self.last_used = None
                                
                                mock_doc = MockDoc(doc.content, doc.doc_type)
                                top_docs.append((mock_doc, 0.8))  # Фиксированная схожесть
                        
                        logger.info(f"Web chat fallback: using {len(top_docs)} knowledge entries")
                    
                    # Создаем хэш для кэширования ответа
                    import openai
                    from ai.ai_token_manager import get_available_token
                    
                    # Создаем хэш сообщений для кэширования (включая системный промпт)
                    messages_for_hash = [{"role": "user", "content": text}]
                    if assistant.system_prompt:
                        messages_for_hash.insert(0, {"role": "system", "content": assistant.system_prompt})
                    
                    messages_text = json.dumps(messages_for_hash, ensure_ascii=False)
                    messages_hash = hashlib.md5(messages_text.encode()).hexdigest()
                    
                    # Проверяем кэш AI ответа (TTL: 24 часа) с учетом ассистента и версии знаний
                    try:
                        from cache.redis_cache import chatai_cache
                        knowledge_version = getattr(assistant, 'knowledge_version', 0) or 0
                        cached_response = chatai_cache.cache_ai_response(
                            messages_hash=messages_hash,
                            model=assistant.ai_model or 'gpt-4o-mini',
                            user_id=current_user.id,
                            assistant_id=assistant.id,
                            knowledge_version=knowledge_version,
                        )
                    except Exception:
                        cached_response = None
                    
                    if cached_response:
                        print(f"🚀 CACHE HIT: AI ответ для пользователя {current_user.id}")
                        
                        # Сохраняем кэшированный ответ как сообщение
                        cached_msg = models.DialogMessage(dialog_id=dialog_id, sender='assistant', text=cached_response)
                        db.add(cached_msg)
                        db.commit()
                        
                        # Инвалидируем кэш метрик пользователя после ответа ИИ (кэшированный)
                        try:
                            from cache.redis_cache import chatai_cache
                            chatai_cache.invalidate_user_cache(current_user.id)
                            logger.debug(f"Invalidated metrics cache for user {current_user.id} (cached response)")
                        except Exception as e:
                            logger.warning(f"Failed to invalidate user cache: {e}")
                        
                        # Отправляем через WebSocket в оба канала
                        cached_message_data = {
                            "id": cached_msg.id,
                            "sender": cached_msg.sender,
                            "text": cached_msg.text,
                            "timestamp": cached_msg.timestamp.isoformat() + 'Z'
                        }
                        # Используем универсальный broadcast для гарантированной доставки
                        await broadcast_dialog_message(dialog_id, cached_message_data)
                        
                        return {"id": cached_msg.id, "sender": cached_msg.sender, "text": cached_msg.text, "timestamp": cached_msg.timestamp.isoformat() + 'Z'}
                    
                    print(f"🔍 CACHE MISS: Генерируем новый AI ответ для пользователя {current_user.id}")
                    
                    # Получаем доступный AI токен
                    ai_token_info = get_available_token(db, assistant.ai_model or 'gpt-4o-mini')
                    if not ai_token_info:
                        raise Exception("Нет доступных AI токенов")
                    
                    client = openai.OpenAI(api_key=ai_token_info['token'])
                    
                    messages = []
                    
                    # Системный промпт
                    if assistant.system_prompt:
                        messages.append({"role": "system", "content": assistant.system_prompt})
                    # Язык/обращение
                    try:
                        display_name = dialog.first_name or dialog.telegram_username or ''
                        if display_name:
                            extra_instr = (
                                f"Всегда отвечай по-русски. Обращайся к пользователю по имени: {display_name}. "
                                f"Если пользователь спрашивает 'как меня зовут?' или синонимы — ответь точно: '{display_name}'."
                            )
                        else:
                            extra_instr = (
                                "Всегда отвечай по-русски. Если пользователь спрашивает, как его зовут, вежливо уточни имя."
                            )
                        messages.append({"role": "system", "content": extra_instr})
                    except Exception:
                        messages.append({"role": "system", "content": "Отвечай по-русски."})
                    
                    # 1) Недавняя диалоговая память (3–5 пар), расширяем при follow-up
                    recent_limit_pairs = 3 if not _detect_follow_up(text) else 5
                    recent_msgs = _load_recent_messages(db, dialog_id, msg.id, max_messages=recent_limit_pairs * 2)
                    # Если в recent нет имени, попробуем найти в более ранних сообщениях простую форму представления
                    if not (dialog.first_name or dialog.telegram_username):
                        try:
                            earlier = db.query(models.DialogMessage).filter(
                                models.DialogMessage.dialog_id == dialog_id,
                                models.DialogMessage.id < msg.id
                            ).order_by(models.DialogMessage.timestamp.desc()).limit(30).all()
                            for em in earlier:
                                if em.sender == 'user':
                                    name = _extract_user_name(em.text)
                                    if name:
                                        dialog.first_name = name
                                        db.commit()
                                        break
                        except Exception:
                            db.rollback()
                    messages.extend(recent_msgs)

                    # 2) Сжатое резюме более раннего диалога (простейшая эвристика)
                    if len(recent_msgs) >= 2:
                        try:
                            # Простая выжимка последнего вопроса пользователя
                            last_user_msgs = [m for m in reversed(recent_msgs) if m['role']=='user']
                            if last_user_msgs:
                                last_q = last_user_msgs[0]['content'][:200]
                                messages.insert(0, {"role": "system", "content": f"Краткий контекст: ранее пользователь спрашивал: '{last_q}'. Учитывай это при ответе."})
                        except Exception:
                            pass

                    # 3) Контекст из базы знаний
                    if top_docs:
                        # Обрезаем общий объем знаний до ~1200 токенов (грубо по символам)
                        max_chars = 4800
                        aggregated = []
                        used = 0
                        for doc, _sim in top_docs:
                            part = (doc.content or '')
                            if not part:
                                continue
                            if used + len(part) > max_chars:
                                part = part[: max_chars - used]
                            aggregated.append(part)
                            used += len(part)
                            if used >= max_chars:
                                break
                        
                        if aggregated:  # Проверяем что есть реальный контент
                            docs_text = "\n\n---\n\n".join(aggregated)
                            messages.append({
                                "role": "system",
                                "content": f"Используй ТОЛЬКО следующую информацию из базы знаний компании для формирования ответа. ЗАПРЕЩЕНО использовать общие знания или придумывать информацию:\n\n{docs_text}"
                            })
                        else:
                            # Если нет полезного контента в документах
                            messages.append({
                                "role": "system",
                                "content": "В базе знаний компании НЕТ информации для ответа на данный вопрос. Ты ДОЛЖЕН честно сказать: 'К сожалению, в моей базе знаний нет информации по данному вопросу. Рекомендую обратиться к менеджеру компании.' ЗАПРЕЩЕНО придумывать или использовать общие знания."
                            })
                    else:
                        # Если вообще нет документов в базе знаний
                        messages.append({
                            "role": "system", 
                            "content": "У этого ассистента НЕТ документов в базе знаний. Ты ДОЛЖЕН честно сказать: 'К сожалению, в моей базе знаний нет информации по данному вопросу. Рекомендую обратиться к менеджеру компании.' КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать общие знания, тренировочные данные или придумывать информацию о услугах, товарах или компании."
                        })

                    # 4) Детали пользователя (имя) из текущего сообщения
                    user_name = _extract_user_name(text)
                    if user_name:
                        messages.append({"role": "system", "content": f"Имя пользователя: {user_name}"})

                    # 5) Текущее сообщение пользователя
                    messages.append({"role": "user", "content": text})
                
                    # Генерируем ответ
                    response = client.chat.completions.create(
                    model=assistant.ai_model or 'gpt-4o-mini',
                    messages=messages,
                    temperature=0.2,  # Низкая температура для точности в чате
                    max_tokens=1000,
                    presence_penalty=0.0,
                    frequency_penalty=0.0
                    )
                
                    ai_response = response.choices[0].message.content
                
                    # Сохраняем AI ответ в кэш (TTL: 24 часа), ключ зависит от ассистента и версии знаний
                    try:
                        from cache.redis_cache import chatai_cache
                        knowledge_version = getattr(assistant, 'knowledge_version', 0) or 0
                        chatai_cache.set_ai_response(
                            messages_hash=messages_hash,
                            model=assistant.ai_model or 'gpt-4o-mini',
                            user_id=current_user.id,
                            response=ai_response,
                            ttl=86400,  # 24 часа
                            assistant_id=assistant.id,
                            knowledge_version=knowledge_version,
                        )
                        print(f"💾 AI ответ сохранен в кэш для пользователя {current_user.id}")
                    except Exception:
                        pass
                
                    # Сохраняем ответ ассистента
                    assistant_msg = models.DialogMessage(
                    dialog_id=dialog_id, 
                    sender='assistant', 
                    text=ai_response
                    )
                    db.add(assistant_msg)
                    db.commit()
                    db.refresh(assistant_msg)
                    
                    # Инвалидируем кэш метрик пользователя после нового ответа ИИ
                    try:
                        from cache.redis_cache import chatai_cache
                        chatai_cache.invalidate_user_cache(current_user.id)
                        logger.debug(f"Invalidated metrics cache for user {current_user.id} (new AI response)")
                    except Exception as e:
                        logger.warning(f"Failed to invalidate user cache: {e}")
                
                    # Рассчитываем время ответа (если это первый ответ ассистента)
                    if not dialog.first_response_time:
                        # Ищем первое сообщение пользователя в этом диалоге
                        first_user_msg = db.query(models.DialogMessage).filter(
                            models.DialogMessage.dialog_id == dialog_id,
                            models.DialogMessage.sender == 'user'
                        ).order_by(models.DialogMessage.timestamp).first()
                        
                        if first_user_msg:
                            response_time = (assistant_msg.timestamp - first_user_msg.timestamp).total_seconds()
                            dialog.first_response_time = response_time
                
                    # Обновляем диалог
                    dialog.ended_at = datetime.utcnow()
                    dialog.auto_response = 1
                    db.commit()
                
                    # Отправляем AI ответ через WebSocket в оба канала
                    ai_message_data = {
                        "id": assistant_msg.id,
                        "sender": assistant_msg.sender,
                        "text": assistant_msg.text,
                        "timestamp": assistant_msg.timestamp.isoformat() + 'Z'
                    }
                    # Используем универсальный broadcast для гарантированной доставки
                    await broadcast_dialog_message(dialog_id, ai_message_data)
                
            except Exception as e:
                    print(f"Ошибка генерации ответа ассистента: {e}")
                # Не прерываем выполнение, просто логируем ошибку
        else:
            # Диалог перехвачен - не генерируем AI ответ, только уведомляем
            logger.info(f"🚫 [DIALOGS] Диалог #{dialog_id} ПЕРЕХВАЧЕН оператором - НЕ генерируем AI ответ")
            # Уведомляем через WebSocket в оба канала
            operator_message = {
                "type": "operator_handling",
                "message": "Диалог обрабатывается оператором. Ожидайте ответа."
            }
            await push_dialog_message(dialog_id, operator_message)
            await push_site_dialog_message(dialog_id, operator_message)

    # Отправляем через WebSocket в оба канала (обычные диалоги и site диалоги)
    message_data = {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.isoformat() + 'Z'
    }
    
    # Используем универсальный broadcast для гарантированной доставки в оба канала
    await broadcast_dialog_message(dialog_id, message_data)
    
    # НОВОЕ: Если это сообщение от оператора в Telegram диалоге, отправляем в Telegram
    logger.info(f"🔍 [DIALOGS] Проверяем условия отправки в Telegram: sender='{sender}', telegram_chat_id='{dialog.telegram_chat_id}'")
    if sender == 'manager' and dialog.telegram_chat_id:
        try:
            logger.info(f"🔄 [DIALOGS] Начинаем отправку сообщения от менеджера {current_user.id} в Telegram чат {dialog.telegram_chat_id}")
            logger.info(f"🔄 [DIALOGS] Диалог #{dialog_id}: handoff_status={getattr(dialog, 'handoff_status', 'none')}, is_taken_over={dialog.is_taken_over}")
            
            from services.bot_manager import send_operator_message_to_telegram
            operator_name = current_user.first_name if current_user.first_name else f"Оператор #{current_user.id}"
            
            logger.info(f"🔄 [DIALOGS] Вызываем send_operator_message_to_telegram с параметрами: chat_id={dialog.telegram_chat_id}, operator={operator_name}")
            await send_operator_message_to_telegram(dialog.telegram_chat_id, text, operator_name)
            logger.info(f"✅ [DIALOGS] Сообщение оператора успешно обработано для чата {dialog.telegram_chat_id}")
        except Exception as e:
            logger.error(f"❌ [DIALOGS] Ошибка отправки сообщения оператора в Telegram чат {dialog.telegram_chat_id}: {e}")
            logger.exception("❌ [DIALOGS] Детали ошибки:")
    
    return {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.isoformat() + 'Z'
    }

@router.get("/dialogs/{dialog_id}/status")
def get_dialog_status_for_bot(dialog_id: int, db: Session = Depends(get_db)):
    """Получает статус диалога для bot worker (без авторизации)"""
    try:
        dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if not dialog:
            return {"handoff_status": "none", "is_taken_over": 0}
        
        return {
            "id": dialog.id,
            "handoff_status": dialog.handoff_status or "none",
            "is_taken_over": dialog.is_taken_over or 0,
            "assigned_manager_id": dialog.assigned_manager_id
        }
    except Exception as e:
        logger.error(f"Error getting dialog status for bot: {e}")
        # Возвращаем безопасное состояние при ошибке
        return {"handoff_status": "none", "is_taken_over": 0}

@router.get("/dialogs/by-telegram-chat/{telegram_chat_id}")
def get_dialog_by_telegram_chat(telegram_chat_id: str, db: Session = Depends(get_db)):
    """Получает диалог по telegram_chat_id для bot manager'а (ОПТИМИЗИРОВАНО)"""
    try:
        # Оптимизированный запрос с JOIN для получения bot_id
        result = db.query(
            models.Dialog.id,
            models.Dialog.assistant_id,
            models.Dialog.user_id,
            models.Dialog.telegram_chat_id,
            models.Dialog.handoff_status,
            models.BotInstance.id.label('bot_id')
        ).join(
            models.BotInstance, 
            models.Dialog.assistant_id == models.BotInstance.assistant_id
        ).filter(
            models.Dialog.telegram_chat_id == telegram_chat_id,
            models.BotInstance.is_active == True
        ).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Dialog or active bot not found")
        
        return {
            "id": result.id,
            "assistant_id": result.assistant_id,
            "user_id": result.user_id,
            "telegram_chat_id": result.telegram_chat_id,
            "handoff_status": result.handoff_status,
            "bot_id": result.bot_id
        }
    except Exception as e:
        logger.error(f"Error getting dialog by telegram_chat_id {telegram_chat_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error")# Test trigger comment - Sat Aug 23 17:59:27 MSK 2025
# Test trigger - Sat Aug 23 18:06:57 MSK 2025
