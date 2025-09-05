#!/usr/bin/env python3
"""
Проверка embeddings в базе данных напрямую через SQL
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)

def check_embeddings_db():
    """Проверяем embeddings напрямую через SQL"""
    db = next(get_db())
    
    try:
        # Проверяем структуру таблицы knowledge_embeddings
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_embeddings' 
            ORDER BY ordinal_position;
        """)).fetchall()
        
        print("=== СТРУКТУРА ТАБЛИЦЫ knowledge_embeddings ===")
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
        
        # Проверяем количество записей
        count_result = db.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN qa_id IS NOT NULL THEN 1 END) as qa_count,
                COUNT(CASE WHEN doc_id IS NOT NULL THEN 1 END) as doc_count
            FROM knowledge_embeddings;
        """)).fetchone()
        
        print(f"\n=== КОЛИЧЕСТВО ЗАПИСЕЙ ===")
        print(f"  Всего embeddings: {count_result[0]}")
        print(f"  Q&A embeddings: {count_result[1]}")
        print(f"  Document embeddings: {count_result[2]}")
        
        # Проверяем Q&A embeddings для пользователя 1
        qa_embeddings = db.execute(text("""
            SELECT 
                ke.id, ke.qa_id, ke.user_id, ke.assistant_id, 
                ke.chunk_text, ke.doc_type, ke.source, ke.importance,
                qa.question, qa.answer
            FROM knowledge_embeddings ke
            LEFT JOIN qa_knowledge qa ON ke.qa_id = qa.id
            WHERE ke.user_id = 1 AND ke.qa_id IS NOT NULL
            LIMIT 10;
        """)).fetchall()
        
        print(f"\n=== Q&A EMBEDDINGS ДЛЯ ПОЛЬЗОВАТЕЛЯ 1 ===")
        for row in qa_embeddings:
            print(f"  ID: {row[0]}, QA_ID: {row[1]}, Text: {row[4][:50]}...")
            print(f"    Question: {row[8]}")
            print(f"    Answer: {row[9]}")
            print(f"    Importance: {row[7]}")
            print("  " + "-"*50)
        
        # Простой поиск по тексту (без векторов)
        text_search = db.execute(text("""
            SELECT ke.id, ke.chunk_text, ke.importance, qa.question, qa.answer
            FROM knowledge_embeddings ke
            LEFT JOIN qa_knowledge qa ON ke.qa_id = qa.id
            WHERE ke.user_id = 1 
            AND ke.qa_id IS NOT NULL
            AND (ke.chunk_text ILIKE '%время%' OR qa.question ILIKE '%время%')
        """)).fetchall()
        
        print(f"\n=== ПОИСК ПО ТЕКСТУ 'ВРЕМЯ' ===")
        for row in text_search:
            print(f"  ID: {row[0]}, Chunk: {row[1]}")
            print(f"  Question: {row[3]}, Answer: {row[4]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_embeddings_db()