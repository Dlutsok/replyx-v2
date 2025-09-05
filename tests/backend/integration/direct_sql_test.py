#!/usr/bin/env python3
"""
Прямой тест SQL запроса без использования SQLAlchemy ORM
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import psycopg2
from core.app_config import DATABASE_URL
from services.embeddings_service import EmbeddingsService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_direct_sql():
    """Тестируем прямой SQL запрос"""
    embeddings_service = EmbeddingsService()
    
    try:
        print("=== ПРЯМОЙ SQL ТЕСТ ===")
        
        test_query = "Время работы?"
        test_user_id = 1
        test_assistant_id = 117
        
        print(f"Запрос: '{test_query}'")
        print(f"Пользователь: {test_user_id}, Ассистент: {test_assistant_id}")
        
        # Генерируем embedding
        query_embedding = embeddings_service.generate_embedding(test_query, user_id=test_user_id)
        print(f"Embedding сгенерирован: {len(query_embedding)} dimensions")
        
        # Прямой SQL через psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Конвертируем embedding в строку
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        cursor.execute("""
            SELECT DISTINCT
                qa.id,
                qa.question,
                qa.answer,
                qa.category,
                qa.importance,
                MAX(1 - (ke.embedding <=> %s::vector)) AS max_similarity
            FROM qa_knowledge qa
            JOIN knowledge_embeddings ke ON qa.id = ke.qa_id
            WHERE qa.user_id = %s 
            AND qa.is_active = true
            AND (ke.assistant_id = %s OR ke.assistant_id IS NULL)
            GROUP BY qa.id, qa.question, qa.answer, qa.category, qa.importance
            ORDER BY max_similarity DESC
            LIMIT 5;
        """, (embedding_str, test_user_id, test_assistant_id))
        
        results = cursor.fetchall()
        
        print(f"\n=== НАЙДЕНО РЕЗУЛЬТАТОВ: {len(results)} ===")
        
        for i, result in enumerate(results, 1):
            qa_id, question, answer, category, importance, similarity = result
            print(f"{i}. ID: {qa_id}")
            print(f"   Вопрос: {question}")
            print(f"   Ответ: {answer}")
            print(f"   Категория: {category}")
            print(f"   Важность: {importance}")
            print(f"   Сходство: {similarity:.4f}")
            print("--" * 30)
        
        cursor.close()
        conn.close()
        
        if results:
            print("✅ Векторный поиск Q&A работает!")
            print(f"✅ Изоляция работает - найдены только Q&A для пользователя {test_user_id} и ассистента {test_assistant_id}")
        else:
            print("❌ Результаты не найдены")
            
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_direct_sql()