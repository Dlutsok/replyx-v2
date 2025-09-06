# WebSocket Architecture & Real-time Communication

## Overview

This document describes the Production-Ready real-time communication system implemented in ReplyX using WebSocket connections. The system provides enterprise-grade reliability with guaranteed message delivery, intelligent reconnection strategies, rate limiting, and comprehensive monitoring.

## Architecture Components

### 1. WebSocket Manager (`backend/services/websocket_manager.py`)

Production-ready service that manages WebSocket connections with enterprise-grade features.

#### Connection Management
- **Connection Pools**: `Set[WebSocket]` for O(1) operations
  - `ws_connections`: Admin panel connections (`/ws/dialogs/{id}`)
  - `ws_site_connections`: Widget and site connections (`/ws/site/dialogs/{id}`, `/ws/widget/dialogs/{id}`)
- **Metadata Tracking**: `ws_meta`, `ws_site_meta` for heartbeat and connection info
- **Global Connection Counter**: `_total_connections` for O(1) statistics
- **Per-dialog Locks**: `_dialog_locks` for concurrent push safety

#### Production Features
- **Rate Limiting**: IP-based connection limits with sliding window
- **JWT Domain Validation**: Signature verification with allowed domains
- **Memory Safety**: Automatic cleanup of stale connections and metadata
- **Heartbeat System**: 25s ping, 40s timeout with proper close codes
- **Connection Limits**: 50 per dialog, 1000 total with graceful rejection

#### Key Functions
- `push_dialog_message()`: Thread-safe message broadcasting to admin panels
- `push_site_dialog_message()`: Thread-safe message broadcasting to widgets  
- `_check_rate_limit()`: IP-based rate limiting with automatic cleanup
- `_is_domain_allowed_by_token()`: JWT-based domain validation
- `get_connection_stats()`: Real-time connection and rate limit statistics

### 2. Production WebSocket Endpoints

#### Admin Panel Endpoint (`/ws/dialogs/{dialog_id}`)
- **Authentication**: JWT token validation with user lookup
- **Rate Limiting**: IP-based with configurable limits
- **Features**: 
  - User authorization with database lookup
  - Connection limit enforcement
  - Automatic cleanup on token expiry
- **Close Codes**: `AUTH_FAILED` (4002), `RATE_LIMITED` (4008)

#### Site Dialog Endpoint (`/ws/site/dialogs/{dialog_id}`)
- **Authentication**: Site token with domain validation
- **Security**: JWT signature verification + domain whitelist
- **Features**:
  - Origin header validation
  - Domain-based access control
  - Fallback compatibility mode
- **Close Codes**: `FORBIDDEN_DOMAIN` (4003), `AUTH_EXPIRED` (4001)

#### Widget Endpoint (`/ws/widget/dialogs/{dialog_id}`)
- **Authentication**: Assistant ID validation against database
- **Features**:
  - Assistant existence verification
  - Automatic dialog creation if needed
  - Widget-specific message routing
- **Close Codes**: `NOT_FOUND` (4004), `AUTH_FAILED` (4002)

### 3. Close Code System (`backend/services/ws_codes.py`)

Production-ready deterministic close codes for intelligent client behavior.

#### Standard Codes (RFC 6455)
- `NORMAL_CLOSURE` (1000): Normal close - no reconnection
- `GOING_AWAY` (1001): Server restart - reconnect with backoff
- `PROTOCOL_ERROR` (1002): Protocol error - no reconnection
- `SERVICE_RESTART` (1012): Service restart - reconnect with backoff

#### Application Codes (4000-4999)
- `AUTH_EXPIRED` (4001): Token expired - refresh token then reconnect
- `AUTH_FAILED` (4002): Invalid credentials - no reconnection
- `FORBIDDEN_DOMAIN` (4003): Domain not allowed - no reconnection
- `NOT_FOUND` (4004): Resource not found - no reconnection
- `RATE_LIMITED` (4008): Rate limit exceeded - extended backoff
- `CONFLICT_CONNECTION` (4009): Duplicate connection - immediate reconnect

### 4. Message Queue System (`backend/services/ws_message_queue.py`)

Guaranteed message delivery with ACK+deduplication system.

#### Features
- **Unique Message IDs**: `{dialog_id}_{websocket_id}_{timestamp}_{sequence}_{random}`
- **Retry Mechanism**: Exponential backoff with max 3 attempts
- **Deduplication**: Set-based processed message tracking
- **Automatic Cleanup**: TTL-based message expiry (5 minutes)
- **Idempotency**: Safe retry without duplicates

#### Configuration (Environment Variables)
- `WS_ACK_TIMEOUT_SECONDS=10`: ACK timeout
- `WS_MAX_RETRY_ATTEMPTS=3`: Maximum retry attempts
- `WS_MESSAGE_TTL_SECONDS=300`: Message time-to-live

### 5. Configuration System (`backend/services/ws_config.py`)

Centralized environment-based configuration for all WebSocket components.

