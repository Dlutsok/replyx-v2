"""
Сервис для управления пробным периодом пользователей
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal, models
from database.connection import get_db

from core.app_config import TRIAL_DURATION_DAYS, TRIAL_MESSAGE_LIMIT

def is_trial_period_active(user: models.User) -> bool:
    """Проверяет, активен ли пробный период для пользователя"""
    # Пробный период активен первые 7 дней после регистрации
    trial_end = user.created_at + timedelta(days=TRIAL_DURATION_DAYS)
    return datetime.utcnow() < trial_end

def get_trial_messages_used(user: models.User, db: Session) -> int:
    """Возвращает количество сообщений, использованных в пробном периоде"""
    # Считаем сообщения только за период с момента регистрации
    message_count = db.query(func.count(models.DialogMessage.id)).join(
        models.Dialog
    ).filter(
        models.Dialog.user_id == user.id,
        models.DialogMessage.sender == 'assistant',
        models.DialogMessage.timestamp >= user.created_at
    ).scalar() or 0
    
    return message_count

def get_trial_days_left(user: models.User) -> int:
    """Возвращает количество дней, оставшихся в пробном периоде"""
    trial_end = user.created_at + timedelta(days=TRIAL_DURATION_DAYS)
    days_left = (trial_end - datetime.utcnow()).days
    return max(0, days_left)

def is_user_blocked(user: models.User) -> bool:
    """Проверяет, заблокирован ли пользователь (закончился пробный период)"""
    # Пользователь заблокирован если пробный период истек
    return not is_trial_period_active(user)

def get_user_message_limit(user: models.User) -> int:
    """Возвращает лимит сообщений для пользователя в зависимости от пробного периода"""
    if is_trial_period_active(user):
        return TRIAL_MESSAGE_LIMIT  # 200 сообщений в пробном периоде
    else:
        return 0  # После пробного периода полная блокировка

def check_user_access(user: models.User) -> dict:
    """Проверяет доступ пользователя к функционалу"""
    from services.bot_manager import stop_user_bots
    
    is_blocked = is_user_blocked(user)
    is_trial = is_trial_period_active(user)
    trial_days_left = get_trial_days_left(user)
    with get_db() as db:
        trial_messages_used = get_trial_messages_used(user, db)
    
    # Если пользователь заблокирован, останавливаем всех его ботов
    if is_blocked:
        stop_user_bots(user.id)
    
    return {
        "isBlocked": is_blocked,
        "isTrialActive": is_trial,
        "trialDaysLeft": trial_days_left,
        "trialMessagesUsed": trial_messages_used,
        "needsUpgrade": is_blocked or (is_trial and trial_days_left <= 1),
        "blockReason": "trial_expired" if is_blocked else None,
        "warningMessage": get_warning_message(user, trial_days_left, trial_messages_used)
    }

def get_warning_message(user: models.User, days_left: int, messages_used: int) -> str:
    """Возвращает предупреждающее сообщение для пользователя"""
    if days_left == 0:
        return "Ваш пробный период завершился. Обновите план для продолжения использования."
    elif days_left == 1:
        return "У вас остался 1 день пробного периода. Рекомендуем обновить план."
    elif days_left <= 3:
        return f"У вас осталось {days_left} дня пробного периода."
    elif messages_used >= TRIAL_MESSAGE_LIMIT * 0.8:
        return f"Вы использовали {messages_used} из {TRIAL_MESSAGE_LIMIT} сообщений пробного периода."
    
    return None