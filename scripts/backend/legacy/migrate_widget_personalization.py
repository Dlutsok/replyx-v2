#!/usr/bin/env python3
"""
Скрипт миграции данных для персонализации виджета

Этот скрипт заполняет поля персонализации для существующих ассистентов
значениями по умолчанию, чтобы обеспечить совместимость после обновления.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database.models import Assistant
from core.app_config import DATABASE_URL
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_widget_personalization():
    """Выполняет миграцию данных персонализации виджета"""
    
    # Создание подключения к базе данных
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        logger.info("Начинаем миграцию данных персонализации виджета...")
        
        # Получаем всех ассистентов без заполненных полей персонализации
        assistants_query = session.query(Assistant).filter(
            (Assistant.operator_name == None) |
            (Assistant.business_name == None) |
            (Assistant.widget_theme == None)
        )
        
        assistants_to_update = assistants_query.all()
        logger.info(f"Найдено {len(assistants_to_update)} ассистентов для обновления")
        
        if not assistants_to_update:
            logger.info("Все ассистенты уже имеют заполненные поля персонализации")
            return
        
        # Обновляем каждого ассистента
        updated_count = 0
        for assistant in assistants_to_update:
            # Устанавливаем значения по умолчанию только для пустых полей
            if not assistant.operator_name:
                assistant.operator_name = 'Поддержка'
            
            if not assistant.business_name:
                assistant.business_name = 'Наша компания'
            
            if not assistant.widget_theme:
                assistant.widget_theme = 'blue'
            
            # Инициализируем widget_settings пустым объектом, если он None
            if assistant.widget_settings is None:
                assistant.widget_settings = {}
            
            updated_count += 1
            
            logger.info(f"Обновлен ассистент ID {assistant.id}: {assistant.name}")
        
        # Сохраняем изменения
        session.commit()
        logger.info(f"Успешно обновлено {updated_count} ассистентов")
        
        # Проверяем результат
        verification_query = session.query(Assistant).filter(
            (Assistant.operator_name == None) |
            (Assistant.business_name == None) |
            (Assistant.widget_theme == None)
        )
        remaining_count = verification_query.count()
        
        if remaining_count == 0:
            logger.info("✅ Миграция завершена успешно! Все ассистенты имеют заполненные поля персонализации")
        else:
            logger.warning(f"⚠️ Осталось {remaining_count} ассистентов без заполненных полей")
            
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

def check_migration_status():
    """Проверяет статус миграции"""
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Проверяем общее количество ассистентов
        total_assistants = session.query(Assistant).count()
        
        # Проверяем количество ассистентов с заполненными полями
        completed_assistants = session.query(Assistant).filter(
            Assistant.operator_name.isnot(None),
            Assistant.business_name.isnot(None),
            Assistant.widget_theme.isnot(None)
        ).count()
        
        # Проверяем количество ассистентов без заполненных полей
        incomplete_assistants = session.query(Assistant).filter(
            (Assistant.operator_name == None) |
            (Assistant.business_name == None) |
            (Assistant.widget_theme == None)
        ).count()
        
        logger.info("=" * 50)
        logger.info("СТАТУС МИГРАЦИИ ПЕРСОНАЛИЗАЦИИ ВИДЖЕТА")
        logger.info("=" * 50)
        logger.info(f"Всего ассистентов: {total_assistants}")
        logger.info(f"С заполненными полями: {completed_assistants}")
        logger.info(f"Требуют обновления: {incomplete_assistants}")
        
        if incomplete_assistants == 0:
            logger.info("✅ Миграция завершена - все ассистенты готовы!")
        else:
            logger.info(f"⚠️ Необходимо обновить {incomplete_assistants} ассистентов")
        
        logger.info("=" * 50)
        
        return incomplete_assistants == 0
        
    except Exception as e:
        logger.error(f"❌ Ошибка при проверке статуса миграции: {str(e)}")
        raise
    finally:
        session.close()

def rollback_migration():
    """Откатывает миграцию (опционально, для тестирования)"""
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        logger.info("Откат миграции персонализации виджета...")
        
        # НЕ РЕКОМЕНДУЕТСЯ для продакшена - только для тестирования
        assistants = session.query(Assistant).all()
        
        for assistant in assistants:
            assistant.operator_name = None
            assistant.business_name = None
            assistant.avatar_url = None
            assistant.widget_theme = None
            assistant.widget_settings = None
        
        session.commit()
        logger.info(f"Откат выполнен для {len(assistants)} ассистентов")
        
    except Exception as e:
        logger.error(f"❌ Ошибка при откате миграции: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "check":
            check_migration_status()
        elif command == "migrate":
            migrate_widget_personalization()
        elif command == "rollback":
            # ВНИМАНИЕ: Используйте только для тестирования!
            confirmation = input("ВНИМАНИЕ: Это удалит все данные персонализации! Продолжить? (yes/no): ")
            if confirmation.lower() == 'yes':
                rollback_migration()
            else:
                logger.info("Откат отменен")
        else:
            print("Использование:")
            print("  python migrate_widget_personalization.py check     - проверить статус")
            print("  python migrate_widget_personalization.py migrate  - выполнить миграцию")
            print("  python migrate_widget_personalization.py rollback - откатить (только для тестов!)")
    else:
        # По умолчанию выполняем миграцию
        check_migration_status()
        migrate_widget_personalization()