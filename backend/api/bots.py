from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
import requests
import json
import subprocess
from datetime import datetime

from database import SessionLocal
from database.connection import get_db
from database import models, schemas, auth
from pydantic import BaseModel, field_validator
from ai import prompt_variations
from ai.ai_token_manager import ai_token_manager

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# Pydantic models for bot management
class BotInstanceCreate(BaseModel):
    platform: str = "telegram"  # Только Telegram
    assistant_id: int
    bot_token: str
    
    # Валидация токена - удаление лишних пробелов
    @field_validator('bot_token')
    @classmethod
    def validate_bot_token(cls, v):
        if v is None:
            raise ValueError('Токен бота не может быть пустым')
        v = str(v).strip()
        if not v:
            raise ValueError('Токен бота не может быть пустым')
        return v

class ReloadBotRequest(BaseModel):
    user_id: int

# Helper functions for bot reload (avoid circular imports)
def reload_specific_bot(bot_id: int, db: Session):
    """Перезагружает конкретный бот по ID"""
    try:
        # Проверяем что бот существует и активен
        bot_instance = db.query(models.BotInstance).filter(
            models.BotInstance.id == bot_id,
            models.BotInstance.is_active == True
        ).first()
        
        if not bot_instance:
            print(f"[RELOAD_SPECIFIC_BOT] Бот {bot_id} не найден или неактивен")
            return
        
        # Отправляем сигнал multi bot manager для перезагрузки конкретного бота
        response = requests.post(
            "http://localhost:3001/reload-bots", 
            json={"bot_ids": [bot_id]}, 
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"[RELOAD_SPECIFIC_BOT] Перезагружен бот {bot_id}")
        else:
            print(f"[RELOAD_SPECIFIC_BOT] Ошибка ответа multi bot manager: {response.status_code}")
            
    except Exception as e:
        print(f"[RELOAD_SPECIFIC_BOT] Ошибка перезагрузки бота {bot_id}: {e}")

# === Bot Management Endpoints ===

@router.get("/bot-instances-all")
def get_all_bot_instances(db: Session = Depends(get_db)):
    """Получить все активные боты для multi_bot_manager"""
    bot_instances = db.query(models.BotInstance).filter(
        models.BotInstance.is_active == True
    ).all()
    
    result = []
    for bot in bot_instances:
        result.append({
            "id": bot.id,
            "user_id": bot.user_id,
            "assistant_id": bot.assistant_id,
            "platform": bot.platform,
            "bot_token": bot.bot_token,
            "is_active": bot.is_active
        })
    
    return result

