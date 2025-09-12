# Realtime Events Catalog

**Последнее обновление:** 2025-09-11 (синхронизировано с MVP 13)

## WebSocket & SSE Events

| Event | Direction | Payload Schema | Consumer | Version |
|-------|-----------|----------------|----------|---------|
| **Подключение и heartbeat** |
| connection.established@v1 | server→client | `{client_id, connection_type, timestamp}` | All clients | v1 |
| connection.ping@v1 | server→client | `__ping__` | WebSocket heartbeat | v1 |
| connection.pong@v1 | client→server | `__pong__` | WebSocket heartbeat | v1 |
| connection.closed@v1 | server→client | `{reason, code, timestamp}` | All clients | v1 |
| **Диалоги и сообщения** |
| dialog.message.created@v1 | server→client | `{dialog_id, message: {id, sender, text, timestamp}, sequence}` | Admin/Widget | v1 |
| dialog.message.updated@v1 | server→client | `{dialog_id, message_id, changes, sequence}` | Admin/Widget | v1 |
| dialog.status.changed@v1 | server→client | `{dialog_id, old_status, new_status, sequence}` | Admin/Widget | v1 |
| **Typing индикаторы** |
| typing.start@v1 | server→client | `{dialog_id, actor: {type, name}, timestamp}` | UI dialogs | v1 |
| typing.stop@v1 | server→client | `{dialog_id, actor: {type, name}, timestamp}` | UI dialogs | v1 |
| operator.typing@v1 | server→client | `{dialog_id, operator_name, timestamp}` | Widget/Admin | v1 |
| **Handoff система** |
| handoff.requested@v1 | server→client | `{dialog_id, reason, queue_position, estimated_wait, sequence, timestamp}` | Admin/Widget | v1 |
| handoff.started@v1 | server→client | `{dialog_id, operator: {id, name, avatar}, metadata, sequence, timestamp}` | Admin/Widget | v1 |
| handoff.released@v1 | server→client | `{dialog_id, resolution, return_to_ai, metadata, sequence, timestamp}` | Admin/Widget | v1 |
| handoff.cancelled@v1 | server→client | `{dialog_id, reason, cancel_type, sequence, timestamp}` | Admin/Widget | v1 |
| handoff.queue.updated@v1 | server→client | `{total_in_queue, position_change, estimated_wait}` | Admin panel | v1 |
| **Оператор события** |
| operator.handling@v1 | server→client | `{dialog_id, message, operator_info, sequence, timestamp}` | Admin/Widget | v1 |
| operator.presence.updated@v1 | server→client | `{operator_id, status, capacity, current_load}` | Admin panel | v1 |
| **Биллинг и платежи** |
| billing.balance.updated@v1 | server→client | `{user_id, balance, previous_balance, transaction_id}` | UI topbar | v1 |
| payment.status.changed@v1 | server→client | `{payment_id, status, amount, details}` | User dashboard | v1 |
| **Система и мониторинг** |
| worker.job.progress@v1 | server→client | `{job_id, status, progress_pct, eta, details}` | UI tasks | v1 |
| system.health.alert@v1 | server→client | `{service, status, severity, message}` | Admin panel | v1 |
| ai.provider.status@v1 | server→client | `{provider, status, response_time, error_rate}` | Admin panel | v1 |

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
