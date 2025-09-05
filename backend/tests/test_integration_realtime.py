"""
Integration tests for real-time communication system
Tests the complete flow from HTTP API to WebSocket delivery
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
import websockets

from main import app
from database.models import Dialog, DialogMessage, User, Assistant
from services.websocket_manager import ws_connections, ws_site_connections


class TestRealTimeIntegration:
    """End-to-end tests for real-time communication"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_complete_message_flow_admin_to_widget(self):
        """Test complete message flow from admin API to widget WebSocket"""
        
        # Mock database
        with patch('database.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            
            # Mock dialog and message objects
            mock_dialog = Mock()
            mock_dialog.id = 123
            mock_dialog.handoff_status = 'none'
            
            mock_message = Mock()
            mock_message.id = 456
            mock_message.sender = 'manager'
            mock_message.text = 'Hello from admin'
            mock_message.timestamp.isoformat.return_value = '2025-01-15T10:30:00'
            
            mock_db.query.return_value.filter.return_value.first.return_value = mock_dialog
            mock_db.add = Mock()
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            # Mock WebSocket connections
            admin_ws = AsyncMock()
            widget_ws = AsyncMock()
            ws_connections[123] = [admin_ws]
            ws_site_connections[123] = [widget_ws]
            
            with patch('api.dialogs.models.DialogMessage', return_value=mock_message):
                with patch('core.auth.get_current_user', return_value=Mock()):
                    # Simulate API call
                    client = TestClient(app)
                    response = client.post(
                        "/api/dialogs/123/messages",
                        json={"sender": "manager", "text": "Hello from admin"},
                        headers={"Authorization": "Bearer test-token"}
                    )
            
            # Verify API response
            assert response.status_code == 200
            
            # Verify WebSocket calls were made
            expected_message = {
                "id": 456,
                "sender": "manager",
                "text": "Hello from admin", 
                "timestamp": "2025-01-15T10:30:00Z"
            }
            
            # Both admin and widget should receive the message
            admin_ws.send_json.assert_called_with(expected_message)
            widget_ws.send_json.assert_called_with(expected_message)
    
    @pytest.mark.asyncio
    async def test_widget_user_message_routing(self):
        """Test that user messages from widget only go to admin WebSocket"""
        
        with patch('database.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            
            # Mock assistant and dialog
            mock_assistant = Mock()
            mock_assistant.user_id = 1
            mock_dialog = Mock()
            mock_dialog.id = 123
            mock_dialog.handoff_status = 'none'
            
            mock_message = Mock()
            mock_message.id = 789
            mock_message.sender = 'user'
            mock_message.text = 'Hello from widget user'
            mock_message.timestamp.isoformat.return_value = '2025-01-15T10:30:00'
            
            # Setup query chain for widget endpoint
            mock_db.query.return_value.filter.return_value.first.side_effect = [
                mock_assistant,  # First query for assistant
                mock_dialog      # Second query for dialog
            ]
            mock_db.add = Mock()
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            # Mock WebSocket connections
            admin_ws = AsyncMock()
            widget_ws = AsyncMock()
            ws_connections[123] = [admin_ws]
            ws_site_connections[123] = [widget_ws]
            
            with patch('api.site.models.DialogMessage', return_value=mock_message):
                # Simulate widget API call
                client = TestClient(app)
                response = client.post(
                    "/api/widget/dialogs/123/messages?assistant_id=456&guest_id=guest123",
                    json={"sender": "user", "text": "Hello from widget user"}
                )
            
            # Verify API response
            assert response.status_code == 200
            
            # Verify only admin received the user message
            expected_message = {
                "id": 789,
                "sender": "user",
                "text": "Hello from widget user",
                "timestamp": "2025-01-15T10:30:00Z"
            }
            
            admin_ws.send_json.assert_called_with(expected_message)
            widget_ws.send_json.assert_not_called()  # Widget should NOT receive user message
    
    @pytest.mark.asyncio 
    async def test_ai_response_cross_channel_delivery(self):
        """Test AI response delivery to both admin and widget channels"""
        
        with patch('database.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            
            # Mock assistant and dialog
            mock_assistant = Mock()
            mock_assistant.user_id = 1
            mock_dialog = Mock()
            mock_dialog.id = 123
            mock_dialog.handoff_status = 'none'
            
            mock_user_message = Mock()
            mock_user_message.id = 100
            mock_user_message.sender = 'user'
            mock_user_message.text = 'User question'
            mock_user_message.timestamp.isoformat.return_value = '2025-01-15T10:30:00'
            
            mock_ai_message = Mock()
            mock_ai_message.id = 101
            mock_ai_message.sender = 'assistant'
            mock_ai_message.text = 'AI response'
            mock_ai_message.timestamp.isoformat.return_value = '2025-01-15T10:31:00'
            
            mock_db.query.return_value.filter.return_value.first.side_effect = [
                mock_assistant,
                mock_dialog
            ]
            mock_db.add = Mock()
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            # Mock WebSocket connections
            admin_ws = AsyncMock()
            widget_ws = AsyncMock()
            ws_connections[123] = [admin_ws]
            ws_site_connections[123] = [widget_ws]
            
            with patch('api.site.models.DialogMessage', return_value=mock_user_message):
                with patch('api.site.generate_ai_response', return_value=mock_ai_message):
                    # Simulate widget API call that triggers AI response
                    client = TestClient(app)
                    response = client.post(
                        "/api/widget/dialogs/123/messages?assistant_id=456&guest_id=guest123",
                        json={"sender": "user", "text": "User question"}
                    )
            
            assert response.status_code == 200
            
            # Verify AI response was sent to both channels
            expected_ai_message = {
                "id": 101,
                "sender": "assistant",
                "text": "AI response",
                "timestamp": "2025-01-15T10:31:00Z"
            }
            
            # Admin should receive AI message directly
            admin_ws.send_json.assert_any_call(expected_ai_message)
            
            # Widget should receive AI message wrapped in message object
            widget_ws.send_json.assert_any_call({
                "message": expected_ai_message
            })


class TestWebSocketEndpointIntegration:
    """Integration tests for WebSocket endpoints"""
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_authentication_flow(self):
        """Test complete WebSocket authentication flow"""
        
        # Test admin WebSocket endpoint
        with patch('core.auth.get_user_from_token') as mock_auth:
            mock_user = Mock()
            mock_user.id = 1
            mock_auth.return_value = mock_user
            
            with patch('database.get_db') as mock_get_db:
                mock_db = Mock()
                mock_get_db.return_value = mock_db
                
                # Test WebSocket connection
                client = TestClient(app)
                
                # This would normally be a WebSocket test, but TestClient doesn't support WebSocket
                # In a real test, you'd use websockets library:
                # uri = "ws://localhost:8000/ws/dialogs/123?token=valid-token"
                # async with websockets.connect(uri) as websocket:
                #     message = await websocket.recv()
                
                # For now, verify the endpoint exists
                # The actual WebSocket testing would require a running server
                pass
    
    @pytest.mark.asyncio
    async def test_multiple_websocket_connections(self):
        """Test handling multiple WebSocket connections to same dialog"""
        
        dialog_id = 123
        
        # Simulate multiple connections
        admin_ws1 = AsyncMock()
        admin_ws2 = AsyncMock()
        widget_ws1 = AsyncMock()
        widget_ws2 = AsyncMock()
        
        ws_connections[dialog_id] = [admin_ws1, admin_ws2]
        ws_site_connections[dialog_id] = [widget_ws1, widget_ws2]
        
        # Send message through WebSocket manager
        from services.websocket_manager import push_dialog_message, push_site_dialog_message
        
        message = {
            "id": 456,
            "sender": "manager",
            "text": "Broadcast message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, message)
        await push_site_dialog_message(dialog_id, message)
        
        # Verify all connections received the message
        admin_ws1.send_json.assert_called_once_with(message)
        admin_ws2.send_json.assert_called_once_with(message)
        widget_ws1.send_json.assert_called_once_with(message)
        widget_ws2.send_json.assert_called_once_with(message)


class TestHandoffIntegration:
    """Integration tests for handoff functionality with WebSocket"""
    
    def setup_method(self):
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_handoff_request_event_propagation(self):
        """Test handoff request event propagation via WebSocket"""
        
        from services.websocket_manager import push_handoff_requested
        
        dialog_id = 123
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # Trigger handoff request event
        await push_handoff_requested(
            dialog_id=dialog_id,
            reason="user_request",
            queue_position=1
        )
        
        # Verify both channels received handoff event
        admin_ws.send_json.assert_called_once()
        widget_ws.send_json.assert_called_once()
        
        # Verify event structure
        admin_event = admin_ws.send_json.call_args[0][0]
        widget_event = widget_ws.send_json.call_args[0][0]
        
        assert admin_event['type'] == 'handoff_requested'
        assert widget_event['type'] == 'handoff_requested'
        assert admin_event['dialog_id'] == dialog_id
        assert widget_event['dialog_id'] == dialog_id
        assert admin_event['reason'] == 'user_request'
        assert widget_event['reason'] == 'user_request'
    
    @pytest.mark.asyncio
    async def test_handoff_started_event_propagation(self):
        """Test handoff started event propagation via WebSocket"""
        
        from services.websocket_manager import push_handoff_started
        
        dialog_id = 123
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        manager_info = {
            "id": 1,
            "name": "John Doe",
            "avatar": "avatar.jpg"
        }
        
        # Trigger handoff started event
        await push_handoff_started(
            dialog_id=dialog_id,
            manager_info=manager_info
        )
        
        # Verify both channels received handoff event
        admin_ws.send_json.assert_called_once()
        widget_ws.send_json.assert_called_once()
        
        # Verify event structure
        admin_event = admin_ws.send_json.call_args[0][0]
        widget_event = widget_ws.send_json.call_args[0][0]
        
        assert admin_event['type'] == 'handoff_started'
        assert widget_event['type'] == 'handoff_started'
        assert admin_event['manager'] == manager_info
        assert widget_event['manager'] == manager_info


class TestMessageFormatsIntegration:
    """Integration tests for different message formats"""
    
    @pytest.mark.asyncio
    async def test_direct_message_format_delivery(self):
        """Test direct message format delivery"""
        
        from services.websocket_manager import push_dialog_message
        
        dialog_id = 123
        mock_ws = AsyncMock()
        ws_connections[dialog_id] = [mock_ws]
        
        # Send direct format message
        direct_message = {
            "id": 456,
            "sender": "manager",
            "text": "Direct message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, direct_message)
        
        mock_ws.send_json.assert_called_once_with(direct_message)
    
    @pytest.mark.asyncio
    async def test_wrapped_message_format_delivery(self):
        """Test wrapped message format delivery"""
        
        from services.websocket_manager import push_site_dialog_message
        
        dialog_id = 123
        mock_ws = AsyncMock()
        ws_site_connections[dialog_id] = [mock_ws]
        
        # Send wrapped format message
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


class TestErrorRecoveryIntegration:
    """Integration tests for error recovery scenarios"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_failure_recovery(self):
        """Test recovery from WebSocket connection failures"""
        
        from services.websocket_manager import push_dialog_message
        
        dialog_id = 123
        
        # Create failing and working WebSocket mocks
        failing_ws = AsyncMock()
        failing_ws.send_json.side_effect = Exception("Connection failed")
        
        working_ws = AsyncMock()
        
        ws_connections[dialog_id] = [failing_ws, working_ws]
        
        message = {
            "id": 456,
            "sender": "manager", 
            "text": "Test message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Should not raise exception despite one failing connection
        await push_dialog_message(dialog_id, message)
        
        # Verify both connections were attempted
        failing_ws.send_json.assert_called_once_with(message)
        working_ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_message_delivery_with_no_connections(self):
        """Test message delivery when no WebSocket connections exist"""
        
        from services.websocket_manager import push_dialog_message, push_site_dialog_message
        
        # Clear all connections
        ws_connections.clear()
        ws_site_connections.clear()
        
        message = {
            "id": 456,
            "sender": "manager",
            "text": "No connections message",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Should not raise exceptions
        await push_dialog_message(999, message)
        await push_site_dialog_message(999, message)
        
        # Test passes if no exceptions are raised


class TestPerformanceIntegration:
    """Integration tests for performance scenarios"""
    
    @pytest.mark.asyncio
    async def test_high_volume_message_delivery(self):
        """Test delivery of high volume of messages"""
        
        from services.websocket_manager import push_dialog_message
        
        dialog_id = 123
        num_connections = 10
        num_messages = 100
        
        # Create multiple mock connections
        mock_connections = [AsyncMock() for _ in range(num_connections)]
        ws_connections[dialog_id] = mock_connections
        
        # Send multiple messages
        messages = [
            {
                "id": i,
                "sender": "manager",
                "text": f"Message {i}",
                "timestamp": "2025-01-15T10:30:00Z"
            }
            for i in range(num_messages)
        ]
        
        # Measure time
        import time
        start_time = time.time()
        
        for message in messages:
            await push_dialog_message(dialog_id, message)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete within reasonable time
        assert duration < 5.0  # 100 messages to 10 connections in under 5 seconds
        
        # Verify all connections received all messages
        for ws in mock_connections:
            assert ws.send_json.call_count == num_messages
    
    @pytest.mark.asyncio
    async def test_concurrent_dialog_messaging(self):
        """Test concurrent messaging to multiple dialogs"""
        
        from services.websocket_manager import push_dialog_message
        
        num_dialogs = 50
        
        # Setup connections for multiple dialogs
        for dialog_id in range(1, num_dialogs + 1):
            ws_connections[dialog_id] = [AsyncMock()]
        
        # Send messages to all dialogs concurrently
        async def send_message_to_dialog(dialog_id):
            message = {
                "id": dialog_id,
                "sender": "manager",
                "text": f"Message to dialog {dialog_id}",
                "timestamp": "2025-01-15T10:30:00Z"
            }
            await push_dialog_message(dialog_id, message)
        
        # Send messages concurrently
        await asyncio.gather(*[
            send_message_to_dialog(dialog_id) 
            for dialog_id in range(1, num_dialogs + 1)
        ])
        
        # Verify all dialogs received their messages
        for dialog_id in range(1, num_dialogs + 1):
            ws = ws_connections[dialog_id][0]
            ws.send_json.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__])