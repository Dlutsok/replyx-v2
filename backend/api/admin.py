from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import psutil
import os
import subprocess

from database import SessionLocal
from database.connection import get_db
from database import get_db, models, schemas, crud, auth
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
        func.sum(func.case([(models.AITokenUsage.success == True, 1)], else_=0)).label('successful_requests'),
        func.sum(func.case([(models.AITokenUsage.success == False, 1)], else_=0)).label('failed_requests')
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
    period: str = Query('week', enum=['day', 'week', 'month']),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Расширенная аналитика для админ панели с использованием нового сервиса"""
    try:
        # Системная статистика
        from services.analytics_service import analytics_service
        system_stats = analytics_service.get_admin_system_stats(db)
        
        # Топ активных пользователей (по сообщениям за период)
        days_back = {'day': 1, 'week': 7, 'month': 30}[period]
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
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")

@router.get("/admin/system-stats")
def get_system_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Получение системной статистики"""
    
    try:
        print("🔍 Вычисляем системную статистику")
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Подсчет базовых метрик
        total_users = db.query(models.User).count()
        active_users_today = db.query(models.Dialog).filter(
            models.Dialog.started_at >= today_start
        ).distinct(models.Dialog.user_id).count()
        
        total_dialogs = db.query(models.Dialog).count()
        total_messages = db.query(models.DialogMessage).count()
        
        # AI токены статистика (безопасно)
        try:
            ai_tokens = db.query(models.AITokenPool).filter(models.AITokenPool.is_active == True).all()
            total_ai_requests_today = sum(getattr(token, 'current_daily_usage', 0) or 0 for token in ai_tokens)
            active_ai_tokens = len(ai_tokens)
        except Exception as e:
            logger.warning(f"Ошибка получения статистики AI токенов: {e}")
            total_ai_requests_today = 0
            active_ai_tokens = 0
        
        # Возвращаем результат
        return {
            "totalUsers": total_users,
            "activeUsersToday": active_users_today,
            "totalDialogs": total_dialogs,
            "totalMessages": total_messages,
            "dailyRequests": total_ai_requests_today,
            "activeAITokens": active_ai_tokens,
            "userGrowth": 12,
            "dailyActiveGrowth": 8,
            "requestsChange": 5,
            "timestamp": now.isoformat()
        }
    except Exception as e:
        print(f"Ошибка в system-stats: {e}")
        # Возвращаем заглушку в случае ошибки
        return {
            "totalUsers": 0,
            "activeUsersToday": 0,
            "totalDialogs": 0,
            "totalMessages": 0,
            "dailyRequests": 0,
            "activeAITokens": 0,
            "userGrowth": 0,
            "dailyActiveGrowth": 0,
            "requestsChange": 0,
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/admin/realtime-stats")
def get_realtime_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    """Получение статистики в реальном времени"""
    now = datetime.utcnow()
    last_hour = now - timedelta(hours=1)
    last_2_minutes = now - timedelta(minutes=2)  # Сократил с 5 до 2 минут для более точного отслеживания
    
    # Активные диалоги (диалоги с активностью за последний час)
    active_dialogs = db.query(models.Dialog).join(models.DialogMessage).filter(
        models.DialogMessage.timestamp >= last_hour
    ).distinct(models.Dialog.id).count()
    
    # Онлайн пользователи - объединяем две метрики:
    # 1. Пользователи с активностью в диалогах за последние 2 минуты
    dialog_active_users = db.query(models.Dialog).join(models.DialogMessage).filter(
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
            db.query(models.Dialog.user_id).join(models.DialogMessage).filter(
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
    
    return {
        "activeDialogs": active_dialogs,
        "onlineUsers": online_users,
        "lkActiveUsers": lk_active_users,
        "dialogActiveUsers": dialog_active_users,
        "messagesLastHour": messages_last_hour,
        "newUsersToday": new_users_today,
        "timestamp": now.isoformat()
    }