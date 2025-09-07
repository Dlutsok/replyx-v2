from fastapi import FastAPI, Response, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from core.dynamic_cors_middleware import DynamicCORSMiddleware
from core.dynamic_csp_middleware import DynamicCSPMiddleware
from database.connection import engine, Base, SessionLocal, get_db
from database import models
import os
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла (из корневой папки проекта)
load_dotenv(dotenv_path="../.env")

from core.app_config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS
)
from core.csrf_protection import get_csrf_protection, generate_csrf_token_for_response
from core.security_headers import security_headers_middleware
from ai.ai_assistant import router as ai_assistant_router
from ai.training_system import router as training_router
from monitoring.rating_system import router as rating_router

import logging
from logging.handlers import TimedRotatingFileHandler
import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from core.error_handler import setup_error_handlers

# Настройка логгирования (с ротацией)
os.makedirs('logs', exist_ok=True)
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
for h in list(root_logger.handlers):
    root_logger.removeHandler(h)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = TimedRotatingFileHandler('logs/api.log', when='midnight', backupCount=7, encoding='utf-8')
file_handler.setFormatter(formatter)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
root_logger.addHandler(file_handler)
root_logger.addHandler(stream_handler)
logger = logging.getLogger(__name__)

# 🔧 Lifespan events (современная замена on_event)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # В продакшене ТОЛЬКО миграции Alembic, никогда не create_all()
    # Используем переменную ENVIRONMENT (export ENVIRONMENT=development в dev)
    environment = os.getenv("ENVIRONMENT", "production").lower()
    if environment in {"dev", "development", "local"}:
        logger.info(f"Development environment detected: {environment}")
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema created via ORM")
    else:
        logger.info(f"Production environment: {environment} - using Alembic migrations only")
    
    # Инициализация SSE Manager
    try:
        from services.sse_manager import sse_manager
        await sse_manager.initialize()
        logger.info("✅ SSE Manager initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize SSE Manager: {e}")
    
    # Инициализация данных по умолчанию
    db = SessionLocal()
    try:
        from services.balance_service import init_default_prices
        # Инициализируем цены на услуги
        init_default_prices(db)
        
        print("✅ Default data initialization completed")
    except Exception as e:
        logger.error(f"Error initializing default data: {e}")
    finally:
        db.close()
    
    # 🔥 WS-BRIDGE: Запуск Redis Pub/Sub подписчика для ws-gateway
    ws_bridge_task = None
    enable_ws_bridge = os.getenv("ENABLE_WS_BRIDGE", "false").lower() in ("true", "1", "yes")
    
    if enable_ws_bridge:
        logger.info("🔔 ENABLE_WS_BRIDGE=true - запускаем Redis Pub/Sub подписчик")
        try:
            from services.events_pubsub import start_ws_bridge_subscriber
            
            async def ws_bridge_event_handler(event: dict):
                """Обработчик событий от Redis - транслирует в WebSocket соединения"""
                try:
                    dialog_id = event.get("dialog_id")
                    event_type = event.get("type")
                    message = event.get("message")
                    
                    if not dialog_id or not message:
                        logger.warning(f"WS-BRIDGE: Incomplete event data: {event}")
                        return
                    
                    logger.info(f"🔔 WS-BRIDGE received: {event_type} dialog={dialog_id}")
                    
                    # WS-BRIDGE disabled - migrated to SSE
                    logger.info(f"🔔 WS-BRIDGE: Event ignored (migrated to SSE): {event_type} dialog={dialog_id}")
                    
                except Exception as e:
                    logger.error(f"❌ WS-BRIDGE event handler error: {e}", exc_info=True)
            
            # Запускаем подписчик в фоновой задаче
            import asyncio
            ws_bridge_task = asyncio.create_task(
                start_ws_bridge_subscriber(ws_bridge_event_handler)
            )
            logger.info("✅ WS-BRIDGE subscriber started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to start WS-BRIDGE subscriber: {e}", exc_info=True)
    else:
        logger.info("WS-BRIDGE disabled (ENABLE_WS_BRIDGE != true)")
    
    print("✅ Application startup completed")
    
    yield
    
    # Shutdown
    # Остановка SSE Manager
    try:
        from services.sse_manager import sse_manager
        await sse_manager.shutdown()
        logger.info("✅ SSE Manager shutdown completed")
    except Exception as e:
        logger.error(f"❌ Error shutting down SSE Manager: {e}")
    
    if ws_bridge_task and not ws_bridge_task.done():
        logger.info("🛑 Stopping WS-BRIDGE subscriber...")
        ws_bridge_task.cancel()
        try:
            await ws_bridge_task
        except asyncio.CancelledError:
            logger.info("✅ WS-BRIDGE subscriber stopped")
        except Exception as e:
            logger.error(f"❌ Error stopping WS-BRIDGE: {e}")
    
    print("✅ Application shutdown completed")

