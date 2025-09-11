from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging
import os
from jose import jwt, JWTError

from database import get_db, models, schemas, auth
from validators.rate_limiter import rate_limit_api
from integrations.email_service import email_service
import secrets
from datetime import datetime, timedelta

# Настройка логгера
logger = logging.getLogger(__name__)

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def generate_confirmation_code():
    """Генерирует код подтверждения email"""
    import random
    import string
    return ''.join(random.choices(string.digits, k=6))

def send_confirmation_email(email: str, code: str):
    """Отправляет email с кодом подтверждения"""
    from api.email import send_confirmation_email as send_email
    try:
        send_email(email, code)
        logger.info(f"Confirmation email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send confirmation email to {email}: {e}")
        raise


@router.post("/register", response_model=schemas.UserRead)
@rate_limit_api(limit=50, window=3600)  # 50 регистраций в час для тестирования
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    from database.utils.transaction_manager import db_transaction
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
        
        # Приветственный бонус будет начислен позже через уведомление
        # from services.balance_service import BalanceService
        # balance_service = BalanceService(session)
        # welcome_transaction = balance_service.give_welcome_bonus(db_user.id)
        
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
    
    user = db.query(models.User).filter(models.User.email == form_data.username.lower()).first()
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
    
    # Создаём access и refresh токены
    access_token = auth.create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = auth.create_refresh_token(data={"sub": str(user.id), "email": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

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


@router.post("/auth/forgot-password")
@rate_limit_api(100, 60)  # 100 попыток в минуту (тестовый режим)
def forgot_password(request_data: schemas.PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    """Отправка ссылки для сброса пароля"""
    user = db.query(models.User).filter(models.User.email == request_data.email.lower()).first()
    
    if not user:
        # Возвращаем успешный ответ даже если пользователь не найден (безопасность)
        return {"message": "Если аккаунт с таким email существует, на него будет отправлена ссылка для сброса пароля"}
    
    # Генерируем токен для сброса пароля
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.utcnow() + timedelta(hours=24)
    
    # Обновляем пользователя
    user.password_reset_token = reset_token
    user.password_reset_expires = reset_expires
    db.commit()
    
    # Отправляем email
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    try:
        email_service.send_password_reset_email(user.email, reset_link, user.first_name or "Пользователь")
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Не показываем ошибку пользователю для безопасности
    
    return {"message": "Если аккаунт с таким email существует, на него будет отправлена ссылка для сброса пароля"}


@router.post("/auth/reset-password")
@rate_limit_api(100, 60)  # 100 попыток в минуту (тестовый режим)
def reset_password(request_data: schemas.PasswordResetConfirm, request: Request, db: Session = Depends(get_db)):
    """Сброс пароля по токену"""
    user = db.query(models.User).filter(
        models.User.password_reset_token == request_data.token,
        models.User.password_reset_expires > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Недействительный или истёкший токен")
    
    # Валидация нового пароля
    if len(request_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 6 символов")
    
    # Обновляем пароль
    user.hashed_password = auth.get_password_hash(request_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    logger.info(f"Password reset successful for user: {user.email}")
    
    return {"message": "Пароль успешно изменён"}


@router.post("/auth/validate-reset-token")
@rate_limit_api(100, 60)  # 100 попыток в минуту (тестовый режим)
def validate_reset_token(request: schemas.TokenValidationRequest, db: Session = Depends(get_db)):
    """Проверяет действительность токена сброса пароля"""
    token = request.token
    
    if not token:
        raise HTTPException(status_code=400, detail="Токен не предоставлен")
    
    user = db.query(models.User).filter(
        models.User.password_reset_token == token,
        models.User.password_reset_expires > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Недействительный или истёкший токен")
    
    return {"message": "Токен действителен", "valid": True}

# Схема для refresh token
class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh-token")
@rate_limit_api(limit=50, window=300)  # 50 попыток обновления токена за 5 минут
def refresh_access_token(
    request_data: RefreshTokenRequest,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Обновление access token через refresh token
    Для production-ready WebSocket переподключений
    """
    from monitoring.audit_logger import audit_log
    from core.auth import verify_refresh_token, create_access_token
    
    # Получаем IP и User-Agent
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get('user-agent') if request else None
    
    if not request_data.refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token обязателен")
    
    try:
        # Верифицируем refresh token
        payload = verify_refresh_token(request_data.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Недействительный refresh token")
        
        # Получаем пользователя из БД
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user:
            logger.warning(f"User not found for refresh token: {user_id}")
            audit_log(
                operation='token_refresh',
                user_id=None,
                status='failed', 
                details={
                    'reason': 'user_not_found',
                    'user_id': user_id
                },
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        
        # Проверяем активность аккаунта
        if not user.is_email_confirmed and getattr(user, 'role', None) != 'admin':
            logger.warning(f"Email not confirmed for user: {user.email}")
            audit_log(
                operation='token_refresh',
                user_id=user.id,
                status='failed',
                details={
                    'email': user.email,
                    'reason': 'email_not_confirmed'
                },
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(status_code=403, detail="Email не подтверждён")
        
        # Создаём новый access token
        new_access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # Логируем успешное обновление токена
        audit_log(
            operation='token_refresh',
            user_id=user.id,
            status='success',
            details={
                'email': user.email
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"Access token refreshed for user: {user.email}")
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email
        }
        
    except JWTError as e:
        logger.warning(f"Invalid refresh token: {e}")
        audit_log(
            operation='token_refresh',
            user_id=None,
            status='failed',
            details={
                'reason': 'invalid_token',
                'error': str(e)
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        raise HTTPException(status_code=401, detail="Недействительный refresh token")
    
    except HTTPException:
        # Пробрасываем HTTP исключения как есть
        raise
    
    except Exception as e:
        logger.error(f"Token refresh error: {e}", exc_info=True)
        audit_log(
            operation='token_refresh',
            user_id=None,
            status='error',
            details={
                'error': str(e)
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        raise HTTPException(status_code=500, detail="Ошибка при обновлении токена")

@router.post("/validate-token")
@rate_limit_api(limit=100, window=60)  # 100 проверок токена в минуту
def validate_access_token(
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Валидация access token - для проверки актуальности перед WebSocket подключением
    """
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "role": getattr(current_user, 'role', 'user')
    }