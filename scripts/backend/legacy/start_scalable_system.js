#!/usr/bin/env node

/**
 * 🚀 ЗАПУСК МАСШТАБИРУЕМОЙ СИСТЕМЫ БОТОВ
 * Скрипт для запуска мастер-процесса и мониторинга
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ScalableSystemLauncher {
    constructor() {
        this.processes = new Map();
        this.config = {
            masterScript: path.join(__dirname, '../workers/master/scalable_bot_manager.js'),
            logDir: path.join(__dirname, 'logs'),
            pidDir: path.join(__dirname, 'pids')
        };
        
        this.setupDirectories();
        this.setupSignalHandlers();
    }
    
    /**
     * Создание необходимых директорий
     */
    setupDirectories() {
        [this.config.logDir, this.config.pidDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Настройка обработчиков сигналов
     */
    setupSignalHandlers() {
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('exit', () => this.cleanup());
    }
    
    /**
     * Запуск мастер-процесса
     */
    startMaster() {
        console.log('🚀 Запуск Scalable Bot Manager...');
        
        const masterLogFile = path.join(this.config.logDir, 'master.log');
        const masterPidFile = path.join(this.config.pidDir, 'master.pid');
        
        // Создаем потоки для логов
        const logStream = fs.createWriteStream(masterLogFile, { flags: 'a' });
        
        // Запускаем мастер-процесс
        const masterProcess = spawn('node', [this.config.masterScript], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });
        
        // Сохраняем PID
        fs.writeFileSync(masterPidFile, masterProcess.pid.toString());
        
        // Перенаправляем вывод в лог и консоль
        masterProcess.stdout.on('data', (data) => {
            const message = data.toString();
            process.stdout.write(message);
            logStream.write(`[STDOUT] ${new Date().toISOString()} ${message}`);
        });
        
        masterProcess.stderr.on('data', (data) => {
            const message = data.toString();
            process.stderr.write(message);
            logStream.write(`[STDERR] ${new Date().toISOString()} ${message}`);
        });
        
        masterProcess.on('exit', (code, signal) => {
            console.log(`🔄 Мастер-процесс завершился (код: ${code}, сигнал: ${signal})`);
            logStream.end();
            
            // Удаляем PID файл
            if (fs.existsSync(masterPidFile)) {
                fs.unlinkSync(masterPidFile);
            }
            
            // Автоматический перезапуск при неожиданном завершении
            if (code !== 0 && signal !== 'SIGTERM') {
                console.log('🔄 Автоматический перезапуск мастер-процесса через 5 секунд...');
                setTimeout(() => {
                    this.startMaster();
                }, 5000);
            }
        });
        
        masterProcess.on('error', (error) => {
            console.error('❌ Ошибка запуска мастер-процесса:', error.message);
            logStream.write(`[ERROR] ${new Date().toISOString()} ${error.message}\n`);
        });
        
        this.processes.set('master', {
            process: masterProcess,
            logStream: logStream,
            pidFile: masterPidFile
        });
        
        console.log(`✅ Мастер-процесс запущен (PID: ${masterProcess.pid})`);
        console.log(`📋 Логи: ${masterLogFile}`);
        console.log(`🌐 API: http://localhost:3001`);
        console.log(`📊 Мониторинг: откройте test-scalable-system.html в браузере`);
    }
    
    /**
     * Проверка статуса системы
     */
    checkStatus() {
        const masterPidFile = path.join(this.config.pidDir, 'master.pid');
        
        if (fs.existsSync(masterPidFile)) {
            const pid = parseInt(fs.readFileSync(masterPidFile, 'utf8'));
            
            try {
                process.kill(pid, 0); // Проверяем, существует ли процесс
                console.log(`✅ Мастер-процесс работает (PID: ${pid})`);
                return true;
            } catch (error) {
                console.log('❌ Мастер-процесс не найден');
                fs.unlinkSync(masterPidFile); // Удаляем устаревший PID файл
                return false;
            }
        } else {
            console.log('❌ Система не запущена');
            return false;
        }
    }
    
    /**
     * Остановка системы
     */
    async stop() {
        console.log('⏹️ Остановка Scalable Bot Manager...');
        
        const masterPidFile = path.join(this.config.pidDir, 'master.pid');
        
        if (fs.existsSync(masterPidFile)) {
            const pid = parseInt(fs.readFileSync(masterPidFile, 'utf8'));
            
            try {
                console.log(`🔄 Отправка SIGTERM процессу ${pid}...`);
                process.kill(pid, 'SIGTERM');
                
                // Ждем graceful shutdown
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        try {
                            process.kill(pid, 0);
                        } catch (error) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 1000);
                    
                    // Принудительное завершение через 30 секунд
                    setTimeout(() => {
                        try {
                            console.log(`💀 Принудительное завершение процесса ${pid}...`);
                            process.kill(pid, 'SIGKILL');
                        } catch (error) {
                            // Процесс уже завершен
                        }
                        clearInterval(checkInterval);
                        resolve();
                    }, 30000);
                });
                
                console.log('✅ Система остановлена');
                
            } catch (error) {
                console.log('❌ Процесс уже завершен или не найден');
            }
            
            // Удаляем PID файл
            if (fs.existsSync(masterPidFile)) {
                fs.unlinkSync(masterPidFile);
            }
        } else {
            console.log('❌ Система не запущена');
        }
    }
    
    /**
     * Перезапуск системы
     */
    async restart() {
        console.log('🔄 Перезапуск Scalable Bot Manager...');
        await this.stop();
        
        // Пауза перед запуском
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.startMaster();
    }
    
    /**
     * Просмотр логов
     */
    showLogs(lines = 50) {
        const masterLogFile = path.join(this.config.logDir, 'master.log');
        
        if (fs.existsSync(masterLogFile)) {
            const { spawn } = require('child_process');
            const tail = spawn('tail', ['-n', lines.toString(), '-f', masterLogFile], {
                stdio: 'inherit'
            });
            
            console.log(`📋 Показываем последние ${lines} строк логов (Ctrl+C для выхода):`);
            
            process.on('SIGINT', () => {
                tail.kill();
                process.exit(0);
            });
        } else {
            console.log('❌ Лог файл не найден');
        }
    }
    
    /**
     * Graceful shutdown
     */
    async gracefulShutdown() {
        console.log('\n🔄 Получен сигнал завершения, останавливаем систему...');
        await this.stop();
        process.exit(0);
    }
    
    /**
     * Очистка ресурсов
     */
    cleanup() {
        // Закрываем все потоки логов
        for (const [name, processInfo] of this.processes) {
            if (processInfo.logStream) {
                processInfo.logStream.end();
            }
        }
    }
    
    /**
     * Показать справку
     */
    showHelp() {
        console.log(`
🚀 Scalable Bot Manager - Система управления 1000+ ботов

Использование:
  node start_scalable_system.js [команда]

Команды:
  start     Запустить систему (по умолчанию)
  stop      Остановить систему
  restart   Перезапустить систему
  status    Проверить статус системы
  logs      Показать логи (последние 50 строк)
  logs N    Показать последние N строк логов
  help      Показать эту справку

Примеры:
  node start_scalable_system.js
  node start_scalable_system.js start
  node start_scalable_system.js stop
  node start_scalable_system.js restart
  node start_scalable_system.js status
  node start_scalable_system.js logs 100

API эндпоинты:
  GET  http://localhost:3001/workers           - Статус всех воркеров
  GET  http://localhost:3001/workers/:id       - Статус конкретного воркера
  POST http://localhost:3001/workers/:id/restart - Перезапуск воркера
  POST http://localhost:3001/workers/:id/stop    - Остановка воркера
  POST http://localhost:3001/workers/restart-all - Перезапуск всех воркеров

Мониторинг:
  Откройте test-scalable-system.html в браузере для веб-интерфейса
        `);
    }
}

// Главная функция
async function main() {
    const launcher = new ScalableSystemLauncher();
    const command = process.argv[2] || 'start';
    
    switch (command) {
        case 'start':
            if (launcher.checkStatus()) {
                console.log('⚠️ Система уже запущена');
                process.exit(1);
            }
            launcher.startMaster();
            break;
            
        case 'stop':
            await launcher.stop();
            break;
            
        case 'restart':
            await launcher.restart();
            break;
            
        case 'status':
            launcher.checkStatus();
            process.exit(0);
            
        case 'logs':
            const lines = parseInt(process.argv[3]) || 50;
            launcher.showLogs(lines);
            break;
            
        case 'help':
        case '--help':
        case '-h':
            launcher.showHelp();
            process.exit(0);
            
        default:
            console.log(`❌ Неизвестная команда: ${command}`);
            launcher.showHelp();
            process.exit(1);
    }
}

// Запуск
main().catch(error => {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
});