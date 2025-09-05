#!/usr/bin/env python3
"""
Правильное преобразование PostgreSQL массива в pgvector
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_embedding_conversion():
    """Правильно преобразуем PostgreSQL массив в pgvector формат"""
    db = next(get_db())
    
    try:
        print("Преобразуем PostgreSQL массив {1,2,3} в pgvector формат [1,2,3]...")
        
        # Сначала преобразуем текст без приведения типа
        result = db.execute(text("""
            UPDATE knowledge_embeddings 
            SET embedding = '[' || substring(embedding from 2 for length(embedding)-2) || ']'
            WHERE embedding::text LIKE '{%}';
        """))
        
        rows_updated = result.rowcount
        print(f"✅ Обновлено {rows_updated} записей")
        
        db.commit()
        
        # Теперь изменим тип колонки с указанием как приводить
        print("Изменяем тип колонки на vector(1536)...")
        
        db.execute(text("""
            ALTER TABLE knowledge_embeddings 
            ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536);
        """))
        
        print("✅ Тип колонки изменен на vector(1536)")
        
        # Создаем индекс для векторного поиска
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
        
        # Проверяем результат
        sample = db.execute(text("""
            SELECT embedding FROM knowledge_embeddings LIMIT 1;
        """)).fetchone()
        
        if sample:
            print(f"Пример результата: {str(sample[0])[:100]}...")
        
        # Проверяем новый тип
        new_type = db.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_embeddings' 
            AND column_name = 'embedding';
        """)).fetchone()
        
        print(f"✅ Финальный тип колонки: {new_type[0]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_embedding_conversion()