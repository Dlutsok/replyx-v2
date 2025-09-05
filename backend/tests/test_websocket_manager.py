"""
Tests for WebSocket Manager functionality
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from sqlalchemy.orm import Session

from services.websocket_manager import (
    push_dialog_message,
    push_site_dialog_message,
    dialog_websocket_endpoint,
    widget_dialog_websocket_endpoint,
    ws_connections,
    ws_site_connections
)
from database.models import Dialog, User, Assistant


class TestWebSocketManager:
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_push_dialog_message_success(self):
        """Test successful message push to admin panel"""
        # Setup mock WebSocket
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_connections[dialog_id] = [mock_ws]
        
        message = {
            "id": 456,
            "sender": "manager",
            "text": "Test message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Execute
        await push_dialog_message(dialog_id, message)
        
        # Verify
        mock_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_push_dialog_message_no_connections(self):
        """Test message push when no connections exist"""
        dialog_id = 999
        message = {"id": 1, "text": "test"}
        
        # Should not raise exception
        await push_dialog_message(dialog_id, message)
    
    @pytest.mark.asyncio
    async def test_push_dialog_message_connection_error(self):
        """Test message push with connection error"""
        mock_ws = AsyncMock()
        mock_ws.send_json.side_effect = Exception("Connection closed")
        
        dialog_id = 123
        ws_connections[dialog_id] = [mock_ws]
        
        message = {"id": 1, "text": "test"}
        
        # Should not raise exception
        await push_dialog_message(dialog_id, message)
        mock_ws.send_json.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_push_site_dialog_message_success(self):
        """Test successful message push to widgets"""
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_site_connections[dialog_id] = [mock_ws]
        
        message = {
            "id": 456,
            "sender": "assistant",
            "text": "AI response",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Execute
        await push_site_dialog_message(dialog_id, message)
        
        # Verify
        mock_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_push_site_dialog_message_multiple_connections(self):
        """Test message push to multiple widget connections"""
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        dialog_id = 123
        ws_site_connections[dialog_id] = [mock_ws1, mock_ws2]
        
        message = {"id": 1, "text": "test"}
        
        # Execute
        await push_site_dialog_message(dialog_id, message)
        
        # Verify both connections received the message
        mock_ws1.send_json.assert_called_once_with(message)
        mock_ws2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_dialog_websocket_endpoint_invalid_token(self):
        """Test admin WebSocket endpoint with invalid token"""
        mock_websocket = AsyncMock()
        dialog_id = 123
        
        with patch('services.websocket_manager.get_user_from_token', return_value=None):
            await dialog_websocket_endpoint(mock_websocket, dialog_id, "invalid_token", Mock())
        
        # Should close connection with auth error
        mock_websocket.close.assert_called_once_with(code=4001, reason="Invalid token")
    
    @pytest.mark.asyncio
    async def test_dialog_websocket_endpoint_no_token(self):
        """Test admin WebSocket endpoint with no token"""
        mock_websocket = AsyncMock()
        mock_db = Mock()
        dialog_id = 123
        
        with patch('services.websocket_manager._register_connection', return_value=True):
            with patch('asyncio.wait') as mock_wait:
                mock_wait.return_value = (set(), set())
                
                await dialog_websocket_endpoint(mock_websocket, dialog_id, None, mock_db)
        
        # Should accept connection even without token
        mock_websocket.accept.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_widget_websocket_endpoint_invalid_assistant(self):
        """Test widget WebSocket endpoint with invalid assistant"""
        mock_websocket = AsyncMock()
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        dialog_id = 123
        assistant_id = 999
        
        await widget_dialog_websocket_endpoint(mock_websocket, dialog_id, assistant_id, mock_db)
        
        # Should close connection with assistant not found error
        mock_websocket.close.assert_called_once_with(code=4004)
    
    @pytest.mark.asyncio
    async def test_widget_websocket_endpoint_success(self):
        """Test successful widget WebSocket connection"""
        mock_websocket = AsyncMock()
        mock_db = Mock()
        mock_assistant = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_assistant
        
        dialog_id = 123
        assistant_id = 456
        
        with patch('services.websocket_manager._register_connection', return_value=True):
            with patch('asyncio.wait') as mock_wait:
                mock_wait.return_value = (set(), set())
                
                await widget_dialog_websocket_endpoint(mock_websocket, dialog_id, assistant_id, mock_db)
        
        # Should accept connection and register it
        mock_websocket.accept.assert_called_once()


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality with real message flows"""
    
    @pytest.mark.asyncio
    async def test_cross_channel_message_delivery(self):
        """Test that messages are delivered to both admin and widget channels"""
        # Setup mock connections
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        message = {
            "id": 456,
            "sender": "manager",
            "text": "Test cross-channel message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Simulate sending message to both channels (like in site.py)
        await push_dialog_message(dialog_id, message)
        await push_site_dialog_message(dialog_id, message)
        
        # Verify both channels received the message
        admin_ws.send_json.assert_called_once_with(message)
        widget_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_user_message_admin_only_routing(self):
        """Test that user messages from widget only go to admin panel"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # User message should only go to admin
        user_message = {
            "id": 789,
            "sender": "user",
            "text": "User message from widget",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Only send to admin (as implemented in site.py)
        await push_dialog_message(dialog_id, user_message)
        
        # Verify only admin received the message
        admin_ws.send_json.assert_called_once_with(user_message)
        widget_ws.send_json.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_ai_response_all_channels_routing(self):
        """Test that AI responses go to all channels"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        ai_message = {
            "id": 999,
            "sender": "assistant",
            "text": "AI response",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Send to both channels (as implemented in site.py and dialogs.py)
        await push_dialog_message(dialog_id, ai_message)
        await push_site_dialog_message(dialog_id, ai_message)
        
        # Verify both channels received the message
        admin_ws.send_json.assert_called_once_with(ai_message)
        widget_ws.send_json.assert_called_once_with(ai_message)


class TestWebSocketConnectionManagement:
    """Tests for WebSocket connection lifecycle management"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_connection_limit_enforcement(self):
        """Test that connection limits are enforced"""
        from services.websocket_manager import _register_connection, MAX_CONNECTIONS_PER_DIALOG
        
        mock_websockets = [AsyncMock() for _ in range(MAX_CONNECTIONS_PER_DIALOG + 1)]
        dialog_id = 123
        
        # Register maximum allowed connections
        for i in range(MAX_CONNECTIONS_PER_DIALOG):
            result = await _register_connection(ws_connections, {}, dialog_id, mock_websockets[i])
            assert result is True
        
        # Try to register one more - should fail
        result = await _register_connection(ws_connections, {}, dialog_id, mock_websockets[-1])
        assert result is False
        
        # Verify the last WebSocket was closed
        mock_websockets[-1].close.assert_called_once_with(code=1013)
    
    @pytest.mark.asyncio
    async def test_connection_cleanup(self):
        """Test that connections are properly cleaned up"""
        from services.websocket_manager import _register_connection, _unregister_connection
        
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_meta = {}
        
        # Register connection
        await _register_connection(ws_connections, ws_meta, dialog_id, mock_ws)
        
        assert dialog_id in ws_connections
        assert mock_ws in ws_connections[dialog_id]
        assert dialog_id in ws_meta
        assert mock_ws in ws_meta[dialog_id]
        
        # Unregister connection
        await _unregister_connection(ws_connections, ws_meta, dialog_id, mock_ws)
        
        # Verify cleanup
        assert mock_ws not in ws_connections.get(dialog_id, [])
        assert mock_ws not in ws_meta.get(dialog_id, {})


class TestMessageFormats:
    """Tests for different message formats supported by the system"""
    
    @pytest.mark.asyncio
    async def test_direct_message_format(self):
        """Test direct message format {id, sender, text, timestamp}"""
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_connections[dialog_id] = [mock_ws]
        
        message = {
            "id": 456,
            "sender": "manager",
            "text": "Direct message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, message)
        mock_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_wrapped_message_format(self):
        """Test wrapped message format {message: {...}}"""
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_site_connections[dialog_id] = [mock_ws]
        
        wrapped_message = {
            "message": {
                "id": 456,
                "sender": "assistant",
                "text": "AI response",
                "timestamp": "2025-01-15T10:30:00Z"
            }
        }
        
        await push_site_dialog_message(dialog_id, wrapped_message)
        mock_ws.send_json.assert_called_once_with(wrapped_message)
    
    @pytest.mark.asyncio
    async def test_system_event_format(self):
        """Test system event format {type, ...}"""
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_site_connections[dialog_id] = [mock_ws]
        
        system_event = {
            "type": "handoff_started",
            "dialog_id": dialog_id,
            "manager": {"id": 1, "name": "John Doe"}
        }
        
        await push_site_dialog_message(dialog_id, system_event)
        mock_ws.send_json.assert_called_once_with(system_event)
    
    @pytest.mark.asyncio
    async def test_typing_indicator_format(self):
        """Test typing indicator format"""
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_site_connections[dialog_id] = [mock_ws]
        
        typing_start = {"type": "typing_start"}
        typing_stop = {"type": "typing_stop"}
        
        await push_site_dialog_message(dialog_id, typing_start)
        await push_site_dialog_message(dialog_id, typing_stop)
        
        assert mock_ws.send_json.call_count == 2
        mock_ws.send_json.assert_any_call(typing_start)
        mock_ws.send_json.assert_any_call(typing_stop)


@pytest.mark.asyncio
class TestRealWorldScenarios:
    """Tests simulating real-world usage scenarios"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    async def test_user_sends_message_from_widget(self):
        """Simulate user sending message from widget"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # User message only goes to admin (to prevent duplication in widget)
        user_message = {
            "id": 1,
            "sender": "user", 
            "text": "Hello from widget",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, user_message)
        
        admin_ws.send_json.assert_called_once_with(user_message)
        widget_ws.send_json.assert_not_called()
    
    async def test_operator_replies_from_admin(self):
        """Simulate operator replying from admin panel"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # Operator message goes to both channels
        operator_message = {
            "id": 2,
            "sender": "manager",
            "text": "Hello from operator",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, operator_message)
        await push_site_dialog_message(dialog_id, operator_message)
        
        admin_ws.send_json.assert_called_once_with(operator_message)
        widget_ws.send_json.assert_called_once_with(operator_message)
    
    async def test_ai_generates_response(self):
        """Simulate AI generating response"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # AI response goes to both channels
        ai_message = {
            "id": 3,
            "sender": "assistant",
            "text": "AI generated response",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, ai_message)
        await push_site_dialog_message(dialog_id, ai_message)
        
        admin_ws.send_json.assert_called_once_with(ai_message)
        widget_ws.send_json.assert_called_once_with(ai_message)


if __name__ == "__main__":
    pytest.main([__file__])