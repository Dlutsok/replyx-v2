# Queue Management - Управление очередями задач

## Текущее состояние

### ❌ Отсутствие формальной системы очередей

В текущей реализации ChatAI Workers **НЕТ** централизованной системы очередей:

- Сообщения обрабатываются синхронно в `bot_worker.js`
- Отсутствует retry logic с exponential backoff
- Нет Dead Letter Queue (DLQ) для проблемных задач  
- Идемпотентность обеспечена только дедупликацией сообщений (30 секунд)
- Нет приоритизации задач

### ✅ Реализованные паттерны очередей

**Message Deduplication**
```javascript
// В bot_worker.js - дедупликация сообщений
isDuplicateMessage(msg) {
    const messageKey = `${msg.from.id}_${msg.message_id}_${msg.text}`;
    const now = Date.now();
    
    if (this.processedMessages.has(messageKey)) {
        const lastProcessed = this.processedMessages.get(messageKey);
        if (now - lastProcessed < 30000) { // 30 секунд
            return true; // Это дубликат
        }
    }
    
    this.processedMessages.set(messageKey, now);
    return false;
}
```

**IPC Message Queue**
```javascript
// Master -> Worker коммуникация через process.send()
process.on('message', async (message) => {
    const { command, data } = message;
    
    switch (command) {
        case 'start':
        case 'stop':  
        case 'hot_reload':
        case 'webhook_update':
        case 'send_operator_message':
        // Обработка команд без retry/DLQ
    }
});
```

## Рекомендуемая архитектура очередей

### Queue Types & Contracts

| Queue Name | Job Type | Payload Schema | Idempotency Key | Retries | DLQ | Priority |
|------------|----------|----------------|-----------------|---------|-----|----------|
| `tg:messages` | `message.send` | `{botId, chatId, text, userId, timestamp}` | `sha1(botId:chatId:text:timestamp)` | 5 | ✓ | Normal |
| `tg:operator` | `operator.send` | `{botId, chatId, text, operatorId, dialogId}` | `sha1(dialogId:operatorId:timestamp)` | 3 | ✓ | High |
| `tg:system` | `system.notify` | `{botId, chatId, type, data}` | `sha1(botId:chatId:type)` | 5 | ✓ | Low |
| `ai:responses` | `ai.process` | `{userId, message, assistantId, dialogId}` | `sha1(dialogId:message:timestamp)` | 3 | ✓ | High |
| `handoff:requests` | `handoff.request` | `{dialogId, reason, userId, timestamp}` | `dialogId:handoff` | 5 | ✓ | Critical |
| `webhooks:updates` | `webhook.process` | `{botId, update, timestamp}` | `sha1(botId:update.update_id)` | 3 | ✓ | High |

### Job Schema

```json
{
  "id": "uuid-v4",
  "type": "message.send",
  "queue": "tg:messages", 
  "idempotencyKey": "sha1:bot123:chat456:hello:1693847234",
  "priority": 5,
  "payload": {
    "botId": "bot_123",
    "chatId": 456789,
    "text": "Hello, world!",
    "userId": 123
  },
  "meta": {
    "attempt": 1,
    "maxAttempts": 5,
    "enqueueTime": "2023-09-04T15:20:34.123Z",
    "scheduleTime": "2023-09-04T15:20:34.123Z",
    "processingStartTime": null,
    "lastError": null
  },
  "backoff": {
    "type": "exponential",
    "baseDelayMs": 1000,
    "maxDelayMs": 30000,
    "jitterMs": 500
  }
}
```

## Implementation Roadmap

### Phase 1: Redis Queue Foundation