app = FastAPI(lifespan=lifespan)
app.include_router(ai_assistant_router)
app.include_router(training_router)
app.include_router(rating_router)

# Подключаем модульные роутеры
from api.system import router as system_router
from api.auth import router as auth_router
from api.users import router as users_router
from api.documents import router as documents_router
from api.assistants import router as assistants_router
from api.dialogs import router as dialogs_router
from api.bots import router as bots_router
from api.admin import router as admin_router

from api.site import router as site_router
from api.tokens import router as tokens_router
from api.email import router as email_router

# from api.websockets import router as websockets_router  # REMOVED - migrated to SSE
from api.balance import router as balance_router
from api.support import router as support_router
from api.handoff import router as handoff_router, operator_router as operator_handoff_router
from api.qa_knowledge import router as qa_knowledge_router
from api.database_admin import router as database_admin_router
from api.start_analytics import router as start_analytics_router
from api.tinkoff_payments import router as tinkoff_payments_router
from api.debug_sse import router as debug_sse_router  # Renamed from debug_websocket
from api.sse import router as sse_router
from api.proxy_monitoring import router as proxy_monitoring_router
app.include_router(system_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(assistants_router, prefix="/api")
app.include_router(dialogs_router, prefix="/api")
app.include_router(bots_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

app.include_router(site_router, prefix="/api")
app.include_router(tokens_router, prefix="/api")
app.include_router(email_router, prefix="/api")
app.include_router(rating_router, prefix="/api")
app.include_router(balance_router)
app.include_router(support_router, prefix="/api")
app.include_router(handoff_router, prefix="/api")
app.include_router(operator_handoff_router, prefix="/api")
# app.include_router(websockets_router)  # REMOVED - migrated to SSE
app.include_router(qa_knowledge_router, prefix="/api")
app.include_router(database_admin_router, prefix="/api")
app.include_router(start_analytics_router, prefix="/api/start")
app.include_router(tinkoff_payments_router)
app.include_router(debug_sse_router, prefix="/api")
app.include_router(proxy_monitoring_router, prefix="/api")
app.include_router(sse_router)

# Static files для загруженных файлов (аватары, документы)
from fastapi.staticfiles import StaticFiles
import os

# Создаем директорию uploads если её нет
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "avatars"), exist_ok=True)

# Монтируем статические файлы
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Настройка обработчиков ошибок
setup_error_handlers(app)

# 🔐 БЕЗОПАСНОСТЬ: Динамический CORS с разделением политик
# Основные домены приложения (с credentials)
main_app_origins = os.getenv('CORS_ORIGINS', 'https://replyx.ru,https://www.replyx.ru,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:8000').split(',')

# Очищаем домены от пробелов и фильтруем "*"
main_app_origins = [origin.strip() for origin in main_app_origins if origin.strip() != "*"]

print(f"🌐 Основные CORS домены: {main_app_origins}")
print(f"🔧 Виджет эндпоинты: ['/api/validate-widget-token', '/api/widget-config']")

# Добавляем DynamicCORSMiddleware вместо стандартного
app.add_middleware(
    DynamicCORSMiddleware,
    main_app_origins=main_app_origins,
    widget_endpoints=['/api/validate-widget-token', '/api/widget-config'],
    allow_credentials=True,  # Разрешено для основного приложения
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)

