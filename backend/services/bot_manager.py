"""
Сервис для управления ботами и их перезагрузки
"""
import requests
from core.app_config import BOT_SERVICE_URL
from sqlalchemy.orm import Session
from database import SessionLocal, models
import logging
import asyncio

logger = logging.getLogger(__name__)

def reload_assistant_bots(assistant_id: int, db: Session):
    """Перезагружает всех ботов для конкретного ассистента"""
    try:
        # Находим bot instances этого ассистента
        bot_instances = db.query(models.BotInstance).filter(
            models.BotInstance.assistant_id == assistant_id,
            models.BotInstance.is_active == True
        ).all()
        
        if not bot_instances:
            print(f"[RELOAD_ASSISTANT_BOTS] Нет активных ботов для ассистента {assistant_id}")
            return
        
        # Отправляем сигнал multi bot manager для перезагрузки ботов
        bot_ids = [bot.id for bot in bot_instances]
        response = requests.post(
            f"{BOT_SERVICE_URL}/reload-bots", 
            json={"bot_ids": bot_ids, "assistant_id": assistant_id}, 
            timeout=1
        )
        
        if response.status_code == 200:
            print(f"[RELOAD_ASSISTANT_BOTS] Перезагружены боты {bot_ids} для ассистента {assistant_id}")
        else:
            print(f"[RELOAD_ASSISTANT_BOTS] Ошибка ответа multi bot manager: {response.status_code}")
            
    except Exception as e:
        print(f"[RELOAD_ASSISTANT_BOTS] Ошибка перезагрузки ботов для ассистента {assistant_id}: {e}")

def hot_reload_assistant_bots(assistant_id: int, db: Session):
    """Горячая перезагрузка ботов ассистента с сохранением диалогов"""
    try:
        # Находим bot instances этого ассистента
        bot_instances = db.query(models.BotInstance).filter(
            models.BotInstance.assistant_id == assistant_id,
            models.BotInstance.is_active == True
        ).all()
        
        if not bot_instances:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] Нет активных ботов для ассистента {assistant_id}")
            return
        
        bot_ids = [bot.id for bot in bot_instances]
        print(f"[HOT_RELOAD_ASSISTANT_BOTS] 🔥 Начинаем горячую перезагрузку ботов {bot_ids} для ассистента {assistant_id}")
        
        # Считаем количество диалогов для информации
        dialogs_count = db.query(models.Dialog).filter(
            models.Dialog.assistant_id == assistant_id
        ).count()
        
        if dialogs_count > 0:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] 📝 Сохраняем {dialogs_count} диалогов ассистента {assistant_id} (не используются в AI)")
        else:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] 📝 Нет диалогов для ассистента {assistant_id}")
        
        try:
            # Очищаем кэш bot manager для этих ботов
            clear_response = requests.post(
                f"{BOT_SERVICE_URL}/clear-bot-cache", 
                json={"bot_ids": bot_ids, "assistant_id": assistant_id}, 
                timeout=1
            )
            
            if clear_response.status_code == 200:
                print(f"[HOT_RELOAD_ASSISTANT_BOTS] ✅ Кэш очищен для ботов {bot_ids}")
            else:
                print(f"[HOT_RELOAD_ASSISTANT_BOTS] ⚠️ Ошибка очистки кэша: {clear_response.status_code}")
                
        except Exception as cache_error:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] ⚠️ Ошибка очистки кэша: {cache_error}")
            # Продолжаем даже если очистка кэша не удалась
        
        # Отправляем сигнал scalable bot manager для горячей перезагрузки
        response = requests.post(
            f"{BOT_SERVICE_URL}/hot-reload-bots", 
            json={"bot_ids": bot_ids, "assistant_id": assistant_id, "force_reload": True}, 
            timeout=1
        )
        
        if response.status_code == 200:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] 🔥 Горячая перезагрузка применена к ботам {bot_ids} для ассистента {assistant_id}")
        else:
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] Ошибка ответа scalable bot manager: {response.status_code}")
            # Fallback к обычной перезагрузке при ошибке
            print(f"[HOT_RELOAD_ASSISTANT_BOTS] Fallback к принудительной перезагрузке")
            
            # 🚨 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА если hot reload не сработал
            for bot_id in bot_ids:
                try:
                    force_response = requests.post(
                        f"{BOT_SERVICE_URL}/force-restart-bot", 
                        json={"bot_id": bot_id, "reason": "knowledge_update"}, 
                        timeout=2
                    )
                    
                    if force_response.status_code == 200:
                        print(f"[HOT_RELOAD_ASSISTANT_BOTS] ✅ Принудительная перезагрузка бота {bot_id}")
                    else:
                        print(f"[HOT_RELOAD_ASSISTANT_BOTS] ❌ Ошибка принудительной перезагрузки бота {bot_id}")
                        
                except Exception as force_error:
                    logger.error(f"[HOT_RELOAD_ASSISTANT_BOTS] ❌ Исключение при принудительной перезагрузке бота {bot_id}: {force_error}")
            
    except Exception as e:
        logger.error(f"[HOT_RELOAD_ASSISTANT_BOTS] Ошибка горячей перезагрузки ботов для ассистента {assistant_id}: {e}")
        # Fallback к обычной перезагрузке при ошибке
        logger.info(f"[HOT_RELOAD_ASSISTANT_BOTS] Fallback к обычной перезагрузке")
        reload_assistant_bots(assistant_id, db)

