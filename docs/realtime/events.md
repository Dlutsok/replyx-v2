# Realtime Events Catalog

| Event | Direction | Payload schema | Consumer |
|------|-----------|----------------|----------|
| dialog.message.created@v1 | server→client | `{dialogId, messageId, role, content, ts}` | UI dialogs |
| typing.start@v1 / typing.stop@v1 | server→client | `{dialogId, actor}` | UI |
| billing.balance.updated@v1 | server→client | `{userId, balance}` | UI topbar |
| worker.job.progress@v1 | server→client | `{jobId, status, pct}` | UI tasks |

> При изменении payload — повышай версию: `name@vN`.
