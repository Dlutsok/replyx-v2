#!/usr/bin/env python3
"""
📊 ЦЕНТРАЛИЗОВАННАЯ СИСТЕМА МОНИТОРИНГА ВСЕХ КОМПОНЕНТОВ CHATAI
Объединяет мониторинг FastAPI, Bot системы, БД, Redis и других сервисов
"""

import os
import sys
import time
import json
import logging
import requests
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
import psutil
import asyncio
import aiohttp

class SystemMonitor:
    def __init__(self):
        self.config = {
            'fastapi_health_url': os.getenv('FASTAPI_HEALTH_URL', 'http://localhost:8000/health'),
            'bot_manager_url': os.getenv('BOT_MANAGER_URL', 'http://localhost:3001/workers'),
            'redis_host': os.getenv('REDIS_HOST', 'localhost'),
            'redis_port': int(os.getenv('REDIS_PORT', '6379')),
            'db_host': os.getenv('DB_HOST', 'localhost'),
            'db_port': int(os.getenv('DB_PORT', '5432')),
            'check_interval': int(os.getenv('SYSTEM_MONITOR_INTERVAL', '60')),  # секунды
            'log_file': os.getenv('SYSTEM_MONITOR_LOG', 'logs/system_monitor.log'),
            'status_file': os.getenv('SYSTEM_STATUS_FILE', 'tmp/system_status.json'),
            'alert_webhook': os.getenv('ALERT_WEBHOOK', None),  # Slack/Discord webhook
            'prometheus_endpoint': os.getenv('PROMETHEUS_ENDPOINT', 'http://localhost:8000/metrics'),
        }
        
        self.setup_logging()
        
        # Статус компонентов
        self.components_status = {
            'fastapi': {'status': 'unknown', 'last_check': None, 'details': {}},
            'bot_manager': {'status': 'unknown', 'last_check': None, 'details': {}},
            'database': {'status': 'unknown', 'last_check': None, 'details': {}},
            'redis': {'status': 'unknown', 'last_check': None, 'details': {}},
            'system_resources': {'status': 'unknown', 'last_check': None, 'details': {}},
        }
        
        # Алерты
        self.alerts = {
            'active': [],
            'resolved': [],
            'last_alert_time': {},
            'alert_cooldown': 300  # 5 минут между одинаковыми алертами
        }
        
        self.logger.info("📊 System Monitor инициализирован")
        
    def setup_logging(self):
        """Настройка логирования"""
        os.makedirs('logs', exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.config['log_file']),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('SystemMonitor')
        
    async def check_fastapi_health(self):
        """Проверка здоровья FastAPI приложения"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(self.config['fastapi_health_url']) as response:
                    if response.status == 200:
                        health_data = await response.json()
                        
                        self.components_status['fastapi'] = {
                            'status': health_data.get('status', 'unknown'),
                            'last_check': datetime.now(),
                            'details': health_data,
                            'response_time': response.headers.get('X-Process-Time', 'N/A')
                        }
                        
                        if health_data.get('status') == 'healthy':
                            self.resolve_alert('fastapi_unhealthy')
                        else:
                            await self.trigger_alert('fastapi_unhealthy', f"FastAPI нездоров: {health_data}")
                            
                        return True
                    else:
                        await self.trigger_alert('fastapi_unavailable', f"FastAPI вернул код {response.status}")
                        return False
                        
        except Exception as e:
            self.components_status['fastapi'] = {
                'status': 'error',
                'last_check': datetime.now(),
                'details': {'error': str(e)},
                'response_time': 'N/A'
            }
            await self.trigger_alert('fastapi_error', f"Ошибка подключения к FastAPI: {e}")
            return False
            
    async def check_bot_manager_health(self):
        """Проверка здоровья Bot Manager"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(self.config['bot_manager_url']) as response:
                    if response.status == 200:
                        workers_data = await response.json()
                        
                        total_workers = len(workers_data)
                        healthy_workers = sum(1 for w in workers_data if w.get('status') == 'running')
                        
                        self.components_status['bot_manager'] = {
                            'status': 'healthy' if total_workers > 0 else 'warning',
                            'last_check': datetime.now(),
                            'details': {
                                'total_workers': total_workers,
                                'healthy_workers': healthy_workers,
                                'unhealthy_workers': total_workers - healthy_workers,
                                'health_ratio': healthy_workers / total_workers if total_workers > 0 else 0
                            }
                        }
                        
                        # Проверка критических проблем
                        if total_workers == 0:
                            await self.trigger_alert('bot_manager_no_workers', "Нет активных bot worker'ов")
                        elif healthy_workers / total_workers < 0.5:
                            await self.trigger_alert('bot_manager_low_health', f"Только {healthy_workers}/{total_workers} воркеров здоровы")
                        else:
                            self.resolve_alert('bot_manager_no_workers')
                            self.resolve_alert('bot_manager_low_health')
                            
                        return True
                    else:
                        await self.trigger_alert('bot_manager_unavailable', f"Bot Manager недоступен (код {response.status})")
                        return False
                        
        except Exception as e:
            self.components_status['bot_manager'] = {
                'status': 'error',
                'last_check': datetime.now(),
                'details': {'error': str(e)}
            }
            await self.trigger_alert('bot_manager_error', f"Ошибка подключения к Bot Manager: {e}")
            return False
            
    async def check_database_health(self):
        """Проверка здоровья базы данных"""
        try:
            import psycopg2
            
            # Формируем строку подключения
            db_user = os.getenv('DB_USER', 'chatai')
            db_password = os.getenv('DB_PASSWORD', '')
            db_name = os.getenv('DB_NAME', 'chatai_production')
            
            conn_str = f"host={self.config['db_host']} port={self.config['db_port']} dbname={db_name} user={db_user}"
            if db_password:
                conn_str += f" password={db_password}"
                
            # Проверка подключения
            start_time = time.time()
            conn = psycopg2.connect(conn_str)
            conn_time = time.time() - start_time
            
            # Простой запрос для проверки
            cursor = conn.cursor()
            cursor.execute("SELECT version(), pg_database_size(current_database());")
            version, db_size = cursor.fetchone()
            cursor.close()
            conn.close()
            
            self.components_status['database'] = {
                'status': 'healthy',
                'last_check': datetime.now(),
                'details': {
                    'version': version.split()[0:2],  # PostgreSQL version
                    'database_size_bytes': db_size,
                    'database_size_mb': round(db_size / 1024 / 1024, 2),
                    'connection_time': round(conn_time * 1000, 2)  # ms
                }
            }
            
            # Проверка размера БД
            db_size_gb = db_size / 1024 / 1024 / 1024
            if db_size_gb > 10:  # Более 10GB
                await self.trigger_alert('database_size_warning', f"Размер БД достиг {db_size_gb:.2f}GB")
            else:
                self.resolve_alert('database_size_warning')
                
            self.resolve_alert('database_unavailable')
            return True
            
        except Exception as e:
            self.components_status['database'] = {
                'status': 'error',
                'last_check': datetime.now(),
                'details': {'error': str(e)}
            }
            await self.trigger_alert('database_unavailable', f"Ошибка подключения к БД: {e}")
            return False
            
    async def check_redis_health(self):
        """Проверка здоровья Redis"""
        try:
            import redis
            
            r = redis.Redis(
                host=self.config['redis_host'],
                port=self.config['redis_port'],
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # Проверка подключения
            start_time = time.time()
            info = r.info()
            ping_time = time.time() - start_time
            
            # Получаем статистики
            memory_info = {
                'used_memory': info.get('used_memory', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'used_memory_peak': info.get('used_memory_peak', 0),
                'used_memory_peak_human': info.get('used_memory_peak_human', '0B'),
            }
            
            self.components_status['redis'] = {
                'status': 'healthy',
                'last_check': datetime.now(),
                'details': {
                    'version': info.get('redis_version', 'unknown'),
                    'uptime': info.get('uptime_in_seconds', 0),
                    'connected_clients': info.get('connected_clients', 0),
                    'memory': memory_info,
                    'ping_time': round(ping_time * 1000, 2)  # ms
                }
            }
            
            # Проверка использования памяти
            used_memory_mb = info.get('used_memory', 0) / 1024 / 1024
            if used_memory_mb > 500:  # Более 500MB
                await self.trigger_alert('redis_high_memory', f"Redis использует {used_memory_mb:.1f}MB памяти")
            else:
                self.resolve_alert('redis_high_memory')
                
            self.resolve_alert('redis_unavailable')
            return True
            
        except Exception as e:
            self.components_status['redis'] = {
                'status': 'error',
                'last_check': datetime.now(),
                'details': {'error': str(e)}
            }
            await self.trigger_alert('redis_unavailable', f"Ошибка подключения к Redis: {e}")
            return False
            
    async def check_system_resources(self):
        """Проверка системных ресурсов"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Память
            memory = psutil.virtual_memory()
            
            # Диск
            disk = psutil.disk_usage('/')
            
            # Сетевые подключения
            connections = len(psutil.net_connections())
            
            # Количество процессов
            process_count = len(list(psutil.process_iter()))
            
            self.components_status['system_resources'] = {
                'status': 'healthy',
                'last_check': datetime.now(),
                'details': {
                    'cpu': {
                        'percent': cpu_percent,
                        'count': cpu_count,
                        'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else None
                    },
                    'memory': {
                        'total_gb': round(memory.total / 1024 / 1024 / 1024, 2),
                        'used_gb': round(memory.used / 1024 / 1024 / 1024, 2),
                        'available_gb': round(memory.available / 1024 / 1024 / 1024, 2),
                        'percent': memory.percent
                    },
                    'disk': {
                        'total_gb': round(disk.total / 1024 / 1024 / 1024, 2),
                        'used_gb': round(disk.used / 1024 / 1024 / 1024, 2),
                        'free_gb': round(disk.free / 1024 / 1024 / 1024, 2),
                        'percent': round((disk.used / disk.total) * 100, 2)
                    },
                    'network': {
                        'connections': connections
                    },
                    'processes': process_count
                }
            }
            
            # Проверка критических значений
            alerts_triggered = []
            
            if cpu_percent > 90:
                alerts_triggered.append(('cpu_high', f"Высокая нагрузка CPU: {cpu_percent}%"))
                
            if memory.percent > 90:
                alerts_triggered.append(('memory_high', f"Высокое использование памяти: {memory.percent}%"))
                
            if (disk.used / disk.total) > 0.9:
                alerts_triggered.append(('disk_full', f"Диск заполнен на {round((disk.used / disk.total) * 100, 1)}%"))
                
            # Отправка алертов
            for alert_type, message in alerts_triggered:
                await self.trigger_alert(alert_type, message)
                
            # Разрешение алертов если все в порядке
            if cpu_percent <= 80:
                self.resolve_alert('cpu_high')
            if memory.percent <= 80:
                self.resolve_alert('memory_high')
            if (disk.used / disk.total) <= 0.8:
                self.resolve_alert('disk_full')
                
            return True
            
        except Exception as e:
            self.components_status['system_resources'] = {
                'status': 'error',
                'last_check': datetime.now(),
                'details': {'error': str(e)}
            }
            return False
            
    async def trigger_alert(self, alert_type, message):
        """Отправка алерта"""
        now = datetime.now()
        
        # Проверка cooldown'а
        last_alert_time = self.alerts['last_alert_time'].get(alert_type)
        if last_alert_time and (now - last_alert_time).total_seconds() < self.alerts['alert_cooldown']:
            return
            
        # Создание алерта
        alert = {
            'type': alert_type,
            'message': message,
            'timestamp': now,
            'severity': self.get_alert_severity(alert_type)
        }
        
        # Добавляем в активные алерты
        self.alerts['active'] = [a for a in self.alerts['active'] if a['type'] != alert_type]
        self.alerts['active'].append(alert)
        self.alerts['last_alert_time'][alert_type] = now
        
        # Логирование
        self.logger.error(f"🚨 АЛЕРТ [{alert['severity']}]: {alert_type} - {message}")
        
        # Отправка в webhook (если настроен)
        if self.config['alert_webhook']:
            await self.send_webhook_alert(alert)
            
    def resolve_alert(self, alert_type):
        """Разрешение алерта"""
        # Находим и удаляем из активных
        for alert in self.alerts['active']:
            if alert['type'] == alert_type:
                alert['resolved_at'] = datetime.now()
                self.alerts['resolved'].append(alert)
                self.alerts['active'].remove(alert)
                self.logger.info(f"✅ Алерт разрешен: {alert_type}")
                break
                
    def get_alert_severity(self, alert_type):
        """Определение серьезности алерта"""
        critical_alerts = ['fastapi_unavailable', 'database_unavailable', 'bot_manager_no_workers']
        warning_alerts = ['fastapi_unhealthy', 'redis_unavailable', 'cpu_high', 'memory_high']
        
        if alert_type in critical_alerts:
            return 'critical'
        elif alert_type in warning_alerts:
            return 'warning'
        else:
            return 'info'
            
    async def send_webhook_alert(self, alert):
        """Отправка алерта в webhook"""
        try:
            severity_emoji = {
                'critical': '🚨',
                'warning': '⚠️',
                'info': 'ℹ️'
            }
            
            payload = {
                'text': f"{severity_emoji.get(alert['severity'], '🔔')} **ChatAI Alert [{alert['severity'].upper()}]**\n"
                        f"**Type:** {alert['type']}\n"
                        f"**Message:** {alert['message']}\n"
                        f"**Time:** {alert['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.config['alert_webhook'], json=payload) as response:
                    if response.status == 200:
                        self.logger.info(f"📤 Алерт отправлен в webhook: {alert['type']}")
                    else:
                        self.logger.error(f"❌ Ошибка отправки алерта в webhook: {response.status}")
                        
        except Exception as e:
            self.logger.error(f"❌ Ошибка отправки webhook алерта: {e}")
            
    async def save_status(self):
        """Сохранение общего статуса системы"""
        try:
            os.makedirs('tmp', exist_ok=True)
            
            # Подготовка данных для сериализации
            status_data = {}
            
            for component, status in self.components_status.items():
                status_data[component] = {
                    'status': status['status'],
                    'last_check': status['last_check'].isoformat() if status['last_check'] else None,
                    'details': status['details']
                }
                
            # Общий статус системы
            overall_status = self.calculate_overall_status()
            
            full_status = {
                'timestamp': datetime.now().isoformat(),
                'overall_status': overall_status,
                'components': status_data,
                'alerts': {
                    'active_count': len(self.alerts['active']),
                    'active_alerts': [
                        {
                            'type': alert['type'],
                            'message': alert['message'],
                            'severity': alert['severity'],
                            'timestamp': alert['timestamp'].isoformat()
                        }
                        for alert in self.alerts['active']
                    ]
                }
            }
            
            with open(self.config['status_file'], 'w') as f:
                json.dump(full_status, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"❌ Ошибка сохранения статуса: {e}")
            
    def calculate_overall_status(self):
        """Расчет общего статуса системы"""
        statuses = [comp['status'] for comp in self.components_status.values()]
        
        if 'error' in statuses:
            return 'critical'
        elif 'warning' in statuses:
            return 'warning'
        elif all(status == 'healthy' for status in statuses):
            return 'healthy'
        else:
            return 'unknown'
            
    async def run_monitoring_cycle(self):
        """Один цикл мониторинга всех компонентов"""
        self.logger.info("🔄 Запуск цикла мониторинга системы")
        
        # Проверяем все компоненты параллельно
        tasks = [
            self.check_fastapi_health(),
            self.check_bot_manager_health(),
            self.check_database_health(),
            self.check_redis_health(),
            self.check_system_resources()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Подсчет успешных проверок
        successful_checks = sum(1 for result in results if result is True)
        total_checks = len(tasks)
        
        # Логирование результатов
        overall_status = self.calculate_overall_status()
        self.logger.info(f"📊 Цикл мониторинга завершен: {successful_checks}/{total_checks} компонентов в порядке")
        self.logger.info(f"📊 Общий статус системы: {overall_status.upper()}")
        
        # Сохранение статуса
        await self.save_status()
        
        return overall_status
        
    async def run(self):
        """Основной цикл мониторинга"""
        self.logger.info("📊 Запуск системного мониторинга ChatAI")
        self.logger.info(f"⏰ Интервал проверки: {self.config['check_interval']}с")
        
        try:
            while True:
                await self.run_monitoring_cycle()
                await asyncio.sleep(self.config['check_interval'])
                
        except KeyboardInterrupt:
            self.logger.info("🔄 Остановка мониторинга")
        except Exception as e:
            self.logger.error(f"❌ Критическая ошибка мониторинга: {e}")
            raise

def main():
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'status':
            # Показать статус
            try:
                with open('tmp/system_status.json', 'r') as f:
                    status = json.load(f)
                    
                print("📊 ChatAI System Status:")
                print(f"   Overall: {status['overall_status'].upper()}")
                print(f"   Last check: {status['timestamp']}")
                print("\n📦 Components:")
                
                for comp_name, comp_status in status['components'].items():
                    status_icon = {
                        'healthy': '✅',
                        'warning': '⚠️',
                        'error': '❌',
                        'unknown': '❓'
                    }.get(comp_status['status'], '❓')
                    
                    print(f"   {status_icon} {comp_name}: {comp_status['status']}")
                    
                if status['alerts']['active_count'] > 0:
                    print(f"\n🚨 Active Alerts ({status['alerts']['active_count']}):")
                    for alert in status['alerts']['active_alerts']:
                        print(f"   • [{alert['severity']}] {alert['type']}: {alert['message']}")
                        
            except FileNotFoundError:
                print("❌ Статус не найден. Монитор не запущен?")
            except Exception as e:
                print(f"❌ Ошибка получения статуса: {e}")
                
        else:
            print(f"❌ Неизвестная команда: {command}")
            print("Доступные команды: status")
    else:
        # Запуск мониторинга
        monitor = SystemMonitor()
        asyncio.run(monitor.run())

if __name__ == "__main__":
    main()