def reload_specific_bot(bot_id: int, db: Session):
    """Перезагружает конкретный бот по ID"""
    try:
        # Проверяем что бот существует и активен
        bot_instance = db.query(models.BotInstance).filter(
            models.BotInstance.id == bot_id,
            models.BotInstance.is_active == True
        ).first()
        
        if not bot_instance:
            print(f"[RELOAD_SPECIFIC_BOT] Бот {bot_id} не найден или неактивен")
            return
        
        # Отправляем сигнал multi bot manager для перезагрузки конкретного бота
        response = requests.post(
            f"{BOT_SERVICE_URL}/reload-bots", 
            json={"bot_ids": [bot_id]}, 
            timeout=1
        )
        
        if response.status_code == 200:
            print(f"[RELOAD_SPECIFIC_BOT] Перезагружен бот {bot_id}")
        else:
            print(f"[RELOAD_SPECIFIC_BOT] Ошибка ответа multi bot manager: {response.status_code}")
            
    except Exception as e:
        print(f"[RELOAD_SPECIFIC_BOT] Ошибка перезагрузки бота {bot_id}: {e}")


async def send_operator_message_to_telegram(telegram_chat_id: str, text: str, operator_name: str):
    """Отправляет сообщение от оператора в Telegram чат через bot manager"""
    try:
        logger.info(f"🔄 [BOT_MANAGER] Начинаем отправку сообщения в Telegram. Chat ID: {telegram_chat_id}, Оператор: {operator_name}")
        logger.info(f"🔄 [BOT_MANAGER] BOT_SERVICE_URL: {BOT_SERVICE_URL}")
        logger.info(f"🔄 [BOT_MANAGER] Текст сообщения (первые 100 символов): {text[:100]}...")
        
        # Форматируем сообщение с именем оператора
        formatted_message = f"👤 {operator_name}: {text}"
        logger.info(f"🔄 [BOT_MANAGER] Форматированное сообщение: {formatted_message[:100]}...")
        
        # Отправляем команду bot manager'у для отправки сообщения
        logger.info(f"🔄 [BOT_MANAGER] Отправляем POST запрос на {BOT_SERVICE_URL}/send-operator-message")
        response = requests.post(
            f"{BOT_SERVICE_URL}/send-operator-message",
            json={
                "telegram_chat_id": telegram_chat_id,
                "text": formatted_message,
                "operator_name": operator_name
            },
            timeout=5  # Быстрый таймаут - если bot service не отвечает быстро, продолжаем работу
        )
        
        logger.info(f"🔄 [BOT_MANAGER] Получен ответ от bot service: HTTP {response.status_code}")
        
        if response.status_code == 200:
            logger.info(f"✅ [BOT_MANAGER] Сообщение оператора {operator_name} успешно отправлено в Telegram чат {telegram_chat_id}")
            try:
                response_data = response.json()
                logger.info(f"✅ [BOT_MANAGER] Ответ от bot service: {response_data}")
            except:
                logger.info(f"✅ [BOT_MANAGER] Ответ от bot service (текст): {response.text}")
        else:
            logger.error(f"❌ [BOT_MANAGER] Ошибка отправки сообщения оператора в Telegram: HTTP {response.status_code}")
            logger.error(f"❌ [BOT_MANAGER] Тело ответа: {response.text}")
            # Пробрасываем ошибку дальше для обработки в dialogs.py
            raise Exception(f"HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.Timeout:
        error_msg = f"Таймаут при отправке сообщения оператора в Telegram чат {telegram_chat_id} (превышено 5 секунд)"
        logger.warning(f"⚠️ [BOT_MANAGER] {error_msg} - сообщение сохранено в БД, доставка отложена")
        # НЕ raise Exception - сообщение уже сохранено в базе, handoff работает
    except requests.exceptions.ConnectionError:
        error_msg = f"Ошибка соединения с bot service ({BOT_SERVICE_URL})"
        logger.warning(f"⚠️ [BOT_MANAGER] {error_msg} - сообщение сохранено в БД, bot service недоступен")
        # НЕ raise Exception - сообщение сохранено, handoff работает без Telegram доставки
    except Exception as e:
        logger.error(f"❌ [BOT_MANAGER] Исключение при отправке сообщения оператора в Telegram: {e}")
        logger.exception("❌ [BOT_MANAGER] Детали исключения:")
        raise  # Пробрасываем исключение для обработки в dialogs.py

def reload_user_assistant_bots(user_id: int, assistant_id: int, db: Session):
    """Перезагружает боты конкретного пользователя для конкретного ассистента"""
    try:
        # Находим bot instances этого пользователя для конкретного ассистента
        bot_instances = db.query(models.BotInstance).join(models.Assistant).filter(
            models.Assistant.user_id == user_id,
            models.BotInstance.assistant_id == assistant_id,
            models.BotInstance.is_active == True
        ).all()
        
        if not bot_instances:
            print(f"[RELOAD_USER_ASSISTANT_BOTS] Нет активных ботов для пользователя {user_id} и ассистента {assistant_id}")
            return
        
        # Отправляем сигнал multi bot manager для перезагрузки конкретных ботов
        bot_ids = [bot.id for bot in bot_instances]
        response = requests.post(
            f"{BOT_SERVICE_URL}/reload-bots", 
            json={"bot_ids": bot_ids, "user_id": user_id, "assistant_id": assistant_id}, 
            timeout=1
        )
        
        if response.status_code == 200:
            print(f"[RELOAD_USER_ASSISTANT_BOTS] Перезагружены боты {bot_ids} для пользователя {user_id} и ассистента {assistant_id}")
        else:
            print(f"[RELOAD_USER_ASSISTANT_BOTS] Ошибка ответа multi bot manager: {response.status_code}")
            
    except Exception as e:
        print(f"[RELOAD_USER_ASSISTANT_BOTS] Ошибка перезагрузки ботов для пользователя {user_id} и ассистента {assistant_id}: {e}")

def stop_user_bots(user_id: int):
    """Останавливает всех ботов пользователя"""
    try:
        from database.connection import get_db
        
        with get_db() as db:
            # Находим всех ботов пользователя
            bot_instances = db.query(models.BotInstance).join(models.Assistant).filter(
                models.Assistant.user_id == user_id,
                models.BotInstance.is_active == True
            ).all()
            
            if bot_instances:
                # Деактивируем ботов в БД
                for bot in bot_instances:
                    bot.is_active = False
                db.commit()
                
                # Отправляем сигнал multi bot manager для остановки ботов
                bot_ids = [bot.id for bot in bot_instances]
                response = requests.post(
                    f"{BOT_SERVICE_URL}/stop-bots", 
                    json={"bot_ids": bot_ids, "reason": "trial_expired"}, 
                    timeout=2
                )
                
                print(f"[STOP_USER_BOTS] Остановлены боты {bot_ids} для пользователя {user_id} (пробный период завершен)")
                
    except Exception as e:
        print(f"[STOP_USER_BOTS] Ошибка остановки ботов для пользователя {user_id}: {e}")

async def send_system_message_to_bot(message_data):
    """Отправляет системное сообщение в Telegram бота"""
    try:
        logger.info(f"Sending system message to Telegram: {message_data}")
        
        # Отправляем запрос в multi bot manager
        response = requests.post(
            f"{BOT_SERVICE_URL}/send-system-message", 
            json=message_data, 
            timeout=5
        )
        
        if response.status_code == 200:
            logger.info(f"System message sent successfully to Telegram for dialog {message_data.get('dialog_id')}")
        else:
            logger.error(f"Failed to send system message: HTTP {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error sending system message to bot manager: {e}")