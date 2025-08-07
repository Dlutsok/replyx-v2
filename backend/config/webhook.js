/**
 * 🌐 КОНФИГУРАЦИЯ WEBHOOK ДЛЯ TELEGRAM БОТОВ
 * Поддержка продакшен режима с webhook вместо polling
 */

const config = {
    // Режим работы: 'polling' или 'webhook'
    MODE: process.env.BOT_MODE || 'polling',
    
    // Настройки webhook
    WEBHOOK: {
        // Публичный URL сервера (должен быть HTTPS в продакшене)
        HOST: process.env.WEBHOOK_HOST || 'https://yourdomain.com',
        
        // Порт для webhook сервера
        PORT: process.env.WEBHOOK_PORT || 8443,
        
        // Путь для webhook endpoints
        PATH: process.env.WEBHOOK_PATH || '/webhook',
        
        // SSL сертификат (для самоподписанных)
        SSL_CERT: process.env.WEBHOOK_SSL_CERT || null,
        SSL_KEY: process.env.WEBHOOK_SSL_KEY || null,
        
        // Максимальное количество соединений
        MAX_CONNECTIONS: process.env.WEBHOOK_MAX_CONNECTIONS || 40,
        
        // Список разрешенных IP обновлений (Telegram IPs)
        ALLOWED_UPDATES: [
            'message',
            'callback_query', 
            'inline_query',
            'chosen_inline_result'
        ],
        
        // Секрет для защиты webhook
        SECRET_TOKEN: process.env.WEBHOOK_SECRET || null
    },
    
    // Настройки polling (fallback)
    POLLING: {
        INTERVAL: 1000,
        TIMEOUT: 10,
        AUTO_START: false
    },
    
    // Автоматическое переключение режимов
    AUTO_SWITCH: {
        // Автоматически переключиться на webhook в продакшене
        ENABLE: process.env.AUTO_SWITCH_MODE === 'true',
        
        // Критерии для переключения на webhook
        CRITERIA: {
            // Количество ботов для переключения
            MIN_BOTS: 5,
            // Частота ошибок 409 (в минуту)
            MAX_409_ERRORS_PER_MINUTE: 10
        }
    }
};

// Детекция продакшен среды
const isProduction = process.env.NODE_ENV === 'production' || 
                   process.env.WEBHOOK_HOST?.includes('https://');

// Автоматический выбор режима
if (config.AUTO_SWITCH.ENABLE) {
    if (isProduction && config.WEBHOOK.HOST.startsWith('https://')) {
        config.MODE = 'webhook';
        console.log('🌐 Автоматически выбран WEBHOOK режим для продакшена');
    } else {
        config.MODE = 'polling';
        console.log('🔄 Автоматически выбран POLLING режим для разработки');
    }
}

// Валидация конфигурации
function validateConfig() {
    if (config.MODE === 'webhook') {
        if (!config.WEBHOOK.HOST || !config.WEBHOOK.HOST.startsWith('https://')) {
            throw new Error('WEBHOOK режим требует HTTPS URL в WEBHOOK_HOST');
        }
        
        if (!config.WEBHOOK.PORT) {
            throw new Error('WEBHOOK режим требует указания WEBHOOK_PORT');
        }
        
        console.log('✅ Конфигурация webhook валидна');
    }
}

// Получение URL для конкретного бота
function getWebhookUrl(botToken) {
    if (config.MODE !== 'webhook') {
        return null;
    }
    
    const botId = botToken.split(':')[0];
    return `${config.WEBHOOK.HOST}:${config.WEBHOOK.PORT}${config.WEBHOOK.PATH}/${botId}`;
}

// Получение настроек webhook для бота
function getWebhookSettings(botToken) {
    if (config.MODE !== 'webhook') {
        return null;
    }
    
    return {
        url: getWebhookUrl(botToken),
        max_connections: config.WEBHOOK.MAX_CONNECTIONS,
        allowed_updates: config.WEBHOOK.ALLOWED_UPDATES,
        secret_token: config.WEBHOOK.SECRET_TOKEN,
        drop_pending_updates: true
    };
}

// Экспорт
module.exports = {
    config,
    isProduction,
    validateConfig,
    getWebhookUrl,
    getWebhookSettings,
    
    // Утилиты
    isWebhookMode: () => config.MODE === 'webhook',
    isPollingMode: () => config.MODE === 'polling',
    
    // Telegram IP диапазоны для webhook (официальные)
    TELEGRAM_IPS: [
        '149.154.160.0/20',
        '91.108.4.0/22'
    ]
}; 