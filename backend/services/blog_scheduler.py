"""
Сервис для автоматической публикации запланированных статей блога
"""

import asyncio
import logging
from datetime import datetime, timedelta
from database.connection import SessionLocal
from database import crud

logger = logging.getLogger(__name__)

class BlogSchedulerService:
    def __init__(self, check_interval_minutes: int = 5):
        """
        Инициализация сервиса планировщика блога

        Args:
            check_interval_minutes: Интервал проверки в минутах (по умолчанию 5 минут)
        """
        self.check_interval_minutes = check_interval_minutes
        self.is_running = False

    async def start(self):
        """Запуск планировщика"""
        if self.is_running:
            logger.warning("Blog scheduler is already running")
            return

        self.is_running = True
        logger.info(f"Blog scheduler started, checking every {self.check_interval_minutes} minutes")

        while self.is_running:
            try:
                await self.check_and_publish_scheduled_posts()
                # Ждем указанный интервал
                await asyncio.sleep(self.check_interval_minutes * 60)
            except Exception as e:
                logger.error(f"Error in blog scheduler: {e}")
                # В случае ошибки ждем меньше времени перед повтором
                await asyncio.sleep(60)

    async def stop(self):
        """Остановка планировщика"""
        self.is_running = False
        logger.info("Blog scheduler stopped")

    async def check_and_publish_scheduled_posts(self):
        """Проверка и публикация запланированных статей"""
        db = SessionLocal()
        try:
            published_count = crud.publish_scheduled_posts(db)
            if published_count > 0:
                logger.info(f"Published {published_count} scheduled blog posts")
            else:
                logger.debug("No scheduled posts to publish")
        except Exception as e:
            logger.error(f"Error publishing scheduled posts: {e}")
        finally:
            db.close()

    def run_once(self):
        """Однократная проверка и публикация (для ручного запуска)"""
        db = SessionLocal()
        try:
            published_count = crud.publish_scheduled_posts(db)
            logger.info(f"Manual run: published {published_count} scheduled blog posts")
            return published_count
        except Exception as e:
            logger.error(f"Error in manual run: {e}")
            return 0
        finally:
            db.close()

# Глобальный экземпляр планировщика
blog_scheduler = BlogSchedulerService()

async def start_blog_scheduler():
    """Запуск планировщика блога"""
    await blog_scheduler.start()

async def stop_blog_scheduler():
    """Остановка планировщика блога"""
    await blog_scheduler.stop()