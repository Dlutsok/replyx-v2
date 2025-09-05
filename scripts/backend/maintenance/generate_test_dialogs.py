#!/usr/bin/env python3
"""
Скрипт для генерации тестовых диалогов
Создает 1000 разнообразных диалогов с различными параметрами
"""

import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import User, Dialog, DialogMessage, Assistant
import uuid

# Подключение к БД
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://chatai_user:secure_password_2024@localhost:5432/chatai_db')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def generate_guest_id():
    """Генерирует случайный guest_id"""
    return str(uuid.uuid4())

def generate_telegram_data():
    """Генерирует случайные данные для Telegram"""
    usernames = ['alexkrutoy', 'mariapetrova', 'ivan_dev', 'anna_designer', 'max_marketing', 
                'elena_sales', 'dmitry_coder', 'olga_manager', 'pavel_analyst', 'svetlana_hr']
    chat_ids = [random.randint(100000000, 999999999) for _ in range(10)]
    return random.choice(usernames), random.choice(chat_ids)

# Разнообразные тематики диалогов
DIALOG_THEMES = [
    {
        'theme': 'техподдержка',
        'user_messages': [
            'Здравствуйте, у меня проблема с входом в систему',
            'Не могу восстановить пароль',
            'Система выдает ошибку 500',
            'Где находится кнопка экспорта данных?',
            'Как изменить настройки уведомлений?',
            'Не работает функция загрузки файлов'
        ],
        'assistant_messages': [
            'Здравствуйте! Я помогу решить вашу проблему. Опишите детально, что происходит.',
            'Попробуйте очистить кэш браузера и повторить попытку.',
            'Эта ошибка связана с временными проблемами сервера. Попробуйте через 5 минут.',
            'Кнопка экспорта находится в разделе "Настройки" -> "Данные".',
            'Настройки уведомлений доступны в профиле пользователя.',
            'Проверьте размер файла - максимальный размер 10MB.'
        ]
    },
    {
        'theme': 'продажи',
        'user_messages': [
            'Расскажите о ваших тарифных планах',
            'Какие есть скидки для новых клиентов?',
            'Можно ли получить демо-версию?',
            'Сколько стоит корпоративная лицензия?',
            'Есть ли пробный period?',
            'Какие способы оплаты доступны?'
        ],
        'assistant_messages': [
            'У нас есть три основных тарифа: Базовый (900₽/мес), Профессиональный (1900₽/мес) и Корпоративный (индивидуально).',
            'Новым клиентам предоставляем скидку 30% на первый месяц!',
            'Конечно! Демо-версия доступна на 14 дней без ограничений.',
            'Стоимость корпоративной лицензии рассчитывается индивидуально от количества пользователей.',
            'Да, все новые пользователи получают 14-дневный бесплатный период.',
            'Принимаем карты, электронные кошельки, банковские переводы и криптовалюты.'
        ]
    },
    {
        'theme': 'консультации',
        'user_messages': [
            'Как лучше настроить автоматизацию?',
            'Какие интеграции вы рекомендуете?',
            'Можете помочь с настройкой API?',
            'Как оптимизировать производительность?',
            'Какие есть best practices?',
            'Помогите выбрать подходящий план'
        ],
        'assistant_messages': [
            'Для начала рекомендую настроить базовые автоправила, а затем постепенно добавлять сложные сценарии.',
            'Популярные интеграции: Slack, Telegram, CRM системы. Что именно вас интересует?',
            'Конечно! Документация по API доступна по ссылке. Нужна помощь с конкретными методами?',
            'Основные принципы: кэширование, оптимизация запросов, использование CDN.',
            'Главные правила: регулярные бэкапы, мониторинг метрик, постепенное внедрение изменений.',
            'Чтобы выбрать план, расскажите о количестве пользователей и ключевых требованиях.'
        ]
    },
    {
        'theme': 'жалобы',
        'user_messages': [
            'Очень медленно работает система',
            'Постоянно вылетают ошибки',
            'Не устраивает качество поддержки',
            'Функционал не соответствует заявленному',
            'Хочу отменить подписку',
            'Требую возврат денег'
        ],
        'assistant_messages': [
            'Извините за неудобства. Передам вашу жалобу техническому отделу для срочного решения.',
            'Понимаю ваше раздражение. Какие именно ошибки возникают? Отправлю отчет разработчикам.',
            'Приношу извинения за неудовлетворительный сервис. Подключу старшего специалиста.',
            'Детально разберем ваши требования и найдем решение. Можете конкретизировать проблемы?',
            'Обработаю запрос на отмену. Можете указать причину для улучшения сервиса?',
            'Рассмотрим возможность возврата. Передам заявку в финансовый отдел.'
        ]
    },
    {
        'theme': 'информация',
        'user_messages': [
            'Какие новинки появились в системе?',
            'Расскажите о последних обновлениях',
            'Когда планируется выпуск новой версии?',
            'Какие компании используют ваш продукт?',
            'Есть ли мобильное приложение?',
            'Поддерживаются ли другие языки?'
        ],
        'assistant_messages': [
            'В последнем обновлении добавили: дашборд аналитики, улучшенные фильтры, экспорт в Excel.',
            'Версия 2.1 включает новый редактор, темную тему и улучшенную производительность.',
            'Новая версия запланирована на конец квартала. Следите за новостями!',
            'Нашими клиентами являются Сбер, Яндекс, МТС и более 1000 других компаний.',
            'Да, мобильные приложения доступны в App Store и Google Play.',
            'Интерфейс переведен на русский, английский, немецкий и китайский языки.'
        ]
    }
]