@router.get("/bot-instances")
def get_my_bot_instances(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить все боты пользователя"""
    effective_user_id = auth.get_effective_user_id(current_user, db)
    bot_instances = db.query(models.BotInstance).filter(
        models.BotInstance.user_id == effective_user_id
    ).all()
    
    result = []
    for bot in bot_instances:
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == bot.assistant_id
        ).first()
        
        result.append({
            "id": bot.id,
            "platform": bot.platform,
            "assistant_id": bot.assistant_id,
            "assistant_name": assistant.name if assistant else "Удален",
            "is_active": bot.is_active,
            "created_at": bot.created_at.isoformat() if bot.created_at else None,
            "bot_token": bot.bot_token
        })
    
    return result

@router.post("/bot-instances")
def create_bot_instance(data: BotInstanceCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Создать новый Telegram бот"""
    # Проверить, что ассистент принадлежит пользователю
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == data.assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Проверяем, не существует ли уже бот для этого ассистента и платформы
    existing_bot = db.query(models.BotInstance).filter(
        models.BotInstance.user_id == current_user.id,
        models.BotInstance.assistant_id == data.assistant_id,
        models.BotInstance.platform == data.platform
    ).first()
    
    if existing_bot:
        # Обновляем существующий бот вместо создания нового
        existing_bot.bot_token = data.bot_token  # data.bot_token уже очищен валидатором
        existing_bot.is_active = True
        db.commit()
        db.refresh(existing_bot)
        
        # Перезагружаем обновленный бот
        reload_specific_bot(existing_bot.id, db)
        
        return {
            "id": existing_bot.id,
            "platform": existing_bot.platform,
            "assistant_id": existing_bot.assistant_id,
            "assistant_name": assistant.name,
            "is_active": existing_bot.is_active,
            "created_at": existing_bot.created_at.isoformat(),
            "updated": True
        }
    
    # Создать новый bot instance (только Telegram)
    bot_instance = models.BotInstance(
        user_id=current_user.id,
        assistant_id=data.assistant_id,
        platform=data.platform,
        bot_token=data.bot_token,
        is_active=True
    )
    
    db.add(bot_instance)
    db.commit()
    db.refresh(bot_instance)
    
    # Перезагружаем конкретный бот после создания
    reload_specific_bot(bot_instance.id, db)
    
    return {
        "id": bot_instance.id,
        "platform": bot_instance.platform,
        "assistant_id": bot_instance.assistant_id,
        "assistant_name": assistant.name,
        "is_active": bot_instance.is_active,
        "created_at": bot_instance.created_at.isoformat()
    }

@router.patch("/bot-instances/{bot_id}")
def update_bot_instance(bot_id: int, data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Обновить Telegram бот"""
    from validators.input_validator import validate_bot_instance_data, ValidationError, create_validation_error_response, validate_positive_integer
    
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.id == bot_id,
        models.BotInstance.user_id == current_user.id
    ).first()
    
    if not bot_instance:
        raise HTTPException(status_code=404, detail="Bot instance not found")
    
    # Валидация входных данных (частичная для обновления)
    try:
        validated_data = {}
        
        if "is_active" in data:
            validated_data["is_active"] = bool(data["is_active"])
        
        if "assistant_id" in data:
            validated_data["assistant_id"] = validate_positive_integer(data["assistant_id"], "assistant_id")
        
        if "bot_token" in data:
            bot_token = str(data["bot_token"]).strip()
            if not bot_token:
                raise ValidationError("Токен бота не может быть пустым", "bot_token")
            validated_data["bot_token"] = bot_token
            
    except ValidationError as e:
        raise create_validation_error_response(e)
    
    # Обновить поля
    if "is_active" in validated_data:
        bot_instance.is_active = validated_data["is_active"]
    if "assistant_id" in validated_data:
        # Проверить, что новый ассистент принадлежит пользователю
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == validated_data["assistant_id"],
            models.Assistant.user_id == current_user.id
        ).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")
        bot_instance.assistant_id = validated_data["assistant_id"]
    if "bot_token" in validated_data:
        bot_instance.bot_token = validated_data["bot_token"]
    
    db.commit()
    
    # Перезагружаем конкретный бот после обновления
    reload_specific_bot(bot_id, db)
    
    return {"success": True}

@router.delete("/bot-instances/{bot_id}")
def delete_bot_instance(bot_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Удалить бот (только для владельцев организации)"""
    # Проверяем, что пользователь является владельцем организации
    if not auth.is_organization_owner(current_user, db):
        raise HTTPException(
            status_code=403, 
            detail="Только владельцы организации могут удалять ботов"
        )
    
    effective_user_id = auth.get_effective_user_id(current_user, db)
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.id == bot_id,
        models.BotInstance.user_id == effective_user_id
    ).first()
    
    if not bot_instance:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    db.delete(bot_instance)
    db.commit()
    
    # Останавливаем конкретный бот после удаления
    reload_specific_bot(bot_id, db)
    
    return {"message": "Bot deleted successfully"}

@router.get("/bot-instances/{bot_id}/assistant")
def get_bot_assistant(bot_id: int, db: Session = Depends(get_db)):
    """Получить ассистента для конкретного бота (используется ботами)"""
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.id == bot_id,
        models.BotInstance.is_active == True
    ).first()
    
    if not bot_instance:
        return None
        
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == bot_instance.assistant_id
    ).first()
    
    if not assistant:
        return None
        
    return {
        "id": assistant.id,
        "name": assistant.name,
        "system_prompt": assistant.system_prompt,
        "is_active": assistant.is_active,
        # Не передаем токены в ассистенте - они теперь в BotInstance
    }

