const { fork } = require('child_process');
const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const WebhookServer = require('../services/webhook_server');
const webhookConfig = require('../config/webhook');

// Backend API URL configuration
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

/**
 * 🧠 МАСТЕР-ПРОЦЕСС ДЛЯ МАСШТАБИРУЕМОЙ МУЛЬТИБОТ-СИСТЕМЫ
 * Управляет 1000+ ботов через изолированные воркер-процессы
 */
class ScalableBotManager {
    constructor() {
        this.workers = new Map(); // botId -> worker process
        this.workerStats = new Map(); // botId -> статистика
        this.workerLogs = new Map(); // botId -> логи
        this.restartCounters = new Map(); // botId -> количество перезапусков
        this.lastRestartTimes = new Map(); // botId -> время последнего перезапуска
        
        // 🔥 БЛОКИРОВКА ДВОЙНОГО ЗАПУСКА
        this.startingBots = new Set(); // Боты в процессе запуска
        this.startLocks = new Map();   // Блокировки по времени
        
        // 🔥 ДЕТАЛЬНОЕ ОТСЛЕЖИВАНИЕ ПРОЦЕССОВ
        this.processTracker = new Map(); // botId -> { pids: Set, lastScan: timestamp, restartInProgress: boolean }
        this.restartQueue = new Map(); // botId -> restart request timestamp
        this.killingProcesses = new Set(); // PIDs в процессе завершения
        
        // Конфигурация
        this.config = {
            maxWorkersPerCore: 20, // Уменьшил с 25 для стабильности
            maxTotalWorkers: 1000, // Максимум воркеров всего
            workerTimeout: 90000, // Увеличил с 60с до 90с для стабильности
            heartbeatInterval: 45000, // Увеличил с 30с до 45с для снижения нагрузки
            logRetention: 500, // Уменьшил с 1000 для экономии памяти
            cooldownPeriod: 45000, // Увеличил с 30с до 45с
            maxWorkersPerBot: 1,
            staleWorkerTimeout: 300000, // 5 минут
            syncInterval: 90000, // Увеличил с 60с до 90с
            monitoringInterval: 45000, // Увеличил с 30с до 45с
            // 🔥 НОВЫЕ ПАРАМЕТРЫ ДЛЯ ОПТИМИЗАЦИИ
            maxMemoryPerWorker: 150 * 1024 * 1024, // 150MB на воркер
            memoryCheckInterval: 300000, // Проверка памяти каждые 5 минут
            autoGcInterval: 600000, // Принудительная сборка мусора каждые 10 минут
            maxRestartRate: 5, // Максимум 5 перезапусков в час
            emergencyStopThreshold: 0.95, // Остановка при 95% использования ресурсов
            // 🔥 ПАРАМЕТРЫ ОТСЛЕЖИВАНИЯ ПРОЦЕССОВ
            processCheckInterval: 60000, // Проверка процессов каждые 60 секунд (увеличено с 15с)
            maxKillWaitTime: 30000, // Максимальное время ожидания завершения процесса
            duplicateCheckDelay: 5000 // Задержка перед проверкой дублей
        };
        
        // Инициализация
        this.setupDirectories();
        
        // 🔥 ГЛОБАЛЬНАЯ ОЧИСТКА ЗОМБИ-ПРОЦЕССОВ ПРИ ЗАПУСКЕ
        this.cleanupZombieProcesses().then(() => {
            this.startAPI();
            this.startMonitoring();
            this.startProcessTracking(); // 🔥 ЗАПУСК ОТСЛЕЖИВАНИЯ ПРОЦЕССОВ
            
            console.log(`🧠 Мастер-процесс запущен (PID: ${process.pid})`);
            console.log(`📊 Максимум воркеров: ${this.config.maxTotalWorkers}`);
            console.log(`🚀 Scalable Bot Manager готов к управлению 1000+ ботов!`);
            
            // Загружаем боты при старте
            this.loadBotsFromDB();
        });
        
        // 🌐 WEBHOOK СЕРВЕР
        this.webhookServer = null;
        if (webhookConfig.isWebhookMode()) {
            this.webhookServer = new WebhookServer();
        }
        
        // Система мониторинга
        this.monitoring = {
            totalRestarts: 0,
            totalErrors: 0,
            emergencyStops: 0,
            lastEmergencyTime: 0
        };
        
        console.log(`🚀 Scalable Bot Manager инициализирован в режиме: ${webhookConfig.config.MODE.toUpperCase()}`);
    }
    
