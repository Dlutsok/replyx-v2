"""
Proxy Manager с отказоустойчивостью и балансировкой
Реализует circuit breaker, классификацию ошибок и приоритизированный фейловер
"""

import os
import json
import time
import asyncio
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import logging
from dataclasses import dataclass, field
import httpx

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Состояния circuit breaker'а"""
    CLOSED = "closed"      # Нормальная работа
    OPEN = "open"         # Прокси заблокирован
    HALF_OPEN = "half_open"  # Тестовый режим


class ProxyErrorType(Enum):
    """Типы ошибок прокси для классификации"""
    CONNECTION_ERROR = "connection_error"    # ConnectError, ConnectTimeout 
    READ_TIMEOUT = "read_timeout"           # ReadTimeout
    AUTH_ERROR = "auth_error"               # 407, 403
    RATE_LIMIT = "rate_limit"               # 429
    PROXY_ERROR = "proxy_error"             # ProxyError
    UPSTREAM_ERROR = "upstream_error"        # 5xx от API, не от прокси
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class ProxyConfig:
    """Конфигурация одного прокси"""
    url: str
    priority: int
    name: str
    
    # Circuit breaker состояние
    circuit_state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    opened_at: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[datetime] = None
    last_error_type: Optional[ProxyErrorType] = None
    
    # Метрики
    requests_total: int = 0
    requests_ok: int = 0
    requests_failed: int = 0
    switches_total: int = 0
    response_times: List[float] = field(default_factory=list)
    
    def get_success_rate(self) -> float:
        """Процент успешных запросов"""
        if self.requests_total == 0:
            return 0.0
        return (self.requests_ok / self.requests_total) * 100
    
    def get_avg_response_time(self) -> float:
        """Средний response time"""
        if not self.response_times:
            return 0.0
        return sum(self.response_times) / len(self.response_times)
    
    def get_p95_response_time(self) -> float:
        """95-й перцентиль response time"""
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = int(0.95 * len(sorted_times))
        return sorted_times[min(index, len(sorted_times) - 1)]


class ProxyErrorClassifier:
    """Классификатор ошибок прокси для принятия решений"""
    
    # Ошибки, требующие немедленного переключения прокси
    IMMEDIATE_SWITCH = [
        httpx.ConnectError,
        httpx.ConnectTimeout, 
        httpx.ProxyError,
        httpx.RemoteProtocolError
    ]
    
    # Ошибки с одним retry, затем переключение
    RETRY_THEN_SWITCH = [
        httpx.ReadTimeout
    ]
    
    # HTTP коды, требующие длительной блокировки (15 мин)
    LONG_COOLDOWN_CODES = [407, 403, 429]
    
    # HTTP коды upstream ошибок (не менять прокси)
    UPSTREAM_ERROR_CODES = [500, 502, 503, 504]
    
    @classmethod
    def classify_error(cls, error: Exception, response_code: Optional[int] = None) -> ProxyErrorType:
        """Классификация ошибки для принятия решения"""
        
        if isinstance(error, tuple(cls.IMMEDIATE_SWITCH)):
            if isinstance(error, (httpx.ConnectError, httpx.ConnectTimeout)):
                return ProxyErrorType.CONNECTION_ERROR
            elif isinstance(error, httpx.ProxyError):
                return ProxyErrorType.PROXY_ERROR
            else:
                return ProxyErrorType.CONNECTION_ERROR
        
        if isinstance(error, tuple(cls.RETRY_THEN_SWITCH)):
            return ProxyErrorType.READ_TIMEOUT
        
        if response_code:
            if response_code in cls.LONG_COOLDOWN_CODES:
                if response_code in [407, 403]:
                    return ProxyErrorType.AUTH_ERROR
                elif response_code == 429:
                    return ProxyErrorType.RATE_LIMIT
            
            if response_code in cls.UPSTREAM_ERROR_CODES:
                return ProxyErrorType.UPSTREAM_ERROR
        
        return ProxyErrorType.UNKNOWN_ERROR
    
    @classmethod
    def should_switch_proxy(cls, error_type: ProxyErrorType) -> bool:
        """Определяет, нужно ли переключать прокси"""
        return error_type in [
            ProxyErrorType.CONNECTION_ERROR,
            ProxyErrorType.PROXY_ERROR,
            ProxyErrorType.AUTH_ERROR,
            ProxyErrorType.RATE_LIMIT
        ]
    
    @classmethod
    def should_retry(cls, error_type: ProxyErrorType) -> bool:
        """Определяет, нужно ли делать retry на том же прокси"""
        return error_type == ProxyErrorType.READ_TIMEOUT
    
    @classmethod
    def get_cooldown_seconds(cls, error_type: ProxyErrorType) -> int:
        """Возвращает время блокировки прокси в секундах"""
        cooldown_map = {
            ProxyErrorType.CONNECTION_ERROR: 60,    # 1 минута
            ProxyErrorType.PROXY_ERROR: 60,         # 1 минута
            ProxyErrorType.READ_TIMEOUT: 30,        # 30 секунд
            ProxyErrorType.AUTH_ERROR: 900,         # 15 минут
            ProxyErrorType.RATE_LIMIT: 300,         # 5 минут
            ProxyErrorType.UPSTREAM_ERROR: 0,       # Не блокируем
            ProxyErrorType.UNKNOWN_ERROR: 120       # 2 минуты
        }
        return cooldown_map.get(error_type, 60)


