from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import models, crud
from database.connection import get_db
import os
import secrets
import re

# 🔐 БЕЗОПАСНОСТЬ: SECRET_KEY из переменных окружения
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> dict:
    """
    Валидирует силу пароля и возвращает результат проверки.
    Возвращает: {"valid": bool, "message": str}
    """
    if len(password) < 8:
        return {"valid": False, "message": "Пароль должен содержать минимум 8 символов"}
    
    if len(password) > 128:
        return {"valid": False, "message": "Пароль слишком длинный (максимум 128 символов)"}
    
    if not re.search(r"[a-zA-Z]", password):
        return {"valid": False, "message": "Пароль должен содержать хотя бы одну букву"}
    
    if not re.search(r"[0-9]", password):
        return {"valid": False, "message": "Пароль должен содержать хотя бы одну цифру"}
    
    # Проверка на слабые пароли
    weak_passwords = [
        "password", "12345678", "qwerty123", "admin123", "letmein123", 
        "password123", "123456789", "welcome123"
    ]
    
    if password.lower() in weak_passwords:
        return {"valid": False, "message": "Пароль слишком простой"}
    
    return {"valid": True, "message": "Пароль соответствует требованиям безопасности"}

def validate_email_format(email: str) -> bool:
    """Валидирует формат email адреса"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

def sanitize_input(input_string: str, max_length: int = 255) -> str:
    """Очищает входную строку от потенциально опасных символов"""
    if not input_string:
        return ""
    
    # Ограничиваем длину
    sanitized = input_string[:max_length]
    
    # Удаляем потенциально опасные символы
    sanitized = re.sub(r'[<>"\']', '', sanitized)
    
    # Убираем лишние пробелы
    sanitized = sanitized.strip()
    
    return sanitized

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# get_db импортируется из database.connection

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_identifier = payload.get("sub")
        email = payload.get("email")
        
        if user_identifier is None:
            raise credentials_exception
            
        # Проверяем время истечения токена более строго
        exp = payload.get("exp")
        if exp is None:
            raise credentials_exception
            
        # Проверяем, что токен не истек с учетом часового пояса
        current_time = datetime.now(timezone.utc)
        token_exp_time = datetime.fromtimestamp(exp, timezone.utc)
        
        if current_time > token_exp_time:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Токен истек",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Ошибка валидации токена: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Поиск пользователя с дополнительными проверками
    user = None
    try:
        # Сначала пробуем как ID
        user_id = int(user_identifier)
        user = db.query(models.User).filter(
            models.User.id == user_id,
            models.User.status == "active"  # Проверяем, что пользователь активен
        ).first()
        
        # Дополнительная проверка email если он есть в токене
        if user and email and user.email != email:
            raise credentials_exception
            
    except ValueError:
        # Если не число, то ищем по email
        if email:
            user = db.query(models.User).filter(
                models.User.email == email,
                models.User.status == "active"
            ).first()
    
    if user is None:
        raise credentials_exception
        
    # Проверка на заблокированного пользователя
    if hasattr(user, 'status') and user.status == 'blocked':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )
    
    return user

def get_user_from_token(token: str, db: Session):
    """Получить пользователя по токену без использования Depends (для WebSocket)"""
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_identifier = payload.get("sub")
        email = payload.get("email")
        
        if user_identifier is None:
            return None
            
        # Проверяем время истечения токена
        exp = payload.get("exp")
        if exp is None:
            return None
            
        # Проверяем, что токен не истек
        current_timestamp = datetime.now(timezone.utc).timestamp()
        if current_timestamp > exp:
            return None
            
    except JWTError:
        return None
    
    # Поиск пользователя
    user = None
    try:
        # Сначала пробуем как ID
        user_id = int(user_identifier)
        user = db.query(models.User).filter(
            models.User.id == user_id,
            models.User.status == "active"
        ).first()
        
        # Дополнительная проверка email если он есть в токене
        if user and email and user.email != email:
            return None
            
    except ValueError:
        # Если не число, то ищем по email
        if email:
            user = db.query(models.User).filter(
                models.User.email == email,
                models.User.status == "active"
            ).first()
    
    # Проверка на заблокированного пользователя
    if user and hasattr(user, 'status') and user.status == 'blocked':
        return None
    
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")
    return current_user

def get_effective_user_id(current_user: models.User, db: Session, target_user_id: int = None) -> int:
    """
    Возвращает эффективный user_id для доступа к данным:
    - Если пользователь admin и указан target_user_id - возвращает target_user_id
    - Если пользователь admin без target_user_id - возвращает его ID
    - Если пользователь владелец - возвращает его ID  
    - Если пользователь сотрудник - возвращает ID владельца организации
    """
    # Админы могут работать с данными любого пользователя
    if current_user.role == "admin":
        # Если админ хочет работать с конкретным пользователем
        if target_user_id is not None:
            # Проверяем, что такой пользователь существует
            target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
            if target_user:
                return target_user_id
        # Иначе работает со своими данными
        return current_user.id
    
    # Пользователь работает со своими данными
    return current_user.id

def check_employee_access(current_user: models.User, target_user_id: int, db: Session) -> bool:
    """
    Проверяет, имеет ли пользователь доступ к данным target_user_id:
    - Админы имеют доступ ко всему
    - Пользователи имеют доступ к своим данным
    """
    # Админы имеют доступ ко всему
    if current_user.role == "admin":
        return True
    
    # Если это собственные данные пользователя
    if current_user.id == target_user_id:
        return True
    
    return False

def is_organization_owner(current_user: models.User, db: Session) -> bool:
    """
    Проверяет, является ли пользователь владельцем организации:
    - Админы считаются владельцами
    - Обычные пользователи - владельцы
    """
    # Админы всегда владельцы
    if current_user.role == "admin":
        return True
    
    # Все пользователи являются владельцами
    return True

def get_organization_owner_user(current_user: models.User, db: Session) -> models.User:
    """
    Возвращает пользователя-владельца организации:
    - Для владельцев - их самих
    - Для сотрудников - их владельца
    """
    effective_user_id = get_effective_user_id(current_user, db)
    if effective_user_id == current_user.id:
        return current_user
    else:
        return db.query(models.User).filter(models.User.id == effective_user_id).first()