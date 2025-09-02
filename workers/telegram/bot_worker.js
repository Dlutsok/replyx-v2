const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const webhookConfig = require('../config/webhook');
// Rate limiter для Telegram полностью отключен

/**
 * 🤖 ИЗОЛИРОВАННЫЙ БОТ-ВОРКЕР
 * Каждый бот работает в отдельном процессе для максимальной изоляции
 */
class BotWorker {
    constructor() {
        this.bot = null;
        this.rateLimitedBot = null;
        this.config = null;
        this.assistant = null;
        this.botId = null;
        this.startTime = Date.now();
        this.metrics = {
            messages: 0,
            errors: 0,
            restarts: 0,
            uptime: 0
        };
        
        // 🔥 СИСТЕМА ДЕДУПЛИКАЦИИ СООБЩЕНИЙ
        this.processedMessages = new Map(); // messageId -> timestamp
        this.messageCleanupInterval = null;
        
        // 🚦 СИСТЕМА THROTTLING ЛОГОВ
        this.errorThrottling = new Map(); // errorKey -> { lastLogged, count, suppressedCount }
        this.logThrottleInterval = 30000; // 30 секунд
        this.summaryInterval = null;
        
        // Настройка IPC коммуникации с мастер-процессом
        this.setupIPC();
        
        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
        
        // Запуск сводки по подавленным логам
        this.startLogSummary();
        
        console.log(`🤖 Воркер бота запущен (PID: ${process.pid})`);
    }
    
    /**
     * Настройка межпроцессного взаимодействия
     */
    setupIPC() {
        process.on('message', async (message) => {
            try {
                const { command, data } = message;
                
                switch (command) {
                    case 'start':
                        await this.startBot(data);
                        break;
                    case 'stop':
                        await this.stopBot();
                        break;
                    case 'restart':
                        await this.restartBot(data);
                        break;
                    case 'hot_reload':
                        await this.hotReloadSettings(data);
                        break;
                    case 'webhook_update':
                        await this.handleWebhookUpdate(data);
                        break;
                    case 'ai_response':
                        await this.handleAIResponse(data);
                        break;
                    case 'get_status':
                        this.sendStatus();
                        break;
                    case 'get_metrics':
                        this.sendMetrics();
                        break;
                    case 'send_operator_message':
                        await this.sendOperatorMessage(data);
                        break;
                    case 'send_system_message':
                        await this.sendSystemMessage(data);
                        break;
                    default:
                        console.log(`Неизвестная команда: ${command}`);
                }
            } catch (error) {
                this.sendError(`Ошибка обработки команды ${command}: ${error.message}`, error);
            }
        });
    }
    
    /**
     * 🚀 УНИВЕРСАЛЬНЫЙ ЗАПУСК БОТА (POLLING ИЛИ WEBHOOK)
     */
    async startBot(data) {
        try {
            const { botId, botConfig, assistant } = data;
            this.botId = botId;
            this.config = botConfig;
            this.assistant = assistant;
            
            const mode = webhookConfig.isWebhookMode() ? 'WEBHOOK' : 'POLLING';
            console.log(`🚀 ЗАПУСК БОТА ${botId} В РЕЖИМЕ ${mode} для ассистента "${assistant.name}"`);
            
            // 1. Создание временного бота для очистки
            console.log(`🧹 Очистка предыдущих соединений для бота ${botId}`);
            const tempBot = new TelegramBot(botConfig.bot_token, { polling: false });
            
            try {
                // Всегда очищаем webhook сначала
                await tempBot.deleteWebHook({ drop_pending_updates: true });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Валидация токена
                const botInfo = await tempBot.getMe();
                console.log(`✅ Валидация успешна для бота ${botId}: @${botInfo.username}`);
                
            } catch (cleanupError) {
                console.log(`⚠️ Ошибка очистки для бота ${botId}: ${cleanupError.message}`);
            }
            
            // 2. Пауза для освобождения сессии
            console.log(`⏳ Пауза для освобождения сессии бота ${botId}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 3. Создание основного экземпляра бота
            if (webhookConfig.isWebhookMode()) {
                // WEBHOOK РЕЖИМ
                this.bot = new TelegramBot(botConfig.bot_token, {
                    polling: false // Отключаем polling для webhook
                });
                
                await this.setupWebhookMode(botConfig);
            } else {
                // POLLING РЕЖИМ (как раньше)
                this.bot = new TelegramBot(botConfig.bot_token, {
                    polling: {
                        interval: webhookConfig.config.POLLING.INTERVAL,
                        autoStart: false,
                        params: { timeout: webhookConfig.config.POLLING.TIMEOUT }
                    }
                });
                
                await this.setupPollingMode();
            }
            
            // Rate limiting отключен: работаем напрямую через node-telegram-bot-api
            
            // 4. Настройка обработчиков (только для polling)
            if (webhookConfig.isPollingMode()) {
                this.setupBotHandlers();
            }
            
            this.sendResponse('started', {
                botId: this.botId,
                pid: process.pid,
                startTime: this.startTime,
                mode: mode
            });
            
        } catch (error) {
            this.metrics.errors++;
            this.sendError(`Ошибка запуска бота в режиме ${webhookConfig.config.MODE}: ${error.message}`);
        }
    }
    
    /**
     * 🌐 НАСТРОЙКА WEBHOOK РЕЖИМА
     */
    async setupWebhookMode(botConfig) {
        try {
            const webhookSettings = webhookConfig.getWebhookSettings(botConfig.bot_token);
            
            if (!webhookSettings) {
                throw new Error('Не удалось получить настройки webhook');
            }
            
            console.log(`🌐 Настройка webhook для бота ${this.botId}: ${webhookSettings.url}`);
            
            // Устанавливаем webhook
            await this.bot.setWebHook(
                webhookSettings.url,
                {
                    max_connections: webhookSettings.max_connections,
                    allowed_updates: webhookSettings.allowed_updates,
                    secret_token: webhookSettings.secret_token,
                    drop_pending_updates: webhookSettings.drop_pending_updates
                }
            );
            
            // Проверяем установку webhook
            const webhookInfo = await this.bot.getWebHookInfo();
            console.log(`✅ Webhook установлен для бота ${this.botId}:`);
            console.log(`   URL: ${webhookInfo.url}`);
            console.log(`   Pending: ${webhookInfo.pending_update_count}`);
            console.log(`   Max connections: ${webhookInfo.max_connections}`);
            
            // Уведомляем мастер-процесс о регистрации webhook
            this.sendRequest('register_webhook', {
                botId: this.botId,
                worker: process
            });
            
        } catch (error) {
            console.error(`❌ Ошибка настройки webhook для бота ${this.botId}:`, error.message);
            throw error;
        }
    }
    
    /**
     * 🔄 НАСТРОЙКА POLLING РЕЖИМА
     */
    async setupPollingMode() {
        try {
            console.log(`🔄 Запуск polling для бота ${this.botId}`);
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    await this.bot.startPolling();
                    console.log(`✅ Polling успешно запущен для бота ${this.botId}`);
                    break;
                } catch (pollingError) {
                    attempts++;
                    console.log(`⚠️ Попытка ${attempts}/${maxAttempts} запуска polling для бота ${this.botId}: ${pollingError.message}`);
                    
                    if (attempts < maxAttempts) {
                        const delay = 5000 * Math.pow(2, attempts - 1);
                        console.log(`⏳ Пауза ${delay}ms перед повторной попыткой`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw pollingError;
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Ошибка настройки polling для бота ${this.botId}:`, error.message);
            throw error;
        }
    }
    
