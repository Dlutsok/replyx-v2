"""
Интеграционные тесты для WebSocket системы ReplyX
Тестирует все close codes, rate limiting, ACK системы и edge cases
"""

import pytest
import asyncio
import time
import json
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket, WebSocketState
from fastapi import HTTPException

# Тестируем наши модули
from services.websocket_manager import (
    dialog_websocket_endpoint,
    site_dialog_websocket_endpoint, 
    widget_dialog_websocket_endpoint,
    push_dialog_message,
    push_site_dialog_message,
    get_connection_stats,
    _check_rate_limit,
    _is_domain_allowed_by_token,
    _normalize_host_from_origin,
    ws_connections,
    ws_site_connections,
    _ws_rate_limits,
    _total_connections
)
from services.ws_codes import WSCloseCodes
from services.ws_config import WS_RATE_LIMIT_PER_IP, WS_RATE_LIMIT_WINDOW
from services.ws_message_queue import WSMessageQueue, message_queue


class MockWebSocket:
    """Mock WebSocket для тестирования"""
    
    def __init__(self, client_ip="127.0.0.1", origin=None):
        self.state = WebSocketState.CONNECTING
        self.client = Mock()
        self.client.host = client_ip
        self.headers = {"origin": origin} if origin else {}
        self.messages_sent = []
        self.close_code = None
        self.close_reason = None
        
    async def accept(self):
        self.state = WebSocketState.CONNECTED
        
    async def close(self, code=1000, reason=""):
        self.state = WebSocketState.DISCONNECTED
        self.close_code = code
        self.close_reason = reason
        
    async def send_json(self, data):
        if self.state != WebSocketState.CONNECTED:
            raise RuntimeError("WebSocket not connected")
        self.messages_sent.append(data)
        
    async def receive_json(self):
        # Simulate receiving message
        return {"type": "ping"}


@pytest.fixture(autouse=True)
def cleanup_websockets():
    """Очищаем состояние WebSocket между тестами"""
    global _total_connections
    ws_connections.clear()
    ws_site_connections.clear()
    _ws_rate_limits.clear()
    _total_connections = 0
    yield
    # Cleanup после тестов
    ws_connections.clear() 
    ws_site_connections.clear()
    _ws_rate_limits.clear()
    _total_connections = 0


class TestWebSocketCloseCodes:
    """Тесты всех close code сценариев"""
    
    @pytest.mark.asyncio
    async def test_rate_limited_close_code(self):
        """Тест RATE_LIMITED close code"""
        # Заполняем rate limit для IP
        test_ip = "192.168.1.100"
        current_time = time.time()
        _ws_rate_limits[test_ip] = [current_time] * (WS_RATE_LIMIT_PER_IP + 1)
        
        # Мокаем WebSocket
        mock_ws = MockWebSocket(client_ip=test_ip)
        mock_db = Mock()
        
        # Тестируем dialog endpoint
        await dialog_websocket_endpoint(mock_ws, dialog_id=1, token="test", db=mock_db)
        
        # Проверяем что соединение закрыто с правильным кодом
        assert mock_ws.close_code == WSCloseCodes.RATE_LIMITED
        assert mock_ws.close_reason == "Too many connections"
        
    @pytest.mark.asyncio 
    async def test_auth_failed_close_code(self):
        """Тест AUTH_FAILED close code при невалидном токене"""
        mock_ws = MockWebSocket()
        mock_db = Mock()
        
        # Мокаем get_user_from_token для возврата None
        with patch('core.auth.get_user_from_token', return_value=None):
            await dialog_websocket_endpoint(mock_ws, dialog_id=1, token="invalid_token", db=mock_db)
            
        assert mock_ws.close_code == WSCloseCodes.AUTH_FAILED
        assert "Invalid or expired token" in mock_ws.close_reason
        
    @pytest.mark.asyncio
    async def test_forbidden_domain_close_code(self):
        """Тест FORBIDDEN_DOMAIN close code"""
        mock_ws = MockWebSocket(origin="https://evil.com")
        mock_db = Mock()
        
        # Мокаем проверку домена для возврата False
        with patch('services.websocket_manager._is_domain_allowed_by_token', return_value=False):
            await site_dialog_websocket_endpoint(mock_ws, dialog_id=1, site_token="test_token", db=mock_db)
            
        assert mock_ws.close_code == WSCloseCodes.FORBIDDEN_DOMAIN
        assert "Domain not allowed" in mock_ws.close_reason
        
    @pytest.mark.asyncio
    async def test_not_found_close_code(self):
        """Тест NOT_FOUND close code для несуществующего ассистента"""
        mock_ws = MockWebSocket()
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        await widget_dialog_websocket_endpoint(mock_ws, dialog_id=1, assistant_id=999, db=mock_db)
        
        assert mock_ws.close_code == WSCloseCodes.NOT_FOUND
        assert "Assistant not found" in mock_ws.close_reason


