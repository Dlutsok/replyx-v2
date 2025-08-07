"""
📊 СЕРВИС ДЛЯ АНАЛИТИКИ И МЕТРИК

Выделение сложной логики расчета метрик из main.py в отдельный сервисный слой.
Часть рефакторинга архитектуры для исправления монолитного main.py.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from database import models
from cache.redis_cache import chatai_cache

logger = logging.getLogger(__name__)

from core.app_config import TRIAL_DURATION_DAYS, TRIAL_MESSAGE_LIMIT


class AnalyticsService:
    """Сервис для расчета аналитики и метрик"""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 минут кэш для метрик
    
    def get_user_metrics(
        self, 
        db: Session, 
        user_id: int, 
        period: str = 'month',
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Получение метрик пользователя с кэшированием
        """
        # Проверяем кэш для метрик
        cached_metrics = chatai_cache.cache_user_metrics(
            user_id=user_id, 
            period=period, 
            date=date
        )
        
        if cached_metrics:
            logger.debug(f"🚀 CACHE HIT: Метрики для пользователя {user_id}")
            return cached_metrics
        
        logger.debug(f"🔍 CACHE MISS: Вычисляем метрики для пользователя {user_id}")
        
        # Получаем пользователя
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Определяем временные диапазоны
        start_time, end_time, previous_start, previous_end = self._get_time_ranges(period, date)
        
        # Собираем все метрики
        metrics = self._calculate_period_metrics(db, user_id, start_time, end_time)
        previous_metrics = self._calculate_period_metrics(db, user_id, previous_start, previous_end)
        
        # Расчет изменений
        changes = self._calculate_changes(metrics, previous_metrics)
        
        # Информация о пробном периоде и доступе
        trial_info = self._get_trial_info(user, db)
        user_access = self._check_user_access(user, db)
        
        result = {
            "period": period,
            "totalMessages": trial_info.get("trial_messages_used", 0) if trial_info["is_trial_active"] else metrics["total_messages"],
            "periodMessages": metrics["period_messages"],
            "messageLimit": self._get_user_message_limit(user),
            "autoResponseRate": metrics["auto_response_rate"],
            "avgResponseTime": metrics["avg_response_time"],
            "customerSatisfaction": metrics["avg_rating"],
            "dialogs": metrics["period_dialogs"],
            "changes": changes,
            "trialInfo": trial_info,
            "userAccess": user_access
        }
        
        # Сохраняем результат в кэш
        chatai_cache.set_user_metrics(
            user_id=user_id,
            period=period,
            data=result,
            date=date,
            ttl=self.cache_ttl
        )
        
        return result
    
    def get_admin_system_stats(self, db: Session) -> Dict[str, Any]:
        """
        Системная статистика для админов
        """
        # Проверяем кэш
        cached_stats = chatai_cache.cache_system_stats()
        if cached_stats:
            logger.debug("🚀 CACHE HIT: System stats")
            return cached_stats
        
        logger.debug("🔍 CACHE MISS: Calculating system stats")
        
        # Общая статистика
        total_users = db.query(models.User).count()
        active_users = db.query(models.User).filter(models.User.status == 'active').count()
        total_dialogs = db.query(models.Dialog).count()
        total_messages = db.query(models.DialogMessage).count()
        total_assistants = db.query(models.Assistant).count()
        total_documents = db.query(models.Document).count()
        
        # Статистика за последние 24 часа
        last_24h = datetime.utcnow() - timedelta(hours=24)
        new_users_24h = db.query(models.User).filter(models.User.created_at >= last_24h).count()
        new_dialogs_24h = db.query(models.Dialog).filter(models.Dialog.started_at >= last_24h).count()
        new_messages_24h = db.query(models.DialogMessage).filter(models.DialogMessage.timestamp >= last_24h).count()
        
        # Средняя оценка удовлетворенности
        avg_satisfaction = db.query(
            func.avg(models.Dialog.satisfaction)
        ).filter(models.Dialog.satisfaction.isnot(None)).scalar() or 0
        
        result = {
            "overview": {
                "total_users": total_users,
                "active_users": active_users,
                "total_dialogs": total_dialogs,
                "total_messages": total_messages,
                "total_assistants": total_assistants,
                "total_documents": total_documents,
                "avg_satisfaction": round(float(avg_satisfaction), 2)
            },
            "last_24h": {
                "new_users": new_users_24h,
                "new_dialogs": new_dialogs_24h,
                "new_messages": new_messages_24h
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Сохраняем в кэш на 1 минуту
        chatai_cache.set_system_stats(result, 60)
        
        return result
    

    
    def _get_time_ranges(self, period: str, date: Optional[str] = None):
        """Определение временных диапазонов для периода"""
        now = datetime.utcnow()
        
        if period == 'custom' and date:
            try:
                custom_date = datetime.strptime(date, '%Y-%m-%d')
                start_time = custom_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
                previous_start = start_time - timedelta(days=1)
                previous_end = start_time
            except ValueError:
                # Если дата некорректная, используем последний день
                start_time = now - timedelta(days=1)
                end_time = now
                previous_start = now - timedelta(days=2)
                previous_end = start_time
        elif period == 'day':
            start_time = now - timedelta(days=1)
            end_time = now
            previous_start = now - timedelta(days=2)
            previous_end = start_time
        elif period == 'week':
            start_time = now - timedelta(days=7)
            end_time = now
            previous_start = now - timedelta(days=14)
            previous_end = start_time
        else:  # month
            start_time = now - timedelta(days=30)
            end_time = now
            previous_start = now - timedelta(days=60)
            previous_end = start_time
        
        return start_time, end_time, previous_start, previous_end
    
    def _calculate_period_metrics(self, db: Session, user_id: int, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Расчет метрик за период"""
        
        # Сообщения за период
        period_messages = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == user_id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= start_time,
            models.DialogMessage.timestamp <= end_time
        ).scalar() or 0
        
        # Диалоги за период
        period_dialogs = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == user_id,
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at <= end_time
        ).scalar() or 0
        
        # Средний рейтинг
        avg_rating = db.query(func.avg(models.Dialog.satisfaction)).filter(
            models.Dialog.user_id == user_id,
            models.Dialog.satisfaction.isnot(None),
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at <= end_time
        ).scalar() or 0
        
        # Время ответа
        avg_response_time = db.query(func.avg(models.Dialog.first_response_time)).filter(
            models.Dialog.user_id == user_id,
            models.Dialog.first_response_time.isnot(None),
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at <= end_time
        ).scalar() or 0
        
        # Правильный расчет автоответов - диалоги с автоответом
        auto_response_dialogs = db.query(func.count(models.Dialog.id)).filter(
            models.Dialog.user_id == user_id,
            models.Dialog.auto_response == 1,
            models.Dialog.started_at >= start_time,
            models.Dialog.started_at <= end_time
        ).scalar() or 0
        
        auto_response_rate = round((auto_response_dialogs / period_dialogs * 100), 1) if period_dialogs > 0 else 0
        
        # Общее количество сообщений пользователя
        total_messages = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == user_id,
            models.DialogMessage.sender == 'assistant'
        ).scalar() or 0
        
        return {
            "period_messages": period_messages,
            "period_dialogs": period_dialogs,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else 0,
            "avg_response_time": round(float(avg_response_time), 1) if avg_response_time else 0,
            "auto_response_rate": auto_response_rate,
            "total_messages": total_messages
        }
    
    def _calculate_changes(self, current: Dict[str, Any], previous: Dict[str, Any]) -> Dict[str, float]:
        """Расчет процентных изменений"""
        def calculate_change(current_val, previous_val):
            if previous_val == 0:
                return 100 if current_val > 0 else 0
            return round(((current_val - previous_val) / previous_val) * 100, 1)
        
        return {
            "totalMessages": calculate_change(current["period_messages"], previous["period_messages"]),
            "autoResponseRate": calculate_change(current["auto_response_rate"], previous["auto_response_rate"]),
            "avgResponseTime": calculate_change(current["avg_response_time"], previous["avg_response_time"]),
            "customerSatisfaction": calculate_change(current["avg_rating"], previous["avg_rating"])
        }
    
    def _get_trial_info(self, user: models.User, db: Session) -> Dict[str, Any]:
        """Информация о пробном периоде"""
        is_trial_active = self._is_trial_period_active(user)
        trial_days_left = self._get_trial_days_left(user)
        trial_messages_used = self._get_trial_messages_used(user, db)
        
        return {
            "is_trial_active": is_trial_active,
            "trial_days_left": trial_days_left,
            "trial_messages_used": trial_messages_used,
            "trial_message_limit": TRIAL_MESSAGE_LIMIT,
            "trial_end_date": (user.created_at + timedelta(days=TRIAL_DURATION_DAYS)).isoformat() if is_trial_active else None
        }
    
    def _check_user_access(self, user: models.User, db: Session) -> Dict[str, Any]:
        """Проверка доступа пользователя"""
        is_blocked = self._is_user_blocked(user)
        is_trial = self._is_trial_period_active(user)
        trial_days_left = self._get_trial_days_left(user)
        trial_messages_used = self._get_trial_messages_used(user, db)
        
        return {
            "is_blocked": is_blocked,
            "is_trial_active": is_trial,
            "trial_days_left": trial_days_left,
            "trial_messages_used": trial_messages_used,
            "needs_upgrade": is_blocked or (is_trial and trial_days_left <= 1),
            "block_reason": "trial_expired" if is_blocked else None,
            "warning_message": self._get_warning_message(user, trial_days_left, trial_messages_used)
        }
    
    def _is_trial_period_active(self, user: models.User) -> bool:
        """Проверяет, активен ли пробный период для пользователя"""
        trial_end = user.created_at + timedelta(days=TRIAL_DURATION_DAYS)
        return datetime.utcnow() < trial_end
    
    def _get_trial_messages_used(self, user: models.User, db: Session) -> int:
        """Возвращает количество сообщений, использованных в пробном периоде"""
        message_count = db.query(func.count(models.DialogMessage.id)).join(
            models.Dialog
        ).filter(
            models.Dialog.user_id == user.id,
            models.DialogMessage.sender == 'assistant',
            models.DialogMessage.timestamp >= user.created_at
        ).scalar() or 0
        
        return message_count
    
    def _get_trial_days_left(self, user: models.User) -> int:
        """Возвращает количество дней, оставшихся в пробном периоде"""
        trial_end = user.created_at + timedelta(days=TRIAL_DURATION_DAYS)
        days_left = (trial_end - datetime.utcnow()).days
        return max(0, days_left)
    
    def _is_user_blocked(self, user: models.User) -> bool:
        """Проверяет, заблокирован ли пользователь"""
        return not self._is_trial_period_active(user)
    
    def _get_user_message_limit(self, user: models.User) -> Optional[int]:
        """Возвращает лимит сообщений для пользователя"""
        if self._is_trial_period_active(user):
            return TRIAL_MESSAGE_LIMIT
        else:
            return 0
    
    def _get_warning_message(self, user: models.User, days_left: int, messages_used: int) -> Optional[str]:
        """Возвращает предупреждающее сообщение для пользователя"""
        if days_left == 0:
            return "Ваш пробный период завершился. Обновите план для продолжения использования."
        elif days_left == 1:
            return "У вас остался 1 день пробного периода. Рекомендуем обновить план."
        elif days_left <= 3:
            return f"У вас осталось {days_left} дня пробного периода."
        elif messages_used >= TRIAL_MESSAGE_LIMIT * 0.8:
            return f"Вы использовали {messages_used} из {TRIAL_MESSAGE_LIMIT} сообщений пробного периода."
        
        return None


# Создаем глобальный экземпляр сервиса
analytics_service = AnalyticsService()