class ProxyCircuitBreaker:
    """Circuit Breaker для конкретного прокси с half-open состоянием"""
    
    def __init__(self, failure_threshold: int = 3):
        self.failure_threshold = failure_threshold
    
    def can_make_request(self, proxy: ProxyConfig) -> bool:
        """Проверяет, можно ли делать запрос через этот прокси"""
        
        if proxy.circuit_state == CircuitState.CLOSED:
            return True
        
        if proxy.circuit_state == CircuitState.OPEN:
            # Проверяем, не пора ли перейти в HALF_OPEN
            if proxy.opened_at:
                error_type = proxy.last_error_type or ProxyErrorType.UNKNOWN_ERROR
                cooldown_seconds = ProxyErrorClassifier.get_cooldown_seconds(error_type)
                
                if (datetime.now() - proxy.opened_at).total_seconds() >= cooldown_seconds:
                    proxy.circuit_state = CircuitState.HALF_OPEN
                    logger.info(f"🔄 Прокси '{proxy.name}' переведен в HALF_OPEN после cooldown")
                    return True
            
            return False
        
        if proxy.circuit_state == CircuitState.HALF_OPEN:
            # В полуоткрытом состоянии разрешаем одну пробную заявку
            return True
        
        return False
    
    def record_success(self, proxy: ProxyConfig) -> None:
        """Записываает успешный запрос"""
        proxy.circuit_state = CircuitState.CLOSED
        proxy.failure_count = 0
        proxy.opened_at = None
        proxy.last_success = datetime.now()
        proxy.requests_ok += 1
        proxy.requests_total += 1
        
        logger.info(f"✅ Прокси '{proxy.name}' восстановлен после успешного запроса")
    
    def record_failure(self, proxy: ProxyConfig, error_type: ProxyErrorType) -> None:
        """Записывает неудачный запрос"""
        proxy.failure_count += 1
        proxy.last_error = datetime.now()
        proxy.last_error_type = error_type
        proxy.requests_failed += 1
        proxy.requests_total += 1
        
        # Переходим в OPEN если превысили порог или в HALF_OPEN режиме
        if (proxy.circuit_state == CircuitState.HALF_OPEN or 
            proxy.failure_count >= self.failure_threshold):
            
            proxy.circuit_state = CircuitState.OPEN
            proxy.opened_at = datetime.now()
            cooldown = ProxyErrorClassifier.get_cooldown_seconds(error_type)
            
            logger.warning(
                f"⛔ Прокси '{proxy.name}' заблокирован на {cooldown}s "
                f"после {proxy.failure_count} ошибок типа {error_type.value}"
            )


