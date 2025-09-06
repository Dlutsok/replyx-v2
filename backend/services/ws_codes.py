"""
WebSocket Close Codes - стандартизированные коды закрытия
Обеспечивает детерминированное поведение переподключений
"""

class WSCloseCodes:
    """Детерминированные коды закрытия WebSocket с политиками переподключения"""
    
    # Стандартные коды (RFC 6455)
    NORMAL_CLOSURE = 1000        # Нормальное закрытие - НЕ реконнектить
    GOING_AWAY = 1001           # Сервер перезагружается - реконнект с backoff
    PROTOCOL_ERROR = 1002       # Ошибка протокола - НЕ реконнектить  
    SERVICE_RESTART = 1012      # Сервис перезапускается - реконнект с backoff
    TRY_AGAIN_LATER = 1013      # Временная недоступность - реконнект с backoff
    INTERNAL_ERROR = 1011       # Внутренняя ошибка сервера - реконнект с backoff
    ABNORMAL_CLOSURE = 1006     # Аварийное закрытие - реконнект с backoff
    
    # Кастомные коды приложения (4000-4999)
    AUTH_EXPIRED = 4001         # Токен истек - refresh токен → реконнект (без увеличения attempts)
    AUTH_FAILED = 4002          # Аутентификация провалена - НЕ реконнектить
    FORBIDDEN_DOMAIN = 4003     # Домен не разрешен - НЕ реконнектить, показать ошибку
    NOT_FOUND = 4004            # Ресурс/ассистент не найден - НЕ реконнектить
    RATE_LIMITED = 4008         # Превышен rate limit - реконнект с увеличенным backoff
    CONFLICT_CONNECTION = 4009  # Дублирующее соединение - быстрый реконнект (attempt=0)
    
    @classmethod
    def should_reconnect(cls, code: int) -> str:
        """
        Возвращает политику переподключения для кода закрытия
        
        Returns:
            'no' - не переподключаться
            'backoff' - переподключение с экспоненциальным backoff
            'refresh' - обновить токен и переподключиться
            'immediate' - немедленное переподключение
        """
        no_reconnect_codes = {
            cls.NORMAL_CLOSURE,
            cls.PROTOCOL_ERROR,
            cls.AUTH_FAILED,
            cls.FORBIDDEN_DOMAIN,
            cls.NOT_FOUND
        }
        
        if code in no_reconnect_codes:
            return 'no'
        
        if code == cls.AUTH_EXPIRED:
            return 'refresh'
            
        if code == cls.CONFLICT_CONNECTION:
            return 'immediate'
            
        # Все остальные коды требуют backoff переподключения
        return 'backoff'
    
    @classmethod
    def get_reason_message(cls, code: int) -> str:
        """Пользовательское сообщение для кода закрытия"""
        messages = {
            cls.NORMAL_CLOSURE: "Соединение закрыто",
            cls.GOING_AWAY: "Сервер недоступен",
            cls.SERVICE_RESTART: "Сервис перезапускается",
            cls.TRY_AGAIN_LATER: "Сервер перегружен",
            cls.INTERNAL_ERROR: "Внутренняя ошибка сервера",
            cls.ABNORMAL_CLOSURE: "Соединение прервано",
            cls.AUTH_EXPIRED: "Сеанс истек",
            cls.AUTH_FAILED: "Ошибка аутентификации",
            cls.FORBIDDEN_DOMAIN: "Домен не разрешен для этого виджета",
            cls.NOT_FOUND: "Ресурс не найден",
            cls.RATE_LIMITED: "Слишком много запросов",
            cls.CONFLICT_CONNECTION: "Обнаружено дублирующее соединение"
        }
        return messages.get(code, f"Неизвестная ошибка (код {code})")

# Экспорт для удобства
__all__ = ['WSCloseCodes']