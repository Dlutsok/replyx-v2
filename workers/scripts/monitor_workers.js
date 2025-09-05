#!/usr/bin/env node

/**
 * 📊 WORKERS MONITORING SCRIPT
 * Мониторинг состояния воркеров и системных ресурсов
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class WorkersMonitor {
    constructor() {
        this.continuous = process.argv.includes('--continuous');
        this.interval = this.parseInterval(process.argv) || 30000; // 30 seconds default
        this.json = process.argv.includes('--json');
        this.verbose = process.argv.includes('--verbose');
        
        this.masterApiUrl = process.env.MASTER_API_URL || 'http://localhost:3001';
        this.webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:8443';
        
        console.log(`📊 Workers Monitor ${this.continuous ? '(Continuous mode)' : ''}`);
    }
    
    parseInterval(args) {
        const intervalIndex = args.findIndex(arg => arg === '--interval');
        if (intervalIndex !== -1 && intervalIndex + 1 < args.length) {
            const intervalStr = args[intervalIndex + 1];
            const interval = parseInt(intervalStr);
            return isNaN(interval) ? null : interval * 1000; // Convert to ms
        }
        return null;
    }
    
    async getSystemMetrics() {
        try {
            // CPU usage
            const { stdout: cpuInfo } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d% -f1');
            const cpuUsage = parseFloat(cpuInfo.trim()) || 0;
            
            // Memory usage
            const { stdout: memInfo } = await execAsync('free -m | grep Mem | awk \'{printf "%.1f %.1f %.1f", $3/$2*100, $2, $3}\'');
            const [memPercent, memTotal, memUsed] = memInfo.trim().split(' ').map(parseFloat);
            
            // Disk usage
            const { stdout: diskInfo } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | cut -d% -f1');
            const diskUsage = parseFloat(diskInfo.trim()) || 0;
            
            // Load average
            const { stdout: loadInfo } = await execAsync('uptime | awk -F"load average:" \'{print $2}\' | awk \'{print $1}\' | cut -d, -f1');
            const loadAverage = parseFloat(loadInfo.trim()) || 0;
            
            return {
                cpu: {
                    usage: cpuUsage,
                    cores: require('os').cpus().length
                },
                memory: {
                    percent: memPercent || 0,
                    total: memTotal || 0,
                    used: memUsed || 0,
                    free: (memTotal || 0) - (memUsed || 0)
                },
                disk: {
                    usage: diskUsage
                },
                load: {
                    average: loadAverage
                }
            };
            
        } catch (error) {
            console.error('Failed to get system metrics:', error.message);
            return null;
        }
    }
    
    async getBotWorkerProcesses() {
        try {
            const { stdout } = await execAsync('ps aux | grep -E "(bot_worker|scalable_bot_manager)" | grep -v grep');
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);
            
            return lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    pid: parseInt(parts[1]),
                    cpu: parseFloat(parts[2]),
                    memory: parseFloat(parts[3]),
                    vsz: parseInt(parts[4]), // Virtual memory size
                    rss: parseInt(parts[5]), // Resident set size
                    tty: parts[6],
                    stat: parts[7],
                    start: parts[8],
                    time: parts[9],
                    command: parts.slice(10).join(' ')
                };
            });
            
        } catch (error) {
            if (error.code === 1) {
                return []; // No processes found
            }
            throw error;
        }
    }
    
    async getMasterStatus() {
        try {
            const response = await axios.get(`${this.masterApiUrl}/api/workers/status`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            return {
                error: error.message,
                available: false
            };
        }
    }
    
    async getWebhookStats() {
        try {
            const response = await axios.get(`${this.webhookUrl}/webhook/stats`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            return {
                error: error.message,
                available: false
            };
        }
    }
    
    async getWorkersHealth() {
        const processes = await this.getBotWorkerProcesses();
        const masterStatus = await this.getMasterStatus();
        const webhookStats = await getWebhookStats();
        
        return {
            processes: {
                total: processes.length,
                workers: processes.filter(p => p.command.includes('bot_worker')).length,
                masters: processes.filter(p => p.command.includes('scalable_bot_manager')).length,
                details: this.verbose ? processes : []
            },
            master: masterStatus,
            webhook: webhookStats
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    getHealthStatus(value, thresholds) {
        if (value >= thresholds.critical) return '🔴 CRITICAL';
        if (value >= thresholds.warning) return '🟡 WARNING';
        return '🟢 HEALTHY';
    }
    
    displaySystemMetrics(metrics) {
        if (!metrics) {
            console.log('❌ Failed to get system metrics');
            return;
        }
        
        console.log('\n📊 SYSTEM METRICS');
        console.log('═'.repeat(50));
        
        // CPU
        const cpuStatus = this.getHealthStatus(metrics.cpu.usage, { warning: 70, critical: 90 });
        console.log(`CPU Usage: ${metrics.cpu.usage.toFixed(1)}% (${metrics.cpu.cores} cores) ${cpuStatus}`);
        
        // Memory
        const memStatus = this.getHealthStatus(metrics.memory.percent, { warning: 70, critical: 85 });
        console.log(`Memory: ${metrics.memory.percent.toFixed(1)}% (${this.formatBytes(metrics.memory.used * 1024 * 1024)} / ${this.formatBytes(metrics.memory.total * 1024 * 1024)}) ${memStatus}`);
        
        // Disk
        const diskStatus = this.getHealthStatus(metrics.disk.usage, { warning: 80, critical: 95 });
        console.log(`Disk Usage: ${metrics.disk.usage}% ${diskStatus}`);
        
        // Load Average
        const loadStatus = this.getHealthStatus(metrics.load.average, { warning: metrics.cpu.cores * 0.7, critical: metrics.cpu.cores });
        console.log(`Load Average: ${metrics.load.average.toFixed(2)} ${loadStatus}`);
    }
    
    displayWorkersStatus(health) {
        console.log('\n🤖 WORKERS STATUS');
        console.log('═'.repeat(50));
        
        console.log(`Total Processes: ${health.processes.total}`);
        console.log(`Bot Workers: ${health.processes.workers}`);
        console.log(`Master Processes: ${health.processes.masters}`);
        
        // Master Status
        if (health.master.available) {
            console.log(`\nMaster Status: 🟢 ONLINE`);
            if (health.master.workers) {
                console.log(`Active Bots: ${Object.keys(health.master.workers).length}`);
                console.log(`Total Restarts: ${health.master.totalRestarts || 0}`);
                console.log(`Uptime: ${Math.floor((Date.now() - (health.master.startTime || 0)) / 1000 / 60)} minutes`);
            }
        } else {
            console.log(`\nMaster Status: 🔴 OFFLINE (${health.master.error})`);
        }
        
        // Webhook Status
        if (health.webhook.available) {
            console.log(`\nWebhook Server: 🟢 ONLINE`);
            console.log(`Total Requests: ${health.webhook.totalRequests || 0}`);
            console.log(`Error Rate: ${health.webhook.errorRate || '0%'}`);
            console.log(`Active Bots: ${health.webhook.activeBots?.length || 0}`);
        } else {
            console.log(`\nWebhook Server: 🔴 OFFLINE (${health.webhook.error})`);
        }
        
        // Process Details
        if (this.verbose && health.processes.details.length > 0) {
            console.log('\n📋 PROCESS DETAILS');
            console.log('─'.repeat(100));
            console.log('PID'.padEnd(8) + 'CPU%'.padEnd(8) + 'MEM%'.padEnd(8) + 'RSS'.padEnd(12) + 'STATUS'.padEnd(10) + 'COMMAND');
            console.log('─'.repeat(100));
            
            health.processes.details.forEach(proc => {
                const memoryMB = this.formatBytes(proc.rss * 1024);
                const command = proc.command.length > 50 ? proc.command.substring(0, 47) + '...' : proc.command;
                
                console.log(
                    proc.pid.toString().padEnd(8) +
                    proc.cpu.toFixed(1).padEnd(8) +
                    proc.memory.toFixed(1).padEnd(8) +
                    memoryMB.padEnd(12) +
                    proc.stat.padEnd(10) +
                    command
                );
            });
        }
    }
    
    displayAlerts(metrics, health) {
        const alerts = [];
        
        // System alerts
        if (metrics) {
            if (metrics.cpu.usage > 90) alerts.push(`🔴 HIGH CPU: ${metrics.cpu.usage.toFixed(1)}%`);
            if (metrics.memory.percent > 85) alerts.push(`🔴 HIGH MEMORY: ${metrics.memory.percent.toFixed(1)}%`);
            if (metrics.disk.usage > 95) alerts.push(`🔴 HIGH DISK: ${metrics.disk.usage}%`);
            if (metrics.load.average > metrics.cpu.cores) alerts.push(`🔴 HIGH LOAD: ${metrics.load.average.toFixed(2)}`);
        }
        
        // Workers alerts
        if (!health.master.available) alerts.push('🔴 MASTER OFFLINE');
        if (health.processes.workers === 0) alerts.push('🔴 NO WORKERS RUNNING');
        if (health.processes.workers > 50) alerts.push(`🟡 HIGH WORKER COUNT: ${health.processes.workers}`);
        
        if (alerts.length > 0) {
            console.log('\n🚨 ALERTS');
            console.log('═'.repeat(50));
            alerts.forEach(alert => console.log(alert));
        }
    }
    
    async monitor() {
        const timestamp = new Date().toISOString();
        
        if (this.json) {
            // JSON output for programmatic use
            const metrics = await this.getSystemMetrics();
            const health = await this.getWorkersHealth();
            
            console.log(JSON.stringify({
                timestamp,
                system: metrics,
                workers: health
            }, null, 2));
            
            return;
        }
        
        // Human-readable output
        console.log(`\n🕐 ${timestamp}`);
        console.log('═'.repeat(70));
        
        const [metrics, health] = await Promise.all([
            this.getSystemMetrics(),
            this.getWorkersHealth()
        ]);
        
        this.displaySystemMetrics(metrics);
        this.displayWorkersStatus(health);
        this.displayAlerts(metrics, health);
        
        console.log('\n' + '═'.repeat(70));
    }
    
    async run() {
        if (this.continuous) {
            console.log(`🔄 Starting continuous monitoring (interval: ${this.interval/1000}s)`);
            console.log('Press Ctrl+C to stop');
            
            // Initial monitoring
            await this.monitor();
            
            // Set up interval
            const intervalId = setInterval(async () => {
                try {
                    await this.monitor();
                } catch (error) {
                    console.error('❌ Monitoring error:', error.message);
                }
            }, this.interval);
            
            // Handle shutdown
            process.on('SIGINT', () => {
                console.log('\n👋 Stopping monitor...');
                clearInterval(intervalId);
                process.exit(0);
            });
            
        } else {
            // Single monitoring run
            await this.monitor();
        }
    }
}

// CLI Usage
if (require.main === module) {
    const monitor = new WorkersMonitor();
    
    if (process.argv.includes('--help')) {
        console.log(`
Usage: node monitor_workers.js [options]

Options:
  --continuous      Run continuously with periodic updates
  --interval <sec>  Update interval in seconds (default: 30)
  --json           Output in JSON format
  --verbose        Show detailed process information
  --help           Show this help message

Environment Variables:
  MASTER_API_URL    Master process API URL (default: http://localhost:3001)
  WEBHOOK_URL       Webhook server URL (default: http://localhost:8443)

Examples:
  node monitor_workers.js                          # Single monitoring run
  node monitor_workers.js --continuous             # Continuous monitoring
  node monitor_workers.js --continuous --interval 10  # Monitor every 10 seconds
  node monitor_workers.js --json                   # JSON output
  node monitor_workers.js --verbose                # Detailed process info
        `);
        process.exit(0);
    }
    
    monitor.run().catch(error => {
        console.error('❌ Monitor failed:', error.message);
        process.exit(1);
    });
}

module.exports = WorkersMonitor;