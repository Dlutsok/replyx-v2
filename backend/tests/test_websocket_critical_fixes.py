"""
Критические тесты для фиксации WebSocket исправлений от 5 сентября 2025
Эти тесты ДОЛЖНЫ всегда проходить - их падение указывает на регрессию
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi import WebSocket
from fastapi.testclient import TestClient

from services.websocket_manager import (
    ws_connections,
    ws_site_connections,
    widget_dialog_websocket_endpoint,
    site_dialog_websocket_endpoint,
    push_dialog_message,
    push_site_dialog_message
)
from database import models

class TestWebSocketCriticalFixes:
    """Тесты критических исправлений WebSocket от 5.09.2025"""
    
    def setup_method(self):
        """Очистка connection pools перед каждым тестом"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_widget_endpoint_uses_correct_connection_pool(self):
        """КРИТИЧНО: Widget endpoint ДОЛЖЕН использовать ws_connections, НЕ ws_site_connections"""
        # Мокаем зависимости
        mock_websocket = MagicMock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.close = AsyncMock()
        
        mock_db = MagicMock()
        mock_assistant = MagicMock()
        mock_assistant.id = 1
        mock_db.query().filter().first.return_value = mock_assistant
        
        dialog_id = 1
        assistant_id = 1
        
        # Мокаем внутренние функции для контроля
        with patch('services.websocket_manager._register_connection', new_callable=AsyncMock) as mock_register, \
             patch('services.websocket_manager._receive_loop', new_callable=AsyncMock), \
             patch('services.websocket_manager._heartbeat_loop', new_callable=AsyncMock), \
             patch('services.websocket_manager._unregister_connection', new_callable=AsyncMock) as mock_unregister, \
             patch('services.websocket_manager._check_rate_limit') as mock_rate_limit, \
             patch('asyncio.wait', new_callable=AsyncMock):
            
            mock_register.return_value = True
            mock_rate_limit.return_value = True  # Rate limit пройден
            
            # Вызов widget endpoint
            await widget_dialog_websocket_endpoint(mock_websocket, dialog_id, assistant_id, mock_db)
            
            # КРИТИЧЕСКАЯ ПРОВЕРКА: должен использовать ws_connections
            register_calls = mock_register.call_args_list
            assert len(register_calls) == 1
            
            # Проверяем что первый аргумент (connection pool) это ws_connections
            used_pool = register_calls[0][0][0]  # Первый аргумент первого вызова
            assert used_pool is ws_connections, "Widget endpoint ДОЛЖЕН использовать ws_connections!"
            assert used_pool is not ws_site_connections, "Widget endpoint НЕ должен использовать ws_site_connections!"
    
    @pytest.mark.asyncio 
    async def test_site_endpoint_uses_correct_connection_pool(self):
        """Site endpoint должен использовать ws_site_connections"""
        mock_websocket = MagicMock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        
        mock_db = MagicMock()
        site_token = "test_token"
        dialog_id = 1
        
        with patch('services.websocket_manager.get_current_site_user_simple') as mock_auth, \
             patch('services.websocket_manager._register_connection', new_callable=AsyncMock) as mock_register, \
             patch('services.websocket_manager._receive_loop', new_callable=AsyncMock), \
             patch('services.websocket_manager._heartbeat_loop', new_callable=AsyncMock), \
             patch('services.websocket_manager._unregister_connection', new_callable=AsyncMock), \
             patch('services.websocket_manager._is_domain_allowed_by_token') as mock_domain_check, \
             patch('services.websocket_manager._check_rate_limit') as mock_rate_limit, \
             patch('asyncio.wait', new_callable=AsyncMock):
            
            mock_auth.return_value = MagicMock()  # Успешная авторизация
            mock_register.return_value = True
            mock_domain_check.return_value = True  # Домен разрешен
            mock_rate_limit.return_value = True  # Rate limit пройден
            
            await site_dialog_websocket_endpoint(mock_websocket, dialog_id, site_token, mock_db)
            
            # Проверяем использование правильного пула
            register_calls = mock_register.call_args_list
            assert len(register_calls) == 1
            
            used_pool = register_calls[0][0][0]
            assert used_pool is ws_site_connections, "Site endpoint ДОЛЖЕН использовать ws_site_connections!"
            assert used_pool is not ws_connections, "Site endpoint НЕ должен использовать ws_connections!"
    
    @pytest.mark.asyncio
    async def test_message_routing_widget_connections(self):
        """Сообщения для admin/widget должны идти в ws_connections"""
        dialog_id = 1
        test_message = {"type": "test", "text": "Hello"}
        
        # Добавляем мок-соединение в правильный пул
        mock_websocket = MagicMock()
        mock_websocket.send_json = AsyncMock()
        ws_connections[dialog_id] = {mock_websocket}
        
        # Отправка сообщения
        await push_dialog_message(dialog_id, test_message)
        
        # Проверка что сообщение отправлено
        mock_websocket.send_json.assert_called_once_with(test_message)
    
    @pytest.mark.asyncio
    async def test_message_routing_site_connections(self):
        """Сообщения для site виджетов должны идти в ws_site_connections"""
        dialog_id = 1
        test_message = {"type": "test", "text": "Hello"}
        
        # Добавляем мок-соединение в site пул
        mock_websocket = MagicMock()
        mock_websocket.send_json = AsyncMock()
        ws_site_connections[dialog_id] = {mock_websocket}
        
        await push_site_dialog_message(dialog_id, test_message)
        
        mock_websocket.send_json.assert_called_once_with(test_message)
    
    @pytest.mark.asyncio
    async def test_no_cross_pool_contamination(self):
        """Соединения НЕ должны попадать в чужие пулы"""
        dialog_id = 1
        
        # Добавляем соединения в разные пулы
        widget_ws = MagicMock()
        widget_ws.send_json = AsyncMock()
        ws_connections[dialog_id] = {widget_ws}
        
        site_ws = MagicMock() 
        site_ws.send_json = AsyncMock()
        ws_site_connections[dialog_id] = {site_ws}
        
        # Отправка admin сообщения не должна идти в site пул
        await push_dialog_message(dialog_id, {"test": "admin"})
        widget_ws.send_json.assert_called_once()
        site_ws.send_json.assert_not_called()
        
        # Сброс моков
        widget_ws.reset_mock()
        site_ws.reset_mock()
        
        # Отправка site сообщения не должна идти в admin пул
        await push_site_dialog_message(dialog_id, {"test": "site"})
        site_ws.send_json.assert_called_once()
        widget_ws.send_json.assert_not_called()

