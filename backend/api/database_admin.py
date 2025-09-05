from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text, and_, or_, desc, asc
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import json
import logging

from database.connection import get_db
from database import models
from core import auth
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# Маппинг имен таблиц на модели SQLAlchemy
TABLE_MODELS = {
    'users': models.User,
    'assistants': models.Assistant,
    'dialogs': models.Dialog,
    'dialog_messages': models.DialogMessage,
    'documents': models.Document,
    'knowledge_embeddings': models.KnowledgeEmbedding,
    'qa_knowledge': models.QAKnowledge,
    'user_knowledge': models.UserKnowledge,
    'bot_instances': models.BotInstance,
    'user_balances': models.UserBalance,
    'balance_transactions': models.BalanceTransaction,
    'ai_token_pool': models.AITokenPool,
    'ai_token_usage': models.AITokenUsage,
    'system_settings': models.SystemSettings,
    'handoff_audit': models.HandoffAudit,
    'operator_presence': models.OperatorPresence,
    'service_prices': models.ServicePrice,
    'integration_tokens': models.IntegrationToken,
    'telegram_tokens': models.TelegramToken,
    'openai_tokens': models.OpenAIToken,
    'query_embeddings_cache': models.QueryEmbeddingCache,
    'organization_features': models.OrganizationFeature,
    'training_datasets': models.TrainingDataset,
    'training_examples': models.TrainingExample,
    'conversation_patterns': models.ConversationPattern,
    'dialog_feedback': models.DialogFeedback,
    'dialog_ratings': models.DialogRating,
    'message_ratings': models.MessageRating,
}

# Pydantic модели для API
class TableDataRequest(BaseModel):
    page: int = 1
    limit: int = 20
    search: Optional[str] = None
    filter_field: Optional[str] = None
    filter_value: Optional[str] = None
    sort_field: Optional[str] = None
    sort_order: Optional[str] = "asc"

class RecordCreateRequest(BaseModel):
    data: Dict[str, Any]

class RecordUpdateRequest(BaseModel):
    data: Dict[str, Any]

def serialize_record(record, model_class) -> Dict[str, Any]:
    """Сериализация SQLAlchemy объекта в словарь"""
    result = {}
    
    # Получаем инспектор для модели
    inspector = inspect(model_class)
    
    for column in inspector.columns:
        value = getattr(record, column.name)
        
        # Обрабатываем специальные типы данных
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        elif isinstance(value, (list, dict)):
            result[column.name] = json.dumps(value) if value else None
        elif value is None:
            result[column.name] = None
        else:
            result[column.name] = str(value) if not isinstance(value, (int, float, bool)) else value
    
    return result

def get_table_model(table_name: str):
    """Получение модели SQLAlchemy по имени таблицы"""
    if table_name not in TABLE_MODELS:
        raise HTTPException(status_code=404, detail=f"Таблица {table_name} не найдена")
    return TABLE_MODELS[table_name]

@router.get("/admin/database/tables")
def get_tables_list(current_user: models.User = Depends(auth.get_current_admin)):
    """Получение списка всех доступных таблиц"""
    tables = []
    
    for table_name, model_class in TABLE_MODELS.items():
        inspector = inspect(model_class)
        tables.append({
            "name": table_name,
            "title": getattr(model_class, "__doc__", table_name.replace("_", " ").title()),
            "columns_count": len(inspector.columns.keys()),
            "has_relationships": len(inspector.relationships.keys()) > 0
        })
    
    return {"tables": tables}

@router.get("/admin/database/tables/{table_name}/schema")
def get_table_schema(table_name: str, current_user: models.User = Depends(auth.get_current_admin)):
    """Получение схемы таблицы"""
    model_class = get_table_model(table_name)
    inspector = inspect(model_class)
    
    columns = []
    for column in inspector.columns:
        column_info = {
            "name": column.name,
            "type": str(column.type),
            "nullable": column.nullable,
            "primary_key": column.primary_key,
            "foreign_key": len(column.foreign_keys) > 0,
            "unique": column.unique,
            "default": str(column.default) if column.default else None
        }
        columns.append(column_info)
    
    relationships = []
    for rel_name, rel in inspector.relationships.items():
        relationships.append({
            "name": rel_name,
            "target_table": rel.entity.class_.__tablename__,
            "foreign_key": str(rel.local_columns).replace("{", "").replace("}", "")
        })
    
    return {
        "table_name": table_name,
        "columns": columns,
        "relationships": relationships
    }

