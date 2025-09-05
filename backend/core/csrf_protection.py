"""
🛡️ CSRF PROTECTION SYSTEM
Комплексная система защиты от Cross-Site Request Forgery атак
"""

import secrets
import hashlib
import hmac
import time
from typing import Optional, Set
from fastapi import HTTPException, Request, Response, status
from fastapi.security.utils import get_authorization_scheme_param
import logging

logger = logging.getLogger(__name__)

class CSRFProtection:
    def __init__(
        self,
        secret_key: str,
        token_name: str = "csrf_token", 
        header_name: str = "X-CSRF-Token",
        cookie_name: str = "csrftoken",
        safe_methods: Set[str] = {"GET", "HEAD", "OPTIONS", "TRACE"},
        token_lifetime: int = 3600,  # 1 час
        require_https: bool = True,
        same_site: str = "strict"
    ):
        self.secret_key = secret_key.encode() if isinstance(secret_key, str) else secret_key
        self.token_name = token_name
        self.header_name = header_name 
        self.cookie_name = cookie_name
        self.safe_methods = safe_methods
        self.token_lifetime = token_lifetime
        self.require_https = require_https
        self.same_site = same_site
        
        # Exempt paths (не требуют CSRF проверки)
        self.exempt_paths = {
            "/health",
            "/metrics", 
            "/docs",
            "/openapi.json",
            "/redoc"
        }
        
        logger.info(f"🛡️ CSRF Protection инициализирован")
        
    def generate_csrf_token(self, session_id: Optional[str] = None) -> str:
        """Генерирует CSRF токен"""
        # Используем session_id или создаем случайный
        if not session_id:
            session_id = secrets.token_urlsafe(16)
            
        timestamp = str(int(time.time()))
        random_part = secrets.token_urlsafe(16)
        
        # Создаем подпись: HMAC(secret_key, session_id + timestamp + random_part)
        message = f"{session_id}:{timestamp}:{random_part}".encode()
        signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
        
        # Итоговый токен: base64(session_id:timestamp:random_part:signature)
        token_data = f"{session_id}:{timestamp}:{random_part}:{signature}"
        return secrets.token_urlsafe().replace('_', '').replace('-', '') + token_data.encode().hex()
        
    def verify_csrf_token(self, token: str, session_id: Optional[str] = None) -> bool:
        """Проверяет валидность CSRF токена"""
        try:
            # Извлекаем данные из токена
            if len(token) < 32:
                return False
                
            hex_data = token[32:]  # Убираем случайный префикс
            token_data = bytes.fromhex(hex_data).decode()
            
            parts = token_data.split(':')
            if len(parts) != 4:
                return False
                
            token_session_id, timestamp, random_part, provided_signature = parts
            
            # Проверяем время жизни токена
            token_time = int(timestamp)
            current_time = int(time.time())
            if current_time - token_time > self.token_lifetime:
                logger.warning(f"🛡️ CSRF токен истек: {current_time - token_time}s старый")
                return False
                
            # Проверяем session_id если предоставлен
            if session_id and token_session_id != session_id:
                logger.warning(f"🛡️ CSRF токен для другой сессии")
                return False
                
            # Проверяем подпись
            message = f"{token_session_id}:{timestamp}:{random_part}".encode()
            expected_signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
            
            if not hmac.compare_digest(provided_signature, expected_signature):
                logger.warning(f"🛡️ Неверная подпись CSRF токена")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"🛡️ Ошибка проверки CSRF токена: {e}")
            return False
            
    def get_csrf_token_from_request(self, request: Request) -> Optional[str]:
        """Извлекает CSRF токен из запроса (header, form data, query param)"""
        # 1. Проверяем header
        token = request.headers.get(self.header_name)
        if token:
            return token
            
        # 2. Проверяем form data (для multipart/form-data и application/x-www-form-urlencoded)
        if hasattr(request, '_form') and request._form:
            token = request._form.get(self.token_name)
            if token:
                return token
                
        # 3. Проверяем query parameters (менее безопасно, но иногда нужно)
        token = request.query_params.get(self.token_name)
        if token:
            logger.warning(f"🛡️ CSRF токен получен из query params (небезопасно)")
            return token
            
        return None
        
    def get_session_id(self, request: Request) -> Optional[str]:
        """Получает session ID из cookies или JWT токена"""
        # Пробуем получить из JWT токена
        auth_header = request.headers.get("Authorization")
        if auth_header:
            scheme, token = get_authorization_scheme_param(auth_header)
            if scheme.lower() == "bearer" and token:
                try:
                    from jose import jwt
                    from core.auth import SECRET_KEY, ALGORITHM
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    return payload.get("jti") or payload.get("sub")  # JWT ID или subject
                except Exception:
                    pass
                    
        # Пробуем получить из session cookie
        session_cookie = request.cookies.get("session_id")
        if session_cookie:
            return session_cookie
            
        # Fallback: создаем временный идентификатор на основе User-Agent + IP
        user_agent = request.headers.get("User-Agent", "")
        client_ip = self._get_client_ip(request)
        if user_agent or client_ip:
            return hashlib.sha256(f"{user_agent}:{client_ip}".encode()).hexdigest()[:16]
            
        return None
        
    def _get_client_ip(self, request: Request) -> str:
        """Получает IP адрес клиента"""
        # Проверяем заголовки прокси
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
            
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        # Fallback к client IP из FastAPI
        return request.client.host if request.client else "unknown"
        
    def check_referer(self, request: Request) -> bool:
        """Проверяет Referer header как дополнительная защита"""
        referer = request.headers.get("Referer")
        if not referer:
            logger.warning("🛡️ Отсутствует Referer header")
            return False
            
        # Проверяем что Referer совпадает с нашим доменом
        host = request.headers.get("Host")
        if not host:
            return False
            
        # Извлекаем домен из referer
        from urllib.parse import urlparse
        referer_domain = urlparse(referer).netloc
        
        # Сравниваем домены
        if referer_domain != host:
            logger.warning(f"🛡️ Referer не совпадает: {referer_domain} != {host}")
            return False
            
        return True
        
    def check_origin(self, request: Request) -> bool:
        """Проверяет Origin header"""
        origin = request.headers.get("Origin")
        if not origin:
            # Origin может отсутствовать для same-site запросов
            return True
            
        host = request.headers.get("Host")
        if not host:
            return False
            
        from urllib.parse import urlparse
        origin_domain = urlparse(origin).netloc
        
        if origin_domain != host:
            logger.warning(f"🛡️ Origin не совпадает: {origin_domain} != {host}")
            return False
            
        return True
        
    def is_exempt_path(self, path: str) -> bool:
        """Проверяет, освобожден ли путь от CSRF проверки"""
        # Точное совпадение
        if path in self.exempt_paths:
            return True
            
        # Проверка префиксов для API документации и статических файлов
        exempt_prefixes = ["/docs", "/static", "/favicon"]
        return any(path.startswith(prefix) for prefix in exempt_prefixes)
        
    async def __call__(self, request: Request, call_next):
        """CSRF Middleware для FastAPI"""
        # Пропускаем безопасные методы
        if request.method in self.safe_methods:
            response = await call_next(request)
            
            # Добавляем CSRF токен в cookie для GET запросов
            if request.method == "GET" and not request.url.path.startswith("/api/"):
                csrf_token = self.generate_csrf_token(self.get_session_id(request))
                response.set_cookie(
                    key=self.cookie_name,
                    value=csrf_token,
                    max_age=self.token_lifetime,
                    httponly=False,  # Frontend должен иметь доступ к токену
                    secure=self.require_https,
                    samesite=self.same_site
                )
            
            return response
            
        # Пропускаем освобожденные пути
        if self.is_exempt_path(request.url.path):
            return await call_next(request)
            
        # Проверяем HTTPS в продакшене
        if self.require_https and request.headers.get("X-Forwarded-Proto") != "https" and not request.url.scheme == "https":
            if request.headers.get("Host", "").startswith("localhost"):
                pass  # Разрешаем localhost для разработки
            else:
                logger.warning(f"🛡️ CSRF проверка требует HTTPS")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HTTPS обязателен"
                )
                
        # Проверяем Origin и Referer headers
        if not self.check_origin(request):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Неверный Origin header"
            )
            
        if not self.check_referer(request):
            # Referer может отсутствовать в некоторых случаях, делаем warning но не блокируем
            logger.warning(f"🛡️ Отсутствует или неверный Referer для {request.url.path}")
            
        # Получаем CSRF токен из запроса
        csrf_token = self.get_csrf_token_from_request(request)
        if not csrf_token:
            logger.warning(f"🛡️ CSRF токен отсутствует в запросе {request.method} {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF токен обязателен"
            )
            
        # Получаем session ID
        session_id = self.get_session_id(request)
        
        # Проверяем CSRF токен
        if not self.verify_csrf_token(csrf_token, session_id):
            logger.warning(f"🛡️ Неверный CSRF токен для {request.method} {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Неверный CSRF токен"
            )
            
        logger.debug(f"🛡️ CSRF проверка пройдена для {request.method} {request.url.path}")
        
        # Обрабатываем запрос
        response = await call_next(request)
        
        return response

