#!/usr/bin/env python3
"""
🔍 СИСТЕМА МОНИТОРИНГА И АВТОПЕРЕЗАПУСКА FASTAPI ПРИЛОЖЕНИЯ
Обеспечивает высокую доступность основного API сервера
"""

import os
import sys
import time
import signal
import logging
import subprocess
import requests
from datetime import datetime, timedelta
from pathlib import Path
import json
import psutil

class FastAPIMonitor:
    def __init__(self):
        self.config = {
            'health_url': os.getenv('HEALTH_URL', 'http://localhost:8000/health'),
            'check_interval': int(os.getenv('MONITOR_INTERVAL', '30')),  # секунды
            'max_failures': int(os.getenv('MAX_FAILURES', '3')),
            'restart_cooldown': int(os.getenv('RESTART_COOLDOWN', '60')),  # секунды
            'startup_script': os.getenv('STARTUP_SCRIPT', 'start_production.sh'),
            'log_file': os.getenv('MONITOR_LOG', 'logs/fastapi_monitor.log'),
            'pid_file': os.getenv('MONITOR_PID', 'pids/fastapi_monitor.pid'),
            'status_file': os.getenv('MONITOR_STATUS', 'tmp/fastapi_status.json'),
            'max_memory_mb': int(os.getenv('MAX_MEMORY_MB', '1024')),  # 1GB
            'max_cpu_percent': float(os.getenv('MAX_CPU_PERCENT', '90')),
            'max_restart_rate': int(os.getenv('MAX_RESTART_RATE', '5')),  # перезапусков в час
        }
        
        # Инициализация
        self.setup_directories()
        self.setup_logging()
        self.setup_signal_handlers()
        
        # Статистика
        self.stats = {
            'start_time': datetime.now(),
            'total_checks': 0,
            'failed_checks': 0,
            'total_restarts': 0,
            'last_restart': None,
            'restart_history': [],  # список времени перезапусков
            'consecutive_failures': 0,
            'last_successful_check': None,
            'fastapi_pid': None,
            'fastapi_start_time': None,
        }
        
        self.running = True
        self.logger.info(f"🔍 FastAPI Monitor запущен (PID: {os.getpid()})")
        
    def setup_directories(self):
        """Создание необходимых директорий"""
        dirs = ['logs', 'pids', 'tmp']
        for dir_name in dirs:
            os.makedirs(dir_name, exist_ok=True)
            
    def setup_logging(self):
        """Настройка логирования"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.config['log_file']),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('FastAPIMonitor')
        
    def setup_signal_handlers(self):
        """Настройка обработчиков сигналов"""
        signal.signal(signal.SIGTERM, self.graceful_shutdown)
        signal.signal(signal.SIGINT, self.graceful_shutdown)
        
    def graceful_shutdown(self, signum, frame):
        """Graceful shutdown монитора"""
        self.logger.info(f"🔄 Получен сигнал {signum}, завершение работы монитора...")
        self.running = False
        self.cleanup()
        sys.exit(0)
        
    def cleanup(self):
        """Очистка ресурсов"""
        try:
            if os.path.exists(self.config['pid_file']):
                os.remove(self.config['pid_file'])
            self.save_status()
        except Exception as e:
            self.logger.error(f"Ошибка очистки: {e}")
            
    def save_pid(self):
        """Сохранение PID монитора"""
        try:
            with open(self.config['pid_file'], 'w') as f:
                f.write(str(os.getpid()))
        except Exception as e:
            self.logger.error(f"Ошибка сохранения PID: {e}")
            
    def save_status(self):
        """Сохранение статуса в файл"""
        try:
            status = {
                **self.stats,
                'start_time': self.stats['start_time'].isoformat() if self.stats['start_time'] else None,
                'last_restart': self.stats['last_restart'].isoformat() if self.stats['last_restart'] else None,
                'last_successful_check': self.stats['last_successful_check'].isoformat() if self.stats['last_successful_check'] else None,
                'fastapi_start_time': self.stats['fastapi_start_time'].isoformat() if self.stats['fastapi_start_time'] else None,
                'restart_history': [t.isoformat() for t in self.stats['restart_history']],
                'config': self.config,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(self.config['status_file'], 'w') as f:
                json.dump(status, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Ошибка сохранения статуса: {e}")
            
    def check_fastapi_health(self):
        """Проверка health endpoint'а FastAPI"""
        try:
            self.stats['total_checks'] += 1
            
            # HTTP запрос к health endpoint
            response = requests.get(
                self.config['health_url'], 
                timeout=10,
                headers={'User-Agent': 'FastAPIMonitor/1.0'}
            )
            
            if response.status_code == 200:
                health_data = response.json()
                
                # Проверка статуса компонентов
                if health_data.get('status') == 'healthy':
                    self.stats['consecutive_failures'] = 0
                    self.stats['last_successful_check'] = datetime.now()
                    return True, health_data
                else:
                    self.logger.warning(f"⚠️ FastAPI нездоров: {health_data}")
                    return False, health_data
                    
            else:
                self.logger.warning(f"⚠️ Health check вернул код {response.status_code}")
                return False, {'error': f'HTTP {response.status_code}'}
                
        except requests.exceptions.ConnectionError:
            self.logger.error("❌ Не удается подключиться к FastAPI (Connection Error)")
            return False, {'error': 'Connection Error'}
        except requests.exceptions.Timeout:
            self.logger.error("❌ Тайм-аут при подключении к FastAPI")
            return False, {'error': 'Timeout'}
        except Exception as e:
            self.logger.error(f"❌ Ошибка health check: {e}")
            return False, {'error': str(e)}
            
    def find_fastapi_process(self):
        """Поиск процесса FastAPI"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
                cmdline = proc.info['cmdline']
                if cmdline and any('uvicorn' in arg and 'main:app' in ' '.join(cmdline) for arg in cmdline):
                    return {
                        'pid': proc.info['pid'],
                        'name': proc.info['name'],
                        'cmdline': cmdline,
                        'start_time': datetime.fromtimestamp(proc.info['create_time'])
                    }
        except Exception as e:
            self.logger.error(f"Ошибка поиска процесса FastAPI: {e}")
            
        return None
        
    def check_resource_usage(self):
        """Проверка использования ресурсов FastAPI процессом"""
        try:
            process_info = self.find_fastapi_process()
            if not process_info:
                return False, "FastAPI процесс не найден"
                
            proc = psutil.Process(process_info['pid'])
            
            # Проверка памяти
            memory_info = proc.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            
            # Проверка CPU
            cpu_percent = proc.cpu_percent(interval=1)
            
            self.stats['fastapi_pid'] = process_info['pid']
            self.stats['fastapi_start_time'] = process_info['start_time']
            
            # Проверка лимитов
            if memory_mb > self.config['max_memory_mb']:
                return False, f"Превышено использование памяти: {memory_mb:.1f}MB > {self.config['max_memory_mb']}MB"
                
            if cpu_percent > self.config['max_cpu_percent']:
                return False, f"Превышено использование CPU: {cpu_percent:.1f}% > {self.config['max_cpu_percent']}%"
                
            return True, {
                'memory_mb': memory_mb,
                'cpu_percent': cpu_percent,
                'pid': process_info['pid'],
                'uptime': datetime.now() - process_info['start_time']
            }
            
        except psutil.NoSuchProcess:
            return False, "FastAPI процесс завершился"
        except Exception as e:
            return False, f"Ошибка проверки ресурсов: {e}"
            
    def check_restart_rate(self):
        """Проверка частоты перезапусков"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        
        # Очищаем старые перезапуски
        self.stats['restart_history'] = [
            restart_time for restart_time in self.stats['restart_history']
            if restart_time > hour_ago
        ]
        
        recent_restarts = len(self.stats['restart_history'])
        
        if recent_restarts >= self.config['max_restart_rate']:
            self.logger.error(f"🚨 СЛИШКОМ МНОГО ПЕРЕЗАПУСКОВ: {recent_restarts} за последний час")
            return False
            
        return True
        
    def restart_fastapi(self, reason="health_check_failed"):
        """Перезапуск FastAPI приложения"""
        try:
            # Проверяем rate limiting
            if not self.check_restart_rate():
                self.logger.error("❌ Перезапуск заблокирован из-за высокой частоты")
                return False
                
            self.logger.info(f"🔄 Перезапуск FastAPI (причина: {reason})")
            
            # Останавливаем текущий процесс
            process_info = self.find_fastapi_process()
            if process_info:
                try:
                    proc = psutil.Process(process_info['pid'])
                    proc.terminate()
                    
                    # Ждем graceful shutdown
                    try:
                        proc.wait(timeout=15)
                    except psutil.TimeoutExpired:
                        self.logger.warning("💀 Принудительное завершение FastAPI")
                        proc.kill()
                        proc.wait(timeout=5)
                        
                except psutil.NoSuchProcess:
                    pass
                    
            # Пауза перед запуском
            time.sleep(3)
            
            # Запускаем новый процесс
            startup_script = Path(self.config['startup_script'])
            if not startup_script.exists():
                startup_script = Path(__file__).parent.parent / self.config['startup_script']
                
            if startup_script.exists():
                self.logger.info(f"🚀 Запуск: {startup_script}")
                
                # Запускаем в background
                proc = subprocess.Popen(
                    ['bash', str(startup_script)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=str(startup_script.parent)
                )
                
                # Ждем некоторое время для инициализации
                time.sleep(10)
                
                # Проверяем успешность запуска
                if proc.poll() is None:  # процесс все еще работает
                    self.stats['total_restarts'] += 1
                    self.stats['last_restart'] = datetime.now()
                    self.stats['restart_history'].append(datetime.now())
                    self.logger.info("✅ FastAPI успешно перезапущен")
                    return True
                else:
                    stdout, stderr = proc.communicate()
                    self.logger.error(f"❌ Ошибка запуска FastAPI: {stderr.decode()}")
                    return False
                    
            else:
                self.logger.error(f"❌ Скрипт запуска не найден: {startup_script}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Ошибка перезапуска FastAPI: {e}")
            return False
            
    def run_monitoring_cycle(self):
        """Один цикл мониторинга"""
        try:
            # 1. Проверка health endpoint
            is_healthy, health_data = self.check_fastapi_health()
            
            # 2. Проверка ресурсов (только если health check прошел)
            resource_ok = True
            resource_info = {}
            
            if is_healthy:
                resource_ok, resource_info = self.check_resource_usage()
                
            # 3. Принятие решения о перезапуске
            need_restart = False
            restart_reason = None
            
            if not is_healthy:
                self.stats['failed_checks'] += 1
                self.stats['consecutive_failures'] += 1
                
                if self.stats['consecutive_failures'] >= self.config['max_failures']:
                    need_restart = True
                    restart_reason = f"health_check_failed_{self.stats['consecutive_failures']}_times"
                    
            elif not resource_ok:
                need_restart = True
                restart_reason = f"resource_limit_exceeded: {resource_info}"
                
            # 4. Выполняем перезапуск если нужно
            if need_restart:
                success = self.restart_fastapi(restart_reason)
                if success:
                    self.stats['consecutive_failures'] = 0
                    
            # 5. Логирование результатов
            if is_healthy and resource_ok:
                uptime_info = ""
                if isinstance(resource_info, dict) and 'uptime' in resource_info:
                    uptime_info = f" (uptime: {resource_info['uptime']})"
                    
                self.logger.info(f"💚 FastAPI работает нормально{uptime_info}")
            
            # 6. Сохранение статуса
            self.save_status()
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка в цикле мониторинга: {e}")
            
    def run(self):
        """Основной цикл мониторинга"""
        self.save_pid()
        
        self.logger.info(f"🔍 Запуск мониторинга FastAPI")
        self.logger.info(f"📊 Health URL: {self.config['health_url']}")
        self.logger.info(f"⏰ Интервал проверки: {self.config['check_interval']}с")
        self.logger.info(f"🔄 Макс. сбоев до перезапуска: {self.config['max_failures']}")
        
        try:
            while self.running:
                self.run_monitoring_cycle()
                time.sleep(self.config['check_interval'])
                
        except KeyboardInterrupt:
            self.logger.info("🔄 Прерывание мониторинга пользователем")
        except Exception as e:
            self.logger.error(f"❌ Критическая ошибка мониторинга: {e}")
        finally:
            self.cleanup()

def main():
    """Главная функция"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'status':
            # Показать статус
            try:
                with open('tmp/fastapi_status.json', 'r') as f:
                    status = json.load(f)
                    
                print("📊 FastAPI Monitor Status:")
                print(f"   Запущен: {status.get('start_time', 'N/A')}")
                print(f"   Всего проверок: {status.get('total_checks', 0)}")
                print(f"   Неудачных проверок: {status.get('failed_checks', 0)}")
                print(f"   Всего перезапусков: {status.get('total_restarts', 0)}")
                print(f"   Последний перезапуск: {status.get('last_restart', 'N/A')}")
                print(f"   FastAPI PID: {status.get('fastapi_pid', 'N/A')}")
                
            except FileNotFoundError:
                print("❌ Статус не найден. Монитор не запущен?")
            except Exception as e:
                print(f"❌ Ошибка получения статуса: {e}")
                
        elif command == 'stop':
            # Остановить монитор
            try:
                with open('pids/fastapi_monitor.pid', 'r') as f:
                    pid = int(f.read().strip())
                    
                os.kill(pid, signal.SIGTERM)
                print(f"🔄 Сигнал остановки отправлен монитору (PID: {pid})")
                
            except FileNotFoundError:
                print("❌ PID файл не найден. Монитор не запущен?")
            except Exception as e:
                print(f"❌ Ошибка остановки монитора: {e}")
        else:
            print(f"❌ Неизвестная команда: {command}")
            print("Доступные команды: status, stop")
    else:
        # Запуск мониторинга
        monitor = FastAPIMonitor()
        monitor.run()

if __name__ == "__main__":
    main()