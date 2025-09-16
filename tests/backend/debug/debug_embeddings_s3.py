#!/usr/bin/env python3
"""
Скрипт для диагностики проблем с embeddings после перехода на S3
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

def diagnose_embeddings_issue():
    """Диагностика проблем с embeddings"""
    db = SessionLocal()

    try:
        # Тестовые данные - замените на реальные значения из вашей системы
        USER_ID = 6  # ID пользователя из логов
        ASSISTANT_ID = 3  # ID ассистента из логов
        TEST_QUERY = "инструкция"  # Тестовый запрос

        logger.info(f"🔬 [DIAGNOSIS] Starting diagnosis for user_id={USER_ID}, assistant_id={ASSISTANT_ID}")

        # 1. Проверяем количество embeddings в базе
        total_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID
        ).count()

        doc_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID,
            models.KnowledgeEmbedding.qa_id.is_(None)
        ).count()

        qa_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID,
            models.KnowledgeEmbedding.qa_id.isnot(None)
        ).count()

        assistant_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.user_id == USER_ID,
            models.KnowledgeEmbedding.assistant_id == ASSISTANT_ID
        ).count()

        logger.info(f"📊 Total embeddings: {total_embeddings}")
        logger.info(f"📊 Document embeddings: {doc_embeddings}")
        logger.info(f"📊 Q&A embeddings: {qa_embeddings}")
        logger.info(f"📊 Assistant {ASSISTANT_ID} embeddings: {assistant_embeddings}")

        # 2. Проверяем последние документы
        recent_docs = db.query(models.Document).filter(
            models.Document.user_id == USER_ID
        ).order_by(models.Document.upload_date.desc()).limit(5).all()

        logger.info(f"📄 Recent documents:")
        for doc in recent_docs:
            doc_embeddings_count = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.doc_id == doc.id
            ).count()
            logger.info(f"  - Doc {doc.id}: {doc.filename} ({doc_embeddings_count} embeddings)")

        # 3. Проверяем Q&A записи
        qa_records = db.query(models.QAKnowledge).filter(
            models.QAKnowledge.user_id == USER_ID,
            models.QAKnowledge.is_active == True
        ).count()

        logger.info(f"❓ Active Q&A records: {qa_records}")

        # 4. Тестируем поиск embeddings
        logger.info(f"🔍 Testing embeddings search with query: '{TEST_QUERY}'")

        try:
            # Тест поиска с assistant_id
            chunks_with_assistant = embeddings_service.search_relevant_chunks(
                query=TEST_QUERY,
                user_id=USER_ID,
                assistant_id=ASSISTANT_ID,
                top_k=5,
                min_similarity=0.1,  # Низкий порог для диагностики
                db=db
            )

            logger.info(f"✅ Search with assistant_id={ASSISTANT_ID}: {len(chunks_with_assistant)} chunks found")

            # Тест поиска без assistant_id
            chunks_without_assistant = embeddings_service.search_relevant_chunks(
                query=TEST_QUERY,
                user_id=USER_ID,
                assistant_id=None,
                top_k=5,
                min_similarity=0.1,
                db=db
            )

            logger.info(f"✅ Search without assistant_id: {len(chunks_without_assistant)} chunks found")

            # Тест поиска с Q&A
            chunks_with_qa = embeddings_service.search_relevant_chunks(
                query=TEST_QUERY,
                user_id=USER_ID,
                assistant_id=ASSISTANT_ID,
                top_k=3,
                min_similarity=0.1,
                include_qa=True,
                qa_limit=2,
                db=db
            )

            logger.info(f"✅ Search with Q&A included: {len(chunks_with_qa)} chunks found")

            # Вывод первых найденных chunks для анализа
            if chunks_with_assistant:
                logger.info("🔍 Sample chunks found with assistant_id:")
                for i, chunk in enumerate(chunks_with_assistant[:2]):
                    logger.info(f"  {i+1}. Similarity: {chunk.get('similarity', 'N/A'):.3f}, Type: {chunk.get('doc_type', 'N/A')}")
                    logger.info(f"     Text: {chunk.get('text', '')[:100]}...")

        except Exception as e:
            logger.error(f"❌ Search test failed: {e}", exc_info=True)

        # 5. Проверяем ассистента
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == ASSISTANT_ID,
            models.Assistant.user_id == USER_ID
        ).first()

        if assistant:
            logger.info(f"🤖 Assistant {ASSISTANT_ID}: knowledge_version={assistant.knowledge_version}")
        else:
            logger.warning(f"❌ Assistant {ASSISTANT_ID} not found!")

        # 6. Проверяем записи UserKnowledge
        user_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.user_id == USER_ID,
            models.UserKnowledge.assistant_id == ASSISTANT_ID
        ).count()

        logger.info(f"🧠 UserKnowledge records for assistant {ASSISTANT_ID}: {user_knowledge}")

    finally:
        db.close()

if __name__ == "__main__":
    diagnose_embeddings_issue()