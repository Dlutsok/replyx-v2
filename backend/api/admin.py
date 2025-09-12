from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text, desc, asc, or_, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import psutil
import os
import subprocess
import asyncio
from functools import lru_cache

from database.connection import get_db
from database import models, schemas, crud
from core import auth
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# === AI Token Management Models ===

class AITokenCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    name: str
    token: str
    model_access: str = "gpt-4o,gpt-4o-mini"
    daily_limit: int = 10000
    monthly_limit: int = 300000
    priority: int = 1
    notes: Optional[str] = None

class AITokenUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    name: Optional[str] = None
    model_access: Optional[str] = None
    daily_limit: Optional[int] = None
    monthly_limit: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

# === Basic Admin Endpoints ===

@router.get("/admin/tokens", response_model=List[schemas.TokenRead])
def get_tokens(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return crud.get_tokens(db)

@router.post("/admin/tokens", response_model=schemas.TokenRead)
def create_token(token: schemas.TokenCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return crud.create_token(db, token, owner_id=current_user.id)

@router.delete("/admin/tokens/{token_id}")
def delete_token(token_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    crud.delete_token(db, token_id)
    return {"ok": True}

@router.get("/admin/openai-token/{user_id}", response_model=schemas.OpenAITokenRead)
def get_openai_token_admin(user_id: int, admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    token = crud.get_openai_token(db, user_id)
    if not token:
        raise HTTPException(status_code=404, detail="OpenAI token not set")
    return token

@router.post("/admin/openai-token/{user_id}", response_model=schemas.OpenAITokenRead)
def set_openai_token_admin(user_id: int, data: schemas.OpenAITokenCreate, admin: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    token = crud.set_openai_token(db, user_id, data.token)
    return token

@router.get("/admin/embed-codes")
def get_all_embed_codes(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    users = db.query(models.User).all()
    embed_codes = []
    for user in users:
        embed_codes.append({
            "user_id": user.id,
            "email": user.email,
            "embed_code": f"""
<iframe 
  src="http://localhost:3000/chat-iframe?user_id={user.id}" 
  width="400" 
  height="600" 
  frameborder="0">
</iframe>
            """.strip()
        })
    return embed_codes

# === AI Token Pool Management ===

@router.get("/admin/ai-tokens")
def get_ai_tokens(current_user: models.User = Depends(auth.get_current_admin)):
    """Получить все AI токены из пула (только для администратора)"""
    from ai.ai_token_manager import ai_token_manager
    return ai_token_manager.get_token_stats()

@router.post("/admin/ai-tokens")
def create_ai_token(data: AITokenCreate, current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Добавить новый AI токен в пул"""
    from ai.ai_token_manager import ai_token_manager
    new_token = ai_token_manager.add_token(
        name=data.name,
        token=data.token,
        models_str=data.model_access,
        daily_limit=data.daily_limit,
        monthly_limit=data.monthly_limit,
        priority=data.priority,
        notes=data.notes
    )
    return {
        "id": new_token.id,
        "name": new_token.name,
        "model_access": new_token.model_access,
        "daily_limit": new_token.daily_limit,
        "monthly_limit": new_token.monthly_limit,
        "priority": new_token.priority,
        "is_active": new_token.is_active,
        "notes": new_token.notes
    }

@router.put("/admin/ai-tokens/{token_id}")
def update_ai_token(token_id: int, data: AITokenUpdate, current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Обновить AI токен"""
    token = db.query(models.AITokenPool).filter(models.AITokenPool.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="AI token not found")
    
    if data.name is not None:
        token.name = data.name
    if data.model_access is not None:
        token.model_access = data.model_access
    if data.daily_limit is not None:
        token.daily_limit = data.daily_limit
    if data.monthly_limit is not None:
        token.monthly_limit = data.monthly_limit
    if data.priority is not None:
        token.priority = data.priority
    if data.is_active is not None:
        token.is_active = data.is_active
    if data.notes is not None:
        token.notes = data.notes
    
    db.commit()
    return {"message": "AI token updated successfully"}

@router.delete("/admin/ai-tokens/{token_id}")
def delete_ai_token(token_id: int, current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Удалить AI токен"""
    token = db.query(models.AITokenPool).filter(models.AITokenPool.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="AI token not found")
    
    db.delete(token)
    db.commit()
    return {"message": "AI token deleted successfully"}

@router.get("/admin/ai-tokens/{token_id}/usage")
def get_ai_token_usage(token_id: int, current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Получить статистику использования конкретного токена"""
    # Статистика за последние 30 дней
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    usage_stats = db.query(
        func.date(models.AITokenUsage.created_at).label('date'),
        func.count(models.AITokenUsage.id).label('requests'),
        func.sum(models.AITokenUsage.total_tokens).label('tokens'),
        func.avg(models.AITokenUsage.response_time).label('avg_response_time'),
        func.sum(case((models.AITokenUsage.success == True, 1), else_=0)).label('successful_requests'),
        func.sum(case((models.AITokenUsage.success == False, 1), else_=0)).label('failed_requests')
    ).filter(
        models.AITokenUsage.token_id == token_id,
        models.AITokenUsage.created_at >= thirty_days_ago
    ).group_by(func.date(models.AITokenUsage.created_at)).all()
    
    return [
        {
            "date": stat.date.isoformat(),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "avg_response_time": round(stat.avg_response_time or 0, 2),
            "successful_requests": stat.successful_requests,
            "failed_requests": stat.failed_requests,
            "success_rate": round((stat.successful_requests / max(stat.requests, 1)) * 100, 1)
        }
        for stat in usage_stats
    ]

# === Analytics Endpoints ===

@router.get("/admin/advanced-analytics")
def get_advanced_analytics(
    period: str = Query('7d', enum=['24h', '7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Расширенная аналитика для админ панели с использованием нового сервиса"""
    try:
        # Системная статистика с реальными данными
        from services.analytics_service import analytics_service
        system_stats = analytics_service.get_admin_system_stats(db)
        
        # Топ активных пользователей (по сообщениям за период)
        days_back = {
            '24h': 1, 
            '7d': 7, 
            '30d': 30, 
            '90d': 90, 
            '1y': 365
        }[period]
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        top_users = db.query(
            models.User.id,
            models.User.email,
            func.count(models.DialogMessage.id).label('message_count')
        ).select_from(models.User).join(
            models.Dialog, models.User.id == models.Dialog.user_id
        ).join(
            models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
        ).filter(
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= start_date
        ).group_by(models.User.id, models.User.email).order_by(
            func.count(models.DialogMessage.id).desc()
        ).limit(10).all()
        
        # Топ ассистентов по активности
        top_assistants = db.query(
            models.Assistant.id,
            models.Assistant.name,
            models.User.email.label('owner_email'),
            func.count(models.DialogMessage.id).label('message_count')
        ).select_from(models.Assistant).join(
            models.User, models.Assistant.user_id == models.User.id
        ).join(
            models.Dialog, models.Assistant.id == models.Dialog.assistant_id
        ).join(
            models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
        ).filter(
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= start_date
        ).group_by(
            models.Assistant.id, 
            models.Assistant.name, 
            models.User.email
        ).order_by(
            func.count(models.DialogMessage.id).desc()
        ).limit(10).all()
        
        # Динамика по дням
        daily_dynamics = []
        for i in range(days_back):
            day = datetime.utcnow() - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            daily_stats = db.query(
                func.count(func.distinct(models.User.id)).label('active_users'),
                func.count(models.DialogMessage.id).label('messages'),
                func.count(func.distinct(models.Dialog.id)).label('dialogs')
            ).select_from(models.User).join(
                models.Dialog, models.User.id == models.Dialog.user_id
            ).join(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).filter(
                models.DialogMessage.timestamp >= day_start,
                models.DialogMessage.timestamp < day_end
            ).first()
            
            daily_dynamics.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'active_users': daily_stats.active_users or 0,
                'messages': daily_stats.messages or 0,
                'dialogs': daily_stats.dialogs or 0
            })
        
        return {
            'period': period,
            'system_overview': system_stats,
            'top_users': [
                {
                    'user_id': u.id,
                    'email': u.email,
                    'message_count': u.message_count
                } for u in top_users
            ],
            'top_assistants': [
                {
                    'assistant_id': a.id,
                    'name': a.name,
                    'owner_email': a.owner_email,
                    'message_count': a.message_count
                } for a in top_assistants
            ],
            'daily_dynamics': list(reversed(daily_dynamics)),  # От старых к новым
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in advanced analytics: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении аналитики. Попробуйте позже.")

@router.get("/admin/system-stats")
def get_system_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Получение системной статистики с реальными данными"""
    from services.analytics_service import analytics_service
    
    try:
        print("🔍 Вычисляем системную статистику с реальными данными")
        # Используем новый analytics service для получения реальных данных
        return analytics_service.get_admin_system_stats(db)
        
    except Exception as e:
        print(f"Ошибка в system-stats: {e}")
        logger.error(f"Ошибка в system-stats: {e}")
        # Возвращаем заглушку в случае ошибки
        return {
            "totalUsers": 0,
            "activeUsersToday": 0,
            "totalDialogs": 0,
            "totalMessages": 0,
            "dailyRequests": 0,
            "activeAITokens": 0,
            "userGrowth": 0.0,
            "dailyActiveGrowth": 0.0,
            "requestsChange": 0.0,
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/admin/realtime-stats")
def get_realtime_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Получение статистики в реальном времени"""
    now = datetime.utcnow()
    last_hour = now - timedelta(hours=1)
    last_2_minutes = now - timedelta(minutes=2)  # Сократил с 5 до 2 минут для более точного отслеживания
    
    # Активные диалоги (диалоги с активностью за последний час)
    active_dialogs = db.query(models.Dialog).join(
        models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
    ).filter(
        models.DialogMessage.timestamp >= last_hour
    ).distinct(models.Dialog.id).count()
    
    # Онлайн пользователи - объединяем две метрики:
    # 1. Пользователи с активностью в диалогах за последние 2 минуты
    dialog_active_users = db.query(models.Dialog).join(
        models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
    ).filter(
        models.DialogMessage.timestamp >= last_2_minutes
    ).distinct(models.Dialog.user_id).count()
    
    # 2. Пользователи с активностью в ЛК за последние 2 минуты
    lk_active_users = db.query(models.User).filter(
        models.User.last_activity >= last_2_minutes
    ).count()
    
    # Общее количество онлайн пользователей (избегаем дублирования)
    online_users_query = db.query(models.User.id).filter(
        (models.User.last_activity >= last_2_minutes) |
        (models.User.id.in_(
            db.query(models.Dialog.user_id).join(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).filter(
                models.DialogMessage.timestamp >= last_2_minutes
            ).distinct()
        ))
    ).distinct()
    online_users = online_users_query.count()
    
    # Сообщения за последний час
    messages_last_hour = db.query(models.DialogMessage).filter(
        models.DialogMessage.timestamp >= last_hour
    ).count()
    
    # Новые пользователи сегодня
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    new_users_today = db.query(models.User).filter(
        models.User.created_at >= today_start
    ).count()
    
    # Выручка сегодня - успешные платежи за текущий день
    revenue_today = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.created_at >= today_start,
        models.Payment.status == 'success'
    ).scalar() or 0.0
    
    # Выручка вчера для вычисления роста
    yesterday_start = today_start - timedelta(days=1)
    revenue_yesterday = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.created_at >= yesterday_start,
        models.Payment.created_at < today_start,
        models.Payment.status == 'success'
    ).scalar() or 0.0
    
    # Вычисление роста выручки
    revenue_growth = 0.0
    if revenue_yesterday > 0:
        revenue_growth = round(((revenue_today - revenue_yesterday) / revenue_yesterday) * 100, 1)
    elif revenue_today > 0:
        revenue_growth = 100.0
    
    return {
        "activeDialogs": active_dialogs,
        "onlineUsers": online_users,
        "lkActiveUsers": lk_active_users,
        "dialogActiveUsers": dialog_active_users,
        "messagesLastHour": messages_last_hour,
        "newUsersToday": new_users_today,
        "revenue": float(revenue_today),
        "revenueGrowth": revenue_growth,
        "timestamp": now.isoformat()
    }

# === User Management Endpoints ===

@router.get("/admin/users")
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Получить список всех пользователей"""
    users = db.query(models.User).all()
    result = []
    
    for user in users:
        # Получаем баланс из таблицы UserBalance
        user_balance = db.query(models.UserBalance).filter(models.UserBalance.user_id == user.id).first()
        balance_amount = user_balance.balance if user_balance else 0.0
        
        result.append({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "role": user.role,
            "status": user.status,
            "balance": balance_amount,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_activity": user.last_activity.isoformat() if user.last_activity else None,
            "is_email_confirmed": user.is_email_confirmed
        })
    
    return result

@router.patch("/admin/users/{user_id}")
def update_user(
    user_id: int, 
    data: dict = Body(...),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Обновить пользователя (статус, роль, имя)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Обновляем поля если они переданы
    if "status" in data:
        user.status = data["status"]
    if "role" in data:
        user.role = data["role"]
    if "first_name" in data:
        user.first_name = data["first_name"]
        
    db.commit()
    return {"message": "User updated successfully"}

@router.delete("/admin/users/{user_id}")
def delete_user_admin(
    user_id: int,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Удалить пользователя через админ панель"""
    # Проверки безопасности
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Сохраняем email перед удалением, так как объект станет недопустимым
    user_email = user.email
    
    # Логируем admin действие
    logger.info(f"Admin {current_user.email} (ID: {current_user.id}) initiating deletion of user {user_email} (ID: {user_id})")
    
    try:
        # Используем обновленную безопасную CRUD функцию
        success = crud.delete_user(db, user_id)
        
        if not success:
            logger.error(f"Failed to delete user {user_id} - user not found in CRUD")
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Successfully deleted user {user_email} (ID: {user_id}) by admin {current_user.email}")
        return {
            "message": "User deleted successfully", 
            "deleted_user_id": user_id,
            "deleted_user_email": user_email,
            "admin_action": f"Deleted by {current_user.email}"
        }
        
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id} by admin {current_user.email}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error deleting user: {str(e)}"
        )

@router.post("/admin/users/create")
def create_user_admin(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Создать нового пользователя через админ панель"""
    try:
        email = data.get("email")
        password = data.get("password")
        first_name = data.get("first_name")
        role = data.get("role", "user")
        status = data.get("status", "active")
        
        # Валидация обязательных полей
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email и пароль обязательны")
        
        # Проверяем, что пользователь с таким email не существует
        existing_user = db.query(models.User).filter(models.User.email == email.lower()).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        
        # Валидируем роль
        if role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Недопустимая роль")
        
        # Валидируем статус
        if status not in ["active", "inactive"]:
            raise HTTPException(status_code=400, detail="Недопустимый статус")
        
        # Создаем нового пользователя
        from core.auth import get_password_hash
        hashed_password = get_password_hash(password)
        
        new_user = models.User(
            email=email.lower(),  # Приводим к нижнему регистру для консистентности
            hashed_password=hashed_password,
            first_name=first_name,
            role=role,
            status=status,
            is_email_confirmed=True  # Пользователи, созданные админом, автоматически подтверждены
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Создаем начальный баланс пользователя
        user_balance = models.UserBalance(
            user_id=new_user.id,
            balance=0.0
        )
        db.add(user_balance)
        db.commit()
        
        # Логируем создание пользователя
        logger.info(f"Admin {current_user.email} created new user {email} with role {role}")
        
        return {
            "id": new_user.id,
            "email": new_user.email,
            "first_name": new_user.first_name,
            "role": new_user.role,
            "status": new_user.status,
            "is_email_confirmed": new_user.is_email_confirmed,
            "created_at": new_user.created_at.isoformat(),
            "message": f"Пользователь {email} успешно создан"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user by admin {current_user.email}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при создании пользователя: {str(e)}"
        )

@router.post("/admin/users/{user_id}/balance/topup")
def adjust_user_balance(
    user_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Пополнить или списать баланс пользователя"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    amount = data.get("amount", 0)
    description = data.get("description", f"Ручная корректировка администратором")
    
    # Получаем или создаем запись баланса
    user_balance = db.query(models.UserBalance).filter(models.UserBalance.user_id == user.id).first()
    if not user_balance:
        user_balance = models.UserBalance(user_id=user.id, balance=0.0)
        db.add(user_balance)
        db.flush()  # Получаем ID записи
    
    # Обновляем баланс
    old_balance = user_balance.balance
    new_balance = old_balance + amount
    user_balance.balance = new_balance
    
    # Создаем транзакцию
    transaction = models.BalanceTransaction(
        user_id=user.id,
        amount=amount,
        transaction_type="admin_adjustment",
        description=description,
        balance_before=old_balance,
        balance_after=new_balance
    )
    
    db.add(transaction)
    db.commit()
    
    return {
        "message": "Balance updated successfully",
        "old_balance": old_balance,
        "new_balance": new_balance,
        "transaction_id": transaction.id
    }

# === Advanced Analytics Endpoints ===

@lru_cache(maxsize=16)
def _calculate_growth_rate(current: int, previous: int) -> float:
    """Вычислить процент роста"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 2)

@router.get("/admin/analytics/overview", response_model=schemas.AdminAnalyticsOverview)
async def get_analytics_overview(
    period: str = Query('7d', enum=['24h', '7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Общая статистика для админской панели с кэшированием"""
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Определяем временные рамки
        period_days = {
            '24h': 1, 
            '7d': 7, 
            '30d': 30, 
            '90d': 90, 
            '1y': 365
        }[period]
        period_start = now - timedelta(days=period_days)
        prev_period_start = period_start - timedelta(days=period_days)
        
        # Базовые метрики
        total_users = db.query(models.User).count()
        active_users_today = db.query(models.Dialog).filter(
            models.Dialog.started_at >= today_start
        ).distinct(models.Dialog.user_id).count()
        
        total_dialogs = db.query(models.Dialog).count()
        total_messages = db.query(models.DialogMessage).count()
        
        # Доходы за все время (исключаем приветственные бонусы)
        total_revenue_query = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        total_revenue = float(total_revenue_query or 0)
        
        # Метрики роста
        users_current_period = db.query(models.User).filter(
            models.User.created_at >= period_start
        ).count()
        
        users_prev_period = db.query(models.User).filter(
            models.User.created_at >= prev_period_start,
            models.User.created_at < period_start
        ).count()
        
        dialogs_current_period = db.query(models.Dialog).filter(
            models.Dialog.started_at >= period_start
        ).count()
        
        dialogs_prev_period = db.query(models.Dialog).filter(
            models.Dialog.started_at >= prev_period_start,
            models.Dialog.started_at < period_start
        ).count()
        
        revenue_current_period = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.created_at >= period_start,
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        revenue_current_period = float(revenue_current_period or 0)
        
        revenue_prev_period = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.created_at >= prev_period_start,
            models.BalanceTransaction.created_at < period_start,
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        revenue_prev_period = float(revenue_prev_period or 0)
        
        growth_metrics = {
            "user_growth": _calculate_growth_rate(users_current_period, users_prev_period),
            "dialog_growth": _calculate_growth_rate(dialogs_current_period, dialogs_prev_period),
            "revenue_growth": _calculate_growth_rate(revenue_current_period, revenue_prev_period),
            "activity_growth": _calculate_growth_rate(active_users_today, max(1, users_current_period))
        }
        
        return schemas.AdminAnalyticsOverview(
            total_users=total_users,
            active_users_today=active_users_today,
            total_dialogs=total_dialogs,
            total_messages=total_messages,
            total_revenue=total_revenue,
            growth_metrics=growth_metrics
        )
        
    except Exception as e:
        logger.error(f"Error in analytics overview: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении аналитики. Попробуйте позже.")

@router.get("/admin/analytics/users", response_model=schemas.AdminUserAnalytics)
async def get_user_analytics(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query('created_at', enum=['created_at', 'last_activity', 'total_dialogs', 'balance']),
    order: str = Query('desc', enum=['asc', 'desc']),
    period: str = Query('7d', enum=['24h', '7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Детальная статистика пользователей с пагинацией"""
    try:
        offset = (page - 1) * limit
        period_days = {
            '24h': 1, 
            '7d': 7, 
            '30d': 30, 
            '90d': 90, 
            '1y': 365
        }[period]
        period_start = datetime.utcnow() - timedelta(days=period_days)
        
        # Сортировка
        order_func = desc if order == 'desc' else asc
        sort_column = getattr(models.User, sort_by, models.User.created_at)
        
        # Получение пользователей с дополнительной информацией
        users_query = db.query(
            models.User,
            func.count(models.Dialog.id).label('total_dialogs'),
            func.coalesce(models.UserBalance.balance, 0).label('balance')
        ).outerjoin(
            models.Dialog, models.User.id == models.Dialog.user_id
        ).outerjoin(
            models.UserBalance, models.User.id == models.UserBalance.user_id
        ).group_by(
            models.User.id, models.UserBalance.balance
        ).order_by(order_func(sort_column)).offset(offset).limit(limit)
        
        users_data = []
        for user_result in users_query:
            user = user_result[0]
            users_data.append({
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "role": user.role,
                "status": user.status,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_activity": user.last_activity.isoformat() if user.last_activity else None,
                "total_dialogs": user_result.total_dialogs,
                "balance": float(user_result.balance),
                "is_email_confirmed": user.is_email_confirmed
            })
        
        # Статистика роста пользователей
        total_users = db.query(models.User).count()
        new_users_period = db.query(models.User).filter(
            models.User.created_at >= period_start
        ).count()
        
        active_users_period = db.query(models.Dialog).filter(
            models.Dialog.started_at >= period_start
        ).distinct(models.Dialog.user_id).count()
        
        # Топ активных пользователей за период
        top_users_query = db.query(
            models.User.id,
            models.User.email,
            func.count(models.DialogMessage.id).label('message_count'),
            func.count(func.distinct(models.Dialog.id)).label('dialog_count')
        ).join(
            models.Dialog, models.User.id == models.Dialog.user_id
        ).join(
            models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
        ).filter(
            models.DialogMessage.timestamp >= period_start
        ).group_by(models.User.id, models.User.email).order_by(
            desc(func.count(models.DialogMessage.id))
        ).limit(10).all()
        
        top_users = [
            {
                "user_id": u.id,
                "email": u.email,
                "message_count": u.message_count,
                "dialog_count": u.dialog_count
            } for u in top_users_query
        ]
        
        return schemas.AdminUserAnalytics(
            users=users_data,
            user_growth={
                "total_users": total_users,
                "new_users_period": new_users_period,
                "active_users_period": active_users_period
            },
            activity_stats={
                "average_dialogs_per_user": round(total_users and db.query(models.Dialog).count() / total_users, 2),
                "confirmed_users": db.query(models.User).filter(models.User.is_email_confirmed == True).count(),
                "admin_users": db.query(models.User).filter(models.User.role == 'admin').count()
            },
            top_users=top_users,
            pagination={
                "page": page,
                "limit": limit,
                "total": total_users,
                "pages": (total_users + limit - 1) // limit
            }
        )
        
    except Exception as e:
        logger.error(f"Error in user analytics: {e}")
        raise HTTPException(status_code=500, detail=f"User analytics error: {str(e)}")

@router.get("/admin/analytics/dialogs", response_model=schemas.AdminDialogAnalytics)
async def get_dialog_analytics(
    period: str = Query('7d', enum=['24h', '7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Статистика диалогов и AI использования"""
    try:
        period_days = {
            '24h': 1, 
            '7d': 7, 
            '30d': 30, 
            '90d': 90, 
            '1y': 365
        }[period]
        period_start = datetime.utcnow() - timedelta(days=period_days)
        
        # Базовая статистика диалогов
        total_dialogs = db.query(models.Dialog).count()
        dialogs_period = db.query(models.Dialog).filter(
            models.Dialog.started_at >= period_start
        ).count()
        
        active_dialogs = db.query(models.Dialog).filter(
            models.Dialog.started_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        # Статистика сообщений
        total_messages = db.query(models.DialogMessage).count()
        messages_period = db.query(models.DialogMessage).filter(
            models.DialogMessage.timestamp >= period_start
        ).count()
        
        ai_messages_period = db.query(models.DialogMessage).filter(
            models.DialogMessage.timestamp >= period_start,
            models.DialogMessage.sender == 'assistant'
        ).count()
        
        # Популярные ассистенты за период (с безопасным получением)
        popular_assistants_data = []
        try:
            popular_assistants = db.query(
                models.Assistant.id,
                models.Assistant.name,
                models.User.email.label('owner_email'),
                func.count(models.DialogMessage.id).label('message_count'),
                func.count(func.distinct(models.Dialog.id)).label('dialog_count')
            ).join(
                models.Dialog, models.Assistant.id == models.Dialog.assistant_id
            ).join(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).join(
                models.User, models.Assistant.user_id == models.User.id
            ).filter(
                models.DialogMessage.timestamp >= period_start,
                models.DialogMessage.sender == 'assistant'
            ).group_by(
                models.Assistant.id, models.Assistant.name, models.User.email
            ).order_by(desc(func.count(models.DialogMessage.id))).limit(10).all()
            
            popular_assistants_data = [
                {
                    "assistant_id": a.id,
                    "name": a.name,
                    "owner_email": a.owner_email,
                    "message_count": a.message_count,
                    "dialog_count": a.dialog_count
                } for a in popular_assistants
            ]
        except Exception as assistants_error:
            logger.warning(f"Ошибка получения популярных ассистентов: {assistants_error}")
            popular_assistants_data = []
        
        # AI Token usage statistics с реальными данными
        from services.analytics_service import analytics_service
        period_days = {'24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365}[period]
        
        # Безопасное получение AI статистики
        try:
            ai_usage = analytics_service.get_enhanced_ai_usage_stats(db, period_days)
        except Exception as ai_error:
            logger.warning(f"Ошибка получения AI usage stats: {ai_error}")
            ai_usage = {
                "active_tokens": 0,
                "total_requests_today": 0,
                "successful_requests_today": 0,
                "success_rate": 0.0,
                "average_response_time": 0.0,
                "total_tokens_today": 0
            }
        
        # Безопасное получение времен ответа AI
        try:
            response_times = analytics_service.get_real_ai_response_times(db, period_days)
        except Exception as response_error:
            logger.warning(f"Ошибка получения response times: {response_error}")
            response_times = {
                "average_response_time": 0.0,
                "median_response_time": 0.0,
                "p95_response_time": 0.0
            }
        
        # Почасовая статистика сообщений (с безопасным получением)
        hourly_stats = []
        try:
            for hour in range(24):
                try:
                    hour_start = datetime.utcnow().replace(hour=hour, minute=0, second=0, microsecond=0) - timedelta(days=1)
                    hour_end = hour_start + timedelta(hours=1)
                    
                    messages_count = db.query(models.DialogMessage).filter(
                        models.DialogMessage.timestamp >= hour_start,
                        models.DialogMessage.timestamp < hour_end
                    ).count()
                    
                    hourly_stats.append({
                        "hour": hour,
                        "messages_count": messages_count
                    })
                except Exception as hour_error:
                    logger.warning(f"Ошибка получения статистики за час {hour}: {hour_error}")
                    hourly_stats.append({
                        "hour": hour,
                        "messages_count": 0
                    })
        except Exception as hourly_error:
            logger.warning(f"Ошибка получения почасовой статистики: {hourly_error}")
            # Заполняем базовую структуру данных
            hourly_stats = [{"hour": hour, "messages_count": 0} for hour in range(24)]
        
        # Активность пользователей - количество сообщений и траты (с безопасным получением)
        user_activity_data = []
        try:
            user_activity_query = db.query(
                models.User.id,
                models.User.email,
                models.User.first_name,
                func.count(models.DialogMessage.id).label('message_count'),
                func.coalesce(
                    func.sum(
                        func.case(
                            (models.BalanceTransaction.transaction_type.in_(['bot_message', 'widget_message', 'document_upload']), 
                             func.abs(models.BalanceTransaction.amount)),
                            else_=0
                        )
                    ), 0
                ).label('total_spent')
            ).outerjoin(
                models.Dialog, models.User.id == models.Dialog.user_id
            ).outerjoin(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).outerjoin(
                models.BalanceTransaction, models.User.id == models.BalanceTransaction.user_id
            ).filter(
                # Фильтруем по периоду только если есть сообщения
                or_(
                    models.DialogMessage.timestamp >= period_start,
                    models.DialogMessage.timestamp.is_(None)
                )
            ).group_by(
                models.User.id, models.User.email, models.User.first_name
            ).order_by(
                desc(func.count(models.DialogMessage.id)),
                desc(func.coalesce(
                    func.sum(
                        func.case(
                            (models.BalanceTransaction.transaction_type.in_(['bot_message', 'widget_message', 'document_upload']), 
                             func.abs(models.BalanceTransaction.amount)),
                            else_=0
                        )
                    ), 0
                ))
            ).limit(50).all()
            
            user_activity_data = [
                {
                    "user_id": u.id,
                    "email": u.email,
                    "first_name": u.first_name,
                    "message_count": u.message_count or 0,
                    "total_spent": float(u.total_spent or 0),
                    "avg_spent_per_message": round(float(u.total_spent or 0) / max(u.message_count or 1, 1), 2) if u.message_count else 0
                } for u in user_activity_query
            ]
        except Exception as activity_error:
            logger.warning(f"Ошибка получения активности пользователей: {activity_error}")
            user_activity_data = []
        
        return schemas.AdminDialogAnalytics(
            dialog_stats={
                "total_dialogs": total_dialogs,
                "dialogs_period": dialogs_period,
                "active_dialogs_24h": active_dialogs,
                "avg_messages_per_dialog": round(total_messages / total_dialogs if total_dialogs > 0 else 0, 2)
            },
            message_stats={
                "total_messages": total_messages,
                "messages_period": messages_period,
                "ai_messages_period": ai_messages_period,
                "user_messages_period": messages_period - ai_messages_period
            },
            ai_usage=ai_usage,
            popular_assistants=popular_assistants_data,
            response_times=response_times,
            hourly_stats=hourly_stats,
            user_activity=user_activity_data
        )
        
    except Exception as e:
        logger.error(f"Error in dialog analytics: {e}")
        # Возвращаем структуру с fallback значениями вместо ошибки 500
        return schemas.AdminDialogAnalytics(
            dialog_stats={
                "total_dialogs": 0,
                "dialogs_period": 0,
                "active_dialogs_24h": 0,
                "avg_messages_per_dialog": 0.0
            },
            message_stats={
                "total_messages": 0,
                "messages_period": 0,
                "ai_messages_period": 0,
                "user_messages_period": 0
            },
            ai_usage={
                "active_tokens": 0,
                "total_requests_today": 0,
                "successful_requests_today": 0,
                "success_rate": 0.0,
                "average_response_time": 0.0,
                "total_tokens_today": 0
            },
            popular_assistants=[],
            response_times={
                "average_response_time": 0.0,
                "median_response_time": 0.0,
                "p95_response_time": 0.0
            },
            hourly_stats=[{"hour": hour, "messages_count": 0} for hour in range(24)],
            user_activity=[]
        )

@router.get("/admin/analytics/users-ai-messages", response_model=schemas.UsersAIMessagesStats)
async def get_users_ai_messages_stats(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Статистика AI сообщений для всех пользователей за всё время"""
    try:
        # Получаем общее количество пользователей
        total_users = db.query(models.User).count()
        
        # Получаем пользователей с количеством AI сообщений за всё время
        users_query = db.query(
            models.User.id,
            models.User.email,
            models.User.first_name,
            models.User.created_at,
            func.count(models.DialogMessage.id).label('ai_messages_count')
        ).outerjoin(
            models.Dialog, models.User.id == models.Dialog.user_id
        ).outerjoin(
            models.DialogMessage, 
            and_(
                models.Dialog.id == models.DialogMessage.dialog_id,
                models.DialogMessage.sender == 'assistant'  # Только AI сообщения
            )
        ).group_by(
            models.User.id, models.User.email, models.User.first_name, models.User.created_at
        ).order_by(
            desc(func.count(models.DialogMessage.id)),
            models.User.created_at.desc()
        )
        
        # Применяем пагинацию
        offset = (page - 1) * limit
        users_paginated = users_query.offset(offset).limit(limit).all()
        
        # Формируем данные для ответа
        users_data = []
        total_ai_messages = 0
        
        for user in users_paginated:
            ai_count = user.ai_messages_count or 0
            total_ai_messages += ai_count
            
            users_data.append({
                "user_id": user.id,
                "email": user.email,
                "first_name": user.first_name or "",
                "registration_date": user.created_at.isoformat() if user.created_at else None,
                "ai_messages_count": ai_count
            })
        
        return schemas.UsersAIMessagesStats(
            users=users_data,
            total_users=total_users,
            total_ai_messages=total_ai_messages
        )
        
    except Exception as e:
        logger.error(f"Error in users AI messages stats: {e}")
        # Возвращаем структуру с fallback значениями
        return schemas.UsersAIMessagesStats(
            users=[],
            total_users=0,
            total_ai_messages=0
        )

@router.get("/admin/analytics/revenue", response_model=schemas.AdminRevenueAnalytics)
async def get_revenue_analytics(
    period: str = Query('30d', enum=['7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Финансовая аналитика и статистика доходов"""
    try:
        now = datetime.utcnow()
        period_days = {
            '7d': 7, 
            '30d': 30, 
            '90d': 90, 
            '1y': 365
        }[period]
        period_start = now - timedelta(days=period_days)
        prev_period_start = period_start - timedelta(days=period_days)
        
        # Общий доход за все время (только реальные пополнения)
        total_revenue = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        total_revenue = float(total_revenue or 0)
        
        # Доходы по периодам (только реальные пополнения)
        revenue_current_period = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.created_at >= period_start,
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        revenue_current_period = float(revenue_current_period or 0)
        
        revenue_prev_period = db.query(
            func.sum(models.BalanceTransaction.amount)
        ).filter(
            models.BalanceTransaction.created_at >= prev_period_start,
            models.BalanceTransaction.created_at < period_start,
            models.BalanceTransaction.transaction_type == 'topup'
        ).scalar()
        revenue_prev_period = float(revenue_prev_period or 0)
        
        # Статистика балансов
        total_balance = db.query(func.sum(models.UserBalance.balance)).scalar()
        total_balance = float(total_balance or 0)
        
        total_spent = db.query(func.sum(models.UserBalance.total_spent)).scalar()
        total_spent = float(total_spent or 0)
        
        # Статистика транзакций
        total_transactions = db.query(models.BalanceTransaction).count()
        transactions_period = db.query(models.BalanceTransaction).filter(
            models.BalanceTransaction.created_at >= period_start
        ).count()
        
        topup_transactions = db.query(models.BalanceTransaction).filter(
            models.BalanceTransaction.created_at >= period_start,
            models.BalanceTransaction.transaction_type == 'topup'
        ).count()
        
        # Топ платящих пользователей (только реальные пополнения)
        top_paying_users = db.query(
            models.User.id,
            models.User.email,
            func.sum(models.BalanceTransaction.amount).label('total_paid'),
            func.count(models.BalanceTransaction.id).label('transaction_count')
        ).join(models.BalanceTransaction).filter(
            models.BalanceTransaction.transaction_type == 'topup',
            models.BalanceTransaction.created_at >= period_start
        ).group_by(models.User.id, models.User.email).order_by(
            desc(func.sum(models.BalanceTransaction.amount))
        ).limit(10).all()
        
        top_paying_users_data = [
            {
                "user_id": u.id,
                "email": u.email,
                "total_paid": float(u.total_paid),
                "transaction_count": u.transaction_count
            } for u in top_paying_users
        ]
        
        # Расчет роста доходов
        revenue_growth = {
            "current_period": revenue_current_period,
            "previous_period": revenue_prev_period,
            "growth_rate": _calculate_growth_rate(revenue_current_period, revenue_prev_period),
            "growth_absolute": revenue_current_period - revenue_prev_period
        }
        
        # Ежедневная выручка за последние 30 дней
        daily_revenue = []
        for i in range(min(30, period_days)):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            daily_revenue_amount = db.query(
                func.sum(models.BalanceTransaction.amount)
            ).filter(
                models.BalanceTransaction.created_at >= day_start,
                models.BalanceTransaction.created_at < day_end,
                models.BalanceTransaction.transaction_type == 'topup'
            ).scalar()
            
            daily_revenue.append({
                "date": day_start.strftime('%Y-%m-%d'),
                "revenue": float(daily_revenue_amount or 0)
            })
        
        # Данные методов оплаты (заглушка)
        payment_methods = [
            {"method": "Банковская карта", "count": int(topup_transactions * 0.7), "amount": revenue_current_period * 0.7},
            {"method": "ЮMoney", "count": int(topup_transactions * 0.2), "amount": revenue_current_period * 0.2},
            {"method": "QIWI", "count": int(topup_transactions * 0.1), "amount": revenue_current_period * 0.1}
        ]
        
        return schemas.AdminRevenueAnalytics(
            total_revenue=total_revenue,
            revenue_by_period={
                "current_period": revenue_current_period,
                "previous_period": revenue_prev_period
            },
            balance_stats={
                "total_user_balance": total_balance,
                "total_spent": total_spent,
                "average_balance": round(total_balance / max(db.query(models.User).count(), 1), 2)
            },
            transaction_stats={
                "total_transactions": total_transactions,
                "transactions_period": transactions_period,
                "topup_transactions": topup_transactions,
                "spend_transactions": transactions_period - topup_transactions
            },
            top_paying_users=top_paying_users_data,
            revenue_growth=revenue_growth,
            daily_revenue=daily_revenue,
            payment_methods=payment_methods
        )
        
    except Exception as e:
        logger.error(f"Error in revenue analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Revenue analytics error: {str(e)}")

# === BOTS MONITORING ENDPOINTS ===

@router.get("/admin/bots-monitoring")
def get_bots_monitoring_data(
    status: str = Query('all', enum=['all', 'online', 'offline', 'error', 'starting']),
    search: str = Query('', description="Search by bot name or ID"),
    period: str = Query('7d', enum=['24h', '7d', '30d']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить данные для мониторинга ботов с реальными статусами"""
    try:
        import requests
        import json
        
        # Получаем все bot instances из базы
        query = db.query(models.BotInstance).join(
            models.Assistant, models.BotInstance.assistant_id == models.Assistant.id
        ).join(
            models.User, models.BotInstance.user_id == models.User.id
        )
        
        bot_instances = query.all()
        
        # Получаем статусы ботов from Scalable Bot Manager
        bot_statuses = {}
        try:
            response = requests.get("http://localhost:3002/workers", timeout=5)
            if response.status_code == 200:
                workers_data = response.json()
                workers = workers_data.get('workers', {})
                
                # workers - это объект с bot_id в качестве ключей
                for bot_id_str, worker_info in workers.items():
                    bot_id = int(bot_id_str)
                    
                    # Определяем реальный статус
                    worker_status = worker_info.get('status', 'offline')
                    # Если есть PID и статус не 'stopped', считаем что онлайн
                    if worker_info.get('pid') and worker_status not in ['stopped', 'error']:
                        real_status = 'online'
                    elif worker_status == 'error':
                        real_status = 'error'
                    else:
                        real_status = 'offline'
                    
                    # Вычисляем uptime
                    start_time = worker_info.get('startTime')
                    uptime_seconds = 0
                    if start_time:
                        # startTime в миллисекундах, конвертируем в секунды
                        import time
                        current_time_ms = int(time.time() * 1000)
                        uptime_seconds = max(0, int((current_time_ms - start_time) / 1000))
                        logger.info(f"Bot {bot_id} uptime calculation: current={current_time_ms}, start={start_time}, uptime={uptime_seconds}s")
                    
                    bot_statuses[bot_id] = {
                        'status': real_status,
                        'pid': worker_info.get('pid'),
                        'uptime': int(uptime_seconds),
                        'memory_usage': worker_info.get('memory', 0),
                        'cpu_usage': worker_info.get('cpu', 0),
                        'last_activity': datetime.utcnow().isoformat(),  # Пока используем текущее время
                        'error_count': worker_info.get('restarts', 0)  # Используем restarts как показатель ошибок
                    }
        except Exception as e:
            logger.warning(f"Cannot connect to bot manager: {e}")
        
        # Собираем статистику сообщений по периодам
        period_days = {'24h': 1, '7d': 7, '30d': 30}[period]
        period_start = datetime.utcnow() - timedelta(days=period_days)
        
        message_stats = {}
        if bot_instances:
            bot_ids = [b.id for b in bot_instances]
            # Считаем сообщения через assistant_id
            message_query = db.query(
                models.Dialog.assistant_id,
                func.count(models.DialogMessage.id).label('message_count'),
                func.count(func.distinct(models.Dialog.telegram_chat_id)).label('unique_users')
            ).join(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).filter(
                models.Dialog.assistant_id.in_([b.assistant_id for b in bot_instances]),
                models.DialogMessage.timestamp >= period_start,
                models.DialogMessage.sender == 'assistant'  # Только сообщения от бота
            ).group_by(models.Dialog.assistant_id).all()
            
            for stat in message_query:
                message_stats[stat.assistant_id] = {
                    'messages': stat.message_count,
                    'unique_users': stat.unique_users
                }
        
        # Получаем последние активности всех ботов одним запросом
        last_activities = {}
        if bot_instances:
            assistant_ids = [b.assistant_id for b in bot_instances]
            
            # Запрос для получения последних сообщений от ботов
            last_messages = db.query(
                models.Dialog.assistant_id,
                func.max(models.DialogMessage.timestamp).label('last_timestamp')
            ).join(
                models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
            ).filter(
                models.Dialog.assistant_id.in_(assistant_ids),
                models.DialogMessage.sender == 'assistant'
            ).group_by(models.Dialog.assistant_id).all()
            
            logger.info(f"Found {len(last_messages)} last activities for {len(assistant_ids)} assistants")
            
            for assistant_id, timestamp in last_messages:
                last_activities[assistant_id] = timestamp.isoformat()
                logger.info(f"Assistant {assistant_id} last activity: {timestamp}")
            
            # Дополнительная проверка для отладки
            if 117 in assistant_ids:  # ID вашего ассистента
                debug_messages = db.query(models.DialogMessage).join(
                    models.Dialog, models.DialogMessage.dialog_id == models.Dialog.id
                ).filter(
                    models.Dialog.assistant_id == 117
                ).order_by(models.DialogMessage.timestamp.desc()).limit(3).all()
                
                logger.info(f"DEBUG: Found {len(debug_messages)} recent messages for assistant 117:")
                for msg in debug_messages:
                    logger.info(f"  - {msg.timestamp} | sender: {msg.sender} | text: {msg.text[:50]}...")

        # Формируем результат
        result_bots = []
        for bot in bot_instances:
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == bot.assistant_id
            ).first()
            
            user = db.query(models.User).filter(
                models.User.id == bot.user_id  
            ).first()
            
            # Получаем реальный статус из bot manager
            bot_status_info = bot_statuses.get(bot.id, {})
            real_status = bot_status_info.get('status', 'offline' if not bot.is_active else 'starting')
            
            # Получаем статистику сообщений
            msg_stats = message_stats.get(bot.assistant_id, {'messages': 0, 'unique_users': 0})
            
            # Получаем реальную последнюю активность из предварительно загруженных данных
            real_last_activity = last_activities.get(bot.assistant_id)
            
            # Fallback: если не нашли последние сообщения, используем время последнего диалога
            if not real_last_activity:
                last_dialog = db.query(models.Dialog).filter(
                    models.Dialog.assistant_id == bot.assistant_id
                ).order_by(models.Dialog.started_at.desc()).first()
                
                if last_dialog and last_dialog.started_at:
                    real_last_activity = last_dialog.started_at.isoformat()
            
            # Вычисляем uptime
            uptime_seconds = bot_status_info.get('uptime', 0)
            hours = uptime_seconds // 3600
            minutes = (uptime_seconds % 3600) // 60
            uptime_str = f"{hours}ч {minutes}м"
            
            bot_data = {
                'id': bot.id,
                'name': assistant.name if assistant else f"Bot {bot.id}",
                'assistant_id': bot.assistant_id,
                'user_id': bot.user_id,
                'user_email': user.email if user else f"ID: {bot.user_id}",
                'platform': bot.platform,
                'status': real_status,
                'is_active': bot.is_active,
                'created_at': bot.created_at.isoformat() if bot.created_at else None,
                
                # Реальная статистика
                'messages': msg_stats['messages'],
                'unique_users': msg_stats['unique_users'],
                'uptime': uptime_str,
                'uptime_seconds': uptime_seconds,
                'errors': bot_status_info.get('error_count', 0),
                'memory_usage': bot_status_info.get('memory_usage', 0),
                'cpu_usage': bot_status_info.get('cpu_usage', 0),
                'last_activity': real_last_activity,  # Реальная последняя активность из БД
                'pid': bot_status_info.get('pid'),
                
                # Дополнительная информация
                'bot_token_preview': f"{bot.bot_token[:10]}...{bot.bot_token[-6:]}" if bot.bot_token else None,
            }
            
            # Применяем фильтры
            if status != 'all' and real_status != status:
                continue
                
            if search and search.lower() not in bot_data['name'].lower() and search not in str(bot.id):
                continue
            
            result_bots.append(bot_data)
        
        return result_bots
        
    except Exception as e:
        logger.error(f"Error in bots monitoring: {e}")
        raise HTTPException(status_code=500, detail=f"Bots monitoring error: {str(e)}")

@router.get("/admin/bots-monitoring/stats")
def get_bots_monitoring_stats(
    period: str = Query('7d', enum=['24h', '7d', '30d']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить KPI статистику для мониторинга ботов"""
    try:
        # Получаем все боты
        total_bots = db.query(models.BotInstance).count()
        active_bots_db = db.query(models.BotInstance).filter(
            models.BotInstance.is_active == True
        ).count()
        
        # Получаем реальные статусы из bot manager
        online_bots = 0
        error_bots = 0
        try:
            import requests
            response = requests.get("http://localhost:3002/workers", timeout=5)
            if response.status_code == 200:
                workers_data = response.json()
                for worker in workers_data.get('workers', []):
                    if worker.get('status') == 'running':
                        online_bots += 1
                    elif worker.get('errors', 0) > 0:
                        error_bots += 1
        except:
            online_bots = active_bots_db  # Fallback
        
        # Статистика сообщений
        period_days = {'24h': 1, '7d': 7, '30d': 30}[period] 
        period_start = datetime.utcnow() - timedelta(days=period_days)
        last_hour = datetime.utcnow() - timedelta(hours=1)
        
        # Сообщения за период и за последний час
        total_messages = db.query(models.DialogMessage).filter(
            models.DialogMessage.timestamp >= period_start,
            models.DialogMessage.sender == 'assistant'
        ).count()
        
        messages_last_hour = db.query(models.DialogMessage).filter(
            models.DialogMessage.timestamp >= last_hour,
            models.DialogMessage.sender == 'assistant'
        ).count()
        
        # Активные пользователи (уникальные telegram_chat_id за период)
        active_users = db.query(models.Dialog).filter(
            models.Dialog.started_at >= period_start
        ).distinct(models.Dialog.telegram_chat_id).count()
        
        # Рост за предыдущий период для сравнения
        prev_period_start = period_start - timedelta(days=period_days)
        prev_messages = db.query(models.DialogMessage).filter(
            models.DialogMessage.timestamp >= prev_period_start,
            models.DialogMessage.timestamp < period_start,
            models.DialogMessage.sender == 'assistant'
        ).count()
        
        prev_active_users = db.query(models.Dialog).filter(
            models.Dialog.started_at >= prev_period_start,
            models.Dialog.started_at < period_start
        ).distinct(models.Dialog.telegram_chat_id).count()
        
        # Вычисляем изменения
        messages_change = 0
        if prev_messages > 0:
            messages_change = round(((total_messages - prev_messages) / prev_messages) * 100, 1)
        
        users_change = 0
        if prev_active_users > 0:
            users_change = round(((active_users - prev_active_users) / prev_active_users) * 100, 1)
        
        return {
            'total_bots': total_bots,
            'active_bots': active_bots_db,
            'online_bots': online_bots,
            'error_bots': error_bots,
            'messages_total': total_messages,
            'messages_per_hour': messages_last_hour,
            'active_users': active_users,
            'changes': {
                'messages': messages_change,
                'users': users_change,
                'bots': 0  # TODO: можно добавить статистику роста ботов
            },
            'period': period,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in bots monitoring stats: {e}")
        raise HTTPException(status_code=500, detail=f"Bots stats error: {str(e)}")

@router.post("/admin/bots/{bot_id}/action")
def execute_bot_action(
    bot_id: int,
    action: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Выполнить действие с ботом (start/stop/restart)"""
    try:
        # Проверяем существование бота
        bot = db.query(models.BotInstance).filter(
            models.BotInstance.id == bot_id
        ).first()
        
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        action_type = action.get('action')
        if action_type not in ['start', 'stop', 'restart']:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        import requests
        
        if action_type == 'start':
            # Активируем в базе
            bot.is_active = True
            db.commit()
            
            # Отправляем команду в bot manager
            response = requests.post(
                f"http://localhost:3002/workers/{bot_id}/start",
                timeout=10
            )
            
        elif action_type == 'stop':
            # Деактивируем в базе
            bot.is_active = False
            db.commit()
            
            # Отправляем команду в bot manager
            response = requests.post(
                f"http://localhost:3002/workers/{bot_id}/stop",
                timeout=10
            )
            
        elif action_type == 'restart':
            # Отправляем команду перезапуска
            response = requests.post(
                f"http://localhost:3002/workers/{bot_id}/restart",
                timeout=10
            )
        
        # Проверяем результат
        success = False
        message = f"Bot {action_type} command sent"
        
        try:
            if response.status_code == 200:
                success = True
                result = response.json()
                message = result.get('message', message)
        except:
            pass
        
        return {
            'success': success,
            'action': action_type,
            'bot_id': bot_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing bot action: {e}")
        raise HTTPException(status_code=500, detail=f"Action error: {str(e)}")


# === ADMIN SETTINGS ENDPOINTS ===

@router.get("/admin/settings", response_model=schemas.AdminSettingsResponse)
def get_admin_settings(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить все административные настройки"""
    try:
        query = db.query(models.SystemSettings).filter(models.SystemSettings.is_active == True)
        
        if category:
            query = query.filter(models.SystemSettings.category == category)
        
        settings = query.order_by(models.SystemSettings.category, models.SystemSettings.key).all()
        
        # Группируем по категориям
        categories_dict = {}
        for setting in settings:
            if setting.category not in categories_dict:
                categories_dict[setting.category] = []
            
            # Маскируем чувствительные данные
            setting_data = schemas.SystemSettingRead.from_orm(setting)
            if setting.is_sensitive and setting.value:
                setting_data.value = "***HIDDEN***"
            
            categories_dict[setting.category].append(setting_data)
        
        # Добавляем описания категорий
        category_descriptions = {
            "general": "Основные настройки системы",
            "ai": "Настройки AI провайдеров и моделей",
            "email": "Конфигурация email и уведомлений",
            "security": "Настройки безопасности и аутентификации",
            "limits": "Лимиты пользователей и система квот",
            "maintenance": "Настройки обслуживания и мониторинга"
        }
        
        categories = [
            schemas.SystemSettingsGrouped(
                category=cat,
                settings=settings_list,
                description=category_descriptions.get(cat)
            )
            for cat, settings_list in categories_dict.items()
        ]
        
        # Время последнего обновления
        last_updated_setting = db.query(models.SystemSettings).order_by(
            models.SystemSettings.updated_at.desc()
        ).first()
        
        return schemas.AdminSettingsResponse(
            categories=categories,
            total_settings=len(settings),
            last_updated=last_updated_setting.updated_at if last_updated_setting else None
        )
        
    except Exception as e:
        logger.error(f"Error getting admin settings: {e}")
        raise HTTPException(status_code=500, detail=f"Settings error: {str(e)}")

@router.post("/admin/settings/{category}/{key}", response_model=schemas.SystemSettingRead)
def create_admin_setting(
    category: str,
    key: str,
    setting: schemas.SystemSettingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Создать новую настройку системы"""
    try:
        # Проверяем, существует ли уже такая настройка
        existing = db.query(models.SystemSettings).filter(
            models.SystemSettings.category == category,
            models.SystemSettings.key == key
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Setting already exists")
        
        # Валидируем категорию
        valid_categories = ["general", "ai", "email", "security", "limits", "maintenance"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Создаем новую настройку
        new_setting = models.SystemSettings(
            category=category,
            key=key,
            value=setting.value,
            data_type=setting.data_type,
            is_sensitive=setting.is_sensitive,
            description=setting.description,
            default_value=setting.default_value,
            is_active=setting.is_active,
            updated_by=current_user.id
        )
        
        db.add(new_setting)
        db.commit()
        db.refresh(new_setting)
        
        logger.info(f"Admin {current_user.email} created setting {category}.{key}")
        
        # Маскируем чувствительные данные в ответе
        result = schemas.SystemSettingRead.from_orm(new_setting)
        if new_setting.is_sensitive and new_setting.value:
            result.value = "***HIDDEN***"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating admin setting: {e}")
        raise HTTPException(status_code=500, detail=f"Create setting error: {str(e)}")

@router.put("/admin/settings/{category}/{key}", response_model=schemas.SystemSettingRead)
def update_admin_setting(
    category: str,
    key: str,
    update_data: schemas.SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Обновить настройку системы"""
    try:
        setting = db.query(models.SystemSettings).filter(
            models.SystemSettings.category == category,
            models.SystemSettings.key == key
        ).first()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Обновляем поля если они переданы
        if update_data.value is not None:
            setting.value = update_data.value
        if update_data.data_type is not None:
            setting.data_type = update_data.data_type
        if update_data.is_sensitive is not None:
            setting.is_sensitive = update_data.is_sensitive
        if update_data.description is not None:
            setting.description = update_data.description
        if update_data.is_active is not None:
            setting.is_active = update_data.is_active
        
        setting.updated_by = current_user.id
        setting.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(setting)
        
        logger.info(f"Admin {current_user.email} updated setting {category}.{key}")
        
        # Маскируем чувствительные данные в ответе
        result = schemas.SystemSettingRead.from_orm(setting)
        if setting.is_sensitive and setting.value:
            result.value = "***HIDDEN***"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating admin setting: {e}")
        raise HTTPException(status_code=500, detail=f"Update setting error: {str(e)}")

@router.delete("/admin/settings/{category}/{key}")
def delete_admin_setting(
    category: str,
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Удалить настройку системы"""
    try:
        setting = db.query(models.SystemSettings).filter(
            models.SystemSettings.category == category,
            models.SystemSettings.key == key
        ).first()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        # Мягкое удаление - деактивируем настройку
        setting.is_active = False
        setting.updated_by = current_user.id
        setting.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Admin {current_user.email} deleted setting {category}.{key}")
        
        return {"message": f"Setting {category}.{key} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin setting: {e}")
        raise HTTPException(status_code=500, detail=f"Delete setting error: {str(e)}")

@router.post("/admin/settings/bulk-update")
def bulk_update_settings(
    bulk_data: schemas.AdminSettingsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Массовое обновление настроек"""
    try:
        updated_count = 0
        errors = []
        
        for update in bulk_data.updates:
            try:
                category = update.get("category")
                key = update.get("key") 
                value = update.get("value")
                
                if not category or not key:
                    errors.append(f"Missing category or key in update: {update}")
                    continue
                
                setting = db.query(models.SystemSettings).filter(
                    models.SystemSettings.category == category,
                    models.SystemSettings.key == key
                ).first()
                
                if setting:
                    setting.value = str(value) if value is not None else None
                    setting.updated_by = current_user.id
                    setting.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    errors.append(f"Setting not found: {category}.{key}")
                    
            except Exception as e:
                errors.append(f"Error updating {category}.{key}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Admin {current_user.email} bulk updated {updated_count} settings")
        
        return {
            "message": f"Bulk update completed",
            "updated_count": updated_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk update error: {str(e)}")

@router.post("/admin/settings/test", response_model=schemas.AdminSettingsTestResponse)
def test_admin_setting(
    test_request: schemas.AdminSettingsTestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Тестирование настройки перед применением"""
    try:
        category = test_request.category
        key = test_request.key
        test_value = test_request.test_value
        
        # Логика тестирования зависит от типа настройки
        if category == "email" and key == "smtp_server":
            # Тест SMTP соединения
            try:
                import smtplib
                server = smtplib.SMTP_SSL(test_value or "smtp.yandex.ru", 465)
                server.quit()
                return schemas.AdminSettingsTestResponse(
                    success=True,
                    message="SMTP server connection successful",
                    details={"server": test_value, "port": 465}
                )
            except Exception as e:
                return schemas.AdminSettingsTestResponse(
                    success=False,
                    message=f"SMTP connection failed: {str(e)}"
                )
                
        elif category == "ai" and key == "openai_api_base":
            # Тест API базового URL
            try:
                import requests
                response = requests.get(f"{test_value}/models", timeout=10)
                return schemas.AdminSettingsTestResponse(
                    success=response.status_code == 200,
                    message="API endpoint accessible" if response.status_code == 200 else "API endpoint not accessible",
                    details={"status_code": response.status_code}
                )
            except Exception as e:
                return schemas.AdminSettingsTestResponse(
                    success=False,
                    message=f"API test failed: {str(e)}"
                )
        
        # Дефолтный тест для других настроек
        return schemas.AdminSettingsTestResponse(
            success=True,
            message="Setting validation passed",
            details={"category": category, "key": key, "test_value": test_value}
        )
        
    except Exception as e:
        logger.error(f"Error testing setting: {e}")
        return schemas.AdminSettingsTestResponse(
            success=False,
            message=f"Test error: {str(e)}"
        )

@router.get("/admin/settings/categories")
def get_settings_categories(
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить доступные категории настроек"""
    return {
        "categories": [
            {
                "id": "general",
                "name": "Основные настройки",
                "description": "Название системы, timezone, локализация",
                "icon": "settings"
            },
            {
                "id": "ai", 
                "name": "AI провайдеры",
                "description": "Управление OpenAI токенами и моделями",
                "icon": "zap"
            },
            {
                "id": "email",
                "name": "Email/SMS",
                "description": "SMTP конфигурация, уведомления",
                "icon": "mail"
            },
            {
                "id": "security",
                "name": "Безопасность", 
                "description": "JWT settings, CSRF, rate limiting",
                "icon": "shield"
            },
            {
                "id": "limits",
                "name": "Лимиты и квоты",
                "description": "Пользовательские лимиты, дневные квоты",
                "icon": "bar-chart-2"
            },
            {
                "id": "maintenance",
                "name": "Обслуживание",
                "description": "Очистка логов, архивирование, backup",
                "icon": "tool"
            }
        ]
    }

# === PAYMENTS MANAGEMENT ENDPOINTS ===

@router.get("/admin/payments")
def get_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, enum=['pending', 'success', 'failed', 'canceled', 'expired']),
    user_id: Optional[int] = Query(None),
    period: str = Query('all', enum=['all', '24h', '7d', '30d', '90d']),
    search: str = Query('', description="Search by user email or order ID"),
    sort_by: str = Query('created_at', enum=['created_at', 'amount', 'status', 'user_email']),
    order: str = Query('desc', enum=['asc', 'desc']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить список всех платежей с фильтрацией и поиском"""
    try:
        # Базовый запрос с join на User
        query = db.query(
            models.Payment,
            models.User.email.label('user_email'),
            models.User.first_name.label('user_first_name')
        ).join(models.User, models.Payment.user_id == models.User.id)
        
        # Фильтр по периоду
        if period != 'all':
            period_days = {
                '24h': 1, 
                '7d': 7, 
                '30d': 30, 
                '90d': 90
            }[period]
            period_start = datetime.utcnow() - timedelta(days=period_days)
            query = query.filter(models.Payment.created_at >= period_start)
        
        # Фильтр по статусу
        if status:
            query = query.filter(models.Payment.status == status)
        
        # Фильтр по пользователю
        if user_id:
            query = query.filter(models.Payment.user_id == user_id)
        
        # Поиск по email или order ID
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                (models.User.email.ilike(search_term)) |
                (models.Payment.order_id.ilike(search_term))
            )
        
        # Общее количество записей для пагинации
        total_count = query.count()
        
        # Сортировка
        order_func = desc if order == 'desc' else asc
        
        if sort_by == 'created_at':
            sort_column = models.Payment.created_at
        elif sort_by == 'amount':
            sort_column = models.Payment.amount
        elif sort_by == 'status':
            sort_column = models.Payment.status
        elif sort_by == 'user_email':
            sort_column = models.User.email
        else:
            sort_column = models.Payment.created_at
            
        query = query.order_by(order_func(sort_column))
        
        # Пагинация
        offset = (page - 1) * limit
        payments_data = query.offset(offset).limit(limit).all()
        
        # Формируем результат
        payments_list = []
        for payment_row in payments_data:
            payment = payment_row[0]  # models.Payment объект
            user_email = payment_row[1]
            user_first_name = payment_row[2]
            
            payment_data = {
                'id': payment.id,
                'order_id': payment.order_id,
                'amount': float(payment.amount),
                'currency': payment.currency,
                'status': payment.status,
                'tinkoff_status': payment.tinkoff_status,
                'payment_method': payment.payment_method,
                'description': payment.description,
                'tinkoff_payment_id': payment.tinkoff_payment_id,
                
                # Информация о пользователе
                'user_id': payment.user_id,
                'user_email': user_email,
                'user_first_name': user_first_name,
                
                # Данные клиента для чека
                'customer_email': payment.customer_email,
                'customer_phone': payment.customer_phone,
                'customer_name': payment.customer_name,
                
                # Техническая информация
                'error_code': payment.error_code,
                'error_message': payment.error_message,
                'card_mask': payment.card_mask,
                'payment_url': payment.payment_url,
                
                # Временные метки
                'created_at': payment.created_at.isoformat() if payment.created_at else None,
                'updated_at': payment.updated_at.isoformat() if payment.updated_at else None,
                'completed_at': payment.completed_at.isoformat() if payment.completed_at else None,
            }
            payments_list.append(payment_data)
        
        # Статистика
        stats = {
            'total_revenue': db.query(func.sum(models.Payment.amount)).filter(
                models.Payment.status == 'success'
            ).scalar() or 0,
            'successful_payments': db.query(models.Payment).filter(
                models.Payment.status == 'success'
            ).count(),
            'failed_payments': db.query(models.Payment).filter(
                models.Payment.status == 'failed'
            ).count(),
            'pending_payments': db.query(models.Payment).filter(
                models.Payment.status == 'pending'
            ).count()
        }
        
        return {
            'payments': payments_list,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            },
            'stats': stats,
            'filters': {
                'status': status,
                'user_id': user_id,
                'period': period,
                'search': search,
                'sort_by': sort_by,
                'order': order
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting payments: {e}")
        raise HTTPException(status_code=500, detail=f"Payments error: {str(e)}")

@router.get("/admin/payments/stats")
def get_payments_stats(
    period: str = Query('30d', enum=['7d', '30d', '90d', '1y']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить статистику платежей для дашборда"""
    try:
        # Определяем временные рамки
        now = datetime.utcnow()
        period_days = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }[period]
        period_start = now - timedelta(days=period_days)
        prev_period_start = period_start - timedelta(days=period_days)
        
        # Общая статистика
        total_payments = db.query(models.Payment).count()
        total_revenue = db.query(func.sum(models.Payment.amount)).filter(
            models.Payment.status == 'success'
        ).scalar() or 0
        
        # Статистика за текущий период
        current_payments = db.query(models.Payment).filter(
            models.Payment.created_at >= period_start
        ).count()
        
        current_revenue = db.query(func.sum(models.Payment.amount)).filter(
            models.Payment.created_at >= period_start,
            models.Payment.status == 'success'
        ).scalar() or 0
        
        # Статистика за предыдущий период для сравнения
        prev_payments = db.query(models.Payment).filter(
            models.Payment.created_at >= prev_period_start,
            models.Payment.created_at < period_start
        ).count()
        
        prev_revenue = db.query(func.sum(models.Payment.amount)).filter(
            models.Payment.created_at >= prev_period_start,
            models.Payment.created_at < period_start,
            models.Payment.status == 'success'
        ).scalar() or 0
        
        # Статистика по статусам за текущий период
        status_stats = db.query(
            models.Payment.status,
            func.count(models.Payment.id).label('count'),
            func.sum(models.Payment.amount).label('total_amount')
        ).filter(
            models.Payment.created_at >= period_start
        ).group_by(models.Payment.status).all()
        
        status_breakdown = {}
        for stat in status_stats:
            status_breakdown[stat.status] = {
                'count': stat.count,
                'total_amount': float(stat.total_amount) if stat.total_amount else 0
            }
        
        # Расчет роста
        payments_growth = 0
        if prev_payments > 0:
            payments_growth = round(((current_payments - prev_payments) / prev_payments) * 100, 1)
        
        revenue_growth = 0
        if prev_revenue > 0:
            revenue_growth = round(((current_revenue - prev_revenue) / prev_revenue) * 100, 1)
        
        # Средний чек
        avg_payment = 0
        successful_payments_count = status_breakdown.get('success', {}).get('count', 0)
        if successful_payments_count > 0:
            avg_payment = round(current_revenue / successful_payments_count, 2)
        
        return {
            'period': period,
            'total_stats': {
                'total_payments': total_payments,
                'total_revenue': float(total_revenue)
            },
            'current_period': {
                'payments_count': current_payments,
                'revenue': float(current_revenue),
                'avg_payment': avg_payment
            },
            'growth': {
                'payments_growth': payments_growth,
                'revenue_growth': revenue_growth
            },
            'status_breakdown': status_breakdown,
            'timestamp': now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting payments stats: {e}")
        raise HTTPException(status_code=500, detail=f"Payments stats error: {str(e)}")

@router.get("/admin/payments/{payment_id}")
def get_payment_details(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить детальную информацию о конкретном платеже"""
    try:
        payment = db.query(models.Payment).filter(
            models.Payment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Получаем информацию о пользователе
        user = db.query(models.User).filter(
            models.User.id == payment.user_id
        ).first()
        
        # История изменений статуса (если есть логирование)
        # Пока возвращаем базовую информацию
        
        return {
            'payment': {
                'id': payment.id,
                'order_id': payment.order_id,
                'amount': float(payment.amount),
                'currency': payment.currency,
                'status': payment.status,
                'tinkoff_status': payment.tinkoff_status,
                'payment_method': payment.payment_method,
                'description': payment.description,
                'tinkoff_payment_id': payment.tinkoff_payment_id,
                
                # URLs
                'success_url': payment.success_url,
                'fail_url': payment.fail_url,
                'payment_url': payment.payment_url,
                
                # Данные клиента
                'customer_email': payment.customer_email,
                'customer_phone': payment.customer_phone,
                'customer_name': payment.customer_name,
                
                # Техническая информация
                'error_code': payment.error_code,
                'error_message': payment.error_message,
                'card_mask': payment.card_mask,
                
                # Временные метки
                'created_at': payment.created_at.isoformat() if payment.created_at else None,
                'updated_at': payment.updated_at.isoformat() if payment.updated_at else None,
                'completed_at': payment.completed_at.isoformat() if payment.completed_at else None,
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'status': user.status,
                'created_at': user.created_at.isoformat() if user.created_at else None
            } if user else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment details: {e}")
        raise HTTPException(status_code=500, detail=f"Payment details error: {str(e)}")