# Мониторинг WebSocket 4003 ошибок

## Что отслеживать

### 🚨 Критические индикаторы
- **Рост 4003 ошибок**: указывает на проблемы domain validation
- **Новые домены с 4003**: возможная атака или неправильная конфигурация
- **4003 для известных доменов**: регрессия в iframe логике

### 📊 Метрики для алертов

```bash
# Счётчик 4003 ошибок по доменам (за последний час)
ws_forbidden_domain_total{code="4003"} > threshold

# Скорость роста 4003 ошибок  
rate(ws_forbidden_domain_total{code="4003"}[5m]) > 0.1

# Уникальные домены с ошибками 4003
count by (origin) (ws_forbidden_domain_total{code="4003"}) > expected_domains
```

## Поиск в логах

### Backend логи (поиск проблемных 4003)

```bash
# Поиск всех 4003 ошибок
grep "FORBIDDEN_DOMAIN" /var/log/replyx/backend.log | grep "4003"

# Поиск проблем с iframe логикой
grep "Iframe scenario.*validating parent_origin" /var/log/replyx/backend.log

# Поиск проблемных доменов
grep "Forbidden domain.*for site_token" /var/log/replyx/backend.log

# Группировка по доменам
grep "Forbidden domain" /var/log/replyx/backend.log | \
  grep -o "origin=[^,]*" | sort | uniq -c | sort -nr
```

### Frontend логи (browser console)

```javascript
// Поиск WebSocket 4003 ошибок в browser console
// Фильтр: ReplyX AND (4003 OR "Domain not allowed")

// Важные индикаторы в логах браузера:
// ✅ "Parent origin: https://client.com" - parent_origin определён
// ✅ "WebSocket URL: wss://replyx.ru/ws/site/dialogs/123?site_token=eyJhbGci...(150 chars)&parent_origin=https%3A%2F%2Fclient.com" 
// ❌ "[WebSocket] Connection closed: code=4003, reason=Domain not allowed"
```

## Автоматические алерты

### 1. Grafana Alert (если используется)

```yaml
# Alert: High WebSocket 4003 Rate
expr: rate(ws_forbidden_domain_total{code="4003"}[5m]) > 0.1
for: 2m
labels:
  severity: warning
  component: websocket
annotations:
  summary: "High rate of WebSocket 4003 errors"
  description: "{{ $value }} WebSocket 4003 errors per second in last 5 minutes"
```

### 2. Simple log monitoring script

```bash
#!/bin/bash
# scripts/monitor_4003_errors.sh

LOG_FILE="/var/log/replyx/backend.log"
ALERT_THRESHOLD=10  # errors per minute
WEBHOOK_URL="https://hooks.slack.com/your/webhook"

# Count 4003 errors in last minute
COUNT=$(tail -n 1000 $LOG_FILE | grep -c "code=4003.*$(date -d '1 minute ago' '+%Y-%m-%d %H:%M')")

if [ "$COUNT" -gt "$ALERT_THRESHOLD" ]; then
    MESSAGE="🚨 WebSocket Alert: $COUNT 4003 errors in last minute"
    curl -X POST -H 'Content-type: application/json' \
         --data "{\"text\":\"$MESSAGE\"}" \
         $WEBHOOK_URL
fi
```

### 3. Простой Python monitor

```python
#!/usr/bin/env python3
# scripts/websocket_4003_monitor.py

import re
import time
import requests
from collections import defaultdict
from datetime import datetime, timedelta

class WebSocket4003Monitor:
    def __init__(self, log_file="/var/log/replyx/backend.log"):
        self.log_file = log_file
        self.error_counts = defaultdict(int)
        self.last_check = datetime.now() - timedelta(minutes=5)
    
    def check_4003_errors(self):
        """Проверяет новые 4003 ошибки"""
        pattern = r'Forbidden domain: origin=([^,]+).*parent_origin=([^,]+).*for site_token'
        current_time = datetime.now()
        
        with open(self.log_file, 'r') as f:
            for line in f:
                if '4003' in line and 'Forbidden domain' in line:
                    match = re.search(pattern, line)
                    if match:
                        origin, parent = match.groups()
                        self.error_counts[f"{origin}->{parent}"] += 1
        
        self.last_check = current_time
        return self.error_counts
    
    def send_alert_if_needed(self, threshold=5):
        """Отправляет алерт при превышении порога"""
        errors = self.check_4003_errors()
        
        for domain_pair, count in errors.items():
            if count > threshold:
                self.send_alert(f"🚨 {count} WebSocket 4003 errors for {domain_pair}")
    
    def send_alert(self, message):
        """Отправляет алерт (заглушка)"""
        print(f"[{datetime.now()}] ALERT: {message}")
        # Здесь можно добавить отправку в Slack/email/etc

if __name__ == "__main__":
    monitor = WebSocket4003Monitor()
    while True:
        monitor.send_alert_if_needed()
        time.sleep(60)  # Проверка каждую минуту
```

## Troubleshooting Playbook

### При росте 4003 ошибок:

1. **Проверить новые домены**:
   ```bash
   grep "Forbidden domain" /var/log/replyx/backend.log | \
     grep "$(date '+%Y-%m-%d')" | \
     grep -o "origin=[^,]*" | sort | uniq -c
   ```

2. **Проверить iframe logic**:
   ```bash
   grep "Iframe scenario" /var/log/replyx/backend.log | tail -10
   ```

3. **Проверить конфиг trusted hosts**:
   ```bash
   echo $WS_TRUSTED_IFRAME_HOSTS
   ```

4. **Проверить frontend передаёт parent_origin**:
   - Открыть browser dev tools
   - Найти сообщение `[ReplyX iframe] Parent origin: ...`
   - Проверить что WebSocket URL содержит `&parent_origin=...`

### Частые причины 4003:

- ❌ **Новый клиентский домен**: добавить в `allowed_domains` токена
- ❌ **Неправильный WS_TRUSTED_IFRAME_HOSTS**: добавить новый iframe хост  
- ❌ **Регрессия frontend**: проверить что передаётся parent_origin
- ❌ **Сетевые проблемы**: iframe не может прочитать parent origin

## Dashboard метрики

Если используется Prometheus/Grafana:

```python
# В websocket_manager.py добавить метрики:
from prometheus_client import Counter, Histogram

ws_connections_total = Counter('ws_connections_total', 'Total WS connections', ['type', 'result'])
ws_close_codes = Counter('ws_close_codes_total', 'WS close codes', ['code', 'reason'])

# При успешном подключении:
ws_connections_total.labels(type='iframe', result='success').inc()

# При 4003:
ws_close_codes.labels(code='4003', reason='domain_not_allowed').inc()
```