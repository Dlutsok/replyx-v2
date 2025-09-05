#!/usr/bin/env python3
"""
Исправление типа колонки embedding с text на vector
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_embedding_type():
    """Исправляем тип колонки embedding"""
    db = next(get_db())
    
    try:
        # Проверяем текущий тип колонки
        current_type = db.execute(text("""
            SELECT data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_embeddings' 
            AND column_name = 'embedding';
        """)).fetchone()
        
        print(f"Текущий тип колонки embedding: {current_type[0]}")
        
        # Проверяем, доступен ли тип vector
        has_vector = db.execute(text("""
            SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname='vector');
        """)).fetchone()[0]
        
        print(f"Тип vector доступен: {has_vector}")
        
        if has_vector and current_type[0] != 'vector':
            print("Исправляем тип колонки embedding...")
            
            # Получаем пример данных для проверки формата
            sample = db.execute(text("""
                SELECT embedding FROM knowledge_embeddings LIMIT 1;
            """)).fetchone()
            
            if sample:
                print(f"Пример данных: {sample[0][:100]}...")
                
                # Преобразуем тип колонки
                # PostgreSQL массив типа {1,2,3} можно привести к vector
                db.execute(text("""
                    ALTER TABLE knowledge_embeddings 
                    ALTER COLUMN embedding TYPE vector(1536) 
                    USING embedding::text::vector;
                """))
                
                print("✅ Тип колонки embedding изменен на vector(1536)")
                
                # Создаем индекс для векторного поиска, если его нет
                try:
                    db.execute(text("""
                        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_knowledge_embeddings_embedding_cosine 
                        ON knowledge_embeddings 
                        USING ivfflat (embedding vector_cosine_ops) 
                        WITH (lists = 100);
                    """))
                    print("✅ Создан индекс для векторного поиска")
                except Exception as e:
                    print(f"⚠️ Не удалось создать индекс: {e}")
                
                db.commit()
                
        elif current_type[0] == 'vector':
            print("✅ Тип колонки уже vector")
        else:
            print("❌ Тип vector недоступен в PostgreSQL")
            
        # Проверяем результат
        new_type = db.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_embeddings' 
            AND column_name = 'embedding';
        """)).fetchone()
        
        print(f"Новый тип колонки embedding: {new_type[0]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_embedding_type()