# 🛡️ Динамический CSP Middleware для iframe страниц
app.add_middleware(
    DynamicCSPMiddleware,
    iframe_path='/chat-iframe'
)

print("🛡️ DynamicCSPMiddleware добавлен для iframe страниц")

# 🛡️ CSRF Protection Middleware
# Включаем только в продакшене или при явном указании
enable_csrf = os.getenv('ENABLE_CSRF_PROTECTION', 'false').lower() in ('true', '1', 'yes')
environment = os.getenv('ENVIRONMENT', 'development').lower()

if enable_csrf:
    csrf_protection = get_csrf_protection()
    
    @app.middleware("http")
    async def csrf_middleware(request: Request, call_next):
        return await csrf_protection(request, call_next)
    
    print("🛡️ CSRF Protection включена")
else:
    print("⚠️ CSRF Protection отключена (разработка)")

# 🛡️ Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware_handler(request: Request, call_next):
    return await security_headers_middleware(request, call_next)

print("🛡️ Security Headers включены")

# Функции управления ботами перенесены в services/bot_manager.py
from services.bot_manager import (
    reload_assistant_bots,
    hot_reload_assistant_bots,
    reload_specific_bot,
    reload_user_assistant_bots
)

# WebSocket removed - migrated to SSE
# from services.websocket_manager import (...) - REMOVED

# AI Token Manager
from ai.ai_token_manager import ai_token_manager

# Функции пробного периода перенесены в services/trial_service.py
from services.trial_service import (
    TRIAL_DURATION_DAYS,
    TRIAL_MESSAGE_LIMIT,
    is_trial_period_active,
    get_trial_messages_used,
    get_trial_days_left,
    is_user_blocked,
    get_user_message_limit,
    check_user_access,
    get_warning_message
)

# ============================
# Prometheus метрики и middleware
# ============================

HTTP_REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds', 'HTTP request latency', ['method', 'path', 'status']
)
HTTP_REQUEST_COUNT = Counter(
    'http_requests_total', 'Total HTTP requests', ['method', 'path', 'status']
)
DB_POOL_CHECKED_OUT = Gauge('db_pool_checked_out', 'Checked out DB connections')
DB_POOL_SIZE = Gauge('db_pool_size', 'DB pool size')
DB_POOL_OVERFLOW = Gauge('db_pool_overflow', 'DB pool overflow')
REDIS_AVAILABLE = Gauge('redis_available', 'Redis availability (1/0)')
WEBSOCKET_CONNECTIONS = Gauge('websocket_connections_total', 'Total active WebSocket connections')
WEBSOCKET_CONNECTIONS_BY_TYPE = Gauge('websocket_connections_by_type', 'WebSocket connections by type', ['connection_type'])
WEBSOCKET_RATE_LIMITED_IPS = Gauge('websocket_rate_limited_ips', 'Currently rate limited IP addresses')
WEBSOCKET_MESSAGE_QUEUE_PENDING = Gauge('websocket_message_queue_pending', 'Pending messages in WebSocket queue')
WEBSOCKET_MESSAGE_QUEUE_PROCESSED = Counter('websocket_message_queue_processed_total', 'Total processed WebSocket messages')
WEBSOCKET_CLOSE_CODES = Counter('websocket_close_codes_total', 'WebSocket close codes', ['code', 'reason'])
WEBSOCKET_CONNECTION_DURATION = Histogram('websocket_connection_duration_seconds', 'WebSocket connection duration')

# Метрики виджет эндпоинтов для CORS безопасности
WIDGET_CORS_REQUESTS = Counter('widget_cors_requests_total', 'Total widget CORS requests', ['endpoint', 'origin', 'status'])
WIDGET_TOKEN_VALIDATIONS = Counter('widget_token_validations_total', 'Widget token validation attempts', ['result', 'endpoint'])
WIDGET_BLOCKED_ORIGINS = Counter('widget_blocked_origins_total', 'Blocked widget origins', ['origin', 'reason'])


