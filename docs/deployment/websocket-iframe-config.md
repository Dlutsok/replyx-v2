# WebSocket iframe Configuration для Production

## Обязательные переменные окружения для production

```bash
# Доверенные iframe хосты (только наши домены в production)
WS_TRUSTED_IFRAME_HOSTS="replyx.ru,www.replyx.ru"

# Требовать валидную подпись JWT токена (рекомендуется для prod)
WS_REQUIRE_TOKEN_SIGNATURE=true

# Остальные WebSocket настройки
WS_RATE_LIMIT_PER_IP=100
WS_RATE_LIMIT_WINDOW=60
WS_MAX_CONNECTIONS_PER_DIALOG=10
```

## Development конфигурация

```bash  
# В dev можно добавить localhost для тестирования
WS_TRUSTED_IFRAME_HOSTS="replyx.ru,www.replyx.ru,localhost:3000,localhost:3001"

# В dev можно ослабить проверку подписи для тестирования
WS_REQUIRE_TOKEN_SIGNATURE=false
```

## Как работает iframe валидация

1. **WebSocket подключается из iframe** на доверенном хосте (например, replyx.ru)
2. **Frontend передаёт parent_origin** в query параметрах WebSocket URL
3. **Backend проверяет**:
   - `origin` входит в `WS_TRUSTED_IFRAME_HOSTS` ✅
   - `parent_origin` соответствует `allowed_domains` из JWT токена ✅
   - Если оба условия выполнены → разрешаем подключение

## Мониторинг

Следите за логами на предмет:
- `[Domain] Iframe scenario: origin=replyx.ru (trusted), validating parent_origin=stencom.ru` (нормально)
- `Forbidden domain: origin=replyx.ru, parent_origin=stencom.ru for site_token` (проблема)
- WebSocket close code `4003` в клиентских логах (проблема)

## Безопасность

- ✅ Токены не логируются полностью (только префикс + длина)
- ✅ Проверка подписи JWT токена в production 
- ✅ Ограничение доверенных iframe хостов только на наши домены
- ✅ Валидация parent_origin против allowed_domains из токена