**Redis-based Queue Manager**
```javascript
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class QueueManager {
    constructor(redisUrl) {
        this.redis = Redis.createClient({ url: redisUrl });
        this.processors = new Map();
        this.running = false;
        
        // Метрики
        this.metrics = {
            jobsEnqueued: 0,
            jobsProcessed: 0, 
            jobsFailed: 0,
            jobsRetried: 0,
            dlqCount: 0
        };
    }
    
    async enqueue(queueName, jobType, payload, options = {}) {
        const job = this.createJob(jobType, payload, options);
        
        // Проверка идемпотентности
        if (await this.isDuplicate(job.idempotencyKey)) {
            console.log(`Job ${job.id} skipped - duplicate idempotency key`);
            return null;
        }
        
        // Сохранение идемпотентности
        await this.redis.setEx(
            `idempotency:${job.idempotencyKey}`, 
            3600, // TTL 1 час
            job.id
        );
        
        // Добавление в очередь с приоритетом
        const score = this.calculatePriority(job.priority, job.meta.scheduleTime);
        await this.redis.zAdd(`queue:${queueName}`, {
            score: score,
            value: JSON.stringify(job)
        });
        
        this.metrics.jobsEnqueued++;
        console.log(`Job ${job.id} enqueued to ${queueName}`);
        
        return job.id;
    }
    
    createJob(type, payload, options) {
        const now = new Date().toISOString();
        const idempotencyKey = options.idempotencyKey || 
            this.generateIdempotencyKey(type, payload);
            
        return {
            id: uuidv4(),
            type: type,
            queue: options.queue || 'default',
            idempotencyKey: idempotencyKey,
            priority: options.priority || 5,
            payload: payload,
            meta: {
                attempt: 0,
                maxAttempts: options.maxAttempts || 5,
                enqueueTime: now,
                scheduleTime: options.scheduleTime || now,
                processingStartTime: null,
                lastError: null
            },
            backoff: {
                type: 'exponential',
                baseDelayMs: options.baseDelayMs || 1000,
                maxDelayMs: options.maxDelayMs || 30000,
                jitterMs: options.jitterMs || 500
            }
        };
    }
    
    generateIdempotencyKey(type, payload) {
        const keyData = `${type}:${JSON.stringify(payload)}:${Date.now()}`;
        return crypto.createHash('sha1').update(keyData).digest('hex');
    }
}
```

### Phase 2: Worker Process Integration

**Модификация bot_worker.js**
```javascript
class BotWorker {
    constructor() {
        // Existing code...
        
        // 🔥 QUEUE INTEGRATION
        this.queueManager = new QueueManager(process.env.REDIS_URL);
        this.jobProcessors = new Map();
        
        this.setupJobProcessors();
        this.startJobProcessing();
    }
    
    setupJobProcessors() {
        // Обработчик отправки сообщений
        this.jobProcessors.set('message.send', async (job) => {
            const { botId, chatId, text } = job.payload;
            
            if (botId !== this.botId) {
                throw new Error(`Job for bot ${botId}, but worker is for bot ${this.botId}`);
            }
            
            await this.bot.sendMessage(chatId, text);
            console.log(`Message sent to chat ${chatId}`);
        });
        
        // Обработчик сообщений оператора
        this.jobProcessors.set('operator.send', async (job) => {
            const { chatId, text, dialogId } = job.payload;
            
            await this.bot.sendMessage(chatId, text);
            console.log(`Operator message sent to dialog ${dialogId}`);
        });
        
        // Обработчик handoff запросов
        this.jobProcessors.set('handoff.request', async (job) => {
            const { dialogId, reason, userId } = job.payload;
            
            await this.requestHandoff(dialogId, reason, `User ${userId} request`);
            console.log(`Handoff requested for dialog ${dialogId}`);
        });
    }
    
    async startJobProcessing() {
        const queueName = `tg:bot:${this.botId}`;
        
        while (this.running) {
            try {
                const job = await this.queueManager.dequeue(queueName);
                if (!job) {
                    await this.sleep(100);
                    continue;
                }
                
                await this.processJob(job);
                
            } catch (error) {
                console.error(`Job processing error:`, error);
                await this.sleep(1000);
            }
        }
    }
    
    async processJob(job) {
        const processor = this.jobProcessors.get(job.type);
        if (!processor) {
            throw new Error(`No processor for job type: ${job.type}`);
        }
        
        const startTime = Date.now();
        job.meta.processingStartTime = new Date().toISOString();
        job.meta.attempt++;
        
        try {
            await processor(job);
            
            // Успешная обработка
            await this.queueManager.ackJob(job);
            this.metrics.messages++;
            
            console.log(`Job ${job.id} processed successfully in ${Date.now() - startTime}ms`);
            
        } catch (error) {
            await this.handleJobError(job, error);
        }
    }
    
    async handleJobError(job, error) {
        job.meta.lastError = error.message;
        
        if (job.meta.attempt >= job.meta.maxAttempts) {
            // Отправляем в DLQ
            await this.queueManager.moveToDLQ(job, error);
            console.error(`Job ${job.id} moved to DLQ after ${job.meta.attempt} attempts`);
            
        } else {
            // Планируем retry с backoff
            const delayMs = this.calculateBackoffDelay(job);
            const scheduleTime = new Date(Date.now() + delayMs).toISOString();
            
            job.meta.scheduleTime = scheduleTime;
            
            await this.queueManager.scheduleRetry(job, delayMs);
            console.log(`Job ${job.id} scheduled for retry in ${delayMs}ms (attempt ${job.meta.attempt})`);
        }
    }
    
    calculateBackoffDelay(job) {
        const { baseDelayMs, maxDelayMs, jitterMs } = job.backoff;
        const attemptDelay = baseDelayMs * Math.pow(2, job.meta.attempt - 1);
        const cappedDelay = Math.min(attemptDelay, maxDelayMs);
        const jitter = Math.random() * jitterMs;
        
        return cappedDelay + jitter;
    }
}
```

