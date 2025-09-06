"""
Тесты security fixes для WebSocket системы
Проверяет исправления IP spoofing и memory exhaustion
"""

import pytest
import time
from unittest.mock import Mock, patch

from services.websocket_manager import (
    _extract_client_ip,
    _is_trusted_proxy,
    _check_rate_limit,
    _ws_rate_limits
)


class MockWebSocket:
    """Mock WebSocket для тестирования security fixes"""
    
    def __init__(self, client_host="192.168.1.100", headers=None):
        self.client = Mock()
        self.client.host = client_host
        self.headers = headers or {}


class TestIPExtractionSecurity:
    """Тесты безопасного извлечения IP адресов"""
    
    def test_direct_client_ip_not_from_proxy(self):
        """Тест прямого подключения (не от proxy)"""
        ws = MockWebSocket(client_host="203.0.113.10")  # Public IP
        
        result = _extract_client_ip(ws)
        
        assert result == "203.0.113.10"
        
    def test_trusted_proxy_with_forwarded_for(self):
        """Тест запроса через доверенный proxy с X-Forwarded-For"""
        ws = MockWebSocket(
            client_host="10.0.0.5",  # Trusted proxy
            headers={"x-forwarded-for": "203.0.113.20, 10.0.0.5"}
        )
        
        result = _extract_client_ip(ws)
        
        assert result == "203.0.113.20"  # Real client IP
        
    def test_trusted_proxy_with_real_ip(self):
        """Тест запроса через доверенный proxy с X-Real-IP"""
        ws = MockWebSocket(
            client_host="127.0.0.1",  # Trusted proxy 
            headers={"x-real-ip": "203.0.113.30"}
        )
        
        result = _extract_client_ip(ws)
        
        assert result == "203.0.113.30"
        
    def test_ip_spoofing_protection(self):
        """Тест защиты от IP spoofing"""
        # Злонамеренный клиент пытается подделать X-Forwarded-For
        ws = MockWebSocket(
            client_host="203.0.113.40",  # NOT a trusted proxy
            headers={"x-forwarded-for": "127.0.0.1"}  # Попытка spoofing
        )
        
        result = _extract_client_ip(ws)
        
        # Должен вернуть реальный IP, а не подделанный header
        assert result == "203.0.113.40"
        
    def test_trusted_proxy_detection(self):
        """Тест определения доверенных proxy"""
        trusted_proxies = {"10.0.0.1", "127.0.0.1"}
        
        assert _is_trusted_proxy("10.0.0.1", trusted_proxies) == True
        assert _is_trusted_proxy("127.0.0.1", trusted_proxies) == True  
        assert _is_trusted_proxy("203.0.113.1", trusted_proxies) == False
        
        # Тест префиксов частных сетей
        assert _is_trusted_proxy("10.1.2.3", set()) == True
        assert _is_trusted_proxy("172.16.0.1", set()) == True
        assert _is_trusted_proxy("192.168.1.1", set()) == True
        assert _is_trusted_proxy("203.0.113.1", set()) == False


