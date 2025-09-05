"""
🛡️ SECURITY HEADERS MIDDLEWARE
Добавляет security headers и настраивает secure cookies
"""

from fastapi import Request, Response
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware:
    def __init__(self):
        self.security_headers = {
            # Предотвращение XSS атак
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",  # Разрешаем iframe для виджетов
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Content Security Policy (базовый)
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https:; "
                "connect-src 'self' https: wss: ws:; "
                "frame-ancestors 'self'; "
                "base-uri 'self'; "
                "form-action 'self'"
            ),
            
            # Предотвращение MIME sniffing
            "X-Download-Options": "noopen",
            "X-Permitted-Cross-Domain-Policies": "none",
            
            # Безопасность транспорта (только для HTTPS)
            # "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
        }
        
        logger.info("🛡️ Security Headers Middleware инициализирован")
        
    def add_hsts_header(self, response: Response, request: Request):
        """Добавляет HSTS header только для HTTPS соединений"""
        # Проверяем что соединение HTTPS
        is_https = (
            request.url.scheme == "https" or
            request.headers.get("X-Forwarded-Proto") == "https" or
            request.headers.get("X-Forwarded-Ssl") == "on"
        )
        
        if is_https:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            logger.debug("🛡️ HSTS header добавлен")
            
    def configure_secure_cookies(self, response: Response, request: Request):
        """Настраивает secure cookies"""
        is_https = (
            request.url.scheme == "https" or
            request.headers.get("X-Forwarded-Proto") == "https"
        )
        
        # Обновляем Set-Cookie headers для безопасности
        set_cookie_headers = response.headers.getlist("set-cookie")
        if set_cookie_headers:
            updated_cookies = []
            
            for cookie in set_cookie_headers:
                # Добавляем Secure flag для HTTPS
                if is_https and "Secure" not in cookie:
                    cookie += "; Secure"
                
                # Добавляем SameSite=Strict если не указан
                if "SameSite" not in cookie:
                    cookie += "; SameSite=Strict"
                
                # Добавляем HttpOnly для session cookies (но не для CSRF токенов)
                if "csrftoken" not in cookie and "HttpOnly" not in cookie:
                    cookie += "; HttpOnly"
                    
                updated_cookies.append(cookie)
            
            # Обновляем headers
            response.headers.pop("set-cookie")
            for cookie in updated_cookies:
                response.headers.append("set-cookie", cookie)
                
            logger.debug(f"🛡️ Настроены secure cookies: {len(updated_cookies)} cookies")
            
    async def __call__(self, request: Request, call_next):
        """Security Headers Middleware для FastAPI"""
        
        # Обрабатываем запрос
        response = await call_next(request)
        
        # Добавляем security headers
        for header_name, header_value in self.security_headers.items():
            # Не перезаписываем существующие headers
            if header_name not in response.headers:
                response.headers[header_name] = header_value
                
        # Добавляем HSTS для HTTPS
        self.add_hsts_header(response, request)
        
        # Настраиваем secure cookies
        self.configure_secure_cookies(response, request)
        
        # Логируем для отладки
        logger.debug(f"🛡️ Security headers добавлены для {request.url.path}")
        
        return response

# Глобальный экземпляр
security_headers_middleware = SecurityHeadersMiddleware()