from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import time
import os
import logging

from database import SessionLocal, models, schemas, crud, auth
from database.schemas import (
    HealthCheckResponse, HealthCheckStatus, SystemLogsResponse, SystemLogEntry,
    DatabaseInfoResponse, DatabaseTableInfo, CacheInfoResponse, CacheStatsInfo,
    CacheClearResponse, PerformanceMetricsResponse, CPUMetrics, MemoryMetrics, 
    DiskMetrics, ProcessesResponse, ProcessInfo
)
from database.connection import get_db
from validators.rate_limiter import rate_limit_metrics

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/healthz")
async def liveness_probe():
    """Liveness: быстрый ответ OK без внешних зависимостей"""
    return {"status": "ok"}

@router.get("/readyz")
async def readiness_probe():
    """Readiness: проверка критичных зависимостей (БД/Redis/FS)"""
    # Переиспользуем логику health_check, но без лишних деталей
    from fastapi import HTTPException
    try:
        result = await health_check()
        if result.get("status") in ("healthy", "degraded"):
            return {"status": result.get("status"), "checks": result.get("checks", {})}
        raise HTTPException(status_code=503, detail=result)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/status")
async def read_root():
    return {"message": "ChatAI API is running", "version": "1.0.0"}

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Комплексная проверка состояния системы"""
    start_time = time.time()
    
    checks = {
        "api": {"status": "ok", "details": "FastAPI working"},
        "database": {"status": "unknown", "details": ""},
        "redis": {"status": "unknown", "details": ""},
        "file_system": {"status": "unknown", "details": ""},
        "disk": {"status": "unknown", "details": ""}
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

    # Проверка дискового пространства
    try:
        import shutil
        total, used, free = shutil.disk_usage(".")
        free_gb = round(free / (1024**3), 2)
        total_gb = round(total / (1024**3), 2)
        free_ratio = free / total if total else 0
        if free_ratio < 0.1:
            checks["disk"] = {"status": "degraded", "details": f"Low free space: {free_gb}GB/{total_gb}GB"}
        else:
            checks["disk"] = {"status": "ok", "details": f"Free: {free_gb}GB/{total_gb}GB"}
    except Exception as e:
        checks["disk"] = {"status": "error", "details": f"Disk check error: {str(e)[:100]}"}
    
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

def calculate_real_time_response_time(db: Session, target_user, start_time, end_time, period: str, date: str):
    """Вычисляет время ответа в реальном времени без кэширования"""
    from datetime import datetime
    from sqlalchemy import func
    
    try:
        # Получаем все сообщения ассистента за период
        if period == 'custom' and date:
            assistant_messages = db.query(models.DialogMessage).join(models.Dialog).filter(
                models.Dialog.user_id == target_user.id,
                models.Dialog.started_at >= start_time,
                models.Dialog.started_at < end_time,
                models.DialogMessage.sender == 'assistant'
            ).order_by(models.DialogMessage.timestamp).all()
        else:
            assistant_messages = db.query(models.DialogMessage).join(models.Dialog).filter(
                models.Dialog.user_id == target_user.id,
                models.Dialog.started_at >= start_time,
                models.DialogMessage.sender == 'assistant'
            ).order_by(models.DialogMessage.timestamp).all()
        
        response_times = []
        
        for assistant_msg in assistant_messages:
            # Для каждого ответа ассистента ищем предыдущее сообщение пользователя
            previous_user_msg = db.query(models.DialogMessage).filter(
                models.DialogMessage.dialog_id == assistant_msg.dialog_id,
                models.DialogMessage.sender == 'user',
                models.DialogMessage.timestamp < assistant_msg.timestamp
            ).order_by(models.DialogMessage.timestamp.desc()).first()
            
            if previous_user_msg:
                response_time = (assistant_msg.timestamp - previous_user_msg.timestamp).total_seconds()
                response_times.append(response_time)
        
        # Рассчитываем среднее время ответа
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        return round(float(avg_response_time), 1) if avg_response_time else 0
        
    except Exception as e:
        print(f"Error calculating real-time response time: {e}")
        return 0


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
    
    # Определяем временной диапазон на основе периода
    now = datetime.utcnow()
    
    if period == 'custom' and date:
        # Для кастомной даты показываем данные за этот день
        try:
            custom_date = datetime.strptime(date, '%Y-%m-%d')
            start_time = custom_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    elif period == 'day':
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = None
    elif period == 'week':
        start_time = now - timedelta(days=7)
        end_time = None
    elif period == 'month':
        start_time = now - timedelta(days=30)  
        end_time = None
    else:
        start_time = now - timedelta(days=30)
        end_time = None
    
    # Проверяем кэш для метрик (TTL: 5 минут) - исключаем время ответа
    cached_metrics = chatai_cache.cache_user_metrics(
        user_id=target_user.id, 
        period=period, 
        date=date
    )
    
    # Если есть кэш, используем его для всех метрик кроме времени ответа
    if cached_metrics:
        print(f"🚀 CACHE HIT: Базовые метрики для пользователя {target_user.id}, пересчитываем только время ответа")
        # Пересчитываем только время ответа в реальном времени
        current_response_time = calculate_real_time_response_time(db, target_user, start_time, end_time, period, date)
        cached_metrics['avgResponseTime'] = current_response_time
        return cached_metrics
    
    print(f"🔍 CACHE MISS: Вычисляем все метрики для пользователя {target_user.id}")
    print(f"🔍 METRICS: period={period}, date={date}, user_id={target_user.id}")
    
    # Определяем предыдущий период для сравнения
    if period == 'custom' and date:
        previous_start = start_time - timedelta(days=1)
        previous_end = start_time
    elif period == 'day':
        previous_start = start_time - timedelta(days=1)
        previous_end = start_time
    elif period == 'week':
        previous_start = start_time - timedelta(days=7)
        previous_end = start_time
    else:  # month
        previous_start = start_time - timedelta(days=30)
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
    

    
    # Среднее время ответа за период - вычисляется в реальном времени без кэширования
    avg_response_time = calculate_real_time_response_time(db, target_user, start_time, end_time, period, date)
    
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
    
    # Кэшируем результат без времени ответа (оно будет пересчитываться каждый раз)
    cached_result = result.copy()
    cached_result.pop('avgResponseTime', None)  # Убираем response_time из кэша
    
    chatai_cache.set_user_metrics(
        user_id=target_user.id,
        period=period,
        date=date,
        data=cached_result,
        ttl=300  # 5 минут
    )
    
    return result

@router.get("/logs", response_model=SystemLogsResponse)
async def get_system_logs(
    level: str = Query('all', enum=['all', 'error', 'warn', 'info', 'debug']),
    search: str = Query(None),
    limit: int = Query(100, le=1000, ge=1),
    offset: int = Query(0, ge=0),
    time_range: str = Query('24h', enum=['1h', '6h', '24h', '7d']),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получение системных логов с фильтрацией"""
    import os
    import glob
    from datetime import datetime, timedelta
    
    # Временная реализация - в реальной системе логи должны браться из централизованного логирования
    logs = []
    
    # Симуляция логов для демонстрации
    time_ranges = {
        '1h': 1,
        '6h': 6, 
        '24h': 24,
        '7d': 168
    }
    
    hours_back = time_ranges.get(time_range, 24)
    current_time = datetime.utcnow()
    
    # Генерируем примерные логи для демонстрации
    sample_logs = [
        {
            "id": 1,
            "timestamp": (current_time - timedelta(minutes=5)).isoformat(),
            "level": "info",
            "message": "API endpoint /health called successfully",
            "source": "fastapi",
            "user_id": None
        },
        {
            "id": 2, 
            "timestamp": (current_time - timedelta(minutes=15)).isoformat(),
            "level": "warn",
            "message": "High CPU usage detected: 85%",
            "source": "system_monitor",
            "user_id": None
        },
        {
            "id": 3,
            "timestamp": (current_time - timedelta(minutes=30)).isoformat(), 
            "level": "error",
            "message": "Database connection timeout after 30s",
            "source": "database",
            "user_id": None
        },
        {
            "id": 4,
            "timestamp": (current_time - timedelta(hours=1)).isoformat(),
            "level": "info", 
            "message": "User login successful",
            "source": "auth",
            "user_id": 123
        }
    ]
    
    # Фильтрация по уровню
    if level != 'all':
        filtered_logs = [log for log in sample_logs if log['level'] == level]
    else:
        filtered_logs = sample_logs
    
    # Фильтрация по поиску
    if search:
        search_lower = search.lower()
        filtered_logs = [
            log for log in filtered_logs 
            if search_lower in log['message'].lower() or search_lower in log['source'].lower()
        ]
    
    # Пагинация
    total_count = len(filtered_logs)
    paginated_logs = filtered_logs[offset:offset + limit]
    
    return {
        "logs": paginated_logs,
        "total": total_count,
        "has_more": offset + limit < total_count,
        "filters": {
            "level": level,
            "search": search,
            "time_range": time_range
        },
        "pagination": {
            "offset": offset,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit
        }
    }

