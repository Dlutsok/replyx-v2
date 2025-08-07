"""
Сервис для управления ботами (legacy функции)
"""
import logging
import requests

logger = logging.getLogger(__name__)

def reload_user_bots(user_id: int):
    """
    Перезагружает всех ботов пользователя (Telegram) 
    DEPRECATED: используйте reload_assistant_bots из services.bot_manager
    """
    try:
        # Перезапускаем Telegram-бот
        requests.post("http://localhost:8000/api/reload-bot", json={"user_id": user_id}, timeout=2)
        logger.info(f"Bots reloaded for user {user_id}")
    except Exception as e:
        logger.error(f"Bot reload error for user {user_id}: {e}")