from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
import logging
import hashlib
import asyncio

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db

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

# WebSocket connections storage
ws_connections: Dict[int, List[WebSocket]] = {}
ws_site_connections: Dict[int, List[WebSocket]] = {}

# Helper function for WebSocket message pushing
async def push_dialog_message(dialog_id: int, message: dict):
    """Push message to all connected clients for this dialog"""
    conns = ws_connections.get(dialog_id, [])
    for ws in conns:
        try:
            await ws.send_json(message)
        except Exception:
            pass

async def push_site_dialog_message(dialog_id: int, message: dict):
    """Push message to all site dialog clients"""
    conns = ws_site_connections.get(dialog_id, [])
    for ws in conns:
        try:
            await ws.send_json(message)
        except Exception:
            pass

# --- Main Dialog Endpoints ---

@router.get("/dialogs")
def get_dialogs(
    user_id: int = Query(None),
    all: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
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
    
    # Подсчет общего количества
    total = q.count()
    
    # Пагинация
    offset = (page - 1) * limit
    dialogs = q.order_by(models.Dialog.started_at.desc()).offset(offset).limit(limit).all()
    
    # Формируем удобный для фронта ответ
    items = []
    for d in dialogs:
        # Получаем время последнего сообщения в диалоге
        last_message = db.query(models.DialogMessage).filter(
            models.DialogMessage.dialog_id == d.id
        ).order_by(models.DialogMessage.timestamp.desc()).first()
        
        last_message_at = None
        if last_message:
            last_message_at = last_message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        elif d.started_at:  # Если нет сообщений, используем время начала диалога
            last_message_at = d.started_at.strftime('%Y-%m-%d %H:%M:%S')
        
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
            "started_at": d.started_at.strftime('%Y-%m-%d %H:%M:%S') if d.started_at else None,
            "ended_at": d.ended_at.strftime('%Y-%m-%d %H:%M:%S') if d.ended_at else None,
            "last_message_at": last_message_at,  # Добавляем время последнего сообщения
            "auto_response": d.auto_response,

            "first_response_time": d.first_response_time,
            "fallback": d.fallback,
            "is_taken_over": d.is_taken_over or 0,
            "telegram_chat_id": d.telegram_chat_id,
            "telegram_username": cleaned_telegram_username,
            "first_name": cleaned_first_name,
            "last_name": cleaned_last_name,
            "guest_id": d.guest_id,
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
        "started_at": dialog.started_at.strftime('%Y-%m-%d %H:%M:%S') if dialog.started_at else None,
        "ended_at": dialog.ended_at.strftime('%Y-%m-%d %H:%M:%S') if dialog.ended_at else None,
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
            "timestamp": m.timestamp.strftime('%Y-%m-%d %H:%M:%S')
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
    
    # Проверка прав: только админ может писать как менеджер
    sender = validated_data.get('sender', 'user')
    if sender == 'manager' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can write as manager")
    
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
                    "message": f"Недостаточно средств на балансе. Текущий баланс: {current_balance} руб. Стоимость AI сообщения: 3 руб.",
                    "current_balance": current_balance,
                    "required_amount": 3.0,
                    "needsTopUp": True
                }
            )

    msg = models.DialogMessage(dialog_id=dialog_id, sender=sender, text=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # --- Учет прочтения рассылок ---
    if sender == 'user':
        # Найти все сообщения-рассылки в этом диалоге, отправленные до этого сообщения
        broadcasts = db.query(models.Broadcast, models.DialogMessage).join(models.DialogMessage, models.DialogMessage.broadcast_id == models.Broadcast.id)
        broadcasts = broadcasts.filter(
            models.DialogMessage.dialog_id == dialog_id,
            models.DialogMessage.sender == 'manager',
            models.DialogMessage.timestamp < msg.timestamp
        ).all()
        for broadcast, bmsg in broadcasts:
            # Проверить, не было ли уже прочтения этой рассылки этим диалогом
            already_read = db.query(models.BroadcastRead).filter_by(broadcast_id=broadcast.id, dialog_id=dialog_id).first()
            if not already_read:
                db.add(models.BroadcastRead(
                    broadcast_id=broadcast.id,
                    dialog_id=dialog_id,
                    user_id=dialog.user_id,
                    message_id=msg.id
                ))
                broadcast.read_count += 1
        db.commit()
        
        # --- Генерация автоматического ответа ассистента ---
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
                        min_similarity=0.7,
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
                
                # Создаем хэш сообщений для кэширования
                messages_for_hash = [{"role": "user", "content": text}]
                if assistant.system_prompt:
                    messages_for_hash.insert(0, {"role": "system", "content": assistant.system_prompt})
                
                messages_text = json.dumps(messages_for_hash, ensure_ascii=False)
                messages_hash = hashlib.md5(messages_text.encode()).hexdigest()
                
                # Проверяем кэш AI ответа (TTL: 24 часа)
                try:
                    import chatai_cache
                    cached_response = chatai_cache.cache_ai_response(
                        messages_hash=messages_hash,
                        model=assistant.ai_model or 'gpt-4o-mini',
                        user_id=current_user.id
                    )
                except ImportError:
                    cached_response = None
                
                if cached_response:
                    print(f"🚀 CACHE HIT: AI ответ для пользователя {current_user.id}")
                    
                    # Сохраняем кэшированный ответ как сообщение
                    cached_msg = models.DialogMessage(dialog_id=dialog_id, sender='assistant', text=cached_response)
                    db.add(cached_msg)
                    db.commit()
                    
                    # Отправляем через WebSocket
                    await push_dialog_message(dialog_id, {
                        "id": cached_msg.id,
                        "sender": cached_msg.sender,
                        "text": cached_msg.text,
                        "timestamp": cached_msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    })
                    
                    return {"id": cached_msg.id, "sender": cached_msg.sender, "text": cached_msg.text, "timestamp": cached_msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
                
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
                
                # Добавляем контекст из базы знаний
                if top_docs:
                    docs_text = "\n\n---\n\n".join([doc.content for doc, _ in top_docs])
                    messages.append({
                        "role": "system", 
                        "content": f"Используй следующую информацию из базы знаний компании для формирования ответа. Отвечай естественно, основываясь на этих данных, но не ссылайся на источники или файлы. Если в информации есть готовые ответы на вопросы, адаптируй их под контекст беседы:\n\n{docs_text}"
                    })
                
                # 🚫 ОТКЛЮЧЕНО: Использование истории диалогов для контекста
                # История диалогов больше не используется в промпте
                # Каждый запрос обрабатывается независимо
                
                # Добавляем только текущее сообщение пользователя
                messages.append({"role": "user", "content": text})
                
                # Генерируем ответ
                response = client.chat.completions.create(
                    model=assistant.ai_model or 'gpt-4o-mini',
                    messages=messages,
                    temperature=0.9,  # Увеличиваем для большей креативности
                    max_tokens=1000,
                    presence_penalty=0.3,  # Избегаем повторений
                    frequency_penalty=0.3   # Разнообразие в словах
                )
                
                ai_response = response.choices[0].message.content
                
                # Сохраняем AI ответ в кэш (TTL: 24 часа)
                try:
                    import chatai_cache
                    chatai_cache.set_ai_response(
                        messages_hash=messages_hash,
                        model=assistant.ai_model or 'gpt-4o-mini',
                        user_id=current_user.id,
                        response=ai_response,
                        ttl=86400  # 24 часа
                    )
                    print(f"💾 AI ответ сохранен в кэш для пользователя {current_user.id}")
                except ImportError:
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
                
                # Отправляем ответ ассистента через WebSocket
                await push_dialog_message(dialog_id, {
                    "id": assistant_msg.id,
                    "sender": assistant_msg.sender,
                    "text": assistant_msg.text,
                    "timestamp": assistant_msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                })
                
        except Exception as e:
            print(f"Ошибка генерации ответа ассистента: {e}")
            # Не прерываем выполнение, просто логируем ошибку

    await push_dialog_message(dialog_id, {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    })
    return {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    }