@router.post("/admin/database/tables/{table_name}/data")
def get_table_data(
    table_name: str,
    request: TableDataRequest,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Получение данных таблицы с пагинацией, поиском и фильтрацией"""
    try:
        model_class = get_table_model(table_name)
        query = db.query(model_class)
        
        # Поиск по тексту
        if request.search:
            search_conditions = []
            inspector = inspect(model_class)
            
            for column in inspector.columns:
                if str(column.type).lower() in ['text', 'string', 'varchar']:
                    search_conditions.append(getattr(model_class, column.name).ilike(f"%{request.search}%"))
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
        
        # Фильтрация по полю
        if request.filter_field and request.filter_value:
            if hasattr(model_class, request.filter_field):
                column = getattr(model_class, request.filter_field)
                column_type = str(column.type).lower()
                
                # Для числовых полей используем точное соответствие
                if 'integer' in column_type or 'bigint' in column_type:
                    try:
                        numeric_value = int(request.filter_value)
                        query = query.filter(column == numeric_value)
                    except ValueError:
                        # Если не удается преобразовать в число, пропускаем фильтр
                        pass
                elif 'float' in column_type or 'numeric' in column_type or 'decimal' in column_type:
                    try:
                        numeric_value = float(request.filter_value)
                        query = query.filter(column == numeric_value)
                    except ValueError:
                        # Если не удается преобразовать в число, пропускаем фильтр
                        pass
                else:
                    # Для строковых полей используем ILIKE
                    query = query.filter(column.ilike(f"%{request.filter_value}%"))
        
        # Сортировка
        if request.sort_field and hasattr(model_class, request.sort_field):
            column = getattr(model_class, request.sort_field)
            if request.sort_order == "desc":
                query = query.order_by(desc(column))
            else:
                query = query.order_by(asc(column))
        
        # Подсчет общего количества записей
        total_count = query.count()
        
        # Пагинация
        offset = (request.page - 1) * request.limit
        records = query.offset(offset).limit(request.limit).all()
        
        # Сериализация данных
        data = [serialize_record(record, model_class) for record in records]
        
        return {
            "data": data,
            "pagination": {
                "page": request.page,
                "limit": request.limit,
                "total": total_count,
                "pages": (total_count + request.limit - 1) // request.limit
            }
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения данных таблицы {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения данных: {str(e)}")

@router.post("/admin/database/tables/{table_name}/records")
def create_record(
    table_name: str,
    request: RecordCreateRequest,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Создание новой записи в таблице"""
    try:
        model_class = get_table_model(table_name)
        
        # Очистка данных от пустых строк и None значений для необязательных полей
        clean_data = {}
        inspector = inspect(model_class)
        
        for column_name, value in request.data.items():
            if hasattr(model_class, column_name):
                column = inspector.columns.get(column_name)
                if column:
                    if value == "" and column.nullable:
                        clean_data[column_name] = None
                    elif value is not None and value != "":
                        # Обработка типов данных
                        if str(column.type).lower().startswith('datetime'):
                            if isinstance(value, str):
                                try:
                                    clean_data[column_name] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                                except ValueError:
                                    clean_data[column_name] = datetime.fromisoformat(value)
                            else:
                                clean_data[column_name] = value
                        else:
                            clean_data[column_name] = value
        
        # Создание объекта
        new_record = model_class(**clean_data)
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        
        # Получение созданной записи
        serialized_record = serialize_record(new_record, model_class)
        
        logger.info(f"Администратор {current_user.email} создал запись в таблице {table_name}")
        
        return {
            "success": True,
            "message": "Запись успешно создана",
            "data": serialized_record
        }
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Ошибка целостности при создании записи в {table_name}: {e}")
        raise HTTPException(status_code=400, detail="Ошибка целостности данных. Проверьте уникальные поля и внешние ключи.")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Ошибка БД при создании записи в {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка создания записи в {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка создания записи: {str(e)}")

@router.put("/admin/database/tables/{table_name}/records/{record_id}")
def update_record(
    table_name: str,
    record_id: int,
    request: RecordUpdateRequest,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Обновление существующей записи"""
    try:
        model_class = get_table_model(table_name)
        
        # Находим запись
        record = db.query(model_class).filter(model_class.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        
        # Обновляем поля
        inspector = inspect(model_class)
        
        for column_name, value in request.data.items():
            if hasattr(record, column_name):
                column = inspector.columns.get(column_name)
                if column:
                    if value == "" and column.nullable:
                        setattr(record, column_name, None)
                    elif value is not None and value != "":
                        # Обработка типов данных
                        if str(column.type).lower().startswith('datetime'):
                            if isinstance(value, str):
                                try:
                                    setattr(record, column_name, datetime.fromisoformat(value.replace('Z', '+00:00')))
                                except ValueError:
                                    setattr(record, column_name, datetime.fromisoformat(value))
                            else:
                                setattr(record, column_name, value)
                        else:
                            setattr(record, column_name, value)
        
        db.commit()
        db.refresh(record)
        
        # Получение обновленной записи
        serialized_record = serialize_record(record, model_class)
        
        logger.info(f"Администратор {current_user.email} обновил запись {record_id} в таблице {table_name}")
        
        return {
            "success": True,
            "message": "Запись успешно обновлена",
            "data": serialized_record
        }
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Ошибка целостности при обновлении записи {record_id} в {table_name}: {e}")
        raise HTTPException(status_code=400, detail="Ошибка целостности данных. Проверьте уникальные поля и внешние ключи.")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Ошибка БД при обновлении записи {record_id} в {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка обновления записи {record_id} в {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка обновления записи: {str(e)}")

@router.delete("/admin/database/tables/{table_name}/records/{record_id}")
def delete_record(
    table_name: str,
    record_id: int,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Удаление записи"""
    try:
        model_class = get_table_model(table_name)
        
        # Находим запись
        record = db.query(model_class).filter(model_class.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        
        # Удаляем запись
        db.delete(record)
        db.commit()
        
        logger.info(f"Администратор {current_user.email} удалил запись {record_id} из таблицы {table_name}")
        
        return {
            "success": True,
            "message": "Запись успешно удалена"
        }
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Ошибка целостности при удалении записи {record_id} из {table_name}: {e}")
        raise HTTPException(status_code=400, detail="Невозможно удалить запись из-за связанных данных")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Ошибка БД при удалении записи {record_id} из {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка удаления записи {record_id} из {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка удаления записи: {str(e)}")

@router.get("/admin/database/tables/{table_name}/records/{record_id}")
def get_record(
    table_name: str,
    record_id: int,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Получение конкретной записи по ID"""
    try:
        model_class = get_table_model(table_name)
        
        record = db.query(model_class).filter(model_class.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        
        serialized_record = serialize_record(record, model_class)
        
        return {
            "success": True,
            "data": serialized_record
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения записи {record_id} из {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения записи: {str(e)}")

@router.get("/admin/database/stats")
def get_database_stats(current_user: models.User = Depends(auth.get_current_admin), db: Session = Depends(get_db)):
    """Получение общей статистики базы данных"""
    try:
        stats = {}
        
        for table_name, model_class in TABLE_MODELS.items():
            try:
                count = db.query(model_class).count()
                stats[table_name] = count
            except Exception as e:
                logger.error(f"Ошибка получения статистики для таблицы {table_name}: {e}")
                stats[table_name] = 0
        
        return {
            "success": True,
            "stats": stats,
            "total_tables": len(TABLE_MODELS)
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики БД: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")

@router.post("/admin/database/query")
def execute_custom_query(
    query_text: str,
    current_user: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Выполнение произвольного SQL запроса (только SELECT)"""
    try:
        # Проверяем, что запрос только на чтение
        query_text = query_text.strip().lower()
        if not query_text.startswith('select'):
            raise HTTPException(status_code=400, detail="Разрешены только SELECT запросы")
        
        # Запрещаем опасные операции
        forbidden_keywords = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate']
        for keyword in forbidden_keywords:
            if keyword in query_text:
                raise HTTPException(status_code=400, detail=f"Запрос содержит запрещенное ключевое слово: {keyword}")
        
        # Выполняем запрос
        result = db.execute(text(query_text))
        
        # Получаем результаты
        if result.returns_rows:
            columns = result.keys()
            rows = result.fetchall()
            
            data = []
            for row in rows:
                row_dict = {}
                for i, column in enumerate(columns):
                    value = row[i]
                    if isinstance(value, datetime):
                        row_dict[column] = value.isoformat()
                    else:
                        row_dict[column] = value
                data.append(row_dict)
            
            logger.info(f"Администратор {current_user.email} выполнил SQL запрос")
            
            return {
                "success": True,
                "columns": list(columns),
                "data": data,
                "row_count": len(data)
            }
        else:
            return {
                "success": True,
                "message": "Запрос выполнен успешно",
                "data": []
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка выполнения SQL запроса: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка выполнения запроса: {str(e)}")