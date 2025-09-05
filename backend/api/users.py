from fastapi import APIRouter, Depends, HTTPException, Query, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timezone
import json
import logging
from pydantic import BaseModel

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db
from validators.rate_limiter import rate_limit_api
from cache.redis_cache import cache
from validators.input_validator import (
    validate_user_profile_data, 
    ValidationError, create_validation_error_response
)

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# --- Admin User Management ---

# GET /admin/users endpoint перенесен в api/admin.py для лучшей организации

@router.post("/admin/users", response_model=schemas.UserRead)
@rate_limit_api(limit=20, window=60)  # 20 создани пользователей в минуту
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    db_user = crud.create_user(db, user)
    
    # Обрабатываем дополнительные поля, если они предоставлены
    if hasattr(user, 'ai_token') and user.ai_token:
        crud.set_openai_token(db, db_user.id, user.ai_token)
    
    if hasattr(user, 'telegram_token') and user.telegram_token:
        crud.set_telegram_token(db, db_user.id, user.telegram_token)
    
    return db_user

@router.patch("/admin/users/{user_id}", response_model=schemas.UserRead)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    print(f"[ENDPOINT] Получен запрос на обновление пользователя {user_id}")
    print(f"[ENDPOINT] Данные для обновления: {user_update.dict()}")
    print(f"[ENDPOINT] Текущий админ: {current_user.email}")
    result = crud.update_user(db, user_id, user_update)
    if not result:
        print(f"[ENDPOINT] Пользователь {user_id} не найден")
        raise HTTPException(status_code=404, detail="User not found")
    print(f"[ENDPOINT] Пользователь {user_id} успешно обновлен")
    return result

@router.delete("/admin/users/{user_id}")
@rate_limit_api(limit=10, window=60)  # 10 удалений в минуту
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Безопасное удаление пользователя со всеми связанными данными"""
    
    # Проверяем, существует ли пользователь
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Сохраняем email перед удалением
    user_email = user.email
    
    # Получаем все боты пользователя перед удалением
    user_bot_instances = db.query(models.BotInstance).filter(models.BotInstance.user_id == user_id).all()
    
    try:
        # 1. Останавливаем все боты пользователя
        import requests
        for bot_instance in user_bot_instances:
            try:
                # Останавливаем бота через мастер-процесс
                requests.post(f'http://localhost:3001/workers/{bot_instance.id}/stop', timeout=5)
                print(f"🛑 Остановлен бот {bot_instance.id} пользователя {user_id}")
            except Exception as e:
                print(f"⚠️ Ошибка остановки бота {bot_instance.id}: {e}")
        
        # 2. Удаляем пользователя с помощью улучшенной функции в crud.py
        # Она безопасно удалит все связанные данные в правильном порядке
        success = crud.delete_user(db, user_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Ошибка удаления пользователя")
        
        # 3. Синхронизация с мастер-процессом
        try:
            requests.post('http://localhost:3001/workers/sync', timeout=10)
            print(f"✅ Синхронизация мастер-процесса завершена после удаления пользователя {user_id}")
        except Exception as e:
            print(f"⚠️ Ошибка синхронизации мастер-процесса: {e}")
        
        print(f"✅ Пользователь {user_id} ({user_email}) и все связанные данные успешно удалены")
        
        return {"ok": True, "message": f"Пользователь {user_email} и все связанные данные удалены"}
        
    except HTTPException:
        # Повторно выбрасываем HTTP исключения
        raise
    except Exception as e:
        print(f"❌ Критическая ошибка удаления пользователя {user_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка удаления пользователя")

@router.get("/admin/users/detailed")
def get_detailed_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получение детальной информации о пользователях с пагинацией и фильтрами (с кэшированием)"""
    
    # Проверяем кэш (TTL: 2 минуты для admin данных)
    cache_params = {
        "page": page,
        "limit": limit,
        "search": search or "none",
        "status": status or "none"
    }
    cached_result = cache.get("admin_users_detailed", **cache_params)
    
    if cached_result:
        logger.debug("🚀 CACHE HIT: Admin users detailed")
        return cached_result
    
    logger.debug("🔍 CACHE MISS: Загружаем admin users detailed")
    
    query = db.query(models.User)
    
    # Фильтры
    if search:
        query = query.filter(
            or_(
                models.User.email.ilike(f"%{search}%"),
                models.User.first_name.ilike(f"%{search}%")
            )
        )
    
    if status:
        query = query.filter(models.User.status == status)
    
    # Общее количество
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    
    # ИСПРАВЛЕНИЕ N+1: Получаем все статистики одним запросом для каждого типа
    user_ids = [user.id for user in users]
    
    # Статистика диалогов - один запрос
    dialogs_stats = db.query(
        models.Dialog.user_id,
        func.count(models.Dialog.id).label('total_dialogs'),
        func.max(models.Dialog.started_at).label('last_activity')
    ).filter(
        models.Dialog.user_id.in_(user_ids)
    ).group_by(models.Dialog.user_id).all()
    
    dialogs_dict = {stat.user_id: (stat.total_dialogs, stat.last_activity) for stat in dialogs_stats}
    
    # Статистика сообщений - один запрос
    messages_stats = db.query(
        models.Dialog.user_id,
        func.count(models.DialogMessage.id).label('total_messages')
    ).join(models.DialogMessage).filter(
        models.Dialog.user_id.in_(user_ids)
    ).group_by(models.Dialog.user_id).all()
    
    messages_dict = {stat.user_id: stat.total_messages for stat in messages_stats}
    
    # Статистика ассистентов - один запрос
    assistants_stats = db.query(
        models.Assistant.user_id,
        func.count(models.Assistant.id).label('total_assistants')
    ).filter(
        models.Assistant.user_id.in_(user_ids)
    ).group_by(models.Assistant.user_id).all()
    
    assistants_dict = {stat.user_id: stat.total_assistants for stat in assistants_stats}
    
    # Статистика документов - один запрос
    documents_stats = db.query(
        models.Document.user_id,
        func.count(models.Document.id).label('total_documents')
    ).filter(
        models.Document.user_id.in_(user_ids)
    ).group_by(models.Document.user_id).all()
    
    documents_dict = {stat.user_id: stat.total_documents for stat in documents_stats}
    
    # Формируем результат без дополнительных запросов
    detailed_users = []
    for user in users:
        total_dialogs, last_activity = dialogs_dict.get(user.id, (0, None))
        total_messages = messages_dict.get(user.id, 0)
        total_assistants = assistants_dict.get(user.id, 0)
        total_documents = documents_dict.get(user.id, 0)
        
        detailed_users.append({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "role": user.role,
            "status": user.status,
            "created_at": user.created_at,
            "is_email_confirmed": user.is_email_confirmed,
            "stats": {
                "totalDialogs": total_dialogs,
                "totalMessages": total_messages,
                "totalAssistants": total_assistants,
                "totalDocuments": total_documents,
                "lastActivity": last_activity
            }
        })
    
    result = {
        "users": detailed_users,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }
    
    # Сохраняем в кэш на 2 минуты для admin данных
    cache.set("admin_users_detailed", result, 120, **cache_params)
    
    return result