### Phase 3: Queue Monitoring & Management

**Queue Metrics Dashboard**
```javascript
class QueueMetrics {
    constructor(queueManager) {
        this.qm = queueManager;
    }
    
    async getQueueStats(queueName) {
        const [pending, processing, failed, completed] = await Promise.all([
            this.qm.redis.zCard(`queue:${queueName}`),
            this.qm.redis.zCard(`queue:${queueName}:processing`), 
            this.qm.redis.zCard(`queue:${queueName}:failed`),
            this.qm.redis.get(`stats:${queueName}:completed`) || 0
        ]);
        
        return {
            pending,
            processing, 
            failed,
            completed: parseInt(completed),
            dlqSize: await this.qm.redis.lLen(`dlq:${queueName}`)
        };
    }
    
    async getSlowJobs(queueName, limit = 10) {
        const jobs = await this.qm.redis.zRevRange(
            `queue:${queueName}:slow`, 0, limit - 1, 'WITHSCORES'
        );
        
        return jobs.map(([jobData, duration]) => ({
            job: JSON.parse(jobData),
            durationMs: parseFloat(duration)
        }));
    }
}

// REST API для мониторинга
app.get('/api/queues/:queueName/stats', async (req, res) => {
    const stats = await queueMetrics.getQueueStats(req.params.queueName);
    res.json(stats);
});

app.get('/api/queues/:queueName/jobs/slow', async (req, res) => {
    const slowJobs = await queueMetrics.getSlowJobs(req.params.queueName);
    res.json(slowJobs);
});
```

## Environment Configuration

```bash
# Redis Queue Settings
REDIS_URL=redis://localhost:6379
REDIS_QUEUE_PREFIX=chatai:queue
REDIS_DLQ_PREFIX=chatai:dlq  
REDIS_IDEMPOTENCY_TTL=3600

# Queue Processing
QUEUE_WORKER_CONCURRENCY=10
QUEUE_MAX_JOB_ATTEMPTS=5
QUEUE_RETRY_BASE_DELAY=1000
QUEUE_RETRY_MAX_DELAY=30000
QUEUE_RETRY_JITTER=500

# Job Priorities
QUEUE_PRIORITY_CRITICAL=10
QUEUE_PRIORITY_HIGH=7
QUEUE_PRIORITY_NORMAL=5
QUEUE_PRIORITY_LOW=3

# Monitoring
QUEUE_METRICS_ENABLED=true
QUEUE_SLOW_JOB_THRESHOLD=5000
QUEUE_DLQ_MAX_SIZE=10000
```

## Queue Operations Manual

### Adding Jobs Programmatically

```javascript
// Отправка сообщения через очередь
await queueManager.enqueue('tg:messages', 'message.send', {
    botId: 'bot_123',
    chatId: 456789,
    text: 'Hello from queue!',
    userId: 123
}, {
    priority: 7,
    maxAttempts: 3,
    idempotencyKey: 'manual:bot123:chat456:hello'
});

// Запрос handoff через очередь
await queueManager.enqueue('handoff:requests', 'handoff.request', {
    dialogId: 789,
    reason: 'user_request',
    userId: 123,
    timestamp: Date.now()
}, {
    priority: 10, // Critical priority
    maxAttempts: 5
});
```

### Queue Management CLI

```bash
# Мониторинг очередей
curl http://localhost:3001/api/queues/tg:messages/stats

# Просмотр DLQ
curl http://localhost:3001/api/queues/tg:messages/dlq

# Очистка очереди (emergency)
redis-cli DEL "chatai:queue:tg:messages"

# Перенос заданий из DLQ обратно в очередь
redis-cli LRANGE "chatai:dlq:tg:messages" 0 -1 | \
xargs -I {} redis-cli ZADD "chatai:queue:tg:messages" $(date +%s) '{}'
```

### Troubleshooting Queues