class TestMemoryExhaustionProtection:
    """Тесты защиты от memory exhaustion в rate limiting"""
    
    def setup_method(self):
        """Очищаем rate limits перед каждым тестом"""
        _ws_rate_limits.clear()
        
    def test_normal_rate_limiting(self):
        """Тест нормальной работы rate limiting"""
        test_ip = "192.168.1.100"
        
        # Первые 99 подключений должны быть разрешены
        for i in range(99):
            assert _check_rate_limit(test_ip) == True
            
        # 100-е подключение должно быть разрешено
        assert _check_rate_limit(test_ip) == True
        
        # 101-е подключение должно быть заблокировано
        assert _check_rate_limit(test_ip) == False
        
    def test_memory_exhaustion_protection(self):
        """Тест защиты от memory exhaustion"""
        # Заполняем много IP адресов для превышения лимита
        MAX_TEST_IPS = 11000  # Больше чем MAX_TRACKED_IPS (10000)
        
        old_time = time.time() - 3600  # 1 час назад
        
        # Заполняем старыми записями
        for i in range(MAX_TEST_IPS):
            ip = f"192.168.{i//256}.{i%256}"
            _ws_rate_limits[ip] = [old_time]
            
        initial_count = len(_ws_rate_limits)
        assert initial_count == MAX_TEST_IPS
        
        # Новое подключение должно триггернуть cleanup
        new_ip = "10.0.0.100"
        result = _check_rate_limit(new_ip)
        
        assert result == True  # Подключение разрешено
        
        # Количество отслеживаемых IP должно уменьшиться
        final_count = len(_ws_rate_limits)
        assert final_count < initial_count
        assert final_count <= 10000 + 1000  # MAX_TRACKED_IPS + cleanup buffer
        
    def test_memory_cleanup_preserves_recent_ips(self):
        """Тест что cleanup сохраняет недавние IP"""
        current_time = time.time()
        
        # Добавляем старые IP
        for i in range(5000):
            old_ip = f"10.1.{i//256}.{i%256}"
            _ws_rate_limits[old_ip] = [current_time - 3600]  # 1 час назад
            
        # Добавляем недавние IP  
        recent_ips = []
        for i in range(5000):
            recent_ip = f"10.2.{i//256}.{i%256}"
            _ws_rate_limits[recent_ip] = [current_time - 30]  # 30 сек назад
            recent_ips.append(recent_ip)
            
        # Добавляем еще IP для триггера cleanup
        for i in range(2000):
            extra_ip = f"10.3.{i//256}.{i%256}"
            _ws_rate_limits[extra_ip] = [current_time - 7200]  # 2 часа назад
            
        # Триггерим cleanup
        _check_rate_limit("10.0.0.1")
        
        # Проверяем что недавние IP сохранились
        preserved_recent = sum(1 for ip in recent_ips if ip in _ws_rate_limits)
        assert preserved_recent > len(recent_ips) * 0.8  # Большинство должно сохраниться
        
    def test_window_based_cleanup(self):
        """Тест очистки записей по временному окну"""
        test_ip = "192.168.2.100"
        current_time = time.time()
        
        # Добавляем старые записи (за пределами окна)
        _ws_rate_limits[test_ip] = [
            current_time - 120,  # 2 минуты назад (за пределами 60s окна)
            current_time - 90,   # 1.5 минуты назад
            current_time - 30,   # 30 секунд назад (в пределах окна)
            current_time - 10    # 10 секунд назад (в пределах окна)
        ]
        
        # Проверяем rate limit
        result = _check_rate_limit(test_ip)
        assert result == True
        
        # Старые записи должны быть очищены, остались только 2 + новая
        remaining_timestamps = _ws_rate_limits[test_ip]
        assert len(remaining_timestamps) == 3  # 2 в окне + 1 новая
        
        # Все оставшиеся timestamps должны быть в пределах окна
        window_start = time.time() - 60  # WS_RATE_LIMIT_WINDOW
        assert all(ts > window_start for ts in remaining_timestamps)


class TestSecurityIntegration:
    """Интеграционные тесты security fixes"""
    
    def setup_method(self):
        """Очищаем состояние перед тестами"""
        _ws_rate_limits.clear()
        
    def test_end_to_end_security_flow(self):
        """Тест полного security flow"""
        # 1. Создаем WebSocket от реального клиента
        real_client_ws = MockWebSocket(client_host="203.0.113.50")
        
        # 2. Извлекаем IP безопасно
        client_ip = _extract_client_ip(real_client_ws)
        assert client_ip == "203.0.113.50"
        
        # 3. Проверяем rate limiting
        for i in range(100):
            assert _check_rate_limit(client_ip) == True
            
        # 4. Превышение лимита
        assert _check_rate_limit(client_ip) == False
        
        # 5. Попытка spoofing от злонамеренного клиента
        malicious_ws = MockWebSocket(
            client_host="203.0.113.60",  # НЕ доверенный proxy
            headers={"x-forwarded-for": "127.0.0.1"}  # Поддельный header
        )
        
        spoofed_ip = _extract_client_ip(malicious_ws)
        assert spoofed_ip == "203.0.113.60"  # Реальный IP, не поддельный
        
        # 6. Spoofing не должен обойти rate limiting
        for i in range(100):
            assert _check_rate_limit(spoofed_ip) == True
            
        assert _check_rate_limit(spoofed_ip) == False


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])