class TestRateLimiting:
    """Тесты rate limiting функциональности"""
    
    def test_rate_limit_allow_under_limit(self):
        """Тест разрешения подключений под лимитом"""
        test_ip = "10.0.0.1"
        
        # Первые подключения должны быть разрешены
        for i in range(WS_RATE_LIMIT_PER_IP):
            assert _check_rate_limit(test_ip) == True
            
    def test_rate_limit_deny_over_limit(self):
        """Тест блокировки подключений превышающих лимит"""
        test_ip = "10.0.0.2"
        
        # Заполняем лимит
        for i in range(WS_RATE_LIMIT_PER_IP):
            _check_rate_limit(test_ip)
            
        # Следующее подключение должно быть заблокировано
        assert _check_rate_limit(test_ip) == False
        
    def test_rate_limit_window_cleanup(self):
        """Тест очистки старых записей rate limit"""
        test_ip = "10.0.0.3"
        old_time = time.time() - WS_RATE_LIMIT_WINDOW - 10
        
        # Добавляем старую запись
        _ws_rate_limits[test_ip] = [old_time] * WS_RATE_LIMIT_PER_IP
        
        # Новое подключение должно быть разрешено (старые записи очищены)
        assert _check_rate_limit(test_ip) == True
        
    def test_rate_limit_no_ip(self):
        """Тест поведения при отсутствии IP"""
        assert _check_rate_limit(None) == True
        assert _check_rate_limit("") == True


class TestDomainValidation:
    """Тесты валидации доменов"""
    
    def test_normalize_host_from_origin(self):
        """Тест нормализации host из Origin header"""
        # Тест различных форматов Origin
        assert _normalize_host_from_origin("https://example.com") == "example.com"
        assert _normalize_host_from_origin("http://example.com:3000") == "example.com"
        assert _normalize_host_from_origin("https://sub.example.com/path") == "sub.example.com"
        assert _normalize_host_from_origin("") == ""
        assert _normalize_host_from_origin(None) == ""
        
    @patch('jose.jwt.decode')
    def test_domain_allowed_by_token_valid(self, mock_jwt_decode):
        """Тест разрешения домена по валидному токену"""
        mock_jwt_decode.return_value = {"allowed_domains": "example.com,test.com"}
        
        result = _is_domain_allowed_by_token("https://example.com", "valid_token")
        assert result == True
        
    @patch('jose.jwt.decode')
    def test_domain_allowed_by_token_invalid(self, mock_jwt_decode):
        """Тест блокировки домена не в whitelist"""
        mock_jwt_decode.return_value = {"allowed_domains": "example.com"}
        
        result = _is_domain_allowed_by_token("https://evil.com", "valid_token")
        assert result == False
        
    @patch('jose.jwt.decode')
    def test_domain_allowed_subdomain_support(self, mock_jwt_decode):
        """Тест поддержки субдоменов"""
        mock_jwt_decode.return_value = {"allowed_domains": "example.com"}
        
        result = _is_domain_allowed_by_token("https://sub.example.com", "valid_token")
        assert result == True


class TestMessageQueue:
    """Тесты ACK системы и message queue"""
    
    def test_message_queue_creation(self):
        """Тест создания message queue"""
        queue = WSMessageQueue()
        assert queue.pending_messages == {}
        assert queue.processed_messages == set()
        
    @pytest.mark.asyncio
    async def test_send_message_with_ack(self):
        """Тест отправки сообщения с ACK"""
        queue = WSMessageQueue()
        
        message_id, payload = await queue.send_message_with_ack(
            dialog_id=1,
            websocket_id="test_ws_1",
            payload={"text": "Hello"}
        )
        
        assert message_id in queue.pending_messages
        assert payload["message_id"] == message_id
        assert payload["requires_ack"] == True
        assert "text" in payload
        
    @pytest.mark.asyncio
    async def test_handle_ack(self):
        """Тест обработки ACK"""
        queue = WSMessageQueue()
        
        # Отправляем сообщение
        message_id, _ = await queue.send_message_with_ack(1, "test_ws", {"text": "test"})
        
        # ACK обрабатывается корректно
        result = await queue.handle_ack(message_id, "test_ws")
        assert result == True
        assert message_id not in queue.pending_messages
        assert message_id in queue.processed_messages
        
    @pytest.mark.asyncio
    async def test_handle_ack_wrong_websocket(self):
        """Тест ACK от неправильного websocket"""
        queue = WSMessageQueue()
        
        message_id, _ = await queue.send_message_with_ack(1, "test_ws_1", {"text": "test"})
        
        # ACK от другого websocket должен быть отклонен
        result = await queue.handle_ack(message_id, "test_ws_2")
        assert result == False
        assert message_id in queue.pending_messages  # Сообщение остается в очереди
        
    def test_is_message_processed_deduplication(self):
        """Тест дедупликации сообщений"""
        queue = WSMessageQueue()
        message_id = "test_message_123"
        
        # Первоначально сообщение не обработано
        assert queue.is_message_processed(message_id) == False
        
        # Помечаем как обработанное
        queue.processed_messages.add(message_id)
        
        # Теперь должно быть обработано
        assert queue.is_message_processed(message_id) == True


