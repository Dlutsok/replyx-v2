"""
Модуль валидации входных данных для API endpoints
Обеспечивает безопасность и целостность данных
"""

import re
import html
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, validator, Field
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Константы для валидации
MAX_TEXT_LENGTH = 10000
MAX_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 255
MAX_PASSWORD_LENGTH = 128
MIN_PASSWORD_LENGTH = 8
MAX_PLAN_LENGTH = 20
MAX_ASSISTANT_NAME_LENGTH = 100
MAX_SYSTEM_PROMPT_LENGTH = 5000

# Регулярные выражения
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
SAFE_TEXT_REGEX = re.compile(r'^[a-zA-Zа-яА-Я0-9\s\.,!?\-_()]+$')
USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_-]+$')

# Опасные паттерны
DANGEROUS_PATTERNS = [
    r'<script',
    r'javascript:',
    r'onload=',
    r'onerror=',
    r'onclick=',
    r'eval\(',
    r'document\.',
    r'window\.',
    r'alert\(',
    r'confirm\(',
    r'prompt\(',
    r'<iframe',
    r'<object',
    r'<embed',
    r'<link',
    r'<meta',
    r'<style',
    r'expression\(',
    r'url\(',
    r'@import',
    r'behaviour:',
    r'binding:',
    r'-moz-binding',
    r'vbscript:',
    r'data:text/html',
]

class ValidationError(Exception):
    """Ошибка валидации"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(message)

def sanitize_html(text: str) -> str:
    """Очистка HTML и опасных символов"""
    if not text:
        return ""
    
    # Экранируем HTML
    text = html.escape(text)
    
    # Проверяем на опасные паттерны
    text_lower = text.lower()
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            logger.warning(f"Обнаружен опасный паттерн: {pattern}")
            raise ValidationError(f"Недопустимый контент обнаружен", "content")
    
    return text

def validate_email(email: str) -> str:
    """Валидация email адреса"""
    if not email:
        raise ValidationError("Email обязателен", "email")
    
    email = email.strip().lower()
    
    if len(email) > MAX_EMAIL_LENGTH:
        raise ValidationError(f"Email слишком длинный (максимум {MAX_EMAIL_LENGTH} символов)", "email")
    
    if not EMAIL_REGEX.match(email):
        raise ValidationError("Некорректный формат email", "email")
    
    return email

def validate_password(password: str) -> str:
    """Валидация пароля"""
    if not password:
        raise ValidationError("Пароль обязателен", "password")
    
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValidationError(f"Пароль слишком короткий (минимум {MIN_PASSWORD_LENGTH} символов)", "password")
    
    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValidationError(f"Пароль слишком длинный (максимум {MAX_PASSWORD_LENGTH} символов)", "password")
    
    # Проверка на сложность пароля
    if not re.search(r'[A-Za-z]', password):
        raise ValidationError("Пароль должен содержать буквы", "password")
    
    if not re.search(r'\d', password):
        raise ValidationError("Пароль должен содержать цифры", "password")
    
    return password

def validate_text(text: str, max_length: int = MAX_TEXT_LENGTH, field_name: str = "text") -> str:
    """Валидация текстового поля"""
    if not text:
        return ""
    
    # Очистка от лишних пробелов
    text = text.strip()
    
    if len(text) > max_length:
        raise ValidationError(f"Текст слишком длинный (максимум {max_length} символов)", field_name)
    
    # Санитизация HTML
    text = sanitize_html(text)
    
    return text

def validate_name(name: str, field_name: str = "name") -> str:
    """Валидация имени"""
    if not name:
        raise ValidationError(f"{field_name} обязательно", field_name)
    
    name = name.strip()
    
    if len(name) > MAX_NAME_LENGTH:
        raise ValidationError(f"{field_name} слишком длинное (максимум {MAX_NAME_LENGTH} символов)", field_name)
    
    # Проверка на опасные символы
    if not re.match(r'^[a-zA-Zа-яА-Я0-9\s\-_.]+$', name):
        raise ValidationError(f"{field_name} содержит недопустимые символы", field_name)
    
    return sanitize_html(name)

def validate_positive_integer(value: Any, field_name: str = "value") -> int:
    """Валидация положительного целого числа"""
    try:
        value = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} должно быть числом", field_name)
    
    if value <= 0:
        raise ValidationError(f"{field_name} должно быть положительным", field_name)
    
    return value

def validate_assistant_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Валидация данных ассистента"""
    validated_data = {}
    
    # Обязательные поля
    if 'name' not in data:
        raise ValidationError("Имя ассистента обязательно", "name")
    
    validated_data['name'] = validate_name(data['name'], "name")
    
    # Системный промпт
    if 'system_prompt' in data:
        system_prompt = validate_text(data['system_prompt'], MAX_SYSTEM_PROMPT_LENGTH, "system_prompt")
        validated_data['system_prompt'] = system_prompt
    
    # AI модель
    if 'ai_model' in data:
        ai_model = data['ai_model'].strip()
        allowed_models = ['gpt-4o', 'gpt-4o-mini']
        if ai_model and ai_model not in allowed_models:
            raise ValidationError(f"Недопустимая AI модель. Разрешены: {', '.join(allowed_models)}", "ai_model")
        validated_data['ai_model'] = ai_model
    
    # Активность
    if 'is_active' in data:
        validated_data['is_active'] = bool(data['is_active'])
    
    return validated_data

