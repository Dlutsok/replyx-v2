"""
📊 СИСТЕМА МОНИТОРИНГА БАЗЫ ДАННЫХ ChatAI
Мониторинг производительности, соединений, запросов и здоровья БД
"""

import os
import time
import logging
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
import json
from pathlib import Path

from database import engine, get_db_stats
from database.connection import get_db
from cache.redis_cache import cache

logger = logging.getLogger(__name__)

class DatabaseMonitor:
    """Система мониторинга PostgreSQL"""
    
    def __init__(self):
        self.engine = engine
        self.cache_ttl = 60  # Кэш метрик на 60 секунд
        
        # Пороговые значения для алертов
        self.thresholds = {
            'connection_usage': float(os.getenv('DB_CONNECTION_THRESHOLD', '0.8')),  # 80%
            'slow_query_time': float(os.getenv('DB_SLOW_QUERY_THRESHOLD', '5.0')),  # 5 секунд
            'deadlock_count': int(os.getenv('DB_DEADLOCK_THRESHOLD', '5')),  # 5 deadlocks/час
            'cache_hit_ratio': float(os.getenv('DB_CACHE_HIT_THRESHOLD', '0.95')),  # 95%
            'disk_usage': float(os.getenv('DB_DISK_USAGE_THRESHOLD', '0.85')),  # 85%
        }
        
        # История метрик
        self.metrics_history_file = Path('./data/logs/db_metrics_history.json')
        self.metrics_history_file.parent.mkdir(parents=True, exist_ok=True)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Статистика соединений"""
        try:
            # Статистика пула SQLAlchemy
            pool_stats = get_db_stats()
            
            # Статистика активных соединений из PostgreSQL
            with get_db() as db:
                pg_stats = db.execute(text("""
                    SELECT 
                        state,
                        COUNT(*) as count,
                        MAX(EXTRACT(EPOCH FROM (now() - state_change))) as max_duration
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                    GROUP BY state
                """)).fetchall()
                
                # Общее количество соединений
                total_connections = db.execute(text("""
                    SELECT COUNT(*) as total
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)).scalar()
                
                # Максимальное количество соединений
                max_connections = db.execute(text("""
                    SELECT setting::int as max_conn
                    FROM pg_settings 
                    WHERE name = 'max_connections'
                """)).scalar()
            
            # Формируем результат
            pg_connections = {}
            for row in pg_stats:
                pg_connections[row.state or 'unknown'] = {
                    'count': row.count,
                    'max_duration': row.max_duration or 0
                }
            
            connection_usage = total_connections / max_connections if max_connections else 0
            
            return {
                'pool': pool_stats,
                'postgresql': {
                    'total_connections': total_connections,
                    'max_connections': max_connections,
                    'usage_percent': round(connection_usage * 100, 2),
                    'by_state': pg_connections
                },
                'alerts': {
                    'high_usage': connection_usage > self.thresholds['connection_usage']
                }
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики соединений: {e}")
            return {'error': str(e)}
    
    def get_query_performance(self) -> Dict[str, Any]:
        """Статистика производительности запросов"""
        try:
            with get_db() as db:
                # Медленные запросы (требует pg_stat_statements)
                slow_queries = []
                try:
                    slow_queries_result = db.execute(text("""
                        SELECT 
                            query,
                            calls,
                            total_exec_time,
                            mean_exec_time,
                            max_exec_time,
                            rows
                        FROM pg_stat_statements 
                        WHERE mean_exec_time > :threshold
                        ORDER BY mean_exec_time DESC 
                        LIMIT 10
                    """), {'threshold': self.thresholds['slow_query_time'] * 1000}).fetchall()
                    
                    for row in slow_queries_result:
                        slow_queries.append({
                            'query': row.query[:200] + '...' if len(row.query) > 200 else row.query,
                            'calls': row.calls,
                            'total_time_ms': round(row.total_exec_time, 2),
                            'avg_time_ms': round(row.mean_exec_time, 2),
                            'max_time_ms': round(row.max_exec_time, 2),
                            'rows': row.rows
                        })
                except Exception:
                    # pg_stat_statements не установлен
                    pass
                
                # Статистика таблиц
                table_stats = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        seq_scan,
                        seq_tup_read,
                        idx_scan,
                        idx_tup_fetch,
                        n_tup_ins,
                        n_tup_upd,
                        n_tup_del
                    FROM pg_stat_user_tables 
                    ORDER BY seq_tup_read DESC 
                    LIMIT 10
                """)).fetchall()
                
                tables = []
                for row in table_stats:
                    scan_ratio = 0
                    if row.seq_scan and row.idx_scan:
                        scan_ratio = row.idx_scan / (row.seq_scan + row.idx_scan)
                    
                    tables.append({
                        'table': f"{row.schemaname}.{row.tablename}",
                        'seq_scans': row.seq_scan,
                        'index_scans': row.idx_scan,
                        'index_scan_ratio': round(scan_ratio, 3),
                        'inserts': row.n_tup_ins,
                        'updates': row.n_tup_upd,
                        'deletes': row.n_tup_del
                    })
                
                # Статистика индексов
                index_usage = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_scan,
                        idx_tup_read,
                        idx_tup_fetch
                    FROM pg_stat_user_indexes 
                    WHERE idx_scan = 0
                    ORDER BY schemaname, tablename
                """)).fetchall()
                
                unused_indexes = []
                for row in index_usage:
                    unused_indexes.append({
                        'schema': row.schemaname,
                        'table': row.tablename,
                        'index': row.indexname
                    })
            
            return {
                'slow_queries': slow_queries,
                'table_stats': tables,
                'unused_indexes': unused_indexes,
                'alerts': {
                    'has_slow_queries': len(slow_queries) > 0,
                    'has_unused_indexes': len(unused_indexes) > 0
                }
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики запросов: {e}")
            return {'error': str(e)}
    
    def get_database_size_stats(self) -> Dict[str, Any]:
        """Статистика размера БД и таблиц"""
        try:
            with get_db() as db:
                # Общий размер БД
                db_size = db.execute(text("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                           pg_database_size(current_database()) as size_bytes
                """)).fetchone()
                
                # Размеры таблиц (используем quote_ident для безопасности)
                table_sizes = db.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as size,
                        pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) as size_bytes,
                        pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as table_size,
                        pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) - pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as index_size
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC
                """)).fetchall()
                
                tables = []
                for row in table_sizes:
                    tables.append({
                        'table': f"{row.schemaname}.{row.tablename}",
                        'total_size': row.size,
                        'table_size': row.table_size,
                        'index_size': row.index_size,
                        'size_bytes': row.size_bytes
                    })
                
                # Статистика диска (если возможно)
                disk_stats = None
                try:
                    # Получаем путь к данным PostgreSQL
                    data_directory = db.execute(text("""
                        SELECT setting FROM pg_settings WHERE name = 'data_directory'
                    """)).scalar()
                    
                    if data_directory and os.path.exists(data_directory):
                        disk_usage = psutil.disk_usage(data_directory)
                        disk_stats = {
                            'total_gb': round(disk_usage.total / (1024**3), 2),
                            'used_gb': round(disk_usage.used / (1024**3), 2),
                            'free_gb': round(disk_usage.free / (1024**3), 2),
                            'usage_percent': round((disk_usage.used / disk_usage.total) * 100, 2)
                        }
                except Exception:
                    pass
            
            return {
                'database': {
                    'size': db_size.size,
                    'size_bytes': db_size.size_bytes
                },
                'tables': tables,
                'disk': disk_stats,
                'alerts': {
                    'disk_usage_high': disk_stats and disk_stats['usage_percent'] > (self.thresholds['disk_usage'] * 100)
                }
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики размера: {e}")
            return {'error': str(e)}
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Статистика кэша БД"""
        try:
            with get_db() as db:
                # Статистика буферного кэша
                buffer_stats = db.execute(text("""
                    SELECT 
                        round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as cache_hit_ratio,
                        sum(blks_hit) as cache_hits,
                        sum(blks_read) as disk_reads
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)).fetchone()
                
                # Статистика индексного кэша
                index_cache = db.execute(text("""
                    SELECT 
                        round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) as index_hit_ratio,
                        sum(idx_blks_hit) as index_hits,
                        sum(idx_blks_read) as index_reads
                    FROM pg_statio_user_indexes
                """)).fetchone()
                
                cache_hit_ratio = buffer_stats.cache_hit_ratio or 0
                index_hit_ratio = index_cache.index_hit_ratio or 0
                
            return {
                'buffer_cache': {
                    'hit_ratio_percent': cache_hit_ratio,
                    'cache_hits': buffer_stats.cache_hits,
                    'disk_reads': buffer_stats.disk_reads
                },
                'index_cache': {
                    'hit_ratio_percent': index_hit_ratio,
                    'index_hits': index_cache.index_hits or 0,
                    'index_reads': index_cache.index_reads or 0
                },
                'alerts': {
                    'low_cache_hit_ratio': cache_hit_ratio < (self.thresholds['cache_hit_ratio'] * 100)
                }
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики кэша: {e}")
            return {'error': str(e)}
    
    def get_replication_stats(self) -> Dict[str, Any]:
        """Статистика репликации (если настроена)"""
        try:
            with get_db() as db:
                # Проверяем, является ли сервер мастером
                is_master = db.execute(text("""
                    SELECT NOT pg_is_in_recovery() as is_master
                """)).scalar()
                
                replication_stats = {
                    'is_master': is_master,
                    'is_replica': not is_master,
                    'replicas': [],
                    'replication_lag': None
                }
                
                if is_master:
                    # Статистика реплик (для мастера)
                    replicas = db.execute(text("""
                        SELECT 
                            client_addr,
                            state,
                            sent_lsn,
                            write_lsn,
                            flush_lsn,
                            replay_lsn,
                            sync_state
                        FROM pg_stat_replication
                    """)).fetchall()
                    
                    for replica in replicas:
                        replication_stats['replicas'].append({
                            'client_addr': replica.client_addr,
                            'state': replica.state,
                            'sync_state': replica.sync_state,
                            'sent_lsn': replica.sent_lsn,
                            'write_lsn': replica.write_lsn,
                            'flush_lsn': replica.flush_lsn,
                            'replay_lsn': replica.replay_lsn
                        })
                else:
                    # Статистика отставания (для реплики)
                    lag_stats = db.execute(text("""
                        SELECT 
                            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
                    """)).fetchone()
                    
                    if lag_stats and lag_stats.lag_seconds:
                        replication_stats['replication_lag'] = round(lag_stats.lag_seconds, 2)
                
                return replication_stats
                
        except Exception as e:
            logger.error(f"Ошибка получения статистики репликации: {e}")
            return {'error': str(e)}
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Получение всех метрик БД"""
        try:
            # Проверяем кэш
            cached_stats = cache.get("db_comprehensive_stats")
            if cached_stats:
                return cached_stats
            
            stats = {
                'timestamp': datetime.now().isoformat(),
                'connections': self.get_connection_stats(),
                'performance': self.get_query_performance(),
                'size': self.get_database_size_stats(),
                'cache': self.get_cache_stats(),
                'replication': self.get_replication_stats(),
                'health_score': 100  # Будет вычислен ниже
            }
            
            # Вычисляем общий health score
            health_score = self._calculate_health_score(stats)
            stats['health_score'] = health_score
            
            # Сохраняем в кэш
            cache.set("db_comprehensive_stats", stats, self.cache_ttl)
            
            # Сохраняем в историю
            self._save_to_history(stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Ошибка получения комплексной статистики: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'health_score': 0
            }
    
    def _calculate_health_score(self, stats: Dict) -> int:
        """Вычисление общего показателя здоровья БД (0-100)"""
        score = 100
        
        try:
            # Соединения (-20 если > 80% использования)
            conn_stats = stats.get('connections', {}).get('postgresql', {})
            if conn_stats.get('usage_percent', 0) > 80:
                score -= 20
            
            # Кэш (-15 если hit ratio < 95%)
            cache_stats = stats.get('cache', {}).get('buffer_cache', {})
            if cache_stats.get('hit_ratio_percent', 100) < 95:
                score -= 15
            
            # Медленные запросы (-10 если есть)
            perf_stats = stats.get('performance', {})
            if perf_stats.get('slow_queries') and len(perf_stats['slow_queries']) > 0:
                score -= 10
            
            # Диск (-25 если > 85% использования)
            disk_stats = stats.get('size', {}).get('disk', {})
            if disk_stats and disk_stats.get('usage_percent', 0) > 85:
                score -= 25
            
            # Неиспользуемые индексы (-5 если есть)
            if perf_stats.get('unused_indexes') and len(perf_stats['unused_indexes']) > 0:
                score -= 5
            
        except Exception as e:
            logger.error(f"Ошибка вычисления health score: {e}")
            score = 50  # Средний показатель при ошибке
        
        return max(0, min(100, score))
    
    def _save_to_history(self, stats: Dict):
        """Сохранение метрик в историю"""
        try:
            # Загружаем существующую историю
            if self.metrics_history_file.exists():
                with open(self.metrics_history_file, 'r') as f:
                    history = json.load(f)
            else:
                history = {'metrics': []}
            
            # Добавляем новую запись (только ключевые метрики)
            history_entry = {
                'timestamp': stats['timestamp'],
                'health_score': stats['health_score'],
                'connection_usage': stats.get('connections', {}).get('postgresql', {}).get('usage_percent', 0),
                'cache_hit_ratio': stats.get('cache', {}).get('buffer_cache', {}).get('hit_ratio_percent', 0),
                'disk_usage': stats.get('size', {}).get('disk', {}).get('usage_percent', 0) if stats.get('size', {}).get('disk') else 0
            }
            
            history['metrics'].append(history_entry)
            
            # Оставляем только последние 1000 записей
            history['metrics'] = history['metrics'][-1000:]
            
            # Сохраняем
            with open(self.metrics_history_file, 'w') as f:
                json.dump(history, f, indent=2)
                
        except Exception as e:
            logger.error(f"Ошибка сохранения истории метрик: {e}")
    
    def get_metrics_history(self, hours: int = 24) -> List[Dict]:
        """Получение истории метрик за указанное количество часов"""
        try:
            if not self.metrics_history_file.exists():
                return []
            
            with open(self.metrics_history_file, 'r') as f:
                history = json.load(f)
            
            # Фильтруем по времени
            cutoff_time = datetime.now() - timedelta(hours=hours)
            filtered_metrics = []
            
            for metric in history.get('metrics', []):
                metric_time = datetime.fromisoformat(metric['timestamp'])
                if metric_time >= cutoff_time:
                    filtered_metrics.append(metric)
            
            return filtered_metrics
            
        except Exception as e:
            logger.error(f"Ошибка получения истории метрик: {e}")
            return []

# Глобальный экземпляр
db_monitor = DatabaseMonitor()