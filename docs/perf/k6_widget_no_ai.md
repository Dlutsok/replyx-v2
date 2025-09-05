### k6: нагрузочный тест виджета без затрат на AI

Этот сценарий имитирует множество сессий виджета, не вызывая генерацию AI:
- создаем/находим диалог `/api/widget/dialogs?assistant_id&guest_id`
- подключаемся к WebSocket `/ws/widget/dialogs/{dialog_id}?assistant_id=...`
- отправляем 1–2 сообщения от `sender=manager` (AI не триггерится)

Файл сценария: `scripts/load/k6_widget_no_ai.js`

Требования:
- установлен `k6` (`brew install k6` или `docker run -it grafana/k6`)
- доступен backend (`API_BASE`) и существует ассистент (`ASSISTANT_ID`)

Переменные окружения:
- `API_BASE` (по умолчанию `http://localhost:8000`)
- `ASSISTANT_ID` (обязательно)
- `VUS` (виртуальные пользователи, по умолчанию `50`)
- `DURATION` (длительность, по умолчанию `1m`)

Примеры запуска:

```bash
ASSISTANT_ID=117 API_BASE=https://api.yourdomain.com VUS=200 DURATION=2m \
  k6 run scripts/load/k6_widget_no_ai.js
```

Через Docker:
```bash
docker run --rm -e ASSISTANT_ID=117 -e API_BASE=https://api.yourdomain.com \
  -e VUS=200 -e DURATION=2m -v $(pwd):/work -w /work grafana/k6 \
  run scripts/load/k6_widget_no_ai.js
```

Метрики / цели по умолчанию:
- `http_req_failed < 1%`
- `http_req_duration p(95) < 800ms`
- `checks > 98%`

Советы:
- Для HTTPS используйте `API_BASE=https://...` — WS автоматически перейдет на `wss://`.
- Если нужно тестировать site-режим (`/api/site/...`), подготовьте `site_token`-вариант сценария отдельно.
- Не изменяйте `sender` на `user` — это может вызвать AI и расходы.