# --- User Profile Management ---

@router.post("/update-activity")
def update_user_activity(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Обновление времени последней активности пользователя в ЛК"""
    # Получаем пользователя заново из базы данных
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_activity = user.last_activity
    new_activity = datetime.now(timezone.utc)
    user.last_activity = new_activity
    db.commit()
    logger.debug(f"User activity updated: {user.id}")
    return {"status": "ok", "timestamp": user.last_activity.isoformat()}

@router.get("/me")
def get_me(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    print(f"[GET_ME] Пользователь {current_user.id} - возвращаю данные пользователя")
    
    # Получаем баланс пользователя
    from services.balance_service import BalanceService
    balance_service = BalanceService(db)
    user_balance = balance_service.get_balance(current_user.id)
    
    # Возвращаем данные пользователя
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at.isoformat(),
        "first_name": getattr(current_user, 'first_name', None) or "",
        "is_employee": False,
        "balance": user_balance
    }
    
    return response_data

@router.patch("/me")
def update_me(data: dict = Body(...), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Обновить профиль пользователя"""
    logger.debug(f"User {current_user.id} updating profile")
    
    # Валидация входных данных
    try:
        validated_data = validate_user_profile_data(data)
    except ValidationError as e:
        raise create_validation_error_response(e)
    
    # Разрешенные поля для обновления
    allowed_fields = ['first_name']
    
    updated = False
    for field, value in validated_data.items():
        if field in allowed_fields and hasattr(current_user, field):
            setattr(current_user, field, value)
            updated = True
            logger.debug(f"Updated field {field} for user {current_user.id}")
    
    if updated:
        db.commit()
        db.refresh(current_user)
        logger.info(f"Profile updated for user {current_user.id}")
    
    # Возвращаем обновленные данные
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at.isoformat(),
        "first_name": getattr(current_user, 'first_name', None) or ""
    }
    
    return response_data

