#!/usr/bin/env python3
"""
Диагностика поиска embeddings для ассистента 15
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'backend'))

from database.connection import SessionLocal
from database import models
from services.embeddings_service import embeddings_service
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_embeddings_search_assistant_15():
    """Тестируем поиск embeddings для ассистента 15"""
    db = SessionLocal()

    try:
        USER_ID = 6
        ASSISTANT_ID = 15
        TEST_QUERY = "компания"  # Простой запрос из знаний

        logger.info(f"🔍 Тестируем поиск для ассистента {ASSISTANT_ID}")

        # 1. Проверяем embeddings в базе
        assistant_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID,
            models.KnowledgeEmbedding.assistant_id == ASSISTANT_ID
        ).all()

        logger.info(f"📊 Embeddings ассистента {ASSISTANT_ID}: {len(assistant_embeddings)}")
        for emb in assistant_embeddings:
            logger.info(f"   - ID {emb.id}: {emb.chunk_text[:50]}...")

        # 2. Попробуем поиск (если сервис embeddings работает)
        try:
            relevant_chunks = embeddings_service.search_relevant_chunks(
                query=TEST_QUERY,
                user_id=USER_ID,
                assistant_id=ASSISTANT_ID,
                top_k=5,
                min_similarity=0.1,
                include_qa=True,
                qa_limit=2,
                db=db
            )

            logger.info(f"✅ Поиск успешен: найдено {len(relevant_chunks)} chunks")
            for i, chunk in enumerate(relevant_chunks):
                logger.info(f"   {i+1}. Similarity: {chunk.get('similarity', 'N/A'):.3f}")
                logger.info(f"      Text: {chunk.get('text', '')[:100]}...")

        except Exception as e:
            logger.warning(f"⚠️ Поиск embeddings не удался: {e}")

        # 3. Проверяем system prompt ассистента
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == ASSISTANT_ID
        ).first()

        if assistant:
            logger.info(f"🤖 System prompt ассистента:")
            logger.info(f"   {assistant.system_prompt[:200]}...")

    finally:
        db.close()

if __name__ == "__main__":
    test_embeddings_search_assistant_15()