# Manual Verification Checklist для WebSocket iframe фиксов

## Перед деплоем в production

### 🔧 Конфигурация окружения

- [ ] **WS_TRUSTED_IFRAME_HOSTS** задан правильно:
  ```bash
  # Production
  WS_TRUSTED_IFRAME_HOSTS="replyx.ru,www.replyx.ru"
  
  # Development (для тестирования)
  WS_TRUSTED_IFRAME_HOSTS="replyx.ru,www.replyx.ru,localhost:3000"
  ```

- [ ] **WS_REQUIRE_TOKEN_SIGNATURE** включен в production:
  ```bash
  WS_REQUIRE_TOKEN_SIGNATURE=true
  ```

- [ ] **SECRET_KEY** настроен и безопасен (для JWT валидации)

### 🧪 Тестирование

#### Автоматические тесты
- [ ] Запустить regression тесты:
  ```bash
  cd backend
  python -m pytest tests/test_iframe_domain_validation.py -v
  ```
  Ожидаемый результат: **все тесты проходят** (✅ позитивные iframe сценарии, ❌ негативные заблокированы)

- [ ] Запустить критические WebSocket тесты:
  ```bash
  python -m pytest tests/test_websocket_critical_fixes.py -v
  ```

#### Ручная проверка stencom.ru сценария

1. **Создать тестовый токен для stencom.ru**:
   ```bash
   # В backend консоли или через API
   # Токен должен содержать: "allowed_domains": "stencom.ru"
   ```

2. **Встроить widget на тестовую страницу stencom.ru**:
   ```html
   <!-- Тестовая страница на stencom.ru -->
   <iframe src="https://replyx.ru/widget/chat?site_token=ВАШЕ_ТОКЕН&assistant_id=3" 
           width="400" height="600"></iframe>
   ```

3. **Проверить WebSocket подключение**:
   - Открыть browser dev tools → Network → WS
   - Найти WebSocket connection к `wss://replyx.ru/ws/site/dialogs/...`
   - **✅ Ожидается**: Connection successful (101 Switching Protocols)
   - **❌ НЕ должно быть**: Close code 4003

4. **Проверить логи backend**:
   ```bash
   # В production логах должны быть записи:
   grep "Iframe scenario" /var/log/replyx/backend.log | tail -5
   
   # Ожидаемый формат:
   # [Domain] Iframe scenario: origin=https://replyx.ru (trusted), validating parent_origin=https://stencom.ru -> stencom.ru
   ```

#### Проверка безопасности (негативные тесты)

1. **Неавторизованный домен**:
   - Встроить widget на evil.com с токеном stencom.ru
   - **Ожидается**: WebSocket close code 4003

2. **Отсутствие parent_origin**:
   - Прямое обращение к `https://replyx.ru/widget/chat?site_token=...`
   - **Ожидается**: WebSocket close code 4003

3. **Неправильный parent_origin**:
   - Манипулировать query параметром `&parent_origin=evil.com`
   - **Ожидается**: WebSocket close code 4003

### 📊 Мониторинг настроен

- [ ] **Логи содержат нужные события**:
  ```bash
  # Поиск в логах 4003 ошибок:
  grep "WEBSOCKET_4003_ERROR" /var/log/replyx/backend.log
  
  # Успешные iframe подключения:
  grep "Iframe scenario.*validating parent_origin" /var/log/replyx/backend.log
  ```

- [ ] **Алерты настроены** (если используется мониторинг):
  - Слэк/email уведомления при росте 4003 ошибок
  - Dashboard показывает WebSocket connection success rate

### 🚀 Production Deployment Steps

1. **Обновить переменные окружения**:
   ```bash
   # На production сервере
   export WS_TRUSTED_IFRAME_HOSTS="replyx.ru,www.replyx.ru"
   export WS_REQUIRE_TOKEN_SIGNATURE=true
   ```

2. **Деплой кода**:
   - Backend: обновить `websocket_manager.py`, `app_config.py`
   - Frontend: обновить `chat-iframe.js` с parent_origin логикой

3. **Проверить после деплоя**:
   - [ ] Health check WebSocket endpoints доступны
   - [ ] Существующие клиенты продолжают работать
   - [ ] stencom.ru widget подключается без 4003

4. **Мониторинг первые 24 часа**:
   - [ ] Следить за количеством 4003 ошибок в логах
   - [ ] Проверить нет ли новых доменов с ошибками
   - [ ] Убедиться что существующие клиенты не затронуты

### 🆘 Rollback план

Если что-то пойдёт не так:

1. **Быстрый откат переменных**:
   ```bash
   # Временно разрешить все домены (ТОЛЬКО для экстренного случая)
   export WS_REQUIRE_TOKEN_SIGNATURE=false
   ```

2. **Откат кода**:
   - Вернуть старую версию `websocket_manager.py`
   - Перезапустить сервис

3. **Проверить восстановление**:
   - [ ] Существующие клиенты работают
   - [ ] Критические домены подключаются

### ✅ Готовность к production

Этот чеклист можно считать пройденным когда:
- ✅ Все автоматические тесты проходят
- ✅ stencom.ru iframe сценарий работает без 4003
- ✅ Негативные тесты правильно блокируют unauthorized домены
- ✅ Мониторинг показывает нормальные метрики
- ✅ Production конфигурация проверена
- ✅ Rollback план готов

**Критический индикатор успеха**: виджет на stencom.ru подключается к WebSocket **без кода 4003**.