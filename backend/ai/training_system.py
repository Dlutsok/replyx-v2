from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
import json
import re
from datetime import datetime, timedelta
from database import models, get_db
from core import auth
from pydantic import BaseModel

router = APIRouter()

# Pydantic модели для API
class TrainingDatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TrainingExampleCreate(BaseModel):
    user_message: str
    assistant_response: str
    context: Optional[str] = None
    quality_rating: Optional[int] = None
    tags: Optional[List[str]] = None

class ConversationPatternCreate(BaseModel):
    pattern_type: str
    user_input_pattern: str
    recommended_response: str

class DialogFeedbackCreate(BaseModel):
    dialog_id: int
    message_id: int
    feedback_type: str  # 'positive', 'negative', 'correction'
    rating: Optional[int] = None
    comment: Optional[str] = None
    suggested_response: Optional[str] = None

def create_training_tables(db: Session):
    """Создает таблицы для системы обучения если они не существуют"""
    try:
        print("Создаем таблицы для системы обучения...")
        # Создаем таблицы программно
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS training_datasets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name VARCHAR NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                total_examples INTEGER DEFAULT 0,
                quality_score FLOAT DEFAULT 0.0
            )
        """))
        
        # Обновляем значения по умолчанию для существующих записей
        db.execute(text("""
            UPDATE training_datasets 
            SET is_active = TRUE 
            WHERE is_active IS NULL
        """))
        
        db.execute(text("""
            UPDATE training_datasets 
            SET total_examples = 0 
            WHERE total_examples IS NULL
        """))
        
        db.execute(text("""
            UPDATE training_datasets 
            SET quality_score = 0.0 
            WHERE quality_score IS NULL
        """))
        print("Таблица training_datasets создана")
        
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS training_examples (
                id SERIAL PRIMARY KEY,
                dataset_id INTEGER REFERENCES training_datasets(id),
                dialog_id INTEGER REFERENCES dialogs(id),
                user_message TEXT NOT NULL,
                assistant_response TEXT NOT NULL,
                context TEXT,
                quality_rating INTEGER,
                is_approved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                feedback TEXT,
                tags VARCHAR
            )
        """))
        print("Таблица training_examples создана")
        
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS conversation_patterns (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                pattern_type VARCHAR NOT NULL,
                user_input_pattern TEXT NOT NULL,
                recommended_response TEXT NOT NULL,
                confidence_score FLOAT DEFAULT 0.0,
                usage_count INTEGER DEFAULT 0,
                success_rate FLOAT DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """))
        print("Таблица conversation_patterns создана")
        
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS dialog_feedback (
                id SERIAL PRIMARY KEY,
                dialog_id INTEGER REFERENCES dialogs(id),
                message_id INTEGER REFERENCES dialog_messages(id),
                feedback_type VARCHAR NOT NULL,
                rating INTEGER,
                comment TEXT,
                suggested_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        print("Таблица dialog_feedback создана")
        
        db.commit()
        print("Все таблицы успешно созданы")
    except Exception as e:
        print(f"Error creating training tables: {e}")
        db.rollback()

@router.post("/api/training/auto-extract")
def auto_extract_training_data(
    dataset_name: str = Body(..., embed=True),
    min_rating: int = Body(4, embed=True),
    days_back: int = Body(30, embed=True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Автоматически извлекает обучающие данные из хороших диалогов"""
    
    print(f"Запрос на извлечение данных от пользователя {current_user.id}: {dataset_name}, min_rating={min_rating}, days_back={days_back}")
    
    # Создаем таблицы если их нет
    create_training_tables(db)
    
    # Создаем или находим датасет
    dataset = db.execute(text("""
        SELECT id FROM training_datasets 
        WHERE user_id = :user_id AND name = :name AND is_active = TRUE
    """), {"user_id": current_user.id, "name": dataset_name}).fetchone()
    
    if not dataset:
        dataset_id = db.execute(text("""
            INSERT INTO training_datasets 
            (user_id, name, description, created_at, updated_at, is_active, total_examples, quality_score)
            VALUES (:user_id, :name, :desc, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE, 0, 0.0)
            RETURNING id
        """), {
            "user_id": current_user.id,
            "name": dataset_name,
            "desc": f"Автоматически извлеченные данные за последние {days_back} дней"
        }).fetchone()[0]
    else:
        dataset_id = dataset[0]
    
    # Извлекаем хорошие диалоги за последний период
    cutoff_date = datetime.now() - timedelta(days=days_back)
    
    # Находим диалоги с высокими оценками
    good_dialogs = db.execute(text("""
        SELECT DISTINCT d.id, COALESCE(AVG(dr.rating), d.satisfaction) as avg_rating
        FROM dialogs d
        LEFT JOIN dialog_ratings dr ON dr.dialog_id = d.id
        WHERE d.user_id = :user_id 
        AND d.started_at >= :cutoff_date
        AND d.auto_response = 1
        GROUP BY d.id, d.satisfaction
        HAVING COALESCE(AVG(dr.rating), d.satisfaction) >= :min_rating
    """), {
        "user_id": current_user.id,
        "min_rating": min_rating,
        "cutoff_date": cutoff_date
    }).fetchall()
    
    extracted_count = 0
    
    for dialog in good_dialogs:
        dialog_id = dialog[0]
        
        # Получаем сообщения диалога
        messages = db.execute(text("""
            SELECT sender, text, timestamp
            FROM dialog_messages
            WHERE dialog_id = :dialog_id
            ORDER BY timestamp
        """), {"dialog_id": dialog_id}).fetchall()
        
        # Группируем в пары вопрос-ответ
        context = []
        for i, msg in enumerate(messages):
            if msg[0] == 'user' and i + 1 < len(messages) and messages[i + 1][0] == 'assistant':
                user_msg = msg[1]
                assistant_msg = messages[i + 1][1]
                
                # Проверяем, не добавлен ли уже этот пример
                existing = db.execute(text("""
                    SELECT id FROM training_examples
                    WHERE dataset_id = :dataset_id AND dialog_id = :dialog_id
                    AND user_message = :user_msg
                """), {
                    "dataset_id": dataset_id,
                    "dialog_id": dialog_id,
                    "user_msg": user_msg
                }).fetchone()
                
                if not existing:
                    # Используем реальную пользовательскую оценку если есть, иначе среднюю из диалога
                    final_rating = int(dialog[1]) if dialog[1] else min_rating
                    
                    # Добавляем пример
                    db.execute(text("""
                        INSERT INTO training_examples 
                        (dataset_id, dialog_id, user_message, assistant_response, context, quality_rating, is_approved)
                        VALUES (:dataset_id, :dialog_id, :user_msg, :assistant_msg, :context, :rating, TRUE)
                    """), {
                        "dataset_id": dataset_id,
                        "dialog_id": dialog_id,
                        "user_msg": user_msg,
                        "assistant_msg": assistant_msg,
                        "context": json.dumps(context[-3:]) if context else None,  # Последние 3 сообщения
                        "rating": final_rating
                    })
                    extracted_count += 1
                
                # Добавляем в контекст для следующих сообщений
                context.extend([{"role": "user", "content": user_msg}, {"role": "assistant", "content": assistant_msg}])
    
    # Обновляем счетчик примеров в датасете
    db.execute(text("""
        UPDATE training_datasets 
        SET total_examples = (
            SELECT COUNT(*) FROM training_examples WHERE dataset_id = :dataset_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = :dataset_id
    """), {"dataset_id": dataset_id})
    
    db.commit()
    
    return {
        "message": f"Извлечено {extracted_count} новых обучающих примеров",
        "dataset_id": dataset_id,
        "total_examples": db.execute(text("SELECT total_examples FROM training_datasets WHERE id = :id"), {"id": dataset_id}).fetchone()[0]
    }

@router.get("/api/training/datasets")
def get_training_datasets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получает список датасетов пользователя"""
    create_training_tables(db)
    
    print(f"Запрос датасетов для пользователя {current_user.id}")
    
    datasets = db.execute(text("""
        SELECT id, name, description, total_examples, quality_score, created_at, updated_at
        FROM training_datasets
        WHERE user_id = :user_id AND is_active = TRUE
        ORDER BY updated_at DESC
    """), {"user_id": current_user.id}).fetchall()
    
    print(f"Найдено датасетов: {len(datasets)}")
    
    result = [
        {
            "id": d[0],
            "name": d[1],
            "description": d[2],
            "total_examples": d[3],
            "quality_score": d[4],
            "created_at": d[5],
            "updated_at": d[6]
        }
        for d in datasets
    ]
    
    for dataset in result:
        print(f"  - {dataset['name']} (ID: {dataset['id']}, примеров: {dataset['total_examples']})")
    
    return result

@router.get("/api/training/datasets/{dataset_id}/examples")
def get_dataset_examples(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получает примеры из конкретного датасета"""
    create_training_tables(db)
    
    print(f"Запрос примеров датасета {dataset_id} для пользователя {current_user.id}")
    
    # Проверяем, что датасет принадлежит пользователю
    dataset = db.execute(text("""
        SELECT id FROM training_datasets
        WHERE id = :dataset_id AND user_id = :user_id AND is_active = TRUE
    """), {"dataset_id": dataset_id, "user_id": current_user.id}).fetchone()
    
    if not dataset:
        print(f"Датасет {dataset_id} не найден для пользователя {current_user.id}")
        raise HTTPException(status_code=404, detail="Датасет не найден")
    
    print(f"Датасет найден, загружаем примеры...")
    
    # Получаем примеры
    examples = db.execute(text("""
        SELECT id, user_message, assistant_response, context, quality_rating, created_at
        FROM training_examples
        WHERE dataset_id = :dataset_id
        ORDER BY created_at DESC
        LIMIT 50
    """), {"dataset_id": dataset_id}).fetchall()
    
    print(f"Найдено примеров: {len(examples)}")
    
    result = [
        {
            "id": e[0],
            "user_message": e[1],
            "assistant_response": e[2],
            "context": e[3],
            "quality_rating": e[4],
            "created_at": e[5]
        }
        for e in examples
    ]
    
    return result

@router.get("/api/training/patterns")
def get_conversation_patterns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получает паттерны разговоров"""
    create_training_tables(db)
    
    patterns = db.execute(text("""
        SELECT id, pattern_type, user_input_pattern, recommended_response, 
               confidence_score, usage_count, success_rate
        FROM conversation_patterns
        WHERE user_id = :user_id AND is_active = TRUE
        ORDER BY success_rate DESC, usage_count DESC
    """), {"user_id": current_user.id}).fetchall()
    
    return [
        {
            "id": p[0],
            "pattern_type": p[1],
            "user_input_pattern": p[2],
            "recommended_response": p[3],
            "confidence_score": p[4],
            "usage_count": p[5],
            "success_rate": p[6]
        }
        for p in patterns
    ]

@router.post("/api/training/patterns")
def create_conversation_pattern(
    pattern: ConversationPatternCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Создает новый паттерн разговора"""
    create_training_tables(db)
    
    pattern_id = db.execute(text("""
        INSERT INTO conversation_patterns 
        (user_id, pattern_type, user_input_pattern, recommended_response)
        VALUES (:user_id, :type, :pattern, :response)
        RETURNING id
    """), {
        "user_id": current_user.id,
        "type": pattern.pattern_type,
        "pattern": pattern.user_input_pattern,
        "response": pattern.recommended_response
    }).fetchone()[0]
    
    db.commit()
    
    return {"id": pattern_id, "message": "Паттерн создан успешно"}

@router.patch("/api/training/patterns/{pattern_id}/usage")
def update_pattern_usage(
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Обновляет статистику использования паттерна"""
    create_training_tables(db)
    
    # Проверяем, что паттерн принадлежит пользователю
    pattern = db.execute(text("""
        SELECT id FROM conversation_patterns
        WHERE id = :pattern_id AND user_id = :user_id
    """), {"pattern_id": pattern_id, "user_id": current_user.id}).fetchone()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Паттерн не найден")
    
    # Обновляем статистику
    db.execute(text("""
        UPDATE conversation_patterns 
        SET usage_count = usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :pattern_id
    """), {"pattern_id": pattern_id})
    
    db.commit()
    
    return {"message": "Статистика обновлена"}

@router.post("/api/training/feedback")
def add_dialog_feedback(
    feedback: DialogFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Добавляет обратную связь по диалогу"""
    create_training_tables(db)
    
    # Проверяем, что диалог принадлежит пользователю
    dialog = db.query(models.Dialog).filter(
        models.Dialog.id == feedback.dialog_id,
        models.Dialog.user_id == current_user.id
    ).first()
    
    if not dialog:
        raise HTTPException(status_code=404, detail="Диалог не найден")
    
    feedback_id = db.execute(text("""
        INSERT INTO dialog_feedback 
        (dialog_id, message_id, feedback_type, rating, comment, suggested_response)
        VALUES (:dialog_id, :message_id, :type, :rating, :comment, :suggested)
        RETURNING id
    """), {
        "dialog_id": feedback.dialog_id,
        "message_id": feedback.message_id,
        "type": feedback.feedback_type,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "suggested": feedback.suggested_response
    }).fetchone()[0]
    
    db.commit()
    
    return {"id": feedback_id, "message": "Обратная связь добавлена"}

@router.get("/api/training/analytics")
def get_training_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Получает аналитику по обучению с учетом реальных оценок"""
    create_training_tables(db)
    
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Общая статистика диалогов
    total_dialogs = db.execute(text("""
        SELECT COUNT(DISTINCT id) FROM dialogs 
        WHERE user_id = :user_id AND started_at >= :cutoff_date
    """), {"user_id": current_user.id, "cutoff_date": cutoff_date}).scalar() or 0
    
    # Диалоги с хорошими оценками (используем satisfaction из таблицы dialogs)
    good_dialogs = db.execute(text("""
        SELECT COUNT(DISTINCT id) FROM dialogs 
        WHERE user_id = :user_id AND started_at >= :cutoff_date 
        AND satisfaction >= 4
    """), {"user_id": current_user.id, "cutoff_date": cutoff_date}).scalar() or 0
    
    # Средняя оценка
    avg_satisfaction = db.execute(text("""
        SELECT AVG(satisfaction) FROM dialogs 
        WHERE user_id = :user_id AND started_at >= :cutoff_date 
        AND satisfaction IS NOT NULL
    """), {"user_id": current_user.id, "cutoff_date": cutoff_date}).scalar() or 0
    
    # Количество обучающих примеров
    training_examples = db.execute(text("""
        SELECT COUNT(DISTINCT te.id) 
        FROM training_examples te
        JOIN dialogs d ON d.id = te.dialog_id
        WHERE d.user_id = :user_id AND d.started_at >= :cutoff_date
    """), {"user_id": current_user.id, "cutoff_date": cutoff_date}).scalar() or 0

    # Статистика по типам обратной связи
    feedback_stats = db.execute(text("""
        SELECT 
            feedback_type,
            COUNT(*) as count,
            AVG(rating) as avg_rating
        FROM dialog_feedback df
        JOIN dialogs d ON d.id = df.dialog_id
        WHERE d.user_id = :user_id AND df.created_at >= :cutoff_date
        GROUP BY feedback_type
    """), {"user_id": current_user.id, "cutoff_date": cutoff_date}).fetchall()
    
    return {
        "period_days": days,
        "total_dialogs": total_dialogs,
        "good_dialogs": good_dialogs,
        "avg_satisfaction": float(avg_satisfaction),
        "training_examples": training_examples,
        "feedback_distribution": [
            {"type": f[0], "count": f[1], "avg_rating": float(f[2]) if f[2] else None}
            for f in feedback_stats
        ]
    }

def find_matching_pattern(user_message: str, user_id: int, db: Session) -> Optional[str]:
    """Находит подходящий паттерн для сообщения пользователя"""
    try:
        patterns = db.execute(text("""
            SELECT user_input_pattern, recommended_response, id
            FROM conversation_patterns
            WHERE user_id = :user_id AND is_active = TRUE
            ORDER BY confidence_score DESC, success_rate DESC
        """), {"user_id": user_id}).fetchall()
        
        for pattern in patterns:
            pattern_text = pattern[0].lower()
            user_text = user_message.lower()
            
            # Простое сопоставление по ключевым словам
            if pattern_text in user_text or any(word in user_text for word in pattern_text.split()):
                # Обновляем статистику использования
                db.execute(text("""
                    UPDATE conversation_patterns 
                    SET usage_count = usage_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """), {"id": pattern[2]})
                
                return pattern[1]  # recommended_response
                
    except Exception as e:
        print(f"Error finding pattern: {e}")
    
    return None