    /**
     * Создание необходимых директорий
     */
    setupDirectories() {
        const dirs = ['logs', 'config', 'tmp'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Загрузка ботов из БД
     */
    async loadBotsFromDB() {
        try {
            const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
            const botInstances = response.data;
            const activeBotIds = botInstances.filter(b => b.is_active).map(b => b.id);
            
            console.log(`📦 Загружено ${botInstances.length} конфигураций ботов`);
            
            // Очищаем записи о неактивных ботах
            await this.cleanupInactiveWorkers(activeBotIds);
            
            for (const botConfig of botInstances) {
                if (botConfig.is_active && !this.workers.has(botConfig.id)) {
                    await this.startBotWorker(botConfig.id, botConfig);
                } else if (!botConfig.is_active && this.workers.has(botConfig.id)) {
                    await this.stopBotWorker(botConfig.id);
                }
            }
            
            console.log(`🚀 Активных воркеров: ${this.workers.size}`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ботов из БД:', error.message);
        }
    }
    
    /**
     * Очистка записей о неактивных воркерах
     */
    async cleanupInactiveWorkers(activeBotIds) {
        const workersToCleanup = [];
        
        // Находим воркеров, которых нет в списке активных ботов
        for (const [botId, stats] of this.workerStats) {
            if (!activeBotIds.includes(parseInt(botId))) {
                workersToCleanup.push(botId);
            }
        }
        
        // Удаляем записи о неактивных воркерах
        for (const botId of workersToCleanup) {
            console.log(`🧹 Очистка записи о неактивном боте ${botId}`);
            
            // Останавливаем воркер если он еще работает
            if (this.workers.has(botId)) {
                await this.stopBotWorker(botId);
            }
            
            // Удаляем все записи
            this.workerStats.delete(botId);
            this.workerLogs.delete(botId);
            this.restartCounters.delete(botId);
            this.lastRestartTimes.delete(botId);
        }
        
        if (workersToCleanup.length > 0) {
            console.log(`✅ Очищено ${workersToCleanup.length} записей о неактивных ботах`);
        }
    }
    
    /**
     * Запуск воркера для бота
     */
    async startBotWorker(botId, botConfig) {
        try {
            // 🔥 ПРОВЕРКА БЛОКИРОВКИ ЗАПУСКА
            if (this.startingBots.has(botId)) {
                console.log(`⚠️ Бот ${botId} уже запускается - пропускаем дублирующий запуск`);
                return;
            }
            
            // Проверяем, не запущен ли уже воркер
            if (this.workers.has(botId)) {
                console.log(`⚠️ Воркер для бота ${botId} уже существует - пропускаем запуск`);
                return;
            }
            
            // 🔥 УСТАНАВЛИВАЕМ БЛОКИРОВКУ
            this.startingBots.add(botId);
            this.startLocks.set(botId, Date.now());
            
            console.log(`🔒 Блокировка запуска установлена для бота ${botId}`);
            
            // Проверка лимитов
            if (this.workers.size >= this.config.maxTotalWorkers) {
                throw new Error(`Достигнут лимит воркеров: ${this.config.maxTotalWorkers}`);
            }
            
            // Получаем ассистента
            const assistantResponse = await axios.get(`${BACKEND_API_URL}/api/bot-instances/${botId}/assistant`);
            const assistant = assistantResponse.data;
            
            if (!assistant) {
                throw new Error(`Ассистент не найден для бота ${botId}`);
            }
            
            console.log(`🚀 Запуск воркера для бота ${botId} (${assistant.name})`);
            
            // Создаем воркер-процесс с уникальной переменной окружения
            const workerPath = path.join(__dirname, '../telegram/bot_worker.js');
            const worker = fork(workerPath, [], {
                silent: false,
                env: { 
                    ...process.env, 
                    BOT_ID: botId,
                    BOT_WORKER_ID: `bot_${botId}_${Date.now()}` // Уникальный ID для поиска
                }
            });
            
            // Настройка обработчиков воркера
            this.setupWorkerHandlers(botId, worker);
            
            // Сохраняем воркера с дополнительной информацией для точного убийства
            this.workers.set(botId, worker);
            this.workerStats.set(botId, {
                startTime: Date.now(),
                pid: worker.pid,
                workerPid: worker.pid, // Дублируем для точного поиска
                restarts: this.restartCounters.get(botId) || 0,
                status: 'starting',
                assistantName: assistant.name,
                lastAssistantData: {
                    system_prompt: assistant.system_prompt,
                    ai_model: assistant.ai_model,
                    name: assistant.name,
                    assistant_id: botConfig.assistant_id,
                    bot_token: botConfig.bot_token
                }
            });
            
            // Отправляем команду запуска
            worker.send({
                command: 'start',
                data: { botId, botConfig, assistant }
            });
            
            console.log(`✅ Воркер для бота ${botId} запущен (PID: ${worker.pid})`);
            
            // 🔥 СНИМАЕМ БЛОКИРОВКУ ЧЕРЕЗ 10 СЕКУНД
            setTimeout(() => {
                this.startingBots.delete(botId);
                this.startLocks.delete(botId);
                console.log(`🔓 Блокировка запуска снята для бота ${botId}`);
            }, 10000);
            
        } catch (error) {
            console.error(`❌ Ошибка запуска воркера для бота ${botId}:`, error.message);
            
            // 🔥 СНИМАЕМ БЛОКИРОВКУ ПРИ ОШИБКЕ
            this.startingBots.delete(botId);
            this.startLocks.delete(botId);
        }
    }
    
    /**
     * Настройка обработчиков для воркера
     */
    setupWorkerHandlers(botId, worker) {
        // Обработчик сообщений от воркера
        worker.on('message', (message) => {
            this.handleWorkerMessage(botId, message);
        });
        
        // Обработчик выхода воркера
        worker.on('exit', (code, signal) => {
            console.log(`🔄 Воркер бота ${botId} завершился (код: ${code}, сигнал: ${signal})`);
            this.handleWorkerExit(botId, code, signal);
        });
        
        // Обработчик ошибок воркера
        worker.on('error', (error) => {
            console.error(`❌ Ошибка воркера бота ${botId}:`, error.message);
            this.logWorkerEvent(botId, 'error', `Worker error: ${error.message}`);
        });
    }
    
    /**
     * Обработка сообщений от воркера
     */
    handleWorkerMessage(botId, message) {
        const { type, data, requestType } = message;
        
        switch (type) {
            case 'started':
                this.updateWorkerStatus(botId, 'running');
                this.logWorkerEvent(botId, 'info', `Бот запущен (PID: ${data.pid})`);
                break;
                
            case 'stopped':
                this.updateWorkerStatus(botId, 'stopped');
                this.logWorkerEvent(botId, 'info', 'Бот остановлен');
                break;
                
            case 'heartbeat':
                this.updateWorkerStatus(botId, 'running', { lastHeartbeat: Date.now() });
                break;
                
            case 'log':
                if (data && data.level) {
                    this.logWorkerEvent(botId, data.level, data.message, data.meta);
                } else {
                    console.log(`⚠️ Некорректные данные лога от воркера ${botId}:`, message);
                }
                break;
                
            case 'error':
                this.logWorkerEvent(botId, 'error', data.message);
                break;
                
            case 'request':
                this.handleWorkerRequest(botId, requestType, data);
                break;
                
            case 'register_webhook':
                this.handleWebhookRegistration(botId, data);
                break;
                
            default:
                console.log(`📨 Сообщение от воркера ${botId}:`, message);
        }
    }
    
    /**
     * Обработка запросов от воркеров
     */
    async handleWorkerRequest(botId, requestType, data) {
        switch (requestType) {
            case 'ai_request':
                await this.handleAIRequest(botId, data);
                break;
            default:
                console.log(`❓ Неизвестный запрос от воркера ${botId}: ${requestType}`);
        }
    }
    
    /**
     * Обработка AI запроса
     */
    async handleAIRequest(botId, data) {
        try {
            // Здесь будет обработка AI запроса через существующую систему
            console.log(`🤖 AI запрос от бота ${botId}: "${data.text}"`);
            
            // Пока что заглушка
            const worker = this.workers.get(botId);
            if (worker) {
                worker.send({
                    command: 'ai_response',
                    data: {
                        chatId: data.chatId,
                        response: `Ответ от AI для: "${data.text}"`
                    }
                });
            }
            
        } catch (error) {
            console.error(`❌ Ошибка обработки AI запроса от бота ${botId}:`, error.message);
        }
    }
    
    /**
     * 🌐 ОБРАБОТКА РЕГИСТРАЦИИ WEBHOOK
     */
    handleWebhookRegistration(botId, data) {
        try {
            if (this.webhookServer && webhookConfig.isWebhookMode()) {
                const worker = this.workers.get(botId);
                if (worker) {
                    this.webhookServer.registerBot(botId, worker);
                    console.log(`🌐 Бот ${botId} зарегистрирован в webhook сервере`);
                } else {
                    console.warn(`⚠️ Попытка регистрации webhook для несуществующего воркера ${botId}`);
                }
            } else {
                console.warn(`⚠️ Получена регистрация webhook, но сервер не в webhook режиме`);
            }
        } catch (error) {
            console.error(`❌ Ошибка регистрации webhook для бота ${botId}:`, error.message);
        }
    }
    
    /**
     * Обработка выхода воркера
     */
    async handleWorkerExit(botId, code, signal) {
        this.workers.delete(botId);
        this.updateWorkerStatus(botId, 'crashed');
        
        // 🔥 СНИМАЕМ БЛОКИРОВКУ ЗАПУСКА ЕСЛИ БЫЛА
        this.startingBots.delete(botId);
        this.startLocks.delete(botId);
        
        // Автоматический перезапуск при неожиданном завершении
        if (code !== 0 && signal !== 'SIGTERM') {
            console.log(`🔄 Автоматический перезапуск воркера для бота ${botId}`);
            
            // 🔥 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА БЛОКИРОВКИ
            if (this.startingBots.has(botId)) {
                console.log(`⚠️ Бот ${botId} уже запускается - отменяем автоперезапуск`);
                return;
            }
            
            // Проверка cooldown
            const lastRestart = this.lastRestartTimes.get(botId);
            const now = Date.now();
            
            if (!lastRestart || (now - lastRestart) > this.config.cooldownPeriod) {
                this.lastRestartTimes.set(botId, now);
                
                // Увеличиваем счетчик перезапусков
                const restartCount = this.restartCounters.get(botId) || 0;
                this.restartCounters.set(botId, restartCount + 1);
                
                // Exponential backoff для частых перезапусков
                const delay = Math.min(60000, 5000 * Math.pow(2, Math.min(restartCount, 4)));
                
                setTimeout(async () => {
                    try {
                        // 🔥 ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ЗАПУСКОМ
                        if (this.startingBots.has(botId) || this.workers.has(botId)) {
                            console.log(`⚠️ Бот ${botId} уже запускается или запущен - отменяем отложенный перезапуск`);
                            return;
                        }
                        
                        const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
                        const botConfig = response.data.find(b => b.id === botId && b.is_active);
                        
                        if (botConfig) {
                            await this.startBotWorker(botId, botConfig);
                        }
                    } catch (error) {
                        console.error(`❌ Ошибка автоперезапуска бота ${botId}:`, error.message);
                    }
                }, delay);
                
                console.log(`⏱️ Перезапуск бота ${botId} через ${delay}ms (попытка ${restartCount + 1})`);
            } else {
                console.log(`❄️ Перезапуск бота ${botId} заблокирован cooldown`);
            }
        }
    }
    
    /**
     * Ультра-стабильная остановка воркера
     */
    async stopBotWorker(botId) {
        const worker = this.workers.get(botId);
        if (!worker) return;
        
        console.log(`⏹️ УЛЬТРА-СТАБИЛЬНАЯ остановка воркера для бота ${botId}`);
        
        try {
            // 1. Отмена регистрации webhook (если нужно)
            if (this.webhookServer && webhookConfig.isWebhookMode()) {
                this.webhookServer.unregisterBot(botId);
            }
            
            // 2. Отправляем команду ультра-стабильной остановки
            worker.send({ command: 'stop' });
            
            // 2. Ждем graceful shutdown с увеличенным тайм-аутом
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log(`💀 Принудительное завершение воркера бота ${botId} (тайм-аут 15 секунд)`);
                    
                    // Принудительное завершение с SIGTERM сначала
                    try {
                        worker.kill('SIGTERM');
                        
                        // Дополнительный тайм-аут для SIGTERM
                        setTimeout(() => {
                            if (!worker.killed) {
                                console.log(`💀 SIGKILL для воркера бота ${botId}`);
                                worker.kill('SIGKILL');
                            }
                        }, 3000);
                        
                    } catch (killError) {
                        console.log(`⚠️ Ошибка принудительного завершения воркера ${botId}: ${killError.message}`);
                    }
                    
                    resolve();
                }, 15000); // Увеличили тайм-аут до 15 секунд
                
                worker.on('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            
            // 3. Дополнительная проверка процессов
            await this.forceKillBotProcesses(botId);
            
        } catch (error) {
            console.error(`❌ Ошибка ультра-стабильной остановки воркера бота ${botId}:`, error.message);
            
            // Последняя попытка принудительного завершения
            try {
                worker.kill('SIGKILL');
                await this.forceKillBotProcesses(botId);
            } catch (killError) {
                console.log(`⚠️ Финальная ошибка завершения воркера ${botId}: ${killError.message}`);
            }
        }
        
        // 4. Полная очистка всех ресурсов и структур данных
        this.workers.delete(botId);
        this.updateWorkerStatus(botId, 'stopped');
        
        // 🔥 ПОЛНАЯ ОЧИСТКА ИЗ ВСЕХ СТРУКТУР ДАННЫХ
        this.workerStats.delete(botId);
        this.workerLogs.delete(botId);
        this.restartCounters.delete(botId);
        this.lastRestartTimes.delete(botId);
        this.startingBots.delete(botId);
        this.startLocks.delete(botId);
        this.processTracker.delete(botId);
        this.restartQueue.delete(botId);
        
        // Очистка из webhook сервера если есть
        if (this.webhookServer) {
            this.webhookServer.unregisterBot(botId);
        }
        
        console.log(`🧹 Полная очистка данных бота ${botId} из всех структур`);
        
        // Принудительная сборка мусора
        if (global.gc) {
            console.log(`🗑️ Принудительная сборка мусора после остановки воркера ${botId}`);
            global.gc();
        }
        
        // Дополнительная пауза для полного освобождения ресурсов
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`✅ Воркер бота ${botId} полностью остановлен и очищен из памяти`);
    }
    
    /**
     * ХИРУРГИЧЕСКИ ТОЧНОЕ завершение процессов конкретного бота
     */
    async forceKillBotProcesses(botId) {
        try {
            console.log(`🎯 ХИРУРГИЧЕСКИ ТОЧНЫЙ поиск процессов бота ${botId}`);
            
            // 1. Сначала пробуем убить по известному PID воркера
            const workerStats = this.workerStats.get(botId);
            const foundPids = new Set();
            
            if (workerStats && workerStats.workerPid) {
                console.log(`🎯 Найден известный PID воркера: ${workerStats.workerPid}`);
                foundPids.add(workerStats.workerPid);
            }
            
            // 2. 🔥 ТОЧНЫЙ ПОИСК ТОЛЬКО КОНКРЕТНОГО БОТА
            const { exec } = require('child_process');
            const commands = [
                `ps aux | grep "BOT_ID=${botId}" | grep -v grep`,
                `pgrep -f "BOT_ID=${botId}"`
            ];
            
            for (const command of commands) {
                try {
                    const { stdout } = await new Promise((resolve) => {
                        exec(command, (error, stdout, stderr) => {
                            resolve({ stdout: stdout || '' });
                        });
                    });
                    
                    const lines = stdout.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length > 1) {
                            const pid = parseInt(parts[1]);
                            if (pid && !isNaN(pid) && pid !== process.pid) {
                                // 🔥 ПРОВЕРЯЕМ ЧТО ЭТО ИМЕННО НАШ БОТ
                                if (line.includes(`BOT_ID=${botId}`) || line.includes('bot_worker.js')) {
                                    foundPids.add(pid);
                                    console.log(`🎯 Найден процесс бота ${botId}: PID ${pid}`);
                                }
                            }
                        }
                    }
                } catch (cmdError) {
                    // Игнорируем ошибки поиска
                }
            }
            
            // 3. Хирургическое убийство найденных процессов
            if (foundPids.size > 0) {
                console.log(`🎯 Найдено ${foundPids.size} процессов бота ${botId} для завершения: [${Array.from(foundPids).join(', ')}]`);
                
                for (const pid of foundPids) {
                    try {
                        // Проверяем, существует ли процесс
                        process.kill(pid, 0);
                        
                        // 🔥 СРАЗУ SIGKILL ТОЛЬКО ДЛЯ ЭТОГО БОТА
                        console.log(`🎯 SIGKILL для процесса ${pid} (бот ${botId})`);
                        process.kill(pid, 'SIGKILL');
                        
                        // Короткая пауза
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (killError) {
                        if (killError.code === 'ESRCH') {
                            console.log(`✅ Процесс ${pid} уже не существует`);
                        } else {
                            console.log(`⚠️ Ошибка завершения процесса ${pid}: ${killError.message}`);
                        }
                    }
                }
            } else {
                console.log(`✅ Дополнительные процессы для бота ${botId} не найдены`);
            }
            
            console.log(`🎯 Хирургическое завершение процессов бота ${botId} завершено`);
            
        } catch (error) {
            console.error(`❌ Ошибка хирургического завершения процессов бота ${botId}:`, error.message);
        }
    }
    
