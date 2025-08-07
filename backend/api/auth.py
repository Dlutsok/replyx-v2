from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import logging
import os

from database import get_db, models, schemas, auth
from validators.rate_limiter import rate_limit_api

# Настройка логгера
logger = logging.getLogger(__name__)

router = APIRouter()

# Yandex OAuth настройки
YANDEX_CLIENT_ID = os.getenv("YANDEX_CLIENT_ID")
YANDEX_CLIENT_SECRET = os.getenv("YANDEX_CLIENT_SECRET") 
YANDEX_REDIRECT_URI = os.getenv("YANDEX_REDIRECT_URI", "http://localhost:3000/oauth-redirect")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def generate_confirmation_code():
    """Генерирует код подтверждения email"""
    import random
    import string
    return ''.join(random.choices(string.digits, k=6))

def send_confirmation_email(email: str, code: str):
    """Отправляет email с кодом подтверждения"""
    # Заглушка для отправки email
    logger.info(f"Sending confirmation email to {email} with code {code}")
    # TODO: Реализовать реальную отправку email

@router.get("/auth/yandex/login")
def yandex_login():
    return RedirectResponse(
        f"https://oauth.yandex.ru/authorize?response_type=code&client_id={YANDEX_CLIENT_ID}&redirect_uri={YANDEX_REDIRECT_URI}&scope=login:info login:email"
    )