#### Environment Variables
```bash
# Connection limits
WS_MAX_CONNECTIONS_PER_DIALOG=50
WS_MAX_TOTAL_CONNECTIONS=1000

# Heartbeat settings  
WS_PING_INTERVAL_SECONDS=25
WS_PONG_TIMEOUT_SECONDS=40

# Rate limiting
WS_RATE_LIMIT_PER_IP=100
WS_RATE_LIMIT_WINDOW=60

# Security
WS_REQUIRE_TOKEN_SIGNATURE=true
ENVIRONMENT=production

# Message queue
WS_ACK_TIMEOUT_SECONDS=10
WS_MAX_RETRY_ATTEMPTS=3
WS_MESSAGE_TTL_SECONDS=300
```

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

### Stable WebSocket Hook (`frontend/hooks/useWebSocketStable.js`)

Production-ready React hook с enterprise-grade переподключением и обработкой ошибок.

#### Features
- **Intelligent Reconnection**: Exponential backoff с decorrelated jitter
- **Close Code Handling**: Различная логика для каждого close code
- **Connection Status**: Real-time статус подключения
- **Rate Limit Handling**: Автоматический extended backoff при RATE_LIMITED (4008)
- **Auth Token Refresh**: Автоматическое обновление токена при AUTH_EXPIRED (4001)
- **Message Deduplication**: По message_id для предотвращения дублей

#### Close Code Response Strategy
```javascript
const handleClose = (event) => {
  const { code, reason } = event;
  
  switch(code) {
    case 1000: // NORMAL_CLOSURE - не переподключаемся
      setStatus('disconnected');
      break;
      
    case 1001: // GOING_AWAY - сервер перезагружается
    case 1012: // SERVICE_RESTART
      scheduleReconnect(5000); // 5s backoff
      break;
      
    case 4001: // AUTH_EXPIRED - обновляем токен
      refreshAuthToken().then(() => scheduleReconnect(1000));
      break;
      
    case 4008: // RATE_LIMITED - extended backoff  
      scheduleReconnect(30000 + Math.random() * 30000); // 30-60s
      break;
      
    case 4002: // AUTH_FAILED
    case 4003: // FORBIDDEN_DOMAIN  
    case 4004: // NOT_FOUND
      // Не переподключаемся - перманентные ошибки
      setStatus('error');
      break;
      
    default:
      scheduleReconnect(); // Стандартный exponential backoff
  }
};
```

### Admin Panel (`frontend/components/dialogs/DialogModal.js`)

#### Features
- JWT authentication с автоматическим refresh
- Graceful degradation к polling при неудаче WebSocket
- Connection status indicator с visual feedback  
- Message deduplication и ordering
- Rate limit aware reconnection

#### Connection Logic
```javascript
const wsUrl = `${wsProtocol}://${wsHost}/ws/dialogs/${dialogId}?token=${token}`;
const { status, sendMessage } = useWebSocketStable(wsUrl, {
  onMessage: handleIncomingMessage,
  authToken: token,
  maxRetryAttempts: 5
});
```

### Widget (`frontend/pages/chat-iframe.js`)

#### Features  
- Dual connection modes: assistant_id или site_token
- Optimistic updates для user messages
- Real-time delivery notifications
- Typing indicators с debouncing
- Local message validation с server fallback

#### Connection Modes
```javascript
// Widget mode - прямое подключение по assistant_id
const wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;

// Site mode - подключение через site_token с domain validation
const wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
```

#### Message Flow Strategy
```javascript
// User отправляет сообщение
const sendUserMessage = async (text) => {
  // 1. Optimistic update
  addMessageToState({ text, sender: 'user', status: 'sending' });
  
  // 2. HTTP POST для гарантированной доставки
  try {
    const response = await api.post('/messages', { text });
    updateMessageStatus(response.id, 'sent');
  } catch (error) {
    updateMessageStatus('error');
  }
  
  // 3. WebSocket НЕ используется для user messages (избегаем дублей)
};
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

### Connection Management Optimization
- **O(1) Operations**: `Set[WebSocket]` для быстрых добавлений/удалений
- **Per-Dialog Locks**: `_dialog_locks` для thread-safe concurrent broadcasting
- **Connection Pooling**: Separate pools для admin (`ws_connections`) и site (`ws_site_connections`)
- **Global Counter**: `_total_connections` для O(1) статистики без итераций

### Rate Limiting Performance
- **Sliding Window**: O(1) amortized complexity с автоматической очисткой
- **Memory Efficient**: Периодическая очистка старых записей > 60s
- **IP-based Throttling**: Предотвращает DDoS и resource exhaustion
- **Configurable Limits**: `WS_RATE_LIMIT_PER_IP=100` в 60-секундном окне

### Message Queue Optimization
- **Unique Message IDs**: `{dialog_id}_{websocket_id}_{timestamp}_{sequence}_{random}`
- **Deduplication**: Set-based processed message tracking for O(1) lookup
- **TTL Cleanup**: Автоматическая очистка expired messages каждые 60s
- **Retry Strategy**: Exponential backoff с max 3 attempts, max 60s delay

