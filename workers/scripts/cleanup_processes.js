#!/usr/bin/env node

/**
 * 🧹 CLEANUP ZOMBIE PROCESSES SCRIPT
 * Безопасная очистка зависших bot_worker процессов
 */

const { exec, spawn } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ProcessCleanup {
    constructor() {
        this.dryRun = process.argv.includes('--dry-run');
        this.force = process.argv.includes('--force');
        this.verbose = process.argv.includes('--verbose');
        
        console.log(`🧹 Process Cleanup Tool ${this.dryRun ? '(DRY RUN)' : ''}`);
        console.log(`Force mode: ${this.force ? 'ON' : 'OFF'}`);
    }
    
    async findBotWorkerProcesses() {
        try {
            const { stdout } = await execAsync('ps aux | grep -E "(bot_worker|scalable_bot_manager)" | grep -v grep');
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);
            
            const processes = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parseInt(parts[1]);
                const cpu = parseFloat(parts[2]);
                const memory = parseFloat(parts[3]);
                const command = parts.slice(10).join(' ');
                
                return {
                    pid,
                    cpu,
                    memory,
                    command,
                    user: parts[0],
                    startTime: parts[8]
                };
            });
            
            return processes;
            
        } catch (error) {
            if (error.code === 1) {
                // grep не нашел процессы - это нормально
                return [];
            }
            throw error;
        }
    }
    
    async findZombieProcesses() {
        try {
            const { stdout } = await execAsync('ps aux | grep -E "(bot_worker|scalable_bot_manager)" | grep -E "(<defunct>|<zombie>)" | grep -v grep');
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);
            
            return lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    pid: parseInt(parts[1]),
                    ppid: parseInt(parts[2]) || null,
                    command: parts.slice(10).join(' ')
                };
            });
            
        } catch (error) {
            if (error.code === 1) {
                return [];
            }
            throw error;
        }
    }
    
    async checkProcessHealth(pid) {
        try {
            // Проверяем, отвечает ли процесс на SIGTERM
            process.kill(pid, 0); // Проверка существования
            
            // Проверяем использование ресурсов
            const { stdout } = await execAsync(`ps -p ${pid} -o pid,pcpu,pmem,etime --no-headers`);
            const [pidStr, cpu, memory, etime] = stdout.trim().split(/\s+/);
            
            const isStale = this.isProcessStale(etime, cpu, memory);
            const isHighResource = parseFloat(cpu) > 90 || parseFloat(memory) > 10;
            
            return {
                exists: true,
                pid: parseInt(pidStr),
                cpu: parseFloat(cpu),
                memory: parseFloat(memory),
                etime,
                isStale,
                isHighResource
            };
            
        } catch (error) {
            return { exists: false, pid };
        }
    }
    
    isProcessStale(etime, cpu, memory) {
        // Парсим время работы (формат может быть: MM:SS, HH:MM:SS, DD-HH:MM:SS)
        const timeMatch = etime.match(/(\d+)-(\d+):(\d+):(\d+)|(\d+):(\d+):(\d+)|(\d+):(\d+)/);
        let totalMinutes = 0;
        
        if (timeMatch) {
            if (timeMatch[1]) {
                // DD-HH:MM:SS
                totalMinutes = parseInt(timeMatch[1]) * 24 * 60 + 
                              parseInt(timeMatch[2]) * 60 + 
                              parseInt(timeMatch[3]);
            } else if (timeMatch[5]) {
                // HH:MM:SS
                totalMinutes = parseInt(timeMatch[5]) * 60 + parseInt(timeMatch[6]);
            } else if (timeMatch[7]) {
                // MM:SS
                totalMinutes = parseInt(timeMatch[7]);
            }
        }
        
        // Процесс считается зависшим если:
        // 1. Работает более 6 часов И использует менее 0.1% CPU
        // 2. Использует менее 0.01% CPU более часа
        const isLongRunning = totalMinutes > 360; // 6 hours
        const isLowCpu = parseFloat(cpu) < 0.1;
        const isVerylowCpu = parseFloat(cpu) < 0.01;
        const isModerateRunning = totalMinutes > 60; // 1 hour
        
        return (isLongRunning && isLowCpu) || (isModerateRunning && isVerylowCpu);
    }
    
    async killProcess(pid, signal = 'TERM') {
        if (this.dryRun) {
            console.log(`[DRY RUN] Would kill process ${pid} with signal ${signal}`);
            return true;
        }
        
        try {
            process.kill(pid, signal);
            
            // Ждем немного и проверяем, завершился ли процесс
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                process.kill(pid, 0);
                // Процесс все еще существует
                return false;
            } catch {
                // Процесс завершился
                return true;
            }
            
        } catch (error) {
            if (error.code === 'ESRCH') {
                // Процесс уже не существует
                return true;
            }
            console.error(`Failed to kill process ${pid}:`, error.message);
            return false;
        }
    }
    
    async cleanup() {
        console.log('🔍 Searching for bot worker processes...');
        
        const processes = await this.findBotWorkerProcesses();
        const zombies = await this.findZombieProcesses();
        
        if (processes.length === 0 && zombies.length === 0) {
            console.log('✅ No bot worker processes found');
            return;
        }
        
        console.log(`📊 Found ${processes.length} active processes, ${zombies.length} zombie processes`);
        
        // Обработка zombie процессов
        if (zombies.length > 0) {
            console.log('\n💀 Zombie processes found:');
            for (const zombie of zombies) {
                console.log(`  PID ${zombie.pid}: ${zombie.command}`);
                
                if (!this.dryRun) {
                    // Для zombie процессов нужно убить родительский процесс
                    if (zombie.ppid) {
                        await this.killProcess(zombie.ppid, 'KILL');
                    }
                    await this.killProcess(zombie.pid, 'KILL');
                }
            }
        }
        
        // Анализ активных процессов
        const problematicProcesses = [];
        
        for (const proc of processes) {
            const health = await this.checkProcessHealth(proc.pid);
            
            if (!health.exists) {
                if (this.verbose) {
                    console.log(`⚰️  Process ${proc.pid} already terminated`);
                }
                continue;
            }
            
            if (health.isStale || health.isHighResource || this.force) {
                problematicProcesses.push({ ...proc, health });
            }
            
            if (this.verbose) {
                const status = health.isStale ? '🐌 STALE' : 
                             health.isHighResource ? '🔥 HIGH RESOURCE' : 
                             '✅ HEALTHY';
                console.log(`  PID ${proc.pid}: ${status} - CPU: ${health.cpu}%, MEM: ${health.memory}%, TIME: ${health.etime}`);
            }
        }
        
        if (problematicProcesses.length === 0) {
            console.log('✅ All processes appear healthy');
            return;
        }
        
        console.log(`\n🚨 Found ${problematicProcesses.length} problematic processes:`);
        
        for (const proc of problematicProcesses) {
            const reason = proc.health.isStale ? 'stale' : 
                          proc.health.isHighResource ? 'high resource usage' : 
                          'force cleanup';
                          
            console.log(`  PID ${proc.pid}: ${reason} - ${proc.command.substring(0, 80)}...`);
            
            // Graceful termination
            const gracefulSuccess = await this.killProcess(proc.pid, 'TERM');
            
            if (!gracefulSuccess) {
                console.log(`    ⚠️  Graceful termination failed, using SIGKILL`);
                await this.killProcess(proc.pid, 'KILL');
            } else {
                console.log(`    ✅ Process terminated gracefully`);
            }
        }
        
        console.log(`\n🧹 Cleanup completed. Terminated ${problematicProcesses.length} processes`);
    }
    
    async run() {
        try {
            await this.cleanup();
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
            process.exit(1);
        }
    }
}

// CLI Usage
if (require.main === module) {
    const cleanup = new ProcessCleanup();
    
    if (process.argv.includes('--help')) {
        console.log(`
Usage: node cleanup_processes.js [options]

Options:
  --dry-run     Show what would be cleaned up without actually doing it
  --force       Kill all bot worker processes regardless of health
  --verbose     Show detailed information about each process
  --help        Show this help message

Examples:
  node cleanup_processes.js                    # Clean up stale processes
  node cleanup_processes.js --dry-run          # Preview cleanup
  node cleanup_processes.js --force            # Force cleanup all processes
  node cleanup_processes.js --verbose          # Show detailed process info
        `);
        process.exit(0);
    }
    
    cleanup.run();
}

module.exports = ProcessCleanup;