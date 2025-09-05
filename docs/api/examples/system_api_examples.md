# System API Examples

Примеры запросов и ответов для системных endpoints администрирования.

## Health Check

### GET `/api/system/health`

**Описание:** Комплексная проверка состояния всех компонентов системы.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/health" \
  -H "Accept: application/json"
```

**JavaScript (axios):**
```javascript
const response = await axios.get('/api/system/health');
console.log('System health:', response.data);
```

**Успешный ответ (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-26T15:30:00Z",
  "response_time_ms": 45.2,
  "checks": {
    "api": {
      "status": "ok",
      "details": "FastAPI working"
    },
    "database": {
      "status": "ok", 
      "details": "PostgreSQL connection active"
    },
    "redis": {
      "status": "ok",
      "details": "Redis connected, hit rate: 85%"
    },
    "file_system": {
      "status": "ok",
      "details": "Uploads directory writable"
    },
    "disk": {
      "status": "ok",
      "details": "Free: 45.2GB/100GB"
    }
  },
  "summary": {
    "total_checks": 5,
    "passed": 5,
    "failed": 0,
    "degraded": 0
  }
}
```

**Ответ при проблемах (200):**
```json
{
  "status": "degraded",
  "timestamp": "2025-08-26T15:30:00Z", 
  "response_time_ms": 150.8,
  "checks": {
    "api": {
      "status": "ok",
      "details": "FastAPI working"
    },
    "database": {
      "status": "ok",
      "details": "PostgreSQL connection active"
    },
    "redis": {
      "status": "error",
      "details": "Redis connection timeout"
    },
    "file_system": {
      "status": "ok",
      "details": "Uploads directory writable"
    },
    "disk": {
      "status": "degraded",
      "details": "Low free space: 2.1GB/100GB"
    }
  },
  "summary": {
    "total_checks": 5,
    "passed": 3,
    "failed": 1,
    "degraded": 1
  }
}
```

## System Logs

### GET `/api/system/logs`

**Описание:** Получение системных логов с фильтрацией.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/logs?level=error&limit=50" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const response = await axios.get('/api/system/logs', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  params: {
    level: 'error',
    time_range: '24h',
    limit: 50
  }
});
```

**Успешный ответ (200):**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-08-26T15:25:00Z",
      "level": "error",
      "message": "Database connection timeout after 30s",
      "source": "database",
      "user_id": null
    },
    {
      "id": 2,
      "timestamp": "2025-08-26T15:20:00Z",
      "level": "error", 
      "message": "AI API rate limit exceeded",
      "source": "ai_providers",
      "user_id": 123
    }
  ],
  "total": 25,
  "has_more": false,
  "filters": {
    "level": "error",
    "search": null,
    "time_range": "24h"
  },
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total_pages": 1
  }
}
```

## Database Information

### GET `/api/system/database`

**Описание:** Информация о состоянии базы данных PostgreSQL.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/database" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const dbInfo = await axios.get('/api/system/database', {
  headers: { 'Authorization': 'Bearer ' + token }
});
console.log('Database size:', dbInfo.data.database_size);
```

**Успешный ответ (200):**
```json
{
  "database_size": "2.5 GB",
  "tables_count": 25,
  "active_connections": 12,
  "large_tables": [
    {
      "schema": "public",
      "table": "dialog_messages", 
      "size": "1.2 GB",
      "bytes": 1288490188
    },
    {
      "schema": "public",
      "table": "documents",
      "size": "450 MB", 
      "bytes": 471859200
    },
    {
      "schema": "public",
      "table": "dialogs",
      "size": "250 MB",
      "bytes": 262144000
    }
  ],
  "status": "healthy"
}
```

**Ответ при ошибке (200):**
```json
{
  "database_size": "Error",
  "tables_count": 0,
  "active_connections": 0,
  "large_tables": [],
  "status": "error",
  "error": "could not connect to server: Connection refused"
}
```

## Performance Metrics

### GET `/api/system/performance`

**Описание:** Реальные метрики производительности системы.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/performance" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const metrics = await axios.get('/api/system/performance', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Обработка метрик
const { cpu, memory, disk } = metrics.data;
console.log(`CPU: ${cpu.usage_percent}%, Memory: ${memory.usage_percent}%`);
```

