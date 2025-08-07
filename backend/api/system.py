from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import time
import os

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db
from validators.rate_limiter import rate_limit_metrics

router = APIRouter()

@router.get("/status")
async def read_root():
    return {"message": "ChatAI API is running", "version": "1.0.0"}

@router.get("/health")
async def health_check():
    """Комплексная проверка состояния системы"""
    start_time = time.time()
    
    checks = {
        "api": {"status": "ok", "details": "FastAPI working"},
        "database": {"status": "unknown", "details": ""},
        "redis": {"status": "unknown", "details": ""},
        "file_system": {"status": "unknown", "details": ""}
    }
    
    # Проверка базы данных
    try:
        from sqlalchemy import text
        db = next(get_db())
        try:
            db.execute(text("SELECT 1"))
            checks["database"] = {"status": "ok", "details": "PostgreSQL connection active"}
        finally:
            db.close()
    except Exception as e:
        checks["database"] = {"status": "error", "details": f"Database error: {str(e)[:100]}"}
    
    # Проверка Redis
    try:
        from cache.redis_cache import cache
        if hasattr(cache, 'is_available') and cache.is_available():
            redis_stats = cache.get_stats() if hasattr(cache, 'get_stats') else {}
            checks["redis"] = {
                "status": "ok", 
                "details": f"Redis connected, hit rate: {redis_stats.get('hit_rate', 0)}%"
            }
        else:
            checks["redis"] = {"status": "degraded", "details": "Redis unavailable but not critical"}
    except Exception as e:
        checks["redis"] = {"status": "error", "details": f"Redis error: {str(e)[:100]}"}
    
    # Проверка файловой системы (uploads директория)
    try:
        uploads_dir = "uploads"
        if os.path.exists(uploads_dir) and os.access(uploads_dir, os.W_OK):
            checks["file_system"] = {"status": "ok", "details": "Uploads directory writable"}
        else:
            checks["file_system"] = {"status": "error", "details": "Uploads directory not accessible"}
    except Exception as e:
        checks["file_system"] = {"status": "error", "details": f"File system error: {str(e)[:100]}"}
    
    # Определяем общий статус
    error_count = sum(1 for check in checks.values() if check["status"] == "error")
    degraded_count = sum(1 for check in checks.values() if check["status"] == "degraded")
    
    if error_count > 0:
        overall_status = "error"
    elif degraded_count > 0:
        overall_status = "degraded"
    else:
        overall_status = "healthy"
    
    response_time = round((time.time() - start_time) * 1000, 2)
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "response_time_ms": response_time,
        "checks": checks,
        "summary": {
            "total_checks": len(checks),
            "passed": sum(1 for check in checks.values() if check["status"] == "ok"),
            "failed": error_count,
            "degraded": degraded_count
        }
    }

