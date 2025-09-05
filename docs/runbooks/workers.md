# Node.js Workers - Операционное руководство

## Обзор архитектуры

ChatAI использует масштабируемую архитектуру воркеров для управления Telegram ботами:

- **Master Process** (`master/scalable_bot_manager.js`) - управляющий процесс
- **Worker Processes** (`telegram/bot_worker.js`) - изолированные процессы ботов
- **Webhook Server** (`services/webhook_server.js`) - обработка webhook в продакшене
- **Configuration** (`config/webhook.js`) - конфигурация режимов работы

## Ключевые особенности

### ✅ Реализованные возможности
- **Изоляция процессов**: каждый бот работает в отдельном процессе
- **Graceful shutdown**: корректное завершение с сигналами SIGTERM/SIGINT
- **Дедупликация сообщений**: предотвращение обработки дублей
- **Rate limiting отключен**: прямая работа через node-telegram-bot-api
- **Hot reload**: обновление настроек без перезапуска воркера
- **Heartbeat мониторинг**: контроль состояния воркеров каждые 30 секунд
- **Zombie process cleanup**: очистка зависших процессов при запуске
- **Handoff система**: передача диалогов операторам
- **Двухрежимный запуск**: поддержка polling и webhook

### 🚧 Требует доработки
- **Idempotency**: отсутствует система предотвращения дублирования задач
- **Queue management**: нет формализованной системы очередей
- **Retry logic**: отсутствует экспоненциальный backoff
- **DLQ (Dead Letter Queue)**: нет обработки проблемных задач
- **Metrics collection**: базовая статистика без Prometheus метрик

## Конфигурация

### Environment Variables

```bash
# Режим работы
BOT_MODE=polling                    # или 'webhook' для продакшена
NODE_ENV=development               # или 'production'

# Webhook настройки (только для продакшена)
WEBHOOK_HOST=https://yourdomain.com
WEBHOOK_PORT=8443
WEBHOOK_SECRET=your-secret-token
WEBHOOK_SSL_CERT=/path/to/cert.pem
WEBHOOK_SSL_KEY=/path/to/private.key

# Telegram токены (управляются через API)
# Устанавливаются динамически через bot-instances API

# Автопереключение режимов
AUTO_SWITCH_MODE=true
```

### Package.json Scripts

```json
{
  "start": "node master/scalable_bot_manager.js start",
  "stop": "node master/scalable_bot_manager.js stop", 
  "restart": "node master/scalable_bot_manager.js restart",
  "status": "node master/scalable_bot_manager.js status",
  "logs": "node master/scalable_bot_manager.js logs"
}
```

## Управление процессами

### Запуск системы

```bash
cd workers/
npm start
```

Master процесс автоматически:
1. Очищает zombie процессы
2. Загружает конфигурации ботов из API
3. Запускает воркеры для активных ботов
4. Инициализирует webhook сервер (если webhook режим)

### Остановка системы

```bash
npm stop
# или
kill -TERM <master_pid>
```

Graceful shutdown sequence:
1. Прекращение приема новых задач
2. Завершение текущих операций (timeout 90s)
3. Закрытие IPC каналов
4. Принудительная сборка мусора
5. Выход с кодом 0

### Перезапуск

```bash
npm restart
# или
kill -USR2 <master_pid>  # Hot restart сигнал
```

### Мониторинг статуса

```bash
npm run status
```

## Лимиты и ограничения

### Resource Limits
- **Максимум воркеров**: 1000 (config.maxTotalWorkers)
- **Воркеров на ядро**: 20 (config.maxWorkersPerCore)  
- **Память на воркер**: 150MB (config.maxMemoryPerWorker)
- **Таймаут воркера**: 90s (config.workerTimeout)

### Process Management
- **Heartbeat интервал**: 45s (увеличен для стабильности)
- **Cooldown период**: 45s между перезапусками
- **Максимум перезапусков**: 5 в час на бот
- **Zombie cleanup**: при каждом старте master процесса

### Telegram API
- **Rate limiting**: отключен, работает через прямые вызовы
- **Дедупликация**: 30 секунд на уникальность сообщения
- **Очистка кеша**: каждые 5 минут, макс 10000 записей

