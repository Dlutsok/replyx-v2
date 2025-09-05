# Telegram API Limits - Политики и ограничения

## Официальные лимиты Telegram Bot API

### Message Sending Limits
- **Global Rate**: 30 сообщений/секунду для всех чатов
- **Per Chat Rate**: 1 сообщение/секунду в один чат
- **Burst Limits**: краткосрочные всплески до 20 сообщений в группе за минуту

### Bot API Limits
- **getUpdates (Polling)**: без ограничений на частоту запросов
- **setWebhook**: максимум 40 одновременных соединений
- **File Upload**: до 50MB на файл
- **Message Length**: до 4096 символов в сообщении

## Текущая реализация в ChatAI

### Rate Limiting Status: ОТКЛЮЧЕН

```javascript
// В bot_worker.js, строка 4
// Rate limiter для Telegram полностью отключен
```

**Обоснование отключения**:
- Прямая работа через `node-telegram-bot-api` без промежуточного слоя
- Библиотека имеет встроенную обработку 429 ошибок
- Снижение сложности и потенциальных блокировок

### Стратегии обработки ошибок

**409 Conflict (Multiple Polling)**
```javascript
// Обработка в polling_error handler
const is409Error = error.code === 'ETELEGRAM' && error.response?.statusCode === 409;
if (is409Error) {
    const botAge = Date.now() - this.startTime;
    if (botAge < 120000) { // Первые 2 минуты
        return; // Не логируем 409 для новых ботов
    }
}
```

**429 Too Many Requests**
- Обрабатывается автоматически библиотекой `node-telegram-bot-api`
- Автоматические ретраи с backoff
- Логирование только критических случаев

**502/503 Gateway Errors**
- Временные недоступности Telegram API
- Автоматические ретраи на уровне HTTP клиента
- Throttled логирование для предотвращения спама

## Рекомендации по внедрению Rate Limiting

### Приоритет 1: Basic Rate Limiter

```javascript
// Предлагаемая реализация с rate-limiter-flexible
const { RateLimiterMemory } = require("rate-limiter-flexible");

// Per-bot лимит: 30 запросов/сек (глобальный лимит Telegram)
const limiterBot = new RateLimiterMemory({ 
    points: 30, 
    duration: 1,
    blockDuration: 1 
});

// Per-chat лимит: 1 сообщение/сек
const limiterChat = new RateLimiterMemory({ 
    points: 1, 
    duration: 1,
    blockDuration: 1 
});

async function sendMessage(botId, chatId, text) {
    // Проверяем лимиты перед отправкой
    await limiterBot.consume(botId);
    await limiterChat.consume(`${botId}:${chatId}`);
    
    return await bot.sendMessage(chatId, text);
}
```

### Приоритет 2: Queue-based Approach

```javascript
// Очередь для пакетной обработки сообщений
class MessageQueue {
    constructor(botId) {
        this.botId = botId;
        this.queue = [];
        this.processing = false;
        this.rateLimiter = new RateLimiterMemory({ points: 30, duration: 1 });
    }
    
    async enqueue(chatId, text, options = {}) {
        const messageJob = {
            id: this.generateId(),
            chatId,
            text,
            options,
            attempts: 0,
            createdAt: Date.now()
        };
        
        this.queue.push(messageJob);
        this.processQueue();
    }
    
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            
            try {
                await this.rateLimiter.consume(this.botId);
                await this.bot.sendMessage(job.chatId, job.text, job.options);
                
                // Логируем успех
                this.logSuccess(job);
                
            } catch (error) {
                await this.handleError(job, error);
            }
        }
        
        this.processing = false;
    }
}
```

## Мониторинг лимитов

### Метрики для отслеживания

```javascript
const metrics = {
    // Rate limiting
    telegram_rate_limit_hits_total: 0,      // Количество срабатываний лимитов
    telegram_429_errors_total: 0,           // 429 ошибки от Telegram
    telegram_409_errors_total: 0,           // 409 конфликты (multiple polling)
    
    // Performance
    telegram_message_send_duration_ms: [],  // Задержки отправки сообщений
    telegram_queue_depth: 0,                // Размер очереди сообщений
    telegram_messages_sent_total: 0,        // Всего сообщений отправлено
    
    // Errors
    telegram_send_errors_total: 0,          // Ошибки отправки
    telegram_timeout_errors_total: 0        // Таймауты
};
```

### Алерты

**Критические**:
- `telegram_rate_limit_hits_total` увеличивается > 10/мин
- `telegram_queue_depth` > 1000 сообщений
- `telegram_429_errors_total` > 5/мин

**Предупреждающие**:
- `telegram_message_send_duration_ms` p95 > 5000ms
- `telegram_409_errors_total` > 3/час для одного бота

## Environment Configuration

### Рекомендуемые ENV переменные