class TestConcurrentOperations:
    """Тесты concurrent операций"""
    
    @pytest.mark.asyncio
    async def test_concurrent_push_messages(self):
        """Тест concurrent отправки сообщений"""
        dialog_id = 1
        
        # Создаем несколько mock WebSocket'ов
        mock_ws_list = [MockWebSocket() for _ in range(5)]
        ws_connections[dialog_id] = set(mock_ws_list)
        
        # Отправляем сообщения конкурентно
        tasks = []
        for i in range(10):
            task = asyncio.create_task(
                push_dialog_message(dialog_id, {"id": i, "text": f"Message {i}"})
            )
            tasks.append(task)
            
        # Ждем завершения всех задач
        await asyncio.gather(*tasks)
        
        # Проверяем что все сообщения дошли до всех клиентов
        for mock_ws in mock_ws_list:
            assert len(mock_ws.messages_sent) == 10
            
    @pytest.mark.asyncio  
    async def test_connection_cleanup_on_error(self):
        """Тест очистки соединений при ошибках"""
        dialog_id = 1
        
        # Создаем mock WebSocket который будет выбрасывать ошибку при send_json
        error_ws = MockWebSocket()
        error_ws.send_json = AsyncMock(side_effect=Exception("Connection error"))
        
        good_ws = MockWebSocket()
        
        ws_connections[dialog_id] = {error_ws, good_ws}
        
        # Отправляем сообщение
        await push_dialog_message(dialog_id, {"text": "test"})
        
        # Проверяем что error_ws удален, а good_ws остался
        remaining_connections = ws_connections.get(dialog_id, set())
        assert error_ws not in remaining_connections
        assert good_ws in remaining_connections


class TestConnectionStatistics:
    """Тесты статистики подключений"""
    
    def test_connection_stats_basic(self):
        """Тест базовой статистики"""
        stats = get_connection_stats()
        
        assert "total_connections" in stats
        assert "admin_dialogs" in stats
        assert "site_dialogs" in stats
        assert "rate_limited_ips" in stats
        assert "rate_limit_window" in stats
        assert "rate_limit_per_ip" in stats
        
    def test_connection_stats_with_active_limits(self):
        """Тест статистики с активными rate limits"""
        # Добавляем активные rate limits
        current_time = time.time()
        _ws_rate_limits["10.0.0.1"] = [current_time]
        _ws_rate_limits["10.0.0.2"] = [current_time - WS_RATE_LIMIT_WINDOW - 1]  # Старая запись
        
        stats = get_connection_stats()
        
        # Должна быть только одна активная запись
        assert stats["rate_limited_ips"] == 1


class TestProductionEdgeCases:
    """Тесты edge cases важных для production"""
    
    @pytest.mark.asyncio
    async def test_websocket_disconnect_during_message(self):
        """Тест отключения WebSocket во время отправки сообщения"""
        dialog_id = 1
        
        # WebSocket который "отключается" при первой попытке отправки
        disconnected_ws = MockWebSocket()
        disconnected_ws.send_json = AsyncMock(side_effect=RuntimeError("WebSocket disconnected"))
        
        ws_connections[dialog_id] = {disconnected_ws}
        
        # Отправка сообщения не должна падать
        await push_dialog_message(dialog_id, {"text": "test"})
        
        # Соединение должно быть очищено
        assert len(ws_connections.get(dialog_id, set())) == 0
        
    def test_memory_cleanup_large_rate_limits(self):
        """Тест очистки памяти при большом количестве rate limit записей"""
        # Заполняем много старых записей
        old_time = time.time() - WS_RATE_LIMIT_WINDOW - 100
        
        for i in range(1000):
            ip = f"192.168.1.{i % 255}"
            _ws_rate_limits[ip] = [old_time] * WS_RATE_LIMIT_PER_IP
            
        # Проверяем новое подключение - старые записи должны очищаться
        test_ip = "192.168.1.1"
        result = _check_rate_limit(test_ip)
        
        assert result == True
        # Старые записи для test_ip должны быть очищены
        assert len(_ws_rate_limits[test_ip]) == 1  # Только новая запись
        
    @pytest.mark.asyncio
    async def test_high_concurrency_connections(self):
        """Тест высокой конкурентности подключений"""
        dialog_id = 1
        
        # Симулируем много одновременных подключений
        mock_ws_list = [MockWebSocket() for _ in range(100)]
        
        # Добавляем все сразу (имитация concurrent подключений)
        ws_connections[dialog_id] = set(mock_ws_list)
        
        # Отправляем сообщение всем
        await push_dialog_message(dialog_id, {"text": "broadcast test"})
        
        # Все должны получить сообщение
        for mock_ws in mock_ws_list:
            assert len(mock_ws.messages_sent) == 1
            assert mock_ws.messages_sent[0]["text"] == "broadcast test"


if __name__ == "__main__":
    # Запуск тестов
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])