@app.middleware("http")
async def prometheus_middleware(request, call_next):
    start = time.perf_counter()
    status_code = "500"  # Дефолтное значение на случай ошибки
    
    try:
        response = await call_next(request)
        if response is not None:
            status_code = str(response.status_code)
        else:
            # Если response None, создаем ошибку 500
            from fastapi.responses import JSONResponse
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal server error: No response returned"}
            )
            status_code = "500"
            
    except Exception as e:
        # Обрабатываем любые исключения в middleware chain
        from fastapi.responses import JSONResponse
        response = JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )
        status_code = "500"
    
    duration = time.perf_counter() - start
    method = request.method
    # Пытаемся получить шаблон пути, чтобы снизить кардинальность
    route = request.scope.get('route')
    path = getattr(route, 'path', request.url.path)
    
    try:
        HTTP_REQUEST_LATENCY.labels(method=method, path=path, status=status_code).observe(duration)
        HTTP_REQUEST_COUNT.labels(method=method, path=path, status=status_code).inc()
    except Exception:
        pass
    return response


@app.get("/metrics")
def prometheus_metrics():
    # Обновляем метрики пула БД/Redis/WS перед экспортом
    try:
        pool = engine.pool
        DB_POOL_SIZE.set(pool.size())
        DB_POOL_CHECKED_OUT.set(pool.checkedout())
        DB_POOL_OVERFLOW.set(pool.overflow())
    except Exception:
        pass
    try:
        from cache.redis_cache import cache as redis_cache
        REDIS_AVAILABLE.set(1 if redis_cache.is_available() else 0)
    except Exception:
        REDIS_AVAILABLE.set(0)
    try:
        # SSE метрики вместо WebSocket
        from services.sse_manager import get_sse_stats
        sse_stats = get_sse_stats()
        
        # Обновляем SSE метрики (заменяем WebSocket)
        WEBSOCKET_CONNECTIONS.set(sse_stats.get('active_connections', 0))
        
        # SSE connections by type
        clients_per_dialog = sse_stats.get('clients_per_dialog', {})
        total_sse_connections = sum(clients_per_dialog.values())
        WEBSOCKET_CONNECTIONS_BY_TYPE.labels(connection_type='sse').set(total_sse_connections)
        
        # Очистка неиспользуемых метрик (set to 0)
        WEBSOCKET_RATE_LIMITED_IPS.set(0)
        WEBSOCKET_MESSAGE_QUEUE_PENDING.set(0)
        
    except Exception as e:
        # Fallback: устанавливаем 0 при ошибке получения SSE статистики
        logger.warning(f"Error getting SSE stats: {e}")
        WEBSOCKET_CONNECTIONS.set(0)
        WEBSOCKET_CONNECTIONS_BY_TYPE.labels(connection_type='sse').set(0)

    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


@app.get("/api/csrf-token")
def get_csrf_token(request: Request):
    """Получение CSRF токена для frontend приложений"""
    try:
        csrf_token = generate_csrf_token_for_response(request)
        return {
            "csrf_token": csrf_token,
            "expires_in": 3600,  # 1 час
            "token_name": "csrf_token",
            "header_name": "X-CSRF-Token"
        }
    except Exception as e:
        logger.error(f"Ошибка генерации CSRF токена: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка генерации CSRF токена"
        )