class ProxyManager:
    """Менеджер прокси с отказоустойчивостью и приоритизированным фейловером"""
    
    def __init__(self):
        self.proxies: List[ProxyConfig] = []
        self.circuit_breaker = ProxyCircuitBreaker()
        self.current_proxy_index = 0
        self._load_proxy_config()
        
        # Тайминги из environment
        self.connect_timeout = int(os.getenv('OPENAI_PROXY_CONNECT_TIMEOUT', '5'))
        self.read_timeout = int(os.getenv('OPENAI_PROXY_READ_TIMEOUT', '30'))
        self.stream_timeout = int(os.getenv('OPENAI_PROXY_STREAM_TIMEOUT', '300'))
        
        logger.info(f"🔗 Инициализирован ProxyManager с {len(self.proxies)} прокси")
    
    def _load_proxy_config(self) -> None:
        """Загружает конфигурацию прокси из environment variables"""
        
        # Новый JSON формат
        proxy_config_json = os.getenv('OPENAI_PROXY_CONFIG')
        if proxy_config_json:
            try:
                proxy_data = json.loads(proxy_config_json)
                for item in proxy_data:
                    proxy = ProxyConfig(
                        url=item['url'],
                        priority=item.get('priority', 1),
                        name=item.get('name', f'proxy_{len(self.proxies) + 1}')
                    )
                    self.proxies.append(proxy)
                
                # Сортируем по приоритету (меньше число = выше приоритет)
                self.proxies.sort(key=lambda x: x.priority)
                logger.info(f"✅ Загружено {len(self.proxies)} прокси из OPENAI_PROXY_CONFIG")
                return
            
            except json.JSONDecodeError as e:
                logger.error(f"❌ Ошибка парсинга OPENAI_PROXY_CONFIG: {e}")
        
        # Fallback к старому формату
        old_proxy_url = os.getenv('OPENAI_PROXY_URL')
        if old_proxy_url:
            proxy = ProxyConfig(
                url=old_proxy_url,
                priority=1,
                name='legacy_proxy'
            )
            self.proxies.append(proxy)
            logger.info("✅ Использован legacy OPENAI_PROXY_URL")
        else:
            logger.warning("⚠️ Прокси не настроены - работа без прокси")
    
    def get_available_proxy(self) -> Optional[ProxyConfig]:
        """Возвращает первый доступный прокси по приоритету"""
        
        if not self.proxies:
            return None
        
        # Ищем первый доступный прокси по приоритету
        for proxy in self.proxies:
            if self.circuit_breaker.can_make_request(proxy):
                return proxy
        
        logger.warning("⚠️ Все прокси недоступны")
        return None
    
    def record_proxy_success(self, proxy: ProxyConfig, response_time: float) -> None:
        """Записывает успешное использование прокси"""
        self.circuit_breaker.record_success(proxy)
        
        # Обновляем метрики
        proxy.response_times.append(response_time)
        # Храним только последние 100 измерений
        if len(proxy.response_times) > 100:
            proxy.response_times = proxy.response_times[-100:]
    
    def record_proxy_failure(self, proxy: ProxyConfig, error: Exception, 
                           response_code: Optional[int] = None) -> ProxyErrorType:
        """Записывает неудачное использование прокси"""
        error_type = ProxyErrorClassifier.classify_error(error, response_code)
        self.circuit_breaker.record_failure(proxy, error_type)
        
        logger.warning(f"⚠️ Ошибка прокси '{proxy.name}': {error_type.value} - {error}")
        return error_type
    
    def should_retry_with_same_proxy(self, error_type: ProxyErrorType) -> bool:
        """Определяет, нужно ли повторить запрос с тем же прокси"""
        return ProxyErrorClassifier.should_retry(error_type)
    
    def should_switch_proxy(self, error_type: ProxyErrorType) -> bool:
        """Определяет, нужно ли переключиться на другой прокси"""
        return ProxyErrorClassifier.should_switch_proxy(error_type)
    
    def get_proxy_for_request(self, is_stream: bool = False) -> Tuple[Optional[str], Dict[str, Any]]:
        """
        Возвращает URL прокси и httpx client kwargs для запроса
        
        Returns:
            Tuple[proxy_url, client_kwargs]
        """
        proxy = self.get_available_proxy()
        if not proxy:
            # Возвращаем конфигурацию без прокси с оптимизированными таймаутами
            timeout = self.stream_timeout if is_stream else self.read_timeout
            client_kwargs = {
                "timeout": httpx.Timeout(
                    connect=min(self.connect_timeout, 10),  # Быстрее подключение без прокси
                    read=timeout,
                    write=self.connect_timeout,
                    pool=self.connect_timeout
                ),
                "trust_env": False,
                "follow_redirects": True,
                "limits": httpx.Limits(max_keepalive_connections=20, max_connections=100)
            }
            return None, client_kwargs
        
        # Выбираем правильный timeout для прокси
        timeout = self.stream_timeout if is_stream else self.read_timeout
        
        # Оптимизированные настройки для прокси
        client_kwargs = {
            "proxy": proxy.url,
            "timeout": httpx.Timeout(
                connect=self.connect_timeout,
                read=timeout,
                write=self.connect_timeout,
                pool=self.connect_timeout
            ),
            "trust_env": False,
            "follow_redirects": True,
            "limits": httpx.Limits(max_keepalive_connections=10, max_connections=50),
            # Предотвращаем зависание на DNS
            "transport": httpx.HTTPTransport(retries=0)
        }
        
        return proxy.url, client_kwargs
    
    def get_proxy_metrics(self) -> Dict[str, Any]:
        """Возвращает метрики всех прокси"""
        metrics = {
            "proxies": [],
            "total_proxies": len(self.proxies),
            "available_proxies": sum(1 for p in self.proxies if self.circuit_breaker.can_make_request(p)),
            "all_proxies_down": not any(self.circuit_breaker.can_make_request(p) for p in self.proxies)
        }
        
        for proxy in self.proxies:
            proxy_metrics = {
                "name": proxy.name,
                "url_masked": self._mask_proxy_url(proxy.url),
                "priority": proxy.priority,
                "circuit_state": proxy.circuit_state.value,
                "requests_total": proxy.requests_total,
                "requests_ok": proxy.requests_ok,
                "requests_failed": proxy.requests_failed,
                "success_rate": proxy.get_success_rate(),
                "avg_response_time": proxy.get_avg_response_time(),
                "p95_response_time": proxy.get_p95_response_time(),
                "last_error_type": proxy.last_error_type.value if proxy.last_error_type else None,
                "last_error_time": proxy.last_error.isoformat() if proxy.last_error else None,
                "last_success_time": proxy.last_success.isoformat() if proxy.last_success else None
            }
            metrics["proxies"].append(proxy_metrics)
        
        return metrics
    
    def _mask_proxy_url(self, url: str) -> str:
        """Маскирует пароль в URL прокси для логирования"""
        if '@' in url:
            parts = url.split('@')
            if ':' in parts[0]:
                auth_part = parts[0].split(':')
                if len(auth_part) >= 3:  # protocol:user:pass
                    auth_part[-1] = '***'
                    parts[0] = ':'.join(auth_part)
            return '@'.join(parts)
        return url


# Глобальный экземпляр менеджера прокси
proxy_manager = ProxyManager()


def get_proxy_manager() -> ProxyManager:
    """Получить глобальный экземпляр менеджера прокси"""
    return proxy_manager