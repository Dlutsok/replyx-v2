#!/usr/bin/env python3
"""
Мониторинг производительности БД для ReplyX
Собирает метрики, детектит N+1, анализирует медленные запросы
"""

import os
import sys
import json
import time
import psutil
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import argparse

# Добавляем путь для импорта
sys.path.append(str(Path(__file__).parent.parent.parent))

@dataclass
class DatabaseMetrics:
    timestamp: str
    active_connections: int
    idle_connections: int
    waiting_connections: int
    total_connections: int
    database_size_mb: float
    largest_tables: List[Dict[str, Any]]
    slow_queries: List[Dict[str, Any]]
    unused_indexes: List[Dict[str, Any]]
    n_plus_one_suspects: List[Dict[str, Any]]
    cache_hit_ratio: float
    transaction_rate: float
    avg_query_time_ms: float
    cpu_usage_percent: float
    memory_usage_mb: float
    disk_io_read_mb: float
    disk_io_write_mb: float

class DatabaseMonitor:
    def __init__(self, db_url: str = None):
        self.db_url = db_url or self._get_database_url()
        self.connection = None
        self.logger = self._setup_logging()
        
    def _get_database_url(self) -> str:
        """Получает URL БД из конфигурации"""
        try:
            from core.app_config import DATABASE_URL
            return DATABASE_URL
        except ImportError:
            return os.environ.get('DATABASE_URL', 'postgresql://localhost/replyx_db')
    
    def _setup_logging(self) -> logging.Logger:
        """Настраивает логирование"""
        logger = logging.getLogger('db_monitor')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Создаем папку для логов
            log_dir = Path(__file__).parent.parent.parent / "logs" / "monitoring"
            log_dir.mkdir(parents=True, exist_ok=True)
            
            # Файл с ротацией
            handler = logging.FileHandler(
                log_dir / f"db_performance_{datetime.now().strftime('%Y%m%d')}.log"
            )
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
            # Консоль
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        return logger
    
    def connect(self) -> bool:
        """Подключается к БД"""
        try:
            import psycopg2
            from urllib.parse import urlparse
            
            # Парсим URL подключения
            parsed = urlparse(self.db_url)
            
            self.connection = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path[1:] if parsed.path else 'postgres',
                user=parsed.username,
                password=parsed.password
            )
            
            self.logger.info("Подключение к БД установлено")
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка подключения к БД: {e}")
            return False
    
    def get_connection_stats(self) -> Dict[str, int]:
        """Получает статистику подключений"""
        query = """
        SELECT 
            state,
            COUNT(*) as count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state;
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                
                stats = {
                    'active': 0,
                    'idle': 0,
                    'idle_in_transaction': 0,
                    'waiting': 0,
                    'total': 0
                }
                
                for state, count in rows:
                    if state == 'active':
                        stats['active'] = count
                    elif state == 'idle':
                        stats['idle'] = count
                    elif state == 'idle in transaction':
                        stats['idle_in_transaction'] = count
                    elif state == 'waiting':
                        stats['waiting'] = count
                    
                    stats['total'] += count
                
                return stats
                
        except Exception as e:
            self.logger.error(f"Ошибка получения статистики подключений: {e}")
            return {}
    
    def get_database_size(self) -> float:
        """Получает размер БД в MB"""
        query = """
        SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 as size_mb;
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query)
                return cur.fetchone()[0]
        except Exception as e:
            self.logger.error(f"Ошибка получения размера БД: {e}")
            return 0.0
    
    def get_largest_tables(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Получает самые большие таблицы"""
        query = """
        SELECT 
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0 as total_size_mb,
            pg_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0 as table_size_mb,
            (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) / 1024.0 / 1024.0 as index_size_mb,
            n_tup_ins + n_tup_upd + n_tup_del as total_dml_ops,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows
        FROM pg_tables pt
        LEFT JOIN pg_stat_user_tables pst ON pt.tablename = pst.relname
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT %s;
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query, (limit,))
                rows = cur.fetchall()
                
                return [
                    {
                        'schema': row[0],
                        'table': row[1],
                        'total_size_mb': float(row[2]),
                        'table_size_mb': float(row[3]),
                        'index_size_mb': float(row[4]),
                        'total_dml_ops': int(row[5] or 0),
                        'live_rows': int(row[6] or 0),
                        'dead_rows': int(row[7] or 0)
                    }
                    for row in rows
                ]
        except Exception as e:
            self.logger.error(f"Ошибка получения размеров таблиц: {e}")
            return []
    
    def get_slow_queries(self, min_calls: int = 5) -> List[Dict[str, Any]]:
        """Получает медленные запросы из pg_stat_statements"""
        # Проверяем наличие расширения
        check_extension = """
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements');
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(check_extension)
                if not cur.fetchone()[0]:
                    self.logger.warning("Расширение pg_stat_statements не установлено")
                    return []
                
                # Получаем медленные запросы
                query = """
                SELECT 
                    LEFT(query, 100) as query_preview,
                    calls,
                    total_time,
                    mean_time,
                    max_time,
                    stddev_time,
                    rows,
                    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) as hit_percent
                FROM pg_stat_statements
                WHERE calls >= %s
                    AND mean_time > 100  -- Медленнее 100ms
                ORDER BY mean_time DESC
                LIMIT 20;
                """
                
                cur.execute(query, (min_calls,))
                rows = cur.fetchall()
                
                return [
                    {
                        'query_preview': row[0],
                        'calls': int(row[1]),
                        'total_time': float(row[2]),
                        'mean_time': float(row[3]),
                        'max_time': float(row[4]),
                        'stddev_time': float(row[5]) if row[5] else 0,
                        'rows': int(row[6]),
                        'cache_hit_percent': float(row[7]) if row[7] else 0
                    }
                    for row in rows
                ]
        except Exception as e:
            self.logger.error(f"Ошибка получения медленных запросов: {e}")
            return []
    
    def get_unused_indexes(self) -> List[Dict[str, Any]]:
        """Получает неиспользуемые индексы"""
        query = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            pg_relation_size(indexrelid) / 1024.0 / 1024.0 as index_size_mb
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
            AND indexrelid NOT IN (
                -- Исключаем PK и UNIQUE индексы
                SELECT indexrelid FROM pg_constraint WHERE contype IN ('p','u')
            )
        ORDER BY pg_relation_size(indexrelid) DESC;
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                
                return [
                    {
                        'schema': row[0],
                        'table': row[1],
                        'index': row[2],
                        'scans': int(row[3]),
                        'size': row[4],
                        'size_mb': float(row[5])
                    }
                    for row in rows
                ]
        except Exception as e:
            self.logger.error(f"Ошибка получения неиспользуемых индексов: {e}")
            return []
    
    def detect_n_plus_one_suspects(self) -> List[Dict[str, Any]]:
        """Детектит подозрительные паттерны N+1"""
        if not hasattr(self, '_query_log'):
            return []
        
        # Анализируем логи запросов на паттерны N+1
        suspects = []
        query_patterns = {}
        
        for query_info in self._query_log:
            # Нормализуем запрос (убираем конкретные значения)
            normalized = self._normalize_query(query_info['query'])
            
            if normalized not in query_patterns:
                query_patterns[normalized] = []
            
            query_patterns[normalized].append(query_info)
        
        # Ищем паттерны с множественными похожими запросами
        for pattern, queries in query_patterns.items():
            if len(queries) > 10:  # Подозрительно много одинаковых запросов
                suspects.append({
                    'pattern': pattern,
                    'count': len(queries),
                    'avg_time': sum(q['duration'] for q in queries) / len(queries),
                    'total_time': sum(q['duration'] for q in queries),
                    'suspected_n_plus_one': True
                })
        
        return suspects
    
    def _normalize_query(self, query: str) -> str:
        """Нормализует запрос для поиска паттернов"""
        import re
        
        # Убираем конкретные значения
        normalized = re.sub(r'\b\d+\b', '?', query)  # Числа
        normalized = re.sub(r"'[^']*'", "'?'", normalized)  # Строки
        normalized = re.sub(r'\s+', ' ', normalized)  # Множественные пробелы
        
        return normalized.strip().lower()
    
    def get_cache_hit_ratio(self) -> float:
        """Получает коэффициент попаданий в кэш"""
        query = """
        SELECT 
            100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database();
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query)
                result = cur.fetchone()[0]
                return float(result) if result else 0.0
        except Exception as e:
            self.logger.error(f"Ошибка получения cache hit ratio: {e}")
            return 0.0
    
    def get_transaction_rate(self) -> float:
        """Получает количество транзакций в секунду"""
        query = """
        SELECT 
            xact_commit + xact_rollback as total_transactions
        FROM pg_stat_database
        WHERE datname = current_database();
        """
        
        try:
            with self.connection.cursor() as cur:
                cur.execute(query)
                current_transactions = cur.fetchone()[0]
                
                # Для расчета rate нужны два измерения
                if hasattr(self, '_prev_transactions'):
                    rate = (current_transactions - self._prev_transactions) / 60  # за минуту
                    self._prev_transactions = current_transactions
                    return float(rate)
                else:
                    self._prev_transactions = current_transactions
                    return 0.0
                    
        except Exception as e:
            self.logger.error(f"Ошибка получения transaction rate: {e}")
            return 0.0
    
    def get_avg_query_time(self) -> float:
        """Получает среднее время выполнения запросов"""
        try:
            with self.connection.cursor() as cur:
                # Проверяем pg_stat_statements
                check_query = "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')"
                cur.execute(check_query)
                
                if not cur.fetchone()[0]:
                    return 0.0
                
                query = """
                SELECT AVG(mean_time) as avg_query_time
                FROM pg_stat_statements
                WHERE calls > 1;
                """
                
                cur.execute(query)
                result = cur.fetchone()[0]
                return float(result) if result else 0.0
                
        except Exception as e:
            self.logger.error(f"Ошибка получения среднего времени запросов: {e}")
            return 0.0
    
    def get_system_metrics(self) -> Dict[str, float]:
        """Получает системные метрики сервера"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_used_mb = memory.used / 1024 / 1024
            
            # Disk I/O
            disk_io = psutil.disk_io_counters()
            disk_read_mb = disk_io.read_bytes / 1024 / 1024 if disk_io else 0
            disk_write_mb = disk_io.write_bytes / 1024 / 1024 if disk_io else 0
            
            return {
                'cpu_usage_percent': cpu_percent,
                'memory_usage_mb': memory_used_mb,
                'disk_io_read_mb': disk_read_mb,
                'disk_io_write_mb': disk_write_mb
            }
            
        except Exception as e:
            self.logger.error(f"Ошибка получения системных метрик: {e}")
            return {
                'cpu_usage_percent': 0.0,
                'memory_usage_mb': 0.0,
                'disk_io_read_mb': 0.0,
                'disk_io_write_mb': 0.0
            }
    
    def collect_metrics(self) -> DatabaseMetrics:
        """Собирает все метрики"""
        self.logger.info("Сбор метрик БД...")
        
        # Подключаемся если еще не подключены
        if not self.connection:
            if not self.connect():
                return None
        
        # Собираем все метрики
        connection_stats = self.get_connection_stats()
        system_metrics = self.get_system_metrics()
        
        metrics = DatabaseMetrics(
            timestamp=datetime.now().isoformat(),
            active_connections=connection_stats.get('active', 0),
            idle_connections=connection_stats.get('idle', 0),
            waiting_connections=connection_stats.get('waiting', 0),
            total_connections=connection_stats.get('total', 0),
            database_size_mb=self.get_database_size(),
            largest_tables=self.get_largest_tables(),
            slow_queries=self.get_slow_queries(),
            unused_indexes=self.get_unused_indexes(),
            n_plus_one_suspects=self.detect_n_plus_one_suspects(),
            cache_hit_ratio=self.get_cache_hit_ratio(),
            transaction_rate=self.get_transaction_rate(),
            avg_query_time_ms=self.get_avg_query_time(),
            cpu_usage_percent=system_metrics['cpu_usage_percent'],
            memory_usage_mb=system_metrics['memory_usage_mb'],
            disk_io_read_mb=system_metrics['disk_io_read_mb'],
            disk_io_write_mb=system_metrics['disk_io_write_mb']
        )
        
        return metrics
    
    def save_metrics(self, metrics: DatabaseMetrics, output_dir: Path = None):
        """Сохраняет метрики в файл"""
        if not output_dir:
            output_dir = Path(__file__).parent.parent.parent / "logs" / "monitoring"
            output_dir.mkdir(parents=True, exist_ok=True)
        
        # JSON файл с метриками
        json_file = output_dir / f"db_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(metrics), f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Метрики сохранены в: {json_file}")
        
        # CSV файл для временных рядов  
        csv_file = output_dir / "db_metrics_timeseries.csv"
        
        # Заголовок CSV если файл новый
        write_header = not csv_file.exists()
        
        import csv
        with open(csv_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=asdict(metrics).keys())
            
            if write_header:
                writer.writeheader()
            
            # Упрощаем сложные поля для CSV
            csv_metrics = asdict(metrics)
            csv_metrics['largest_tables'] = len(metrics.largest_tables)
            csv_metrics['slow_queries'] = len(metrics.slow_queries)
            csv_metrics['unused_indexes'] = len(metrics.unused_indexes)
            csv_metrics['n_plus_one_suspects'] = len(metrics.n_plus_one_suspects)
            
            writer.writerow(csv_metrics)
    
    def generate_report(self, metrics: DatabaseMetrics) -> str:
        """Генерирует отчет по метрикам"""
        report = f"""