@router.get("/auth/yandex/callback")
def yandex_callback(code: str, db: Session = Depends(get_db)):
    # Получаем access_token
    token_resp = requests.post(
        "https://oauth.yandex.ru/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": YANDEX_CLIENT_ID,
            "client_secret": YANDEX_CLIENT_SECRET,
        },
    )
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return JSONResponse({"error": "Отсутствует токен доступа", "details": token_data}, status_code=400)
    
    # Получаем данные пользователя
    user_resp = requests.get(
        "https://login.yandex.ru/info",
        headers={"Authorization": f"OAuth {access_token}"},
    )
    user_data = user_resp.json()
    yandex_id = user_data.get("id")
    email = user_data.get("default_email") or f"yandex_{yandex_id}@noemail.yandex"
    
    if not yandex_id:
        return JSONResponse({"error": "Отсутствует yandex_id в данных пользователя", "details": user_data}, status_code=400)
    
    # 1. Ищем пользователя по yandex_id
    user = db.query(models.User).filter(models.User.yandex_id == yandex_id).first()
    if not user:
        # 2. Если не найден — ищем по email
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            # Привязываем yandex_id к существующему пользователю
            if not user.yandex_id:
                user.yandex_id = yandex_id
                db.commit()
        else:
            # 3. Если не найден и по email — создаём нового пользователя
            user = models.User(
                yandex_id=yandex_id,
                email=email,
                hashed_password="oauth_yandex",
                role="user",
                status="active",
        
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Начисляем приветственный бонус новому пользователю
            from services.balance_service import BalanceService
            balance_service = BalanceService(db)
            welcome_transaction = balance_service.give_welcome_bonus(user.id)
            
            # Отправляем только письмо с кодом подтверждения
            code = generate_confirmation_code()
            user.email_confirmation_code = code
            db.commit()
            send_confirmation_email(user.email, code)
    
    # Генерируем JWT-токен
    jwt_token = auth.create_access_token(data={"sub": str(user.id), "email": user.email})
    
    # Перенаправляем на фронтенд с токеном
    return RedirectResponse(f"{FRONTEND_URL}/oauth-redirect?token={jwt_token}")

@router.post("/register", response_model=schemas.UserRead)
@rate_limit_api(limit=50, window=3600)  # 50 регистраций в час для тестирования
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    from scripts.transaction_manager import db_transaction
    from monitoring.audit_logger import audit_log
    
    # Логируем попытку регистрации
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get('user-agent')
    
    # Валидация email
    if not auth.validate_email_format(user.email):
        raise HTTPException(status_code=400, detail="Некорректный формат email")
    
    # Валидация пароля
    password_validation = auth.validate_password_strength(user.password)
    if not password_validation["valid"]:
        raise HTTPException(status_code=400, detail=password_validation["message"])
    
    # Очистка входных данных
    sanitized_email = auth.sanitize_input(user.email.lower(), 255)
    sanitized_first_name = auth.sanitize_input(user.first_name, 100) if user.first_name else None
    
    with db_transaction(db) as session:
        db_user = session.query(models.User).filter(models.User.email == sanitized_email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        
        hashed_password = auth.get_password_hash(user.password)
        code = generate_confirmation_code()
        db_user = models.User(
            email=sanitized_email, 
            hashed_password=hashed_password, 
            is_email_confirmed=False, 
            email_confirmation_code=code,
            first_name=sanitized_first_name
        )
        session.add(db_user)
        session.flush()  # Получаем ID до коммита
        
        # Начисляем приветственный бонус новому пользователю
        from services.balance_service import BalanceService
        balance_service = BalanceService(session)
        welcome_transaction = balance_service.give_welcome_bonus(db_user.id)
        
        # Отправка email вне транзакции для избежания долгих блокировок
        try:
            send_confirmation_email(db_user.email, code)
        except Exception as e:
            logger.error(f"Ошибка отправки email подтверждения: {e}")
            # Продолжаем регистрацию даже если email не отправлен
        
    db.refresh(db_user)
    
    # Логируем успешную регистрацию
    audit_log(
        operation='user_register',
        user_id=db_user.id,
        status='success',
        details={
            'email': db_user.email,
            'first_name': db_user.first_name
        },
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return db_user

@router.post("/login")
@rate_limit_api(limit=100, window=300)  # 100 попыток логина за 5 минут (увеличено для тестирования)
def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    # Логирование аутентификации (без конфиденциальных данных)
    from monitoring.audit_logger import audit_log
    
    logger.info(f"Login attempt for user: {form_data.username}")
    
    # Получаем IP и User-Agent
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get('user-agent') if request else None
    
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        logger.warning(f"User not found: {form_data.username}")
        # Логируем неудачную попытку
        audit_log(
            operation='user_login',
            user_id=None,
            status='failed',
            details={
                'email': form_data.username,
                'reason': 'user_not_found'
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    logger.debug(f"User found: {user.email}, role: {user.role}")
    
    # Проверяем пользователя и пароль
    password_valid = auth.verify_password(form_data.password, user.hashed_password)
    
    if not password_valid:
        logger.warning(f"Invalid password for user: {form_data.username}")
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    if not user.is_email_confirmed and getattr(user, 'role', None) != 'admin':
        logger.warning(f"Email not confirmed for user: {form_data.username}")
        raise HTTPException(status_code=403, detail="Email не подтверждён. Проверьте почту.")
    
    logger.info(f"Successful login for user: {form_data.username}")
    
    # Логируем успешный вход
    audit_log(
        operation='user_login',
        user_id=user.id,
        status='success',
        details={
            'email': user.email
        },
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    access_token = auth.create_access_token(data={"sub": str(user.id), "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# Схема для смены пароля
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/auth/change-password")
@rate_limit_api(limit=10, window=300)  # 10 попыток смены пароля за 5 минут
def change_password(
    request_data: ChangePasswordRequest,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Изменение пароля пользователя"""
    from monitoring.audit_logger import audit_log
    
    # Получаем IP и User-Agent
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get('user-agent') if request else None
    
    # Проверяем текущий пароль
    if not auth.verify_password(request_data.current_password, current_user.hashed_password):
        logger.warning(f"Неверный текущий пароль для пользователя {current_user.id}")
        # Логируем неудачную попытку
        audit_log(
            operation='password_change',
            user_id=current_user.id,
            status='failed',
            details={
                'email': current_user.email,
                'reason': 'invalid_current_password'
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    # Валидация нового пароля
    password_validation = auth.validate_password_strength(request_data.new_password)
    if not password_validation["valid"]:
        raise HTTPException(status_code=400, detail=password_validation["message"])
    
    # Проверяем, что новый пароль отличается от текущего
    if auth.verify_password(request_data.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Новый пароль должен отличаться от текущего")
    
    try:
        # Хешируем новый пароль
        new_hashed_password = auth.get_password_hash(request_data.new_password)
        
        # Обновляем пароль в базе данных
        current_user.hashed_password = new_hashed_password
        db.commit()
        
        logger.info(f"Пароль успешно изменён для пользователя {current_user.id}")
        
        # Логируем успешную смену пароля
        audit_log(
            operation='password_change',
            user_id=current_user.id,
            status='success',
            details={
                'email': current_user.email
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {"message": "Пароль успешно изменён"}
        
    except Exception as e:
        logger.error(f"Ошибка при смене пароля для пользователя {current_user.id}: {e}")
        db.rollback()
        
        # Логируем ошибку
        audit_log(
            operation='password_change',
            user_id=current_user.id,
            status='error',
            details={
                'email': current_user.email,
                'error': str(e)
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        raise HTTPException(status_code=500, detail="Ошибка при смене пароля")

@router.post("/logout")
@rate_limit_api(limit=20, window=60)  # 20 попыток logout за минуту
def logout(
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Выход пользователя из системы"""
    from monitoring.audit_logger import audit_log
    
    # Получаем IP и User-Agent
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get('user-agent') if request else None
    
    # Логируем выход из системы
    audit_log(
        operation='user_logout',
        user_id=current_user.id,
        status='success',
        details={
            'email': current_user.email
        },
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    logger.info(f"User logout: {current_user.email}")
    
    return {"message": "Успешный выход из системы"}