class AsyncMock(MagicMock):
    """Helper для асинхронных моков"""
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)

def test_no_duplicate_websocket_endpoints():
    """Проверка отсутствия дублирующих WebSocket endpoints в site.py"""
    import inspect
    from api import site
    
    # Получаем все endpoints из site модуля
    endpoints = []
    for name, obj in inspect.getmembers(site):
        if hasattr(obj, '__annotations__') and hasattr(obj, '_route'):
            if hasattr(obj._route, 'path') and 'websocket' in str(obj._route.methods).lower():
                endpoints.append(obj._route.path)
    
    # Не должно быть WebSocket endpoints в site.py
    websocket_endpoints = [ep for ep in endpoints if '/ws/' in ep]
    assert len(websocket_endpoints) == 0, f"Found WebSocket endpoints in site.py: {websocket_endpoints}"

# Интеграционные тесты
class TestWebSocketIntegration:
    """Интеграционные тесты WebSocket функциональности"""
    
    @pytest.mark.asyncio
    async def test_widget_websocket_full_flow(self):
        """Полный цикл: подключение widget WebSocket -> отправка сообщения -> получение ответа"""
        # TODO: Реализовать полный интеграционный тест
        pass
    
    @pytest.mark.asyncio  
    async def test_site_websocket_full_flow(self):
        """Полный цикл для site WebSocket"""
        # TODO: Реализовать полный интеграционный тест  
        pass

# Нагрузочные тесты
class TestWebSocketLoad:
    """Нагрузочные тесты WebSocket соединений"""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_multiple_concurrent_connections(self):
        """Тест множественных одновременных WebSocket подключений"""
        # TODO: Тест с 50+ одновременными соединениями
        pass
    
    @pytest.mark.asyncio
    @pytest.mark.slow  
    async def test_high_message_throughput(self):
        """Тест высокой пропускной способности сообщений"""
        # TODO: Тест отправки 100+ сообщений/сек
        pass