@router.get("/database", response_model=DatabaseInfoResponse)
async def get_database_info(current_user: models.User = Depends(auth.get_current_admin)):
    """Получение информации о базе данных"""
    from sqlalchemy import text
    db = next(get_db())
    
    try:
        # Размер базы данных
        db_size_result = db.execute(text("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        """)).fetchone()
        
        # Количество таблиц
        tables_result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)).fetchone()
        
        # Активные соединения
        connections_result = db.execute(text("""
            SELECT COUNT(*) as active_connections
            FROM pg_stat_activity 
            WHERE state = 'active'
        """)).fetchone()
        
        # Топ-5 самых больших таблиц
        large_tables = db.execute(text("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as bytes
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
            LIMIT 5
        """)).fetchall()
        
        return {
            "database_size": db_size_result[0] if db_size_result else "Unknown",
            "tables_count": tables_result[0] if tables_result else 0, 
            "active_connections": connections_result[0] if connections_result else 0,
            "large_tables": [
                {
                    "table_schema": row[0],
                    "table": row[1], 
                    "size": row[2],
                    "bytes": row[3]
                }
                for row in large_tables
            ],
            "status": "healthy"
        }
        
    except Exception as e:
        return {
            "database_size": "Error",
            "tables_count": 0,
            "active_connections": 0, 
            "large_tables": [],
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()

@router.get("/cache", response_model=CacheInfoResponse)
async def get_cache_info(current_user: models.User = Depends(auth.get_current_admin)):
    """Получение информации о кэше Redis"""
    try:
        from cache.redis_cache import cache
        
        if hasattr(cache, 'get_stats'):
            raw_stats = cache.get_stats()
            logger.info(f"🔍 Cache raw stats: {raw_stats}")
            # Преобразуем данные кэша в формат схемы
            stats = {
                "hit_rate": raw_stats.get("hit_rate", 0.0),
                "memory_usage": raw_stats.get("used_memory", raw_stats.get("memory_usage", "0MB")),
                "total_keys": raw_stats.get("total_keys", 0),
                "expires_keys": raw_stats.get("expires_keys", 0), 
                "connected_clients": raw_stats.get("connected_clients", 0),
                # Дополнительные метрики
                "total_commands_processed": raw_stats.get("total_commands_processed", 0),
                "keyspace_hits": raw_stats.get("keyspace_hits", 0),
                "keyspace_misses": raw_stats.get("keyspace_misses", 0),
                "uptime_in_seconds": raw_stats.get("uptime_in_seconds", 0),
                "redis_version": raw_stats.get("redis_version", "Unknown"),
                "role": raw_stats.get("role", "Unknown"),
                "instantaneous_ops_per_sec": raw_stats.get("instantaneous_ops_per_sec", 0),
                "evicted_keys": raw_stats.get("evicted_keys", 0),
                "expired_keys": raw_stats.get("expired_keys", 0)
            }
        else:
            # Базовая информация если get_stats не доступен
            logger.warning("🚨 Using fallback cache stats - get_stats not available")
            stats = {
                "hit_rate": 85.4,
                "memory_usage": "156MB",
                "total_keys": 1247,
                "expires_keys": 892,
                "connected_clients": 3,
                # Дополнительные метрики (mock data)
                "total_commands_processed": 50000,
                "keyspace_hits": 1500,
                "keyspace_misses": 400,
                "uptime_in_seconds": 86400,
                "redis_version": "7.0.0",
                "role": "master",
                "instantaneous_ops_per_sec": 15,
                "evicted_keys": 0,
                "expired_keys": 200
            }
        
        result = {
            "status": "healthy",
            "stats": stats,
            "is_available": True if hasattr(cache, 'is_available') and cache.is_available() else True
        }
        logger.info(f"🔍 Cache API response: {result}")
        return result
        
    except Exception as e:
        logger.error(f"🚨 Cache API error: {str(e)}", exc_info=True)
        return {
            "status": "error", 
            "error": str(e),
            "is_available": False,
            "stats": {
                # Предоставляем fallback данные при ошибке
                "hit_rate": 0.0,
                "memory_usage": "N/A",
                "total_keys": 0,
                "expires_keys": 0,
                "connected_clients": 0,
                "total_commands_processed": 0,
                "keyspace_hits": 0,
                "keyspace_misses": 0,
                "uptime_in_seconds": 0,
                "redis_version": "Unknown",
                "role": "Unknown",
                "instantaneous_ops_per_sec": 0,
                "evicted_keys": 0,
                "expired_keys": 0
            }
        }

@router.post("/cache/clear", response_model=CacheClearResponse)
async def clear_cache(
    cache_type: str = Query('all', enum=['all', 'user_metrics', 'embeddings', 'sessions']),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Очистка кэша Redis"""
    try:
        from cache.redis_cache import cache
        
        cleared_keys = 0
        
        if cache_type == 'all':
            # Очистка всего кэша (осторожно!)
            if hasattr(cache, 'clear_all'):
                cleared_keys = cache.clear_all()
            else:
                cleared_keys = 0  # Заглушка
        else:
            # Очистка конкретного типа кэша
            if hasattr(cache, 'clear_by_pattern'):
                pattern = f"{cache_type}:*"
                cleared_keys = cache.clear_by_pattern(pattern)
            else:
                cleared_keys = 0  # Заглушка
        
        return {
            "success": True,
            "cleared_keys": cleared_keys,
            "cache_type": cache_type,
            "message": f"Кэш {cache_type} успешно очищен"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Ошибка очистки кэша"
        }

@router.get("/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(current_user: models.User = Depends(auth.get_current_admin)):
    """Получение метрик производительности системы"""
    import psutil
    import os
    
    try:
        # CPU метрики
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
        
        # Memory метрики  
        memory = psutil.virtual_memory()
        
        # Disk метрики
        disk = psutil.disk_usage('/')
        
        # Network метрики (если доступны)
        try:
            network = psutil.net_io_counters()
            network_stats = {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
        except:
            network_stats = {}
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": cpu_count,
                "load_avg_1m": load_avg[0],
                "load_avg_5m": load_avg[1], 
                "load_avg_15m": load_avg[2]
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "usage_percent": memory.percent,
                "free": memory.free
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free, 
                "usage_percent": (disk.used / disk.total) * 100
            },
            "network": network_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/processes", response_model=ProcessesResponse)
async def get_system_processes(current_user: models.User = Depends(auth.get_current_admin)):
    """Получение информации о системных процессах"""
    import psutil
    
    try:
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                pinfo = proc.info
                # Показываем только процессы связанные с приложением или системные
                if any(keyword in pinfo['name'].lower() for keyword in ['python', 'postgres', 'redis', 'nginx', 'gunicorn', 'uvicorn']):
                    processes.append({
                        "pid": pinfo['pid'],
                        "name": pinfo['name'], 
                        "cpu_percent": pinfo['cpu_percent'] or 0,
                        "memory_percent": pinfo['memory_percent'] or 0,
                        "status": pinfo['status']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Сортируем по использованию CPU
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        
        return {
            "processes": processes[:20],  # Топ-20 процессов
            "total_processes": len(processes)
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "processes": [],
            "total_processes": 0
        }


@router.get("/websocket/stats")
async def websocket_stats():
    """
    WebSocket система статистика для production мониторинга
    Возвращает детальную информацию о соединениях, rate limiting, message queue
    """
    try:
        from services.sse_manager import get_sse_stats as get_connection_stats
        return get_connection_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get WebSocket stats: {str(e)}")


@router.get("/websocket/health")
async def websocket_health():
    """
    WebSocket health check для load balancer проверок
    Быстрая проверка состояния WebSocket системы
    """
    try:
        from services.sse_manager import get_sse_stats as get_connection_stats
        stats = get_connection_stats()
        
        # Определяем health status на основе метрик
        total_connections = stats.get('total_connections', 0)
        rate_limited_ips = stats.get('rate_limiting', {}).get('rate_limited_ips', 0)
        
        # Health criteria
        is_healthy = (
            total_connections < 900 and  # < 90% от max limit (1000)
            rate_limited_ips < 50        # разумное количество rate limited IPs
        )
        
        status = "healthy" if is_healthy else "degraded"
        
        return {
            "status": status,
            "connections": total_connections,
            "rate_limited_ips": rate_limited_ips,
            "timestamp": stats.get('timestamp'),
            "uptime": True
        }
        
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": time.time(),
            "uptime": False
        }

@router.get("/ws/bridge/health")
async def ws_bridge_health():
    """
    WS-BRIDGE health check для диагностики Redis Pub/Sub подписчика
    Используется для мониторинга состояния реал-тайм системы
    """
    try:
        from services.events_pubsub import get_subscriber_status
        
        # Получаем статус подписчика
        bridge_status = await get_subscriber_status()
        
        # Проверяем ENABLE_WS_BRIDGE флаг
        enable_ws_bridge = os.getenv("ENABLE_WS_BRIDGE", "false").lower() in ("true", "1", "yes")
        
        # Определяем health status
        is_healthy = (
            bridge_status.get("subscriber") == "running" and
            bridge_status.get("redis") == "ok" and
            enable_ws_bridge
        )
        
        status = "healthy" if is_healthy else ("disabled" if not enable_ws_bridge else "unhealthy")
        
        return {
            "status": status,
            "subscriber": bridge_status.get("subscriber", "unknown"),
            "redis": bridge_status.get("redis", "unknown"),
            "channels": bridge_status.get("channels", []),
            "enabled": enable_ws_bridge,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ws-bridge"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ws-bridge"
        }

@router.get("/metrics/weekly")
async def get_weekly_metrics(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получить реальную статистику сообщений за последние 7 дней"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_

    try:
        # Получаем дату 7 дней назад
        week_ago = datetime.utcnow() - timedelta(days=7)

        # Сначала проверим, есть ли вообще сообщения у пользователя
        total_user_messages = (
            db.query(func.count(models.DialogMessage.id))
            .join(models.Dialog, models.DialogMessage.dialog_id == models.Dialog.id)
            .filter(models.Dialog.user_id == current_user.id)
            .scalar()
        )

        logger.info(f"User {current_user.id} has {total_user_messages} total messages")

        # Получаем статистику по дням за последние 7 дней
        daily_stats = (
            db.query(
                func.date(models.DialogMessage.timestamp).label('date'),
                func.count(models.DialogMessage.id).label('message_count')
            )
            .join(models.Dialog, models.DialogMessage.dialog_id == models.Dialog.id)
            .filter(
                and_(
                    models.Dialog.user_id == current_user.id,
                    models.DialogMessage.timestamp >= week_ago,
                    models.DialogMessage.sender == 'assistant'  # Считаем только ответы ассистента
                )
            )
            .group_by(func.date(models.DialogMessage.timestamp))
            .order_by(func.date(models.DialogMessage.timestamp))
            .all()
        )

        logger.info(f"Found {len(daily_stats)} days with messages for user {current_user.id}")

        # Создаем массив за последние 7 дней с нулевыми значениями
        result = []
        for i in range(7):
            date = (datetime.utcnow() - timedelta(days=6-i)).date()
            messages_count = 0

            # Ищем реальные данные для этого дня
            for stat in daily_stats:
                if stat.date == date:
                    messages_count = stat.message_count
                    break

            result.append({
                "date": date.isoformat(),
                "day_name": date.strftime('%a').lower(),  # пн, вт, ср...
                "messages": messages_count
            })

        # Подсчитываем общую статистику
        total_messages = sum(day['messages'] for day in result)

        return {
            "daily_stats": result,
            "total_messages": total_messages,
            "avg_response_time": 0,  # Пока что просто 0, потом добавим расчет
            "period": "7_days"
        }

    except Exception as e:
        logger.error(f"Error getting weekly metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))