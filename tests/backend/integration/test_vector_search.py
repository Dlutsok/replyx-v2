#!/usr/bin/env python3
"""
Тестирование векторного поиска после исправления типа колонки
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from sqlalchemy import text
from services.embeddings_service import EmbeddingsService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_vector_search():
    """Тестируем векторный поиск Q&A"""
    db = next(get_db())
    embeddings_service = EmbeddingsService()
    
    try:
        print("=== ТЕСТ ВЕКТОРНОГО ПОИСКА Q&A ===")
        
        # Тестируем поиск с запросом о времени работы
        test_query = "Время работы?"
        test_user_id = 1
        test_assistant_id = 117
        print(f"Поисковый запрос: '{test_query}'")
        print(f"Пользователь: {test_user_id}, Ассистент: {test_assistant_id}")
        
        # Используем прямой SQL для получения результатов
        # Генерируем embedding для запроса
        query_embedding = embeddings_service.generate_embedding(test_query, user_id=1)
        print(f"Embedding сгенерирован: {len(query_embedding)} dimensions")
        
        # Выполняем прямой векторный поиск через SQL
        # Конвертируем список в строку в формате pgvector
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        results = db.execute(text("""
            SELECT DISTINCT
                ke.qa_id,
                qk.question,
                qk.answer,
                qk.importance,
                MIN(ke.embedding <=> :query_embedding::vector) as distance
            FROM knowledge_embeddings ke
            JOIN qa_knowledge qk ON ke.qa_id = qk.id  
            WHERE ke.qa_id IS NOT NULL 
            AND qk.user_id = :user_id 
            AND (ke.assistant_id = :assistant_id OR ke.assistant_id IS NULL)
            AND qk.is_active = true
            GROUP BY ke.qa_id, qk.question, qk.answer, qk.importance
            ORDER BY MIN(ke.embedding <=> :query_embedding::vector)
            LIMIT 5;
        """), {"query_embedding": embedding_str, "user_id": test_user_id, "assistant_id": test_assistant_id}).fetchall()
        
        print(f"\n=== НАЙДЕНО РЕЗУЛЬТАТОВ: {len(results)} ===")
        
        for i, result in enumerate(results, 1):
            print(f"{i}. Q&A ID: {result[0]}")
            print(f"   Вопрос: {result[1]}")
            print(f"   Ответ: {result[2]}")
            print(f"   Важность: {result[3]}")
            print(f"   Расстояние: {result[4]:.4f}")
            print(f"   Сходство: {1 - result[4]:.4f}")
            print("--" * 30)
        
        # Также протестируем через сервис embeddings
        print("\n=== ТЕСТ ЧЕРЕЗ EMBEDDINGS SERVICE ===")
        try:
            qa_results = embeddings_service.search_relevant_qa(
                query=test_query,
                user_id=test_user_id,
                assistant_id=test_assistant_id,
                top_k=5,
                db=db
            )
            
            print(f"Результаты через сервис: {len(qa_results)} найдено")
            for qa in qa_results:
                print(f"- {qa['question']} -> {qa['answer']} (similarity: {qa.get('similarity', 'N/A')})")
                
        except Exception as e:
            print(f"Ошибка в embeddings service: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"Ошибка теста: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_vector_search()