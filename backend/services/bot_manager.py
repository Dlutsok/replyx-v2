"""
Сервис для управления ботами и их перезагрузки
"""
import requests
from sqlalchemy.orm import Session
from database import SessionLocal, models
import logging

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
            "http://localhost:3001/reload-bots", 
            json={"bot_ids": bot_ids, "assistant_id": assistant_id}, 
            timeout=5
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
                "http://localhost:3001/clear-bot-cache", 
                json={"bot_ids": bot_ids, "assistant_id": assistant_id}, 
                timeout=5
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
            "http://localhost:3001/hot-reload-bots", 
            json={"bot_ids": bot_ids, "assistant_id": assistant_id, "force_reload": True}, 
            timeout=5
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
                        "http://localhost:3001/force-restart-bot", 
                        json={"bot_id": bot_id, "reason": "knowledge_update"}, 
                        timeout=10
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
            "http://localhost:3001/reload-bots", 
            json={"bot_ids": [bot_id]}, 
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"[RELOAD_SPECIFIC_BOT] Перезагружен бот {bot_id}")
        else:
            print(f"[RELOAD_SPECIFIC_BOT] Ошибка ответа multi bot manager: {response.status_code}")
            
    except Exception as e:
        print(f"[RELOAD_SPECIFIC_BOT] Ошибка перезагрузки бота {bot_id}: {e}")

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
            "http://localhost:3001/reload-bots", 
            json={"bot_ids": bot_ids, "user_id": user_id, "assistant_id": assistant_id}, 
            timeout=5
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
                    "http://localhost:3001/stop-bots", 
                    json={"bot_ids": bot_ids, "reason": "trial_expired"}, 
                    timeout=5
                )
                
                print(f"[STOP_USER_BOTS] Остановлены боты {bot_ids} для пользователя {user_id} (пробный период завершен)")
                
    except Exception as e:
        print(f"[STOP_USER_BOTS] Ошибка остановки ботов для пользователя {user_id}: {e}")