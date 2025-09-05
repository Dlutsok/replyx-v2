# Real-time Communication Implementation Guide

## Quick Start

This guide explains how to implement and use the real-time communication system in ChatAI.

## Backend Implementation

### 1. Setting Up WebSocket Manager

The WebSocket manager is already configured in `backend/services/websocket_manager.py`. Key points:

#### Adding WebSocket Support to API Endpoints

```python
from services.websocket_manager import push_dialog_message, push_site_dialog_message

# For messages that should appear in admin panel only (user messages from widget)
await push_dialog_message(dialog_id, {
    "id": msg.id,
    "sender": msg.sender,
    "text": msg.text,
    "timestamp": msg.timestamp.isoformat() + 'Z'
})

# For messages that should appear everywhere (AI, manager messages)
message_data = {
    "id": msg.id,
    "sender": msg.sender,
    "text": msg.text,
    "timestamp": msg.timestamp.isoformat() + 'Z'
}
await push_dialog_message(dialog_id, message_data)
await push_site_dialog_message(dialog_id, message_data)
```

### 2. Message Routing Rules

#### ✅ Send to Admin Panel Only
- User messages from widget (prevents duplication)
- Messages that widgets handle optimistically

#### ✅ Send to All Channels
- AI responses
- Manager/operator messages
- System notifications
- Handoff events

### 3. Adding New WebSocket Endpoints

```python
@router.websocket("/ws/custom/{dialog_id}")
async def custom_websocket_endpoint(websocket: WebSocket, dialog_id: int):
    await websocket.accept()
    
    # Register connection
    ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
    if not ok:
        return
        
    # Handle connection lifecycle
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_meta))
    
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        await _unregister_connection(ws_connections, ws_meta, dialog_id, websocket)
```

## Frontend Implementation

### 1. Admin Panel WebSocket

#### Basic Setup
```javascript
const connectWebSocket = useCallback(() => {
    const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/dialogs/${dialogId}?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;
    
    ws.onopen = () => {
        setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.id && data.sender && data.text) {
            setMessages(prevMessages => {
                const exists = prevMessages.some(msg => msg.id === data.id);
                if (!exists) {
                    return [...prevMessages, data];
                }
                return prevMessages;
            });
        }
    };
}, [dialogId, token]);
```

#### With Fallback to Polling
```javascript
const [useFallback, setUseFallback] = useState(false);

const startFallbackPolling = useCallback(() => {
    const pollMessages = async () => {
        const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const messagesData = await response.json();
            setMessages(messagesData);
        }
    };
    
    pollingIntervalRef.current = setInterval(pollMessages, 3000);
}, [dialogId, token]);

// In WebSocket onclose handler
ws.onclose = (event) => {
    if (reconnectAttempts >= maxReconnectAttempts) {
        setUseFallback(true);
        startFallbackPolling();
    }
};
```

### 2. Widget WebSocket

