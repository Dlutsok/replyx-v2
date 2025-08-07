from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import models, engine, Base, SessionLocal, get_db
import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from core.app_config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS,
    YANDEX_CLIENT_ID, YANDEX_CLIENT_SECRET, YANDEX_REDIRECT_URI, FRONTEND_REDIRECT_URL
)
from ai.ai_assistant import router as ai_assistant_router
from ai.training_system import router as training_router
from monitoring.rating_system import router as rating_router

import logging
from core.error_handler import setup_error_handlers

# Настройка логгирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 🔧 Lifespan events (современная замена on_event)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    
    # Инициализация данных по умолчанию
    db = SessionLocal()
    try:
        from services.balance_service import init_default_prices
        from services.promo_service import init_default_promo_codes
        from services.referral_service import auto_create_referral_codes
        
        # Инициализируем цены на услуги
        init_default_prices(db)
        
        # Инициализируем промокоды по умолчанию
        init_default_promo_codes(db)
        
        # Создаем реферальные коды для существующих пользователей
        auto_create_referral_codes(db)
        
        print("✅ Default data initialization completed")
    except Exception as e:
        logger.error(f"Error initializing default data: {e}")
    finally:
        db.close()
    
    print("✅ Application startup completed")
    
    yield
    
    # Shutdown
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

from api.websockets import router as websockets_router
from api.balance import router as balance_router
from api.promo import router as promo_router
from api.referral import router as referral_router
from api.support import router as support_router
from api.ai_chat import router as ai_chat_router
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
app.include_router(promo_router)
app.include_router(referral_router)
app.include_router(support_router, prefix="/api")
app.include_router(ai_chat_router, prefix="/api")
app.include_router(websockets_router)



# Настройка обработчиков ошибок
setup_error_handlers(app)

# Add CORS middleware
# 🔐 БЕЗОПАСНОСТЬ: CORS для разрешенных доменов и виджетов
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:8000,https://rusmedical.ru').split(',')

# Если в CORS_ORIGINS есть "*", разрешаем все домены для виджетов
allow_all_origins = "*" in cors_origins
if allow_all_origins:
    cors_origins = ["*"]

print(f"🌐 CORS origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not allow_all_origins,  # Credentials не работают с allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Функции управления ботами перенесены в services/bot_manager.py
from services.bot_manager import (
    reload_assistant_bots,
    hot_reload_assistant_bots,
    reload_specific_bot,
    reload_user_assistant_bots
)

# WebSocket соединения перенесены в services/websocket_manager.py
from services.websocket_manager import (
    dialog_websocket_endpoint,
    site_dialog_websocket_endpoint,
    widget_dialog_websocket_endpoint,
    push_dialog_message,
    push_site_dialog_message
)

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