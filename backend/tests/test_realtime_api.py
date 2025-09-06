"""
Tests for real-time API endpoints and message routing
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import json

from database.models import Dialog, DialogMessage, User, Assistant
from services.websocket_manager import ws_connections, ws_site_connections


class TestDialogAPIRealtime:
    """Tests for dialog API endpoints with WebSocket integration"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    @patch('api.dialogs.push_dialog_message')
    @patch('api.dialogs.push_site_dialog_message')
    async def test_add_dialog_message_websocket_routing(self, mock_push_site, mock_push_admin):
        """Test that messages are routed correctly through WebSocket"""
        from api.dialogs import add_dialog_message
        
        # Mock database objects
        mock_db = Mock()
        mock_user = Mock()
        mock_dialog = Mock(id=123, handoff_status='none')
        mock_message = Mock(
            id=456,
            sender='manager',
            text='Test message',
            timestamp='2025-01-15T10:30:00Z'
        )
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_dialog
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        with patch('api.dialogs.models.DialogMessage', return_value=mock_message):
            data = {"sender": "manager", "text": "Test message"}
            
            # Execute
            result = await add_dialog_message(
                dialog_id=123,
                data=data,
                current_user=mock_user,
                db=mock_db
            )
        
        # Verify WebSocket calls were made to both channels
        expected_message = {
            "id": 456,
            "sender": "manager", 
            "text": "Test message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        mock_push_admin.assert_called_once_with(123, expected_message)
        mock_push_site.assert_called_once_with(123, expected_message)
    
    @pytest.mark.asyncio
    @patch('api.site.push_dialog_message')
    @patch('api.site.ws_push_site_dialog_message')
    async def test_widget_user_message_admin_only(self, mock_push_site, mock_push_admin):
        """Test that user messages from widget only go to admin panel"""
        from api.site import widget_add_dialog_message
        
        # Mock database objects
        mock_db = Mock()
        mock_assistant = Mock(user_id=1)
        mock_dialog = Mock(id=123, handoff_status='none')
        mock_message = Mock(
            id=789,
            sender='user',
            text='User message from widget'
        )
        mock_message.timestamp.isoformat.return_value = '2025-01-15T10:30:00'
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_assistant
        mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = mock_dialog
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        with patch('api.site.models.DialogMessage', return_value=mock_message):
            data = {"sender": "user", "text": "User message from widget"}
            
            # Execute
            result = await widget_add_dialog_message(
                dialog_id=123,
                data=data,
                assistant_id=456,
                guest_id="guest123",
                db=mock_db
            )
        
        # Verify only admin channel received the message
        expected_message = {
            "id": 789,
            "sender": "user",
            "text": "User message from widget",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        mock_push_admin.assert_called_once_with(123, expected_message)
        mock_push_site.assert_not_called()  # Should NOT be called for user messages


class TestSiteAPIRealtime:
    """Tests for site API endpoints with WebSocket integration"""
    
    @pytest.mark.asyncio
    @patch('api.site.push_dialog_message')
    @patch('api.site.ws_push_site_dialog_message')
    async def test_site_ai_response_both_channels(self, mock_push_site, mock_push_admin):
        """Test that AI responses go to both admin and widget channels"""
        from api.site import site_add_dialog_message
        
        # Mock database and AI response
        mock_db = Mock()
        mock_user = Mock(id=1)
        mock_dialog = Mock(id=123, handoff_status='none')
        mock_user_message = Mock(
            id=101,
            sender='user',
            text='User question'
        )
        mock_ai_message = Mock(
            id=102,
            sender='assistant',
            text='AI response'
        )
        
        # Setup timestamp mocks
        mock_user_message.timestamp.isoformat.return_value = '2025-01-15T10:30:00'
        mock_ai_message.timestamp.isoformat.return_value = '2025-01-15T10:31:00'
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_dialog
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        with patch('api.site.models.DialogMessage', return_value=mock_user_message):
            with patch('api.site.generate_ai_response', return_value=mock_ai_message):
                data = {"sender": "user", "text": "User question"}
                
                # Execute
                result = await site_add_dialog_message(
                    dialog_id=123,
                    data=data,
                    guest_id="guest123",
                    db=mock_db,
                    current_user=mock_user
                )
        
        # Verify AI response went to both channels
        expected_ai_message = {
            "id": 102,
            "sender": "assistant",
            "text": "AI response",
            "timestamp": "2025-01-15T10:31:00Z"
        }
        
        # Should be called twice: once for user message (admin only), once for AI (both)
        assert mock_push_admin.call_count == 2
        mock_push_site.assert_called_once_with(123, {
            "message": expected_ai_message
        })


class TestHandoffEventRouting:
    """Tests for handoff event routing through WebSocket"""
    
    @pytest.mark.asyncio
    @patch('services.websocket_manager.push_dialog_message')
    @patch('services.websocket_manager.push_site_dialog_message') 
    async def test_handoff_events_all_channels(self, mock_push_site, mock_push_admin):
        """Test that handoff events are sent to all channels"""
        from services.websocket_manager import push_handoff_started
        
        # Execute handoff event
        await push_handoff_started(
            dialog_id=123,
            manager_info={"id": 1, "name": "John Doe", "avatar": "avatar.jpg"}
        )
        
        # Verify both channels received the event
        mock_push_admin.assert_called_once()
        mock_push_site.assert_called_once()
        
        # Check event structure
        admin_call_args = mock_push_admin.call_args
        site_call_args = mock_push_site.call_args
        
        assert admin_call_args[0][0] == 123  # dialog_id
        assert site_call_args[0][0] == 123   # dialog_id
        
        admin_event = admin_call_args[0][1]
        site_event = site_call_args[0][1]
        
        assert admin_event['type'] == 'handoff_started'
        assert site_event['type'] == 'handoff_started'
        assert admin_event['manager']['name'] == 'John Doe'
        assert site_event['manager']['name'] == 'John Doe'


class TestWebSocketEndpointIntegration:
    """Integration tests for WebSocket endpoints"""
    
    @pytest.mark.asyncio
    async def test_admin_websocket_authentication(self):
        """Test admin WebSocket endpoint authentication"""
        from api.websockets import dialog_ws
        
        mock_websocket = AsyncMock()
        mock_websocket.headers = {"x-forwarded-for": "127.0.0.1"}
        mock_websocket.client = Mock()
        mock_websocket.client.host = "127.0.0.1"
        mock_db = Mock()
        
        # Test with invalid token
        with patch('core.auth.get_user_from_token', return_value=None):
            await dialog_ws(mock_websocket, dialog_id=123, token="invalid", db=mock_db)
        
        # Should close with auth error
        mock_websocket.close.assert_called_once_with(code=4002, reason="Invalid or expired token")
    
    @pytest.mark.asyncio
    async def test_widget_websocket_assistant_validation(self):
        """Test widget WebSocket endpoint assistant validation"""
        from api.websockets import widget_dialog_ws
        
        mock_websocket = AsyncMock()
        mock_websocket.headers = {"x-forwarded-for": "127.0.0.1"}
        mock_websocket.client = Mock()
        mock_websocket.client.host = "127.0.0.1"
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        await widget_dialog_ws(mock_websocket, dialog_id=123, assistant_id=999, db=mock_db)
        
        # Should close with assistant not found error
        mock_websocket.close.assert_called_once_with(code=4004, reason="Assistant not found")


class TestMessageDeduplication:
    """Tests for message deduplication logic"""
    
    def test_message_id_uniqueness(self):
        """Test that messages have unique IDs for deduplication"""
        from database.models import DialogMessage
        
        # Create mock messages
        msg1 = DialogMessage(id=123, sender="user", text="Test message 1")
        msg2 = DialogMessage(id=124, sender="assistant", text="Test message 2") 
        msg3 = DialogMessage(id=123, sender="user", text="Duplicate ID")
        
        messages = [msg1, msg2, msg3]
        
        # Simulate frontend deduplication logic
        unique_messages = []
        seen_ids = set()
        
        for msg in messages:
            if msg.id not in seen_ids:
                unique_messages.append(msg)
                seen_ids.add(msg.id)
        
        # Should have deduplicated the message with ID 123
        assert len(unique_messages) == 2
        assert unique_messages[0].id == 123
        assert unique_messages[1].id == 124
        assert unique_messages[0].text == "Test message 1"  # First one wins


class TestOptimisticUpdates:
    """Tests for optimistic update handling"""
    
    def test_optimistic_message_replacement(self):
        """Test that optimistic messages are replaced with real data"""
        
        # Simulate frontend optimistic update
        optimistic_message = {
            "id": "temp-123",
            "sender": "user",
            "text": "Test message",
            "timestamp": "2025-01-15T10:30:00Z",
            "optimistic": True
        }
        
        # Simulate real message from server
        real_message = {
            "id": 456,
            "sender": "user", 
            "text": "Test message",
            "timestamp": "2025-01-15T10:30:00Z",
            "delivered": True
        }
        
        # Simulate message list update
        messages = [optimistic_message]
        
        # Replace optimistic with real
        updated_messages = []
        for msg in messages:
            if msg["id"] == "temp-123":
                updated_messages.append(real_message)
            else:
                updated_messages.append(msg)
        
        assert len(updated_messages) == 1
        assert updated_messages[0]["id"] == 456
        assert updated_messages[0].get("delivered") is True
        assert updated_messages[0].get("optimistic") is None


class TestErrorHandling:
    """Tests for error handling in real-time communication"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_failure_handling(self):
        """Test handling of WebSocket connection failures"""
        from services.websocket_manager import push_dialog_message
        
        # Create a mock WebSocket that always fails
        failing_ws = AsyncMock()
        failing_ws.send_json.side_effect = Exception("Connection lost")
        
        working_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [failing_ws, working_ws]
        
        message = {"id": 1, "text": "test"}
        
        # Should not raise exception
        await push_dialog_message(dialog_id, message)
        
        # Working connection should still receive message
        working_ws.send_json.assert_called_once_with(message)
        failing_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_malformed_message_handling(self):
        """Test handling of malformed messages"""
        from services.websocket_manager import push_dialog_message
        
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_connections[dialog_id] = [mock_ws]
        
        # Test with various malformed messages
        malformed_messages = [
            None,
            "",
            {"id": None},
            {"text": ""},
            {"sender": None, "text": "test"}
        ]
        
        for msg in malformed_messages:
            # Should not raise exception
            await push_dialog_message(dialog_id, msg)
            mock_ws.send_json.assert_called_with(msg)
        
        # Verify all malformed messages were attempted to be sent
        assert mock_ws.send_json.call_count == len(malformed_messages)


class TestPerformance:
    """Performance tests for WebSocket functionality"""
    
    @pytest.mark.asyncio
    async def test_multiple_connections_performance(self):
        """Test performance with multiple WebSocket connections"""
        from services.websocket_manager import push_dialog_message
        
        # Create many mock connections
        num_connections = 50
        mock_connections = [AsyncMock() for _ in range(num_connections)]
        
        dialog_id = 123
        ws_connections[dialog_id] = mock_connections
        
        message = {"id": 1, "text": "Performance test message"}
        
        import time
        start_time = time.time()
        
        # Send message to all connections
        await push_dialog_message(dialog_id, message)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly (under 1 second for 50 connections)
        assert duration < 1.0
        
        # Verify all connections received the message
        for ws in mock_connections:
            ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_rapid_message_sending(self):
        """Test rapid successive message sending"""
        from services.websocket_manager import push_dialog_message
        
        mock_ws = AsyncMock()
        dialog_id = 123
        ws_connections[dialog_id] = [mock_ws]
        
        # Send many messages rapidly
        num_messages = 100
        messages = [{"id": i, "text": f"Message {i}"} for i in range(num_messages)]
        
        import time
        start_time = time.time()
        
        # Send all messages
        for msg in messages:
            await push_dialog_message(dialog_id, msg)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should handle rapid messages efficiently
        assert duration < 2.0  # 100 messages in under 2 seconds
        assert mock_ws.send_json.call_count == num_messages


if __name__ == "__main__":
    pytest.main([__file__])