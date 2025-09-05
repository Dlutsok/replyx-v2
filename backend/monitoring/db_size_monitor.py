#!/usr/bin/env python3
"""
📊 МОНИТОРИНГ РАЗМЕРА БАЗЫ ДАННЫХ ChatAI
Отслеживание роста БД, размеров таблиц, свободного места на диске
Автоматические алерты при критических показателях
"""

import os
import sys
import time
import logging
import psutil
import json
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from pathlib import Path
try:
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
except ImportError:
    # Fallback для совместимости
    MimeText = None
    MimeMultipart = None

# Добавляем путь к корню проекта для импорта модулей
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from monitoring.audit_logger import audit_log
from core.app_config import *

logger = logging.getLogger(__name__)


class DatabaseSizeMonitor:
    """Мониторинг размера БД и дискового пространства"""
    
    def __init__(self):
        self.thresholds = {
            'db_size_gb': float(os.getenv('DB_SIZE_THRESHOLD_GB', '10')),  # 10GB
            'table_size_gb': float(os.getenv('TABLE_SIZE_THRESHOLD_GB', '1')),  # 1GB
            'disk_usage_percent': float(os.getenv('DB_DISK_USAGE_THRESHOLD', '0.85')),  # 85%
            'growth_rate_mb_day': float(os.getenv('DB_GROWTH_THRESHOLD_MB_DAY', '100'))  # 100MB/день
        }
        
        self.email_alerts = os.getenv('DB_MONITOR_EMAIL_ALERTS', 'false').lower() == 'true'
        self.alert_emails = os.getenv('DB_MONITOR_ALERT_EMAILS', '').split(',')
        
        # Файл для хранения истории размеров
        self.history_file = Path('data/db_size_history.json')
        self.history_file.parent.mkdir(exist_ok=True)
        
    def get_database_size_info(self) -> Dict[str, Any]:
        """Получает подробную информацию о размерах БД"""
        try:
            db = next(get_db())
            try:
                # Общий размер БД
                db_info = db.execute(text("""
                    SELECT 
                        pg_database_size(current_database()) as size_bytes,
                        pg_size_pretty(pg_database_size(current_database())) as size_pretty,
                        current_database() as database_name
                """)).fetchone()
                
                # Размеры всех таблиц
                table_sizes = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) as total_bytes,
                        pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as total_size,
                        pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) as table_bytes,
                        pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as table_size,
                        pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) - 
                        pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) as index_bytes,
                        pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) - 
                        pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as index_size
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC
                """)).fetchall()
                
                # Статистика строк в таблицах
                row_counts = db.execute(text("""
                    SELECT 
                        schemaname,
                        relname as tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes,
                        n_live_tup as live_rows,
                        n_dead_tup as dead_rows,
                        last_vacuum,
                        last_autovacuum,
                        last_analyze,
                        last_autoanalyze
                    FROM pg_stat_user_tables
                    ORDER BY n_live_tup DESC
                """)).fetchall()
                
                # Информация об индексах
                index_sizes = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(indexname))) as index_size,
                        pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(indexname)) as index_bytes
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                    ORDER BY pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(indexname)) DESC
                """)).fetchall()
                
                # Преобразуем в структуры данных
                tables = []
                for table_row in table_sizes:
                    # Ищем статистику строк для этой таблицы
                    table_stats = next((r for r in row_counts if r.tablename == table_row.tablename), None)
                    
                    # Ищем индексы для этой таблицы
                    table_indexes = [
                        {
                            'name': idx.indexname,
                            'size': idx.index_size,
                            'bytes': idx.index_bytes
                        }
                        for idx in index_sizes if idx.tablename == table_row.tablename
                    ]
                    
                    table_info = {
                        'schema': table_row.schemaname,
                        'name': table_row.tablename,
                        'total_size': table_row.total_size,
                        'total_bytes': table_row.total_bytes,
                        'table_size': table_row.table_size,
                        'table_bytes': table_row.table_bytes,
                        'index_size': table_row.index_size,
                        'index_bytes': table_row.index_bytes,
                        'indexes': table_indexes
                    }
                    
                    if table_stats:
                        table_info.update({
                            'live_rows': table_stats.live_rows,
                            'dead_rows': table_stats.dead_rows,
                            'inserts': table_stats.inserts,
                            'updates': table_stats.updates,
                            'deletes': table_stats.deletes,
                            'last_vacuum': table_stats.last_vacuum.isoformat() if table_stats.last_vacuum else None,
                            'last_analyze': table_stats.last_analyze.isoformat() if table_stats.last_analyze else None
                        })
                    
                    tables.append(table_info)
                
                return {
                    'timestamp': datetime.utcnow().isoformat(),
                    'database': {
                        'name': db_info.database_name,
                        'size_bytes': db_info.size_bytes,
                        'size_pretty': db_info.size_pretty,
                        'size_gb': round(db_info.size_bytes / (1024**3), 2)
                    },
                    'tables': tables,
                    'total_tables': len(tables),
                    'largest_table': tables[0] if tables else None
                }
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Ошибка получения информации о размере БД: {e}")
            return {'error': str(e)}
    
    def get_disk_space_info(self) -> Dict[str, Any]:
        """Получает информацию о дисковом пространстве"""
        try:
            db = next(get_db())
            try:
                # Путь к данным PostgreSQL
                data_directory = db.execute(text("""
                    SELECT setting FROM pg_settings WHERE name = 'data_directory'
                """)).scalar()
                
                disk_info = {}
                
                if data_directory and os.path.exists(data_directory):
                    usage = psutil.disk_usage(data_directory)
                    disk_info = {
                        'data_directory': data_directory,
                        'total_bytes': usage.total,
                        'used_bytes': usage.used,
                        'free_bytes': usage.free,
                        'total_gb': round(usage.total / (1024**3), 2),
                        'used_gb': round(usage.used / (1024**3), 2),
                        'free_gb': round(usage.free / (1024**3), 2),
                        'used_percent': round(usage.used / usage.total * 100, 2),
                        'free_percent': round(usage.free / usage.total * 100, 2)
                    }
                else:
                    # Fallback - проверяем текущий диск
                    usage = psutil.disk_usage('.')
                    disk_info = {
                        'data_directory': 'unknown (using current directory)',
                        'total_bytes': usage.total,
                        'used_bytes': usage.used,
                        'free_bytes': usage.free,
                        'total_gb': round(usage.total / (1024**3), 2),
                        'used_gb': round(usage.used / (1024**3), 2),
                        'free_gb': round(usage.free / (1024**3), 2),
                        'used_percent': round(usage.used / usage.total * 100, 2),
                        'free_percent': round(usage.free / usage.total * 100, 2)
                    }
                
                return disk_info
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Ошибка получения информации о диске: {e}")
            return {'error': str(e)}
    
    def calculate_growth_rate(self, current_size: int) -> Optional[float]:
        """Вычисляет скорость роста БД в MB/день"""
        try:
            history = self.load_size_history()
            
            if len(history) < 2:
                return None
                
            # Берем последние две записи для расчета
            prev_record = history[-2]
            current_time = datetime.utcnow()
            prev_time = datetime.fromisoformat(prev_record['timestamp'])
            
            time_diff_days = (current_time - prev_time).total_seconds() / 86400
            if time_diff_days <= 0:
                return None
                
            size_diff_mb = (current_size - prev_record['size_bytes']) / (1024**2)
            growth_rate = size_diff_mb / time_diff_days
            
            return round(growth_rate, 2)
            
        except Exception as e:
            logger.error(f"Ошибка расчета скорости роста: {e}")
            return None
    
    def load_size_history(self) -> List[Dict]:
        """Загружает историю размеров БД"""
        try:
            if self.history_file.exists():
                with open(self.history_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка загрузки истории размеров: {e}")
        return []
    
    def save_size_history(self, db_info: Dict) -> None:
        """Сохраняет текущий размер в историю"""
        try:
            history = self.load_size_history()
            
            # Добавляем новую запись
            history.append({
                'timestamp': datetime.utcnow().isoformat(),
                'size_bytes': db_info['database']['size_bytes'],
                'size_gb': db_info['database']['size_gb'],
                'table_count': db_info['total_tables']
            })
            
            # Оставляем только последние 30 дней (при частоте 1 раз в час = 720 записей)
            max_records = 720
            if len(history) > max_records:
                history = history[-max_records:]
            
            with open(self.history_file, 'w') as f:
                json.dump(history, f, indent=2)
                
        except Exception as e:
            logger.error(f"Ошибка сохранения истории размеров: {e}")
    
    def check_thresholds(self, db_info: Dict, disk_info: Dict) -> List[Dict]:
        """Проверяет пороговые значения и возвращает алерты"""
        alerts = []
        
        # Проверка размера БД
        db_size_gb = db_info['database']['size_gb']
        if db_size_gb > self.thresholds['db_size_gb']:
            alerts.append({
                'type': 'database_size',
                'severity': 'warning',
                'message': f"Размер БД превысил порог: {db_size_gb:.2f}GB > {self.thresholds['db_size_gb']}GB",
                'current_value': db_size_gb,
                'threshold': self.thresholds['db_size_gb']
            })
        
        # Проверка размеров таблиц
        for table in db_info['tables']:
            table_size_gb = table['total_bytes'] / (1024**3)
            if table_size_gb > self.thresholds['table_size_gb']:
                alerts.append({
                    'type': 'table_size',
                    'severity': 'info',
                    'message': f"Таблица {table['name']} превысила порог: {table_size_gb:.2f}GB > {self.thresholds['table_size_gb']}GB",
                    'table_name': table['name'],
                    'current_value': table_size_gb,
                    'threshold': self.thresholds['table_size_gb']
                })
        
        # Проверка дискового пространства
        if 'used_percent' in disk_info:
            used_percent = disk_info['used_percent'] / 100
            if used_percent > self.thresholds['disk_usage_percent']:
                alerts.append({
                    'type': 'disk_space',
                    'severity': 'critical',
                    'message': f"Использование диска превысило порог: {disk_info['used_percent']:.1f}% > {self.thresholds['disk_usage_percent']*100:.1f}%",
                    'current_value': used_percent,
                    'threshold': self.thresholds['disk_usage_percent'],
                    'free_gb': disk_info['free_gb']
                })
        
        # Проверка скорости роста
        growth_rate = self.calculate_growth_rate(db_info['database']['size_bytes'])
        if growth_rate and growth_rate > self.thresholds['growth_rate_mb_day']:
            alerts.append({
                'type': 'growth_rate',
                'severity': 'warning',
                'message': f"Скорость роста БД превысила порог: {growth_rate:.2f}MB/день > {self.thresholds['growth_rate_mb_day']}MB/день",
                'current_value': growth_rate,
                'threshold': self.thresholds['growth_rate_mb_day']
            })
        
        return alerts
    
    def send_email_alert(self, alerts: List[Dict], db_info: Dict, disk_info: Dict) -> None:
        """Отправляет email алерт"""
        if not self.email_alerts or not self.alert_emails or not MimeText:
            return
            
        try:
            # Формируем тему письма
            critical_alerts = [a for a in alerts if a.get('severity') == 'critical']
            if critical_alerts:
                subject = f"🚨 КРИТИЧЕСКИЙ АЛЕРТ БД - ChatAI"
            else:
                subject = f"⚠️ Предупреждение о размере БД - ChatAI"
            
            # Формируем тело письма
            body = f"""
Отчет о мониторинге базы данных ChatAI
Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

📊 ТЕКУЩЕЕ СОСТОЯНИЕ:
• Размер БД: {db_info['database']['size_pretty']} ({db_info['database']['size_gb']:.2f} GB)
• Количество таблиц: {db_info['total_tables']}
• Использование диска: {disk_info.get('used_percent', 'N/A')}%
• Свободное место: {disk_info.get('free_gb', 'N/A')} GB

🚨 АЛЕРТЫ:
"""
            
            for alert in alerts:
                severity_emoji = {
                    'critical': '🔴',
                    'warning': '🟡', 
                    'info': '🔵'
                }.get(alert.get('severity', 'info'), '🔵')
                
                body += f"\n{severity_emoji} {alert['message']}"
            
            body += f"""

📈 САМЫЕ БОЛЬШИЕ ТАБЛИЦЫ:
"""
            for i, table in enumerate(db_info['tables'][:5], 1):
                body += f"\n{i}. {table['name']}: {table['total_size']} ({table['live_rows']:,} строк)"
            
            # Отправляем email
            msg = MimeMultipart()
            msg['From'] = os.getenv('SMTP_USER', 'noreply@chatai.com')
            msg['Subject'] = subject
            msg.attach(MimeText(body, 'plain', 'utf-8'))
            
            for email in self.alert_emails:
                if email.strip():
                    msg['To'] = email.strip()
                    
                    server = smtplib.SMTP(os.getenv('SMTP_HOST', 'localhost'), int(os.getenv('SMTP_PORT', '587')))
                    if os.getenv('SMTP_USER') and os.getenv('SMTP_PASSWORD'):
                        server.starttls()
                        server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASSWORD'))
                    
                    server.send_message(msg)
                    server.quit()
                    
                    logger.info(f"Email алерт отправлен на {email}")
                    
        except Exception as e:
            logger.error(f"Ошибка отправки email алерта: {e}")
    
    def generate_full_report(self) -> Dict[str, Any]:
        """Генерирует полный отчет о состоянии БД"""
        db_info = self.get_database_size_info()
        if 'error' in db_info:
            return db_info
            
        disk_info = self.get_disk_space_info()
        growth_rate = self.calculate_growth_rate(db_info['database']['size_bytes'])
        alerts = self.check_thresholds(db_info, disk_info)
        
        # Сохраняем в историю
        self.save_size_history(db_info)
        
        # Отправляем алерты при необходимости
        if alerts:
            self.send_email_alert(alerts, db_info, disk_info)
            
            # Логируем алерты в audit log
            for alert in alerts:
                audit_log(
                    operation='db_size_alert',
                    status='warning' if alert['severity'] != 'critical' else 'critical',
                    details=alert
                )
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'database_info': db_info,
            'disk_info': disk_info,
            'growth_rate_mb_per_day': growth_rate,
            'alerts': alerts,
            'thresholds': self.thresholds,
            'health_status': 'critical' if any(a['severity'] == 'critical' for a in alerts) else 
                           'warning' if alerts else 'healthy'
        }
        
        return report


def main():
    """Основная функция для запуска мониторинга"""
    monitor = DatabaseSizeMonitor()
    
    try:
        report = monitor.generate_full_report()
        
        # Выводим отчет
        print(json.dumps(report, indent=2, ensure_ascii=False))
        
        # Логируем успешное выполнение
        audit_log(
            operation='db_size_monitoring',
            status='success',
            details={
                'db_size_gb': report['database_info']['database']['size_gb'],
                'alerts_count': len(report['alerts']),
                'health_status': report['health_status'],
                'disk_usage_percent': report['disk_info'].get('used_percent', 0)
            }
        )
        
        # Возвращаем соответствующий код выхода
        if report['health_status'] == 'critical':
            sys.exit(2)
        elif report['health_status'] == 'warning':
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Ошибка мониторинга БД: {e}")
        print(json.dumps({'error': str(e)}, indent=2))
        sys.exit(3)


if __name__ == '__main__':
    main()