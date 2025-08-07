/**
 * 📡 УТИЛИТЫ ДЛЯ МЕЖПРОЦЕССНОГО ВЗАИМОДЕЙСТВИЯ (IPC)
 * Обеспечивают надежную коммуникацию между мастер-процессом и воркерами
 */

class IPCManager {
    constructor() {
        this.messageHandlers = new Map();
        this.responseCallbacks = new Map();
        this.messageId = 0;
        
        this.setupProcessHandlers();
    }
    
    /**
     * Настройка обработчиков процесса
     */
    setupProcessHandlers() {
        process.on('message', (message) => {
            this.handleMessage(message);
        });
        
        process.on('disconnect', () => {
            console.log('🔌 IPC соединение разорвано');
            process.exit(0);
        });
    }
    
    /**
     * Обработка входящих сообщений
     */
    handleMessage(message) {
        const { type, messageId, data, error } = message;
        
        // Обработка ответов на запросы
        if (messageId && this.responseCallbacks.has(messageId)) {
            const callback = this.responseCallbacks.get(messageId);
            this.responseCallbacks.delete(messageId);
            
            if (error) {
                callback.reject(new Error(error));
            } else {
                callback.resolve(data);
            }
            return;
        }
        
        // Обработка обычных сообщений
        const handler = this.messageHandlers.get(type);
        if (handler) {
            try {
                const result = handler(data);
                
                // Если это запрос, отправляем ответ
                if (messageId) {
                    this.sendResponse(messageId, result);
                }
            } catch (error) {
                if (messageId) {
                    this.sendError(messageId, error.message);
                }
            }
        }
    }
    
    /**
     * Регистрация обработчика сообщений
     */
    on(type, handler) {
        this.messageHandlers.set(type, handler);
    }
    
    /**
     * Отправка сообщения
     */
    send(type, data) {
        if (process.send) {
            process.send({
                type: type,
                data: data,
                timestamp: Date.now(),
                pid: process.pid
            });
        }
    }
    
    /**
     * Отправка запроса с ожиданием ответа
     */
    request(type, data, timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (!process.send) {
                reject(new Error('IPC не доступен'));
                return;
            }
            
            const messageId = ++this.messageId;
            
            // Сохраняем callback
            this.responseCallbacks.set(messageId, { resolve, reject });
            
            // Таймаут
            setTimeout(() => {
                if (this.responseCallbacks.has(messageId)) {
                    this.responseCallbacks.delete(messageId);
                    reject(new Error(`IPC request timeout: ${type}`));
                }
            }, timeout);
            
            // Отправляем запрос
            process.send({
                type: type,
                messageId: messageId,
                data: data,
                timestamp: Date.now(),
                pid: process.pid
            });
        });
    }
    
    /**
     * Отправка ответа на запрос
     */
    sendResponse(messageId, data) {
        if (process.send) {
            process.send({
                type: 'response',
                messageId: messageId,
                data: data,
                timestamp: Date.now(),
                pid: process.pid
            });
        }
    }
    
    /**
     * Отправка ошибки в ответ на запрос
     */
    sendError(messageId, error) {
        if (process.send) {
            process.send({
                type: 'response',
                messageId: messageId,
                error: error,
                timestamp: Date.now(),
                pid: process.pid
            });
        }
    }
    
    /**
     * Отправка лога
     */
    log(level, message, meta = {}) {
        this.send('log', {
            level: level,
            message: message,
            meta: meta
        });
    }
    
    /**
     * Отправка метрик
     */
    metrics(metrics) {
        this.send('metrics', metrics);
    }
    
    /**
     * Отправка heartbeat
     */
    heartbeat(data = {}) {
        this.send('heartbeat', {
            timestamp: Date.now(),
            uptime: process.uptime() * 1000,
            memoryUsage: process.memoryUsage(),
            ...data
        });
    }
}

/**
 * Утилиты для форматирования IPC сообщений
 */
class IPCFormatter {
    /**
     * Форматирование команды
     */
    static command(command, data = {}) {
        return {
            type: 'command',
            command: command,
            data: data,
            timestamp: Date.now()
        };
    }
    
    /**
     * Форматирование события
     */
    static event(event, data = {}) {
        return {
            type: 'event',
            event: event,
            data: data,
            timestamp: Date.now()
        };
    }
    
    /**
     * Форматирование статуса
     */
    static status(status, data = {}) {
        return {
            type: 'status',
            status: status,
            data: data,
            timestamp: Date.now()
        };
    }
    
    /**
     * Форматирование ошибки
     */
    static error(error, context = {}) {
        return {
            type: 'error',
            error: {
                message: error.message || error,
                stack: error.stack,
                code: error.code
            },
            context: context,
            timestamp: Date.now()
        };
    }
}

/**
 * Менеджер очереди сообщений для надежной доставки
 */
class IPCQueue {
    constructor(maxSize = 1000) {
        this.queue = [];
        this.maxSize = maxSize;
        this.processing = false;
    }
    
    /**
     * Добавление сообщения в очередь
     */
    enqueue(message) {
        if (this.queue.length >= this.maxSize) {
            // Удаляем старые сообщения
            this.queue.shift();
        }
        
        this.queue.push({
            ...message,
            queuedAt: Date.now()
        });
        
        this.processQueue();
    }
    
    /**
     * Обработка очереди
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const message = this.queue.shift();
            
            try {
                if (process.send) {
                    process.send(message);
                }
                
                // Небольшая пауза между сообщениями
                await new Promise(resolve => setTimeout(resolve, 1));
                
            } catch (error) {
                console.error('❌ Ошибка отправки IPC сообщения:', error.message);
                
                // Возвращаем сообщение в очередь при ошибке
                this.queue.unshift(message);
                break;
            }
        }
        
        this.processing = false;
    }
    
    /**
     * Получение размера очереди
     */
    size() {
        return this.queue.length;
    }
    
    /**
     * Очистка очереди
     */
    clear() {
        this.queue = [];
    }
}

module.exports = {
    IPCManager,
    IPCFormatter,
    IPCQueue
}; 