@router.post("/start-bot/{bot_id}")
def start_bot(bot_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Запустить конкретный бот"""
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.id == bot_id,
        models.BotInstance.user_id == current_user.id
    ).first()
    
    if not bot_instance:
        raise HTTPException(status_code=404, detail="Bot instance not found")
    
    # Активировать бот
    bot_instance.is_active = True
    db.commit()
    
    # Здесь будем запускать бот (пока заглушка)
    # TODO: Интеграция с bot managers
    
    return {"success": True, "message": f"Bot {bot_id} started"}

@router.post("/stop-bot/{bot_id}")
def stop_bot(bot_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Остановить конкретный бот"""
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.id == bot_id,
        models.BotInstance.user_id == current_user.id
    ).first()
    
    if not bot_instance:
        raise HTTPException(status_code=404, detail="Bot instance not found")
    
    # Деактивировать бот
    bot_instance.is_active = False
    db.commit()
    
    # Здесь будем останавливать бот (пока заглушка)
    # TODO: Интеграция с bot managers
    
    return {"success": True, "message": f"Bot {bot_id} stopped"}

# Admin endpoint for getting user's bots
@router.get("/admin/bot-instances/{user_id}")
def get_user_bot_instances_admin(user_id: int, current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Получить все боты конкретного пользователя (для админа)"""
    bot_instances = db.query(models.BotInstance).filter(
        models.BotInstance.user_id == user_id
    ).all()
    
    result = []
    for bot in bot_instances:
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == bot.assistant_id
        ).first()
        
        result.append({
            "id": bot.id,
            "user_id": bot.user_id,
            "platform": bot.platform,
            "assistant_id": bot.assistant_id,
            "assistant_name": assistant.name if assistant else "Удален",
            "is_active": bot.is_active,
            "created_at": bot.created_at.isoformat() if bot.created_at else None,
            "bot_token": bot.bot_token
        })
    
    return result 

# === BOT INTERNAL API ENDPOINTS (без авторизации пользователя) ===

@router.get("/bot/dialogs")
def get_bot_dialogs(
    user_id: int = Query(...),
    assistant_id: int = Query(...),
    telegram_chat_id: int = Query(None),
    db: Session = Depends(get_db)
):
    """Получить диалоги для бота (без авторизации пользователя)"""
    q = db.query(models.Dialog).filter(
        models.Dialog.user_id == user_id,
        models.Dialog.assistant_id == assistant_id
    )
    
    if telegram_chat_id:
        q = q.filter(models.Dialog.telegram_chat_id == str(telegram_chat_id))
    
    dialogs = q.order_by(models.Dialog.started_at.desc()).all()
    
    result = []
    for d in dialogs:
        result.append({
            "id": d.id,
            "user_id": d.user_id,
            "assistant_id": d.assistant_id,
            "started_at": d.started_at.strftime('%Y-%m-%d %H:%M:%S') if d.started_at else None,
            "ended_at": d.ended_at.strftime('%Y-%m-%d %H:%M:%S') if d.ended_at else None,
            "telegram_chat_id": d.telegram_chat_id
        })
    return result

@router.post("/bot/dialogs")
def create_bot_dialog(data: dict, db: Session = Depends(get_db)):
    """Создать диалог для бота (без авторизации пользователя)"""
    user_id = data.get('user_id')
    assistant_id = data.get('assistant_id')
    telegram_chat_id = data.get('telegram_chat_id')
    telegram_username = data.get('telegram_username')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    if not user_id or not assistant_id:
        raise HTTPException(status_code=400, detail="user_id and assistant_id are required")
    
    # Конвертируем chat_id в строку, так как в БД он хранится как String
    telegram_chat_id_str = str(telegram_chat_id) if telegram_chat_id else None
    
    dialog = models.Dialog(
        user_id=user_id,
        assistant_id=assistant_id,
        telegram_chat_id=telegram_chat_id_str,
        telegram_username=telegram_username,
        first_name=first_name,
        last_name=last_name,
        started_at=datetime.utcnow()
    )
    
    db.add(dialog)
    db.commit()
    db.refresh(dialog)
    
    return {
        "id": dialog.id,
        "user_id": dialog.user_id,
        "assistant_id": dialog.assistant_id,
        "started_at": dialog.started_at.strftime('%Y-%m-%d %H:%M:%S'),
        "telegram_chat_id": dialog.telegram_chat_id,
        "telegram_username": dialog.telegram_username,
        "first_name": dialog.first_name,
        "last_name": dialog.last_name
    }

@router.patch("/bot/dialogs/{dialog_id}/user-info")
def update_dialog_user_info(dialog_id: int, data: dict, db: Session = Depends(get_db)):
    """Обновить информацию о пользователе в диалоге"""
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # Обновляем только переданные поля
    if 'telegram_username' in data:
        dialog.telegram_username = data['telegram_username']
    if 'first_name' in data:
        dialog.first_name = data['first_name']
    if 'last_name' in data:
        dialog.last_name = data['last_name']
    
    db.commit()
    
    return {
        "id": dialog.id,
        "telegram_username": dialog.telegram_username,
        "first_name": dialog.first_name,
        "last_name": dialog.last_name,
        "updated": True
    }

@router.post("/bot/dialogs/{dialog_id}/messages")
async def add_bot_dialog_message(dialog_id: int, data: dict, db: Session = Depends(get_db)):
    """Добавить сообщение в диалог бота (без авторизации пользователя)"""
    sender = data.get('sender')
    text = data.get('text')
    
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    
    # Проверяем существование диалога
    dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # Создаем сообщение
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
        logger.debug(f"📢 [TELEGRAM_BOT] Published Redis event for dialog {dialog_id}, message {msg.id}")
    except Exception as e:
        logger.error(f"❌ [TELEGRAM_BOT] Failed to publish Redis event for dialog {dialog_id}: {e}")
    
    # 🔥 ИНТЕГРАЦИЯ С SSE СИСТЕМОЙ
    # Отправляем сообщение в админ панель через SSE
    try:
        from services.sse_manager import push_sse_event
        
        message_data = {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() + 'Z'
        }
        
        # Отправляем в админ панель через SSE (всегда для всех Telegram сообщений)
        await push_sse_event(dialog_id, message_data)
        
        logger.info(f"✅ [TELEGRAM_BOT] Сообщение от Telegram бота отправлено через SSE в админ панель: dialog_id={dialog_id}, sender={sender}")
        
    except Exception as sse_error:
        # Не блокируем основную логику при ошибках SSE
        logger.warning(f"⚠️ [TELEGRAM_BOT] Ошибка отправки SSE сообщения в админ панель: {sse_error}")
    
    return {
        "id": msg.id,
        "sender": msg.sender,
        "text": msg.text,
        "timestamp": msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    }

@router.post("/bot/ai-response")
def get_bot_ai_response(data: dict, db: Session = Depends(get_db)):
    """Генерация AI ответа для бота (без авторизации пользователя)"""
    from services.balance_service import BalanceService
    
    user_id = data.get('user_id')
    message = data.get('message')
    assistant_id = data.get('assistant_id')
    dialog_id = data.get('dialog_id')
    
    if not user_id or not message or not assistant_id:
        raise HTTPException(status_code=400, detail="user_id, message, and assistant_id are required")
    
    try:
        # Получаем пользователя и ассистента
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")
        
        # Проверяем баланс перед генерацией ответа
        balance_service = BalanceService(db)
        if not balance_service.check_sufficient_balance(user_id, "bot_message"):
            return {
                "error": "insufficient_balance",
                "message": "Недостаточно средств на балансе для отправки сообщения бота"
            }
        
        # Загружаем историю диалога для контекста
        prompt_messages = []
        
        # 🚫 ОТКЛЮЧЕНО: Использование истории диалогов для контекста
        # Теперь каждый запрос обрабатывается независимо, без учета предыдущих сообщений
        # Это предотвращает «запоминание» старой информации из документов
        
        # Добавляем только текущее сообщение пользователя
        prompt_messages.append({"role": "user", "content": message})
        
        # Используем модель и системный промпт из ассистента
        ai_model = assistant.ai_model or 'gpt-4o-mini'
        base_system_prompt = assistant.system_prompt or 'Вы — корпоративный AI-ассистент. Предоставляю точную информацию по вопросам компании в деловом стиле. Отвечаю кратко, информативно, без использования смайликов и чрезмерной эмоциональности. ВАЖНО: Опираюсь ТОЛЬКО на данные из базы знаний компании. Если информации нет в предоставленных документах — сообщаю об этом прямо, не выдумываю и не использую общие знания.'
        
        # Добавляем вариативность и контекстные инструкции
        system_prompt = prompt_variations.add_response_variety_instructions(base_system_prompt)
        if message:
            system_prompt = prompt_variations.get_context_aware_prompt(message, system_prompt)
        
        # 🚀 НОВЫЙ ПОДХОД: RETRIEVAL-BASED ПОИСК РЕЛЕВАНТНЫХ ЗНАНИЙ
        # Вместо загрузки всех знаний ищем только релевантные фрагменты
        relevant_chunks = []
        
        # Сначала пробуем embeddings, затем fallback на старую систему
        try:
            from services.embeddings_service import embeddings_service
            
            # 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ
            logger.info(f"🔍 QUERY TRACE: user_id={user_id}, assistant_id={assistant_id}, query='{message}'")
            
            # Ищем релевантные чанки для запроса пользователя
            from core.app_config import RAG_TOP_K_BOT, RAG_MIN_SIMILARITY
            relevant_chunks = embeddings_service.search_relevant_chunks(
                query=message,
                user_id=user_id,
                assistant_id=assistant_id,
                top_k=RAG_TOP_K_BOT,
                min_similarity=RAG_MIN_SIMILARITY,
                include_qa=True,  # Включаем Q&A поиск
                qa_limit=3,       # Максимум 3 Q&A результата
                db=db
            )
            
            logger.info(f"📊 Embeddings search: found {len(relevant_chunks)} relevant chunks")
            for i, chunk in enumerate(relevant_chunks):
                logger.info(f"   Chunk {i+1}: similarity={chunk['similarity']:.3f}, type={chunk['doc_type']}, text='{chunk['text'][:100]}...'")
            
            
        except Exception as e:
            logger.warning(f"Embeddings search failed: {e}")
            relevant_chunks = []
        
        # Если embeddings не дали результатов, используем fallback
        if not relevant_chunks:
            logger.info("⚠️  Using fallback knowledge system...")
            
            # Fallback: используем старую систему знаний
            knowledge_entries = db.query(models.UserKnowledge).filter(
                models.UserKnowledge.user_id == user_id,
                models.UserKnowledge.assistant_id == assistant_id
            ).all()
            
            logger.info(f"📚 Fallback: found {len(knowledge_entries)} knowledge entries")
            
            for i, entry in enumerate(knowledge_entries):
                logger.info(f"   Entry {i+1}: id={entry.id}, type={entry.doc_type}, content='{entry.content[:100]}...'")
                relevant_chunks.append({
                    'text': entry.content,
                    'doc_type': entry.doc_type or 'document',
                    'importance': entry.importance or 10,
                    'similarity': 0.8,  # Фиксированная схожесть для fallback
                    'token_count': len(entry.content) // 4
                })
        
        # Добавляем релевантные знания в промпт или строгие ограничения
        if relevant_chunks:
            # Сортируем по важности и схожести
            relevant_chunks.sort(key=lambda x: (x['importance'], x['similarity']), reverse=True)
            
            # Единая упаковка контекста
            from services.embeddings_service import embeddings_service
            from core.app_config import RAG_MAX_CONTEXT_TOKENS_BOT
            context_parts, total_tokens = embeddings_service.build_context_messages(relevant_chunks, max_context_tokens=RAG_MAX_CONTEXT_TOKENS_BOT)
            
            if context_parts:
                # Добавляем тип в текст для информативности
                typed_parts = []
                for cp, ch in zip(context_parts, relevant_chunks):
                    typed_parts.append(f"[{ch['doc_type']}] {cp}")
                context_text = '\n\n---\n\n'.join(typed_parts)
                prompt_messages.insert(0, {
                    "role": "system", 
                    "content": f"Используй ТОЛЬКО следующую информацию из базы знаний компании для ответа. ЗАПРЕЩЕНО использовать общие знания или придумывать информацию:\n\n{context_text}"
                })
                logger.info(f"Added {len(context_parts)} relevant chunks to context ({total_tokens} tokens)")
            else:
                # Если нет полезного контента в чанках
                prompt_messages.insert(0, {
                    "role": "system",
                    "content": "В базе знаний компании НЕТ информации для ответа на данный вопрос. Ты ДОЛЖЕН честно сказать: 'К сожалению, в моей базе знаний нет информации по данному вопросу. Рекомендую обратиться к менеджеру компании.' ЗАПРЕЩЕНО придумывать или использовать общие знания."
                })
        else:
            # Если вообще нет релевантных чанков
            prompt_messages.insert(0, {
                "role": "system",
                "content": "У этого ассистента НЕТ релевантной информации в базе знаний для данного вопроса. Ты ДОЛЖЕН честно сказать: 'К сожалению, в моей базе знаний нет информации по данному вопросу. Рекомендую обратиться к менеджеру компании.' КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать общие знания, тренировочные данные или придумывать информацию о услугах, товарах или компании."
            })
        
        # Добавляем системный промпт
        prompt_messages.insert(0, {"role": "system", "content": system_prompt})
        
        # Генерируем AI ответ
        completion = ai_token_manager.make_openai_request(
            messages=prompt_messages,
            model=ai_model,
            user_id=user_id,
            assistant_id=assistant_id,
            temperature=0.9,
            max_tokens=1000,
            presence_penalty=0.3,
            frequency_penalty=0.3
        )
        
        response = completion.choices[0].message.content.strip()
        
        # 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОТВЕТА
        logger.info(f"🤖 Generated response: '{response[:200]}...'")
        if 'время работы' in response.lower() or '9:00' in response or '18:00' in response:
            logger.warning(f"🚨 RESPONSE CONTAINS WORKING HOURS INFO!")
            logger.warning(f"   Full response: {response}")
            logger.warning(f"   Chunks used: {len(relevant_chunks)}")
            if relevant_chunks:
                for chunk in relevant_chunks:
                    logger.warning(f"     - {chunk['doc_type']}: {chunk['text'][:100]}...")
            else:
                logger.warning(f"   NO CHUNKS USED - AI generated response from training data!")
        
        # Списываем средства за сообщение бота
        try:
            transaction = balance_service.charge_for_service(user_id, "bot_message", f"Сообщение бота {assistant.name}")
            logger.info(f"Charged user {user_id} for bot message: {abs(transaction.amount)} руб.")
        except Exception as e:
            logger.error(f"Failed to charge user {user_id} for bot message: {e}")
            return {
                "error": "payment_failed",
                "message": "Ошибка списания средств"
            }
        
        # Инвалидация кэша ответов при обновлении знаний/промпта обеспечивается через различные ключи и knowledge_version
        return {
            "response": response,
            "assistant_id": assistant_id,
            "model_used": ai_model
        }
        
    except Exception as e:
        logger.error(f"Bot AI response error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")

# === BOT RELOAD ENDPOINTS ===

def reload_bot_helper(user_id: int):
    """Перезапускает Telegram бота для пользователя"""
    try:
        subprocess.run(["node", "scripts/reload_telegram_bot.js", str(user_id)])
    except Exception as e:
        print(f"Error reloading bot: {e}")

@router.post("/reload-bot")
def reload_bot_endpoint(data: ReloadBotRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Перезапускает Telegram бота для пользователя"""
    background_tasks.add_task(reload_bot_helper, data.user_id)
    return {"status": "ok"}

@router.get("/bot-instances/by-assistant/{assistant_id}")
def get_bot_instance_by_assistant(assistant_id: int, db: Session = Depends(get_db)):
    """Получает bot instance по assistant_id для bot manager'а (ОПТИМИЗИРОВАНО)"""
    try:
        # Оптимизированный запрос с использованием составного индекса
        bot_instance = db.query(
            models.BotInstance.id,
            models.BotInstance.assistant_id,
            models.BotInstance.user_id,
            models.BotInstance.platform,
            models.BotInstance.is_active
        ).filter(
            models.BotInstance.assistant_id == assistant_id,
            models.BotInstance.is_active == True
        ).first()
        
        if not bot_instance:
            raise HTTPException(status_code=404, detail="Bot instance not found")
        
        return {
            "id": bot_instance.id,
            "assistant_id": bot_instance.assistant_id,
            "user_id": bot_instance.user_id,
            "platform": bot_instance.platform,
            "is_active": bot_instance.is_active
        }
    except Exception as e:
        logger.error(f"Error getting bot instance by assistant_id {assistant_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error")