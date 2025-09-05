"""
API для аналитики страницы /start
Отслеживание действий пользователей на странице онбординга
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from database.connection import get_db
from database import models, schemas
from core.auth import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter()


def get_client_ip(request: Request) -> str:
    """Получить IP адрес клиента"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host


@router.post("/events/track", response_model=dict)
async def track_start_page_event(
    event: schemas.StartPageEventCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Отслеживание событий на странице /start
    Может работать как для авторизованных, так и для анонимных пользователей
    """
    try:
        # Получение IP адреса
        ip_address = get_client_ip(request)
        
        # Создание записи о событии
        db_event = models.StartPageEvent(
            user_id=current_user.id if current_user else None,
            session_id=event.session_id,
            event_type=event.event_type,
            step_id=event.step_id,
            action_type=event.action_type,
            event_metadata=json.dumps(event.metadata) if event.metadata else None,
            user_agent=event.user_agent or request.headers.get("User-Agent"),
            ip_address=ip_address
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        
        logger.info(f"Start page event tracked: {event.event_type} for session {event.session_id}")
        
        return {
            "success": True,
            "event_id": db_event.id,
            "message": "Event tracked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error tracking start page event: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to track event")


@router.get("/analytics/overview", response_model=schemas.StartPageAnalytics)
async def get_start_page_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Получить общую аналитику по странице /start
    Доступно только администраторам
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Общее количество просмотров страницы
        total_page_views = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.event_type == 'page_view',
            models.StartPageEvent.created_at >= start_date
        ).count()
        
        # Уникальные сессии
        unique_sessions = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.created_at >= start_date
        ).distinct(models.StartPageEvent.session_id).count()
        
        # Статистика завершения шагов
        steps_completion = {}
        for step_id in range(1, 5):
            count = db.query(models.StartPageEvent).filter(
                models.StartPageEvent.event_type == 'step_complete',
                models.StartPageEvent.step_id == step_id,
                models.StartPageEvent.created_at >= start_date
            ).count()
            steps_completion[str(step_id)] = count
        
        # Коэффициенты конверсии
        conversion_rate = {}
        for step_id in range(1, 5):
            step_clicks = db.query(models.StartPageEvent).filter(
                models.StartPageEvent.event_type == 'step_click',
                models.StartPageEvent.step_id == step_id,
                models.StartPageEvent.created_at >= start_date
            ).count()
            
            step_completions = steps_completion.get(str(step_id), 0)
            if step_clicks > 0:
                conversion_rate[str(step_id)] = round((step_completions / step_clicks) * 100, 2)
            else:
                conversion_rate[str(step_id)] = 0.0
        
        # Показатель отсева
        drop_off_rate = {}
        for step_id in range(1, 4):
            current_step_completions = steps_completion.get(str(step_id), 0)
            next_step_clicks = db.query(models.StartPageEvent).filter(
                models.StartPageEvent.event_type == 'step_click',
                models.StartPageEvent.step_id == step_id + 1,
                models.StartPageEvent.created_at >= start_date
            ).count()
            
            if current_step_completions > 0:
                drop_off = 100 - ((next_step_clicks / current_step_completions) * 100)
                drop_off_rate[str(step_id)] = round(drop_off, 2)
            else:
                drop_off_rate[str(step_id)] = 0.0
        
        # Среднее время на странице (приблизительное)
        session_durations = db.query(
            models.StartPageEvent.session_id,
            func.min(models.StartPageEvent.created_at).label('first_event'),
            func.max(models.StartPageEvent.created_at).label('last_event')
        ).filter(
            models.StartPageEvent.created_at >= start_date
        ).group_by(models.StartPageEvent.session_id).all()
        
        total_duration = 0
        valid_sessions = 0
        for session in session_durations:
            if session.last_event > session.first_event:
                duration = (session.last_event - session.first_event).total_seconds()
                if duration < 3600:  # Исключаем аномально долгие сессии (больше часа)
                    total_duration += duration
                    valid_sessions += 1
        
        average_time_on_page = total_duration / valid_sessions if valid_sessions > 0 else 0.0
        
        # Самые популярные действия
        popular_actions = db.query(
            models.StartPageEvent.action_type,
            func.count(models.StartPageEvent.id).label('count')
        ).filter(
            models.StartPageEvent.created_at >= start_date,
            models.StartPageEvent.action_type.isnot(None)
        ).group_by(models.StartPageEvent.action_type).order_by(desc('count')).limit(5).all()
        
        most_popular_actions = [
            {"action": action.action_type, "count": action.count}
            for action in popular_actions
        ]
        
        # Пользовательский поток (упрощенная версия)
        user_flow = db.query(
            models.StartPageEvent.event_type,
            models.StartPageEvent.step_id,
            func.count(models.StartPageEvent.id).label('count')
        ).filter(
            models.StartPageEvent.created_at >= start_date
        ).group_by(
            models.StartPageEvent.event_type,
            models.StartPageEvent.step_id
        ).order_by(desc('count')).limit(10).all()
        
        user_flow_data = [
            {
                "event_type": flow.event_type,
                "step_id": flow.step_id,
                "count": flow.count
            }
            for flow in user_flow
        ]
        
        return schemas.StartPageAnalytics(
            total_page_views=total_page_views,
            unique_sessions=unique_sessions,
            steps_completion=steps_completion,
            conversion_rate=conversion_rate,
            drop_off_rate=drop_off_rate,
            average_time_on_page=round(average_time_on_page, 2),
            most_popular_actions=most_popular_actions,
            user_flow=user_flow_data
        )
        
    except Exception as e:
        logger.error(f"Error getting start page analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")


@router.get("/analytics/funnel", response_model=schemas.StartPageFunnelAnalysis)
async def get_start_page_funnel(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Получить анализ воронки страницы /start
    Показывает прогрессию пользователей через все этапы
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Общее количество сессий
        total_sessions = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.created_at >= start_date
        ).distinct(models.StartPageEvent.session_id).count()
        
        # Статистика по каждому шагу
        step_stats = {}
        for step_id in range(1, 5):
            # Количество просмотров шага (клики)
            views = db.query(models.StartPageEvent).filter(
                models.StartPageEvent.event_type == 'step_click',
                models.StartPageEvent.step_id == step_id,
                models.StartPageEvent.created_at >= start_date
            ).count()
            
            # Количество завершений шага
            completions = db.query(models.StartPageEvent).filter(
                models.StartPageEvent.event_type == 'step_complete',
                models.StartPageEvent.step_id == step_id,
                models.StartPageEvent.created_at >= start_date
            ).count()
            
            step_stats[f'step_{step_id}_views'] = views
            step_stats[f'step_{step_id}_completion'] = completions
        
        # Коэффициент полного завершения
        full_completions = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.event_type == 'step_complete',
            models.StartPageEvent.step_id == 4,
            models.StartPageEvent.created_at >= start_date
        ).count()
        
        full_completion_rate = (full_completions / total_sessions * 100) if total_sessions > 0 else 0.0
        
        return schemas.StartPageFunnelAnalysis(
            total_sessions=total_sessions,
            step_1_views=step_stats.get('step_1_views', 0),
            step_1_completion=step_stats.get('step_1_completion', 0),
            step_2_views=step_stats.get('step_2_views', 0),
            step_2_completion=step_stats.get('step_2_completion', 0),
            step_3_views=step_stats.get('step_3_views', 0),
            step_3_completion=step_stats.get('step_3_completion', 0),
            step_4_views=step_stats.get('step_4_views', 0),
            step_4_completion=step_stats.get('step_4_completion', 0),
            full_completion_rate=round(full_completion_rate, 2)
        )
        
    except Exception as e:
        logger.error(f"Error getting funnel analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to get funnel analysis")


@router.get("/progress/status")
async def get_user_progress_status(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Получить реальный статус выполнения шагов пользователем
    Работает как для авторизованных, так и для анонимных пользователей
    """
    try:
        # Если пользователь не авторизован - все шаги не выполнены
        if not current_user:
            return {
                "step_1_completed": False,  # Создать ассистента
                "step_2_completed": False,  # Загрузить документы
                "step_3_completed": False,  # Установить виджет
                "step_4_completed": False,  # Протестировать
                "overall_progress": 0,
                "user_authenticated": False
            }
        
        # Проверяем реальный прогресс для авторизованного пользователя
        
        # Шаг 1: Проверяем, есть ли у пользователя хотя бы один ассистент
        has_assistant = db.query(models.Assistant).filter(
            models.Assistant.user_id == current_user.id
        ).count() > 0
        
        # Шаг 2: Проверяем, загружены ли документы
        has_documents = db.query(models.Document).filter(
            models.Document.user_id == current_user.id
        ).count() > 0
        
        # Шаг 3: Проверяем, скопирован ли код виджета (по событиям аналитики)
        # Это проверим по наличию событий копирования или активности с виджетом
        widget_copied = False
        
        # Проверяем события аналитики на копирование кода виджета
        widget_events = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.user_id == current_user.id,
            models.StartPageEvent.event_type == 'widget_code_copied'
        ).count() > 0
        
        # Альтернативно: проверяем активность диалогов (означает, что виджет работает)
        active_dialogs = db.query(models.Dialog).filter(
            models.Dialog.user_id == current_user.id
        ).count() > 0
        
        widget_copied = widget_events or active_dialogs
        
        # Шаг 4: Проверяем тестирование (наличие диалогов/сообщений)
        has_tested = db.query(models.Dialog).filter(
            models.Dialog.user_id == current_user.id
        ).count() > 0
        
        # Подсчитываем общий прогресс
        completed_steps = sum([
            has_assistant,
            has_documents, 
            widget_copied,
            has_tested
        ])
        overall_progress = round((completed_steps / 4) * 100)
        
        return {
            "step_1_completed": has_assistant,
            "step_2_completed": has_documents,
            "step_3_completed": widget_copied,
            "step_4_completed": has_tested,
            "overall_progress": overall_progress,
            "user_authenticated": True,
            "user_id": current_user.id,
            "details": {
                "assistants_count": db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).count(),
                "documents_count": db.query(models.Document).filter(models.Document.user_id == current_user.id).count(),
                "dialogs_count": db.query(models.Dialog).filter(models.Dialog.user_id == current_user.id).count(),
                "widget_events_count": db.query(models.StartPageEvent).filter(
                    models.StartPageEvent.user_id == current_user.id,
                    models.StartPageEvent.event_type == 'widget_code_copied'
                ).count()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user progress status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get progress status")


@router.post("/progress/mark-widget-copied")
async def mark_widget_code_copied(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Отметить, что пользователь скопировал код виджета
    """
    try:
        # Получение IP адреса
        ip_address = get_client_ip(request)
        
        # Генерируем session_id для события
        session_id = f"widget_copy_{datetime.utcnow().timestamp()}_{current_user.id if current_user else 'anon'}"
        
        # Создание записи о событии копирования кода виджета
        db_event = models.StartPageEvent(
            user_id=current_user.id if current_user else None,
            session_id=session_id,
            event_type='widget_code_copied',
            step_id=3,  # Это шаг 3 - установка виджета
            action_type='copy_code',
            event_metadata=json.dumps({
                "copied_at": datetime.utcnow().isoformat(),
                "user_agent": request.headers.get("User-Agent"),
                "referrer": request.headers.get("Referer")
            }),
            user_agent=request.headers.get("User-Agent"),
            ip_address=ip_address
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        
        logger.info(f"Widget code copied event tracked for user {current_user.id if current_user else 'anonymous'}")
        
        return {
            "success": True,
            "message": "Widget copy event tracked successfully",
            "event_id": db_event.id
        }
        
    except Exception as e:
        logger.error(f"Error marking widget code copied: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to mark widget copied")


@router.get("/analytics/events", response_model=List[schemas.StartPageEventRead])
async def get_start_page_events(
    session_id: Optional[str] = None,
    user_id: Optional[int] = None,
    event_type: Optional[str] = None,
    days: int = 7,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Получить сырые события страницы /start с фильтрацией
    Доступно только администраторам
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(models.StartPageEvent).filter(
            models.StartPageEvent.created_at >= start_date
        )
        
        # Применяем фильтры
        if session_id:
            query = query.filter(models.StartPageEvent.session_id == session_id)
        
        if user_id:
            query = query.filter(models.StartPageEvent.user_id == user_id)
            
        if event_type:
            query = query.filter(models.StartPageEvent.event_type == event_type)
        
        events = query.order_by(desc(models.StartPageEvent.created_at)).offset(offset).limit(limit).all()
        
        return events
        
    except Exception as e:
        logger.error(f"Error getting start page events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get events")