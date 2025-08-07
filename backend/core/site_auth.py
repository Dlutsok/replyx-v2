"""
Авторизация для site пользователей
"""
import jwt
from fastapi import HTTPException, Query, Depends
from sqlalchemy.orm import Session
from database import models, get_db
from core.app_config import SITE_SECRET


def get_current_site_user(site_token: str = Query(...), db: Session = Depends(get_db)):
    """Получает пользователя по site_token из JWT"""
    try:
        # Декодируем без проверки exp (бессрочный токен)
        payload = jwt.decode(site_token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
        if payload.get('type') != 'site':
            raise HTTPException(status_code=401, detail='Invalid site_token')
        
        user = db.query(models.User).filter(models.User.id == payload['user_id']).first()
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        
        # Если в токене есть assistant_id, проверяем что ассистент еще существует
        assistant_id = payload.get('assistant_id')
        if assistant_id:
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == assistant_id,
                models.Assistant.user_id == user.id,
                models.Assistant.is_active == True
            ).first()
            if not assistant:
                raise HTTPException(status_code=401, detail='Assistant not found or inactive')
            # Добавляем assistant_id к пользователю для дальнейшего использования
            user.widget_assistant_id = assistant_id
        
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid site_token')
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid site_token')


def get_current_site_user_simple(site_token: str, db: Session):
    """Простая версия без FastAPI зависимостей для использования в WebSocket"""
    try:
        # Декодируем без проверки exp (бессрочный токен)
        payload = jwt.decode(site_token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
        if payload.get('type') != 'site':
            return None
        
        user = db.query(models.User).filter(models.User.id == payload['user_id']).first()
        if not user:
            return None
        
        # Если в токене есть assistant_id, проверяем что ассистент еще существует
        assistant_id = payload.get('assistant_id')
        if assistant_id:
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == assistant_id,
                models.Assistant.user_id == user.id,
                models.Assistant.is_active == True
            ).first()
            if not assistant:
                return None
            # Добавляем assistant_id к пользователю для дальнейшего использования
            user.widget_assistant_id = assistant_id
        
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None