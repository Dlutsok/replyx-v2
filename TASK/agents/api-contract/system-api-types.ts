// TypeScript интерфейсы для System API responses
// Сгенерировано на основе Pydantic схем из backend/database/schemas.py

// === Health Check ===
export interface HealthCheckStatus {
  status: 'ok' | 'error' | 'degraded';
  details: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  response_time_ms: number;
  checks: Record<string, HealthCheckStatus>;
  summary: Record<string, number>;
}

// === System Logs ===
export interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  user_id?: number | null;
}

export interface SystemLogsResponse {
  logs: SystemLogEntry[];
  total: number;
  has_more: boolean;
  filters: Record<string, any>;
  pagination: Record<string, any>;
}

// === Database Info ===
export interface DatabaseTableInfo {
  schema: string;
  table: string;
  size: string;
  bytes: number;
}

export interface DatabaseInfoResponse {
  database_size: string;
  tables_count: number;
  active_connections: number;
  large_tables: DatabaseTableInfo[];
  status: string;
  error?: string | null;
}

// === Cache Info ===
export interface CacheStatsInfo {
  hit_rate: number;
  memory_usage: string;
  total_keys: number;
  expires_keys: number;
  connected_clients: number;
}

export interface CacheInfoResponse {
  status: 'healthy' | 'error';
  stats: CacheStatsInfo;
  is_available: boolean;
  error?: string | null;
}

export interface CacheClearResponse {
  success: boolean;
  cleared_keys: number;
  cache_type: string;
  message: string;
  error?: string | null;
}

// === Performance Metrics ===
export interface CPUMetrics {
  usage_percent: number;
  cores: number;
  load_avg_1m: number;
  load_avg_5m: number;
  load_avg_15m: number;
}

export interface MemoryMetrics {
  total: number;
  available: number;
  used: number;
  usage_percent: number;
  free: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage_percent: number;
}

export interface NetworkMetrics {
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

export interface PerformanceMetricsResponse {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: Record<string, any>; // Может быть пустым
  timestamp: string;
  error?: string | null;
}

// === Process Info ===
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
  total_processes: number;
  error?: string | null;
}

// === API Endpoints для системного мониторинга ===
export interface SystemAPIEndpoints {
  health: () => Promise<HealthCheckResponse>;
  logs: (params?: {
    level?: 'all' | 'error' | 'warn' | 'info' | 'debug';
    search?: string;
    limit?: number;
    offset?: number;
    time_range?: '1h' | '6h' | '24h' | '7d';
  }) => Promise<SystemLogsResponse>;
  database: () => Promise<DatabaseInfoResponse>;
  cache: () => Promise<CacheInfoResponse>;
  cacheClear: (cacheType?: 'all' | 'user_metrics' | 'embeddings' | 'sessions') => Promise<CacheClearResponse>;
  performance: () => Promise<PerformanceMetricsResponse>;
  processes: () => Promise<ProcessesResponse>;
}

// === Утилитарные типы ===
export type SystemHealthStatus = 'healthy' | 'degraded' | 'error';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type CacheType = 'all' | 'user_metrics' | 'embeddings' | 'sessions';
export type TimeRange = '1h' | '6h' | '24h' | '7d';

// === Константы ===
export const SYSTEM_STATUS_COLORS: Record<SystemHealthStatus, string> = {
  healthy: '#10b981', // green-500
  degraded: '#f59e0b', // yellow-500
  error: '#ef4444', // red-500
};

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: '#3b82f6', // blue-500
  warn: '#f59e0b', // yellow-500
  error: '#ef4444', // red-500
  debug: '#6b7280', // gray-500
};

// === Форматирование данных ===
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};