@router.get("/metrics")
@rate_limit_metrics(limit=20, window=300)  # 20 запросов за 5 минут
def get_metrics(
    period: str = Query('month', enum=['day', 'week', 'month', 'custom']),
    date: str = Query(None),
    user_id: int = Query(None),
    all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get metrics for the current user with trial period support"""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from cache.redis_cache import chatai_cache
    from database import auth
    
    # Определяем конечного пользователя для анализа
    if user_id and (current_user.role == 'admin' or all):
        target_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        # Используем эффективный user_id (для сотрудников - владельца организации)
        effective_user_id = auth.get_effective_user_id(current_user, db)
        target_user = db.query(models.User).filter(models.User.id == effective_user_id).first()
        if not target_user:
            target_user = current_user
    
    # Проверяем кэш для метрик (TTL: 5 минут)
    cached_metrics = chatai_cache.cache_user_metrics(
        user_id=target_user.id, 
        period=period, 
        date=date
    )
    
    if cached_metrics:
        print(f"🚀 CACHE HIT: Метрики для пользователя {target_user.id}")
        return cached_metrics
    
    print(f"🔍 CACHE MISS: Вычисляем метрики для пользователя {target_user.id}")
    
    # Определяем временной диапазон на основе периода
    now = datetime.utcnow()
    print(f"🔍 METRICS: period={period}, date={date}, user_id={target_user.id}")
    
    if period == 'custom' and date:
        # Для кастомной даты показываем данные за этот день
        try:
            custom_date = datetime.strptime(date, '%Y-%m-%d')
            start_time = custom_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
            previous_start = start_time - timedelta(days=1)
            previous_end = start_time
        except ValueError:
            # Если дата некорректная, используем последний день
            start_time = now - timedelta(days=1)
            previous_start = now - timedelta(days=2)
            previous_end = start_time
    elif period == 'day':
        start_time = now - timedelta(days=1)
        previous_start = now - timedelta(days=2)
        previous_end = start_time
    elif period == 'week':
        start_time = now - timedelta(days=7)
        previous_start = now - timedelta(days=14)
        previous_end = start_time
    else:  # month
        start_time = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        previous_end = start_time
    
    print(f"📅 METRICS: start_time={start_time}, end_time={end_time if period == 'custom' and date else now}")
    
    # Подсчёт сообщений за выбранный период
    if period == 'custom' and date:
        # Для кастомной даты используем end_time
        period_messages = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == target_user.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= start_time,
            models.DialogMessage.timestamp < end_time
        ).scalar() or 0
    else:
        period_messages = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == target_user.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= start_time
        ).scalar() or 0
    
    # Подсчёт сообщений за предыдущий период (для сравнения)
    previous_messages = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == target_user.id,
        models.DialogMessage.sender == 'assistant',
        models.DialogMessage.timestamp >= previous_start,
        models.DialogMessage.timestamp < previous_end
    ).scalar() or 0
    
    # Подсчёт диалогов за выбранный период
    if period == 'custom' and date:
        period_dialogs = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == target_user.id,
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at < end_time
        ).scalar() or 0
    else:
        period_dialogs = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == target_user.id,
            models.Dialog.started_at >= start_time
        ).scalar() or 0
    
    # Подсчёт диалогов за предыдущий период
    previous_dialogs = db.query(func.count(models.Dialog.id)).filter(
        models.Dialog.user_id == target_user.id,
        models.Dialog.started_at >= previous_start,
        models.Dialog.started_at < previous_end
    ).scalar() or 0
    

    
    # Среднее время ответа за период
    if period == 'custom' and date:
        avg_response_time = db.query(func.avg(models.Dialog.first_response_time)).filter(
            models.Dialog.user_id == target_user.id,
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at < end_time,
            models.Dialog.first_response_time.isnot(None)
        ).scalar()
    else:
        avg_response_time = db.query(func.avg(models.Dialog.first_response_time)).filter(
            models.Dialog.user_id == target_user.id,
            models.Dialog.started_at >= start_time,
            models.Dialog.first_response_time.isnot(None)
        ).scalar()
    
    # Расчёт изменений в процентах
    def calculate_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    changes = {
        "messages": calculate_change(period_messages, previous_messages),
        "dialogs": calculate_change(period_dialogs, previous_dialogs)
    }
    
    # Проверка trial периода
    from core.app_config import TRIAL_DURATION_DAYS, TRIAL_MESSAGE_LIMIT
    
    trial_end_date = target_user.created_at + timedelta(days=TRIAL_DURATION_DAYS)
    is_trial_active = now < trial_end_date
    trial_days_left = max(0, (trial_end_date - now).days) if is_trial_active else 0
    
    # Подсчёт использованных сообщений в trial
    if is_trial_active:
        trial_messages_used = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == target_user.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= target_user.created_at
        ).scalar() or 0
    else:
        trial_messages_used = 0
    
    # Проверка доступа пользователя
    def check_user_access(user):
        """Проверка доступа пользователя к функциям"""
        if is_trial_active:
            return {"level": "trial", "description": f"Trial период: {trial_days_left} дней осталось"}
        else:
            return {"level": "full", "description": "Полный доступ ко всем функциям"}
    
    # Подсчитываем общее количество сообщений пользователя
    total_messages = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == target_user.id,
        models.DialogMessage.sender == 'assistant'
    ).scalar() or 0
    
    # Подсчитываем автоответы (предполагаем что все сообщения ассистента - автоответы)
    auto_response_rate = 100 if period_messages > 0 else 0
    
    # Расширяем changes для всех метрик
    extended_changes = {
        "totalMessages": changes["messages"],
        "periodMessages": changes["messages"], 
        "autoResponseRate": 0,  # Пока нет данных для сравнения
        "avgResponseTime": 0,   # Пока нет данных для сравнения

    }
    
    result = {
        "period": period,
        "startDate": start_time.isoformat(),
        "endDate": (end_time if period == 'custom' and date else now).isoformat(),
        "messages": period_messages,  # Для обратной совместимости
        "periodMessages": period_messages,  # Что ожидает фронтенд
        "totalMessages": total_messages,    # Общее количество
        "messageLimit": TRIAL_MESSAGE_LIMIT if is_trial_active else None,

        "avgResponseTime": round(float(avg_response_time), 1) if avg_response_time else 0,
        "autoResponseRate": auto_response_rate,

        "dialogs": period_dialogs,
        "changes": extended_changes,
        "trialInfo": {
            "isTrialActive": is_trial_active,
            "trialDaysLeft": trial_days_left,
            "trialMessagesUsed": trial_messages_used,
            "trialMessageLimit": TRIAL_MESSAGE_LIMIT,
            "trialEndDate": (target_user.created_at + timedelta(days=TRIAL_DURATION_DAYS)).isoformat() if is_trial_active else None
        },
        "userAccess": check_user_access(target_user)
    }
    
    # Кэшируем результат
    chatai_cache.set_user_metrics(
        user_id=target_user.id,
        period=period,
        date=date,
        data=result,
        ttl=300  # 5 минут
    )
    
    return result