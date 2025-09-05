"""
Integration tests for cross-channel communication between admin panel and widget
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import json
from datetime import datetime

from services.websocket_manager import (
    push_dialog_message,
    push_site_dialog_message, 
    ws_connections,
    ws_site_connections
)


class TestCrossChannelIntegration:
    """Integration tests for cross-channel message routing"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_complete_message_flow_admin_to_widget(self):
        """Test complete flow: Admin sends message → Widget receives it"""
        # Setup mock connections
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # Simulate operator message from admin panel
        message_data = {
            "id": 456,
            "sender": "manager",
            "text": "Hello from admin panel",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # This simulates what happens in dialogs.py when admin sends message
        await push_dialog_message(dialog_id, message_data)
        await push_site_dialog_message(dialog_id, message_data)
        
        # Verify both channels received the message
        admin_ws.send_json.assert_called_once_with(message_data)
        widget_ws.send_json.assert_called_once_with(message_data)
    
    @pytest.mark.asyncio
    async def test_complete_message_flow_widget_to_admin(self):
        """Test complete flow: User sends message from widget → Admin receives it"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # User message should only go to admin (to prevent duplication in widget)
        user_message = {
            "id": 789,
            "sender": "user",
            "text": "Hello from widget",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # This simulates what happens in site.py when user sends message
        await push_dialog_message(dialog_id, user_message)
        # Note: NO push_site_dialog_message for user messages
        
        # Verify only admin received the message
        admin_ws.send_json.assert_called_once_with(user_message)
        widget_ws.send_json.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_ai_response_broadcast_to_all_channels(self):
        """Test AI response is broadcast to all channels"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # AI response goes to all channels
        ai_message = {
            "id": 999,
            "sender": "assistant",
            "text": "AI generated response",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # This simulates what happens when AI generates response
        await push_dialog_message(dialog_id, ai_message)
        await push_site_dialog_message(dialog_id, ai_message)
        
        # Verify both channels received AI message
        admin_ws.send_json.assert_called_once_with(ai_message)
        widget_ws.send_json.assert_called_once_with(ai_message)


class TestMultipleConnectionsIntegration:
    """Test integration with multiple connections per channel"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_multiple_admin_panels_receive_messages(self):
        """Test multiple admin panels all receive the same message"""
        # Setup multiple admin connections
        admin_ws1 = AsyncMock()
        admin_ws2 = AsyncMock()
        admin_ws3 = AsyncMock()
        
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws1, admin_ws2, admin_ws3]
        ws_site_connections[dialog_id] = [widget_ws]
        
        message_data = {
            "id": 456,
            "sender": "user",
            "text": "Message to multiple admins",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Send user message (only to admin channels)
        await push_dialog_message(dialog_id, message_data)
        
        # Verify all admin connections received the message
        admin_ws1.send_json.assert_called_once_with(message_data)
        admin_ws2.send_json.assert_called_once_with(message_data)
        admin_ws3.send_json.assert_called_once_with(message_data)
        
        # Widget should not receive user message
        widget_ws.send_json.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_multiple_widgets_receive_operator_messages(self):
        """Test multiple widgets receive operator messages"""
        admin_ws = AsyncMock()
        
        # Setup multiple widget connections (multiple tabs/devices)
        widget_ws1 = AsyncMock()
        widget_ws2 = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws1, widget_ws2]
        
        operator_message = {
            "id": 777,
            "sender": "manager",
            "text": "Response from operator",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Send operator message to all channels
        await push_dialog_message(dialog_id, operator_message)
        await push_site_dialog_message(dialog_id, operator_message)
        
        # Verify admin received message
        admin_ws.send_json.assert_called_once_with(operator_message)
        
        # Verify both widgets received message
        widget_ws1.send_json.assert_called_once_with(operator_message)
        widget_ws2.send_json.assert_called_once_with(operator_message)


class TestHandoffEventsIntegration:
    """Test handoff events are properly routed across channels"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_handoff_started_event_broadcast(self):
        """Test handoff_started event is broadcast to all channels"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        handoff_event = {
            "type": "handoff_started",
            "dialog_id": dialog_id,
            "manager": {
                "id": 1,
                "name": "John Doe",
                "avatar": "avatar.jpg"
            },
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Broadcast handoff event to all channels
        await push_dialog_message(dialog_id, handoff_event)
        await push_site_dialog_message(dialog_id, handoff_event)
        
        # Verify both channels received handoff event
        admin_ws.send_json.assert_called_once_with(handoff_event)
        widget_ws.send_json.assert_called_once_with(handoff_event)
    
    @pytest.mark.asyncio
    async def test_handoff_requested_event_broadcast(self):
        """Test handoff_requested event is broadcast to all channels"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        handoff_request_event = {
            "type": "handoff_requested", 
            "dialog_id": dialog_id,
            "message": "User requested human operator",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Broadcast handoff request to all channels
        await push_dialog_message(dialog_id, handoff_request_event)
        await push_site_dialog_message(dialog_id, handoff_request_event)
        
        # Verify both channels received handoff request
        admin_ws.send_json.assert_called_once_with(handoff_request_event)
        widget_ws.send_json.assert_called_once_with(handoff_request_event)


class TestTypingIndicatorsIntegration:
    """Test typing indicators work across channels"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_typing_indicators_widget_only(self):
        """Test typing indicators are sent to widget only"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        # Typing start (only to widget)
        typing_start = {"type": "typing_start"}
        await push_site_dialog_message(dialog_id, typing_start)
        
        # Typing stop (only to widget)  
        typing_stop = {"type": "typing_stop"}
        await push_site_dialog_message(dialog_id, typing_stop)
        
        # Verify only widget received typing indicators
        widget_ws.send_json.assert_any_call(typing_start)
        widget_ws.send_json.assert_any_call(typing_stop)
        assert widget_ws.send_json.call_count == 2
        
        # Admin should not receive typing indicators
        admin_ws.send_json.assert_not_called()


class TestFailureRecoveryIntegration:
    """Test system behavior when connections fail"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_partial_connection_failure(self):
        """Test behavior when some connections fail"""
        # Setup connections where one fails
        working_admin_ws = AsyncMock()
        failing_admin_ws = AsyncMock()
        failing_admin_ws.send_json.side_effect = Exception("Connection closed")
        
        working_widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [working_admin_ws, failing_admin_ws]
        ws_site_connections[dialog_id] = [working_widget_ws]
        
        message_data = {
            "id": 456,
            "sender": "manager",
            "text": "Message with partial failure",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Should not raise exception despite one failing connection
        await push_dialog_message(dialog_id, message_data)
        await push_site_dialog_message(dialog_id, message_data)
        
        # Working connections should still receive message
        working_admin_ws.send_json.assert_called_once_with(message_data)
        working_widget_ws.send_json.assert_called_once_with(message_data)
        
        # Failing connection should have been attempted
        failing_admin_ws.send_json.assert_called_once_with(message_data)
    
    @pytest.mark.asyncio
    async def test_no_connections_graceful_handling(self):
        """Test graceful handling when no connections exist"""
        dialog_id = 999  # No connections for this dialog
        
        message_data = {
            "id": 123,
            "sender": "user", 
            "text": "Message to empty channel",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        # Should not raise exception
        await push_dialog_message(dialog_id, message_data)
        await push_site_dialog_message(dialog_id, message_data)
        
        # No assertions needed - just verifying no exceptions


class TestMessageFormatIntegration:
    """Test different message formats work across channels"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_direct_message_format(self):
        """Test direct message format {id, sender, text, timestamp}"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        direct_message = {
            "id": 456,
            "sender": "manager",
            "text": "Direct message format",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, direct_message)
        await push_site_dialog_message(dialog_id, direct_message)
        
        # Both should receive exact same format
        admin_ws.send_json.assert_called_once_with(direct_message)
        widget_ws.send_json.assert_called_once_with(direct_message)
    
    @pytest.mark.asyncio
    async def test_wrapped_message_format(self):
        """Test wrapped message format {message: {...}}"""
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_site_connections[dialog_id] = [widget_ws]
        
        wrapped_message = {
            "message": {
                "id": 456,
                "sender": "assistant",
                "text": "Wrapped AI response",
                "timestamp": "2025-01-15T10:30:00Z"
            }
        }
        
        await push_site_dialog_message(dialog_id, wrapped_message)
        
        widget_ws.send_json.assert_called_once_with(wrapped_message)
    
    @pytest.mark.asyncio 
    async def test_system_event_format(self):
        """Test system event format {type, ...}"""
        admin_ws = AsyncMock()
        widget_ws = AsyncMock()
        
        dialog_id = 123
        ws_connections[dialog_id] = [admin_ws]
        ws_site_connections[dialog_id] = [widget_ws]
        
        system_event = {
            "type": "dialog_closed",
            "dialog_id": dialog_id,
            "reason": "User disconnected",
            "timestamp": "2025-01-15T10:30:00Z"
        }
        
        await push_dialog_message(dialog_id, system_event)
        await push_site_dialog_message(dialog_id, system_event)
        
        # Both channels should receive system event
        admin_ws.send_json.assert_called_once_with(system_event)
        widget_ws.send_json.assert_called_once_with(system_event)


class TestPerformanceIntegration:
    """Performance tests for cross-channel integration"""
    
    def setup_method(self):
        """Clear connection pools before each test"""
        ws_connections.clear()
        ws_site_connections.clear()
    
    @pytest.mark.asyncio
    async def test_high_throughput_cross_channel(self):
        """Test high throughput message sending across channels"""
        # Setup many connections
        admin_connections = [AsyncMock() for _ in range(10)]
        widget_connections = [AsyncMock() for _ in range(5)]
        
        dialog_id = 123
        ws_connections[dialog_id] = admin_connections
        ws_site_connections[dialog_id] = widget_connections
        
        # Send many messages rapidly
        num_messages = 50
        messages = []
        
        import time
        start_time = time.time()
        
        for i in range(num_messages):
            message = {
                "id": i,
                "sender": "manager",
                "text": f"High throughput message {i}",
                "timestamp": datetime.now().isoformat() + "Z"
            }
            messages.append(message)
            
            # Broadcast to all channels
            await push_dialog_message(dialog_id, message)
            await push_site_dialog_message(dialog_id, message)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly (under 2 seconds for 50 messages)
        assert duration < 2.0
        
        # Verify all connections received all messages
        for admin_ws in admin_connections:
            assert admin_ws.send_json.call_count == num_messages
            
        for widget_ws in widget_connections:
            assert widget_ws.send_json.call_count == num_messages
    
    @pytest.mark.asyncio
    async def test_concurrent_message_sending(self):
        """Test concurrent message sending to different dialogs"""
        # Setup connections for multiple dialogs
        admin_ws1 = AsyncMock()
        admin_ws2 = AsyncMock()
        widget_ws1 = AsyncMock()
        widget_ws2 = AsyncMock()
        
        dialog_id1 = 123
        dialog_id2 = 456
        
        ws_connections[dialog_id1] = [admin_ws1]
        ws_connections[dialog_id2] = [admin_ws2]
        ws_site_connections[dialog_id1] = [widget_ws1]
        ws_site_connections[dialog_id2] = [widget_ws2]
        
        # Create tasks for concurrent message sending
        async def send_to_dialog1():
            message = {
                "id": 1,
                "sender": "manager",
                "text": "Message to dialog 1",
                "timestamp": "2025-01-15T10:30:00Z"
            }
            await push_dialog_message(dialog_id1, message)
            await push_site_dialog_message(dialog_id1, message)
        
        async def send_to_dialog2():
            message = {
                "id": 2,
                "sender": "manager", 
                "text": "Message to dialog 2",
                "timestamp": "2025-01-15T10:30:00Z"
            }
            await push_dialog_message(dialog_id2, message)
            await push_site_dialog_message(dialog_id2, message)
        
        # Execute concurrently
        import time
        start_time = time.time()
        
        await asyncio.gather(send_to_dialog1(), send_to_dialog2())
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly
        assert duration < 1.0
        
        # Verify correct routing - each dialog's connections should receive their message
        admin_ws1.send_json.assert_called_once()
        admin_ws2.send_json.assert_called_once()
        widget_ws1.send_json.assert_called_once()
        widget_ws2.send_json.assert_called_once()
        
        # Verify message content routing
        admin_ws1_call_args = admin_ws1.send_json.call_args[0][0]
        admin_ws2_call_args = admin_ws2.send_json.call_args[0][0]
        
        assert admin_ws1_call_args["text"] == "Message to dialog 1"
        assert admin_ws2_call_args["text"] == "Message to dialog 2"


if __name__ == "__main__":
    pytest.main([__file__])