📊 ОТЧЕТ ПО ПРОИЗВОДИТЕЛЬНОСТИ БД REPLYX
========================================
Время: {metrics.timestamp}

🔗 ПОДКЛЮЧЕНИЯ:
  Активных: {metrics.active_connections}
  Ожидающих: {metrics.idle_connections}
  В ожидании: {metrics.waiting_connections}
  Всего: {metrics.total_connections}

💾 РАЗМЕР БД: {metrics.database_size_mb:.2f} MB

🗂 САМЫЕ БОЛЬШИЕ ТАБЛИЦЫ:
"""
        
        for table in metrics.largest_tables[:5]:
            report += f"  📋 {table['table']}: {table['total_size_mb']:.2f} MB ({table['live_rows']:,} строк)\n"
        
        report += f"""
⚡ ПРОИЗВОДИТЕЛЬНОСТЬ:
  Попадание в кэш: {metrics.cache_hit_ratio:.2f}%
  Транзакций/мин: {metrics.transaction_rate:.2f}
  Среднее время запроса: {metrics.avg_query_time_ms:.2f}ms

🐌 МЕДЛЕННЫЕ ЗАПРОСЫ: {len(metrics.slow_queries)}
"""
        
        for query in metrics.slow_queries[:3]:
            report += f"  🚨 {query['query_preview'][:50]}... ({query['mean_time']:.2f}ms, {query['calls']} вызовов)\n"
        
        report += f"""