@app.get("/health")
def health_check():
    """Health check endpoint для мониторинга состояния приложения"""
    health_status = {"status": "healthy", "timestamp": time.time(), "components": {}}
    
    # Проверка базы данных
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["components"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["database"] = {"status": "unhealthy", "error": str(e)}
    
    # Проверка Redis
    try:
        from cache.redis_cache import cache as redis_cache
        redis_available = redis_cache.is_available()
        health_status["components"]["redis"] = {"status": "healthy" if redis_available else "unhealthy"}
        if not redis_available:
            health_status["status"] = "unhealthy"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["redis"] = {"status": "unhealthy", "error": str(e)}
    
    # Проверка AI Token Manager
    try:
        ai_token_manager_status = "healthy" if ai_token_manager else "unhealthy"
        health_status["components"]["ai_token_manager"] = {"status": ai_token_manager_status}
    except Exception as e:
        health_status["components"]["ai_token_manager"] = {"status": "unhealthy", "error": str(e)}
    
    return health_status


@app.get("/metrics/telegram-rate-limit")
async def get_telegram_rate_limit_metrics():
    """Prometheus метрики rate limiting для всех Telegram ботов"""
    try:
        from services.telegram_rate_limiter import get_all_rate_limiters
        
        all_limiters = get_all_rate_limiters()
        metrics = []
        
        # Агрегированная статистика
        total_active_chats = 0
        total_active_workers = 0 
        total_queue_size = 0
        total_messages_sent = 0
        total_messages_queued = 0
        total_rate_limit_hits = 0
        total_retry_attempts = 0
        total_errors = 0
        
        # Метрики по каждому боту
        for bot_id, rate_limiter in all_limiters.items():
            stats = rate_limiter.get_global_stats()
            
            # Метрики конкретного бота
            metrics.append(f"telegram_bot_active_chats{{bot_id=\"{bot_id}\"}} {stats['active_chats']}")
            metrics.append(f"telegram_bot_active_workers{{bot_id=\"{bot_id}\"}} {stats['active_workers']}")
            metrics.append(f"telegram_bot_total_queue_size{{bot_id=\"{bot_id}\"}} {stats['total_queue_size']}")
            
            if 'stats' in stats:
                bot_stats = stats['stats']
                metrics.append(f"telegram_bot_messages_sent_total{{bot_id=\"{bot_id}\"}} {bot_stats['messages_sent']}")
                metrics.append(f"telegram_bot_messages_queued_total{{bot_id=\"{bot_id}\"}} {bot_stats['messages_queued']}")
                metrics.append(f"telegram_bot_rate_limit_hits_total{{bot_id=\"{bot_id}\"}} {bot_stats['rate_limit_hits']}")
                metrics.append(f"telegram_bot_retry_attempts_total{{bot_id=\"{bot_id}\"}} {bot_stats['retry_attempts']}")
                metrics.append(f"telegram_bot_errors_total{{bot_id=\"{bot_id}\"}} {bot_stats['errors']}")
                
                # Агрегация
                total_messages_sent += bot_stats['messages_sent']
                total_messages_queued += bot_stats['messages_queued'] 
                total_rate_limit_hits += bot_stats['rate_limit_hits']
                total_retry_attempts += bot_stats['retry_attempts']
                total_errors += bot_stats['errors']
            
            if 'uptime' in stats:
                metrics.append(f"telegram_bot_uptime_seconds{{bot_id=\"{bot_id}\"}} {stats['uptime']}")
            
            # Агрегация основных метрик
            total_active_chats += stats['active_chats']
            total_active_workers += stats['active_workers']
            total_queue_size += stats['total_queue_size']
        
        # Глобальные агрегированные метрики
        metrics.append(f"telegram_total_bots {len(all_limiters)}")
        metrics.append(f"telegram_total_active_chats {total_active_chats}")
        metrics.append(f"telegram_total_active_workers {total_active_workers}")
        metrics.append(f"telegram_global_queue_size {total_queue_size}")
        metrics.append(f"telegram_global_messages_sent_total {total_messages_sent}")
        metrics.append(f"telegram_global_messages_queued_total {total_messages_queued}")
        metrics.append(f"telegram_global_rate_limit_hits_total {total_rate_limit_hits}")
        metrics.append(f"telegram_global_retry_attempts_total {total_retry_attempts}")
        metrics.append(f"telegram_global_errors_total {total_errors}")
        
        # Пропускная способность системы (сообщений в секунду)
        # Теоретический максимум: 30 сообщений/сек * количество ботов
        max_throughput = len(all_limiters) * 30
        metrics.append(f"telegram_max_theoretical_throughput_per_second {max_throughput}")
        
        return Response(
            content="\n".join(metrics) + "\n",
            media_type="text/plain"
        )
        
    except Exception as e:
        logger.error(f"Ошибка получения метрик Telegram rate limiting: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения метрик Telegram")


@app.get("/api/telegram/rate-limit/stats")
async def get_telegram_rate_limit_stats():
    """Детальная статистика rate limiting для всех ботов"""
    try:
        from services.telegram_rate_limiter import get_all_rate_limiters
        
        all_limiters = get_all_rate_limiters()
        result = {
            "total_bots": len(all_limiters),
            "bots": {},
            "summary": {
                "total_active_chats": 0,
                "total_messages_sent": 0,
                "total_queue_size": 0,
                "max_throughput_per_second": len(all_limiters) * 30
            }
        }
        
        for bot_id, rate_limiter in all_limiters.items():
            stats = rate_limiter.get_global_stats()
            result["bots"][bot_id] = stats
            
            # Агрегация для summary
            result["summary"]["total_active_chats"] += stats.get("active_chats", 0)
            result["summary"]["total_queue_size"] += stats.get("total_queue_size", 0)
            
            if "stats" in stats:
                result["summary"]["total_messages_sent"] += stats["stats"].get("messages_sent", 0)
        
        return result
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики rate limiting: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения статистики")


@app.get("/api/telegram/rate-limit/stats/{bot_id}")
async def get_bot_rate_limit_stats(bot_id: str):
    """Статистика rate limiting для конкретного бота"""
    try:
        from services.telegram_rate_limiter import get_all_rate_limiters
        
        all_limiters = get_all_rate_limiters()
        
        if bot_id not in all_limiters:
            raise HTTPException(status_code=404, detail=f"Бот {bot_id} не найден")
        
        rate_limiter = all_limiters[bot_id]
        stats = rate_limiter.get_global_stats()
        
        # Добавляем дополнительную информацию о боте
        result = {
            "bot_id": bot_id,
            "max_throughput_per_second": 30,  # Лимит Telegram API на бот
            "stats": stats
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения статистики бота {bot_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения статистики бота")


@app.get("/metrics/db-size")
async def get_database_size_metrics():
    """Prometheus метрики размера БД"""
    try:
        from monitoring.db_size_monitor import DatabaseSizeMonitor
        
        monitor = DatabaseSizeMonitor()
        report = monitor.generate_full_report()
        
        if 'error' in report:
            raise HTTPException(status_code=500, detail=report['error'])
        
        # Формируем Prometheus метрики в текстовом формате
        metrics = []
        
        # Общий размер БД
        db_size_bytes = report['database_info']['database']['size_bytes']
        metrics.append(f"replyx_database_size_bytes {db_size_bytes}")
        
        # Размеры таблиц
        for table in report['database_info']['tables']:
            table_name = table['name'].replace('-', '_').replace('.', '_')
            metrics.append(f"replyx_table_size_bytes{{table=\"{table['name']}\"}} {table['total_bytes']}")
            if 'live_rows' in table:
                metrics.append(f"replyx_table_rows{{table=\"{table['name']}\"}} {table['live_rows']}")
        
        # Дисковое пространство
        if 'used_percent' in report['disk_info']:
            metrics.append(f"replyx_disk_usage_percent {report['disk_info']['used_percent']}")
            metrics.append(f"replyx_disk_free_bytes {report['disk_info']['free_bytes']}")
            metrics.append(f"replyx_disk_total_bytes {report['disk_info']['total_bytes']}")
        
        # Скорость роста
        if report['growth_rate_mb_per_day']:
            metrics.append(f"replyx_database_growth_rate_mb_per_day {report['growth_rate_mb_per_day']}")
        
        # Количество алертов
        metrics.append(f"replyx_database_alerts_total {len(report['alerts'])}")
        
        # Health status (0=healthy, 1=warning, 2=critical)
        health_score = 0 if report['health_status'] == 'healthy' else 1 if report['health_status'] == 'warning' else 2
        metrics.append(f"replyx_database_health_status {health_score}")
        
        return Response(
            content="\n".join(metrics) + "\n",
            media_type="text/plain"
        )
        
    except Exception as e:
        logger.error(f"Ошибка получения метрик БД: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения метрик БД")