**Зависшие задания**
```javascript
// Обнаружение и очистка зависших заданий
async function cleanupStalledJobs(queueName, maxAge = 300000) {
    const cutoff = Date.now() - maxAge;
    const stalledJobs = await redis.zRangeByScore(
        `queue:${queueName}:processing`, 
        0, cutoff, 'WITHSCORES'
    );
    
    for (const [jobData, timestamp] of stalledJobs) {
        const job = JSON.parse(jobData);
        console.log(`Cleaning up stalled job: ${job.id}`);
        
        // Возвращаем в основную очередь для retry
        await redis.zRem(`queue:${queueName}:processing`, jobData);
        await queueManager.scheduleRetry(job, 0);
    }
}
```

**Переполнение DLQ**
```javascript
// Мониторинг размера DLQ
async function checkDLQSize(queueName) {
    const size = await redis.lLen(`dlq:${queueName}`);
    
    if (size > process.env.QUEUE_DLQ_MAX_SIZE) {
        console.error(`DLQ ${queueName} overflow: ${size} jobs`);
        
        // Уведомление администраторов
        await notifyAdmins(`DLQ overflow in ${queueName}: ${size} failed jobs`);
        
        // Архивирование старых заданий из DLQ
        await archiveOldDLQJobs(queueName);
    }
}
```

## Integration with Existing Workers

### Модификация master/scalable_bot_manager.js

```javascript
class ScalableBotManager {
    constructor() {
        // Existing code...
        
        // 🔥 QUEUE MANAGER INTEGRATION
        this.queueManager = new QueueManager(process.env.REDIS_URL);
        this.queueMetrics = new QueueMetrics(this.queueManager);
    }
    
    async startBotWorker(botId, botConfig) {
        // Existing code...
        
        // Создаем персональную очередь для бота
        const botQueue = `tg:bot:${botId}`;
        await this.queueManager.createQueue(botQueue);
        
        // Передаем конфигурацию очереди воркеру
        const workerData = {
            botId, 
            botConfig, 
            assistant,
            queueConfig: {
                name: botQueue,
                redisUrl: process.env.REDIS_URL,
                concurrency: process.env.QUEUE_WORKER_CONCURRENCY || 5
            }
        };
        
        // Existing worker spawn code...
    }
}
```

## Метрики и мониторинг

### Prometheus Metrics

```javascript
const prometheus = require('prom-client');

const queueMetrics = {
    jobsTotal: new prometheus.Counter({
        name: 'queue_jobs_total',
        help: 'Total number of jobs processed',
        labelNames: ['queue', 'type', 'status']
    }),
    
    jobDuration: new prometheus.Histogram({
        name: 'queue_job_duration_ms',
        help: 'Job processing duration',
        labelNames: ['queue', 'type'],
        buckets: [10, 50, 100, 500, 1000, 5000, 10000, 30000]
    }),
    
    queueDepth: new prometheus.Gauge({
        name: 'queue_depth',
        help: 'Number of jobs in queue',
        labelNames: ['queue']
    }),
    
    dlqSize: new prometheus.Gauge({
        name: 'queue_dlq_size', 
        help: 'Number of jobs in dead letter queue',
        labelNames: ['queue']
    })
};

// Обновление метрик
setInterval(async () => {
    const queues = ['tg:messages', 'ai:responses', 'handoff:requests'];
    
    for (const queue of queues) {
        const stats = await queueMetrics.getQueueStats(queue);
        
        queueMetrics.queueDepth.set({ queue }, stats.pending);
        queueMetrics.dlqSize.set({ queue }, stats.dlqSize);
    }
}, 30000);
```

### Grafana Dashboard Queries

```promql
# Глубина очередей
queue_depth

# Скорость обработки заданий  
rate(queue_jobs_total{status="completed"}[5m])

# Процент ошибок
rate(queue_jobs_total{status="failed"}[5m]) / rate(queue_jobs_total[5m]) * 100

# Медленные задания (p95)
histogram_quantile(0.95, rate(queue_job_duration_ms_bucket[5m]))

# Размер DLQ
queue_dlq_size > 0
```

## Production Deployment

### Docker Integration

```dockerfile
# workers/Dockerfile
FROM node:18-alpine

# Install Redis CLI for debugging
RUN apk add --no-cache redis

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

# Health check включает проверку очередей
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js

CMD ["npm", "start"]
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: queue-config
data:
  REDIS_URL: "redis://redis-service:6379"
  QUEUE_WORKER_CONCURRENCY: "10"
  QUEUE_MAX_JOB_ATTEMPTS: "5" 
  QUEUE_DLQ_MAX_SIZE: "10000"
  QUEUE_METRICS_ENABLED: "true"
```

Этот документ предоставляет полное руководство по внедрению системы очередей в ChatAI Workers с сохранением существующей архитектуры и функциональности.