@router.get("/me/rate-limits")
def get_my_rate_limits(
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получение своих rate limits"""
    from validators.rate_limiter import rate_limiter
    
    try:
        user_stats = rate_limiter.get_user_stats(current_user.id)
        return {
            "user_id": current_user.id,
            "rate_limits": user_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# --- User Onboarding ---

class OnboardingStatusUpdate(BaseModel):
    step: Optional[int] = None
    completed: Optional[bool] = None
    skipped: Optional[bool] = None

class TutorialTipSave(BaseModel):
    tip_id: str

@router.get("/users/onboarding/status")
def get_onboarding_status(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статус онбординга пользователя"""
    try:
        # Получаем свежие данные пользователя из текущей сессии БД
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {
            "onboarding_completed": user.onboarding_completed,
            "onboarding_step": user.onboarding_step,
            "onboarding_started_at": user.onboarding_started_at,
            "onboarding_completed_at": user.onboarding_completed_at,
            "onboarding_skipped": user.onboarding_skipped,
            "first_bot_created": user.first_bot_created,
            "first_message_sent": user.first_message_sent,
            "tutorial_tips_shown": json.loads(user.tutorial_tips_shown or "[]"),
            "should_show_onboarding": not user.onboarding_completed and not user.onboarding_skipped
        }
    except Exception as e:
        logger.error(f"Ошибка получения статуса онбординга: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения статуса онбординга")

@router.post("/users/onboarding/start")
def start_onboarding(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Начать онбординг"""
    try:
        current_user.onboarding_started_at = datetime.utcnow()
        current_user.onboarding_step = 1
        current_user.onboarding_completed = False
        current_user.onboarding_skipped = False
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Пользователь {current_user.id} начал онбординг")
        
        return {
            "message": "Онбординг начат",
            "onboarding_step": current_user.onboarding_step,
            "started_at": current_user.onboarding_started_at
        }
    except Exception as e:
        logger.error(f"Ошибка начала онбординга: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка начала онбординга")

@router.post("/users/onboarding/update-step")
def update_onboarding_step(
    data: OnboardingStatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить шаг онбординга"""
    try:
        if data.step is not None:
            current_user.onboarding_step = data.step
            
        if data.completed is not None:
            current_user.onboarding_completed = data.completed
            if data.completed:
                current_user.onboarding_completed_at = datetime.utcnow()
                
        if data.skipped is not None:
            current_user.onboarding_skipped = data.skipped
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Обновлен статус онбординга пользователя {current_user.id}: step={data.step}, completed={data.completed}, skipped={data.skipped}")
        
        return {
            "message": "Статус онбординга обновлен",
            "onboarding_step": current_user.onboarding_step,
            "onboarding_completed": current_user.onboarding_completed,
            "onboarding_skipped": current_user.onboarding_skipped
        }
    except Exception as e:
        logger.error(f"Ошибка обновления шага онбординга: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка обновления статуса онбординга")

@router.post("/users/onboarding/complete")
def complete_onboarding(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Завершить онбординг"""
    try:
        current_user.onboarding_completed = True
        current_user.onboarding_completed_at = datetime.utcnow()
        current_user.onboarding_step = 5  # Финальный шаг
        current_user.first_bot_created = True  # Отмечаем, что создали первого бота
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Пользователь {current_user.id} завершил онбординг")
        
        return {
            "message": "Онбординг завершен",
            "completed_at": current_user.onboarding_completed_at,
            "first_bot_created": current_user.first_bot_created
        }
    except Exception as e:
        logger.error(f"Ошибка завершения онбординга: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка завершения онбординга")

@router.post("/users/onboarding/skip")
def skip_onboarding(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Пропустить онбординг"""
    try:
        current_user.onboarding_skipped = True
        current_user.onboarding_completed = True  # Считаем "завершенным" чтобы не показывать снова
        current_user.onboarding_completed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Пользователь {current_user.id} пропустил онбординг")
        
        return {
            "message": "Онбординг пропущен",
            "skipped": True,
            "completed_at": current_user.onboarding_completed_at
        }
    except Exception as e:
        logger.error(f"Ошибка пропуска онбординга: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка пропуска онбординга")

@router.post("/users/onboarding/save-tip")
def save_tutorial_tip(
    data: TutorialTipSave,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить показанную подсказку, чтобы не показывать повторно"""
    try:
        shown_tips = json.loads(current_user.tutorial_tips_shown or "[]")
        
        if data.tip_id not in shown_tips:
            shown_tips.append(data.tip_id)
            current_user.tutorial_tips_shown = json.dumps(shown_tips)
            
            db.commit()
            db.refresh(current_user)
            
        return {
            "message": "Подсказка сохранена",
            "shown_tips": shown_tips
        }
    except Exception as e:
        logger.error(f"Ошибка сохранения подсказки: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка сохранения подсказки")

@router.post("/users/onboarding/mark-first-message")
def mark_first_message_sent(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Отметить, что пользователь отправил первое сообщение"""
    try:
        current_user.first_message_sent = True
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Пользователь {current_user.id} отправил первое сообщение")
        
        return {
            "message": "Первое сообщение отмечено",
            "first_message_sent": True
        }
    except Exception as e:
        logger.error(f"Ошибка отметки первого сообщения: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка отметки первого сообщения")

@router.post("/users/onboarding/mark-bot-created")
def mark_bot_created(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Отметить создание первого бота"""
    try:
        # Получаем пользователя из текущей сессии
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        user.first_bot_created = True
        
        db.commit()
        
        logger.info(f"Пользователь {user.id} создал первого бота")
        
        return {
            "message": "Первый бот отмечен как созданный",
            "first_bot_created": True
        }
    except Exception as e:
        logger.error(f"Ошибка отметки создания бота: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка при отметке создания бота")