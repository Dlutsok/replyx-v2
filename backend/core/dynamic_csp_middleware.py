"""
Динамический CSP Middleware для iframe страниц виджета
Генерирует frame-ancestors заголовки на основе валидных JWT токенов
"""

import logging
import jwt
from typing import Optional, List
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from urllib.parse import urlparse, parse_qs
from core.app_config import SITE_SECRET

logger = logging.getLogger(__name__)

class DynamicCSPMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, iframe_path: str = '/chat-iframe'):
        """
        Инициализация динамического CSP middleware для iframe страниц
        
        Args:
            app: FastAPI приложение
            iframe_path: Путь iframe страницы (обычно /chat-iframe)
        """
        super().__init__(app)
        self.iframe_path = iframe_path
        
        logger.info(f"🛡️ DynamicCSPMiddleware инициализирован для {iframe_path}")

    def normalize_domain(self, domain: str) -> str:
        """Нормализует домен для сравнения"""
        if not domain:
            return ""
            
        domain = domain.lower().strip()
        
        # Убираем протокол
        if domain.startswith('http://') or domain.startswith('https://'):
            parsed = urlparse(domain)
            domain = parsed.netloc
        
        # Убираем www. префикс для унификации
        if domain.startswith('www.'):
            domain = domain[4:]
            
        # Убираем trailing slash
        domain = domain.rstrip('/')
            
        return domain

    def parse_allowed_domains(self, domains_str: str) -> List[str]:
        """Парсит строку доменов в список нормализованных доменов"""
        if not domains_str or not domains_str.strip():
            return []
            
        domains = []
        for domain in domains_str.split(','):
            normalized = self.normalize_domain(domain.strip())
            if normalized:
                domains.append(normalized)
        
        return domains

    def validate_widget_token(self, token: str, db_session) -> Optional[dict]:
        """
        Валидирует JWT токен виджета и возвращает allowed_domains
        
        Args:
            token: JWT токен
            db_session: Сессия базы данных
            
        Returns:
            dict с информацией о токене или None если невалидный
        """
        try:
            if not token:
                logger.warning("CSP: Токен не предоставлен")
                return None

            # Декодируем токен
            try:
                payload = jwt.decode(token, SITE_SECRET, algorithms=['HS256'])
                logger.debug(f"CSP: Токен декодирован, assistant_id={payload.get('assistant_id')}")
            except jwt.InvalidTokenError as e:
                logger.warning(f"CSP: Неверный токен: {e}")
                return None
                
            assistant_id = payload.get('assistant_id')
            if not assistant_id:
                logger.warning("CSP: assistant_id отсутствует в токене")
                return None
                
            # Импортируем модели динамически для избежания циклических импортов
            from database import models
            
            # Получаем ассистента из БД для проверки актуальности
            assistant = db_session.query(models.Assistant).filter(
                models.Assistant.id == assistant_id
            ).first()
            
            if not assistant:
                logger.warning(f"CSP: Ассистент {assistant_id} не найден в БД")
                return None
                
            # Проверяем актуальность доменов (защита от устаревших токенов)
            current_domains = assistant.allowed_domains or ""
            token_domains = payload.get('allowed_domains', "")
            
            if current_domains != token_domains:
                logger.warning(f"CSP: Домены изменились, токен устарел. Текущие: '{current_domains}', в токене: '{token_domains}'")
                return None
                
            # Проверяем, что домены настроены
            if not current_domains.strip():
                logger.warning("CSP: У ассистента нет настроенных доменов")
                return None
                
            return {
                'valid': True,
                'assistant_id': assistant_id,
                'allowed_domains': current_domains,
                'user_id': payload.get('user_id')
            }
            
        except Exception as e:
            logger.error(f"CSP: Ошибка валидации токена: {e}")
            return None

    def generate_csp_header(self, allowed_domains: List[str]) -> str:
        """
        Генерирует CSP заголовок с разрешенными доменами для frame-ancestors
        
        Args:
            allowed_domains: Список разрешенных доменов
            
        Returns:
            CSP строка
        """
        # Базовые разрешенные домены (основное приложение)
        base_domains = ["'self'", "https://replyx.ru", "https://www.replyx.ru"]
        
        # Добавляем домены из токена
        for domain in allowed_domains:
            # Добавляем http и https варианты
            base_domains.append(f"https://{domain}")
            base_domains.append(f"https://www.{domain}")
            
            # В dev режиме также разрешаем http
            if domain in ['localhost', '127.0.0.1'] or domain.startswith('localhost:'):
                base_domains.append(f"http://{domain}")
        
        # Удаляем дубликаты, сохраняя порядок
        unique_domains = []
        for domain in base_domains:
            if domain not in unique_domains:
                unique_domains.append(domain)
        
        frame_ancestors = " ".join(unique_domains)
        
        # Полный CSP заголовок для iframe
        csp = (
            f"frame-ancestors {frame_ancestors}; "
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https: wss: ws:; "
            "font-src 'self' https:; "
        )
        
        return csp

    def generate_restrictive_csp(self) -> str:
        """Генерирует ограничительный CSP для невалидных токенов"""
        return (
            "frame-ancestors 'self'; "
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )

    async def dispatch(self, request: Request, call_next):
        """Основная логика обработки CSP заголовков"""
        
        # Проверяем, является ли это запросом к iframe странице
        if not request.url.path.startswith(self.iframe_path):
            # Не iframe запрос - пропускаем без изменений
            return await call_next(request)
        
        logger.info(f"🛡️ CSP: Обрабатываю iframe запрос: {request.url}")
        
        # Получаем токен из query параметров
        site_token = request.query_params.get('site_token')
        
        if not site_token:
            logger.warning("CSP: site_token отсутствует в query параметрах")
            # Применяем ограничительный CSP
            response = await call_next(request)
            response.headers['Content-Security-Policy'] = self.generate_restrictive_csp()
            return response
        
        # Получаем сессию БД для валидации токена
        try:
            from database.connection import get_db
            db_generator = get_db()
            db_session = next(db_generator)
            
            try:
                # Валидируем токен и получаем разрешенные домены
                token_info = self.validate_widget_token(site_token, db_session)
                
                if not token_info or not token_info.get('valid'):
                    logger.warning("CSP: Токен невалидный, применяю ограничительный CSP")
                    response = await call_next(request)
                    response.headers['Content-Security-Policy'] = self.generate_restrictive_csp()
                    return response
                
                # Парсим разрешенные домены
                allowed_domains = self.parse_allowed_domains(token_info['allowed_domains'])
                
                if not allowed_domains:
                    logger.warning("CSP: Нет разрешенных доменов, применяю ограничительный CSP")
                    response = await call_next(request)
                    response.headers['Content-Security-Policy'] = self.generate_restrictive_csp()
                    return response
                
                # Генерируем динамический CSP
                dynamic_csp = self.generate_csp_header(allowed_domains)
                
                logger.info(f"✅ CSP: Разрешенные домены для assistant_id={token_info['assistant_id']}: {allowed_domains}")
                logger.debug(f"CSP заголовок: {dynamic_csp}")
                
                # Выполняем запрос и добавляем CSP заголовок
                response = await call_next(request)
                response.headers['Content-Security-Policy'] = dynamic_csp
                
                # Также добавляем X-Frame-Options как fallback
                frame_options = f"ALLOW-FROM https://{allowed_domains[0]}" if allowed_domains else "SAMEORIGIN"
                response.headers['X-Frame-Options'] = frame_options
                
                return response
                
            finally:
                # Закрываем сессию БД
                try:
                    db_session.close()
                except:
                    pass
        
        except Exception as e:
            logger.error(f"CSP: Ошибка получения сессии БД: {e}")
            # Fallback на ограничительный CSP при ошибке
            response = await call_next(request)
            response.headers['Content-Security-Policy'] = self.generate_restrictive_csp()
            return response

# Глобальный экземпляр
dynamic_csp_middleware = DynamicCSPMiddleware