from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
import logging
import json

from database import models, get_db
from ai.ai_providers import get_ai_completion

logger = logging.getLogger(__name__)
router = APIRouter()

# Храним контекст сессий в памяти (в продакшене лучше использовать Redis)
session_contexts = {}

def generate_fallback_response(message: str) -> dict:
    """
    Генерирует умный fallback ответ на основе ключевых слов в сообщении
    """
    message_lower = message.lower()
    
    # Приветствия
    if any(word in message_lower for word in ['привет', 'здравствуй', 'добро', 'hi', 'hello']):
        return {
            "message": "Добро пожаловать в ChatAI MVP!\n\nЯ ваш персональный консультант по созданию и управлению AI-ботами для Telegram и VK.\n\nМои возможности:\n• Консультации по созданию интеллектуальных ботов\n• Помощь в выборе оптимального тарифного плана\n• Техническая поддержка по интеграции\n\nКак могу помочь вам сегодня?",
            "buttons": [
                {"label": "Создать бота", "url": "/dashboard"},
                {"label": "Посмотреть тарифы", "url": "/pricing"},
                {"label": "Техподдержка", "action": "form:request"}
            ]
        }
    
    # Вопросы о возможностях
    if any(word in message_lower for word in ['что ты', 'что умеешь', 'возможности', 'функции']):
        return {
            "message": "ChatAI MVP — это профессиональная платформа для создания и управления AI-ботами корпоративного уровня.\n\nНаши возможности:\n• Создание неограниченного количества интеллектуальных ботов\n• Интеграция с Telegram и VK Business API\n• Масштабирование до 1000+ ботов одновременно\n• Использование GPT-4 для максимально естественного общения\n• Полная аналитика и мониторинг производительности\n\nПлатформа предназначена для автоматизации клиентского сервиса в любом масштабе.",
            "buttons": [
                {"label": "Создать бота", "url": "/dashboard"},
                {"label": "Посмотреть тарифы", "url": "/pricing"},
                {"label": "Посмотреть демо", "action": "start:demo"}
            ]
        }
    
    # Вопросы о создании ботов
    if any(word in message_lower for word in ['создать бот', 'как создать', 'новый бот', 'бота']):
        return {
            "message": "Процесс создания AI-бота в ChatAI MVP максимально оптимизирован для быстрого запуска.\n\nПошаговый алгоритм:\n\n1. Авторизация в панели управления\n2. Создание нового проекта бота\n3. Выбор целевой платформы (Telegram/VK)\n4. Настройка сценариев и базы знаний\n5. Конфигурация интеграций\n6. Активация и мониторинг\n\nСредний срок внедрения составляет 15-20 минут. После запуска бот автоматически обрабатывает входящие запросы с использованием GPT-4.",
            "buttons": [
                {"label": "Создать бота", "url": "/dashboard"},
                {"label": "Посмотреть демо", "action": "start:demo"},
                {"label": "Техподдержка", "action": "form:request"}
            ]
        }
    
    # Вопросы о тарифах
    if any(word in message_lower for word in ['тариф', 'цена', 'стоимость', 'оплата', 'план']):
        return {
            "message": "ChatAI MVP предлагает гибкие тарифы для любых задач:\n\n• Стартовый — БЕСПЛАТНО (до 100 сообщений в месяц, 1 бот)\n• Базовый — 299 руб/мес (до 1000 сообщений, до 3 ботов)\n• Профессиональный — 899 руб/мес (до 10000 сообщений, до 10 ботов)\n• Корпоративный — 2999 руб/мес (безлимитные сообщения, до 100 ботов)\n• Энтерпрайз — индивидуальная цена (1000+ ботов)\n\nСтоимость SMS для регистрации ботов: 3 рубля",
            "buttons": [
                {"label": "Посмотреть тарифы", "url": "/pricing"},
                {"label": "Связаться с нами", "action": "form:request"},
                {"label": "Начать бесплатно", "url": "/dashboard"}
            ]
        }
    
    # Запросы помощи
    if any(word in message_lower for word in ['помощь', 'поддержка', 'не работает', 'ошибка', 'проблема']):
        return {
            "message": "Конечно, помогу! 🛠️ Наша техническая поддержка работает 24/7. Опишите вашу проблему, и мы быстро найдем решение.",
            "buttons": [
                {"label": "Оставить заявку", "action": "form:request"},
                {"label": "База знаний", "url": "/help"},
                {"label": "Чат с поддержкой", "action": "start:support"}
            ]
        }
    
    # Заявки
    if any(word in message_lower for word in ['заявка', 'связаться', 'контакт', 'заказать']):
        return {
            "message": "Отлично! 📝 Оставьте заявку, и наш менеджер свяжется с вами в течение 15 минут для консультации.",
            "buttons": [
                {"label": "Оставить заявку", "action": "form:request"},
                {"label": "Позвонить нам", "url": "tel:+74951234567"},
                {"label": "Написать на почту", "url": "mailto:support@chatai.ru"}
            ]
        }
    
    # Вопросы о времени работы и доступности
    if any(word in message_lower for word in ['время работы', 'график работы', 'когда работаете', 'часы работы', 'доступность']):
        return {
            "message": "ChatAI MVP работает в режиме 24/7.\n\nНаши сервисы доступны круглосуточно:\n• Создание и управление ботами\n• Автоматическая обработка запросов\n• Мониторинг и аналитика\n• Техническая поддержка\n\nВаши боты также функционируют без перерывов, обеспечивая непрерывное обслуживание клиентов.",
            "buttons": [
                {"label": "Создать бота", "url": "/dashboard"},
                {"label": "Техподдержка", "action": "form:request"},
                {"label": "Посмотреть тарифы", "url": "/pricing"}
            ]
        }
    
    # Общий fallback
    return {
        "message": "Благодарю за обращение. Я консультант по платформе ChatAI MVP.\n\nГотов предоставить информацию по следующим вопросам:\n• Создание и настройка AI-ботов\n• Интеграция с Telegram и VK\n• Тарифные планы и возможности\n• Техническая поддержка\n\nКакая информация вас интересует?",
        "buttons": [
            {"label": "Создать бота", "url": "/dashboard"},
            {"label": "Посмотреть тарифы", "url": "/pricing"},
            {"label": "Техподдержка", "action": "form:request"}
        ]
    }