## Наблюдаемость

### Логирование

**Throttled logging** - умное подавление повторяющихся ошибок:
- Подавление дублей на 30 секунд
- Сводка каждую минуту
- Детальная статистика подавленных

**Уровни логирования**:
- `info` - операционные события
- `warn` - предупреждения (дедупликация, 409 ошибки)
- `error` - критические ошибки

### Метрики воркера

Каждый воркер отслеживает:
```javascript
{
  messages: 0,        // Количество обработанных сообщений
  errors: 0,          // Количество ошибок
  restarts: 0,        // Количество перезапусков
  uptime: 0          // Время работы в миллисекундах
}
```

### Health Endpoints

```bash
# Master процесс статус
GET http://localhost:3001/api/workers/status

# Webhook статистика (если webhook режим)
GET http://localhost:8443/health
GET http://localhost:8443/webhook/stats
```

## Troubleshooting

### Частые проблемы

**409 Conflict ошибки**
- Причина: несколько экземпляров polling на один токен
- Решение: проверить zombie процессы, увеличить пауза между перезапусками

**Зависшие воркеры**  
- Признаки: отсутствие heartbeat > 5 минут
- Решение: автоматическое завершение и перезапуск

**Утечки памяти**
- Мониторинг: принудительная проверка каждые 5 минут
- Автодействие: перезапуск при превышении 150MB
- Очистка: принудительная сборка мусора при остановке

### Диагностические команды

```bash
# Просмотр активных процессов
ps aux | grep "bot_worker\|scalable_bot_manager"

# Проверка портов webhook
netstat -tlnp | grep 8443

# Мониторинг памяти воркеров
pgrep -f bot_worker | xargs -I {} sh -c 'echo "PID: {} MEM: $(ps -p {} -o rss --no-headers)KB"'

# Логи master процесса
tail -f workers/logs/master.log

# Логи конкретного воркера
tail -f workers/logs/worker_<botId>.log
```

## Безопасность

### Secrets Management
- **Токены ботов**: получаются через API, не хранятся в коде
- **Webhook secret**: устанавливается через ENV переменную
- **SSL сертификаты**: пути указываются в ENV

### Защита webhook
- Валидация Telegram IP (опциональная)
- Secret token проверка
- Rate limiting на уровне nginx/load balancer

### Логирование
- **НЕ логируются**: содержимое сообщений, персональные данные
- **Логируются**: только ключи диалогов, размеры, статусы

## Масштабирование

### Горизонтальное масштабирование
- Шардинг по botId через хеширование
- Sticky routing через load balancer
- Независимые экземпляры master процессов

### Vertical Scaling
- Увеличение `maxWorkersPerCore` до 25-30
- Увеличение `maxTotalWorkers` до 2000+
- Мониторинг метрик CPU/Memory

## CI/CD

### Тестирование
```bash
# Smoke test
node master/scalable_bot_manager.js --dry-run

# Unit тесты на критические функции
npm test

# E2E тест с изолированной средой
npm run test:e2e
```

### Deployment
1. Graceful shutdown текущих процессов
2. Обновление кода
3. Проверка конфигурации (--dry-run)
4. Запуск новых процессов
5. Верификация health endpoints

## Планы доработки

### Приоритет 1 - Устойчивость
- [ ] Реализовать idempotency keys для задач
- [ ] Добавить retry logic с экспоненциальным backoff
- [ ] Создать DLQ для проблемных задач
- [ ] Формализовать систему очередей

### Приоритет 2 - Наблюдаемость  
- [ ] Интеграция с Prometheus для метрик
- [ ] Создание Grafana дашбордов
- [ ] Алерты на критические события
- [ ] Трассировка запросов (correlation ID)

### Приоритет 3 - Производительность
- [ ] Оптимизация heartbeat интервалов
- [ ] Пулинг соединений к БД
- [ ] Кеширование конфигураций
- [ ] Batch обработка сообщений

## Контакты

При проблемах с workers системой:
1. Проверить health endpoints
2. Изучить логи в workers/logs/
3. Выполнить диагностические команды
4. Обратиться к команде разработки с подробной диагностикой