def validate_message_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Валидация данных сообщения"""
    validated_data = {}
    
    # Текст сообщения
    if 'text' not in data:
        raise ValidationError("Текст сообщения обязателен", "text")
    
    text = validate_text(data['text'], MAX_TEXT_LENGTH, "text")
    if not text:
        raise ValidationError("Текст сообщения не может быть пустым", "text")
    
    validated_data['text'] = text
    
    # Отправитель
    if 'sender' in data:
        sender = data['sender'].strip().lower()
        allowed_senders = ['user', 'assistant', 'manager']
        if sender not in allowed_senders:
            raise ValidationError(f"Недопустимый отправитель. Разрешены: {', '.join(allowed_senders)}", "sender")
        validated_data['sender'] = sender
    
    return validated_data

def validate_user_profile_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Валидация данных профиля пользователя"""
    validated_data = {}
    
    # Имя
    if 'first_name' in data:
        first_name = validate_name(data['first_name'], "first_name")
        validated_data['first_name'] = first_name
    
    # Email (только для админов)
    if 'email' in data:
        email = validate_email(data['email'])
        validated_data['email'] = email
    
    return validated_data

def validate_bot_instance_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Валидация данных бот-инстанса"""
    validated_data = {}
    
    # Платформа
    if 'platform' not in data:
        raise ValidationError("Платформа обязательна", "platform")
    
    platform = data['platform'].strip().lower()
    allowed_platforms = ['telegram']
    if platform not in allowed_platforms:
        raise ValidationError(f"Недопустимая платформа. Разрешены: {', '.join(allowed_platforms)}", "platform")
    
    validated_data['platform'] = platform
    
    # ID ассистента
    if 'assistant_id' not in data:
        raise ValidationError("ID ассистента обязателен", "assistant_id")
    
    validated_data['assistant_id'] = validate_positive_integer(data['assistant_id'], "assistant_id")
    
    # Токен бота
    if 'bot_token' not in data:
        raise ValidationError("Токен бота обязателен", "bot_token")
    
    bot_token = data['bot_token'].strip()
    if not bot_token:
        raise ValidationError("Токен бота не может быть пустым", "bot_token")
    
    validated_data['bot_token'] = bot_token
    
    return validated_data

class ValidatedMessageData(BaseModel):
    """Pydantic модель для валидации сообщений"""
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)
    sender: Optional[str] = Field(None, pattern=r'^(user|assistant|manager)$')
    
    @validator('text')
    def validate_text_content(cls, v):
        return validate_text(v)

class ValidatedAssistantData(BaseModel):
    """Pydantic модель для валидации ассистентов"""
    name: str = Field(..., min_length=1, max_length=MAX_ASSISTANT_NAME_LENGTH)
    system_prompt: Optional[str] = Field(None, max_length=MAX_SYSTEM_PROMPT_LENGTH)
    ai_model: Optional[str] = Field(None, pattern=r'^(gpt-4o|gpt-4o-mini)$')
    is_active: Optional[bool] = True
    
    @validator('name')
    def validate_name_content(cls, v):
        return validate_name(v)
    
    @validator('system_prompt')
    def validate_system_prompt_content(cls, v):
        if v:
            return validate_text(v, MAX_SYSTEM_PROMPT_LENGTH, "system_prompt")
        return v

class ValidatedUserProfileData(BaseModel):
    """Pydantic модель для валидации профиля пользователя"""
    first_name: Optional[str] = Field(None, max_length=MAX_NAME_LENGTH)
    email: Optional[str] = Field(None, max_length=MAX_EMAIL_LENGTH)
    
    @validator('first_name')
    def validate_first_name_content(cls, v):
        if v:
            return validate_name(v, "first_name")
        return v
    
    @validator('email')
    def validate_email_content(cls, v):
        if v:
            return validate_email(v)
        return v

def validate_request_data(data: Dict[str, Any], validation_rules: Dict[str, Any]) -> Dict[str, Any]:
    """Общая функция валидации данных запроса"""
    try:
        validated_data = {}
        
        for field, rules in validation_rules.items():
            if field in data:
                value = data[field]
                
                # Проверка обязательности
                if rules.get('required', False) and not value:
                    raise ValidationError(f"Поле {field} обязательно", field)
                
                # Проверка типа
                expected_type = rules.get('type')
                if expected_type and value is not None:
                    if expected_type == 'string':
                        value = str(value).strip()
                    elif expected_type == 'integer':
                        value = validate_positive_integer(value, field)
                    elif expected_type == 'boolean':
                        value = bool(value)
                
                # Проверка длины для строк
                if isinstance(value, str) and 'max_length' in rules:
                    if len(value) > rules['max_length']:
                        raise ValidationError(f"Поле {field} слишком длинное (максимум {rules['max_length']} символов)", field)
                
                # Проверка допустимых значений
                if 'allowed_values' in rules and value not in rules['allowed_values']:
                    raise ValidationError(f"Недопустимое значение для {field}. Разрешены: {', '.join(map(str, rules['allowed_values']))}", field)
                
                # Санитизация текста
                if isinstance(value, str) and rules.get('sanitize', True):
                    value = sanitize_html(value)
                
                validated_data[field] = value
        
        return validated_data
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Ошибка валидации: {e}")
        raise ValidationError("Ошибка валидации данных")

def create_validation_error_response(error: ValidationError) -> HTTPException:
    """Создание HTTP ошибки валидации"""
    return HTTPException(
        status_code=422,
        detail={
            "error": "validation_error",
            "message": error.message,
            "field": error.field
        }
    )