@router.post('/ai/initialize-context')
def initialize_ai_context(data: dict, db: Session = Depends(get_db)):
    """
    Инициализация AI контекста для новой сессии
    """
    try:
        session_id = data.get('session_id')
        context = data.get('context')
        timestamp = data.get('timestamp')
        
        if not session_id or not context:
            raise HTTPException(status_code=400, detail="Missing required fields: session_id and context")
        
        logger.info(f"Инициализация AI контекста для сессии: {session_id}")
        
        # Формируем системный промпт на основе контекста
        system_prompt = f"""Ты — AI-ассистент компании ChatAI MVP, эксперт по созданию и управлению AI-ботов.

О CHATAI MVP:
ChatAI MVP — это революционная платформа для создания и управления более чем 1000 AI-ботов одновременно в Telegram и VK. Мы помогаем бизнесу автоматизировать общение с клиентами через умных ботов.

КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
• Создание неограниченного количества AI-ботов для Telegram и VK
• Интеграция с OpenAI GPT-4o mini для максимально умных ответов
• Масштабируемая архитектура - поддержка 1000+ ботов одновременно
• Система управления токенами и балансировки нагрузки
• Мониторинг и аналитика работы всех ботов в реальном времени
• Интеграция с веб-сайтами через виджеты
• Автоматическое обучение ботов на ваших данных

КАК СОЗДАТЬ БОТА:
1. Регистрируетесь в панели управления
2. Нажимаете "Создать бота" 
3. Выбираете платформу (Telegram или VK)
4. Настраиваете личность и знания бота
5. Подключаете к своим каналам/группам
6. Бот начинает работать автоматически!

НАШИ ТАРИФЫ (КОНКРЕТНЫЕ ЦЕНЫ):
• Стартовый — БЕСПЛАТНО (до 100 сообщений в месяц, 1 бот)
• Базовый — 299 руб/мес (до 1000 сообщений, до 3 ботов)
• Профессиональный — 899 руб/мес (до 10000 сообщений, до 10 ботов)
• Корпоративный — 2999 руб/мес (безлимитные сообщения, до 100 ботов)
• Энтерпрайз — индивидуальная цена (1000+ ботов, персональная поддержка)

СТОИМОСТЬ SMS: 3 рубля за SMS для подтверждения регистрации ботов

ВРЕМЯ РАБОТЫ: ChatAI MVP работает 24/7 круглосуточно. Техническая поддержка доступна с 9:00 до 21:00 МСК по будням.

КРИТИЧЕСКИ ВАЖНО:
1. ВСЕГДА отвечай только про ChatAI MVP - это НАША платформа!
2. Используй КОНКРЕТНЫЕ цены и тарифы, указанные выше
3. ОБЯЗАТЕЛЬНО добавляй переносы строк \\n между абзацами
4. Отвечай профессионально, без общих фраз
5. Мотивируй к созданию ботов на НАШЕЙ платформе

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА:
Всегда возвращай JSON с текстом и кнопками:
{{
  "message": "Твой отформатированный ответ с переносами строк",
  "buttons": [
    {{"label": "Создать бота", "url": "/dashboard"}},
    {{"label": "Посмотреть тарифы", "url": "/pricing"}},
    {{"label": "Техподдержка", "action": "form:request"}}
  ]
}}

ДОСТУПНЫЕ КНОПКИ:
- {{"label": "Создать бота", "url": "/dashboard"}}
- {{"label": "Посмотреть тарифы", "url": "/pricing"}}
- {{"label": "Посмотреть демо", "action": "start:demo"}}
- {{"label": "Техподдержка", "action": "form:request"}}
- {{"label": "База знаний", "url": "/help"}}
- {{"label": "Связаться с нами", "action": "form:contact"}}

Помни: пользователи хотят создавать ботов - мотивируй их и направляй к действию!"""
        
        # Сохраняем контекст сессии
        session_contexts[session_id] = {
            'system_prompt': system_prompt,
            'context': context,
            'messages': [],
            'created_at': timestamp,
            'last_activity': timestamp
        }
        
        logger.info(f"AI контекст сохранен для сессии {session_id}")
        
        return {
            "success": True,
            "message": "AI context initialized successfully",
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Ошибка при инициализации AI контекста: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post('/ai/chat')
async def ai_chat(data: dict, db: Session = Depends(get_db)):
    """
    Обработка сообщений для AI чата
    """
    try:
        session_id = data.get('session_id')
        message = data.get('message')
        timestamp = data.get('timestamp')
        
        if not session_id or not message:
            raise HTTPException(status_code=400, detail="Missing required fields: session_id and message")
        
        logger.info(f"AI чат запрос: session_id={session_id}, message={message[:50]}...")
        
        # Получаем контекст сессии
        session_context = session_contexts.get(session_id)
        if not session_context:
            # Если контекста нет, создаем базовый
            logger.warning(f"Контекст для сессии {session_id} не найден, создаем базовый")
            session_context = {
                'system_prompt': """Ты — дружелюбный AI-ассистент ChatAI MVP. 
                
Отвечай на русском языке, помогай пользователям с вопросами о создании и управлении AI-ботами.
Если не знаешь точного ответа, предложи связаться с технической поддержкой.""",
                'messages': [],
                'created_at': timestamp,
                'last_activity': timestamp
            }
            session_contexts[session_id] = session_context
        
        # Добавляем сообщение пользователя в историю
        session_context['messages'].append({
            'role': 'user',
            'content': message,
            'timestamp': timestamp
        })
        session_context['last_activity'] = timestamp
        
        # Формируем полную цепочку сообщений для AI
        ai_messages = [
            {'role': 'system', 'content': session_context['system_prompt']}
        ]
        
        # Добавляем последние 10 сообщений из истории (чтобы не превысить лимит токенов)
        recent_messages = session_context['messages'][-10:]
        ai_messages.extend([
            {'role': msg['role'], 'content': msg['content']} 
            for msg in recent_messages
        ])
        
        # Получаем ответ от AI
        logger.info(f"Отправка запроса к AI с {len(ai_messages)} сообщениями")
        
        try:
            ai_response = await get_ai_completion(
                messages=ai_messages,
                model='gpt-4o-mini',
                temperature=0.7,
                max_tokens=800
            )
        except Exception as ai_error:
            logger.error(f"Ошибка AI провайдера: {ai_error}")
            # Возвращаем умный fallback ответ на основе сообщения пользователя
            fallback_response = generate_fallback_response(message)
            ai_response = {
                'content': fallback_response['message'],
                'provider_used': 'fallback'
            }
            buttons = fallback_response.get('buttons')
        
        response_text = ai_response.get('content', '')
        logger.info(f"Получен ответ от AI: {response_text[:50]}...")
        
        # Проверяем, есть ли в ответе JSON с кнопками (только для реальных AI ответов)
        if ai_response.get('provider_used') != 'fallback' and 'buttons' not in locals():
            buttons = None
            try:
                # Ищем JSON в ответе
                if '{' in response_text and '}' in response_text:
                    json_start = response_text.find('{')
                    json_end = response_text.rfind('}') + 1
                    json_part = response_text[json_start:json_end]
                    
                    parsed_json = json.loads(json_part)
                    if 'message' in parsed_json and 'buttons' in parsed_json:
                        response_text = parsed_json['message']
                        buttons = parsed_json['buttons']
                        logger.info(f"Найдены кнопки в ответе: {len(buttons)} кнопок")
            except json.JSONDecodeError:
                # Если JSON невалидный, просто используем текст как есть
                pass
            
            # Если OpenAI не вернул кнопки, добавляем базовые кнопки
            if not buttons and ai_response.get('provider_used') == 'openai':
                buttons = [
                    {"label": "Создать бота", "url": "/dashboard"},
                    {"label": "Посмотреть тарифы", "url": "/pricing"},
                    {"label": "Техподдержка", "action": "form:request"}
                ]
        
        # Добавляем ответ ассистента в историю
        session_context['messages'].append({
            'role': 'assistant',
            'content': response_text,
            'timestamp': datetime.utcnow().isoformat(),
            'buttons': buttons
        })
        
        # Сохраняем диалог в базу данных для мониторинга
        try:
            # Ищем существующий диалог для этого session_id
            dialog = db.query(models.Dialog).filter(
                models.Dialog.guest_id == session_id
            ).order_by(models.Dialog.started_at.desc()).first()
            
            # Если диалог не найден, создаем новый
            if not dialog or dialog.ended_at is not None:
                admin_user = db.query(models.User).filter(models.User.role == 'admin').first()
                if not admin_user:
                    admin_user = db.query(models.User).first()
                
                if admin_user:
                    dialog = models.Dialog(
                        user_id=admin_user.id,
                        guest_id=session_id,
                        started_at=datetime.utcnow(),
                        auto_response=1,  # Помечаем как AI диалог
                        fallback=0,
                        is_taken_over=0
                    )
                    db.add(dialog)
                    db.commit()
                    db.refresh(dialog)
            
            # Сохраняем сообщения в базу
            if dialog:
                # Сохраняем сообщение пользователя
                user_message = models.DialogMessage(
                    dialog_id=dialog.id,
                    sender='user',
                    text=message,
                    timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.utcnow()
                )
                db.add(user_message)
                
                # Сохраняем ответ ассистента
                ai_message = models.DialogMessage(
                    dialog_id=dialog.id,
                    sender='assistant',
                    text=response_text,
                    timestamp=datetime.utcnow()
                )
                db.add(ai_message)
                
                db.commit()
                
        except Exception as db_error:
            logger.error(f"Ошибка сохранения в БД: {db_error}")
            # Не останавливаем выполнение из-за ошибки БД
        
        return {
            "message": response_text,
            "buttons": buttons,
            "provider_used": ai_response.get('provider_used', 'unknown'),
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Ошибка в AI чате: {e}")
        
        # Возвращаем fallback ответ
        return {
            "message": "Извините, произошла техническая ошибка. Попробуйте задать вопрос позже или обратитесь в техническую поддержку.",
            "buttons": [
                {"label": "Техподдержка", "action": "form:request"},
                {"label": "Главная страница", "url": "/"}
            ],
            "error": True
        }


@router.get('/ai/session/{session_id}')
def get_session_info(session_id: str):
    """
    Получение информации о сессии
    """
    try:
        session_context = session_contexts.get(session_id)
        if not session_context:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session_id,
            "created_at": session_context.get('created_at'),
            "last_activity": session_context.get('last_activity'),
            "messages_count": len(session_context.get('messages', []))
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения информации о сессии: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete('/ai/session/{session_id}')
def clear_session(session_id: str):
    """
    Очистка сессии
    """
    try:
        if session_id in session_contexts:
            del session_contexts[session_id]
            logger.info(f"Сессия {session_id} очищена")
        
        return {"success": True, "message": "Session cleared"}
        
    except Exception as e:
        logger.error(f"Ошибка очистки сессии: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get('/ai/debug')
def debug_ai_status():
    """
    Debug информация о состоянии AI системы
    """
    import os
    from dotenv import load_dotenv
    from ai.ai_providers import get_available_providers, get_provider_status
    
    # Принудительно перезагружаем .env
    load_dotenv(override=True)
    
    return {
        "openai_key_set": bool(os.getenv('OPENAI_API_KEY')),
        "openai_key_length": len(os.getenv('OPENAI_API_KEY', '')),
        "available_providers": get_available_providers(),
        "provider_status": get_provider_status(),
        "session_count": len(session_contexts)
    }


@router.post('/ai/reload-config')
def reload_ai_config():
    """
    Перезагрузка конфигурации AI провайдеров
    """
    try:
        import os
        from dotenv import load_dotenv
        from ai.ai_providers import ai_providers_manager
        
        # Перезагружаем переменные окружения
        load_dotenv(override=True)
        
        # Переинициализируем провайдеры
        ai_providers_manager.initialize_providers()
        
        return {
            "success": True,
            "message": "AI configuration reloaded",
            "openai_key_length": len(os.getenv('OPENAI_API_KEY', '')),
            "providers": list(ai_providers_manager.providers.keys())
        }
        
    except Exception as e:
        logger.error(f"Ошибка перезагрузки конфигурации: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post('/ai/clear-all-sessions')
def clear_all_sessions():
    """
    Очистка всех активных сессий
    """
    try:
        global session_contexts
        sessions_count = len(session_contexts)
        session_contexts.clear()
        
        return {
            "success": True,
            "message": f"Cleared {sessions_count} sessions",
            "remaining_sessions": len(session_contexts)
        }
        
    except Exception as e:
        logger.error(f"Ошибка очистки сессий: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")