### Memory Management
- **Automatic Cleanup**: Удаление stale connections и metadata при отключении
- **Bounded Collections**: Processed messages ограничены 10k записями
- **Garbage Collection**: Periodic cleanup каждые 5 минут для metadata
- **Connection Metadata**: Minimal tracking (creation time, heartbeat status)

## Security

### Multi-Layer Authentication
- **Admin Panel**: JWT token validation с user lookup против database
- **Site Dialogs**: Site token с JWT signature verification + domain whitelist
- **Widget**: Assistant ID validation против database с auto dialog creation

### Advanced Authorization
- **Dialog Access Control**: Users can only access their own dialogs через user_id
- **Domain-based Security**: JWT payload `allowed_domains` для site connections
- **Origin Header Validation**: Проверка Origin header против whitelist
- **Signature Verification**: `WS_REQUIRE_TOKEN_SIGNATURE=true` в production

### Rate Limiting Security
- **DDoS Protection**: IP-based connection limits `WS_RATE_LIMIT_PER_IP=100`
- **Resource Exhaustion Prevention**: Global limit `WS_MAX_TOTAL_CONNECTIONS=1000`
- **Per-Dialog Limits**: `WS_MAX_CONNECTIONS_PER_DIALOG=50` против spam
- **Sliding Window**: 60-секундное окно с automatic cleanup

### Production Security Features
- **Deterministic Close Codes**: Предотвращают information disclosure
- **Memory Safety**: Automatic cleanup предотвращает memory leaks
- **Token Expiry Handling**: Graceful AUTH_EXPIRED (4001) с client-side refresh
- **Environment-based Config**: Development vs Production режимы

## Monitoring & Debugging

### Production Monitoring
- **Connection Statistics**: `get_connection_stats()` для real-time metrics
- **Rate Limiting Metrics**: Active rate limited IPs и window statistics
- **Message Queue Stats**: Pending, processed, retry-ready message counts
- **Performance Metrics**: Connection creation/cleanup times

### Enterprise Logging
- **Structured Logging**: JSON format с correlation IDs для tracing
- **Security Events**: Rate limiting, auth failures, domain violations
- **Performance Logging**: Slow operations, memory cleanup events
- **Heartbeat Monitoring**: `WS_LOG_HEARTBEAT_EVENTS=true` для debugging

### Real-time Statistics API
```python
# GET /api/websocket/stats
{
  "total_connections": 245,
  "admin_dialogs": 12,
  "site_dialogs": 233,
  "rate_limited_ips": 3,
  "rate_limit_window": 60,
  "rate_limit_per_ip": 100,
  "message_queue": {
    "pending_messages": 0,
    "processed_messages": 1543,
    "retry_ready": 0
  }
}
```

### Debug Tools
- **Connection Inspector**: Admin panel connection status с retry count
- **Message Trace**: Debug info для message delivery chain
- **Rate Limit Dashboard**: Real-time IP blocking status
- **Close Code Analytics**: Tracking переподключений по close code типам

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

## Production Deployment Considerations

### Environment Configuration
```bash
# Production WebSocket настройки
WS_MAX_CONNECTIONS_PER_DIALOG=50
WS_MAX_TOTAL_CONNECTIONS=1000
WS_PING_INTERVAL_SECONDS=25
WS_PONG_TIMEOUT_SECONDS=40

# Rate Limiting
WS_RATE_LIMIT_PER_IP=100
WS_RATE_LIMIT_WINDOW=60

# Security
WS_REQUIRE_TOKEN_SIGNATURE=true
ENVIRONMENT=production

# Message Queue
WS_ACK_TIMEOUT_SECONDS=10
WS_MAX_RETRY_ATTEMPTS=3
WS_MESSAGE_TTL_SECONDS=300
WS_MESSAGE_CLEANUP_INTERVAL=60

# Monitoring
WS_LOG_LEVEL=INFO
WS_LOG_HEARTBEAT_EVENTS=false
```

### Load Balancing Considerations
- **Sticky Sessions**: WebSocket соединения должны быть привязаны к одному backend
- **Health Checks**: `/ws/health` endpoint для load balancer probes  
- **Graceful Shutdown**: `SERVICE_RESTART` (1012) при rolling deployments
- **Connection Draining**: Постепенное закрытие соединений при shutdown

### Scaling Recommendations
- **Vertical Scaling**: До 10k concurrent соединений на сервер
- **Horizontal Scaling**: Redis pub/sub для межсерверной communication
- **Database Connection Pool**: Настройка pool size для WebSocket endpoints
- **Memory Monitoring**: Установка alerts на connection count и memory usage

## Future Enhancements

### Planned Production Features
- **Redis Pub/Sub**: Горизонтальное масштабирование между серверами
- **Prometheus Metrics**: Подробные метрики для monitoring
- **Message Persistence**: Queue для offline users
- **Connection Multiplexing**: Sharing одного WebSocket между multiple dialogs

### Advanced Features  
- **Presence System**: Online/offline status indicators
- **Read Receipts**: Acknowledgment от end users
- **Message Encryption**: End-to-end encryption для sensitive data
- **Compression**: WebSocket per-message deflate для large payloads
- **Priority Queuing**: High-priority messages (urgent notifications)