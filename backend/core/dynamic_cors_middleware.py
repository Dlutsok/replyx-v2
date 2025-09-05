"""
Динамический CORS Middleware для безопасной обработки виджетов
Разделяет CORS политики между основным приложением и виджетами
"""
import logging
import jwt
from typing import List, Optional, Set
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse
from urllib.parse import urlparse
from core.app_config import SITE_SECRET

# Импорт метрик (будут доступны после инициализации в main.py)
try:
    from prometheus_client import Counter
    # Метрики будут импортированы динамически в runtime
    METRICS_ENABLED = True
except ImportError:
    METRICS_ENABLED = False

logger = logging.getLogger(__name__)

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        main_app_origins: List[str],
        widget_endpoints: List[str] = None,
        allow_credentials: bool = True,
        allow_methods: List[str] = None,
        allow_headers: List[str] = None,
        expose_headers: List[str] = None,
        max_age: int = 600,
    ):
        """
        Инициализация динамического CORS middleware
        
        Args:
            main_app_origins: Разрешенные домены для основного приложения
            widget_endpoints: Список эндпоинтов, которые используют виджет-политику
            allow_credentials: Разрешить credentials для основного приложения
            allow_methods: Разрешенные HTTP методы
            allow_headers: Разрешенные заголовки
            expose_headers: Заголовки, доступные клиенту
            max_age: Время кэширования preflight запросов
        """
        super().__init__(app)
        
        # Основные домены приложения (с credentials)
        self.main_app_origins = set(main_app_origins)
        
        # Виджет эндпоинты (без credentials, динамическая валидация)
        self.widget_endpoints = set(widget_endpoints or [
            '/api/validate-widget-token',
            '/api/widget-config'
        ])
        
        # CORS настройки
        self.allow_credentials = allow_credentials
        self.allow_methods = allow_methods or ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
        self.allow_headers = allow_headers or ['*']
        self.expose_headers = expose_headers or []
        self.max_age = max_age
        
        logger.info(f"🔐 DynamicCORSMiddleware инициализирован:")
        logger.info(f"   Основные домены: {self.main_app_origins}")
        logger.info(f"   Виджет эндпоинты: {self.widget_endpoints}")

    def _record_widget_metrics(self, endpoint: str, origin: str, status: str, result: str = None, reason: str = None):
        """Записывает метрики виджет запросов (если метрики доступны)"""
        if not METRICS_ENABLED:
            return
        
        try:
            # Импортируем метрики динамически
            import main
            
            # Записываем метрику CORS запроса
            main.WIDGET_CORS_REQUESTS.labels(endpoint=endpoint, origin=origin, status=status).inc()
            
            # Записываем результат валидации токена
            if result:
                main.WIDGET_TOKEN_VALIDATIONS.labels(result=result, endpoint=endpoint).inc()
            
            # Записываем заблокированный origin
            if reason:
                main.WIDGET_BLOCKED_ORIGINS.labels(origin=origin, reason=reason).inc()
                
        except Exception as e:
            # Не останавливаем работу из-за проблем с метриками
            logger.debug(f"Ошибка записи метрик виджета: {e}")

    async def dispatch(self, request: Request, call_next):
        """Основная логика обработки CORS запросов"""
        
        # Получаем Origin из заголовков
        origin = request.headers.get('origin')
        if not origin:
            # Нет Origin - обычный запрос, продолжаем без CORS заголовков
            return await call_next(request)
        
        # Определяем тип эндпоинта
        is_widget_endpoint = self.is_widget_endpoint(request.url.path)
        
        # Обработка OPTIONS (preflight) запросов
        if request.method == 'OPTIONS':
            return await self.handle_preflight(request, origin, is_widget_endpoint)
        
        # Обработка обычных запросов
        response = await call_next(request)
        return self.add_cors_headers(response, origin, is_widget_endpoint)

    def is_widget_endpoint(self, path: str) -> bool:
        """Определяет, является ли эндпоинт виджетным"""
        return path in self.widget_endpoints

    async def validate_widget_origin(self, request: Request, origin: str) -> bool:
        """
        Валидация origin для виджет эндпоинтов через JWT токен
        
        Для preflight запросов (OPTIONS) мы не можем валидировать токен,
        поэтому разрешаем их все, а реальная валидация произойдет в эндпоинте.
        
        Args:
            request: Объект запроса
            origin: Домен, с которого делается запрос
            
        Returns:
            bool: True если домен может быть разрешен
        """
        try:
            # Для OPTIONS (preflight) запросов всегда возвращаем True
            # Реальная валидация произойдет в самом эндпоинте
            if request.method == 'OPTIONS':
                logger.info(f"✅ Preflight запрос от {origin} разрешен (валидация будет в эндпоинте)")
                return True
            
            # Для POST запросов токен в теле, но мы не можем его читать в middleware
            # (это нарушит работу эндпоинта). Поэтому разрешаем запрос,
            # а валидация произойдет в самом эндпоинте validate-widget-token
            if request.method == 'POST':
                logger.info(f"✅ POST запрос от {origin} разрешен (валидация будет в эндпоинте)")
                return True
            
            # Для GET запросов можем проверить токен из query параметров
            token = request.query_params.get('token')
            if not token:
                logger.warning(f"Токен не найден в GET запросе от origin {origin}")
                return False
            
            # Декодируем JWT токен
            try:
                payload = jwt.decode(token, SITE_SECRET, algorithms=['HS256'])
            except jwt.InvalidTokenError as e:
                logger.warning(f"Неверный JWT токен от origin {origin}: {e}")
                return False
            
            # Получаем разрешенные домены из токена
            allowed_domains = payload.get('allowed_domains', [])
            if not isinstance(allowed_domains, list):
                logger.warning(f"allowed_domains не является списком в токене от {origin}")
                return False
            
            # Нормализуем origin для сравнения
            normalized_origin = self.normalize_domain(origin)
            
            # Проверяем каждый разрешенный домен
            for domain in allowed_domains:
                normalized_domain = self.normalize_domain(domain)
                if normalized_origin == normalized_domain:
                    logger.info(f"✅ Origin {origin} разрешен виджет токеном")
                    return True
            
            logger.warning(f"❌ Origin {origin} не найден в allowed_domains токена: {allowed_domains}")
            return False
            
        except Exception as e:
            logger.error(f"Ошибка валидации виджет origin {origin}: {e}")
            return False

    def normalize_domain(self, domain: str) -> str:
        """Нормализует домен для сравнения"""
        domain = domain.lower()  # Сначала приводим к нижнему регистру
        
        if domain.startswith('http://') or domain.startswith('https://'):
            parsed = urlparse(domain)
            domain = parsed.netloc
        
        # Убираем www. префикс для унификации
        if domain.startswith('www.'):
            domain = domain[4:]
            
        return domain

    def is_main_app_origin_allowed(self, origin: str) -> bool:
        """Проверяет, разрешен ли origin для основного приложения"""
        normalized_origin = self.normalize_domain(origin)
        
        for allowed_origin in self.main_app_origins:
            if allowed_origin == '*':
                return True
            
            normalized_allowed = self.normalize_domain(allowed_origin)
            if normalized_origin == normalized_allowed:
                return True
        
        return False

    async def handle_preflight(self, request: Request, origin: str, is_widget_endpoint: bool) -> Response:
        """Обработка OPTIONS (preflight) запросов"""
        
        allowed = False
        allow_credentials = False
        
        if is_widget_endpoint:
            # Для виджет эндпоинтов - динамическая валидация
            allowed = await self.validate_widget_origin(request, origin)
            allow_credentials = False  # Виджеты работают без credentials
        else:
            # Для основного приложения - статическая валидация
            allowed = self.is_main_app_origin_allowed(origin)
            allow_credentials = self.allow_credentials and allowed
        
        if not allowed:
            logger.warning(f"❌ CORS preflight отклонен для origin {origin} (endpoint: {request.url.path})")
            
            # Записываем метрику отклонения
            if is_widget_endpoint:
                self._record_widget_metrics(
                    endpoint=request.url.path,
                    origin=origin,
                    status="rejected",
                    reason="invalid_token_or_domain"
                )
            
            return PlainTextResponse(
                "CORS preflight request not allowed",
                status_code=403
            )
        
        # Формируем CORS заголовки для preflight
        headers = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': ', '.join(self.allow_methods),
            'Access-Control-Max-Age': str(self.max_age),
            'Vary': 'Origin',  # Важно для CDN/прокси кэшей
        }
        
        if self.allow_headers:
            if '*' in self.allow_headers:
                # Если разрешен "*", используем запрошенные заголовки
                requested_headers = request.headers.get('access-control-request-headers')
                if requested_headers:
                    headers['Access-Control-Allow-Headers'] = requested_headers
                else:
                    headers['Access-Control-Allow-Headers'] = '*'
            else:
                headers['Access-Control-Allow-Headers'] = ', '.join(self.allow_headers)
        
        if allow_credentials:
            headers['Access-Control-Allow-Credentials'] = 'true'
        
        logger.info(f"✅ CORS preflight разрешен для origin {origin} (widget: {is_widget_endpoint})")
        
        # Записываем метрику успешного разрешения
        if is_widget_endpoint:
            self._record_widget_metrics(
                endpoint=request.url.path,
                origin=origin,
                status="allowed",
                result="valid_token"
            )
        
        return PlainTextResponse("OK", status_code=200, headers=headers)

    def add_cors_headers(self, response: Response, origin: str, is_widget_endpoint: bool) -> Response:
        """Добавляет CORS заголовки к ответу"""
        
        # Определяем, разрешен ли origin
        allowed = False
        allow_credentials = False
        
        if is_widget_endpoint:
            # Для виджет эндпоинтов - всегда разрешаем после валидации токена
            # (валидация происходит в самом эндпоинте)
            allowed = True
            allow_credentials = False
        else:
            # Для основного приложения - проверяем статический список
            allowed = self.is_main_app_origin_allowed(origin)
            allow_credentials = self.allow_credentials and allowed
        
        if not allowed:
            logger.warning(f"❌ CORS отклонен для origin {origin}")
            return response
        
        # Добавляем CORS заголовки
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'  # Важно для CDN/прокси кэшей
        
        if self.expose_headers:
            response.headers['Access-Control-Expose-Headers'] = ', '.join(self.expose_headers)
        
        if allow_credentials:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        logger.debug(f"✅ CORS заголовки добавлены для origin {origin} (widget: {is_widget_endpoint})")
        
        return response