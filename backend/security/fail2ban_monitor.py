#!/usr/bin/env python3
"""
Мониторинг fail2ban статуса и заблокированных IP адресов
Интеграция с Prometheus metrics для отслеживания безопасности
"""

import subprocess
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import sys
import os

# Добавляем путь к корню проекта для импорта модулей
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from monitoring.audit_logger import audit_log

logger = logging.getLogger(__name__)


class Fail2banMonitor:
    """Мониторинг состояния fail2ban и заблокированных IP"""
    
    def __init__(self):
        self.fail2ban_client = self._find_fail2ban_client()
        
    def _find_fail2ban_client(self) -> str:
        """Находит путь к fail2ban-client"""
        possible_paths = [
            '/usr/bin/fail2ban-client',
            '/usr/local/bin/fail2ban-client',
            'fail2ban-client'
        ]
        
        for path in possible_paths:
            try:
                subprocess.run([path, '--version'], 
                             capture_output=True, check=True, timeout=5)
                return path
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                continue
                
        raise RuntimeError("fail2ban-client не найден в системе")
    
    def is_fail2ban_running(self) -> bool:
        """Проверяет, запущен ли fail2ban"""
        try:
            result = subprocess.run(
                [self.fail2ban_client, 'ping'],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0 and 'pong' in result.stdout.lower()
        except Exception as e:
            logger.error(f"Ошибка проверки статуса fail2ban: {e}")
            return False
    
    def get_jail_status(self, jail_name: str) -> Dict:
        """Получает статус конкретного jail"""
        try:
            result = subprocess.run(
                [self.fail2ban_client, 'status', jail_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return {'error': f"Jail {jail_name} не найден или не активен"}
            
            status_text = result.stdout
            
            # Парсим вывод fail2ban-client status
            status = {
                'jail_name': jail_name,
                'currently_failed': 0,
                'total_failed': 0,
                'currently_banned': 0,
                'total_banned': 0,
                'banned_ips': [],
                'file_list': []
            }
            
            lines = status_text.split('\n')
            for line in lines:
                line = line.strip()
                if 'Currently failed:' in line:
                    status['currently_failed'] = int(line.split(':')[1].strip())
                elif 'Total failed:' in line:
                    status['total_failed'] = int(line.split(':')[1].strip())
                elif 'Currently banned:' in line:
                    status['currently_banned'] = int(line.split(':')[1].strip())
                elif 'Total banned:' in line:
                    status['total_banned'] = int(line.split(':')[1].strip())
                elif 'Banned IP list:' in line:
                    ips_text = line.split(':', 1)[1].strip()
                    if ips_text:
                        status['banned_ips'] = [ip.strip() for ip in ips_text.split()]
                elif 'File list:' in line:
                    files_text = line.split(':', 1)[1].strip()
                    if files_text:
                        status['file_list'] = [f.strip() for f in files_text.split()]
            
            return status
            
        except Exception as e:
            logger.error(f"Ошибка получения статуса jail {jail_name}: {e}")
            return {'error': str(e)}
    
    def get_all_jails_status(self) -> Dict:
        """Получает статус всех активных jails"""
        try:
            # Получаем список всех jails
            result = subprocess.run(
                [self.fail2ban_client, 'status'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return {'error': 'Не удалось получить список jails'}
            
            # Парсим список jails
            jails = []
            lines = result.stdout.split('\n')
            for line in lines:
                if 'Jail list:' in line:
                    jails_text = line.split(':', 1)[1].strip()
                    if jails_text:
                        jails = [jail.strip() for jail in jails_text.split(',')]
                    break
            
            # Получаем статус для каждого jail
            all_status = {
                'fail2ban_running': self.is_fail2ban_running(),
                'jails': {},
                'total_banned_ips': 0,
                'total_failed_attempts': 0,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            for jail in jails:
                if jail:
                    jail_status = self.get_jail_status(jail)
                    all_status['jails'][jail] = jail_status
                    
                    if 'error' not in jail_status:
                        all_status['total_banned_ips'] += jail_status.get('currently_banned', 0)
                        all_status['total_failed_attempts'] += jail_status.get('total_failed', 0)
            
            return all_status
            
        except Exception as e:
            logger.error(f"Ошибка получения статуса всех jails: {e}")
            return {'error': str(e)}
    
    def unban_ip(self, jail_name: str, ip_address: str) -> bool:
        """Разблокирует IP адрес в указанном jail"""
        try:
            result = subprocess.run(
                [self.fail2ban_client, 'set', jail_name, 'unbanip', ip_address],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            success = result.returncode == 0
            
            # Логируем операцию разблокировки
            audit_log(
                operation='fail2ban_unban',
                status='success' if success else 'failed',
                details={
                    'jail': jail_name,
                    'ip_address': ip_address,
                    'command_output': result.stdout if success else result.stderr
                }
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Ошибка разблокировки IP {ip_address} в jail {jail_name}: {e}")
            
            audit_log(
                operation='fail2ban_unban',
                status='error',
                details={
                    'jail': jail_name,
                    'ip_address': ip_address,
                    'error': str(e)
                }
            )
            
            return False
    
    def ban_ip(self, jail_name: str, ip_address: str) -> bool:
        """Заблокирует IP адрес в указанном jail"""
        try:
            result = subprocess.run(
                [self.fail2ban_client, 'set', jail_name, 'banip', ip_address],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            success = result.returncode == 0
            
            # Логируем операцию блокировки
            audit_log(
                operation='fail2ban_ban',
                status='success' if success else 'failed',
                details={
                    'jail': jail_name,
                    'ip_address': ip_address,
                    'command_output': result.stdout if success else result.stderr
                }
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Ошибка блокировки IP {ip_address} в jail {jail_name}: {e}")
            
            audit_log(
                operation='fail2ban_ban',
                status='error',
                details={
                    'jail': jail_name,
                    'ip_address': ip_address,
                    'error': str(e)
                }
            )
            
            return False
    
    def get_ban_history(self, hours: int = 24) -> List[Dict]:
        """Получает историю блокировок из логов fail2ban"""
        try:
            log_files = [
                '/var/log/fail2ban.log',
                '/var/log/fail2ban.log.1'
            ]
            
            ban_events = []
            since_time = datetime.now() - timedelta(hours=hours)
            
            for log_file in log_files:
                if not Path(log_file).exists():
                    continue
                    
                try:
                    with open(log_file, 'r') as f:
                        for line in f:
                            if 'Ban ' in line or 'Unban ' in line:
                                # Парсим строку лога fail2ban
                                parts = line.strip().split()
                                if len(parts) >= 6:
                                    timestamp_str = ' '.join(parts[:3])
                                    try:
                                        log_time = datetime.strptime(
                                            f"{datetime.now().year} {timestamp_str}",
                                            "%Y %Y-%m-%d %H:%M:%S,%f"
                                        )
                                    except ValueError:
                                        continue
                                    
                                    if log_time >= since_time:
                                        ban_events.append({
                                            'timestamp': log_time.isoformat(),
                                            'action': 'ban' if 'Ban ' in line else 'unban',
                                            'log_line': line.strip()
                                        })
                                        
                except Exception as e:
                    logger.warning(f"Ошибка чтения лог файла {log_file}: {e}")
            
            return sorted(ban_events, key=lambda x: x['timestamp'], reverse=True)
            
        except Exception as e:
            logger.error(f"Ошибка получения истории блокировок: {e}")
            return []
    
    def generate_report(self) -> Dict:
        """Генерирует полный отчет о состоянии fail2ban"""
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'fail2ban_status': self.get_all_jails_status(),
            'ban_history_24h': self.get_ban_history(24),
            'recommendations': []
        }
        
        # Добавляем рекомендации на основе статистики
        status = report['fail2ban_status']
        
        if not status.get('fail2ban_running', False):
            report['recommendations'].append({
                'priority': 'critical',
                'message': 'fail2ban не запущен! Система уязвима для брут-форс атак.'
            })
        
        if status.get('total_banned_ips', 0) > 100:
            report['recommendations'].append({
                'priority': 'warning',
                'message': f"Большое количество заблокированных IP ({status['total_banned_ips']}). Возможна атака."
            })
        
        if status.get('total_failed_attempts', 0) > 1000:
            report['recommendations'].append({
                'priority': 'warning',
                'message': f"Высокое количество неудачных попыток ({status['total_failed_attempts']}). Рекомендуется анализ."
            })
        
        return report


def main():
    """Основная функция для запуска мониторинга"""
    monitor = Fail2banMonitor()
    
    try:
        report = monitor.generate_report()
        print(json.dumps(report, indent=2, ensure_ascii=False))
        
        # Логируем отчет
        audit_log(
            operation='fail2ban_monitoring',
            status='success',
            details={
                'total_banned_ips': report['fail2ban_status'].get('total_banned_ips', 0),
                'total_failed_attempts': report['fail2ban_status'].get('total_failed_attempts', 0),
                'fail2ban_running': report['fail2ban_status'].get('fail2ban_running', False),
                'active_jails': len(report['fail2ban_status'].get('jails', {}))
            }
        )
        
    except Exception as e:
        logger.error(f"Ошибка генерации отчета: {e}")
        print(json.dumps({'error': str(e)}, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()