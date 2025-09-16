from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db, schemas
from core import auth
from database.models import User, Assistant

router = APIRouter()

def get_ai_settings(current_user: User, db: Session):
    """Получаем настройки AI из активного ассистента пользователя"""
    # Получаем активного ассистента
    active_assistant = db.query(Assistant).filter(
        Assistant.user_id == current_user.id,
        Assistant.is_active == True
    ).first()
    
    ai_model = 'gpt-4o-mini'
    system_prompt = 'Добро пожаловать! Я Ваш AI-ассистент. Готов предоставить информацию и помочь с любыми вопросами на основе загруженных в мою базу знаний материалов. Отвечаю вежливо, обращаясь к Вам на «Вы». ВАЖНО: Я использую только предоставленную Вами информацию, не выдумываю ответы.'
    
    if active_assistant:
        ai_model = active_assistant.ai_model or ai_model
        system_prompt = active_assistant.system_prompt or system_prompt
    
    return {
        "ai_model": ai_model,
        "system_prompt": system_prompt
    }

def update_ai_settings(current_user: User, data: dict, db: Session):
    """Обновляем настройки AI через активного ассистента"""
    # Получаем активного ассистента
    active_assistant = db.query(Assistant).filter(
        Assistant.user_id == current_user.id,
        Assistant.is_active == True
    ).first()
    
    # Если нет активного ассистента, создаем его
    if not active_assistant:
        active_assistant = Assistant(
            user_id=current_user.id,
            name="Мой ассистент",
            ai_model='gpt-4o-mini',
            system_prompt='Добро пожаловать! Я Ваш AI-ассистент. Отвечаю на основе загруженных материалов, всегда обращаясь на «Вы».',
            is_active=True
        )
        db.add(active_assistant)
        db.flush()
    
    # Обновляем поля ассистента
    model = data.get("ai_model")
    prompt = data.get("system_prompt")
    
    if model:
        active_assistant.ai_model = model
    if prompt:
        active_assistant.system_prompt = prompt
    
    db.commit()
    db.refresh(active_assistant)
    
    return {
        "ai_model": active_assistant.ai_model,
        "system_prompt": active_assistant.system_prompt
    }

def get_user_profile(user: User):
    """Получаем профиль пользователя БЕЗ AI настроек"""
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "first_name": user.first_name or ""
    }

def get_current_user_data(current_user: User):
    """Возвращаем ТОЛЬКО данные пользователя"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at,
        "first_name": current_user.first_name or ""
    }

# API эндпоинты
@router.get("/api/ai-settings")
def get_ai_settings_endpoint(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить настройки AI"""
    return get_ai_settings(current_user, db)

@router.post("/api/ai-settings")
def update_ai_settings_endpoint(data: dict, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Обновить настройки AI"""
    return update_ai_settings(current_user, data, db)

@router.get("/api/user-profile")
def get_user_profile_endpoint(current_user: User = Depends(auth.get_current_user)):
    """Получить профиль пользователя"""
    return get_user_profile(current_user)