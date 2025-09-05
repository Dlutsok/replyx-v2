"""
Сервис аналитики для администраторской панели.
Централизует сложные запросы и вычисления для повышения производительности.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from functools import lru_cache
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text, case
from database import models

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Сервис для работы с аналитикой"""
    
    @staticmethod
    @lru_cache(maxsize=32)
    def _calculate_growth_rate(current: int, previous: int) -> float:
        """Вычислить процент роста с кэшированием"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 2)

    def get_real_growth_metrics(self, db: Session) -> Dict[str, float]:
        """Вычисляет реальные метрики роста на основе данных БД"""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_ago = today_start - timedelta(days=7)
        two_weeks_ago = today_start - timedelta(days=14)
        
        try:
            # Рост пользователей (сегодня vs вчера)
            users_today = db.query(models.User).filter(
                models.User.created_at >= today_start
            ).count()
            
            users_yesterday = db.query(models.User).filter(
                models.User.created_at >= yesterday_start,
                models.User.created_at < today_start
            ).count()
            
            # Рост активных пользователей (эта неделя vs прошлая неделя)
            active_this_week = db.query(models.Dialog).filter(
                models.Dialog.started_at >= week_ago
            ).distinct(models.Dialog.user_id).count()
            
            active_prev_week = db.query(models.Dialog).filter(
                models.Dialog.started_at >= two_weeks_ago,
                models.Dialog.started_at < week_ago
            ).distinct(models.Dialog.user_id).count()
            
            # Рост AI запросов (сегодня vs вчера)
            try:
                ai_requests_today = db.query(models.AITokenUsage).filter(
                    models.AITokenUsage.created_at >= today_start,
                    models.AITokenUsage.success == True
                ).count()
                
                ai_requests_yesterday = db.query(models.AITokenUsage).filter(
                    models.AITokenUsage.created_at >= yesterday_start,
                    models.AITokenUsage.created_at < today_start,
                    models.AITokenUsage.success == True
                ).count()
                
                requests_change = self._calculate_growth_rate(ai_requests_today, ai_requests_yesterday)
            except Exception as e:
                logger.warning(f"Ошибка получения AI requests: {e}")
                requests_change = 0.0
            
            return {
                "userGrowth": self._calculate_growth_rate(users_today, users_yesterday),
                "dailyActiveGrowth": self._calculate_growth_rate(active_this_week, active_prev_week),
                "requestsChange": requests_change,
            }
            
        except Exception as e:
            logger.error(f"Ошибка вычисления growth metrics: {e}")
            return {
                "userGrowth": 0.0,
                "dailyActiveGrowth": 0.0, 
                "requestsChange": 0.0,
            }

    def get_real_ai_response_times(self, db: Session, period_days: int = 7) -> Dict[str, float]:
        """Получает реальные времена ответа AI из таблицы AITokenUsage"""
        try:
            period_start = datetime.utcnow() - timedelta(days=period_days)
            
            # Получаем статистику времен ответа
            response_time_stats = db.query(
                func.avg(models.AITokenUsage.response_time).label('avg_time'),
                func.percentile_cont(0.5).within_group(
                    models.AITokenUsage.response_time
                ).label('median_time'),
                func.percentile_cont(0.95).within_group(
                    models.AITokenUsage.response_time  
                ).label('p95_time')
            ).filter(
                models.AITokenUsage.created_at >= period_start,
                models.AITokenUsage.success == True,
                models.AITokenUsage.response_time > 0
            ).first()
            
            if response_time_stats and response_time_stats.avg_time is not None:
                return {
                    "average_response_time": round(float(response_time_stats.avg_time), 2),
                    "median_response_time": round(float(response_time_stats.median_time or 0), 2),
                    "p95_response_time": round(float(response_time_stats.p95_time or 0), 2)
                }
            else:
                logger.warning("Нет данных о временах ответа AI")
                return {
                    "average_response_time": 0.0,
                    "median_response_time": 0.0,
                    "p95_response_time": 0.0
                }
                
        except Exception as e:
            logger.error(f"Ошибка получения AI response times: {e}")
            return {
                "average_response_time": 0.0,
                "median_response_time": 0.0,
                "p95_response_time": 0.0
            }

    def get_enhanced_ai_usage_stats(self, db: Session, period_days: int = 7) -> Dict[str, Any]:
        """Получает улучшенную статистику использования AI за период"""
        try:
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            period_start = today_start - timedelta(days=period_days)
            
            # Активные токены
            active_tokens = db.query(models.AITokenPool).filter(
                models.AITokenPool.is_active == True
            ).count()
            
            # Запросы за сегодня с успешностью
            usage_today = db.query(
                func.count(models.AITokenUsage.id).label('total_requests'),
                func.count(case((models.AITokenUsage.success == True, 1))).label('successful_requests'),
                func.avg(models.AITokenUsage.response_time).label('avg_response_time'),
                func.sum(models.AITokenUsage.total_tokens).label('total_tokens')
            ).filter(
                models.AITokenUsage.created_at >= today_start
            ).first()
            
            # Запросы за период для получения данных, если сегодня пусто
            usage_period = db.query(
                func.count(models.AITokenUsage.id).label('total_requests'),
                func.count(case((models.AITokenUsage.success == True, 1))).label('successful_requests'),
                func.avg(models.AITokenUsage.response_time).label('avg_response_time'),
                func.sum(models.AITokenUsage.total_tokens).label('total_tokens')
            ).filter(
                models.AITokenUsage.created_at >= period_start
            ).first()
            
            # Используем данные за сегодня, если есть, иначе за период
            usage_data = usage_today if (usage_today and usage_today.total_requests > 0) else usage_period
            
            if usage_data and usage_data.total_requests > 0:
                success_rate = round((usage_data.successful_requests / usage_data.total_requests) * 100, 1)
                
                return {
                    "active_tokens": active_tokens,
                    "total_requests_today": usage_data.total_requests or 0,
                    "successful_requests_today": usage_data.successful_requests or 0,
                    "success_rate": success_rate,
                    "average_response_time": round(float(usage_data.avg_response_time or 0), 2),
                    "total_tokens_today": usage_data.total_tokens or 0
                }
            else:
                return {
                    "active_tokens": active_tokens,
                    "total_requests_today": 0,
                    "successful_requests_today": 0,
                    "success_rate": 0.0,
                    "average_response_time": 0.0,
                    "total_tokens_today": 0
                }
                
        except Exception as e:
            logger.error(f"Ошибка получения AI usage stats: {e}")
            return {
                "active_tokens": 0,
                "total_requests_today": 0,
                "successful_requests_today": 0,
                "success_rate": 0.0,
                "average_response_time": 0.0,
                "total_tokens_today": 0
            }

    def get_dialog_performance_metrics(self, db: Session, period_days: int = 7) -> Dict[str, Any]:
        """Получает метрики производительности диалогов"""
        try:
            period_start = datetime.utcnow() - timedelta(days=period_days)
            
            # Статистика первого ответа в диалогах
            first_response_stats = db.query(
                func.avg(models.Dialog.first_response_time).label('avg_first_response'),
                func.percentile_cont(0.5).within_group(
                    models.Dialog.first_response_time
                ).label('median_first_response'),
                func.percentile_cont(0.95).within_group(
                    models.Dialog.first_response_time
                ).label('p95_first_response')
            ).filter(
                models.Dialog.started_at >= period_start,
                models.Dialog.first_response_time.isnot(None),
                models.Dialog.first_response_time > 0
            ).first()
            
            # Количество диалогов с fallback
            total_dialogs_period = db.query(models.Dialog).filter(
                models.Dialog.started_at >= period_start
            ).count()
            
            fallback_dialogs = db.query(models.Dialog).filter(
                models.Dialog.started_at >= period_start,
                models.Dialog.fallback == 1
            ).count()
            
            fallback_rate = 0.0
            if total_dialogs_period > 0:
                fallback_rate = round((fallback_dialogs / total_dialogs_period) * 100, 1)
            
            result = {
                "total_dialogs_period": total_dialogs_period,
                "fallback_dialogs": fallback_dialogs,
                "fallback_rate": fallback_rate
            }
            
            if first_response_stats and first_response_stats.avg_first_response is not None:
                result.update({
                    "avg_first_response_time": round(float(first_response_stats.avg_first_response), 2),
                    "median_first_response_time": round(float(first_response_stats.median_first_response or 0), 2),
                    "p95_first_response_time": round(float(first_response_stats.p95_first_response or 0), 2)
                })
            else:
                result.update({
                    "avg_first_response_time": 0.0,
                    "median_first_response_time": 0.0,
                    "p95_first_response_time": 0.0
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка получения dialog performance metrics: {e}")
            return {
                "total_dialogs_period": 0,
                "fallback_dialogs": 0,
                "fallback_rate": 0.0,
                "avg_first_response_time": 0.0,
                "median_first_response_time": 0.0,
                "p95_first_response_time": 0.0
            }

    def get_admin_system_stats(self, db: Session) -> Dict[str, Any]:
        """Получает системную статистику для админ панели"""
        try:
            # Базовые метрики
            total_users = db.query(models.User).count()
            total_dialogs = db.query(models.Dialog).count()
            total_messages = db.query(models.DialogMessage).count()
            
            # Активные пользователи сегодня
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            active_users_today = db.query(models.Dialog).filter(
                models.Dialog.started_at >= today_start
            ).distinct(models.Dialog.user_id).count()
            
            # AI токены и их использование
            ai_stats = self.get_enhanced_ai_usage_stats(db)
            
            # Метрики роста
            growth_metrics = self.get_real_growth_metrics(db)
            
            return {
                "totalUsers": total_users,
                "activeUsersToday": active_users_today,
                "totalDialogs": total_dialogs,
                "totalMessages": total_messages,
                "dailyRequests": ai_stats.get("total_requests_today", 0),
                "activeAITokens": ai_stats.get("active_tokens", 0),
                "userGrowth": growth_metrics.get("userGrowth", 0.0),
                "dailyActiveGrowth": growth_metrics.get("dailyActiveGrowth", 0.0),
                "requestsChange": growth_metrics.get("requestsChange", 0.0),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения system stats: {e}")
            return {
                "totalUsers": 0,
                "activeUsersToday": 0,
                "totalDialogs": 0,
                "totalMessages": 0,
                "dailyRequests": 0,
                "activeAITokens": 0,
                "userGrowth": 0.0,
                "dailyActiveGrowth": 0.0,
                "requestsChange": 0.0,
                "timestamp": datetime.utcnow().isoformat()
            }


# Глобальный экземпляр сервиса
analytics_service = AnalyticsService()