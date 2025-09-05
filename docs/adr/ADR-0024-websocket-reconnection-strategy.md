# ADR-024: WebSocket Reconnection Strategy

## Status
Accepted

## Date
2025-09-05

## Context

В последних коммитах были внесены критические изменения в стратегию переподключения WebSocket для виджетов, особенно в файлах:
- `frontend/pages/chat-iframe.js`
- `frontend/public/widget.js`

### Проблемы старой реализации:
1. **Грубые перезагрузки**: `location.reload()` при разрыве соединения приводил к полной перезагрузке iframe
2. **Потеря состояния**: сообщения и контекст диалога терялись при переподключении
3. **Плохой UX**: пользователь видел мигание и прерывание работы
4. **Отсутствие backoff**: мгновенные повторные подключения создавали нагрузку

### Новые требования:
- Мягкое переподключение без перерендеринга
- Сохранение состояния диалога и сообщений
- Экспоненциальный backoff для повторных попыток
- Информирование пользователя о статусе соединения

## Decision

Принята **стратегия "мягкого переподключения"** с следующими компонентами:

### 1. State-based Reconnection
```javascript
// Вместо location.reload() используем state trigger
const [wsReconnectNonce, setWsReconnectNonce] = useState(0);

// Триггер переподключения без перерендера
setTimeout(() => {
  setWsReconnectNonce((n) => n + 1);
}, delay);
```

### 2. Exponential Backoff Pattern
```javascript
const maxReconnectAttempts = 5;
let reconnectAttempts = useRef(0);

const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
```

### 3. Connection State Management
- **reconnectAttempts.current**: счетчик попыток
- **maxReconnectAttempts**: лимит попыток (5)
- **wsReconnectNonce**: state-триггер для переподключения
- **debugInfo**: информативные сообщения для пользователя

### 4. Graceful Degradation
- При превышении лимита попыток показываем ошибку
- Сохраняем все сообщения в локальном state
- Предлагаем manual retry через UI

## Implementation Details

### WebSocket Event Handler
```javascript
socket.onclose = (event) => {
  setIsOnline(false);
  setWs(null);

  // Переподключение при ошибках (кроме намеренного закрытия)
  if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    
    setDebugInfo(`🔄 Переподключение через ${Math.round(delay/1000)}с (попытка ${reconnectAttempts.current}/${maxReconnectAttempts})`);
    
    // Триггер для повторного подключения без перезагрузки iframe
    setTimeout(() => {
      setWsReconnectNonce((n) => n + 1);
    }, delay);
  } else if (reconnectAttempts.current >= maxReconnectAttempts) {
    setDebugInfo(`❌ Максимум попыток переподключения достигнут`);
  }
};
```

### Connection Reset on Success
```javascript
socket.onopen = () => {
  setIsOnline(true);
  reconnectAttempts.current = 0; // Сброс счётчика при успешном подключении
  setDebugInfo(`✅ Чат готов к работе!`);
};
```

### Dependency Injection
```javascript
useEffect(() => {
  // WebSocket logic here
}, [dialogId, siteToken, assistantId, guestId, wsReconnectNonce]); // wsReconnectNonce dependency
```

## Configuration Parameters

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| `maxReconnectAttempts` | 5 | Баланс между persistence и resource usage |
| `baseDelay` | 1000ms | Стартовая задержка для первой попытки |
| `maxDelay` | 10000ms | Максимальная задержка для предотвращения слишком долгих пауз |
| `backoffMultiplier` | 2 | Экспоненциальный рост: 1s, 2s, 4s, 8s, 10s |

## Consequences

### Positive:
✅ **Улучшен UX**: нет перезагрузок iframe, плавная работа
✅ **Сохранение состояния**: сообщения и контекст диалога остаются
✅ **Снижена нагрузка**: backoff предотвращает spam переподключений
✅ **Информативность**: пользователь видит статус переподключения
✅ **Надежность**: автоматическое восстановление соединения

### Negative:
⚠️ **Сложность**: больше логики управления состоянием
⚠️ **Отладка**: сложнее диагностировать проблемы с соединением
⚠️ **Memory usage**: дополнительные ref и state

### Risks:
🔴 **Edge cases**: могут быть неучтенные сценарии разрыва соединения
🔴 **Testing complexity**: требуется тестирование различных network условий

## Monitoring

Для отслеживания эффективности новой стратегии:

### Metrics to Track:
- Частота WebSocket disconnection events
- Успешность автоматических переподключений
- Время до восстановления соединения
- User retention в chat после network issues

### Logging:
```javascript
// Логируем события для анализа
console.log(`[WebSocket] Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
console.log(`[WebSocket] Backoff delay: ${delay}ms`);
```

## Related ADRs

- ADR-002: Repository Structure Reorganization (frontend organization)
- ADR-023: Database Optimization (potential WebSocket scaling considerations)

## Future Considerations

1. **WebSocket Pool**: можем рассмотреть пулинг соединений
2. **Service Worker**: offline capability для critical messages
3. **Analytics Integration**: детальная телеметрия reconnection success rate
4. **A/B Testing**: сравнение эффективности разных backoff strategies