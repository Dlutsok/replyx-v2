#!/usr/bin/env python3
"""
Исправления N+1 queries в ChatAI MVP 9
Этот файл содержит оптимизированные версии функций для замены в API
"""

from sqlalchemy.orm import Session, joinedload, selectinload, contains_eager
from sqlalchemy import func, distinct
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

# Импорты моделей (для примера)
# from database import models

def get_assistants_stats_optimized(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Оптимизированная статистика ассистентов БЕЗ N+1 queries
    
    ❌ БЫЛО: 1 + N запросов (по количеству ассистентов)
    ✅ СТАЛО: 2-3 запроса total
    """
    
    # Получаем все ассистенты одним запросом
    assistants = db.query(models.Assistant).filter(
        models.Assistant.user_id == user_id
    ).all()
    
    if not assistants:
        return {
            "global": {
                "totalAssistants": 0,
                "activeAssistants": 0,
                "totalMessages": 0,
                "totalDialogs": 0
            },
            "byAssistant": []
        }
    
    assistant_ids = [a.id for a in assistants]
    month_ago = datetime.utcnow() - timedelta(days=30)
    
    # Одним запросом получаем статистики по всем ассистентам
    stats_query = db.query(
        models.Dialog.assistant_id,
        func.count(distinct(models.Dialog.id)).label('dialogs_count'),
        func.count(models.DialogMessage.id).label('messages_count')
    ).outerjoin(
        models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
    ).filter(
        models.Dialog.assistant_id.in_(assistant_ids),
        models.Dialog.started_at >= month_ago,
        models.DialogMessage.sender == 'assistant'
    ).group_by(models.Dialog.assistant_id).all()
    
    # Создаем lookup для быстрого доступа к статистикам
    stats_lookup = {stat.assistant_id: stat for stat in stats_query}
    
    # Формируем результат
    total_messages = 0
    total_dialogs = 0
    active_assistants = 0
    assistant_stats = []
    
    for assistant in assistants:
        if assistant.is_active:
            active_assistants += 1
        
        stats = stats_lookup.get(assistant.id)
        messages_count = stats.messages_count if stats else 0
        dialogs_count = stats.dialogs_count if stats else 0
        
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
            "totalAssistants": len(assistants),
            "activeAssistants": active_assistants,
            "totalMessages": total_messages,
            "totalDialogs": total_dialogs
        },
        "byAssistant": assistant_stats
    }


def list_assistant_dialogs_optimized(db: Session, assistant_id: int, user_id: int) -> List[Dict[str, Any]]:
    """
    Оптимизированная загрузка диалогов ассистента
    
    ❌ БЫЛО: 1 + N запросов для подсчета сообщений в каждом диалоге
    ✅ СТАЛО: 1 запрос с агрегацией
    """
    
    # Один запрос с JOIN и агрегацией для получения всех данных
    dialogs_with_stats = db.query(
        models.Dialog,
        func.count(models.DialogMessage.id).label('message_count'),
        func.max(models.DialogMessage.timestamp).label('last_message_at')
    ).outerjoin(
        models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id
    ).filter(
        models.Dialog.user_id == user_id,
        models.Dialog.assistant_id == assistant_id
    ).group_by(
        models.Dialog.id
    ).order_by(
        models.Dialog.started_at.desc()
    ).all()
    
    dialogs_data = []
    for dialog, message_count, last_message_at in dialogs_with_stats:
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


def list_assistant_documents_optimized(db: Session, assistant_id: int, user_id: int) -> List[Dict[str, Any]]:
    """
    Оптимизированная загрузка документов ассистента с eager loading
    
    ❌ БЫЛО: 1 + N запросов для загрузки каждого документа
    ✅ СТАЛО: 1 запрос с JOIN
    """
    
    # Используем JOIN вместо подзапроса и сразу загружаем связанные данные
    documents = db.query(
        models.Document
    ).join(
        models.UserKnowledge, models.Document.id == models.UserKnowledge.doc_id
    ).filter(
        models.UserKnowledge.user_id == user_id,
        models.UserKnowledge.assistant_id == assistant_id,
        models.Document.user_id == user_id
    ).order_by(
        models.Document.upload_date.desc()
    ).distinct().all()  # DISTINCT чтобы избежать дублей
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "size": doc.size,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
            "doc_hash": doc.doc_hash
        }
        for doc in documents
    ]


def get_user_dialogs_with_messages_optimized(db: Session, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Оптимизированная загрузка диалогов пользователя с последними сообщениями
    
    ❌ БЫЛО: 1 + N + M запросов (диалоги + ассистенты + сообщения)
    ✅ СТАЛО: 2 запроса с eager loading
    """
    
    # 1. Загружаем диалоги с eager loading ассистентов
    dialogs = db.query(models.Dialog).options(
        joinedload(models.Dialog.assistant)
    ).filter(
        models.Dialog.user_id == user_id
    ).order_by(
        models.Dialog.started_at.desc()
    ).limit(limit).all()
    
    if not dialogs:
        return []
    
    dialog_ids = [d.id for d in dialogs]
    
    # 2. Одним запросом получаем последние сообщения для всех диалогов
    # Используем window function для получения последнего сообщения в каждом диалоге
    last_messages_subq = db.query(
        models.DialogMessage,
        func.row_number().over(
            partition_by=models.DialogMessage.dialog_id,
            order_by=models.DialogMessage.timestamp.desc()
        ).label('rn')
    ).filter(
        models.DialogMessage.dialog_id.in_(dialog_ids)
    ).subquery()
    
    last_messages = db.query(
        last_messages_subq
    ).filter(
        last_messages_subq.c.rn == 1
    ).all()
    
    # Создаем lookup для быстрого доступа к последним сообщениям
    messages_lookup = {msg.dialog_id: msg for msg in last_messages}
    
    # Формируем результат
    result = []
    for dialog in dialogs:
        last_message = messages_lookup.get(dialog.id)
        
        result.append({
            "id": dialog.id,
            "assistant_name": dialog.assistant.name if dialog.assistant else "Неизвестно",
            "assistant_id": dialog.assistant_id,
            "started_at": dialog.started_at.isoformat() if dialog.started_at else None,
            "ended_at": dialog.ended_at.isoformat() if dialog.ended_at else None,
            "last_message": {
                "text": last_message.text[:100] + "..." if last_message and len(last_message.text) > 100 else last_message.text if last_message else None,
                "timestamp": last_message.timestamp.isoformat() if last_message else None,
                "sender": last_message.sender if last_message else None
            } if last_message else None
        })
    
    return result


def get_embeddings_for_search_optimized(db: Session, assistant_id: int, query_vector: List[float], limit: int = 10) -> List[Dict[str, Any]]:
    """
    Оптимизированный поиск эмбеддингов с pre-filtering
    
    ❌ БЫЛО: Векторный поиск по всем эмбеддингам без фильтрации
    ✅ СТАЛО: Pre-filter + векторный поиск только по релевантным записям
    """
    
    # Используем составной индекс для pre-filtering
    # Сначала фильтруем по assistant_id и importance, затем векторный поиск
    results = db.query(
        models.KnowledgeEmbedding.chunk_text,
        models.KnowledgeEmbedding.importance,
        models.KnowledgeEmbedding.doc_type,
        models.KnowledgeEmbedding.embedding.cosine_distance(query_vector).label('distance')
    ).filter(
        models.KnowledgeEmbedding.assistant_id == assistant_id,
        models.KnowledgeEmbedding.importance >= 5  # Только важные чанки
    ).order_by(
        models.KnowledgeEmbedding.embedding.cosine_distance(query_vector)
    ).limit(limit * 2).all()  # Берем больше для последующего re-ranking
    
    # Re-ranking по комбинации distance и importance
    weighted_results = []
    for chunk_text, importance, doc_type, distance in results:
        # Комбинируем векторное сходство с важностью
        score = (1 - distance) * 0.7 + (importance / 10) * 0.3
        weighted_results.append({
            "chunk_text": chunk_text,
            "distance": distance,
            "importance": importance,
            "doc_type": doc_type,
            "score": score
        })
    
    # Сортируем по итоговому скору и возвращаем топ результатов
    weighted_results.sort(key=lambda x: x['score'], reverse=True)
    return weighted_results[:limit]


def get_bot_instances_with_assistants_optimized(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Оптимизированная загрузка ботов с ассистентами
    
    ❌ БЫЛО: 1 + N запросов для загрузки данных каждого ассистента
    ✅ СТАЛО: 1 запрос с JOIN
    """
    
    # Один запрос с JOIN для загрузки ботов и ассистентов
    bots_with_assistants = db.query(
        models.BotInstance,
        models.Assistant.name.label('assistant_name'),
        models.Assistant.ai_model.label('assistant_ai_model'),
        models.Assistant.is_active.label('assistant_is_active')
    ).join(
        models.Assistant, models.BotInstance.assistant_id == models.Assistant.id
    ).filter(
        models.BotInstance.user_id == user_id,
        models.BotInstance.is_active == True
    ).order_by(
        models.BotInstance.created_at.desc()
    ).all()
    
    result = []
    for bot, assistant_name, assistant_ai_model, assistant_is_active in bots_with_assistants:
        result.append({
            "id": bot.id,
            "platform": bot.platform,
            "is_active": bot.is_active,
            "created_at": bot.created_at.isoformat() if bot.created_at else None,
            "assistant": {
                "id": bot.assistant_id,
                "name": assistant_name,
                "ai_model": assistant_ai_model,
                "is_active": assistant_is_active
            }
        })
    
    return result


def get_user_balance_with_transactions_optimized(db: Session, user_id: int, limit: int = 10) -> Dict[str, Any]:
    """
    Оптимизированная загрузка баланса с историей транзакций
    
    ❌ БЫЛО: Отдельные запросы для баланса и транзакций
    ✅ СТАЛО: Параллельная загрузка с использованием индексов
    """
    
    # Используем один запрос для получения баланса и подсчета транзакций
    balance_info = db.query(
        models.UserBalance.balance,
        models.UserBalance.total_spent,
        models.UserBalance.total_topped_up,
        func.count(models.BalanceTransaction.id).label('transactions_count')
    ).outerjoin(
        models.BalanceTransaction, models.UserBalance.user_id == models.BalanceTransaction.user_id
    ).filter(
        models.UserBalance.user_id == user_id
    ).group_by(
        models.UserBalance.user_id,
        models.UserBalance.balance,
        models.UserBalance.total_spent,
        models.UserBalance.total_topped_up
    ).first()
    
    if not balance_info:
        return {"balance": 0, "transactions": []}
    
    # Отдельно загружаем последние транзакции (с оптимизированным индексом)
    recent_transactions = db.query(models.BalanceTransaction).filter(
        models.BalanceTransaction.user_id == user_id
    ).order_by(
        models.BalanceTransaction.created_at.desc()
    ).limit(limit).all()
    
    return {
        "balance": balance_info.balance,
        "total_spent": balance_info.total_spent,
        "total_topped_up": balance_info.total_topped_up,
        "transactions_count": balance_info.transactions_count,
        "recent_transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "transaction_type": t.transaction_type,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in recent_transactions
        ]
    }


# ===========================================
# МОНИТОРИНГ N+1 QUERIES
# ===========================================

class N1QueryDetector:
    """Декоратор для детекции N+1 queries"""
    
    def __init__(self):
        self.query_count = 0
        self.queries = []
    
    def __call__(self, func):
        def wrapper(*args, **kwargs):
            # Сбрасываем счетчик
            self.query_count = 0
            self.queries = []
            
            # Подключаемся к событиям SQLAlchemy
            from sqlalchemy import event
            from sqlalchemy.engine import Engine
            
            @event.listens_for(Engine, "before_cursor_execute")
            def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                self.query_count += 1
                self.queries.append(statement)
            
            # Выполняем функцию
            result = func(*args, **kwargs)
            
            # Проверяем на подозрительное количество запросов
            if self.query_count > 10:
                print(f"⚠️  POTENTIAL N+1: {func.__name__} executed {self.query_count} queries")
                print("Recent queries:")
                for query in self.queries[-5:]:
                    print(f"  {query}")
            
            return result
        
        return wrapper


# Примеры использования детектора
@N1QueryDetector()
def example_function_to_monitor(db: Session, user_id: int):
    """Пример функции для мониторинга N+1 queries"""
    assistants = db.query(models.Assistant).filter_by(user_id=user_id).all()
    for assistant in assistants:
        # Это вызовет N+1 если не использовать eager loading
        dialogs = assistant.dialogs  # N дополнительных запросов!
    
    return len(assistants)


# ===========================================
# РЕКОМЕНДАЦИИ ПО ПРИМЕНЕНИЮ
# ===========================================

"""
ИНСТРУКЦИЯ ПО ВНЕДРЕНИЮ ОПТИМИЗАЦИЙ:

1. ЗАМЕНА ФУНКЦИЙ В API:
   - Заменить существующие функции в api/assistants.py
   - Заменить функции в api/dialogs.py
   - Заменить функции в api/documents.py

2. ТЕСТИРОВАНИЕ:
   - Запустить load testing до и после изменений
   - Проверить корректность данных
   - Убедиться в отсутствии N+1 queries

3. МОНИТОРИНГ:
   - Использовать N1QueryDetector для проверки
   - Настроить алерты на количество SQL queries
   - Мониторить время ответа API

4. ИНДЕКСЫ:
   - Сначала создать все необходимые индексы
   - Дождаться завершения CONCURRENTLY операций
   - Проверить использование индексов

5. ОТКАТ:
   - Сохранить старые версии функций
   - Подготовить план отката
   - Тестировать на staging перед production

ОЖИДАЕМЫЕ УЛУЧШЕНИЯ:
- Сокращение SQL queries на 60-80%
- Ускорение API responses в 3-10 раз  
- Снижение нагрузки на БД в 5-15 раз
- Возможность масштабирования до 10k+ пользователей
"""