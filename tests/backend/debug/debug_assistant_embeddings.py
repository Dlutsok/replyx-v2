#!/usr/bin/env python3
"""
Скрипт для диагностики проблемы с embeddings ассистентов
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'backend'))

from database.connection import SessionLocal
from database import models
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def diagnose_assistant_embeddings():
    """Диагностика проблем с привязкой embeddings к ассистентам"""
    db = SessionLocal()

    try:
        USER_ID = 6  # ID пользователя из логов
        ASSISTANT_ID = 15  # ID ассистента из логов (новый ассистент)

        logger.info(f"🔬 [ASSISTANT_EMBEDDINGS] Диагностика ассистента {ASSISTANT_ID} пользователя {USER_ID}")

        # 1. Проверяем ассистента
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == ASSISTANT_ID,
            models.Assistant.user_id == USER_ID
        ).first()

        if assistant:
            logger.info(f"🤖 Ассистент найден: '{assistant.name}', active={assistant.is_active}")
            logger.info(f"   knowledge_version={assistant.knowledge_version}")
            logger.info(f"   created_at={assistant.created_at}")
        else:
            logger.error(f"❌ Ассистент {ASSISTANT_ID} не найден!")
            return

        # 2. Проверяем все embeddings пользователя
        all_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID
        ).all()

        logger.info(f"📊 Всего embeddings пользователя: {len(all_embeddings)}")

        # Группируем по assistant_id
        by_assistant = {}
        for emb in all_embeddings:
            aid = emb.assistant_id
            if aid not in by_assistant:
                by_assistant[aid] = []
            by_assistant[aid].append(emb)

        for assistant_id, embeddings in by_assistant.items():
            count = len(embeddings)
            if assistant_id is None:
                logger.info(f"   assistant_id=NULL: {count} embeddings")
            else:
                logger.info(f"   assistant_id={assistant_id}: {count} embeddings")

        # 3. Проверяем UserKnowledge записи
        user_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.user_id == USER_ID,
            models.UserKnowledge.assistant_id == ASSISTANT_ID
        ).all()

        logger.info(f"🧠 UserKnowledge записей для ассистента {ASSISTANT_ID}: {len(user_knowledge)}")
        for uk in user_knowledge:
            logger.info(f"   - {uk.doc_type}: {uk.content[:50]}...")

        # 4. Проверяем последние документы
        recent_docs = db.query(models.Document).filter(
            models.Document.user_id == USER_ID
        ).order_by(models.Document.upload_date.desc()).limit(5).all()

        logger.info(f"📄 Последние документы пользователя:")
        for doc in recent_docs:
            # Проверяем embeddings для каждого документа
            doc_embeddings = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.doc_id == doc.id
            ).all()

            logger.info(f"   Doc {doc.id}: {doc.filename}")
            logger.info(f"     Embeddings: {len(doc_embeddings)}")

            if doc_embeddings:
                assistant_ids = list(set(emb.assistant_id for emb in doc_embeddings))
                logger.info(f"     Assistant IDs: {assistant_ids}")

        # 5. Проверяем, есть ли связь между документами и ассистентом
        logger.info(f"\n🔍 ОСНОВНАЯ ПРОБЛЕМА:")
        logger.info(f"Проверяем, почему embeddings не привязаны к ассистенту {ASSISTANT_ID}")

        # Ищем документы, которые должны быть привязаны к ассистенту
        assistant_docs = db.query(models.Document).filter(
            models.Document.user_id == USER_ID,
            # Добавим фильтр по дате создания ассистента
        ).all()

        logger.info(f"📊 Анализ документов:")
        for doc in assistant_docs:
            doc_embeddings = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.doc_id == doc.id
            ).count()

            assistant_embeddings = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.doc_id == doc.id,
                models.KnowledgeEmbedding.assistant_id == ASSISTANT_ID
            ).count()

            if doc_embeddings > 0 and assistant_embeddings == 0:
                logger.warning(f"   ⚠️ Doc {doc.id} ({doc.filename}): {doc_embeddings} embeddings, но 0 для ассистента {ASSISTANT_ID}")

    finally:
        db.close()

if __name__ == "__main__":
    diagnose_assistant_embeddings()