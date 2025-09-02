#!/usr/bin/env python3
"""
Отладка условия Vector в embeddings_service
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from pgvector.sqlalchemy import Vector
    print(f"Vector импортирован: {Vector}")
    print(f"Vector is not None: {Vector is not None}")
    print(f"bool(Vector): {bool(Vector)}")
except Exception as e:
    print(f"Ошибка импорта Vector: {e}")
    Vector = None

print(f"Условие 'if Vector:' будет: {bool(Vector)}")

# Проверим какой блок выполняется
from database.connection import get_db
from services.embeddings_service import EmbeddingsService

db = next(get_db())
embeddings_service = EmbeddingsService()

print("Тестируем search_relevant_qa...")
try:
    result = embeddings_service.search_relevant_qa(
        query="тест",
        user_id=1,
        assistant_id=117,
        top_k=1,
        db=db
    )
    print(f"Результат: {len(result)} записей")
except Exception as e:
    print(f"Ошибка: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()