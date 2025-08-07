from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List as TypingList, Optional
from datetime import datetime, timedelta
import json
import os
import logging
import jwt

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# Helper functions to avoid circular imports
def invalidate_assistant_cache(assistant_id: int):
    """Wrapper для инвалидации кэша ассистента"""
    try:
        from cache.redis_cache import chatai_cache
        chatai_cache.invalidate_assistant_cache(assistant_id)
    except ImportError:
        pass

def hot_reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import hot_reload_assistant_bots as _hot_reload
        return _hot_reload(assistant_id, db)
    except ImportError:
        pass

def reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import reload_assistant_bots as _reload
        return _reload(assistant_id, db)
    except ImportError:
        pass

# --- Assistant CRUD ---

@router.get("/assistants", response_model=TypingList[schemas.AssistantRead])
def get_my_assistants(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    effective_user_id = auth.get_effective_user_id(current_user, db)
    return crud.get_assistants(db, effective_user_id)

@router.post("/assistants", response_model=schemas.AssistantRead)
def create_my_assistant(data: schemas.AssistantCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    assistant = crud.create_assistant(db, current_user.id, data)
    
    # Перезагружаем только боты нового ассистента (если есть)
    reload_assistant_bots(assistant.id, db)
    
    return assistant

@router.patch("/assistants/{assistant_id}")
def update_my_assistant(assistant_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from validators.input_validator import validate_assistant_data, ValidationError, create_validation_error_response
    
    try:
        print(f"[UPDATE_ASSISTANT] Получены данные: {data}")
        print(f"[UPDATE_ASSISTANT] Пользователь: {current_user.id}")
        print(f"[UPDATE_ASSISTANT] Assistant ID: {assistant_id}")
        
        # Валидация входных данных
        try:
            # Для обновления name не обязательно
            temp_data = data.copy()
            if 'name' not in temp_data:
                temp_data['name'] = 'temp'  # временное значение для валидации
            validated_data = validate_assistant_data(temp_data)
            if 'name' not in data:
                del validated_data['name']  # удаляем временное значение
        except ValidationError as e:
            raise create_validation_error_response(e)
        
        # Проверяем что ассистент принадлежит пользователю
        assistant = crud.get_assistant(db, assistant_id)
        if not assistant:
            print(f"[UPDATE_ASSISTANT] Ассистент {assistant_id} не найден")
            raise HTTPException(status_code=404, detail="Assistant not found")
        if assistant.user_id != current_user.id:
            print(f"[UPDATE_ASSISTANT] Ассистент {assistant_id} принадлежит пользователю {assistant.user_id}, а не {current_user.id}")
            raise HTTPException(status_code=404, detail="Assistant not found")
        
        print(f"[UPDATE_ASSISTANT] Ассистент найден: {assistant.name}")
        
        # Создаем объект AssistantUpdate только с переданными полями
        filtered_data = {k: v for k, v in validated_data.items() if k in ['name', 'ai_model', 'system_prompt', 'is_active']}
        print(f"[UPDATE_ASSISTANT] Отфильтрованные данные: {filtered_data}")
        
        # Обновляем ассистента напрямую, без создания схемы
        for field, value in filtered_data.items():
            if hasattr(assistant, field):
                setattr(assistant, field, value)
                print(f"[UPDATE_ASSISTANT] Обновлено поле {field}: {value}")
        
        assistant.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(assistant)
        updated_assistant = assistant
        print(f"[UPDATE_ASSISTANT] Ассистент обновлен: {updated_assistant.name}")
        
        # 🔥 Инвалидируем кэш ассистента
        invalidate_assistant_cache(assistant_id)
        print(f"[UPDATE_ASSISTANT] Кэш ассистента {assistant_id} инвалидирован")
        
        # 🔥 ГОРЯЧАЯ перезагрузка настроек вместо полного перезапуска
        hot_reload_assistant_bots(assistant_id, db)
        
        return {
            "id": updated_assistant.id,
            "name": updated_assistant.name,
            "ai_model": updated_assistant.ai_model,
            "system_prompt": updated_assistant.system_prompt,
            "is_active": updated_assistant.is_active,
            "user_id": updated_assistant.user_id,
            "created_at": updated_assistant.created_at.isoformat() if updated_assistant.created_at else None,
            "updated_at": updated_assistant.updated_at.isoformat() if updated_assistant.updated_at else None
        }
    except Exception as e:
        print(f"[UPDATE_ASSISTANT] Ошибка: {e}")
        import traceback
        print(f"[UPDATE_ASSISTANT] Traceback: {traceback.format_exc()}")
        raise

@router.delete("/assistants/{assistant_id}")
def delete_my_assistant(assistant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Проверяем, что пользователь является владельцем организации
    if not auth.is_organization_owner(current_user, db):
        raise HTTPException(
            status_code=403, 
            detail="Только владельцы организации могут удалять ассистентов"
        )
    
    effective_user_id = auth.get_effective_user_id(current_user, db)
    assistant = crud.get_assistant(db, assistant_id)
    if not assistant or assistant.user_id != effective_user_id:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Найти все бот-инстансы связанные с этим ассистентом
    bot_instances = db.query(models.BotInstance).filter(
        models.BotInstance.assistant_id == assistant_id,
        models.BotInstance.user_id == current_user.id
    ).all()
    
    # Остановить и удалить все связанные бот-инстансы
    for bot_instance in bot_instances:
        print(f"[DELETE_ASSISTANT] Удаляем бот-инстанс {bot_instance.id} связанный с ассистентом {assistant_id}")
        
        # Остановить бот через мульти-бот менеджер
        try:
            import requests
            response = requests.post(
                "http://127.0.0.1:3001/stop-bots",
                json={"bot_ids": [bot_instance.id]},
                timeout=5
            )
            print(f"[DELETE_ASSISTANT] Остановлен бот {bot_instance.id}: {response.status_code}")
        except Exception as e:
            print(f"[DELETE_ASSISTANT] Ошибка остановки бота {bot_instance.id}: {e}")
        
        # Удалить бот-инстанс из базы данных
        db.delete(bot_instance)
    
    # Удалить ассистента
    crud.delete_assistant(db, assistant_id)
    
    # Сохранить изменения
    db.commit()
    
    print(f"[DELETE_ASSISTANT] Ассистент {assistant_id} и {len(bot_instances)} связанных ботов удалены")
    
    return {"ok": True}

# --- Assistant Settings ---

@router.get("/assistants/{assistant_id}/settings")
def get_assistant_settings(assistant_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить настройки конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    return {
        "id": assistant.id,
        "name": assistant.name,
        "ai_model": assistant.ai_model,
        "system_prompt": assistant.system_prompt,
        "is_active": assistant.is_active
    }

@router.get("/assistants/{assistant_id}/embed-code")
def get_assistant_embed_code(
    assistant_id: int, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Получить embed код для конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    from core.app_config import SITE_SECRET
    
    # Используем переменные окружения для URL
    from core.app_config import FRONTEND_URL
    
    payload = {
        'user_id': current_user.id,
        'assistant_id': assistant_id,
        'type': 'site'
        # Убираем exp - токен бессрочный пока существует ассистент
    }
    site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    
    # Генерируем embed код в формате script tag
    embed_code = f'<script src="{FRONTEND_URL}/widget.js?token={site_token}&theme=blue&type=floating&host={FRONTEND_URL}" async></script>'
    
    return {
        "embed_code": embed_code,
        "token": site_token,
        "assistant_id": assistant_id,
        "assistant_name": assistant.name
    }

@router.post("/assistants/{assistant_id}/widget-settings")
def save_assistant_widget_settings(
    assistant_id: int,
    settings: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить настройки виджета для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Здесь можно сохранить настройки в базу данных если нужно
    # Пока просто возвращаем успешный ответ
    return {
        "success": True,
        "message": "Настройки виджета сохранены",
        "settings": settings
    }

@router.post("/assistants/{assistant_id}/website-integration")
def toggle_website_integration(
    assistant_id: int,
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Включить/выключить интеграцию с сайтом для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    enabled = data.get('enabled', False)
    assistant.website_integration_enabled = enabled
    db.commit()
    
    return {
        "success": True,
        "message": f"Интеграция с сайтом {'включена' if enabled else 'выключена'}",
        "website_integration_enabled": enabled
    }

@router.get("/assistants/{assistant_id}/widget-settings")
def get_assistant_widget_settings(
    assistant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получить настройки виджета для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Возвращаем дефолтные настройки
    default_settings = {
        "theme": "blue",
        "position": "bottom-right",
        "welcomeMessage": "Привет! Чем могу помочь?",
        "buttonText": "Поддержка",
        "showAvatar": True,
        "showOnlineStatus": True,
        "buttonSize": 80,
        "borderRadius": 16
    }
    
    return {
        "settings": default_settings,
        "assistant_id": assistant_id
    }

@router.get("/assistants/{assistant_id}/knowledge")
def get_assistant_knowledge(assistant_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить знания конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Получаем ТОЛЬКО знания, привязанные к этому ассистенту
    # НЕ используем fallback к общим знаниям - каждый ассистент должен быть уникальным
    knowledge_with_docs = db.query(
        models.UserKnowledge,
        models.Document
    ).join(
        models.Document, 
        models.UserKnowledge.doc_id == models.Document.id
    ).filter(
        models.UserKnowledge.user_id == current_user.id,
        models.UserKnowledge.assistant_id == assistant_id  # ТОЛЬКО этого ассистента
    ).all()
    
    # Формируем документы только из знаний этого ассистента
    documents = []
    for entry, doc in knowledge_with_docs:
        doc_type = entry.doc_type or "Документ"
        
        if doc.filename.startswith('quick_fix_'):
            documents.append(entry.content)
        else:
            prefix = f"Информация из документа типа '{doc_type}':\n"
            documents.append(prefix + entry.content)
    
    return {
        "assistant_id": assistant_id,
        "system_prompt": assistant.system_prompt,
        "documents": documents  # Будет пустой список для нового ассистента
    }



# --- User Assistant Lookup (for bots) ---

@router.get("/user-telegram-assistant/{user_id}")
def get_user_telegram_assistant(user_id: int, db: Session = Depends(get_db)):
    """Получить ассистента привязанного к Telegram боту пользователя"""
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.user_id == user_id,
        models.BotInstance.platform == 'telegram',
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
        "is_active": assistant.is_active
    }


@router.get("/assistants/stats")
def get_assistants_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Получить статистику по всем ассистентам пользователя"""
    effective_user_id = auth.get_effective_user_id(current_user, db)
    
    # Получаем все ассистенты пользователя
    assistants = crud.get_assistants(db, effective_user_id)
    
    # Общая статистика
    total_assistants = len(assistants)
    active_assistants = len([a for a in assistants if a.is_active])
    
    # Статистика по сообщениям за последний месяц
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    total_messages = 0
    total_dialogs = 0
    assistant_stats = []
    
    for assistant in assistants:
        # Подсчет сообщений для каждого ассистента
        messages_count = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == effective_user_id,
            models.Dialog.assistant_id == assistant.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= month_ago
        ).scalar() or 0
        
        # Подсчет диалогов для каждого ассистента
        dialogs_count = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == effective_user_id,
            models.Dialog.assistant_id == assistant.id,
            models.Dialog.started_at >= month_ago
        ).scalar() or 0
        
        total_messages += messages_count
        total_dialogs += dialogs_count
        
        assistant_stats.append({
            "id": assistant.id,
            "name": assistant.name,
            "messages": messages_count,
            "dialogs": dialogs_count,
            "is_active": assistant.is_active
        })
    
    return {
        "global": {
            "totalAssistants": total_assistants,
            "activeAssistants": active_assistants,
            "totalMessages": total_messages,
            "totalDialogs": total_dialogs
        },
        "byAssistant": assistant_stats
    }