    /**
     * 🔥 ПОЛНАЯ ОЧИСТКА СТАРЫХ ОБРАБОТЧИКОВ
     */
    clearOldHandlers() {
        if (this.bot) {
            console.log(`🧹 ПОЛНАЯ очистка старых обработчиков для бота ${this.botId}`);
            
            // 1. Удаляем ВСЕ обработчики событий
            this.bot.removeAllListeners('message');
            this.bot.removeAllListeners('callback_query');
            this.bot.removeAllListeners('polling_error');
            this.bot.removeAllListeners('webhook_error');
            this.bot.removeAllListeners('error');
            
            // 2. 🔥 ГЛУБОКАЯ ОЧИСТКА ВНУТРЕННИХ СТРУКТУР node-telegram-bot-api
            try {
                if (this.bot._textRegexpCallbacks) {
                    this.bot._textRegexpCallbacks.length = 0;
                    console.log(`🧹 Очищено ${this.bot._textRegexpCallbacks.length} text regexp callbacks`);
                }
                
                if (this.bot._onReplyToMessages) {
                    if (Array.isArray(this.bot._onReplyToMessages)) {
                        this.bot._onReplyToMessages.length = 0;
                    } else if (typeof this.bot._onReplyToMessages.clear === 'function') {
                        this.bot._onReplyToMessages.clear();
                    }
                    console.log(`🧹 Очищены onReplyToMessages callbacks`);
                }
                
                // 3. 🔥 ДОПОЛНИТЕЛЬНАЯ ОЧИСТКА ВНУТРЕННИХ СТРУКТУР
                if (this.bot._callbacks) {
                    this.bot._callbacks.clear?.();
                }
                
                if (this.bot._pendingRequests) {
                    this.bot._pendingRequests.clear?.();
                }
                
                // 4. Очистка middleware и хуков (если есть)
                if (this.bot._middleware && Array.isArray(this.bot._middleware)) {
                    this.bot._middleware.length = 0;
                }
                
                console.log(`✅ Полная очистка обработчиков завершена для бота ${this.botId}`);
                
            } catch (cleanupError) {
                console.log(`⚠️ Предупреждение при очистке обработчиков для бота ${this.botId}: ${cleanupError.message}`);
                // Продолжаем работу даже при ошибках очистки
            }
        }
    }
    