📈 СИСТЕМА:
  CPU: {metrics.cpu_usage_percent:.1f}%
  RAM: {metrics.memory_usage_mb:.0f} MB
  Диск I/O: {metrics.disk_io_read_mb:.1f} MB чтение, {metrics.disk_io_write_mb:.1f} MB запись

⚠️ ПРОБЛЕМЫ:
  Неиспользуемых индексов: {len(metrics.unused_indexes)}
  Подозрений на N+1: {len(metrics.n_plus_one_suspects)}
"""
        
        # Рекомендации
        recommendations = []
        
        if metrics.cache_hit_ratio < 95:
            recommendations.append("📌 Низкий cache hit ratio - увеличьте shared_buffers")
        
        if metrics.avg_query_time_ms > 100:
            recommendations.append("📌 Высокое время запросов - проверьте индексы")
        
        if len(metrics.unused_indexes) > 10:
            recommendations.append("📌 Много неиспользуемых индексов - рассмотрите удаление")
        
        if metrics.active_connections > 50:
            recommendations.append("📌 Много активных подключений - настройте connection pooling")
        
        if recommendations:
            report += "\n💡 РЕКОМЕНДАЦИИ:\n"
            for rec in recommendations:
                report += f"  {rec}\n"
        
        return report
    
    def start_monitoring(self, interval_minutes: int = 5, max_iterations: int = None):
        """Запускает непрерывный мониторинг"""
        self.logger.info(f"Запуск мониторинга с интервалом {interval_minutes} минут")
        
        iteration = 0
        
        try:
            while True:
                if max_iterations and iteration >= max_iterations:
                    break
                
                # Собираем метрики
                metrics = self.collect_metrics()
                
                if metrics:
                    # Сохраняем
                    self.save_metrics(metrics)
                    
                    # Генерируем отчет
                    report = self.generate_report(metrics)
                    print(report)
                    
                    # Проверяем критические проблемы
                    self.check_critical_issues(metrics)
                
                # Ждем следующую итерацию
                if max_iterations is None or iteration < max_iterations - 1:
                    time.sleep(interval_minutes * 60)
                
                iteration += 1
                
        except KeyboardInterrupt:
            self.logger.info("Мониторинг остановлен пользователем")
        except Exception as e:
            self.logger.error(f"Ошибка мониторинга: {e}")
    
    def check_critical_issues(self, metrics: DatabaseMetrics):
        """Проверяет критические проблемы"""
        issues = []
        
        # Критически низкий cache hit ratio
        if metrics.cache_hit_ratio < 90:
            issues.append(f"КРИТИЧНО: Cache hit ratio {metrics.cache_hit_ratio:.2f}% - очень низкий!")
        
        # Слишком много активных подключений
        if metrics.active_connections > 100:
            issues.append(f"КРИТИЧНО: {metrics.active_connections} активных подключений!")
        
        # Очень медленные запросы
        slow_queries = [q for q in metrics.slow_queries if q['mean_time'] > 1000]
        if slow_queries:
            issues.append(f"КРИТИЧНО: {len(slow_queries)} запросов медленнее 1 секунды!")
        
        # Высокая нагрузка на CPU
        if metrics.cpu_usage_percent > 90:
            issues.append(f"КРИТИЧНО: CPU загружен на {metrics.cpu_usage_percent:.1f}%!")
        
        if issues:
            self.logger.critical("ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ:")
            for issue in issues:
                self.logger.critical(f"  🚨 {issue}")
    
    def close(self):
        """Закрывает соединение"""
        if self.connection:
            self.connection.close()
            self.logger.info("Соединение с БД закрыто")

def main():
    parser = argparse.ArgumentParser(description='Мониторинг производительности БД ReplyX')
    parser.add_argument('--db-url', help='URL подключения к БД')
    parser.add_argument('--interval', type=int, default=5, 
                       help='Интервал мониторинга в минутах (по умолчанию: 5)')
    parser.add_argument('--max-iterations', type=int,
                       help='Максимальное количество итераций (по умолчанию: бесконечно)')
    parser.add_argument('--output-dir', type=Path,
                       help='Папка для сохранения метрик')
    parser.add_argument('--single-shot', action='store_true',
                       help='Собрать метрики один раз и выйти')
    
    args = parser.parse_args()
    
    # Создаем монитор
    monitor = DatabaseMonitor(args.db_url)
    
    try:
        if args.single_shot:
            # Одноразовый сбор метрик
            metrics = monitor.collect_metrics()
            if metrics:
                monitor.save_metrics(metrics, args.output_dir)
                report = monitor.generate_report(metrics)
                print(report)
        else:
            # Непрерывный мониторинг
            monitor.start_monitoring(
                interval_minutes=args.interval,
                max_iterations=args.max_iterations
            )
    finally:
        monitor.close()

if __name__ == '__main__':
    main()