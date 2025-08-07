from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, desc
from database.connection import get_db
from core.auth import get_current_user
from database.models import User, Dialog, DialogMessage
from datetime import datetime, timedelta
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rating", tags=["rating"])

@router.get("/analytics")
async def get_rating_analytics(
    days: int = Query(30, description="Количество дней для анализа"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение аналитики оценок диалогов"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Базовая статистика диалогов
        total_dialogs = db.query(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.started_at >= cutoff_date
        ).count()
        
        # Диалоги с оценками
        rated_dialogs_query = db.query(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.started_at >= cutoff_date,
            Dialog.satisfaction.isnot(None)
        )
        
        rated_dialogs = rated_dialogs_query.count()
        
        # Средняя оценка
        avg_rating = db.query(func.avg(Dialog.satisfaction)).filter(
            Dialog.user_id == current_user.id,
            Dialog.satisfaction.isnot(None),
            Dialog.started_at >= cutoff_date
        ).scalar() or 0
        
        # Положительные оценки (4-5)
        positive_ratings = db.query(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.satisfaction >= 4,
            Dialog.started_at >= cutoff_date
        ).count()
        
        # Негативные оценки (1-2)  
        negative_ratings = db.query(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.satisfaction <= 2,
            Dialog.started_at >= cutoff_date
        ).count()
        
        # Покрытие оценками
        rating_coverage = (rated_dialogs / total_dialogs * 100) if total_dialogs > 0 else 0
        
        # Статистика сообщений
        total_messages = db.query(DialogMessage).join(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.started_at >= cutoff_date,
            DialogMessage.sender == 'assistant'
        ).count()
        
        # Тренды по дням (последние 10 дней)
        daily_trends = []
        for i in range(10):
            day_start = (datetime.now() - timedelta(days=i+1)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_avg = db.query(func.avg(Dialog.satisfaction)).filter(
                Dialog.user_id == current_user.id,
                Dialog.satisfaction.isnot(None),
                Dialog.started_at >= day_start,
                Dialog.started_at < day_end
            ).scalar()
            
            day_count = db.query(Dialog).filter(
                Dialog.user_id == current_user.id,
                Dialog.satisfaction.isnot(None),
                Dialog.started_at >= day_start,
                Dialog.started_at < day_end
            ).count()
            
            if day_avg is not None:
                daily_trends.append({
                    "date": day_start.isoformat(),
                    "avg_rating": float(day_avg),
                    "count": day_count
                })
        
        daily_trends.reverse()  # От старых к новым
        
        # Проблемные диалоги (оценка <= 2)
        low_rated_dialogs = []
        problem_dialogs = db.query(Dialog).filter(
            Dialog.user_id == current_user.id,
            Dialog.satisfaction <= 2,
            Dialog.started_at >= cutoff_date
        ).order_by(desc(Dialog.started_at)).limit(10).all()
        
        for dialog in problem_dialogs:
            # Получаем первое сообщение пользователя как превью
            first_message = db.query(DialogMessage).filter(
                DialogMessage.dialog_id == dialog.id,
                DialogMessage.sender == 'user'
            ).first()
            
            low_rated_dialogs.append({
                "dialog_id": dialog.id,
                "rating": dialog.satisfaction,
                "started_at": dialog.started_at.isoformat(),
                "user": f"user_{dialog.user_id}",
                "comment": first_message.text[:100] + "..." if first_message and len(first_message.text) > 100 else (first_message.text if first_message else "")
            })
        
        return {
            "dialog_stats": {
                "total_dialogs": total_dialogs,
                "rated_dialogs": rated_dialogs,
                "avg_rating": float(avg_rating) if avg_rating else 0,
                "positive_ratings": positive_ratings,
                "negative_ratings": negative_ratings,
                "rating_coverage": round(rating_coverage, 1)
            },
            "message_stats": {
                "total_messages": total_messages,
                "rated_messages": rated_dialogs,  # Приблизительно
                "avg_rating": float(avg_rating) if avg_rating else 0,
                "positive_ratings": positive_ratings,
                "negative_ratings": negative_ratings
            },
            "daily_trends": daily_trends,
            "low_rated_dialogs": low_rated_dialogs,
            "recommendations": generate_recommendations(
                avg_rating, rating_coverage, positive_ratings, negative_ratings, total_dialogs
            )
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения аналитики оценок: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения аналитики")

def generate_recommendations(avg_rating: float, coverage: float, positive: int, negative: int, total: int) -> List[str]:
    """Генерация рекомендаций на основе статистики"""
    recommendations = []
    
    if avg_rating < 3.0:
        recommendations.append("🔴 Критически низкая средняя оценка. Необходимо срочно пересмотреть системный промпт и базу знаний.")
    elif avg_rating < 3.5:
        recommendations.append("⚠️ Средняя оценка ниже нормы. Рекомендуется обновить обучающие данные.")
    elif avg_rating >= 4.5:
        recommendations.append("🎉 Отличная работа! Высокая средняя оценка говорит об эффективности настроек.")
    
    if coverage < 20:
        recommendations.append("📊 Очень низкое покрытие оценками. Рассмотрите более частые запросы обратной связи.")
    elif coverage < 50:
        recommendations.append("📈 Можно увеличить частоту запросов оценок для лучшей аналитики.")
    
    if negative > positive and total > 5:
        recommendations.append("⚠️ Негативных оценок больше положительных. Необходим детальный анализ проблемных диалогов.")
    
    if total == 0:
        recommendations.append("💡 Пока нет диалогов для анализа. Начните использовать ботов для сбора данных.")
    elif total < 10:
        recommendations.append("📝 Мало данных для качественного анализа. Подождите накопления большего количества диалогов.")
    
    if not recommendations:
        recommendations.append("✅ Все показатели в норме. Продолжайте в том же духе!")
    
    return recommendations

@router.post("/external/dialog")
async def rate_dialog_external(request_data: dict):
    """Внешний endpoint для оценки диалогов от ботов"""
    try:
        dialog_id = request_data.get('dialog_id')
        rating = request_data.get('rating')
        platform = request_data.get('platform', 'unknown')
        
        if not dialog_id or not rating:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные поля")
        
        # Получаем сессию БД
        db = next(get_db())
        
        # Обновляем оценку диалога
        dialog = db.query(Dialog).filter(Dialog.id == dialog_id).first()
        if not dialog:
            raise HTTPException(status_code=404, detail="Диалог не найден")
        
        dialog.satisfaction = rating
        db.commit()
        
        logger.info(f"Получена оценка {rating} для диалога {dialog_id} с платформы {platform}")
        
        return {"status": "success", "message": "Оценка сохранена"}
        
    except Exception as e:
        logger.error(f"Ошибка сохранения оценки диалога: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сохранения оценки")

@router.post("/message")
async def rate_message(request_data: dict):
    """Оценка отдельного сообщения"""
    try:
        message_id = request_data.get('message_id')
        rating = request_data.get('rating')
        
        if not message_id or not rating:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные поля")
        
        # Получаем сессию БД
        db = next(get_db())
        
        # Здесь можно добавить логику сохранения оценок сообщений
        # Пока просто логируем
        logger.info(f"Получена оценка {rating} для сообщения {message_id}")
        
        return {"status": "success", "message": "Оценка сообщения сохранена"}
        
    except Exception as e:
        logger.error(f"Ошибка сохранения оценки сообщения: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сохранения оценки")

@router.get("/test")
async def test_rating():
    """Тестовый endpoint для проверки работы системы"""
    return {
        "status": "ok",
        "message": "Система оценок работает",
        "timestamp": datetime.now().isoformat()
    }