    /**
     * Ультра-стабильный перезапуск воркера с экспоненциальными задержками
     */
    async restartBotWorker(botId) {
        console.log(`🔄 УЛЬТРА-СТАБИЛЬНЫЙ перезапуск воркера для бота ${botId}`);
        
        // 🔥 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ НАЧАЛА ПЕРЕЗАПУСКА
        const restartStartTime = Date.now();
        const restartId = `restart_${botId}_${restartStartTime}`;
        
        console.log(`📋 [${restartId}] Начало перезапуска бота ${botId}`);
        console.log(`📋 [${restartId}] Текущее состояние:`);
        
        // Проверяем текущее состояние
        const currentWorker = this.workers.get(botId);
        if (currentWorker) {
            console.log(`📋 [${restartId}]   - Зарегистрированный PID: ${currentWorker.pid}`);
            console.log(`📋 [${restartId}]   - Worker killed: ${currentWorker.killed}`);
        } else {
            console.log(`📋 [${restartId}]   - Воркер НЕ зарегистрирован в мастере`);
        }
        
        // Проверяем процессы в системе
        const runningPids = await this.getBotProcesses(botId);
        console.log(`📋 [${restartId}]   - Процессы в системе: [${runningPids.join(', ')}]`);
        
        // 1. Получаем количество предыдущих перезапусков
        const restartCount = this.restartCounters.get(botId) || 0;
        const attempt = restartCount + 1;
        
        // 2. Вычисляем экспоненциальную задержку
        const baseDelay = 5000; // 5 секунд базовая задержка
        const maxDelay = 60000; // Максимум 60 секунд
        const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, Math.min(attempt - 1, 4)));
        
        console.log(`📋 [${restartId}] Перезапуск бота ${botId} через ${exponentialDelay}ms (попытка ${attempt})`);
        
        // 3. Ультра-стабильная остановка
        console.log(`📋 [${restartId}] Фаза 1: Остановка текущих процессов`);
        await this.stopBotWorker(botId);
        
        // 4. Дополнительная проверка и очистка
        console.log(`📋 [${restartId}] Фаза 2: Дополнительная очистка процессов`);
        const remainingPids = await this.getBotProcesses(botId);
        if (remainingPids.length > 0) {
            console.log(`📋 [${restartId}] ⚠️ Обнаружены оставшиеся процессы: [${remainingPids.join(', ')}]`);
            for (const pid of remainingPids) {
                await this.forceKillProcess(pid, `cleanup_${restartId}`);
            }
            
            // Дополнительная пауза после принудительной очистки
            console.log(`📋 [${restartId}] Дополнительная пауза 5 сек после очистки`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // 5. Экспоненциальная пауза перед перезапуском
        console.log(`📋 [${restartId}] Фаза 3: Пауза перед перезапуском (${exponentialDelay}ms)`);
        await new Promise(resolve => setTimeout(resolve, exponentialDelay));
        
        try {
            // 6. Получение конфигурации
            console.log(`📋 [${restartId}] Фаза 4: Получение конфигурации из БД`);
            const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
            const botConfig = response.data.find(b => b.id === botId && b.is_active);
            
            if (botConfig) {
                // 7. Ультра-стабильный запуск
                console.log(`📋 [${restartId}] Фаза 5: Запуск нового воркера`);
                await this.startBotWorker(botId, botConfig);
                
                // 8. Увеличиваем счетчик перезапусков
                this.restartCounters.set(botId, attempt);
                this.lastRestartTimes.set(botId, Date.now());
                
                // 9. Проверка успешности запуска
                setTimeout(async () => {
                    const newPids = await this.getBotProcesses(botId);
                    const newWorker = this.workers.get(botId);
                    
                    if (newWorker && newPids.length === 1 && newPids[0] === newWorker.pid) {
                        const restartDuration = Date.now() - restartStartTime;
                        console.log(`📋 [${restartId}] ✅ УСПЕШНЫЙ перезапуск за ${restartDuration}ms`);
                        console.log(`📋 [${restartId}]   - Новый PID: ${newWorker.pid}`);
                        console.log(`📋 [${restartId}]   - Процессов в системе: ${newPids.length}`);
                        
                        // 10. Сброс счетчика при успешном перезапуске после паузы
                        setTimeout(() => {
                            if (this.workers.has(botId)) {
                                console.log(`📋 [${restartId}] 🔄 Сброс счетчика перезапусков для стабильного бота ${botId}`);
                                this.restartCounters.set(botId, 0);
                            }
                        }, 300000); // 5 минут стабильной работы
                        
                    } else {
                        console.log(`📋 [${restartId}] ❌ НЕУСПЕШНЫЙ перезапуск:`);
                        console.log(`📋 [${restartId}]   - Worker registered: ${!!newWorker}`);
                        console.log(`📋 [${restartId}]   - Processes found: ${newPids.length}`);
                        console.log(`📋 [${restartId}]   - PIDs: [${newPids.join(', ')}]`);
                    }
                }, 10000); // Проверка через 10 секунд
                
                console.log(`📋 [${restartId}] ✅ Бот ${botId} успешно перезапущен (попытка ${attempt})`);
                
            } else {
                console.log(`📋 [${restartId}] ⚠️ Конфигурация бота ${botId} не найдена или бот неактивен`);
            }
        } catch (error) {
            console.error(`📋 [${restartId}] ❌ Ошибка ультра-стабильного перезапуска воркера бота ${botId}:`, error.message);
            
            // При ошибке также увеличиваем счетчик
            this.restartCounters.set(botId, attempt);
        }
    }
    
    /**
     * 🔍 ПОЛУЧЕНИЕ ВСЕХ ПРОЦЕССОВ КОНКРЕТНОГО БОТА
     */
    async getBotProcesses(botId) {
        try {
            const { exec } = require('child_process');
            const { stdout } = await new Promise((resolve) => {
                exec(`ps aux | grep "BOT_ID=${botId}" | grep -v grep`, (error, stdout) => {
                    resolve({ stdout: stdout || '' });
                });
            });
            
            const pids = [];
            const lines = stdout.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length > 1) {
                    const pid = parseInt(parts[1]);
                    if (pid && !isNaN(pid)) {
                        pids.push(pid);
                    }
                }
            }
            
            return pids;
        } catch (error) {
            console.error(`❌ Ошибка получения процессов для бота ${botId}:`, error.message);
            return [];
        }
    }
    
    /**
     * Обновление статуса воркера
     */
    updateWorkerStatus(botId, status, extra = {}) {
        const currentStats = this.workerStats.get(botId) || {};
        this.workerStats.set(botId, {
            ...currentStats,
            status: status,
            lastUpdate: Date.now(),
            ...extra
        });
    }
    
    /**
     * Логирование событий воркера
     */
    logWorkerEvent(botId, level, message, meta = {}) {
        const logEntry = {
            timestamp: Date.now(),
            level: level,
            message: message,
            meta: meta
        };
        
        if (!this.workerLogs.has(botId)) {
            this.workerLogs.set(botId, []);
        }
        
        const logs = this.workerLogs.get(botId);
        logs.push(logEntry);
        
        // Ограничиваем количество логов
        if (logs.length > this.config.logRetention) {
            logs.splice(0, logs.length - this.config.logRetention);
        }
        
        // Выводим в консоль
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${botId}] [${level.toUpperCase()}] ${message}`);
    }
    
    /**
     * Мониторинг воркеров
     */
    startMonitoring() {
        setInterval(() => {
            const activeWorkers = this.workers.size;
            const totalRestarts = Array.from(this.restartCounters.values()).reduce((a, b) => a + b, 0);
            
            console.log(`💓 Мониторинг: ${activeWorkers} активных воркеров, ${totalRestarts} перезапусков`);
            
            // Проверка зависших воркеров
            this.checkStaleWorkers();
            
        }, this.config.heartbeatInterval);
        
        // 🔥 МОНИТОРИНГ ПАМЯТИ ВОРКЕРОВ
        setInterval(() => {
            this.checkWorkerMemoryUsage();
        }, this.config.memoryCheckInterval);
        
        // 🔥 ПРИНУДИТЕЛЬНАЯ СБОРКА МУСОРА
        setInterval(() => {
            if (global.gc) {
                const memBefore = process.memoryUsage();
                global.gc();
                const memAfter = process.memoryUsage();
                console.log(`🗑️ Принудительная сборка мусора: освобождено ${Math.round((memBefore.heapUsed - memAfter.heapUsed) / 1024 / 1024)}MB`);
            }
        }, this.config.autoGcInterval);
        
        // Автоматическая синхронизация с БД (каждые 30 секунд)
        setInterval(async () => {
            await this.syncWithDatabase();
        }, 30000); // 30 секунд
        
        // Периодическая очистка неактивных воркеров (каждые 5 минут)
        setInterval(async () => {
            try {
                const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
                const activeBotIds = response.data.filter(b => b.is_active).map(b => b.id);
                await this.cleanupInactiveWorkers(activeBotIds);
            } catch (error) {
                console.error('❌ Ошибка автоматической очистки:', error.message);
            }
        }, 300000); // 5 минут
    }
    
    /**
     * 🔥 МОНИТОРИНГ ИСПОЛЬЗОВАНИЯ ПАМЯТИ ВОРКЕРАМИ
     */
    async checkWorkerMemoryUsage() {
        const memoryWarnings = [];
        const memoryErrors = [];
        
        for (const [botId, worker] of this.workers) {
            try {
                if (worker && !worker.killed) {
                    // Получаем использование памяти процессом
                    const { exec } = require('child_process');
                    const { stdout } = await new Promise((resolve) => {
                        exec(`ps -p ${worker.pid} -o rss=`, (error, stdout) => {
                            resolve({ stdout: stdout || '0' });
                        });
                    });
                    
                    const memoryKB = parseInt(stdout.trim()) || 0;
                    const memoryBytes = memoryKB * 1024;
                    
                    // Обновляем статистику
                    const stats = this.workerStats.get(botId);
                    if (stats) {
                        stats.memoryUsage = { rss: memoryBytes };
                    }
                    
                    // Проверяем лимиты
                    if (memoryBytes > this.config.maxMemoryPerWorker) {
                        const memoryMB = Math.round(memoryBytes / 1024 / 1024);
                        const limitMB = Math.round(this.config.maxMemoryPerWorker / 1024 / 1024);
                        
                        memoryErrors.push({
                            botId,
                            memoryMB,
                            limitMB
                        });
                        
                        console.log(`🚨 КРИТИЧЕСКОЕ использование памяти ботом ${botId}: ${memoryMB}MB (лимит: ${limitMB}MB)`);
                        
                        // Перезапускаем бота при превышении лимита
                        setTimeout(() => {
                            this.restartBotWorker(botId);
                        }, 5000);
                        
                    } else if (memoryBytes > this.config.maxMemoryPerWorker * 0.8) {
                        const memoryMB = Math.round(memoryBytes / 1024 / 1024);
                        memoryWarnings.push({ botId, memoryMB });
                    }
                }
            } catch (error) {
                // Игнорируем ошибки получения памяти для несуществующих процессов
            }
        }
        
        if (memoryWarnings.length > 0) {
            console.log(`⚠️ Предупреждения по памяти: ${memoryWarnings.length} воркеров`);
        }
        
        if (memoryErrors.length > 0) {
            console.log(`🚨 Критические превышения памяти: ${memoryErrors.length} воркеров будут перезапущены`);
        }
    }
    
    /**
     * Синхронизация с базой данных
     */
    async syncWithDatabase() {
        try {
            const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
            const botInstances = response.data;
            const activeBotIds = botInstances.filter(b => b.is_active).map(b => b.id);
            const currentWorkerIds = Array.from(this.workers.keys()).map(id => parseInt(id));
            
            // Находим ботов, которые нужно остановить (есть в воркерах, но нет в активных)
            const botsToStop = currentWorkerIds.filter(id => !activeBotIds.includes(id));
            
            // Находим ботов, которые нужно запустить (есть в активных, но нет в воркерах)
            const botsToStart = activeBotIds.filter(id => !currentWorkerIds.includes(id));
            
            // Проверяем изменения в существующих ботах
            const botsToRestart = [];
            for (const botInstance of botInstances.filter(b => b.is_active)) {
                if (this.workers.has(botInstance.id)) {
                    const needsRestart = await this.checkBotChanges(botInstance.id, botInstance);
                    if (needsRestart) {
                        botsToRestart.push(botInstance.id);
                    }
                }
            }
            
            // Останавливаем удаленные боты
            for (const botId of botsToStop) {
                console.log(`🛑 Обнаружено удаление бота ${botId} - останавливаем воркер`);
                await this.stopBotWorker(botId);
                
                // Полная очистка записей
                this.workerStats.delete(botId);
                this.workerLogs.delete(botId);
                this.restartCounters.delete(botId);
                this.lastRestartTimes.delete(botId);
                
                console.log(`✅ Бот ${botId} полностью удален из системы`);
            }
            
            // Перезапускаем измененные боты
            for (const botId of botsToRestart) {
                console.log(`🔄 Обнаружены изменения в боте ${botId} - перезагружаем`);
                await this.restartBotWorker(botId);
            }
            
            // Запускаем новые боты
            for (const botId of botsToStart) {
                // 🔥 ПРОВЕРКА БЛОКИРОВКИ ПЕРЕД ЗАПУСКОМ НОВОГО БОТА
                if (this.startingBots.has(botId) || this.workers.has(botId)) {
                    console.log(`⚠️ Бот ${botId} уже запускается или запущен - пропускаем запуск из синхронизации`);
                    continue;
                }
                
                const botConfig = botInstances.find(b => b.id === botId && b.is_active);
                if (botConfig) {
                    console.log(`🚀 Обнаружен новый бот ${botId} - запускаем воркер`);
                    await this.startBotWorker(botId, botConfig);
                }
            }
            
            if (botsToStop.length > 0 || botsToStart.length > 0 || botsToRestart.length > 0) {
                console.log(`🔄 Синхронизация завершена: остановлено ${botsToStop.length}, перезапущено ${botsToRestart.length}, запущено ${botsToStart.length}`);
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации с БД:', error.message);
        }
    }
    
    /**
     * Проверка изменений в боте (промпт, модель, имя, токен)
     */
    async checkBotChanges(botId, newBotConfig) {
        try {
            // Получаем текущие данные ассистента
            const assistantResponse = await axios.get(`${BACKEND_API_URL}/api/bot-instances/${botId}/assistant`);
            const newAssistant = assistantResponse.data;
            
            if (!newAssistant) {
                return false;
            }
            
            // Получаем сохраненные данные ассистента из статистики воркера
            const workerStats = this.workerStats.get(botId);
            if (!workerStats || !workerStats.lastAssistantData) {
                // Если нет сохраненных данных, сохраняем текущие и не перезапускаем
                this.workerStats.set(botId, {
                    ...workerStats,
                    lastAssistantData: {
                        system_prompt: newAssistant.system_prompt,
                        ai_model: newAssistant.ai_model,
                        name: newAssistant.name,
                        assistant_id: newBotConfig.assistant_id,
                        bot_token: newBotConfig.bot_token
                    }
                });
                return false;
            }
            
            const lastAssistant = workerStats.lastAssistantData;
            
            // 🔥 РАЗДЕЛЯЕМ КРИТИЧЕСКИЕ И НЕКРИТИЧЕСКИЕ ИЗМЕНЕНИЯ
            const criticalChanges = (
                lastAssistant.assistant_id !== newBotConfig.assistant_id ||
                lastAssistant.bot_token !== newBotConfig.bot_token
            );
            
            const hotReloadableChanges = (
                lastAssistant.system_prompt !== newAssistant.system_prompt ||
                lastAssistant.ai_model !== newAssistant.ai_model ||
                lastAssistant.name !== newAssistant.name
            );
            
            if (criticalChanges) {
                console.log(`🔄 КРИТИЧЕСКИЕ изменения в боте ${botId} - требуется полный перезапуск:`);
                if (lastAssistant.bot_token !== newBotConfig.bot_token) {
                    console.log(`  🔑 Токен изменен`);
                }
                if (lastAssistant.assistant_id !== newBotConfig.assistant_id) {
                    console.log(`  🆔 ID ассистента: ${lastAssistant.assistant_id} → ${newBotConfig.assistant_id}`);
                }
                
                // Обновляем сохраненные данные
                this.workerStats.set(botId, {
                    ...workerStats,
                    lastAssistantData: {
                        system_prompt: newAssistant.system_prompt,
                        ai_model: newAssistant.ai_model,
                        name: newAssistant.name,
                        assistant_id: newBotConfig.assistant_id,
                        bot_token: newBotConfig.bot_token
                    }
                });
                
                return true; // Требуется полный перезапуск
                
            } else if (hotReloadableChanges) {
                console.log(`🔥 ГОРЯЧИЕ изменения в боте ${botId} - применяем без перезапуска:`);
                if (lastAssistant.system_prompt !== newAssistant.system_prompt) {
                    console.log(`  📝 Промпт: "${lastAssistant.system_prompt?.substring(0, 50)}..." → "${newAssistant.system_prompt?.substring(0, 50)}..."`);
                }
                if (lastAssistant.ai_model !== newAssistant.ai_model) {
                    console.log(`  🤖 Модель: "${lastAssistant.ai_model}" → "${newAssistant.ai_model}"`);
                }
                if (lastAssistant.name !== newAssistant.name) {
                    console.log(`  🏷️  Имя: "${lastAssistant.name}" → "${newAssistant.name}"`);
                }
                
                // Применяем горячую перезагрузку
                const hotReloadSuccess = await this.hotReloadBotSettings(botId);
                
                if (hotReloadSuccess) {
                    console.log(`✅ Горячая перезагрузка применена для бота ${botId}`);
                    return false; // Не требуется полный перезапуск
                } else {
                    console.log(`⚠️ Горячая перезагрузка не удалась для бота ${botId}, требуется полный перезапуск`);
                    return true; // Fallback к полному перезапуску
                }
            }
            
            return false; // Нет изменений
            
        } catch (error) {
            console.error(`❌ Ошибка проверки изменений бота ${botId}:`, error.message);
            return false;
        }
    }
    
    /**
     * Проверка зависших воркеров
     */
    checkStaleWorkers() {
        const now = Date.now();
        const staleTimeout = this.config.heartbeatInterval * 3; // 3 пропущенных heartbeat
        
        // 🔥 ЗАЩИТА ОТ КАСКАДНЫХ СБОЕВ
        const failedWorkers = [];
        const recentRestarts = [];
        
        for (const [botId, stats] of this.workerStats) {
            if (stats.lastHeartbeat && (now - stats.lastHeartbeat) > staleTimeout) {
                failedWorkers.push(botId);
                console.log(`⚠️ Воркер бота ${botId} не отвечает, перезапускаем`);
                this.restartBotWorker(botId);
            }
            
            // Проверяем частоту перезапусков
            const restartTime = this.lastRestartTimes.get(botId);
            if (restartTime && (now - restartTime) < 3600000) { // За последний час
                recentRestarts.push(botId);
            }
        }
        
        // 🚨 АВАРИЙНАЯ ЗАЩИТА - ИСПРАВЛЕННАЯ ЛОГИКА
        const failureRate = this.workers.size > 0 ? failedWorkers.length / this.workers.size : 0;
        const restartCount = recentRestarts.length;
        const restartRate = this.workers.size > 0 ? restartCount / this.workers.size : 0;
        
        // 🔥 ИСПРАВЛЕНА ПРОБЛЕМА: проверяем минимальное количество ботов перед расчётом процентов
        if (failureRate > this.config.emergencyStopThreshold && this.workers.size >= 3) {
            console.log(`🚨 АВАРИЙНАЯ СИТУАЦИЯ: ${Math.round(failureRate * 100)}% из ${this.workers.size} воркеров не отвечают!`);
            this.triggerEmergencyProtocol('HIGH_FAILURE_RATE', { failureRate, failedCount: failedWorkers.length, totalWorkers: this.workers.size });
        }
        
        // 🔥 ИСПРАВЛЕНА КРИТИЧЕСКАЯ ОШИБКА HIGH_RESTART_RATE:
        // Теперь проверяем абсолютное количество перезапусков И минимальное количество ботов
        const shouldTriggerHighRestartRate = (
            (this.workers.size >= 5 && restartRate > 0.6) ||  // При 5+ ботах - более 60% перезапусков
            (this.workers.size >= 2 && restartCount >= 10) ||  // При 2+ ботах - более 10 перезапусков за час
            (restartCount >= 20)                               // Всегда при 20+ перезапусках
        );
        
        if (shouldTriggerHighRestartRate) {
            console.log(`🚨 СЛИШКОМ МНОГО ПЕРЕЗАПУСКОВ: ${restartCount} перезапусков за час (${Math.round(restartRate * 100)}% из ${this.workers.size} ботов)`);
            this.triggerEmergencyProtocol('HIGH_RESTART_RATE', { 
                restartRate, 
                restartCount, 
                totalWorkers: this.workers.size,
                reason: restartCount >= 20 ? 'absolute_count' : (this.workers.size >= 5 ? 'high_percentage' : 'medium_count')
            });
        } else {
            // 🔥 ОТЛАДОЧНАЯ ИНФОРМАЦИЯ для диагностики
            if (restartCount > 0) {
                console.log(`📊 Мониторинг перезапусков: ${restartCount} за час из ${this.workers.size} ботов (${Math.round(restartRate * 100)}%) - в пределах нормы`);
            }
        }
    }
    
    /**
     * 🚨 АВАРИЙНЫЙ ПРОТОКОЛ
     */
    async triggerEmergencyProtocol(reason, data) {
        console.log(`🚨 АКТИВАЦИЯ АВАРИЙНОГО ПРОТОКОЛА: ${reason}`);
        console.log(`📊 Данные:`, data);
        
        switch (reason) {
            case 'HIGH_FAILURE_RATE':
                // Останавливаем все воркеры и перезапускаем систему
                console.log(`🛑 Аварийная остановка всех воркеров...`);
                
                const stopPromises = Array.from(this.workers.keys()).map(botId => 
                    this.stopBotWorker(botId)
                );
                await Promise.all(stopPromises);
                
                // Пауза перед перезапуском
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                // Перезагружаем систему
                console.log(`🔄 Перезагрузка системы после аварийной остановки...`);
                await this.loadBotsFromDB();
                break;
                
            case 'HIGH_RESTART_RATE':
                // Увеличиваем интервалы для стабилизации
                console.log(`⏱️ Увеличение интервалов для стабилизации системы...`);
                this.config.cooldownPeriod *= 2;
                this.config.heartbeatInterval *= 1.5;
                
                // Сброс через 30 минут
                setTimeout(() => {
                    this.config.cooldownPeriod = 45000;
                    this.config.heartbeatInterval = 45000;
                    console.log(`✅ Интервалы восстановлены до нормальных значений`);
                }, 30 * 60 * 1000);
                break;
        }
        
        // Уведомление администратора (если настроено)
        this.notifyAdmin(`🚨 Аварийная ситуация: ${reason}`, data);
    }
    
    /**
     * 📧 Уведомление администратора
     */
    async notifyAdmin(message, data) {
        try {
            // Здесь можно добавить отправку email, Slack, Telegram и т.д.
            console.log(`📧 УВЕДОМЛЕНИЕ АДМИНА: ${message}`);
            
            // Пример записи в файл для мониторинга
            const fs = require('fs');
            const alertData = {
                timestamp: new Date().toISOString(),
                message,
                data,
                systemStats: this.getAllStats()
            };
            
            fs.appendFileSync('logs/emergency.log', JSON.stringify(alertData) + '\n');
            
        } catch (error) {
            console.error('❌ Ошибка отправки уведомления админу:', error.message);
        }
    }
    
    /**
     * Получение статистики всех воркеров
     */
    getAllStats() {
        const stats = {
            totalWorkers: this.workers.size,
            maxWorkers: this.config.maxTotalWorkers,
            totalRestarts: Array.from(this.restartCounters.values()).reduce((a, b) => a + b, 0),
            workers: {}
        };
        
        for (const [botId, workerStats] of this.workerStats) {
            const worker = this.workers.get(botId);
            stats.workers[botId] = {
                ...workerStats,
                isActive: worker && !worker.killed,
                pid: worker?.pid,
                memoryUsage: worker?.memoryUsage?.() || null
            };
        }
        
        return stats;
    }
    
    /**
     * API сервер
     */
    startAPI() {
        const app = express();
        app.use(express.json());
        app.use(cors());
        
        // Общий статус системы (совместимость со старой системой)
        app.get('/status', (req, res) => {
            const stats = this.getAllStats();
            const status = {
                totalBots: stats.totalWorkers,
                bots: []
            };
            
            for (const [botId, workerStats] of Object.entries(stats.workers)) {
                if (workerStats.isActive) {
                    status.bots.push({
                        id: parseInt(botId),
                        type: 'telegram',
                        assistant: workerStats.assistantName || 'Unknown',
                        platform: 'telegram',
                        active: true,
                        pid: workerStats.pid
                    });
                }
            }
            
            res.json(status);
        });
        
        // Статус всех воркеров
        app.get('/workers', (req, res) => {
            res.json(this.getAllStats());
        });

        // 📊 ENDPOINT ДЛЯ МОНИТОРИНГА БОТОВ (/metrics)
        app.get('/metrics', async (req, res) => {
            try {
                const stats = this.getAllStats();
                const botInstances = [];
                
                // Получаем информацию о ботах из БД
                try {
                    const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
                    const dbBots = response.data;
                    
                    // Формируем данные о ботах для мониторинга
                    for (const dbBot of dbBots) {
                        const workerStats = this.workerStats.get(dbBot.id);
                        const worker = this.workers.get(dbBot.id);
                        const restartCount = this.restartCounters.get(dbBot.id) || 0;
                        const lastRestart = this.lastRestartTimes.get(dbBot.id);
                        
                        botInstances.push({
                            botId: dbBot.id,
                            assistantName: dbBot.assistant_name || 'Unknown',
                            platform: dbBot.platform || 'telegram',
                            isActive: dbBot.is_active && worker && !worker.killed,
                            uptime: workerStats ? (Date.now() - workerStats.startTime) / 1000 : 0,
                            restarts: restartCount,
                            errors: workerStats ? workerStats.errors : 0,
                            aiRequests: workerStats ? workerStats.aiRequests : 0,
                            lastErrors: workerStats ? (workerStats.lastErrors || []) : []
                        });
                    }
                } catch (dbError) {
                    console.error('❌ Ошибка получения данных о ботах из БД:', dbError.message);
                }
                
                const metricsResponse = {
                    success: true,
                    timestamp: Date.now(),
                    totals: {
                        activeBots: stats.totalWorkers,
                        totalRestarts: stats.totalRestarts,
                        totalErrors: Array.from(this.workerStats.values()).reduce((sum, stat) => sum + (stat.errors || 0), 0),
                        totalAiRequests: Array.from(this.workerStats.values()).reduce((sum, stat) => sum + (stat.aiRequests || 0), 0)
                    },
                    bots: botInstances,
                    systemInfo: {
                        uptime: Date.now() - this.startTime,
                        maxWorkers: this.config.maxTotalWorkers,
                        memoryUsage: process.memoryUsage()
                    }
                };
                
                res.json(metricsResponse);
            } catch (error) {
                console.error('❌ Ошибка получения метрик:', error.message);
                res.status(500).json({ 
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        });
        
        // Статус конкретного воркера
        app.get('/workers/:botId', (req, res) => {
            const botId = parseInt(req.params.botId);
            const stats = this.workerStats.get(botId);
            const worker = this.workers.get(botId);
            
            if (!stats) {
                return res.status(404).json({ error: 'Worker not found' });
            }
            
            res.json({
                ...stats,
                isActive: worker && !worker.killed,
                pid: worker?.pid
            });
        });
        
        // Логи воркера
        app.get('/workers/:botId/logs', (req, res) => {
            const botId = parseInt(req.params.botId);
            const logs = this.workerLogs.get(botId) || [];
            
            res.json({
                botId: botId,
                logs: logs.slice(-100) // Последние 100 логов
            });
        });
        
        // Перезапуск воркера
        app.post('/workers/:botId/restart', async (req, res) => {
            const botId = parseInt(req.params.botId);
            
            try {
                await this.restartBotWorker(botId);
                res.json({ success: true, message: `Worker ${botId} restarted` });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Остановка воркера
        app.post('/workers/:botId/stop', async (req, res) => {
            const botId = parseInt(req.params.botId);
            
            try {
                await this.stopBotWorker(botId);
                res.json({ success: true, message: `Worker ${botId} stopped` });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Массовый перезапуск
        app.post('/workers/restart-all', async (req, res) => {
            try {
                const botIds = Array.from(this.workers.keys());
                
                for (const botId of botIds) {
                    await this.restartBotWorker(botId);
                }
                
                res.json({ 
                    success: true, 
                    message: `Restarted ${botIds.length} workers`,
                    restarted: botIds
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 🔄 ENDPOINT ДЛЯ ПЕРЕЗАГРУЗКИ БОТОВ (/reload-bots)
        app.post('/reload-bots', async (req, res) => {
            try {
                const { bot_ids, assistant_id, user_id } = req.body;
                
                if (!bot_ids || !Array.isArray(bot_ids)) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'bot_ids array is required' 
                    });
                }
                
                console.log(`🔄 ПЕРЕЗАГРУЗКА БОТОВ: ${bot_ids} (ассистент: ${assistant_id}, пользователь: ${user_id})`);
                
                const results = [];
                let successCount = 0;
                
                for (const botId of bot_ids) {
                    try {
                        await this.restartBotWorker(botId);
                        results.push({
                            botId: botId,
                            success: true,
                            message: `Bot ${botId} restarted successfully`,
                            restartCount: this.restartCounters.get(botId) || 0
                        });
                        successCount++;
                    } catch (error) {
                        console.error(`❌ Ошибка перезагрузки бота ${botId}:`, error.message);
                        results.push({
                            botId: botId,
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                const message = `Перезагружено ${successCount} из ${bot_ids.length} ботов`;
                
                res.json({
                    success: successCount > 0,
                    message: message,
                    results: results,
                    improvements: [
                        "Использована новая система управления процессами",
                        "Применены улучшенные алгоритмы перезапуска",
                        "Добавлена защита от дублирования процессов"
                    ]
                });
                
            } catch (error) {
                console.error('❌ Ошибка API перезагрузки ботов:', error.message);
                res.status(500).json({ 
                    success: false,
                    error: error.message 
                });
            }
        });
        
        // Очистка неактивных воркеров
        app.post('/workers/cleanup', async (req, res) => {
            try {
                const response = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
                const activeBotIds = response.data.filter(b => b.is_active).map(b => b.id);
                
                await this.cleanupInactiveWorkers(activeBotIds);
                
                res.json({ 
                    success: true, 
                    message: 'Cleanup completed',
                    activeBotIds: activeBotIds
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Принудительная синхронизация с БД
        app.post('/workers/sync', async (req, res) => {
            try {
                await this.syncWithDatabase();
                
                res.json({ 
                    success: true, 
                    message: 'Database sync completed',
                    currentWorkers: this.workers.size
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // 🔥 НОВЫЕ ENDPOINTS ДЛЯ МОНИТОРИНГА ПРОЦЕССОВ
        
        // Детальная информация о процессах
        app.get('/workers/processes', async (req, res) => {
            try {
                const processInfo = {};
                
                for (const [botId, worker] of this.workers) {
                    const runningPids = await this.getBotProcesses(botId);
                    const tracker = this.processTracker.get(botId);
                    
                    processInfo[botId] = {
                        registered: {
                            pid: worker.pid,
                            killed: worker.killed
                        },
                        running: {
                            pids: runningPids,
                            count: runningPids.length
                        },
                        tracker: tracker ? {
                            lastScan: tracker.lastScan,
                            restartInProgress: tracker.restartInProgress,
                            trackedPids: Array.from(tracker.pids)
                        } : null,
                        status: this.getProcessStatus(botId, worker, runningPids)
                    };
                }
                
                res.json({
                    success: true,
                    timestamp: Date.now(),
                    processes: processInfo,
                    summary: {
                        totalRegistered: this.workers.size,
                        restartQueue: this.restartQueue.size,
                        killingProcesses: this.killingProcesses.size
                    }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // 🧹 ОЧИСТКА КЭША БОТОВ
        app.post('/clear-bot-cache', async (req, res) => {
            try {
                const { bot_ids, assistant_id } = req.body;
                
                if (!bot_ids || !Array.isArray(bot_ids)) {
                    return res.status(400).json({ error: 'bot_ids array is required' });
                }
                
                console.log(`🧹 ОЧИСТКА КЭША для ботов: ${bot_ids} (ассистент: ${assistant_id})`);
                
                let clearedCount = 0;
                let errors = [];
                
                for (const botId of bot_ids) {
                    try {
                        // Очищаем кэшированные данные ассистента
                        const workerStats = this.workerStats.get(botId);
                        if (workerStats && workerStats.lastAssistantData) {
                            // Помечаем данные как устаревшие
                            workerStats.lastAssistantData = null;
                            workerStats.lastCacheUpdate = Date.now();
                            
                            this.workerStats.set(botId, workerStats);
                            console.log(`🧹 Кэш очищен для бота ${botId}`);
                            clearedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Ошибка очистки кэша для бота ${botId}:`, error.message);
                        errors.push({ botId, error: error.message });
                    }
                }
                
                res.json({ 
                    success: true, 
                    message: `Cache cleared for ${clearedCount} bots`,
                    clearedCount,
                    errors: errors.length > 0 ? errors : undefined
                });
                
            } catch (error) {
                console.error('❌ Ошибка очистки кэша:', error.message);
                res.status(500).json({ error: error.message });
            }
        });
        
        // 🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА БОТОВ
        app.post('/hot-reload-bots', async (req, res) => {
            try {
                const { bot_ids, assistant_id, force_reload } = req.body;
                
                if (!bot_ids || !Array.isArray(bot_ids)) {
                    return res.status(400).json({ error: 'bot_ids array is required' });
                }
                
                console.log(`🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА ботов: ${bot_ids} (принудительно: ${force_reload})`);
                
                let reloadedCount = 0;
                let errors = [];
                
                for (const botId of bot_ids) {
                    try {
                        const success = await this.hotReloadBotSettings(botId);
                        if (success) {
                            reloadedCount++;
                            console.log(`✅ Горячая перезагрузка применена к боту ${botId}`);
                        } else {
                            throw new Error('Hot reload failed');
                        }
                    } catch (error) {
                        console.error(`❌ Ошибка горячей перезагрузки бота ${botId}:`, error.message);
                        errors.push({ botId, error: error.message });
                        
                        // Если force_reload = true, добавляем в очередь перезапуска
                        if (force_reload) {
                            this.queueRestart(botId, 'hot_reload_failed');
                        }
                    }
                }
                
                res.json({ 
                    success: true, 
                    message: `Hot reload applied to ${reloadedCount} bots`,
                    reloadedCount,
                    errors: errors.length > 0 ? errors : undefined
                });
                
            } catch (error) {
                console.error('❌ Ошибка горячей перезагрузки:', error.message);
                res.status(500).json({ error: error.message });
            }
        });
        
        // 🚨 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА БОТА
        app.post('/force-restart-bot', async (req, res) => {
            try {
                const { bot_id, reason } = req.body;
                
                if (!bot_id) {
                    return res.status(400).json({ error: 'bot_id is required' });
                }
                
                console.log(`🚨 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА бота ${bot_id} (причина: ${reason || 'manual'})`);
                
                // Останавливаем бота если он работает
                if (this.workers.has(bot_id)) {
                    await this.stopBotWorker(bot_id);
                }
                
                // Принудительно очищаем все процессы
                await this.forceKillBotProcesses(bot_id);
                
                // Очищаем кэш
                const workerStats = this.workerStats.get(bot_id);
                if (workerStats) {
                    workerStats.lastAssistantData = null;
                    workerStats.lastCacheUpdate = Date.now();
                    this.workerStats.set(bot_id, workerStats);
                }
                
                // Добавляем в очередь перезапуска
                this.queueRestart(bot_id, reason || 'force_restart');
                
                res.json({ 
                    success: true, 
                    message: `Force restart queued for bot ${bot_id}`,
                    reason: reason || 'force_restart'
                });
                
            } catch (error) {
                console.error('❌ Ошибка принудительной перезагрузки:', error.message);
                res.status(500).json({ error: error.message });
            }
        });

        // Информация о перезапусках
        app.get('/workers/restarts', (req, res) => {
            try {
                const restartInfo = {};
                
                for (const [botId, count] of this.restartCounters) {
                    const lastRestart = this.lastRestartTimes.get(botId);
                    const inQueue = this.restartQueue.has(botId);
                    const tracker = this.processTracker.get(botId);
                    
                    restartInfo[botId] = {
                        count: count,
                        lastRestart: lastRestart,
                        timeSinceLastRestart: lastRestart ? Date.now() - lastRestart : null,
                        inQueue: inQueue,
                        queueData: inQueue ? this.restartQueue.get(botId) : null,
                        restartInProgress: tracker ? tracker.restartInProgress : false
                    };
                }
                
                res.json({
                    success: true,
                    timestamp: Date.now(),
                    restarts: restartInfo,
                    queue: Array.from(this.restartQueue.entries()).map(([botId, data]) => ({
                        botId,
                        ...data
                    }))
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Принудительное сканирование процессов
        app.post('/workers/scan', async (req, res) => {
            try {
                console.log(`🔍 Принудительное сканирование процессов по API запросу`);
                await this.scanAllBotProcesses();
                
                res.json({ 
                    success: true, 
                    message: 'Process scan completed',
                    timestamp: Date.now()
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Детальная информация о конкретном боте
        app.get('/workers/:botId/detailed', async (req, res) => {
            try {
                const botId = parseInt(req.params.botId);
                const worker = this.workers.get(botId);
                const stats = this.workerStats.get(botId);
                const runningPids = await this.getBotProcesses(botId);
                const tracker = this.processTracker.get(botId);
                const restartCount = this.restartCounters.get(botId) || 0;
                const lastRestart = this.lastRestartTimes.get(botId);
                
                if (!worker && runningPids.length === 0) {
                    return res.status(404).json({ error: 'Bot not found' });
                }
                
                res.json({
                    botId: botId,
                    worker: worker ? {
                        pid: worker.pid,
                        killed: worker.killed,
                        connected: worker.connected
                    } : null,
                    stats: stats,
                    processes: {
                        running: runningPids,
                        count: runningPids.length,
                        status: this.getProcessStatus(botId, worker, runningPids)
                    },
                    tracker: tracker,
                    restarts: {
                        count: restartCount,
                        lastRestart: lastRestart,
                        timeSinceLastRestart: lastRestart ? Date.now() - lastRestart : null,
                        inQueue: this.restartQueue.has(botId)
                    },
                    timestamp: Date.now()
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // 🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА НАСТРОЕК БОТОВ
        app.post('/hot-reload-bots', async (req, res) => {
            try {
                const { bot_ids, assistant_id } = req.body;
                
                if (!bot_ids || !Array.isArray(bot_ids)) {
                    return res.status(400).json({ error: 'bot_ids must be an array' });
                }
                
                console.log(`🔥 Получен запрос на горячую перезагрузку ботов: ${bot_ids.join(', ')}`);
                
                const results = [];
                let reloadedCount = 0;
                
                for (const botId of bot_ids) {
                    try {
                        const success = await this.hotReloadBotSettings(botId);
                        
                        if (success) {
                            reloadedCount++;
                            results.push({ 
                                botId, 
                                success: true,
                                message: 'Настройки горячо перезагружены'
                            });
                            console.log(`✅ Горячая перезагрузка бота ${botId} успешна`);
                        } else {
                            results.push({ 
                                botId, 
                                success: false, 
                                error: 'Не удалось выполнить горячую перезагрузку'
                            });
                        }
                        
                    } catch (error) {
                        console.error(`❌ Ошибка горячей перезагрузки бота ${botId}:`, error.message);
                        results.push({ 
                            botId, 
                            success: false, 
                            error: error.message
                        });
                    }
                }
                
                const message = `🔥 Горячая перезагрузка: ${reloadedCount} из ${bot_ids.length} ботов`;
                console.log(`📊 ${message}`);
                
                res.json({
                    success: reloadedCount > 0,
                    message: message,
                    reloadedCount: reloadedCount,
                    totalCount: bot_ids.length,
                    results: results
                });
                
            } catch (error) {
                console.error('❌ Ошибка API горячей перезагрузки:', error.message);
                res.status(500).json({ 
                    error: error.message,
                    success: false
                });
            }
        });
        
        // 🌐 ПЕРЕКЛЮЧЕНИЕ РЕЖИМА POLLING/WEBHOOK
        app.post('/switch-mode', async (req, res) => {
            try {
                const { mode } = req.body;
                
                if (!mode || !['polling', 'webhook'].includes(mode)) {
                    return res.status(400).json({ 
                        error: 'Invalid mode. Must be "polling" or "webhook"' 
                    });
                }
                
                const currentMode = webhookConfig.config.MODE;
                
                if (currentMode === mode) {
                    return res.json({
                        message: `Система уже работает в режиме ${mode}`,
                        currentMode: currentMode,
                        success: true
                    });
                }
                
                console.log(`🔄 Переключение режима: ${currentMode} → ${mode}`);
                
                // Обновляем конфигурацию
                webhookConfig.config.MODE = mode;
                
                // Если переключаемся на webhook - запускаем webhook сервер
                if (mode === 'webhook' && !this.webhookServer) {
                    this.webhookServer = new WebhookServer();
                    await this.webhookServer.start();
                }
                
                // Если переключаемся с webhook - останавливаем webhook сервер
                if (mode === 'polling' && this.webhookServer) {
                    await this.webhookServer.stop();
                    this.webhookServer = null;
                }
                
                // Перезапускаем все активные боты в новом режиме
                const activeBots = Array.from(this.workers.keys());
                console.log(`🔄 Перезапуск ${activeBots.length} ботов в режиме ${mode}`);
                
                let restarted = 0;
                for (const botId of activeBots) {
                    try {
                        await this.restartBotWorker(botId);
                        restarted++;
                    } catch (error) {
                        console.error(`❌ Ошибка перезапуска бота ${botId}:`, error.message);
                    }
                }
                
                res.json({
                    message: `✅ Успешно переключено на режим ${mode}`,
                    previousMode: currentMode,
                    currentMode: mode,
                    activeBots: activeBots.length,
                    restarted: restarted,
                    webhookServerActive: mode === 'webhook' && this.webhookServer !== null,
                    success: true
                });
                
            } catch (error) {
                console.error('❌ Ошибка переключения режима:', error.message);
                res.status(500).json({ 
                    error: error.message,
                    success: false 
                });
            }
        });
        
        // 🌐 СТАТУС WEBHOOK/POLLING РЕЖИМА
        app.get('/mode-status', (req, res) => {
            res.json({
                currentMode: webhookConfig.config.MODE,
                webhookConfig: webhookConfig.config.WEBHOOK,
                isWebhookMode: webhookConfig.isWebhookMode(),
                isPollingMode: webhookConfig.isPollingMode(),
                webhookServerActive: this.webhookServer !== null,
                activeBots: this.workers.size,
                uptime: Date.now() - this.startTime
            });
        });
        
        app.listen(3002, () => {
            console.log('🌐 Scalable Bot Manager API запущен на порту 3002');
        });

        // 👤 ОТПРАВКА СООБЩЕНИЯ ОПЕРАТОРА В TELEGRAM
        app.post('/send-operator-message', async (req, res) => {
            try {
                const { telegram_chat_id, text } = req.body;
                
                if (!telegram_chat_id || !text) {
                    return res.status(400).json({ 
                        error: 'telegram_chat_id и text обязательны' 
                    });
                }

                console.log(`👤 Отправка сообщения оператора в Telegram чат ${telegram_chat_id}: ${text.substring(0, 100)}...`);
                
                const axios = require('axios');
                
                // Запрос к FastAPI для получения bot_id по telegram_chat_id
                console.log(`🔍 Получение диалога для Telegram чата ${telegram_chat_id}`);
                const apiUrl = `${BACKEND_API_URL}/api/dialogs/by-telegram-chat/${telegram_chat_id}`;
                console.log(`🔍 URL запроса: ${apiUrl}`);
                
                let fastApiResponse;
                try {
                    const startTime = Date.now();
                    fastApiResponse = await axios.get(apiUrl, {
                        timeout: 15000, // 15 секунд - временно увеличиваем для диагностики
                        maxRedirects: 0,
                        headers: {
                            'Content-Type': 'application/json',
                            'Connection': 'close'
                        }
                    });
                    const endTime = Date.now();
                    console.log(`✅ Диалог найден для чата ${telegram_chat_id} за ${endTime - startTime}ms, assistant_id: ${fastApiResponse.data?.assistant_id}`);
                } catch (dialogError) {
                    console.error(`❌ Ошибка получения диалога для чата ${telegram_chat_id}:`, dialogError.message);
                    console.error(`❌ Детали ошибки:`, {
                        code: dialogError.code,
                        errno: dialogError.errno,
                        syscall: dialogError.syscall,
                        address: dialogError.address,
                        port: dialogError.port,
                        config: dialogError.config ? {
                            url: dialogError.config.url,
                            method: dialogError.config.method,
                            timeout: dialogError.config.timeout
                        } : 'no config'
                    });
                    throw new Error(`Ошибка получения диалога: ${dialogError.message}`);
                }
                
                if (!fastApiResponse.data) {
                    return res.status(404).json({ 
                        error: `Диалог для Telegram чата ${telegram_chat_id} не найден` 
                    });
                }
                
                const assistant_id = fastApiResponse.data.assistant_id;
                let bot_id = null;
                
                // Если диалог имеет assistant_id, ищем bot instance по нему
                if (assistant_id) {
                    console.log(`🤖 Получение bot instance для ассистента ${assistant_id}`);
                    let botInstanceResponse;
                    try {
                        botInstanceResponse = await axios.get(`${BACKEND_API_URL}/api/bot-instances/by-assistant/${assistant_id}`, {
                            timeout: 15000 // 15 секунд - временно увеличиваем для диагностики
                        });
                        console.log(`✅ Bot instance найден для ассистента ${assistant_id}, bot_id: ${botInstanceResponse.data?.id}`);
                        
                        if (botInstanceResponse.data && botInstanceResponse.data.id) {
                            bot_id = botInstanceResponse.data.id;
                        }
                    } catch (botError) {
                        console.error(`❌ Ошибка получения bot instance для ассистента ${assistant_id}:`, botError.message);
                    }
                }
                
                // Если не удалось найти по assistant_id, ищем любого активного бота для этого чата
                if (!bot_id) {
                    console.log(`🔍 Assistant_id отсутствует или bot instance не найден. Ищем любого активного бота для чата ${telegram_chat_id}`);
                    
                    // Берем первого доступного бота из активных воркеров
                    const activeWorkers = Array.from(this.workers.keys());
                    if (activeWorkers.length > 0) {
                        bot_id = activeWorkers[0];
                        console.log(`🤖 Используем первого доступного бота с ID: ${bot_id}`);
                    } else {
                        return res.status(404).json({ 
                            error: `Нет активных ботов для отправки сообщения в чат ${telegram_chat_id}` 
                        });
                    }
                }
                
                // Находим worker для этого bot_id
                const worker = this.workers.get(bot_id);
                if (!worker) {
                    return res.status(404).json({ 
                        error: `Worker для бота ${bot_id} не найден` 
                    });
                }
                
                // Отправляем команду worker'у для отправки сообщения
                worker.send({
                    command: 'send_operator_message',
                    data: {
                        telegram_chat_id: telegram_chat_id,
                        text: text
                    }
                });
                
                console.log(`✅ Команда отправки сообщения оператора передана worker'у бота ${bot_id}`);
                
                res.json({ 
                    success: true, 
                    message: `Сообщение оператора отправлено в чат ${telegram_chat_id}`,
                    bot_id: bot_id
                });
                
            } catch (error) {
                console.error('❌ Ошибка отправки сообщения оператора:', error.message);
                
                // Добавляем детальную информацию о типе ошибки
                let detailedError = error.message;
                if (error.code === 'ECONNABORTED') {
                    detailedError = `timeout of ${error.config?.timeout || 'неизвестно'}ms exceeded`;
                } else if (error.response) {
                    detailedError = `HTTP ${error.response.status}: ${error.response.statusText}`;
                } else if (error.code === 'ECONNREFUSED') {
                    detailedError = 'Connection refused - FastAPI сервер недоступен';
                }
                
                res.status(500).json({ error: detailedError });
            }
        });

        // 🔔 ОТПРАВКА СИСТЕМНОГО СООБЩЕНИЯ В TELEGRAM  
        app.post('/send-system-message', async (req, res) => {
            try {
                const { telegram_chat_id, text, system_type, dialog_id } = req.body;
                
                if (!telegram_chat_id || !text) {
                    return res.status(400).json({ 
                        error: 'telegram_chat_id и text обязательны для системного сообщения' 
                    });
                }

                console.log(`🔔 Отправка системного сообщения (${system_type}) в Telegram чат ${telegram_chat_id}: ${text}`);

                // Находим бота по telegram_chat_id через FastAPI
                const dialogResponse = await axios.get(`${BACKEND_API_URL}/api/dialogs/by-telegram-chat/${telegram_chat_id}`, {
                    timeout: 5000
                });

                if (!dialogResponse.data || !dialogResponse.data.bot_id) {
                    console.log(`⚠️ Бот не найден для Telegram чата ${telegram_chat_id}`);
                    return res.status(404).json({ 
                        error: `Бот не найден для Telegram чата ${telegram_chat_id}` 
                    });
                }

                const bot_id = dialogResponse.data.bot_id;
                const worker = this.workers.get(bot_id);

                if (!worker) {
                    console.log(`⚠️ Worker для бота ${bot_id} не найден`);
                    return res.status(404).json({ 
                        error: `Worker для бота ${bot_id} не найден` 
                    });
                }
                
                // Отправляем команду worker'у для отправки системного сообщения
                worker.send({
                    command: 'send_system_message',
                    data: {
                        telegram_chat_id: telegram_chat_id,
                        text: text,
                        system_type: system_type,
                        dialog_id: dialog_id
                    }
                });
                
                console.log(`✅ Команда отправки системного сообщения передана worker'у бота ${bot_id}`);
                
                res.json({ 
                    success: true, 
                    message: `Системное сообщение отправлено в чат ${telegram_chat_id}`,
                    bot_id: bot_id,
                    system_type: system_type
                });
                
            } catch (error) {
                console.error('❌ Ошибка отправки системного сообщения:', error.message);
                res.status(500).json({ error: error.message });
            }
        });
        
        // ЯДЕРНАЯ ОПЦИЯ: Полная очистка всех процессов
        app.post('/nuclear-cleanup', async (req, res) => {
            try {
                console.log(`☢️ ЗАПРОС ЯДЕРНОЙ ОЧИСТКИ от ${req.ip}`);
                await this.nuclearCleanup();
                res.json({ 
                    success: true, 
                    message: '☢️ ЯДЕРНАЯ ОЧИСТКА ЗАВЕРШЕНА'
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    /**
     * 📊 ОПРЕДЕЛЕНИЕ СТАТУСА ПРОЦЕССА
     */
    getProcessStatus(botId, worker, runningPids) {
        if (!worker && runningPids.length === 0) {
            return 'NOT_FOUND';
        } else if (!worker && runningPids.length > 0) {
            return 'ORPHAN_PROCESSES';
        } else if (worker && runningPids.length === 0) {
            return 'MISSING_PROCESS';
        } else if (worker && runningPids.length === 1 && runningPids[0] === worker.pid) {
            return 'HEALTHY';
        } else if (worker && runningPids.length === 1 && runningPids[0] !== worker.pid) {
            return 'PID_MISMATCH';
        } else if (worker && runningPids.length > 1) {
            return 'DUPLICATE_PROCESSES';
        } else {
            return 'UNKNOWN';
        }
    }
    
    /**
     * ЯДЕРНАЯ ОПЦИЯ: Полная очистка всех процессов
     */
    async nuclearCleanup() {
        console.log(`☢️ ЯДЕРНАЯ ОЧИСТКА: Завершение ВСЕХ процессов системы`);
        
        try {
            const { exec } = require('child_process');
            
            // Команды для поиска ВСЕХ связанных процессов
            const killCommands = [
                `pkill -f "bot_worker"`,
                `pkill -f "scalable_bot_manager"`,
                `pkill -f "multi_bot_manager"`,
                `pkill -f "telegram_bot"`,
                `ps aux | grep "node.*bot" | grep -v grep | awk '{print $2}' | xargs -r kill -9`,
                `ps aux | grep "BOT_ID=" | grep -v grep | awk '{print $2}' | xargs -r kill -9`,
                `ps aux | grep "worker" | grep -v grep | awk '{print $2}' | xargs -r kill -9`
            ];
            
            for (const command of killCommands) {
                try {
                    console.log(`☢️ Выполняю: ${command}`);
                    await new Promise((resolve) => {
                        exec(command, (error, stdout, stderr) => {
                            if (stdout) console.log(`📤 ${stdout}`);
                            if (stderr) console.log(`⚠️ ${stderr}`);
                            resolve();
                        });
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (cmdError) {
                    console.log(`⚠️ Ошибка команды "${command}": ${cmdError.message}`);
                }
            }
            
            // Принудительная сборка мусора
            if (global.gc) {
                console.log(`🗑️ Финальная сборка мусора`);
                global.gc();
            }
            
            console.log(`☢️ ЯДЕРНАЯ ОЧИСТКА ЗАВЕРШЕНА`);
            
        } catch (error) {
            console.error(`☢️ Ошибка ядерной очистки: ${error.message}`);
        }
    }
    
    /**
     * 🔥 ГЛОБАЛЬНАЯ ОЧИСТКА ЗОМБИ-ПРОЦЕССОВ
     */
    async cleanupZombieProcesses() {
        try {
            console.log(`🧹 ГЛОБАЛЬНАЯ ОЧИСТКА ЗОМБИ-ПРОЦЕССОВ...`);
            
            const { exec } = require('child_process');
            const commands = [
                `ps aux | grep "telegram/bot_worker.js" | grep -v grep`,
                `ps aux | grep "node.*bot_worker" | grep -v grep`
            ];
            
            const zombiePids = new Set();
            
            for (const command of commands) {
                try {
                    const { stdout } = await new Promise((resolve) => {
                        exec(command, (error, stdout, stderr) => {
                            resolve({ stdout: stdout || '' });
                        });
                    });
                    
                    const lines = stdout.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length > 1) {
                            const pid = parseInt(parts[1]);
                            if (pid && !isNaN(pid) && pid !== process.pid) {
                                zombiePids.add(pid);
                                console.log(`🧟 Найден зомби-процесс: PID ${pid}`);
                            }
                        }
                    }
                } catch (cmdError) {
                    // Игнорируем ошибки поиска
                }
            }
            
            // Убиваем всех зомби
            if (zombiePids.size > 0) {
                console.log(`💀 Убиваем ${zombiePids.size} зомби-процессов: [${Array.from(zombiePids).join(', ')}]`);
                
                for (const pid of zombiePids) {
                    try {
                        // Проверяем, существует ли процесс
                        process.kill(pid, 0);
                        
                        // 🔥 СРАЗУ SIGKILL ТОЛЬКО ДЛЯ ЭТОГО БОТА
                        console.log(`🎯 SIGKILL для процесса ${pid} (бот ${botId})`);
                        process.kill(pid, 'SIGKILL');
                        
                        // Короткая пауза
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (killError) {
                        if (killError.code !== 'ESRCH') {
                            console.log(`⚠️ Ошибка убийства зомби ${pid}: ${killError.message}`);
                        }
                    }
                }
                
                // Пауза для освобождения ресурсов
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log(`✅ Глобальная очистка зомби завершена`);
            } else {
                console.log(`✅ Зомби-процессы не найдены`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка глобальной очистки зомби:`, error.message);
        }
    }
    
    /**
     * 🔥 ЗАПУСК СИСТЕМЫ ОТСЛЕЖИВАНИЯ ПРОЦЕССОВ
     */
    startProcessTracking() {
        console.log(`🔍 Запуск системы отслеживания процессов...`);
        
        // Периодическая проверка процессов
        setInterval(() => {
            this.scanAllBotProcesses();
        }, this.config.processCheckInterval);
        
        // Проверка очереди перезапусков
        setInterval(() => {
            this.processRestartQueue();
        }, 5000);
        
        console.log(`✅ Система отслеживания процессов активна`);
    }
    
    /**
     * 🔍 СКАНИРОВАНИЕ ВСЕХ ПРОЦЕССОВ БОТОВ
     */
    async scanAllBotProcesses() {
        try {
            console.log(`🔍 Сканирование процессов ботов...`);
            
            const { exec } = require('child_process');
            
            // Получаем все процессы bot_worker
            const { stdout } = await new Promise((resolve) => {
                exec(`ps aux | grep "bot_worker.js" | grep -v grep`, (error, stdout) => {
                    resolve({ stdout: stdout || '' });
                });
            });
            
            const runningProcesses = new Map(); // botId -> [pids]
            const lines = stdout.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length > 10) {
                    const pid = parseInt(parts[1]);
                    const fullCommand = parts.slice(10).join(' ');
                    
                    // Извлекаем BOT_ID из переменных окружения
                    const botIdMatch = fullCommand.match(/BOT_ID=(\d+)/);
                    if (botIdMatch && pid) {
                        const botId = parseInt(botIdMatch[1]);
                        
                        if (!runningProcesses.has(botId)) {
                            runningProcesses.set(botId, []);
                        }
                        runningProcesses.get(botId).push(pid);
                    }
                }
            }
            
            // Анализируем результаты
            await this.analyzeProcessScan(runningProcesses);
            
        } catch (error) {
            console.error(`❌ Ошибка сканирования процессов:`, error.message);
        }
    }
    
    /**
     * 📊 АНАЛИЗ РЕЗУЛЬТАТОВ СКАНИРОВАНИЯ
     */
    async analyzeProcessScan(runningProcesses) {
        const now = Date.now();
        const issues = [];
        
        // Проверяем каждого зарегистрированного бота
        for (const [botId, worker] of this.workers) {
            const expectedPid = worker.pid;
            const runningPids = runningProcesses.get(botId) || [];
            
            // Обновляем трекер
            if (!this.processTracker.has(botId)) {
                this.processTracker.set(botId, {
                    pids: new Set(),
                    lastScan: now,
                    restartInProgress: false
                });
            }
            
            const tracker = this.processTracker.get(botId);
            tracker.pids = new Set(runningPids);
            tracker.lastScan = now;
            
            // 🚨 ОБНАРУЖЕНИЕ ПРОБЛЕМ - УЛУЧШЕННАЯ ЛОГИКА
            if (runningPids.length === 0) {
                // 🔥 РАСШИРЕННАЯ ПРОВЕРКА: проверяем процесс по PID через разные методы
                const processExists = await this.checkProcessExists(expectedPid);
                const isWorkerConnected = !worker.killed && worker.connected;
                
                if (!processExists && !isWorkerConnected) {
                    // Процесс действительно отсутствует
                    issues.push({
                        type: 'MISSING_PROCESS',
                        botId,
                        expectedPid,
                        message: `❌ Бот ${botId} недоступен: процесс ${expectedPid} не найден и воркер отключён`
                    });
                } else if (processExists && isWorkerConnected) {
                    // Процесс работает, но не найден в grep - это нормально, игнорируем
                    console.log(`✅ Бот ${botId}: процесс ${expectedPid} работает (не найден в grep по BOT_ID, но найден по PID - это нормально)`);
                } else if (processExists && !isWorkerConnected) {
                    // Процесс есть, но воркер отключён - возможно проблема с IPC
                    console.log(`⚠️ Бот ${botId}: процесс ${expectedPid} существует, но воркер отключён - возможны проблемы с IPC`);
                } else {
                    // Процесса нет, но воркер подключён - странная ситуация
                    console.log(`⚠️ Бот ${botId}: процесс ${expectedPid} не найден, но воркер подключён - проверяем дополнительно`);
                }
                
            } else if (runningPids.length > 1) {
                // ДУБЛИРОВАНИЕ ПРОЦЕССОВ!
                issues.push({
                    type: 'DUPLICATE_PROCESSES',
                    botId,
                    expectedPid,
                    runningPids,
                    message: `🚨 ДУБЛИРОВАНИЕ! Бот ${botId} имеет ${runningPids.length} процессов: [${runningPids.join(', ')}]`
                });
                
            } else if (runningPids[0] !== expectedPid) {
                // PID не совпадает
                issues.push({
                    type: 'PID_MISMATCH',
                    botId,
                    expectedPid,
                    actualPid: runningPids[0],
                    message: `⚠️ PID не совпадает для бота ${botId}: ожидался ${expectedPid}, найден ${runningPids[0]}`
                });
            }
        }
        
        // Проверяем процессы без регистрации
        for (const [botId, pids] of runningProcesses) {
            if (!this.workers.has(botId)) {
                issues.push({
                    type: 'ORPHAN_PROCESSES',
                    botId,
                    runningPids: pids,
                    message: `👻 Процессы-сироты для бота ${botId}: [${pids.join(', ')}] (не зарегистрированы в мастере)`
                });
            }
        }
        
        // Обрабатываем найденные проблемы
        if (issues.length > 0) {
            console.log(`🚨 Обнаружено ${issues.length} проблем с процессами:`);
            for (const issue of issues) {
                console.log(`   ${issue.message}`);
                await this.handleProcessIssue(issue);
            }
        } else {
            console.log(`✅ Все процессы в порядке (проверено ${this.workers.size} ботов)`);
        }
    }
    
    /**
     * 🔧 ОБРАБОТКА ПРОБЛЕМ С ПРОЦЕССАМИ
     */
    async handleProcessIssue(issue) {
        const { type, botId, expectedPid, runningPids, actualPid } = issue;
        
        switch (type) {
            case 'DUPLICATE_PROCESSES':
                console.log(`🚨 УСТРАНЕНИЕ ДУБЛИРОВАНИЯ для бота ${botId}`);
                
                // Убиваем все процессы кроме ожидаемого
                for (const pid of runningPids) {
                    if (pid !== expectedPid) {
                        console.log(`💀 Убиваем дублирующий процесс ${pid} для бота ${botId}`);
                        await this.forceKillProcess(pid, `duplicate_${botId}`);
                    }
                }
                
                // Проверяем, остался ли ожидаемый процесс
                setTimeout(async () => {
                    const stillRunning = await this.checkProcessExists(expectedPid);
                    if (!stillRunning) {
                        console.log(`⚠️ Основной процесс ${expectedPid} для бота ${botId} также завершился, перезапускаем`);
                        this.queueRestart(botId, 'after_duplicate_cleanup');
                    }
                }, this.config.duplicateCheckDelay);
                break;
                
            case 'MISSING_PROCESS':
                console.log(`👻 Процесс для бота ${botId} действительно недоступен`);
                // 🔥 ИНТЕЛЛЕКТУАЛЬНАЯ ОБРАБОТКА: не перезапускаем автоматически,
                // но очищаем регистрацию и даём возможность ручного перезапуска
                console.log(`🧹 Очищаем регистрацию бота ${botId} - процесс недоступен`);
                
                // Обновляем статус перед удалением
                this.updateWorkerStatus(botId, 'crashed');
                
                // Полная очистка всех данных бота
                this.workers.delete(botId);
                this.processTracker.delete(botId);
                this.startingBots.delete(botId);
                this.startLocks.delete(botId);
                
                // Логируем для диагностики
                console.log(`📊 Бот ${botId} помечен как недоступный - можно перезапустить вручную через API`);
                break;
                
            case 'PID_MISMATCH':
                console.log(`🔄 PID не совпадает для бота ${botId}, обновляем регистрацию`);
                const worker = this.workers.get(botId);
                if (worker) {
                    worker.pid = actualPid;
                    console.log(`✅ PID для бота ${botId} обновлен: ${expectedPid} -> ${actualPid}`);
                }
                break;
                
            case 'ORPHAN_PROCESSES':
                console.log(`👻 Убиваем процессы-сироты для бота ${botId}: [${runningPids.join(', ')}]`);
                for (const pid of runningPids) {
                    await this.forceKillProcess(pid, `orphan_${botId}`);
                }
                break;
        }
    }
    
    /**
     * ⚔️ ПРИНУДИТЕЛЬНОЕ ЗАВЕРШЕНИЕ ПРОЦЕССА
     */
    async forceKillProcess(pid, reason) {
        if (this.killingProcesses.has(pid)) {
            console.log(`⚠️ Процесс ${pid} уже завершается, пропускаем`);
            return;
        }
        
        this.killingProcesses.add(pid);
        console.log(`💀 Принудительное завершение процесса ${pid} (причина: ${reason})`);
        
        try {
            // Проверяем существование процесса
            process.kill(pid, 0);
            
            // Сначала SIGTERM
            console.log(`📡 SIGTERM -> ${pid}`);
            process.kill(pid, 'SIGTERM');
            
            // Ждем 5 секунд
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Проверяем, завершился ли процесс
            try {
                process.kill(pid, 0);
                // Если дошли сюда - процесс еще жив
                console.log(`💀 SIGKILL -> ${pid} (не отвечает на SIGTERM)`);
                process.kill(pid, 'SIGKILL');
            } catch (e) {
                // Процесс уже завершился
                console.log(`✅ Процесс ${pid} завершился по SIGTERM`);
            }
            
        } catch (error) {
            if (error.code === 'ESRCH') {
                console.log(`✅ Процесс ${pid} уже не существует`);
            } else {
                console.log(`❌ Ошибка завершения процесса ${pid}: ${error.message}`);
            }
        } finally {
            // Убираем из списка завершаемых через 30 секунд
            setTimeout(() => {
                this.killingProcesses.delete(pid);
            }, 30000);
        }
    }
    
    /**
     * 🔍 ПРОВЕРКА СУЩЕСТВОВАНИЯ ПРОЦЕССА
     */
    async checkProcessExists(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 📝 ДОБАВЛЕНИЕ В ОЧЕРЕДЬ ПЕРЕЗАПУСКА
     */
    queueRestart(botId, reason) {
        const now = Date.now();
        
        // Проверяем, не в очереди ли уже
        if (this.restartQueue.has(botId)) {
            console.log(`⚠️ Бот ${botId} уже в очереди перезапуска, пропускаем`);
            return;
        }
        
        // Проверяем блокировки
        if (this.startingBots.has(botId)) {
            console.log(`⚠️ Бот ${botId} уже запускается, пропускаем перезапуск`);
            return;
        }
        
        const tracker = this.processTracker.get(botId);
        if (tracker && tracker.restartInProgress) {
            console.log(`⚠️ Перезапуск бота ${botId} уже в процессе, пропускаем`);
            return;
        }
        
        console.log(`📝 Добавление бота ${botId} в очередь перезапуска (причина: ${reason})`);
        this.restartQueue.set(botId, { timestamp: now, reason });
        
        // Устанавливаем флаг
        if (tracker) {
            tracker.restartInProgress = true;
        }
    }
    
    /**
     * ⚙️ ОБРАБОТКА ОЧЕРЕДИ ПЕРЕЗАПУСКОВ
     */
    async processRestartQueue() {
        if (this.restartQueue.size === 0) return;
        
        const now = Date.now();
        const toProcess = [];
        
        // Собираем готовые к обработке
        for (const [botId, data] of this.restartQueue) {
            // Ждем минимум 10 секунд перед перезапуском
            if (now - data.timestamp >= 10000) {
                toProcess.push(botId);
            }
        }
        
        if (toProcess.length > 0) {
            console.log(`⚙️ Обработка очереди перезапусков: ${toProcess.length} ботов`);
            
            for (const botId of toProcess) {
                const data = this.restartQueue.get(botId);
                this.restartQueue.delete(botId);
                
                console.log(`🔄 Перезапуск бота ${botId} из очереди (причина: ${data.reason})`);
                
                try {
                    await this.restartBotWorker(botId);
                } catch (error) {
                    console.error(`❌ Ошибка перезапуска бота ${botId} из очереди:`, error.message);
                } finally {
                    // Снимаем флаг
                    const tracker = this.processTracker.get(botId);
                    if (tracker) {
                        tracker.restartInProgress = false;
                    }
                }
            }
        }
    }
    
    /**
     * 🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА НАСТРОЕК БОТА
     * Обновляет промпт, модель и другие настройки без перезапуска воркера
     */
    async hotReloadBotSettings(botId) {
        try {
            if (!this.workers.has(botId)) {
                console.log(`⚠️ Воркер для бота ${botId} не найден`);
                return false;
            }
            
            console.log(`🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА настроек для бота ${botId}`);
            
            // Получаем актуальные данные ассистента
            const assistantResponse = await axios.get(`${BACKEND_API_URL}/api/bot-instances/${botId}/assistant`);
            const assistant = assistantResponse.data;
            
            if (!assistant) {
                console.log(`❌ Ассистент для бота ${botId} не найден`);
                return false;
            }
            
            // Получаем конфигурацию бота
            const botConfigResponse = await axios.get(`${BACKEND_API_URL}/api/bot-instances-all`);
            const botConfig = botConfigResponse.data.find(b => b.id === botId);
            
            if (!botConfig) {
                console.log(`❌ Конфигурация для бота ${botId} не найдена`);
                return false;
            }
            
            // Отправляем команду горячей перезагрузки воркеру
            const worker = this.workers.get(botId);
            worker.send({
                command: 'hot_reload',
                data: { assistant, botConfig }
            });
            
            // Обновляем сохраненные данные в статистике
            const workerStats = this.workerStats.get(botId);
            if (workerStats) {
                this.workerStats.set(botId, {
                    ...workerStats,
                    lastAssistantData: {
                        system_prompt: assistant.system_prompt,
                        ai_model: assistant.ai_model,
                        name: assistant.name,
                        assistant_id: botConfig.assistant_id,
                        bot_token: botConfig.bot_token
                    }
                });
            }
            
            console.log(`✅ Команда горячей перезагрузки отправлена для бота ${botId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка горячей перезагрузки настроек бота ${botId}:`, error.message);
            return false;
        }
    }
    
    /**
     * Запуск менеджера
     */
    async start() {
        try {
            console.log('🚀 Запуск Scalable Bot Manager...');
            
            // 1. Запуск webhook сервера (если нужен)
            if (this.webhookServer) {
                await this.webhookServer.start();
                console.log('🌐 Webhook сервер запущен');
            }
            
            // 2. Запуск мониторинга
            this.startProcessMonitoring();
            this.startHealthChecks();
            
            // 3. Синхронизация с API
            await this.syncWithAPI();
            
            // 4. Запуск веб-интерфейса
            this.startWebInterface();
            
            console.log('✅ Scalable Bot Manager полностью запущен');
            
        } catch (error) {
            console.error('❌ Ошибка запуска Scalable Bot Manager:', error.message);
            throw error;
        }
    }
}

// Запуск мастер-процесса
const manager = new ScalableBotManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Graceful shutdown мастер-процесса...');
    
    const shutdownPromises = Array.from(manager.workers.keys()).map(botId => 
        manager.stopBotWorker(botId)
    );
    
    await Promise.all(shutdownPromises);
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Получен SIGINT, останавливаем все воркеры...');
    
    const shutdownPromises = Array.from(manager.workers.keys()).map(botId => 
        manager.stopBotWorker(botId)
    );
    
    await Promise.all(shutdownPromises);
    process.exit(0);
});

console.log('🚀 Scalable Bot Manager готов к управлению 1000+ ботов!');