**Успешный ответ (200):**
```json
{
  "cpu": {
    "usage_percent": 45.2,
    "cores": 4,
    "load_avg_1m": 1.2,
    "load_avg_5m": 1.1,
    "load_avg_15m": 0.9
  },
  "memory": {
    "total": 8589934592,
    "available": 4294967296, 
    "used": 4294967296,
    "usage_percent": 50.0,
    "free": 4294967296
  },
  "disk": {
    "total": 107374182400,
    "used": 53687091200,
    "free": 53687091200,
    "usage_percent": 50.0
  },
  "network": {
    "bytes_sent": 1048576000,
    "bytes_recv": 2097152000,
    "packets_sent": 1000000,
    "packets_recv": 1500000
  },
  "timestamp": "2025-08-26T15:30:00Z"
}
```

## Cache Information

### GET `/api/system/cache`

**Описание:** Статистика Redis кэша.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/cache" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const cacheInfo = await axios.get('/api/system/cache', {
  headers: { 'Authorization': 'Bearer ' + token }
});

if (cacheInfo.data.is_available) {
  console.log(`Cache hit rate: ${cacheInfo.data.stats.hit_rate}%`);
}
```

**Успешный ответ (200):**
```json
{
  "status": "healthy",
  "stats": {
    "hit_rate": 85.4,
    "memory_usage": "156MB",
    "total_keys": 1247,
    "expires_keys": 892, 
    "connected_clients": 3
  },
  "is_available": true
}
```

## Cache Clear

### POST `/api/system/cache/clear`

**Описание:** Очистка кэша Redis.

**cURL пример:**
```bash
curl -X POST "http://localhost:8000/api/system/cache/clear?cache_type=user_metrics" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const clearResult = await axios.post('/api/system/cache/clear', null, {
  headers: { 'Authorization': 'Bearer ' + token },
  params: { cache_type: 'user_metrics' }
});

if (clearResult.data.success) {
  console.log(`Cleared ${clearResult.data.cleared_keys} keys`);
}
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "cleared_keys": 892,
  "cache_type": "user_metrics", 
  "message": "Кэш user_metrics успешно очищен"
}
```

**Ответ при ошибке (200):**
```json
{
  "success": false,
  "cleared_keys": 0,
  "cache_type": "all",
  "error": "Redis connection failed",
  "message": "Ошибка очистки кэша"
}
```

## System Processes

### GET `/api/system/processes`

**Описание:** Информация о запущенных процессах.

**cURL пример:**
```bash
curl -X GET "http://localhost:8000/api/system/processes" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript (axios):**
```javascript
const processes = await axios.get('/api/system/processes', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Найдем процессы с высоким CPU
const highCpuProcesses = processes.data.processes
  .filter(p => p.cpu_percent > 10);
```

**Успешный ответ (200):**
```json
{
  "processes": [
    {
      "pid": 1234,
      "name": "python",
      "cpu_percent": 15.5,
      "memory_percent": 8.2,
      "status": "running"
    },
    {
      "pid": 5678,
      "name": "postgres",
      "cpu_percent": 5.1,
      "memory_percent": 12.3, 
      "status": "running"
    },
    {
      "pid": 9012,
      "name": "redis-server",
      "cpu_percent": 2.1,
      "memory_percent": 3.8,
      "status": "running" 
    }
  ],
  "total_processes": 3
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden  
```json
{
  "detail": "Not enough permissions"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error occurred",
  "timestamp": "2025-08-26T15:30:00Z"
}
```

## Frontend Integration

### TypeScript Interface Usage

```typescript
import { 
  HealthCheckResponse,
  PerformanceMetricsResponse,
  SystemLogsResponse 
} from './system-api-types';

class SystemMonitor {
  private apiUrl: string = '/api/system';
  
  async getHealthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${this.apiUrl}/health`);
    return await response.json();
  }
  
  async getPerformanceMetrics(): Promise<PerformanceMetricsResponse> {
    const response = await fetch(`${this.apiUrl}/performance`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      }
    });
    return await response.json();
  }
  
  async getLogs(level?: string): Promise<SystemLogsResponse> {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    
    const response = await fetch(`${this.apiUrl}/logs?${params}`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      }
    });
    return await response.json();
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useSystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/system/health');
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Обновляем каждые 30 секунд
    
    return () => clearInterval(interval);
  }, []);
  
  return { health, loading };
}
```