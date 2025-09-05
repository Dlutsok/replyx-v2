#!/usr/bin/env python3
"""
Проверка содержимого поля embedding
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from sqlalchemy import text
import json

def check_embedding_content():
    """Проверяем что хранится в поле embedding"""
    db = next(get_db())
    
    try:
        # Получаем одну Q&A embedding запись
        result = db.execute(text("""
            SELECT id, qa_id, chunk_text, embedding, LENGTH(embedding) as emb_length
            FROM knowledge_embeddings 
            WHERE qa_id = 5 
            LIMIT 1;
        """)).fetchone()
        
        if result:
            print(f"ID: {result[0]}")
            print(f"QA ID: {result[1]}")
            print(f"Text: {result[2]}")
            print(f"Embedding length: {result[4]}")
            print(f"Embedding preview (first 100 chars): {result[3][:100]}...")
            
            # Попробуем парсить как JSON
            try:
                embedding_data = json.loads(result[3])
                print(f"Embedding as JSON - type: {type(embedding_data)}")
                print(f"Embedding as JSON - length: {len(embedding_data) if isinstance(embedding_data, list) else 'not a list'}")
                if isinstance(embedding_data, list) and len(embedding_data) > 0:
                    print(f"First few values: {embedding_data[:5]}")
                    print(f"Data type of values: {type(embedding_data[0])}")
            except Exception as e:
                print(f"Cannot parse as JSON: {e}")
                
        else:
            print("No Q&A embeddings found")
        
        # Проверим, есть ли pgvector расширение
        pgvector_check = db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            );
        """)).fetchone()
        
        print(f"\nPgvector extension installed: {pgvector_check[0]}")
        
        # Проверим версию PostgreSQL
        pg_version = db.execute(text("SELECT version();")).fetchone()
        print(f"PostgreSQL version: {pg_version[0]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_embedding_content()