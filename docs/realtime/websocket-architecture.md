# WebSocket Architecture & Real-time Communication

## Overview

This document describes the real-time communication system implemented in ChatAI using WebSocket connections. The system enables instant message delivery between admin panels, widgets, and user interfaces without the need for page refreshes.

## Architecture Components

### 1. WebSocket Manager (`backend/services/websocket_manager.py`)

Central service that manages WebSocket connections and message routing.

#### Connection Pools
- `ws_connections`: Admin panel connections (`/ws/dialogs/{id}`)
- `ws_site_connections`: Widget and site connections (`/ws/site/dialogs/{id}`, `/ws/widget/dialogs/{id}`)

#### Key Functions
- `push_dialog_message(dialog_id, message)`: Sends messages to admin panel
- `push_site_dialog_message(dialog_id, message)`: Sends messages to widgets
- `dialog_websocket_endpoint()`: Handles admin panel WebSocket connections
- `site_dialog_websocket_endpoint()`: Handles site WebSocket connections
- `widget_dialog_websocket_endpoint()`: Handles widget WebSocket connections

### 2. WebSocket Endpoints

#### Admin Panel Endpoint
- **URL**: `/ws/dialogs/{dialog_id}?token={jwt_token}`
- **Purpose**: Real-time updates for admin interface
- **Authentication**: JWT token
- **Connection Pool**: `ws_connections`

#### Site Dialog Endpoint
- **URL**: `/ws/site/dialogs/{dialog_id}?site_token={site_token}`
- **Purpose**: Real-time updates for authenticated site dialogs
- **Authentication**: Site token
- **Connection Pool**: `ws_site_connections`

#### Widget Endpoint
- **URL**: `/ws/widget/dialogs/{dialog_id}?assistant_id={assistant_id}`
- **Purpose**: Real-time updates for widget dialogs
- **Authentication**: Assistant ID validation
- **Connection Pool**: `ws_site_connections`

### 3. Message Routing Strategy

#### User Messages (from widgets)
- **Route**: Widget → Backend → Admin Panel only
- **Reason**: Widgets handle user messages optimistically, sending to widget would cause duplication
- **Implementation**: `push_dialog_message()` only

#### AI/Manager Messages
- **Route**: Backend → All channels (Admin + Widgets)
- **Reason**: All interfaces need to display responses from AI and operators
- **Implementation**: `push_dialog_message()` + `push_site_dialog_message()`

## Message Flow Diagrams

### User Sends Message from Widget
```
[Widget] --POST--> [Backend API] --WebSocket--> [Admin Panel]
    |                    |
    |                    └--DB Save
    └--Optimistic Update
```

### Operator Replies from Admin Panel
```
[Admin Panel] --POST--> [Backend API] --WebSocket--> [Widget]
                           |                          |
                           └--DB Save                 └--Real-time Update
```

### AI Generates Response
```
[Backend AI] --Save--> [Database]
      |
      └--WebSocket--> [Admin Panel] + [Widget]
```

## WebSocket Message Formats

### Direct Message Format
```json
{
  "id": 123,
  "sender": "manager",
  "text": "Hello from operator",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Wrapped Message Format (Legacy)
```json
{
  "message": {
    "id": 123,
    "sender": "assistant",
    "text": "AI response",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### System Events
```json
{
  "type": "handoff_started",
  "dialog_id": 456,
  "manager": {
    "id": 1,
    "name": "John Doe"
  }
}
```

### Typing Indicators
```json
{
  "type": "typing_start"
}
```

## Frontend Implementation

### Admin Panel (`frontend/components/dialogs/DialogModal.js`)

#### Features
- WebSocket connection with JWT authentication
- Fallback to polling when WebSocket fails
- Connection status indicator
- Automatic reconnection with exponential backoff
- Message deduplication by ID

#### Connection Logic
```javascript
const wsUrl = `${wsProtocol}://${wsHost}/ws/dialogs/${dialogId}?token=${token}`;
const ws = new WebSocket(wsUrl);
```

### Widget (`frontend/pages/chat-iframe.js`)

#### Features
- WebSocket connection with assistant_id or site_token
- Optimistic message updates for user messages
- Real-time notifications for operator messages
- Message deduplication
- Typing indicators

#### Connection Logic
```javascript
// Widget mode
const wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
// Site mode
const wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
```

## Error Handling & Resilience

### Connection Management
- **Heartbeat**: Ping/pong every 25 seconds
- **Timeout**: 40 seconds for pong response
- **Limits**: Max 50 connections per dialog, 1000 total
- **Reconnection**: Exponential backoff, max 5 attempts

### Fallback Mechanisms
- **Admin Panel**: Automatic fallback to 3-second polling
- **Widget**: Continues to work via HTTP requests
- **Graceful Degradation**: System remains functional without WebSocket

## Performance Considerations

### Message Deduplication
- **Frontend**: Check message ID before adding to state
- **Backend**: Atomic message creation and WebSocket dispatch
- **Race Conditions**: Handled by ID-based deduplication

### Connection Limits
- **Per Dialog**: Maximum 50 WebSocket connections
- **Global**: Maximum 1000 total connections
- **Cleanup**: Automatic connection cleanup on disconnect

### Memory Management
- **Connection Metadata**: Tracking creation time and heartbeat status
- **Message Queuing**: Direct send without queuing for simplicity
- **Garbage Collection**: Automatic cleanup of closed connections

## Security

### Authentication
- **Admin Panel**: JWT token validation
- **Site Dialogs**: Site token validation  
- **Widget**: Assistant ID validation against database

### Authorization
- **Dialog Access**: Users can only access their own dialogs
- **Cross-User Prevention**: Token validation prevents unauthorized access
- **Rate Limiting**: Connection limits prevent abuse

## Monitoring & Debugging

### Logging
- **Backend**: Detailed WebSocket connection/disconnection logs
- **Frontend**: Console logging for message flow
- **Connection Tracking**: Number of connections per dialog

### Debug Information
- **Admin Panel**: Connection status indicator
- **Widget**: Debug info display for connection status
- **Error Handling**: Graceful error display to users

## Troubleshooting

### Common Issues

#### Messages Not Updating
1. Check WebSocket connection status
2. Verify token authentication
3. Check browser console for errors
4. Confirm backend WebSocket endpoint is running

#### Duplicate Messages
1. Verify message deduplication logic
2. Check for multiple WebSocket connections
3. Confirm optimistic updates are working correctly

#### Connection Drops
1. Check network stability
2. Verify heartbeat/pong mechanism
3. Confirm reconnection logic
4. Check connection limits

### Testing WebSocket Connections

#### Manual Testing
```bash
# Test admin endpoint
wscat -c "ws://localhost:8000/ws/dialogs/123?token=your-jwt-token"

# Test widget endpoint  
wscat -c "ws://localhost:8000/ws/widget/dialogs/123?assistant_id=456"
```

#### Browser Testing
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws/dialogs/123?token=your-token');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## Future Enhancements

### Planned Improvements
- Message queuing for offline users
- Presence indicators (online/offline status)
- Read receipts for messages
- Message encryption for sensitive data
- Horizontal scaling with Redis pub/sub

### Performance Optimizations
- Connection pooling optimization
- Message batching for high-volume scenarios
- Compression for large messages
- Connection sharing between multiple dialogs