#### Basic Widget Connection
```javascript
useEffect(() => {
    if (dialogId && assistantId) {
        const wsUrl = `${API_URL.replace('http', 'ws')}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
        const socket = new WebSocket(wsUrl);
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Handle typing indicators
            if (data.type === 'typing_start') {
                setTyping(true);
                return;
            }
            
            // Handle direct messages (not from user to prevent duplication)
            if (data.id && data.sender !== 'user') {
                setMessages(prev => {
                    const exists = prev.find(m => m.id === data.id);
                    if (!exists) {
                        return [...prev, data];
                    }
                    return prev;
                });
            }
        };
    }
}, [dialogId, assistantId]);
```

#### Optimistic Updates
```javascript
const sendMessage = async (text) => {
    // Add message optimistically
    const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
        optimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
        const response = await fetch(`/api/widget/dialogs/${dialogId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'user', text })
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update optimistic message with real data
            setMessages(prev => prev.map(m => 
                m.id === optimisticMessage.id 
                    ? { ...result.user_message, delivered: true }
                    : m
            ));
        }
    } catch (error) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
};
```

## Message Handling Patterns

### 1. Message Deduplication

```javascript
// Frontend deduplication by ID
const handleNewMessage = (newMessage) => {
    setMessages(prevMessages => {
        const exists = prevMessages.some(msg => msg.id === newMessage.id);
        if (!exists) {
            return [...prevMessages, newMessage];
        }
        return prevMessages;
    });
};

// Backend deduplication in WebSocket manager
async def push_dialog_message(dialog_id: int, message: dict):
    conns = ws_connections.get(dialog_id, [])
    for ws in conns:
        try:
            await ws.send_json(message)
        except Exception:
            pass  # Connection may be closed
```

### 2. Connection Status Indicators

```javascript
// Connection status component
const ConnectionStatus = ({ wsConnected, wsError, useFallback }) => (
    <div className="connection-status">
        <div className={`status-dot ${wsConnected ? 'connected' : useFallback ? 'fallback' : 'disconnected'}`} />
        <span>
            {wsConnected ? 'Real-time connected' : 
             useFallback ? 'Polling mode' : 
             wsError ? `Error: ${wsError}` : 'Connecting...'}
        </span>
    </div>
);
```

### 3. Typing Indicators

```javascript
// Backend: Send typing start/stop
await push_site_dialog_message(dialog_id, {"type": "typing_start"})
// ... AI processing ...
await push_site_dialog_message(dialog_id, {"type": "typing_stop"})

// Frontend: Handle typing indicators
if (data.type === 'typing_start') {
    setTyping(true);
} else if (data.type === 'typing_stop') {
    setTyping(false);
}
```

## Testing Real-time Features

### 1. Manual Testing Checklist

#### Admin Panel ↔ Widget Communication
- [ ] Open dialog in admin panel
- [ ] Send message from widget → appears instantly in admin
- [ ] Reply from admin → appears instantly in widget
- [ ] AI response → appears in both interfaces
- [ ] Connection drops → fallback works
- [ ] Reconnect → messages sync properly

#### Message Deduplication
- [ ] User messages from widget don't duplicate
- [ ] Rapid message sending works correctly
- [ ] Page refresh shows correct message count
- [ ] Multiple admin panels show same messages

### 2. Automated Testing

#### WebSocket Connection Test
```javascript
// Test WebSocket connection
const testWebSocketConnection = (url, token) => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${url}?token=${token}`);
        
        ws.onopen = () => {
            ws.close();
            resolve('Connection successful');
        };
        
        ws.onerror = (error) => {
            reject(error);
        };
        
        setTimeout(() => {
            reject('Connection timeout');
        }, 5000);
    });
};
```

#### Message Flow Test
```javascript
// Test message delivery
const testMessageDelivery = async (dialogId, messageText) => {
    const messagesSent = [];
    const messagesReceived = [];
    
    // Setup WebSocket listener
    const ws = new WebSocket(`ws://localhost:8000/ws/dialogs/${dialogId}?token=${token}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && data.text) {
            messagesReceived.push(data);
        }
    };
    
    // Send message
    const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'manager', text: messageText })
    });
    
    const sentMessage = await response.json();
    messagesSent.push(sentMessage);
    
    // Wait and verify
    setTimeout(() => {
        assert(messagesReceived.length === messagesSent.length, 'Message delivery failed');
    }, 1000);
};
```

## Debugging Tips

### 1. Common Issues

#### Messages Not Appearing
```javascript
// Check WebSocket connection
console.log('WebSocket state:', websocketRef.current?.readyState);
// 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED

// Check message format
socket.onmessage = (event) => {
    console.log('Raw WebSocket message:', event.data);
    const data = JSON.parse(event.data);
    console.log('Parsed message:', data);
};
```

#### Connection Issues
```javascript
// Enable detailed WebSocket logging
const enableWebSocketDebug = () => {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        console.log('WebSocket connecting to:', url);
        const ws = new originalWebSocket(url, protocols);
        
        ws.addEventListener('open', (e) => console.log('WebSocket opened:', e));
        ws.addEventListener('close', (e) => console.log('WebSocket closed:', e));
        ws.addEventListener('error', (e) => console.log('WebSocket error:', e));
        ws.addEventListener('message', (e) => console.log('WebSocket message:', e.data));
        
        return ws;
    };
};
```

### 2. Performance Monitoring

```javascript
// Track message latency
const messageLatencyTracker = {
    startTime: null,
    
    measureSendLatency() {
        this.startTime = Date.now();
    },
    
    measureReceiveLatency() {
        if (this.startTime) {
            const latency = Date.now() - this.startTime;
            console.log(`Message latency: ${latency}ms`);
        }
    }
};
```

## Best Practices

### 1. Connection Management
- Always implement fallback mechanisms
- Use exponential backoff for reconnection
- Limit connection attempts to prevent spam
- Clean up WebSocket connections on component unmount

### 2. Message Handling
- Always check message format before processing
- Implement message deduplication by ID
- Handle edge cases (empty messages, malformed data)
- Log important events for debugging

### 3. Error Handling
- Provide user-friendly error messages
- Implement graceful degradation
- Monitor connection health
- Report connection issues to analytics

### 4. Performance
- Avoid creating new WebSocket connections unnecessarily  
- Batch multiple messages when possible
- Clean up event listeners
- Monitor memory usage with many connections