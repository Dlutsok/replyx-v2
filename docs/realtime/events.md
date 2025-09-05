# Realtime Events Catalog

| Event | Direction | Payload schema | Consumer |
|------|-----------|----------------|----------|
| dialog.message.created@v1 | server→client | `{dialogId, messageId, role, content, ts}` | UI dialogs |
| typing.start@v1 / typing.stop@v1 | server→client | `{dialogId, actor}` | UI |
| billing.balance.updated@v1 | server→client | `{userId, balance}` | UI topbar |
| worker.job.progress@v1 | server→client | `{jobId, status, pct}` | UI tasks |
| handoff.started@v1 | server→client | `{dialogId, managerInfo, metadata, sequence}` | Admin/Widget |
| handoff.released@v1 | server→client | `{dialogId, metadata, sequence}` | Admin/Widget |
| handoff.cancelled@v1 | server→client | `{dialogId, reason, metadata, sequence}` | Admin/Widget |
| operator.handling@v1 | server→client | `{dialogId, message, metadata, sequence}` | Admin/Widget |
| connection.ping@v1 | server→client | `__ping__` | WebSocket heartbeat |
| connection.pong@v1 | client→server | `__pong__` | WebSocket heartbeat |

## WebSocket Connection Management

### Heartbeat System
- **Ping interval**: 25 seconds
- **Pong timeout**: 40 seconds  
- **Auto-reconnect**: Exponential backoff (1s, 2s, 4s, 8s, 10s max)
- **Max attempts**: 5 reconnection attempts
- **Connection limits**: 50 per dialog, 1000 total

### Dual Connection Support
- **Admin connections**: `ws_connections` - for admin panel
- **Site connections**: `ws_site_connections` - for widgets  
- **Metadata tracking**: connection created time, last pong, counters

> При изменении payload — повышай версию: `name@vN`.