    /**
     * Настройка обработчиков бота
     */
    setupBotHandlers() {
        // 🔥 СНАЧАЛА ОЧИЩАЕМ СТАРЫЕ ОБРАБОТЧИКИ
        this.clearOldHandlers();
        
        // Обработчик ошибок polling
        this.bot.on('polling_error', (error) => {
            this.metrics.errors++;
            
            // Умное подавление 409 ошибок
            const is409Error = error.code === 'ETELEGRAM' && error.response?.statusCode === 409;
            if (is409Error) {
                const botAge = Date.now() - this.startTime;
                if (botAge < 120000) { // Первые 2 минуты
                    return; // Не логируем 409 для новых ботов
                }
            }
            
            // 🚦 ИСПОЛЬЗУЕМ THROTTLED ЛОГИРОВАНИЕ
            this.throttledLog('error', `Polling error: ${error.message}`, { 
                code: error.code,
                botAge: Date.now() - this.startTime 
            });
        });
        
        // 🔥 ОБРАБОТЧИК СООБЩЕНИЙ С ДЕДУПЛИКАЦИЕЙ
        this.bot.on('message', async (msg) => {
            try {
                this.metrics.messages++;
                
                // 🔥 ПРОВЕРКА ДЕДУПЛИКАЦИИ
                if (this.isDuplicateMessage(msg)) {
                    this.sendLog('warn', `⚠️ ДУБЛИРУЮЩЕЕ сообщение от ${msg.from.id}: "${msg.text}" (ID: ${msg.message_id})`);
                    return; // Пропускаем дублирующие сообщения
                }
                
                if (msg.text && !msg.text.startsWith('/')) {
                    await this.handleMessage(msg);
                }
            } catch (error) {
                this.metrics.errors++;
                this.sendLog('error', `Ошибка обработки сообщения: ${error.message}`);
            }
        });
        
        // Обработчик команд
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            await this.bot.sendMessage(chatId, `Привет! Я ассистент "${this.assistant.name}". Чем могу помочь?`);
        });
        

        
        // 🔥 ЗАПУСК ОЧИСТКИ СТАРЫХ СООБЩЕНИЙ
        this.startMessageCleanup();
        
        console.log(`✅ Обработчики настроены для бота ${this.botId} с дедупликацией`);
    }
    
    /**
     * 🔥 ПРОВЕРКА НА ДУБЛИРУЮЩИЕ СООБЩЕНИЯ
     */
    isDuplicateMessage(msg) {
        const messageKey = `${msg.from.id}_${msg.message_id}_${msg.text}`;
        const now = Date.now();
        
        // Проверяем, обрабатывали ли мы это сообщение в последние 30 секунд
        if (this.processedMessages.has(messageKey)) {
            const lastProcessed = this.processedMessages.get(messageKey);
            if (now - lastProcessed < 30000) { // 30 секунд
                return true; // Это дубликат
            }
        }
        
        // Записываем сообщение как обработанное
        this.processedMessages.set(messageKey, now);
        return false;
    }
    
    /**
     * Запуск очистки старых сообщений (каждые 5 минут)
     */
    startMessageCleanup() {
        if (this.messageCleanupInterval) {
            clearInterval(this.messageCleanupInterval);
        }
        
        this.messageCleanupInterval = setInterval(() => {
            const now = Date.now();
            const maxAge = 10 * 60 * 1000; // 10 минут
            
            // 🔥 ОЧИСТКА СТАРЫХ СООБЩЕНИЙ ДЛЯ ПРЕДОТВРАЩЕНИЯ УТЕЧЕК
            let cleanedCount = 0;
            for (const [messageId, timestamp] of this.processedMessages) {
                if (now - timestamp > maxAge) {
                    this.processedMessages.delete(messageId);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`🧹 Очищено ${cleanedCount} старых записей сообщений для бота ${this.botId}`);
            }
            
            // 🔥 ПРОВЕРКА РАЗМЕРА И ПРИНУДИТЕЛЬНАЯ ОЧИСТКА
            if (this.processedMessages.size > 10000) {
                console.log(`⚠️ Слишком много записей сообщений (${this.processedMessages.size}), принудительная очистка`);
                
                // Оставляем только последние 5000 записей
                const entries = Array.from(this.processedMessages.entries())
                    .sort((a, b) => b[1] - a[1]) // Сортируем по времени (новые первые)
                    .slice(0, 5000);
                
                this.processedMessages.clear();
                entries.forEach(([id, time]) => this.processedMessages.set(id, time));
                
                console.log(`🔥 Принудительно очищено до 5000 записей`);
            }
            
        }, 5 * 60 * 1000); // Каждые 5 минут
        
        console.log(`🧹 Автоматическая очистка сообщений запущена для бота ${this.botId}`);
    }
    
    /**
     * 🚦 УМНОЕ ЛОГИРОВАНИЕ С THROTTLING
     * Подавляет повторяющиеся ошибки, ведет подсчет
     */
    throttledLog(level, message, extra = {}) {
        const errorKey = `${level}:${message}`;
        const now = Date.now();
        
        if (!this.errorThrottling.has(errorKey)) {
            this.errorThrottling.set(errorKey, {
                lastLogged: 0,
                count: 0,
                suppressedCount: 0
            });
        }
        
        const errorData = this.errorThrottling.get(errorKey);
        errorData.count++;
        
        // Проверяем, можно ли логировать
        const canLog = (now - errorData.lastLogged) > this.logThrottleInterval;
        
        if (canLog) {
            // Логируем с информацией о подавленных
            let logMessage = message;
            if (errorData.suppressedCount > 0) {
                logMessage += ` [${errorData.suppressedCount} подавлено за последние ${Math.round(this.logThrottleInterval/1000)}с]`;
            }
            
            this.sendLog(level, logMessage, extra);
            errorData.lastLogged = now;
            errorData.suppressedCount = 0;
        } else {
            // Подавляем, но считаем
            errorData.suppressedCount++;
        }
    }
    
    /**
     * 🚦 ЗАПУСК ПЕРИОДИЧЕСКОЙ СВОДКИ ПОДАВЛЕННЫХ ЛОГОВ
     */
    startLogSummary() {
        this.summaryInterval = setInterval(() => {
            const now = Date.now();
            let totalSuppressed = 0;
            const suppressedByType = new Map();
            
            for (const [errorKey, data] of this.errorThrottling) {
                if (data.suppressedCount > 0) {
                    totalSuppressed += data.suppressedCount;
                    const [level, message] = errorKey.split(':', 2);
                    const shortMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
                    suppressedByType.set(`${level}: ${shortMessage}`, data.suppressedCount);
                }
            }
            
            if (totalSuppressed > 0) {
                const summary = Array.from(suppressedByType.entries())
                    .map(([key, count]) => `${key} (${count})`)
                    .join(', ');
                    
                this.sendLog('info', `📊 Сводка подавленных логов за минуту: ${totalSuppressed} сообщений. Детали: ${summary}`);
                
                // Очищаем счетчики подавленных
                for (const data of this.errorThrottling.values()) {
                    data.suppressedCount = 0;
                }
            }
        }, 60000); // Каждую минуту
        
        console.log(`📊 Сводка подавленных логов запущена для бота ${this.botId}`);
    }
    
    /**
     * Обработка пользовательского сообщения
     */
    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;
        
        // Извлекаем информацию о пользователе из Telegram
        const userInfo = {
            telegram_username: msg.from.username || null,
            first_name: msg.from.first_name || null,
            last_name: msg.from.last_name || null,
            language_code: msg.from.language_code || null
        };
        
        this.sendLog('info', `Сообщение от ${userId} (@${userInfo.telegram_username || 'noUsername'}): "${text}"`);
        
        try {
            // Получаем или создаем диалог с информацией о пользователе
            const dialog = await this.getOrCreateDialog(userId, chatId, this.assistant.id, userInfo);
            
            // Сохраняем сообщение пользователя
            await this.saveMessage(dialog.id, 'user', text);
            
            // 🔥 ПОЛУЧАЕМ АКТУАЛЬНЫЙ СТАТУС ДИАЛОГА ИЗ БД
            const freshDialog = await this.getFreshDialogStatus(dialog.id);
            
            // 🔥 ПРОВЕРКА HANDOFF С АКТУАЛЬНЫМИ ДАННЫМИ
            // Блокируем AI при статусах 'requested' и 'active' (унификация с сайтом)
            if (freshDialog.handoff_status === 'requested' || freshDialog.handoff_status === 'active') {
                // Диалог требует/у оператора - не генерируем AI ответ
                this.sendLog('info', `🛑 Диалог ${dialog.id} требует оператора (handoff_status: ${freshDialog.handoff_status}), пропуск AI ответа`);
                return;
            }
            
            // Проверка на ключевые слова handoff
            if (this.shouldRequestHandoff(text)) {
                await this.requestHandoff(dialog.id, 'keyword', text);
                await this.bot.sendMessage(chatId, 'Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время');
                return;
            }
            
            // Получаем ответ от AI
            const aiResponse = await this.getAIResponse(userId, text, this.assistant, dialog.id);
            
            // 🔥 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА HANDOFF ПЕРЕД ОТПРАВКОЙ ОТВЕТА
            const finalDialogStatus = await this.getFreshDialogStatus(dialog.id);
            if (finalDialogStatus.handoff_status === 'requested' || finalDialogStatus.handoff_status === 'active') {
                this.sendLog('info', `🛑 Диалог ${dialog.id} перехвачен во время обработки AI ответа, не отправляем ответ`);
                return;
            }
            
            // 🔥 ПРОВЕРКА ПОСЛЕ AI ОТВЕТА НА FALLBACK
            if (this.shouldRequestHandoffAfterAI(text, aiResponse, dialog)) {
                await this.requestHandoff(dialog.id, 'fallback', text);
                await this.bot.sendMessage(chatId, 'Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время');
                return;
            }
            
            // Сохраняем ответ ассистента
            await this.saveMessage(dialog.id, 'assistant', aiResponse);
            
            // Конвертируем markdown для Telegram и отправляем ответ пользователю
            const telegramResponse = this.convertMarkdownForTelegram(aiResponse);
            await this.bot.sendMessage(chatId, telegramResponse, { parse_mode: 'HTML' });
            

            
        } catch (error) {
            this.metrics.errors++;
            await this.bot.sendMessage(chatId, 'Извините, произошла ошибка при обработке сообщения.', { parse_mode: 'HTML' });
            this.sendLog('error', `Ошибка обработки сообщения: ${error.message}`);
        }
    }
    
    /**
     * Получение или создание диалога
     */
    async getOrCreateDialog(userId, telegramChatId, assistantId, userInfo = {}) {
        try {
            const searchParams = new URLSearchParams({
                user_id: this.config.user_id,
                assistant_id: assistantId,
                telegram_chat_id: telegramChatId
            });

            const response = await axios.get(`http://127.0.0.1:8000/api/bot/dialogs?${searchParams}`);
            const dialogs = response.data;

            if (dialogs.length > 0) {
                // Если диалог найден, но у него нет telegram_username, обновляем его
                const existingDialog = dialogs[0];
                if (userInfo.telegram_username && !existingDialog.telegram_username) {
                    await this.updateDialogUserInfo(existingDialog.id, userInfo);
                }
                return existingDialog;
            }

            // Создание нового диалога с информацией о пользователе
            const createData = {
                user_id: this.config.user_id,
                assistant_id: assistantId,
                telegram_chat_id: telegramChatId,
                telegram_username: userInfo.telegram_username,
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                language_code: userInfo.language_code
            };

            const createResponse = await axios.post(`http://127.0.0.1:8000/api/bot/dialogs`, createData);
            return createResponse.data;

        } catch (error) {
            this.sendLog('error', `Ошибка получения/создания диалога: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Обновление информации о пользователе в диалоге
     */
    async updateDialogUserInfo(dialogId, userInfo) {
        try {
            await axios.patch(`http://127.0.0.1:8000/api/bot/dialogs/${dialogId}/user-info`, userInfo);
            this.sendLog('info', `Обновлена информация о пользователе для диалога ${dialogId}`);
        } catch (error) {
            this.sendLog('error', `Ошибка обновления информации о пользователе: ${error.message}`);
        }
    }
    
    /**
     * Сохранение сообщения
     */
    async saveMessage(dialogId, sender, text) {
        try {
            await axios.post(`http://127.0.0.1:8000/api/bot/dialogs/${dialogId}/messages`, {
                sender: sender,
                text: text
            });
        } catch (error) {
            this.sendLog('error', `Ошибка сохранения сообщения: ${error.message}`);
        }
    }
    
    /**
     * Получение ответа от AI
     */
    async getAIResponse(userId, text, assistant, dialogId = null) {
        try {
            const response = await axios.post(`http://127.0.0.1:8000/api/bot/ai-response`, {
                user_id: this.config.user_id,
                message: text,
                assistant_id: assistant.id,
                dialog_id: dialogId
            });
            
            return response.data.response || 'Извините, не смог обработать ваш запрос.';
        } catch (error) {
            this.sendLog('error', `Ошибка получения AI ответа: ${error.message}`);
            return 'Произошла ошибка при обработке запроса.';
        }
    }
    

    

    
    /**
     * Обработка AI ответа (устаревший метод, оставляем для совместимости)
     */
    async handleAIResponse(data) {
        try {
            const { chatId, response, dialogId } = data;
            
            // 🔥 ПРОВЕРКА HANDOFF ДАЖЕ В УСТАРЕВШЕМ МЕТОДЕ
            if (dialogId) {
                const dialogStatus = await this.getFreshDialogStatus(dialogId);
                if (dialogStatus.handoff_status === 'requested' || dialogStatus.handoff_status === 'active') {
                    this.sendLog('info', `🛑 Диалог ${dialogId} перехвачен, не отправляем устаревший AI ответ`);
                    return;
                }
            }
            
            await this.bot.sendMessage(chatId, response);
        } catch (error) {
            this.sendLog('error', `Ошибка отправки AI ответа: ${error.message}`);
        }
    }
    
    /**
     * Ультра-стабильная остановка бота
     */
    async stopBot() {
        try {
            if (this.bot) {
                console.log(`⏹️ УЛЬТРА-СТАБИЛЬНАЯ остановка бота ${this.botId}`);
                
                // Rate limiting отключен
                
                // 🔥 ОЧИСТКА ДЕДУПЛИКАЦИИ СООБЩЕНИЙ
                if (this.messageCleanupInterval) {
                    clearInterval(this.messageCleanupInterval);
                    this.messageCleanupInterval = null;
                }
                this.processedMessages.clear();
                console.log(`🧹 Очищена система дедупликации для бота ${this.botId}`);
                
                // 🚦 ОЧИСТКА THROTTLING ЛОГОВ
                if (this.summaryInterval) {
                    clearInterval(this.summaryInterval);
                    this.summaryInterval = null;
                }
                this.errorThrottling.clear();
                console.log(`🚦 Очищена система throttling логов для бота ${this.botId}`);
                
                // 1. Остановка polling с тайм-аутом
                if (this.bot.isPolling()) {
                    try {
                        // Создаем Promise с тайм-аутом для stopPolling
                        const stopPromise = this.bot.stopPolling({ 
                            cancel: true, 
                            reason: 'Ultra-stable worker shutdown' 
                        });
                        
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Stop polling timeout')), 10000);
                        });
                        
                        await Promise.race([stopPromise, timeoutPromise]);
                        console.log(`🕒 Polling для бота ${this.botId} остановлен`);
                        
                    } catch (stopError) {
                        console.log(`⚠️ Ошибка при остановке polling для бота ${this.botId}: ${stopError.message}`);
                        
                        // Принудительная остановка при ошибке
                        if (this.bot._polling) {
                            console.log(`🔨 Принудительная остановка polling для бота ${this.botId}`);
                            this.bot._polling.abort = true;
                            this.bot._polling = null;
                        }
                    }
                }

                // 2. Очистка всех обработчиков событий
                try {
                    this.bot.removeAllListeners();
                    console.log(`🧹 Обработчики событий очищены для бота ${this.botId}`);
                } catch (listenerError) {
                    console.log(`⚠️ Ошибка очистки обработчиков для бота ${this.botId}: ${listenerError.message}`);
                }

                // 3. Дополнительная очистка внутренних структур
                try {
                    if (this.bot._polling) {
                        this.bot._polling.abort = true;
                        this.bot._polling = null;
                    }
                    
                    // Очистка pending requests
                    if (this.bot._textRegexpCallbacks && Array.isArray(this.bot._textRegexpCallbacks)) {
                        this.bot._textRegexpCallbacks.length = 0;
                    }
                    
                    if (this.bot._onReplyToMessages && typeof this.bot._onReplyToMessages.clear === 'function') {
                        this.bot._onReplyToMessages.clear();
                    }
                    
                } catch (cleanupError) {
                    console.log(`⚠️ Ошибка дополнительной очистки для бота ${this.botId}: ${cleanupError.message}`);
                }

                // 4. Принудительная сборка мусора
                if (global.gc) {
                    console.log(`🗑️ Принудительная сборка мусора после остановки бота ${this.botId}`);
                    global.gc();
                }

                // 5. Дополнительная пауза для полного освобождения ресурсов
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                this.bot = null;
                this.sendResponse('stopped', { botId: this.botId });
            }
        } catch (error) {
            this.sendError(`Ошибка ультра-стабильной остановки бота: ${error.message}`);
            // В любом случае отправляем подтверждение остановки
            this.sendResponse('stopped', { botId: this.botId });
        }
    }
    
    /**
     * Перезапуск бота
     */
    async restartBot(data) {
        await this.stopBot();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза 2 секунды
        await this.startBot(data);
        this.metrics.restarts++;
    }
    
    /**
     * 🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА НАСТРОЕК АССИСТЕНТА
     * Обновляет промпт, модель AI и другие настройки без перезапуска воркера
     */
    async hotReloadSettings(data) {
        try {
            const { assistant, botConfig } = data;
            
            console.log(`🔥 ГОРЯЧАЯ ПЕРЕЗАГРУЗКА настроек для бота ${this.botId}`);
            console.log(`📝 Старый промпт: "${this.assistant?.system_prompt?.substring(0, 50)}..."`);
            console.log(`📝 Новый промпт: "${assistant?.system_prompt?.substring(0, 50)}..."`);
            console.log(`🤖 Старая модель: ${this.assistant?.ai_model}`);
            console.log(`🤖 Новая модель: ${assistant?.ai_model}`);
            
            // 🔥 БЕЗОПАСНОЕ ОБНОВЛЕНИЕ С ПРОВЕРКАМИ
            const oldAssistant = { ...this.assistant };
            const oldConfig = { ...this.config };
            
            try {
                // Обновляем данные ассистента
                if (assistant) {
                    this.assistant = {
                        ...this.assistant,
                        ...assistant
                    };
                }
                
                // Обновляем конфигурацию бота (если есть)
                if (botConfig) {
                    this.config = {
                        ...this.config,
                        ...botConfig
                    };
                }
                
                // 🔥 РАСШИРЕННАЯ ОЧИСТКА КЕШЕЙ
                if (this.aiResponseCache) {
                    console.log(`🧹 Очистка кеша AI ответов для бота ${this.botId}`);
                    this.aiResponseCache.clear();
                }
                
                // Очищаем кеш обработанных сообщений при смене ассистента
                if (assistant && assistant.id !== oldAssistant.id) {
                    console.log(`🧹 Смена ассистента: очистка кеша сообщений для бота ${this.botId}`);
                    this.processedMessages.clear();
                }
                
                // 🔥 ПРОВЕРКА ЦЕЛОСТНОСТИ ПОСЛЕ ОБНОВЛЕНИЯ
                if (!this.assistant || !this.assistant.id) {
                    throw new Error('Данные ассистента повреждены после обновления');
                }
                
                this.sendResponse('hot_reloaded', {
                    botId: this.botId,
                    assistant: {
                        id: this.assistant.id,
                        name: this.assistant.name,
                        ai_model: this.assistant.ai_model,
                        system_prompt: this.assistant.system_prompt?.substring(0, 100) + '...'
                    },
                    timestamp: Date.now(),
                    success: true
                });
                
                console.log(`✅ Горячая перезагрузка завершена для бота ${this.botId}`);
                
            } catch (updateError) {
                // 🔥 ОТКАТ ИЗМЕНЕНИЙ ПРИ ОШИБКЕ
                console.log(`❌ Ошибка при обновлении настроек бота ${this.botId}, откатываем изменения`);
                this.assistant = oldAssistant;
                this.config = oldConfig;
                throw updateError;
            }
            
        } catch (error) {
            this.metrics.errors++;
            this.sendError(`Ошибка горячей перезагрузки настроек: ${error.message}`);
            
            // Отправляем сигнал о неудачной перезагрузке
            this.sendResponse('hot_reload_failed', {
                botId: this.botId,
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Отправка статуса
     */
    sendStatus() {
        const status = {
            botId: this.botId,
            pid: process.pid,
            isRunning: this.bot && this.bot.isPolling(),
            uptime: Date.now() - this.startTime,
            memoryUsage: process.memoryUsage(),
            config: this.config ? {
                platform: this.config.platform,
                is_active: this.config.is_active
            } : null,
            assistant: this.assistant ? {
                id: this.assistant.id,
                name: this.assistant.name
            } : null
        };
        
        this.sendResponse('status', status);
    }
    
    /**
     * Отправка метрик
     */
    sendMetrics() {
        this.metrics.uptime = Date.now() - this.startTime;
        this.sendResponse('metrics', {
            botId: this.botId,
            metrics: this.metrics,
            timestamp: Date.now()
        });
    }
    
    /**
     * Отправка ответа мастер-процессу
     */
    sendResponse(type, data) {
        try {
            if (process.send && process.connected) {
                process.send({
                    type: type,
                    data: data,
                    timestamp: Date.now(),
                    pid: process.pid
                });
            }
        } catch (error) {
            // Игнорируем ошибки закрытого IPC канала
            if (error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                console.error(`❌ Ошибка отправки ответа: ${error.message}`);
            }
        }
    }
    
    /**
     * Отправка запроса мастер-процессу
     */
    sendRequest(type, data) {
        try {
            if (process.send && process.connected) {
                process.send({
                    type: 'request',
                    requestType: type,
                    data: data,
                    timestamp: Date.now(),
                    pid: process.pid
                });
            }
        } catch (error) {
            // Игнорируем ошибки закрытого IPC канала
            if (error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                console.error(`❌ Ошибка отправки запроса: ${error.message}`);
            }
        }
    }
    
    /**
     * Отправка лога мастер-процессу
     */
    sendLog(level, message, meta = {}) {
        try {
            if (process.send && process.connected) {
                process.send({
                    type: 'log',
                    data: {
                        level: level,
                        message: message,
                        meta: {
                            ...meta,
                            botId: this.botId,
                            pid: process.pid
                        }
                    },
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            // Игнорируем ошибки закрытого IPC канала
            if (error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                console.error(`❌ Ошибка отправки лога: ${error.message}`);
            }
        }
    }
    
    /**
     * Отправка ошибки мастер-процессу
     */
    sendError(message, error = null) {
        this.sendLog('error', message, error ? { stack: error.stack } : {});
        this.sendResponse('error', { message, error: error?.message });
    }
    
    /**
     * Корректное завершение работы
     */
    async shutdown() {
        console.log(`🔄 Завершение работы воркера ${this.botId}`);
        
        // 🔥 ОЧИСТКА ДЕДУПЛИКАЦИИ
        if (this.messageCleanupInterval) {
            clearInterval(this.messageCleanupInterval);
            this.messageCleanupInterval = null;
        }
        this.processedMessages.clear();
        
        // 🚦 ОЧИСТКА THROTTLING ЛОГОВ
        if (this.summaryInterval) {
            clearInterval(this.summaryInterval);
            this.summaryInterval = null;
        }
        this.errorThrottling.clear();
        
        await this.stopBot();
        process.exit(0);
    }

    /**
     * 🌐 ОБРАБОТКА WEBHOOK ОБНОВЛЕНИЙ
     */
    async handleWebhookUpdate(data) {
        try {
            const { botId, update } = data;
            
            if (botId !== this.botId) {
                console.warn(`⚠️ Получено обновление для неверного бота: ожидался ${this.botId}, получен ${botId}`);
                return;
            }
            
            // Обрабатываем различные типы обновлений
            if (update.message) {
                await this.processMessage(update.message);

            } else if (update.inline_query) {
                await this.processInlineQuery(update.inline_query);
            } else if (update.chosen_inline_result) {
                await this.processChosenInlineResult(update.chosen_inline_result);
            } else {
                console.log(`📨 Получен неизвестный тип обновления для бота ${botId}:`, Object.keys(update));
            }
            
        } catch (error) {
            this.metrics.errors++;
            console.error(`❌ Ошибка обработки webhook обновления:`, error.message);
        }
    }
    
    /**
     * Обработка сообщения из webhook
     */
    async processMessage(msg) {
        try {
            this.metrics.messages++;
            
            // 🔥 ПРОВЕРКА ДЕДУПЛИКАЦИИ
            if (this.isDuplicateMessage(msg)) {
                this.sendLog('warn', `⚠️ ДУБЛИРУЮЩЕЕ сообщение от ${msg.from.id}: "${msg.text}" (ID: ${msg.message_id})`);
                return;
            }
            
            // Обработка команд
            if (msg.text && msg.text.startsWith('/start')) {
                const chatId = msg.chat.id;
                await this.bot.sendMessage(chatId, `Привет! Я ассистент "${this.assistant.name}". Чем могу помочь?`);
                return;
            }
            
            // Обработка обычных сообщений
            if (msg.text && !msg.text.startsWith('/')) {
                await this.handleMessage(msg);
            }
            
        } catch (error) {
            this.metrics.errors++;
            this.sendLog('error', `Ошибка обработки сообщения: ${error.message}`);
        }
    }
    

    
    /**
     * Обработка inline query из webhook
     */
    async processInlineQuery(inlineQuery) {
        try {
            // Базовая обработка inline запросов
            await this.bot.answerInlineQuery(inlineQuery.id, []);
        } catch (error) {
            this.sendLog('error', `Ошибка обработки inline query: ${error.message}`);
        }
    }
    
    /**
     * Обработка chosen inline result из webhook
     */
    async processChosenInlineResult(chosenInlineResult) {
        try {
            // Логируем выбранный inline результат
            this.sendLog('info', `Выбран inline результат: ${chosenInlineResult.result_id}`);
        } catch (error) {
            this.sendLog('error', `Ошибка обработки chosen inline result: ${error.message}`);
        }
    }

    /**
     * Конвертирует markdown в HTML-разметку для Telegram
     */
    convertMarkdownForTelegram(text) {
        if (!text) return text;

        // 1) Предварительная санитаризация Markdown, чтобы убрать лишние символы
        text = this.sanitizeMarkdownForTelegram(text);

        // 2) Конвертация базового Markdown в HTML теги Telegram
        // **жирный** → <b>жирный</b>
        text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // *курсив* → <i>курсив</i>
        text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');

        // 3) Экранируем HTML символы (кроме наших тегов)
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Возвращаем наши теги обратно
            .replace(/&lt;b&gt;/g, '<b>')
            .replace(/&lt;\/b&gt;/g, '</b>')
            .replace(/&lt;i&gt;/g, '<i>')
            .replace(/&lt;\/i&gt;/g, '</i>');

        return text;
    }

    /**
     * Убирает из ответа «шумный» Markdown: заголовки ###, маркеры списков -, нумерацию 1., блоки цитат > и бэктики
     * Сохраняет структуру списков с маркером • и аккуратные переносы строк
     */
    sanitizeMarkdownForTelegram(text) {
        if (!text) return text;

        let t = String(text);

        // Унификация переносов строк
        t = t.replace(/\r\n?/g, '\n');

        // Удаляем блоки цитат в начале строк: "> "
        t = t.replace(/^\s*>\s?/gm, '');

        // Удаляем маркеры заголовков (#, ##, ### ...) — оставляем сам текст
        t = t.replace(/^\s{0,3}#{1,6}\s*/gm, '');

        // Преобразуем маркированные списки "- " или "* " → "• " (с сохранением отступов)
        t = t.replace(/^(\s*)[-*]\s+/gm, (m, indent) => `${indent}• `);

        // Преобразуем нумерованные списки "1. " → "• " (с сохранением отступов)
        t = t.replace(/^(\s*)\d+\.\s+/gm, (m, indent) => `${indent}• `);

        // Удаляем ограждения кода ```...```, оставляя содержимое
        t = t.replace(/```([\s\S]*?)```/g, (match, code) => code);

        // Удаляем инлайн-бэктики вокруг текста `code` → code
        t = t.replace(/`([^`]+)`/g, '$1');

        // Ограничиваем подряд идущие пустые строки до двух
        t = t.replace(/\n{3,}/g, '\n\n');

        // Тримим лишние пробелы по краям строк
        t = t.split('\n').map(line => line.replace(/[\t ]+$/g, '')).join('\n');

        return t.trim();
    }
    
    // 🔥 НОВЫЕ МЕТОДЫ ДЛЯ HANDOFF СИСТЕМЫ
    
    /**
     * Проверка на ключевые слова handoff
     */
    shouldRequestHandoff(text) {
        const keywords = [
            'оператор', 'менеджер', 'живой человек', 'поддержка', 'помощь', 
            'жалоба', 'проблема', 'консультант', 'специалист',
            'operator', 'human', 'manager', 'support', 'help', 'complaint', 'problem'
        ];
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword));
    }
    
    /**
     * Проверка после AI ответа на необходимость handoff
     */
    shouldRequestHandoffAfterAI(userText, aiResponse, dialog) {
        const fallbackPatterns = [
            'не могу ответить', 'не нашёл информации', 'обратитесь в поддержку',
            'не знаю', 'затрудняюсь ответить', 'недостаточно информации',
            'не понимаю', 'не уверен', 'cannot answer', 'don\'t know'
        ];
        
        const aiLower = aiResponse.toLowerCase();
        return fallbackPatterns.some(pattern => aiLower.includes(pattern));
    }
    
    /**
     * Запрос handoff через API
     */
    async requestHandoff(dialogId, reason, lastUserText) {
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/dialogs/${dialogId}/handoff/request`,
                {
                    reason: reason,
                    last_user_text: lastUserText,
                    request_id: this.generateUUID()
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            
            if (response.status === 200) {
                this.sendLog('info', `Handoff запрошен для диалога ${dialogId}, причина: ${reason}`);
                return true;
            }
            
        } catch (error) {
            this.sendLog('error', `Ошибка запроса handoff для диалога ${dialogId}: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Отправка сообщения оператора пользователю
     */
    async sendOperatorMessage(data) {
        try {
            this.sendLog('info', `🔄 [BOT_WORKER] Получена команда отправки сообщения оператора. Бот ID: ${this.botId}`);
            this.sendLog('info', `🔄 [BOT_WORKER] Данные команды: ${JSON.stringify(data)}`);
            
            const { telegram_chat_id, text } = data;
            
            if (!telegram_chat_id || !text) {
                this.sendLog('error', '❌ [BOT_WORKER] Отсутствуют обязательные параметры telegram_chat_id или text');
                return;
            }
            
            this.sendLog('info', `🔄 [BOT_WORKER] Параметры корректны. Chat ID: ${telegram_chat_id}, текст: ${text.substring(0, 100)}...`);
            
            // Проверяем состояние бота
            if (!this.bot) {
                this.sendLog('error', '❌ [BOT_WORKER] Экземпляр бота не инициализирован');
                return;
            }
            
            this.sendLog('info', `🔄 [BOT_WORKER] Отправляем сообщение через bot.sendMessage...`);
            
            // Отправляем сообщение от оператора в Telegram
            const result = await this.bot.sendMessage(telegram_chat_id, text);
            
            this.sendLog('info', `✅ [BOT_WORKER] Сообщение оператора успешно отправлено в чат ${telegram_chat_id}`);
            this.sendLog('info', `✅ [BOT_WORKER] Результат отправки: message_id=${result.message_id}, chat_id=${result.chat.id}`);
            this.sendLog('info', `✅ [BOT_WORKER] Текст сообщения: ${text.substring(0, 100)}...`);
            
        } catch (error) {
            this.sendLog('error', `❌ [BOT_WORKER] Ошибка отправки сообщения оператора в чат ${data?.telegram_chat_id}: ${error.message}`);
            this.sendLog('error', `❌ [BOT_WORKER] Стек ошибки: ${error.stack}`);
            
            // Дополнительная диагностика
            if (error.response) {
                this.sendLog('error', `❌ [BOT_WORKER] Telegram API ответ: ${JSON.stringify(error.response.data)}`);
            }
            if (error.code) {
                this.sendLog('error', `❌ [BOT_WORKER] Код ошибки: ${error.code}`);
            }
        }
    }
    
    /**
     * Отправка системного сообщения в Telegram (handoff_released и др.)
     */
    async sendSystemMessage(data) {
        try {
            this.sendLog('info', `🔄 [BOT_WORKER] Получена команда отправки системного сообщения. Бот ID: ${this.botId}`);
            
            const { telegram_chat_id, text, system_type } = data;
            
            if (!telegram_chat_id || !text) {
                this.sendLog('error', '❌ [BOT_WORKER] Отсутствуют обязательные параметры telegram_chat_id или text для системного сообщения');
                return;
            }
            
            // Проверяем состояние бота
            if (!this.bot) {
                this.sendLog('error', '❌ [BOT_WORKER] Экземпляр бота не инициализирован для системного сообщения');
                return;
            }
            
            this.sendLog('info', `🔄 [BOT_WORKER] Отправляем системное сообщение (${system_type}): ${text}`);
            
            // Отправляем системное сообщение в Telegram
            const result = await this.bot.sendMessage(telegram_chat_id, text);
            
            this.sendLog('info', `✅ [BOT_WORKER] Системное сообщение успешно отправлено в чат ${telegram_chat_id}`);
            
        } catch (error) {
            this.metrics.errors++;
            this.sendLog('error', `❌ [BOT_WORKER] Ошибка отправки системного сообщения: ${error.message}`);
        }
    }
    
    /**
     * Получение актуального статуса диалога из базы данных
     */
    async getFreshDialogStatus(dialogId) {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/dialogs/${dialogId}/status`);
            const status = response.data;
            this.sendLog('info', `📊 Статус диалога ${dialogId}: handoff_status=${status.handoff_status}, is_taken_over=${status.is_taken_over}`);
            return status;
        } catch (error) {
            this.sendLog('error', `Ошибка получения статуса диалога ${dialogId}: ${error.message}`);
            // Возвращаем безопасное состояние - не блокируем, но логируем ошибку
            return { handoff_status: 'none', is_taken_over: 0 };
        }
    }
    
    /**
     * Генерация UUID для request_id
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Запуск воркера
const worker = new BotWorker();

// Heartbeat для мониторинга
const heartbeatInterval = setInterval(() => {
    try {
        if (process.connected) {
            worker.sendResponse('heartbeat', {
                botId: worker.botId,
                timestamp: Date.now(),
                uptime: Date.now() - worker.startTime
            });
        } else {
            clearInterval(heartbeatInterval);
        }
    } catch (error) {
        // Останавливаем heartbeat если канал закрыт
        clearInterval(heartbeatInterval);
    }
}, 30000); // Каждые 30 секунд

console.log(`🤖 Бот-воркер готов к работе (PID: ${process.pid})`); 
console.log(`🤖 Бот-воркер готов к работе (PID: ${process.pid})`); 