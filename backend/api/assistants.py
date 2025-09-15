from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from typing import List as TypingList, Optional
from datetime import datetime, timedelta
import json
import os
import logging
import jwt

from database import SessionLocal, models, schemas, crud, auth
from database.connection import get_db
from fastapi import BackgroundTasks
from pydantic import BaseModel
from validators.file_validator import FileValidator
from ai.ai_token_manager import ai_token_manager

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# Helper functions to avoid circular imports
def invalidate_assistant_cache(assistant_id: int):
    """Wrapper для инвалидации кэша ассистента"""
    try:
        from cache.redis_cache import chatai_cache
        chatai_cache.invalidate_assistant_cache(assistant_id)
    except ImportError:
        pass

def hot_reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import hot_reload_assistant_bots as _hot_reload
        return _hot_reload(assistant_id, db)
    except ImportError:
        pass

def reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import reload_assistant_bots as _reload
        return _reload(assistant_id, db)
    except ImportError:
        pass

# --- Assistant CRUD ---

@router.get("/assistants/{assistant_id}", response_model=schemas.AssistantRead)
def get_assistant(assistant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Получить конкретного ассистента по ID
    """
    effective_user_id = auth.get_effective_user_id(current_user, db)
    assistant = crud.get_assistant(db, assistant_id)
    
    if not assistant or assistant.user_id != effective_user_id:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    return assistant

@router.get("/assistants", response_model=TypingList[schemas.AssistantRead])
def get_my_assistants(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Optimized assistants endpoint - uses eager loading to avoid N+1 queries
    """
    effective_user_id = auth.get_effective_user_id(current_user, db)
    logger.debug(f"[API] Fetching assistants for user {effective_user_id} (effective from {current_user.id})")
    
    # Using optimized CRUD function that includes eager loading
    assistants = crud.get_assistants(db, effective_user_id)
    
    logger.debug(f"[API] Retrieved {len(assistants)} assistants with optimized query")
    return assistants

@router.post("/assistants", response_model=schemas.AssistantRead)
def create_my_assistant(data: schemas.AssistantCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    assistant = crud.create_assistant(db, current_user.id, data)
    
    # Перезагружаем только боты нового ассистента (если есть)
    reload_assistant_bots(assistant.id, db)
    
    return assistant

@router.patch("/assistants/{assistant_id}")
def update_my_assistant(assistant_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from validators.input_validator import validate_assistant_data, ValidationError, create_validation_error_response
    
    try:
        print(f"[UPDATE_ASSISTANT] Получены данные: {data}")
        print(f"[UPDATE_ASSISTANT] Пользователь: {current_user.id}")
        print(f"[UPDATE_ASSISTANT] Assistant ID: {assistant_id}")
        
        # Валидация входных данных
        try:
            # Для обновления name не обязательно
            temp_data = data.copy()
            if 'name' not in temp_data:
                temp_data['name'] = 'temp'  # временное значение для валидации
            validated_data = validate_assistant_data(temp_data)
            if 'name' not in data and 'name' in validated_data:
                del validated_data['name']  # удаляем временное значение
        except ValidationError as e:
            # Если прилетел невалидный name — пропустим только name, остальные поля сохраним
            if getattr(e, 'field', None) == 'name':
                safe_data = data.copy()
                safe_data.pop('name', None)
                safe_tmp = safe_data.copy()
                safe_tmp['name'] = 'temp'
                validated_data = validate_assistant_data(safe_tmp)
                if 'name' in validated_data:
                    del validated_data['name']
                logger.warning(f"[UPDATE_ASSISTANT] Игнорируем невалидное имя: {e}")
            else:
                raise create_validation_error_response(e)
        
        # Проверяем что ассистент принадлежит пользователю
        assistant = crud.get_assistant(db, assistant_id)
        if not assistant:
            print(f"[UPDATE_ASSISTANT] Ассистент {assistant_id} не найден")
            raise HTTPException(status_code=404, detail="Assistant not found")
        if assistant.user_id != current_user.id:
            print(f"[UPDATE_ASSISTANT] Ассистент {assistant_id} принадлежит пользователю {assistant.user_id}, а не {current_user.id}")
            raise HTTPException(status_code=404, detail="Assistant not found")
        
        print(f"[UPDATE_ASSISTANT] Ассистент найден: {assistant.name}")
        
        # Создаем объект AssistantUpdate только с переданными полями
        filtered_data = {k: v for k, v in validated_data.items() if k in ['name', 'ai_model', 'system_prompt', 'is_active']}
        
        # Добавляем allowed_domains если он был передан напрямую в data (обходим валидацию)
        if 'allowed_domains' in data:
            filtered_data['allowed_domains'] = data['allowed_domains']
            
        # Безопасно добавляем поля персонализации виджета
        widget_fields = ['operator_name', 'business_name', 'avatar_url', 'widget_theme', 'widget_settings']
        for field in widget_fields:
            if field in data:
                filtered_data[field] = data[field]
        print(f"[UPDATE_ASSISTANT] Отфильтрованные данные: {filtered_data}")
        
        # Обновляем ассистента напрямую, без создания схемы
        for field, value in filtered_data.items():
            if hasattr(assistant, field):
                setattr(assistant, field, value)
                print(f"[UPDATE_ASSISTANT] Обновлено поле {field}: {value}")
        
        assistant.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(assistant)
        updated_assistant = assistant
        print(f"[UPDATE_ASSISTANT] Ассистент обновлен: {updated_assistant.name}")
        
        # 🔥 Инвалидируем кэш ассистента
        invalidate_assistant_cache(assistant_id)
        print(f"[UPDATE_ASSISTANT] Кэш ассистента {assistant_id} инвалидирован")
        
        # 🔥 Бамп версии знаний, чтобы кэш ответов перестал совпадать при смене system_prompt/ai_model
        try:
            from services.embeddings_service import embeddings_service
            embeddings_service.increment_knowledge_version(assistant_id, db)
        except Exception as _e:
            logger.warning(f"[UPDATE_ASSISTANT] Failed to bump knowledge version: {_e}")

        # 🔥 ГОРЯЧАЯ перезагрузка настроек вместо полного перезапуска
        hot_reload_assistant_bots(assistant_id, db)
        
        return {
            "id": updated_assistant.id,
            "name": updated_assistant.name,
            "ai_model": updated_assistant.ai_model,
            "system_prompt": updated_assistant.system_prompt,
            "is_active": updated_assistant.is_active,
            "website_integration_enabled": updated_assistant.website_integration_enabled,
            "allowed_domains": updated_assistant.allowed_domains,
            "user_id": updated_assistant.user_id,
            # Добавляем поля персонализации виджета
            "operator_name": getattr(updated_assistant, 'operator_name', 'Поддержка'),
            "business_name": getattr(updated_assistant, 'business_name', 'Наша компания'),
            "avatar_url": getattr(updated_assistant, 'avatar_url', None),
            "widget_theme": getattr(updated_assistant, 'widget_theme', 'blue'),
            "widget_settings": getattr(updated_assistant, 'widget_settings', {}),
            "created_at": updated_assistant.created_at.isoformat() if updated_assistant.created_at else None,
            "updated_at": updated_assistant.updated_at.isoformat() if updated_assistant.updated_at else None
        }
    except Exception as e:
        print(f"[UPDATE_ASSISTANT] Ошибка: {e}")
        import traceback
        print(f"[UPDATE_ASSISTANT] Traceback: {traceback.format_exc()}")
        raise

@router.delete("/assistants/{assistant_id}")
def delete_my_assistant(assistant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Проверяем, что пользователь является владельцем организации
    if not auth.is_organization_owner(current_user, db):
        raise HTTPException(
            status_code=403, 
            detail="Только владельцы организации могут удалять ассистентов"
        )
    
    effective_user_id = auth.get_effective_user_id(current_user, db)
    assistant = crud.get_assistant(db, assistant_id)
    if not assistant or assistant.user_id != effective_user_id:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Найти id всех бот-инстансов связанные с этим ассистентом (без загрузки колонок)
    bot_ids = [row[0] for row in db.query(models.BotInstance.id).filter(
        models.BotInstance.assistant_id == assistant_id,
        models.BotInstance.user_id == current_user.id
    ).all()]

    # Остановить боты через мульти-бот менеджер одним запросом
    if bot_ids:
        try:
            import requests
            response = requests.post(
                "http://127.0.0.1:3001/stop-bots",
                json={"bot_ids": bot_ids},
                timeout=5
            )
            print(f"[DELETE_ASSISTANT] Остановлены боты {bot_ids}: {response.status_code}")
        except Exception as e:
            print(f"[DELETE_ASSISTANT] Ошибка остановки ботов {bot_ids}: {e}")

    # Перед удалением ассистента удаляем физические файлы его документов
    try:
        from utils.bot_cleanup import delete_assistant_files
        deleted_files = delete_assistant_files(current_user.id, assistant_id, db)
        print(f"[DELETE_ASSISTANT] Удалено файлов: {deleted_files}")
    except Exception as e:
        print(f"[DELETE_ASSISTANT] Ошибка удаления файлов ассистента: {e}")

    # Удалить ассистента и связанные сущности (bulk), избегая ленивых загрузок больших полей
    crud.delete_assistant(db, assistant_id)

    print(f"[DELETE_ASSISTANT] Ассистент {assistant_id} и {len(bot_ids)} связанных ботов удалены")
    
    return {"ok": True}

# --- Assistant Settings ---

@router.get("/assistants/{assistant_id}/settings")
def get_assistant_settings(assistant_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить настройки конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    return {
        "id": assistant.id,
        "name": assistant.name,
        "ai_model": assistant.ai_model,
        "system_prompt": assistant.system_prompt,
        "is_active": assistant.is_active,
        "website_integration_enabled": assistant.website_integration_enabled
    }

@router.get("/assistants/{assistant_id}/embed-code")
def get_assistant_embed_code(
    assistant_id: int, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Получить embed код для конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Проверяем, что домены указаны для виджета
    if not assistant.allowed_domains or assistant.allowed_domains.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="Для виджета необходимо указать разрешенные домены. Настройте их в панели управления ассистентом."
        )
    
    from core.app_config import SITE_SECRET, is_development
    from datetime import datetime
    import time
    
    # Используем переменные окружения для URL
    from core.app_config import FRONTEND_URL
    
    # Нормализация доменов и стабильный хеш
    import hashlib
    raw_domains = assistant.allowed_domains or ""
    normalized_domains = [
        d.strip().lower().replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
        for d in raw_domains.split(',') if d.strip()
    ]
    # Убираем пустые, дубли и сортируем для стабильности
    normalized_domains = sorted(list(set([d for d in normalized_domains if d])))
    
    # В режиме разработки добавляем localhost домены для консистентности с валидацией
    if is_development:
        localhost_domains = ['localhost:3000', 'localhost:3001', '127.0.0.1:3000', '127.0.0.1:3001']
        normalized_domains.extend(localhost_domains)
        normalized_domains = sorted(list(set(normalized_domains)))
    
    normalized_domains_str = ",".join(normalized_domains)
    
    domains_hash = hashlib.sha256(normalized_domains_str.encode('utf-8')).hexdigest()
    
    payload = {
        'user_id': current_user.id,
        'assistant_id': assistant_id,
        'type': 'site',
        'allowed_domains': normalized_domains_str,
        'domains_hash': domains_hash,  # Стабильный sha256 от нормализованных доменов
        'issued_at': int(time.time()),  # Время выдачи токена (без exp, бессрочный)
        'widget_version': getattr(assistant, 'widget_version', 1)
    }
    site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
    
    # Генерируем embed код в формате script tag с версионированием
    # Используем тему из настроек ассистента или fallback к blue
    widget_theme = getattr(assistant, 'widget_theme', None) or 'blue'
    
    # Если кастомный цвет (HEX), передаем его в URL с URL-кодированием
    if widget_theme and widget_theme.startswith('#'):
        from urllib.parse import quote
        theme_param = f"theme={quote(widget_theme)}"
    else:
        theme_param = f"theme={widget_theme}"
    
    embed_code = f'<script src="{FRONTEND_URL}/widget.js?token={site_token}&assistant_id={assistant_id}&{theme_param}&type=floating&host={FRONTEND_URL}&v={domains_hash}" async></script>'
    return {
        "embed_code": embed_code,
        "token": site_token,
        "assistant_id": assistant_id,
        "assistant_name": assistant.name,
        "allowed_domains": normalized_domains_str
    }

@router.post("/validate-widget-token")
def validate_widget_token(token_data: dict, db: Session = Depends(get_db)):
    """Валидация токена виджета на актуальность доменов"""
    try:
        token = token_data.get('token')
        current_domain = (token_data.get('domain') or '').strip().lower().replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
        
        logger.info(f"🔍 [WIDGET TOKEN] Проверяем токен для домена: {current_domain}")
        
        if not token:
            return {"valid": False, "reason": "No token provided"}
            
        from core.app_config import SITE_SECRET, is_development
        
        # Декодируем токен
        try:
            # Бессрочный токен: отключаем проверку exp
            payload = jwt.decode(token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
        except jwt.InvalidTokenError as e:
            # В development режиме для localhost тестирования пропускаем ошибки токена
            if is_development and ('localhost' in str(e) or 'Signature verification failed' in str(e)):
                logger.warning(f"🚧 DEV MODE: Пропускаем ошибку токена для тестирования: {e}")
                # Создаем минимальный payload для тестирования
                payload = {
                    'assistant_id': 3,  # Дефолтный assistant для тестирования
                    'user_id': 6,
                    'allowed_domains': 'stencom.ru',
                    'domains_hash': 'test',
                    'widget_version': 1
                }
            else:
                return {"valid": False, "reason": f"Invalid token: {str(e)}"}
            
        assistant_id = payload.get('assistant_id')
        if not assistant_id:
            return {"valid": False, "reason": "No assistant_id in token"}
            
        # Получаем текущие настройки ассистента из БД
        assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
        if not assistant:
            return {"valid": False, "reason": "Assistant not found"}
        
        # Проверяем активность ассистента
        if not getattr(assistant, 'is_active', True):
            return {"valid": False, "reason": "Assistant disabled"}
            
        # Проверяем актуальность доменов и domains_hash (стабильный sha256 от нормализованного списка)
        raw_current = assistant.allowed_domains or ""
        current_domains_list = [
            d.strip().lower().replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
            for d in raw_current.split(',') if d.strip()
        ]
        
        # В режиме разработки добавляем localhost домены для тестирования
        if is_development:
            localhost_domains = ['localhost:3000', 'localhost:3001', '127.0.0.1:3000', '127.0.0.1:3001']
            current_domains_list.extend(localhost_domains)
        
        current_domains_list = sorted(list(set([d for d in current_domains_list if d])))
        current_domains_str = ",".join(current_domains_list)
        
        token_domains = payload.get('allowed_domains', "")
        token_domains_hash = payload.get('domains_hash')
        token_widget_version = int(payload.get('widget_version') or 1)
        
        import hashlib
        current_hash = hashlib.sha256(current_domains_str.encode('utf-8')).hexdigest()
        
        # В режиме разработки разрешаем localhost домены даже если хэш не совпадает
        if is_development and current_domain and any(
            current_domain.startswith(local) for local in ['localhost:', '127.0.0.1:']
        ):
            # Для localhost в dev режиме пропускаем проверку хэша доменов
            logger.info(f"🚧 [DEV] Пропускаем проверку хэша доменов для localhost: {current_domain}")
        elif token_domains_hash != current_hash:
            logger.warning(f"❌ [DOMAIN CHECK] Хэш доменов не совпадает. Token: {token_domains_hash[:8]}..., Current: {current_hash[:8]}..., Domain: {current_domain}")
            return {"valid": False, "reason": "domains changed", "allowed_domains": current_domains_str}

        # Проверяем версию виджета (точечный отзыв)
        current_widget_version = int(getattr(assistant, 'widget_version', 1) or 1)
        if token_widget_version != current_widget_version:
            return {"valid": False, "reason": "version changed", "allowed_domains": current_domains_str}
            
        # Проверяем, что текущий домен разрешен
        if not current_domains_str.strip():
            return {"valid": False, "reason": "No domains configured"}
            
        allowed_domains = current_domains_list
        
        domain_allowed = True
        if current_domain:
            domain_allowed = any(current_domain == allowed or current_domain.endswith('.' + allowed) 
                               for allowed in allowed_domains)
        
        if not domain_allowed:
            return {"valid": False, "reason": "Domain not allowed", "allowed_domains": allowed_domains}
            
        # Можно дополнительно вернуть user_id владельца, если нужно для фронта
        return {"valid": True, "assistant_id": assistant_id, "allowed_domains": current_domains_str, "user_id": assistant.user_id}
    except Exception as e:
        return {"valid": False, "reason": f"Validation error: {str(e)}"}

@router.post("/widgets")
def create_widget_token(data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Выдать embed-код + свежий JWT для ассистента (виджета)."""
    assistant_id = data.get('assistant_id')
    if not assistant_id:
        raise HTTPException(status_code=400, detail="assistant_id required")

    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    if not assistant.allowed_domains or assistant.allowed_domains.strip() == "":
        raise HTTPException(status_code=400, detail="Для виджета необходимо указать разрешенные домены")

    from core.app_config import SITE_SECRET, is_development
    from core.app_config import FRONTEND_URL
    import hashlib, time

    raw_domains = assistant.allowed_domains or ""
    normalized_domains = [
        d.strip().lower().replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')
        for d in raw_domains.split(',') if d.strip()
    ]
    normalized_domains = sorted(list(set([d for d in normalized_domains if d])))
    
    # В режиме разработки добавляем localhost домены для консистентности с валидацией
    if is_development:
        localhost_domains = ['localhost:3000', 'localhost:3001', '127.0.0.1:3000', '127.0.0.1:3001']
        normalized_domains.extend(localhost_domains)
        normalized_domains = sorted(list(set(normalized_domains)))
    
    normalized_domains_str = ",".join(normalized_domains)
    domains_hash = hashlib.sha256(normalized_domains_str.encode('utf-8')).hexdigest()

    payload = {
        'user_id': current_user.id,
        'assistant_id': assistant.id,
        'type': 'site',
        'allowed_domains': normalized_domains_str,
        'domains_hash': domains_hash,
        'issued_at': int(time.time()),
        'widget_version': getattr(assistant, 'widget_version', 1)
    }
    site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')

    widget_theme = getattr(assistant, 'widget_theme', None) or 'blue'
    if widget_theme and widget_theme.startswith('#'):
        from urllib.parse import quote
        theme_param = f"theme={quote(widget_theme)}"
    else:
        theme_param = f"theme={widget_theme}"

    embed_code = f'<script src="{FRONTEND_URL}/widget.js?token={site_token}&assistant_id={assistant.id}&{theme_param}&type=floating&host={FRONTEND_URL}&v={domains_hash}" async></script>'
    return {
        "widget_id": assistant.id,
        "site_token": site_token,
        "embed_code": embed_code,
        "allowed_domains": normalized_domains_str
    }


@router.post("/widget-config")
def get_widget_config_by_token(token_data: dict, db: Session = Depends(get_db)):
    """Получить настройки виджета по токену для виджета"""
    try:
        print(f"[WIDGET_CONFIG] 📥 Запрос конфигурации виджета: {token_data}")
        
        token = token_data.get('token')
        
        if not token:
            print("[WIDGET_CONFIG] ❌ Токен не предоставлен")
            return {"success": False, "reason": "No token provided"}
            
        from core.app_config import SITE_SECRET
        
        # Декодируем токен
        try:
            # Бессрочный токен: отключаем проверку exp
            payload = jwt.decode(token, SITE_SECRET, algorithms=['HS256'], options={"verify_exp": False})
            print(f"[WIDGET_CONFIG] 🔓 Токен декодирован: assistant_id={payload.get('assistant_id')}")
        except jwt.InvalidTokenError as e:
            print(f"[WIDGET_CONFIG] ❌ Неверный токен: {e}")
            return {"success": False, "reason": f"Invalid token: {str(e)}"}
            
        assistant_id = payload.get('assistant_id')
        if not assistant_id:
            print("[WIDGET_CONFIG] ❌ В токене отсутствует assistant_id")
            return {"success": False, "reason": "No assistant_id in token"}
            
        # Получаем настройки ассистента из БД
        assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
        if not assistant:
            print(f"[WIDGET_CONFIG] ❌ Ассистент с ID {assistant_id} не найден")
            return {"success": False, "reason": "Assistant not found"}
            
        print(f"[WIDGET_CONFIG] 📋 Ассистент найден: {assistant.name}")
        print(f"[WIDGET_CONFIG] 👤 Оператор: {getattr(assistant, 'operator_name', 'НЕ ЗАДАНО')}")
        print(f"[WIDGET_CONFIG] 🏢 Компания: {getattr(assistant, 'business_name', 'НЕ ЗАДАНО')}")
        print(f"[WIDGET_CONFIG] 🎨 Тема: {getattr(assistant, 'widget_theme', 'НЕ ЗАДАНО')}")
        print(f"[WIDGET_CONFIG] 🖼️ Аватар: {getattr(assistant, 'avatar_url', 'НЕ ЗАДАНО')}")
        print(f"[WIDGET_CONFIG] ⚙️ Настройки: {getattr(assistant, 'widget_settings', {})}")
            
        # Возвращаем настройки виджета с fallback значениями
        config = {
            "success": True,
            "config": {
                "operator_name": getattr(assistant, 'operator_name', None) or 'Поддержка',
                "business_name": getattr(assistant, 'business_name', None) or 'Наша компания',
                "avatar_url": getattr(assistant, 'avatar_url', None),
                "widget_theme": getattr(assistant, 'widget_theme', None) or 'blue',
                "widget_settings": getattr(assistant, 'widget_settings', {}) or {},
                "assistant_id": assistant_id
            }
        }
        
        print(f"[WIDGET_CONFIG] ✅ Конфигурация возвращена: {config['config']}")
        return config
        
    except Exception as e:
        print(f"[WIDGET_CONFIG] 💥 Ошибка получения конфигурации: {e}")
        import traceback
        print(f"[WIDGET_CONFIG] Traceback: {traceback.format_exc()}")
        return {"success": False, "reason": f"Config error: {str(e)}"}

@router.post("/assistants/{assistant_id}/widget-settings")
def save_assistant_widget_settings(
    assistant_id: int,
    settings: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить настройки виджета для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # Сохраняем настройки виджета в базу данных
        if 'operator_name' in settings:
            assistant.operator_name = settings['operator_name']
        if 'business_name' in settings:
            assistant.business_name = settings['business_name']
        if 'avatar_url' in settings:
            assistant.avatar_url = settings['avatar_url']
        if 'widget_theme' in settings:
            assistant.widget_theme = settings['widget_theme']
        if 'allowed_domains' in settings:
            assistant.allowed_domains = settings['allowed_domains']
        
        # Дополнительные настройки виджета (позиция, размер кнопки и т.д.)
        widget_settings = settings.get('widget_settings', {})
        if widget_settings or 'widget_settings' in settings:
            # Объединяем существующие и новые настройки
            current_settings = assistant.widget_settings or {}
            current_settings.update(widget_settings)
            assistant.widget_settings = current_settings
        
        # Обновляем время изменения
        assistant.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(assistant)
        
        print(f"[WIDGET_SETTINGS] Настройки виджета сохранены для ассистента {assistant_id}: {settings}")
        
        # Инвалидируем кэш ассистента
        invalidate_assistant_cache(assistant_id)
        
        return {
            "success": True,
            "message": "Настройки виджета успешно сохранены",
            "settings": {
                "operator_name": assistant.operator_name,
                "business_name": assistant.business_name,
                "avatar_url": assistant.avatar_url,
                "widget_theme": assistant.widget_theme,
                "allowed_domains": assistant.allowed_domains,
                "widget_settings": assistant.widget_settings
            }
        }
    except Exception as e:
        print(f"[WIDGET_SETTINGS] Ошибка сохранения настроек виджета: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения настроек: {str(e)}")

@router.post("/upload/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Загрузка аватара для виджета в S3"""
    from services.s3_storage_service import get_s3_service
    import os
    from pathlib import Path
    
    # Получаем S3 сервис
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(
            status_code=503,
            detail="Файловое хранилище временно недоступно"
        )
    
    try:
        # Читаем содержимое файла
        content = await file.read()
        await file.seek(0)  # Возвращаем указатель в начало
        
        # Проверяем что это изображение
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением")
        
        # Проверяем размер файла (максимум 5MB)
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Размер файла не должен превышать 5MB")
        
        # Разрешенные типы изображений
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Поддерживаются только JPEG, PNG и WebP изображения")
        
        # Генерируем безопасное имя файла для аватара
        secure_filename = s3_service.generate_widget_icon_filename(
            user_id=current_user.id,
            original_filename=file.filename,
            content=content
        )
        
        # Загружаем в S3 в папку avatars
        object_key = s3_service.get_user_object_key(
            current_user.id,
            secure_filename,
            "avatars"
        )
        
        # Добавляем метаданные (используем дефисы вместо подчеркиваний для Timeweb Cloud)
        metadata = {
            'user-id': str(current_user.id),
            'original-filename': file.filename,
            'file-type': 'avatar'
        }
        
        upload_result = s3_service.upload_file(
            file_content=content,
            object_key=object_key,
            content_type=file.content_type,
            metadata=metadata
        )
        
        if not upload_result.get('success'):
            raise Exception(f"S3 upload failed: {upload_result.get('error')}")
        
        logger.info(f"Avatar uploaded successfully: {object_key} by user {current_user.id}")
        
        # Возвращаем URL через наш proxy endpoint вместо прямой ссылки на S3
        proxy_url = f"/api/files/avatars/{current_user.id}/{secure_filename}"
        
        return {
            "success": True,
            "url": proxy_url,
            "s3_url": upload_result.get('url'),  # Оригинальный S3 URL для отладки
            "message": "Аватар успешно загружен",
            "filename": secure_filename,
            "object_key": object_key
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar upload error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка загрузки аватара")

@router.post("/assistants/{assistant_id}/website-integration")
def toggle_website_integration(
    assistant_id: int,
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Включить/выключить интеграцию с сайтом для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    enabled = data.get('enabled', False)
    assistant.website_integration_enabled = enabled
    db.commit()
    
    return {
        "success": True,
        "message": f"Интеграция с сайтом {'включена' if enabled else 'выключена'}",
        "website_integration_enabled": enabled
    }

@router.get("/assistants/{assistant_id}/widget-settings")
def get_assistant_widget_settings(
    assistant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получить настройки виджета для ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Возвращаем дефолтные настройки
    default_settings = {
        "theme": "blue",
        "position": "bottom-right",
        "welcomeMessage": "Привет! Чем могу помочь?",
        "buttonText": "Поддержка",
        "showAvatar": True,
        "showOnlineStatus": True,
        "buttonSize": 80,
        "borderRadius": 16
    }
    
    return {
        "settings": default_settings,
        "assistant_id": assistant_id
    }




@router.post("/assistants/{assistant_id}/validate-knowledge")
def validate_assistant_knowledge(
    assistant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Валидирует и очищает знания ассистента от fallback данных"""
    from utils.knowledge_validator import create_knowledge_validator
    
    # Проверяем права доступа
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Создаем валидатор и очищаем ассистента
    validator = create_knowledge_validator(db)
    
    # Получаем состояние до очистки
    validation_before = validator.validate_assistant_knowledge(assistant_id, current_user.id)
    
    # Выполняем очистку
    is_clean = validator.ensure_clean_assistant(assistant_id, current_user.id)
    
    # Получаем состояние после очистки
    validation_after = validator.validate_assistant_knowledge(assistant_id, current_user.id)
    
    # Принудительная очистка кэшей
    try:
        from utils.bot_cleanup import full_bot_cleanup
        full_bot_cleanup(current_user.id, assistant_id, db)
    except Exception as e:
        logger.warning(f"Ошибка полной очистки: {e}")
    
    return {
        "assistant_id": assistant_id,
        "is_clean": is_clean,
        "validation_before": validation_before,
        "validation_after": validation_after,
        "changes": {
            "knowledge_removed": validation_before['knowledge_count'] - validation_after['knowledge_count'],
            "fallback_sources_removed": validation_before['has_fallback_sources'] and not validation_after['has_fallback_sources']
        }
    }


@router.get("/assistants/{assistant_id}/knowledge")
def get_assistant_knowledge(assistant_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Получить знания конкретного ассистента"""
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Получаем ТОЛЬКО знания, привязанные к этому ассистенту
    # НЕ используем fallback к общим знаниям - каждый ассистент должен быть уникальным
    knowledge_with_docs = db.query(
        models.UserKnowledge,
        models.Document
    ).join(
        models.Document, 
        models.UserKnowledge.doc_id == models.Document.id
    ).filter(
        models.UserKnowledge.user_id == current_user.id,
        models.UserKnowledge.assistant_id == assistant_id  # ТОЛЬКО этого ассистента
    ).all()
    
    # Формируем документы только из знаний этого ассистента
    documents = []
    for entry, doc in knowledge_with_docs:
        doc_type = entry.doc_type or "Документ"
        
        if doc.filename.startswith('quick_fix_'):
            documents.append(entry.content)
        else:
            prefix = f"Информация из документа типа '{doc_type}':\n"
            documents.append(prefix + entry.content)
    
    return {
        "assistant_id": assistant_id,
        "system_prompt": assistant.system_prompt,
        "documents": documents  # Будет пустой список для нового ассистента
    }

# --- Assistant Documents ---

@router.get("/assistants/{assistant_id}/documents", response_model=TypingList[schemas.DocumentRead])
def list_assistant_documents(
    assistant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Optimized assistant documents endpoint - uses single query with joins to avoid N+1
    """
    logger.debug(f"[API] Fetching documents for assistant {assistant_id}")
    
    # First verify assistant ownership
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    # Optimized single query with joins and eager loading
    documents = db.query(models.Document)\
        .options(
            joinedload(models.Document.user),
            selectinload(models.Document.knowledge)
        )\
        .join(models.UserKnowledge, models.Document.id == models.UserKnowledge.doc_id)\
        .filter(
            models.Document.user_id == current_user.id,
            models.UserKnowledge.assistant_id == assistant_id
        )\
        .distinct()\
        .order_by(models.Document.upload_date.desc())\
        .all()

    logger.debug(f"[API] Retrieved {len(documents)} documents for assistant {assistant_id} with optimized query")
    return documents

@router.get("/assistants/{assistant_id}/dialogs")
def list_assistant_dialogs(
    assistant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Optimized assistant dialogs endpoint - uses single query with aggregations to avoid N+1
    """
    logger.debug(f"[API] Fetching dialogs for assistant {assistant_id}")
    
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == current_user.id
    ).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    # Optimized single query with aggregations and eager loading
    dialogs_query = db.query(
        models.Dialog,
        func.count(models.DialogMessage.id).label('message_count'),
        func.max(models.DialogMessage.timestamp).label('last_message_at')
    )\
    .options(
        joinedload(models.Dialog.user),
        joinedload(models.Dialog.assistant)
    )\
    .outerjoin(models.DialogMessage)\
    .filter(
        models.Dialog.user_id == current_user.id,
        models.Dialog.assistant_id == assistant_id
    )\
    .group_by(models.Dialog.id)\
    .order_by(models.Dialog.started_at.desc())\
    .all()

    dialogs_data = []
    for dialog, message_count, last_message_at in dialogs_query:
        # Генерируем название диалога
        if dialog.first_name:
            title = f"Диалог с {dialog.first_name}"
            if dialog.last_name:
                title += f" {dialog.last_name}"
        elif dialog.telegram_username:
            title = f"Диалог с @{dialog.telegram_username}"
        else:
            title = f"Диалог {dialog.id}"
        
        # Определяем статус
        status = "completed" if dialog.ended_at else "active"
        
        dialogs_data.append({
            "id": dialog.id,
            "title": title,
            "status": status,
            "started_at": dialog.started_at.isoformat() if dialog.started_at else None,
            "last_message_at": last_message_at.isoformat() if last_message_at else None,
            "message_count": message_count or 0
        })
    
    return dialogs_data

@router.post("/assistants/{assistant_id}/documents", response_model=schemas.DocumentRead)
async def upload_assistant_document(
    assistant_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Загрузить документ и проиндексировать его ТОЛЬКО под указанного ассистента"""
    from .documents import upload_document
    # Переиспользуем существующий обработчик с передачей assistant_id
    return await upload_document(file=file, assistant_id=assistant_id, current_user=current_user, db=db)



# --- User Assistant Lookup (for bots) ---

@router.get("/user-telegram-assistant/{user_id}")
def get_user_telegram_assistant(user_id: int, db: Session = Depends(get_db)):
    """Получить ассистента привязанного к Telegram боту пользователя"""
    bot_instance = db.query(models.BotInstance).filter(
        models.BotInstance.user_id == user_id,
        models.BotInstance.platform == 'telegram',
        models.BotInstance.is_active == True
    ).first()
    
    if not bot_instance:
        return None
        
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == bot_instance.assistant_id
    ).first()
    
    if not assistant:
        return None
        
    return {
        "id": assistant.id,
        "name": assistant.name,
        "system_prompt": assistant.system_prompt,
        "is_active": assistant.is_active
    }


@router.get("/assistants/stats")
def get_assistants_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Получить статистику по всем ассистентам пользователя"""
    effective_user_id = auth.get_effective_user_id(current_user, db)
    
    # Получаем все ассистенты пользователя
    assistants = crud.get_assistants(db, effective_user_id)
    
    # Общая статистика
    total_assistants = len(assistants)
    active_assistants = len([a for a in assistants if a.is_active])
    
    # Статистика по сообщениям за последний месяц
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    
    total_messages = 0
    total_dialogs = 0
    assistant_stats = []
    
    for assistant in assistants:
        # Подсчет сообщений для каждого ассистента
        messages_count = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == effective_user_id,
            models.Dialog.assistant_id == assistant.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= month_ago
        ).scalar() or 0
        
        # Подсчет диалогов для каждого ассистента
        dialogs_count = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == effective_user_id,
            models.Dialog.assistant_id == assistant.id,
            models.Dialog.started_at >= month_ago
        ).scalar() or 0
        
        total_messages += messages_count
        total_dialogs += dialogs_count
        
        assistant_stats.append({
            "id": assistant.id,
            "name": assistant.name,
            "messages": messages_count,
            "dialogs": dialogs_count,
            "is_active": assistant.is_active
        })
    
    return {
        "global": {
            "totalAssistants": total_assistants,
            "activeAssistants": active_assistants,
            "totalMessages": total_messages,
            "totalDialogs": total_dialogs
        },
        "byAssistant": assistant_stats
    }


@router.get("/assistants/{assistant_id}/stats")
def get_assistant_stats(
    assistant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получить статистику конкретного ассистента"""
    effective_user_id = auth.get_effective_user_id(current_user, db)
    
    # Проверяем что ассистент принадлежит пользователю
    assistant = db.query(models.Assistant).filter(
        models.Assistant.id == assistant_id,
        models.Assistant.user_id == effective_user_id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Статистика по сообщениям за последний месяц
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)
    
    # Общие счетчики
    total_messages = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id,
        models.DialogMessage.sender == 'assistant'
    ).scalar() or 0
    
    total_dialogs = db.query(func.count(models.Dialog.id)).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id
    ).scalar() or 0
    
    # Статистика за месяц
    monthly_messages = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id,
        models.DialogMessage.sender == 'assistant',
        models.DialogMessage.timestamp >= month_ago
    ).scalar() or 0
    
    monthly_dialogs = db.query(func.count(models.Dialog.id)).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id,
        models.Dialog.started_at >= month_ago
    ).scalar() or 0
    
    # Статистика за неделю
    weekly_messages = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id,
        models.DialogMessage.sender == 'assistant',
        models.DialogMessage.timestamp >= week_ago
    ).scalar() or 0
    
    weekly_dialogs = db.query(func.count(models.Dialog.id)).filter(
        models.Dialog.user_id == effective_user_id,
        models.Dialog.assistant_id == assistant_id,
        models.Dialog.started_at >= week_ago
    ).scalar() or 0
    
    # Статистика по документам
    documents_count = db.query(func.count(models.Document.id.distinct())).join(
        models.UserKnowledge, models.Document.id == models.UserKnowledge.doc_id
    ).filter(
        models.UserKnowledge.user_id == effective_user_id,
        models.UserKnowledge.assistant_id == assistant_id
    ).scalar() or 0
    
    return {
        "assistant": {
            "id": assistant.id,
            "name": assistant.name,
            "is_active": assistant.is_active,
            "created_at": assistant.created_at.isoformat() if assistant.created_at else None
        },
        "stats": {
            "total_messages": total_messages,
            "total_dialogs": total_dialogs,
            "total_documents": documents_count,
            "monthly": {
                "messages": monthly_messages,
                "dialogs": monthly_dialogs
            },
            "weekly": {
                "messages": weekly_messages,
                "dialogs": weekly_dialogs
            }
        }
    }