/**
 * 🌐 WEBHOOK СЕРВЕР ДЛЯ TELEGRAM БОТОВ
 * Высокопроизводительный сервер для обработки webhook в продакшене
 */

const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const webhookConfig = require('../config/webhook');

class WebhookServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.activeBotsMap = new Map(); // botId -> worker процесс
        this.requestCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
        
        this.setupMiddleware();
        this.setupRoutes();
        
        console.log('🌐 Webhook сервер инициализирован');
    }
    
    /**
     * Настройка middleware
     */
    setupMiddleware() {
        // Парсинг JSON с лимитом
        this.app.use(express.json({ limit: '1mb' }));
        
        // Логирование запросов
        this.app.use((req, res, next) => {
            this.requestCount++;
            console.log(`📨 Webhook запрос: ${req.method} ${req.path} от ${req.ip}`);
            next();
        });
        
        // Валидация Telegram IP (опционально)
        if (process.env.VALIDATE_TELEGRAM_IP === 'true') {
            this.app.use((req, res, next) => {
                if (!this.isValidTelegramIP(req.ip)) {
                    console.warn(`⚠️ Подозрительный IP: ${req.ip}`);
                    return res.status(403).send('Forbidden');
                }
                next();
            });
        }
        
        // Валидация секретного токена
        if (webhookConfig.config.WEBHOOK.SECRET_TOKEN) {
            this.app.use('/webhook', (req, res, next) => {
                const signature = req.headers['x-telegram-bot-api-secret-token'];
                if (signature !== webhookConfig.config.WEBHOOK.SECRET_TOKEN) {
                    console.warn(`⚠️ Неверный секретный токен от ${req.ip}`);
                    return res.status(403).send('Forbidden');
                }
                next();
            });
        }
    }
    
    /**
     * Настройка маршрутов
     */
    setupRoutes() {
        // Основной webhook endpoint для каждого бота
        this.app.post('/webhook/:botId', async (req, res) => {
            try {
                const botId = parseInt(req.params.botId);
                const update = req.body;
                
                if (!botId || !update) {
                    return res.status(400).send('Bad Request');
                }
                
                // Обработка обновления
                await this.handleUpdate(botId, update);
                
                // Telegram ожидает статус 200
                res.status(200).send('OK');
                
            } catch (error) {
                this.errorCount++;
                console.error(`❌ Ошибка обработки webhook для бота ${req.params.botId}:`, error.message);
                res.status(500).send('Internal Server Error');
            }
        });
        
        // Health check
        this.app.get('/health', (req, res) => {
            const uptime = Date.now() - this.startTime;
            res.json({
                status: 'ok',
                uptime: uptime,
                requests: this.requestCount,
                errors: this.errorCount,
                activeBots: this.activeBotsMap.size,
                mode: 'webhook'
            });
        });
        
        // Статистика webhook
        this.app.get('/webhook/stats', (req, res) => {
            res.json({
                totalRequests: this.requestCount,
                totalErrors: this.errorCount,
                activeBots: Array.from(this.activeBotsMap.keys()),
                uptime: Date.now() - this.startTime,
                errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) + '%' : '0%'
            });
        });
        
        // Fallback для неизвестных маршрутов
        this.app.use('*', (req, res) => {
            res.status(404).send('Not Found');
        });
    }
    
    /**
     * Обработка Telegram обновления
     */
    async handleUpdate(botId, update) {
        try {
            // Проверяем, что у нас есть активный воркер для этого бота
            if (!this.activeBotsMap.has(botId)) {
                console.warn(`⚠️ Получено обновление для неактивного бота ${botId}`);
                return;
            }
            
            const worker = this.activeBotsMap.get(botId);
            
            // Отправляем обновление воркеру через IPC
            worker.send({
                command: 'webhook_update',
                data: {
                    botId: botId,
                    update: update
                }
            });
            
            console.log(`📨 Обновление отправлено воркеру бота ${botId}: ${update.message?.text || update.callback_query?.data || 'другое'}`);
            
        } catch (error) {
            console.error(`❌ Ошибка отправки обновления воркеру бота ${botId}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Регистрация активного бота
     */
    registerBot(botId, worker) {
        this.activeBotsMap.set(botId, worker);
        console.log(`✅ Бот ${botId} зарегистрирован в webhook сервере`);
    }
    
    /**
     * Отмена регистрации бота
     */
    unregisterBot(botId) {
        if (this.activeBotsMap.has(botId)) {
            this.activeBotsMap.delete(botId);
            console.log(`❌ Бот ${botId} удален из webhook сервера`);
        }
    }
    
    /**
     * Проверка валидности IP Telegram
     */
    isValidTelegramIP(ip) {
        // Упрощенная проверка - в продакшене нужна более точная
        const telegramRanges = webhookConfig.TELEGRAM_IPS;
        
        // Здесь должна быть реальная проверка IP диапазонов
        // Для примера возвращаем true
        return true;
    }
    
    /**
     * Запуск сервера
     */
    async start() {
        try {
            webhookConfig.validateConfig();
            
            const port = webhookConfig.config.WEBHOOK.PORT;
            
            // Создаем HTTPS сервер если есть сертификаты
            if (webhookConfig.config.WEBHOOK.SSL_CERT && webhookConfig.config.WEBHOOK.SSL_KEY) {
                const options = {
                    cert: fs.readFileSync(webhookConfig.config.WEBHOOK.SSL_CERT),
                    key: fs.readFileSync(webhookConfig.config.WEBHOOK.SSL_KEY)
                };
                
                this.server = https.createServer(options, this.app);
                console.log('🔒 Webhook сервер запускается в HTTPS режиме');
            } else {
                this.server = http.createServer(this.app);
                console.log('🌐 Webhook сервер запускается в HTTP режиме');
            }
            
            // Запускаем сервер
            this.server.listen(port, () => {
                console.log(`🚀 Webhook сервер запущен на порту ${port}`);
                console.log(`📡 Endpoint: ${webhookConfig.config.WEBHOOK.HOST}:${port}/webhook/{botId}`);
            });
            
            // Обработка ошибок
            this.server.on('error', (error) => {
                console.error('❌ Ошибка webhook сервера:', error.message);
            });
            
            // Graceful shutdown
            process.on('SIGTERM', () => this.stop());
            process.on('SIGINT', () => this.stop());
            
        } catch (error) {
            console.error('❌ Ошибка запуска webhook сервера:', error.message);
            throw error;
        }
    }
    
    /**
     * Остановка сервера
     */
    async stop() {
        if (this.server) {
            console.log('🔄 Остановка webhook сервера...');
            
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('✅ Webhook сервер остановлен');
                    resolve();
                });
            });
        }
    }
    
    /**
     * Получение статистики
     */
    getStats() {
        return {
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            activeBots: this.activeBotsMap.size,
            uptime: Date.now() - this.startTime,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100) : 0
        };
    }
}

module.exports = WebhookServer;