```bash
# Rate Limiting
TELEGRAM_RATE_GLOBAL_RPS=30          # Глобальный лимит запросов/сек
TELEGRAM_RATE_CHAT_RPS=1             # Лимит на чат
TELEGRAM_RATE_BURST_SIZE=5           # Размер burst для всплесков

# Queue Settings  
TELEGRAM_QUEUE_MAX_SIZE=10000        # Максимальный размер очереди
TELEGRAM_QUEUE_BATCH_SIZE=10         # Размер batch для обработки
TELEGRAM_QUEUE_PROCESSING_INTERVAL=100 # Интервал обработки очереди (ms)

# Error Handling
TELEGRAM_MAX_RETRIES=3               # Максимум ретраев для сообщения
TELEGRAM_RETRY_BASE_DELAY=1000       # Базовая задержка для ретраев (ms)
TELEGRAM_RETRY_MAX_DELAY=30000       # Максимальная задержка ретрая (ms)

# Monitoring
TELEGRAM_METRICS_ENABLED=true        # Включить сбор метрик
TELEGRAM_LOG_RATE_LIMITS=true        # Логировать срабатывания лимитов
```

## Стратегии для высоконагруженных систем

### 1. Sharding по chat_id

```javascript
// Распределение ботов по шардам для снижения нагрузки
function getShardForChat(chatId, totalShards) {
    return Math.abs(chatId.hashCode()) % totalShards;
}

class ShardedBotManager {
    constructor(totalShards) {
        this.shards = Array(totalShards).fill(null).map((_, i) => 
            new BotShard(i, totalShards)
        );
    }
    
    async sendMessage(chatId, text) {
        const shardIndex = getShardForChat(chatId, this.shards.length);
        return this.shards[shardIndex].sendMessage(chatId, text);
    }
}
```

### 2. Message Batching

```javascript
// Группировка сообщений для оптимизации
class MessageBatcher {
    constructor(batchSize = 10, flushInterval = 1000) {
        this.batch = [];
        this.batchSize = batchSize;
        this.flushTimer = setInterval(() => this.flush(), flushInterval);
    }
    
    add(chatId, text) {
        this.batch.push({ chatId, text, timestamp: Date.now() });
        
        if (this.batch.length >= this.batchSize) {
            this.flush();
        }
    }
    
    async flush() {
        if (this.batch.length === 0) return;
        
        const messages = this.batch.splice(0);
        await this.processBatch(messages);
    }
}
```

### 3. Circuit Breaker Pattern

```javascript
class TelegramCircuitBreaker {
    constructor(failureThreshold = 10, resetTimeout = 60000) {
        this.failureCount = 0;
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.lastFailureTime = null;
    }
    
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}
```

## Troubleshooting Common Issues

### 409 Conflict Resolution

**Проблема**: Несколько процессов пытаются получать обновления от одного бота

**Решение**:
1. Проверить процессы: `ps aux | grep bot_worker`
2. Завершить дублирующие процессы: `kill -9 <pid>`
3. Очистить webhook: `curl -X POST "https://api.telegram.org/bot<token>/deleteWebhook"`
4. Увеличить задержку между перезапусками в конфиге

### 429 Rate Limit Exceeded

**Проблема**: Превышение лимитов отправки сообщений

**Временное решение**:
1. Снизить частоту отправки в 2 раза
2. Включить логирование rate limit событий
3. Мониторить очереди сообщений

**Долгосрочное решение**:
1. Внедрить rate limiter с токеном bucket
2. Создать систему очередей с приоритетами
3. Настроить автомасштабирование ботов

### Memory Leaks in Rate Limiter

**Признаки**:
- Постоянный рост потребления памяти воркерами
- Замедление обработки сообщений со временем

**Диагностика**:
```javascript
// Мониторинг размера внутренних структур rate limiter
setInterval(() => {
    if (this.rateLimiter && this.rateLimiter._cache) {
        console.log(`Rate limiter cache size: ${this.rateLimiter._cache.size}`);
    }
}, 300000); // Каждые 5 минут
```

**Решение**:
- Настроить TTL для записей в rate limiter
- Периодическая очистка старых ключей
- Мониторинг размера кеша

## Implementation Roadmap

### Phase 1: Basic Rate Limiting (2-3 дня)
- [ ] Внедрить `rate-limiter-flexible` в `bot_worker.js`
- [ ] Настроить базовые лимиты (30 rps global, 1 rps per chat)
- [ ] Добавить метрики для rate limit events
- [ ] Тестирование на dev среде

### Phase 2: Queue System (1 неделя)  
- [ ] Создать `MessageQueue` класс
- [ ] Реализовать batch обработку
- [ ] Добавить retry logic с exponential backoff
- [ ] Внедрить DLQ для проблемных сообщений

### Phase 3: Advanced Features (1-2 недели)
- [ ] Circuit breaker для Telegram API
- [ ] Sharding по chat_id
- [ ] Prometheus метрики и Grafana дашборды
- [ ] Автоматическое масштабирование на основе очередей

### Phase 4: Production Optimization (1 неделя)
- [ ] Load testing с реальными лимитами
- [ ] Fine-tuning параметров rate limiting
- [ ] Документация для production deployment
- [ ] Мониторинг и алерты