# Глобальный экземпляр CSRF защиты
csrf_protection = None

def get_csrf_protection(secret_key: str = None) -> CSRFProtection:
    """Получает глобальный экземпляр CSRF защиты"""
    global csrf_protection
    
    if csrf_protection is None:
        if not secret_key:
            from core.auth import SECRET_KEY
            secret_key = SECRET_KEY
            
        csrf_protection = CSRFProtection(
            secret_key=secret_key,
            require_https=True,  # В продакшене обязательно HTTPS
            same_site="strict"   # Строгая политика SameSite
        )
        
    return csrf_protection

def generate_csrf_token_for_response(request: Request = None, session_id: str = None) -> str:
    """Генерирует CSRF токен для ответа"""
    csrf = get_csrf_protection()
    
    if request and not session_id:
        session_id = csrf.get_session_id(request)
        
    return csrf.generate_csrf_token(session_id)
    
def verify_csrf_token_dependency(request: Request):
    """FastAPI dependency для проверки CSRF токена в отдельных эндпоинтах"""
    csrf = get_csrf_protection()
    
    # Пропускаем безопасные методы
    if request.method in csrf.safe_methods:
        return True
        
    # Пропускаем освобожденные пути
    if csrf.is_exempt_path(request.url.path):
        return True
        
    csrf_token = csrf.get_csrf_token_from_request(request)
    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF токен обязателен"
        )
        
    session_id = csrf.get_session_id(request)
    if not csrf.verify_csrf_token(csrf_token, session_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный CSRF токен"
        )
        
    return True