# Статусы диалогов
DIALOG_STATUSES = ['active', 'ended', 'transferred']
HANDOFF_STATUSES = ['none', 'requested', 'active', 'released']

def create_test_dialogs(count=1000):
    """Создает тестовые диалоги"""
    db = Session()
    
    try:
        # Получаем admin пользователя
        admin_user = db.query(User).filter(User.email == 'admin@example.com').first()
        if not admin_user:
            print("❌ Пользователь admin@example.com не найден!")
            return
            
        # Получаем ассистентов
        assistants = db.query(Assistant).filter(Assistant.user_id == admin_user.id).all()
        if not assistants:
            print("❌ Ассистенты не найдены!")
            return
            
        print(f"🔄 Создание {count} тестовых диалогов...")
        
        created_dialogs = 0
        
        for i in range(count):
            try:
                # Выбираем случайную тематику
                theme_data = random.choice(DIALOG_THEMES)
                
                # Генерируем параметры диалога
                guest_id = generate_guest_id()
                started_at = datetime.utcnow() - timedelta(
                    days=random.randint(1, 90),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
                
                # Случайные статусы
                is_ended = random.choice([True, False, False, False])  # 25% шанс что диалог завершен
                ended_at = started_at + timedelta(hours=random.randint(1, 24)) if is_ended else None
                handoff_status = random.choice(HANDOFF_STATUSES)
                
                # Telegram данные (50% шанс)
                telegram_username = None
                telegram_chat_id = None
                if random.choice([True, False]):
                    telegram_username, telegram_chat_id = generate_telegram_data()
                
                # Создаем диалог
                dialog = Dialog(
                    user_id=admin_user.id,
                    guest_id=guest_id,
                    started_at=started_at,
                    ended_at=ended_at,
                    auto_response=random.randint(0, 1),
                    fallback=random.randint(0, 1),
                    is_taken_over=1 if handoff_status in ['requested', 'active'] else 0,
                    handoff_status=handoff_status,
                    telegram_username=telegram_username,
                    telegram_chat_id=telegram_chat_id,
                    first_response_time=random.randint(30, 300) if random.choice([True, False]) else None
                )
                
                db.add(dialog)
                db.flush()  # Получаем ID диалога
                
                # Создаем сообщения для диалога
                message_count = random.randint(1, 15)  # От 1 до 15 сообщений
                current_time = started_at
                
                for msg_idx in range(message_count):
                    # Чередуем отправителей
                    if msg_idx == 0:
                        sender = 'user'  # Первое сообщение всегда от пользователя
                        text = random.choice(theme_data['user_messages'])
                    else:
                        sender = 'assistant' if msg_idx % 2 == 1 else 'user'
                        if sender == 'user':
                            text = random.choice(theme_data['user_messages'])
                        else:
                            text = random.choice(theme_data['assistant_messages'])
                    
                    # Иногда добавляем сообщения от менеджера
                    if handoff_status == 'active' and random.random() < 0.3:
                        sender = 'manager'
                        text = f"Я менеджер {random.choice(['Анна', 'Дмитрий', 'Елена', 'Максим'])}. {text}"
                    
                    current_time += timedelta(minutes=random.randint(1, 30))
                    
                    message = DialogMessage(
                        dialog_id=dialog.id,
                        sender=sender,
                        text=text,
                        timestamp=current_time
                    )
                    db.add(message)
                
                created_dialogs += 1
                
                # Периодически сохраняем для избежания блокировок
                if created_dialogs % 100 == 0:
                    db.commit()
                    print(f"✅ Создано {created_dialogs} диалогов...")
                    
            except Exception as e:
                print(f"⚠️ Ошибка создания диалога {i+1}: {e}")
                db.rollback()
                continue
        
        # Финальное сохранение
        db.commit()
        print(f"🎉 Успешно создано {created_dialogs} тестовых диалогов!")
        
        # Статистика
        total_dialogs = db.query(Dialog).filter(Dialog.user_id == admin_user.id).count()
        total_messages = db.query(DialogMessage).join(Dialog).filter(Dialog.user_id == admin_user.id).count()
        
        print(f"📊 Общая статистика:")
        print(f"   - Всего диалогов: {total_dialogs}")
        print(f"   - Всего сообщений: {total_messages}")
        print(f"   - Активных диалогов: {db.query(Dialog).filter(Dialog.user_id == admin_user.id, Dialog.ended_at.is_(None)).count()}")
        print(f"   - Завершенных диалогов: {db.query(Dialog).filter(Dialog.user_id == admin_user.id, Dialog.ended_at.isnot(None)).count()}")
        print(f"   - Диалогов с handoff: {db.query(Dialog).filter(Dialog.user_id == admin_user.id, Dialog.handoff_status != 'none').count()}")
        print(f"   - Telegram диалогов: {db.query(Dialog).filter(Dialog.user_id == admin_user.id, Dialog.telegram_username.isnot(None)).count()}")
        
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_dialogs(1000)