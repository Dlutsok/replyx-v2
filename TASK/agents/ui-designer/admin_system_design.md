# 🏗️ UI/UX Design: Admin System Monitor Page

## 🔍 Анализ текущего состояния

### Что есть сейчас:
- AdminDashboard с готовым пунктом меню "Система" → `/admin-system`
- Backend API эндпоинты в `/api/system.py`: `/health`, `/status`, `/metrics`
- Фирменная дизайн-система с фиолетовым акцентом (#6366f1)
- Существующие админ-паттерны (analytics, users, bots-monitoring)

### Проблемы и потребности:
- Страница `/admin-system` еще не создана
- Нужна комплексная система мониторинга состояния системы
- Администраторам требуется детальная диагностика performance
- Необходим real-time мониторинг системных ресурсов

## 📊 Research & современные тренды

### Вдохновение из современных решений:
- **Vercel Dashboard**: минималистичные карточки с цветовым кодированием
- **Linear.app**: четкая типографическая иерархия, статус-индикаторы
- **Grafana**: информативные метрики с прогресс-барами
- **Stripe Dashboard**: элегантные таблицы с фильтрацией

### Лучшие практики мониторинга:
- Color-coded health indicators (green/yellow/red)
- Real-time metrics с auto-refresh
- Drill-down интерфейс (overview → details)
- Accessibility-first подход

## 🎨 Дизайн-концепция

### Information Architecture:
```
/admin-system
├── Header (заголовок + действия)
├── System Health Overview (обзорные статусы)
├── Performance Metrics Grid (детальные метрики)
├── Tabs Navigation
    ├── Health Dashboard (по умолчанию)
    ├── Logs Management
    ├── Database Monitor
    ├── Cache Manager
    └── Background Tasks
```

### User Scenarios:
1. **Quick Health Check**: Администратор заходит и за 5 секунд видит общий статус системы
2. **Performance Analysis**: Проблема с производительностью → переход к детальным метрикам
3. **Log Investigation**: Ошибка в приложении → поиск по логам с фильтрацией
4. **Resource Management**: Очистка кэша, управление воркерами

### Visual Hierarchy:
1. **Header & Actions** (система статуса, auto-refresh)
2. **Health Overview Cards** (4 главные системы: API, DB, Redis, Storage)
3. **Detailed Metrics** (CPU, Memory, Network, Disk)
4. **Tabbed Sections** (детальный мониторинг по направлениям)

## 📱 Responsive стратегия

### Mobile (320-767px):
- Single-column layout для карточек
- Табы становятся вертикальным меню
- Метрики адаптируются к узким экранам

### Desktop (768px+):
- Multi-column grid (2-4 колонки)
- Горизонтальные табы
- Максимальное использование экрана для графиков

## 📋 Техническое задание для frontend-uiux

### Основная структура страницы:

```jsx
// pages/admin-system.js
import AdminDashboard from '../components/layout/AdminDashboard';
import SystemHealthHeader from '../components/admin/SystemHealthHeader';
import SystemHealthOverview from '../components/admin/SystemHealthOverview';
import SystemTabs from '../components/admin/SystemTabs';
import PerformanceMetrics from '../components/admin/PerformanceMetrics';

<AdminDashboard activeSection="system">
  <div className="bg-gray-50 min-h-screen">
    {/* Header с real-time статусом */}
    <SystemHealthHeader />
    
    {/* Overview карточки */}
    <div className="px-6 py-6">
      <SystemHealthOverview />
      
      {/* Табы для детального мониторинга */}
      <SystemTabs />
    </div>
  </div>
</AdminDashboard>
```

### SystemHealthHeader компонент:

```jsx
<div className="bg-white border-b border-gray-200">
  <div className="px-6 py-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Title & Status */}
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Мониторинг системы
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700">Система работает</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <FiRefreshCw size={16} />
          Обновить
        </button>
        
        <div className="text-sm text-gray-500">
          Обновлено: {lastUpdated}
        </div>
      </div>
    </div>
  </div>
</div>
```

### SystemHealthOverview компонент (главные карточки):

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {/* API Health */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
          <FiServer size={24} className="text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">API</h3>
          <p className="text-sm text-gray-600">FastAPI сервер</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs font-medium text-green-700">OK</span>
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Время ответа</span>
        <span className="font-medium text-gray-900">43ms</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Запросов/мин</span>
        <span className="font-medium text-gray-900">1,245</span>
      </div>
    </div>
  </div>

  {/* Database Health */}
  {/* Redis Health */}
  {/* File System Health */}
</div>
```

### Цветовая схема статусов:

```css
/* Healthy (зеленый) */
.status-healthy {
  --status-bg: #f0fdf4;
  --status-border: #bbf7d0;
  --status-text: #166534;
  --status-icon: #10b981;
  --status-dot: #22c55e;
}

/* Degraded (желтый) */
.status-degraded {
  --status-bg: #fffbeb;
  --status-border: #fed7aa;
  --status-text: #9a3412;
  --status-icon: #f59e0b;
  --status-dot: #fbbf24;
}

/* Error (красный) */
.status-error {
  --status-bg: #fef2f2;
  --status-border: #fecaca;
  --status-text: #991b1b;
  --status-icon: #ef4444;
  --status-dot: #f87171;
}
```

### SystemTabs компонент:

```jsx
const tabs = [
  { id: 'health', label: 'Состояние системы', icon: FiActivity },
  { id: 'logs', label: 'Логи', icon: FiFileText },
  { id: 'database', label: 'База данных', icon: FiDatabase },
  { id: 'cache', label: 'Кэш', icon: FiHardDrive },
  { id: 'tasks', label: 'Задачи', icon: FiClock }
];

<div className="bg-white border border-gray-200 rounded-xl p-1 mb-6">
  <div className="flex overflow-x-auto">
    {tabs.map(tab => (
      <button 
        key={tab.id}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium 
          transition-all duration-200 whitespace-nowrap
          ${activeTab === tab.id 
            ? 'bg-purple-100 text-purple-700' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <tab.icon size={16} />
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

### PerformanceMetrics компонент (детальные метрики):

```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
  {/* CPU Usage */}
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-semibold text-gray-900">Процессор</h4>
      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
        23%
      </span>
    </div>
    
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full" style={{width: '23%'}}></div>
      </div>
      
      <div className="flex justify-between text-sm text-gray-600">
        <span>Загрузка за 1 мин</span>
        <span>0.45</span>
      </div>
    </div>
  </div>
  
  {/* Memory Usage */}
  {/* Network I/O */}
  {/* Disk Usage */}
</div>
```

### Logs Management Tab:

```jsx
<div className="bg-white rounded-xl border border-gray-200">
  {/* Фильтры */}
  <div className="p-6 border-b border-gray-200">
    <div className="flex flex-col sm:flex-row gap-4">
      <select className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
        <option>Все уровни</option>
        <option>ERROR</option>
        <option>WARN</option>
        <option>INFO</option>
      </select>
      
      <input 
        type="text" 
        placeholder="Поиск в логах..."
        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
      />
      
      <button className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-200">
        Real-time режим
      </button>
    </div>
  </div>
  
  {/* Логи */}
  <div className="max-h-96 overflow-y-auto">
    {logs.map(log => (
      <div key={log.id} className="px-6 py-3 border-b border-gray-100 hover:bg-gray-50">
        <div className="flex items-start gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelStyles(log.level)}`}>
            {log.level}
          </span>
          <div className="flex-1">
            <p className="text-sm text-gray-900 font-mono">{log.message}</p>
            <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

### Интерактивные состояния:

#### Hover эффекты:
```css
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
  transition: all 0.2s ease;
}
```

#### Loading состояния:
```jsx
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
) : (
  <MetricValue />
)}
```

#### Error состояния:
```jsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
    <div className="flex items-center gap-2">
      <FiAlertCircle className="text-red-500" size={16} />
      <span className="text-red-700 text-sm">Ошибка загрузки данных</span>
    </div>
  </div>
)}
```

### Responsive breakpoints:

```css
/* Mobile first */
.system-grid {
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .system-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .system-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}
```

### Real-time обновления:

```jsx
// Каждые 30 секунд
useEffect(() => {
  const interval = setInterval(() => {
    refreshSystemData();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### Файлы для создания:

1. **pages/admin-system.js** - основная страница
2. **components/admin/SystemHealthHeader.js** - заголовок с действиями
3. **components/admin/SystemHealthOverview.js** - обзорные карточки статуса
4. **components/admin/SystemTabs.js** - табы навигации
5. **components/admin/PerformanceMetrics.js** - детальные метрики
6. **components/admin/LogsManager.js** - управление логами
7. **components/admin/DatabaseMonitor.js** - мониторинг БД
8. **components/admin/CacheManager.js** - управление кэшем
9. **components/admin/TasksMonitor.js** - мониторинг задач
10. **hooks/useSystemHealth.js** - хук для работы с данными
11. **styles/pages/AdminSystem.module.css** - стили

### API интеграция:

```js
// Основные эндпоинты
const API_ENDPOINTS = {
  health: '/api/system/health',
  metrics: '/api/system/metrics', 
  logs: '/api/system/logs',
  database: '/api/system/database',
  cache: '/api/system/cache'
};
```

### Критерии успеха:

- ✅ Страница загружается быстро (< 2 сек)
- ✅ Real-time обновление каждые 30 сек
- ✅ Все статусы системы видны с первого взгляда
- ✅ Цветовое кодирование понятно интуитивно
- ✅ Responsive на всех устройствах
- ✅ Accessibility соответствует WCAG 2.1
- ✅ Логи фильтруются и ищутся в реальном времени
- ✅ Hover/focus эффекты работают плавно

## 🎯 Следование дизайн-системе ReplyX

### Цвета:
- **Primary**: #6366f1 (фиолетовый акцент)
- **Success**: #10b981 (статус OK)
- **Warning**: #f59e0b (статус degraded)
- **Error**: #ef4444 (статус error)
- **Background**: белый с градиентом #f8fafc → #f1f5f9

### Типографика:
- **H1**: text-3xl font-extrabold (заголовки)
- **H3**: text-lg font-semibold (заголовки карточек)
- **Body**: text-sm text-gray-600 (основной текст)
- **Numbers**: text-2xl font-bold + gradient (большие метрики)

### Компоненты:
- **Cards**: rounded-xl, border-gray-200, shadow-sm
- **Buttons**: rounded-xl, purple gradient для primary
- **Inputs**: rounded-xl, border-gray-300
- **Progress bars**: purple gradient fill

### Анимации:
- **Duration**: 0.2s для hover, 0.6s для появления
- **Easing**: ease-out
- **Transform**: translateY(-2px) при hover

## 🧩 Детальная компонентная архитектура

### Иерархия компонентов:

```
AdminSystemPage
├── SystemHealthHeader
│   ├── StatusIndicator (real-time)
│   ├── AutoRefreshToggle
│   └── LastUpdatedInfo
├── SystemHealthOverview
│   ├── HealthCard (x4: API, Database, Redis, FileSystem)
│   │   ├── StatusIcon
│   │   ├── MetricsList
│   │   └── TrendIndicator
│   └── SystemSummary
├── SystemTabs
│   ├── TabButton (x5)
│   └── TabContent
│       ├── HealthDashboard
│       │   ├── PerformanceMetrics
│       │   │   ├── CPUMetric
│       │   │   ├── MemoryMetric
│       │   │   ├── NetworkMetric
│       │   │   └── DiskMetric
│       │   └── DetailedHealthCards
│       ├── LogsManager
│       │   ├── LogFilters
│       │   ├── LogSearch
│       │   ├── LogTable
│       │   └── RealTimeToggle
│       ├── DatabaseMonitor
│       │   ├── ConnectionsChart
│       │   ├── SlowQueriesTable
│       │   ├── DatabaseSizeCard
│       │   └── BackupStatus
│       ├── CacheManager
│       │   ├── RedisStats
│       │   ├── CacheKeysExplorer
│       │   ├── HitRateChart
│       │   └── ClearCacheActions
│       └── TasksMonitor
│           ├── WorkerStatus
│           ├── QueueMonitor
│           ├── FailedJobsList
│           └── TaskActions
```

### UI состояния каждого компонента:

#### SystemHealthOverview состояния:
```jsx
// Loading state
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {[1,2,3,4].map(i => (
    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="w-8 h-4 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  ))}
</div>

// Error state
<div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
  <div className="flex items-start gap-3">
    <FiAlertCircle className="text-red-500 mt-1" size={20} />
    <div className="flex-1">
      <h3 className="text-red-800 font-medium mb-1">
        Ошибка загрузки данных мониторинга
      </h3>
      <p className="text-red-600 text-sm mb-3">
        Не удалось получить статус системы. Проверьте соединение с сервером.
      </p>
      <button className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200 transition">
        Попробовать снова
      </button>
    </div>
  </div>
</div>

// Success state (нормальная работа)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {healthData.map(item => (
    <HealthCard 
      key={item.id} 
      status={item.status} 
      data={item.data}
      className="transform hover:scale-105 transition-transform"
    />
  ))}
</div>
```

#### LogsManager состояния:
```jsx
// Empty state
<div className="bg-white rounded-xl border border-gray-200">
  <div className="p-12 text-center">
    <FiFileText size={48} className="text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Логи не найдены
    </h3>
    <p className="text-gray-500 mb-4">
      Нет логов для выбранных фильтров или в выбранном временном диапазоне
    </p>
    <button className="text-purple-600 hover:text-purple-700 font-medium">
      Очистить фильтры
    </button>
  </div>
</div>

// Loading more logs
<div className="px-6 py-4 border-t border-gray-200">
  <div className="flex items-center justify-center gap-2">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
    <span className="text-sm text-gray-600">Загрузка следующих логов...</span>
  </div>
</div>

// Real-time streaming indicator
<div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
  <span className="text-sm font-medium text-green-700">Прямая трансляция</span>
  <span className="text-sm text-green-600">• Новых записей: {newLogsCount}</span>
</div>
```

#### PerformanceMetrics состояния:
```jsx
// Metric loading
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
  </div>
  <div className="space-y-3">
    <div className="w-full bg-gray-200 rounded-full h-2 animate-pulse"></div>
    <div className="flex justify-between">
      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </div>
</div>

// High usage warning
<div className="bg-white rounded-xl border border-red-200 p-6 ring-1 ring-red-100">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <h4 className="font-semibold text-red-800">Процессор</h4>
      <FiAlertTriangle size={16} className="text-red-500" />
    </div>
    <span className="text-2xl font-bold text-red-600">
      87%
    </span>
  </div>
  
  <div className="space-y-3">
    <div className="w-full bg-red-100 rounded-full h-2">
      <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '87%'}}></div>
    </div>
    
    <div className="bg-red-50 rounded-lg p-3">
      <p className="text-sm text-red-700 font-medium">⚠️ Высокая загрузка CPU</p>
      <p className="text-xs text-red-600 mt-1">Рекомендуется проверить активные процессы</p>
    </div>
  </div>
</div>
```

#### CacheManager действия:
```jsx
// Cache clear confirmation
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <div className="flex items-start gap-3">
    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
      <FiTrash2 size={20} className="text-yellow-600" />
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-gray-900 mb-2">
        Очистить кэш Redis?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Это действие удалит все cached данные. Производительность может временно снизиться.
      </p>
      <div className="flex gap-3">
        <button className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200">
          Очистить кэш
        </button>
        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
          Отмена
        </button>
      </div>
    </div>
  </div>
</div>

// Cache operation success
<div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
  <div className="flex items-center gap-2">
    <FiCheck className="text-green-600" size={16} />
    <span className="text-green-700 text-sm font-medium">
      Кэш успешно очищен (удалено 1,247 ключей)
    </span>
  </div>
</div>
```

### Responsive поведение компонентов:

```css
/* SystemHealthOverview */
.health-overview {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .health-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .health-overview {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* PerformanceMetrics */
.metrics-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* SystemTabs */
.system-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}

@media (max-width: 768px) {
  .system-tabs {
    flex-direction: column;
    overflow: visible;
  }
  
  .tab-button {
    justify-content: flex-start;
    width: 100%;
  }
}
```

### Accessibility (WCAG 2.1 AA):

```jsx
// Фокус-менеджмент для табов
<div 
  role="tablist" 
  aria-label="Разделы системного мониторинга"
  onKeyDown={handleTabKeyDown}
>
  {tabs.map((tab, index) => (
    <button
      key={tab.id}
      role="tab"
      id={`tab-${tab.id}`}
      aria-controls={`panel-${tab.id}`}
      aria-selected={activeTab === tab.id}
      tabIndex={activeTab === tab.id ? 0 : -1}
      className={tabButtonClasses}
    >
      <tab.icon size={16} aria-hidden="true" />
      {tab.label}
    </button>
  ))}
</div>

// Screen reader friendly статусы
<span className="sr-only">
  Статус системы {status === 'healthy' ? 'работает нормально' : 
                   status === 'degraded' ? 'работает с предупреждениями' : 
                   'имеет критические ошибки'}
</span>

// Aria-live для real-time обновлений
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {lastUpdate && `Данные обновлены ${lastUpdate}`}
</div>
```

### Performance оптимизации:

```jsx
// Мемоизация тяжелых компонентов
const PerformanceMetrics = memo(({ data }) => {
  const memoizedChartData = useMemo(() => 
    processChartData(data), [data]
  );
  
  return <MetricsChart data={memoizedChartData} />;
});

// Виртуализация для больших списков логов
import { FixedSizeList as List } from 'react-window';

const LogsTable = ({ logs }) => (
  <List
    height={400}
    itemCount={logs.length}
    itemSize={60}
    className="logs-list"
  >
    {({ index, style }) => (
      <div style={style}>
        <LogRow log={logs[index]} />
      </div>
    )}
  </List>
);

// Debounced поиск по логам
const useLogSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);
  
  return [query, setQuery, debouncedQuery];
};
```

## 🎨 Детальная дизайн-спецификация

### CSS Custom Properties (для consistency):

```css
/* AdminSystem.module.css */
:root {
  /* Status Colors - System Health */
  --status-healthy: #10b981;
  --status-healthy-bg: #ecfdf5;
  --status-healthy-border: #a7f3d0;
  --status-healthy-text: #065f46;
  
  --status-degraded: #f59e0b;
  --status-degraded-bg: #fffbeb;
  --status-degraded-border: #fed7aa;
  --status-degraded-text: #92400e;
  
  --status-error: #ef4444;
  --status-error-bg: #fef2f2;
  --status-error-border: #fecaca;
  --status-error-text: #991b1b;
  
  /* Brand Colors - ChatAI */
  --brand-primary: #6366f1;
  --brand-primary-hover: #5b21b6;
  --brand-purple-50: #f3e8ff;
  --brand-purple-100: #e9d5ff;
  
  /* Performance Metrics */
  --metric-excellent: #10b981;  /* 0-60% */
  --metric-good: #22c55e;       /* 60-80% */
  --metric-warning: #f59e0b;    /* 80-90% */
  --metric-critical: #ef4444;   /* 90-100% */
  
  /* UI Elements */
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --card-shadow-hover: 0 4px 12px rgba(99, 102, 241, 0.15);
  
  /* Typography Scale */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
}
```

### Компонентные утилитарные классы:

```css
/* Status Components */
.statusHealthy {
  --status-color: var(--status-healthy);
  --status-bg: var(--status-healthy-bg);
  --status-border: var(--status-healthy-border);
  --status-text: var(--status-healthy-text);
}

.statusDegraded {
  --status-color: var(--status-degraded);
  --status-bg: var(--status-degraded-bg);
  --status-border: var(--status-degraded-border);
  --status-text: var(--status-degraded-text);
}

.statusError {
  --status-color: var(--status-error);
  --status-bg: var(--status-error-bg);
  --status-border: var(--status-error-border);
  --status-text: var(--status-error-text);
}

/* Status Indicator Dot */
.statusDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--status-color);
  display: inline-block;
  margin-right: var(--space-2);
}

.statusDot.animate {
  animation: statusPulse 2s infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Card Components */
.healthCard {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: var(--space-6);
  box-shadow: var(--card-shadow);
  transition: all 0.2s ease;
  cursor: pointer;
}

.healthCard:hover {
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-2px);
}

.healthCard.hasAlert {
  border-color: var(--status-color);
  box-shadow: 0 0 0 1px var(--status-color);
}

/* Metric Value Display */
.metricValue {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-primary), #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--brand-primary); /* fallback */
}

.metricValue.warning {
  background: linear-gradient(135deg, var(--status-degraded), #f97316);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.metricValue.critical {
  background: linear-gradient(135deg, var(--status-error), #dc2626);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Progress Bars */
.progressBar {
  width: 100%;
  height: 8px;
  background-color: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  background: linear-gradient(90deg, var(--brand-primary), #8b5cf6);
}

.progressFill.warning {
  background: linear-gradient(90deg, var(--status-degraded), #f97316);
}

.progressFill.critical {
  background: linear-gradient(90deg, var(--status-error), #dc2626);
}

/* Tab Navigation */
.systemTabs {
  background: white;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.systemTabs::-webkit-scrollbar {
  display: none;
}

.tabButton {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: 8px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tabButton:hover {
  color: #374151;
  background: #f9fafb;
}

.tabButton.active {
  color: var(--brand-primary);
  background: var(--brand-purple-50);
}

/* Loading States */
.loadingCard {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: var(--space-6);
  animation: pulse 2s infinite;
}

.loadingSkeleton {
  background: #e5e7eb;
  border-radius: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Log Levels */
.logLevel {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logLevel.error {
  background: var(--status-error-bg);
  color: var(--status-error-text);
}

.logLevel.warn {
  background: var(--status-degraded-bg);
  color: var(--status-degraded-text);
}

.logLevel.info {
  background: #eff6ff;
  color: #1e40af;
}

/* Action Buttons */
.actionButton {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: 8px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  border: 1px solid var(--card-border);
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actionButton:hover {
  background: #f9fafb;
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.actionButton.primary {
  background: linear-gradient(135deg, var(--brand-primary), #8b5cf6);
  color: white;
  border: none;
}

.actionButton.primary:hover {
  background: linear-gradient(135deg, var(--brand-primary-hover), #7c3aed);
}

.actionButton.danger {
  background: var(--status-error-bg);
  color: var(--status-error-text);
  border-color: var(--status-error-border);
}

.actionButton.danger:hover {
  background: var(--status-error);
  color: white;
}
```

### Responsive Grid Systems:

```css
/* Health Overview Grid */
.healthOverview {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .healthOverview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .healthOverview {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Performance Metrics Grid */
.metricsGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  margin-top: var(--space-8);
}

@media (min-width: 1024px) {
  .metricsGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .metricsGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile Tab Navigation */
@media (max-width: 768px) {
  .systemTabs {
    flex-direction: column;
    padding: var(--space-2);
  }
  
  .tabButton {
    justify-content: flex-start;
    width: 100%;
    padding: var(--space-4);
  }
}
```

### Typography Utility Classes:

```css
/* Headings */
.heading1 {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.heading2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}

.heading3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

/* Body Text */
.bodyText {
  font-size: var(--font-size-sm);
  color: #6b7280;
  line-height: 1.5;
}

.bodyTextMuted {
  font-size: var(--font-size-xs);
  color: #9ca3af;
  line-height: 1.4;
}

/* Monospace for logs/code */
.monospace {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
```

### Animation Definitions:

```css
/* Real-time Data Animations */
@keyframes dataUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.updating {
  animation: dataUpdate 0.5s ease;
}

/* Loading Spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Fade In Transition */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fadeIn {
  animation: fadeIn 0.3s ease;
}

/* Slide Down for notifications */
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.slideDown {
  animation: slideDown 0.3s ease;
}
```

### Dark Mode Support (Future):

```css
/* Dark mode variables - для будущего расширения */
[data-theme="dark"] {
  --card-bg: #1f2937;
  --card-border: #374151;
  --status-healthy-bg: #064e3b;
  --status-degraded-bg: #78350f;
  --status-error-bg: #7f1d1d;
  /* ... остальные темные цвета */
}
```

## 🛠️ Техническое задание для frontend-uiux

### Финальный чек-лист для реализации:

#### 1. Создать основные компоненты:
- [ ] `pages/admin-system.js` - главная страница с layout
- [ ] `components/admin/SystemHealthHeader.js` - хедер с real-time статусом  
- [ ] `components/admin/SystemHealthOverview.js` - 4 карточки обзора
- [ ] `components/admin/SystemTabs.js` - табы навигации
- [ ] `components/admin/PerformanceMetrics.js` - детальные метрики
- [ ] `components/admin/LogsManager.js` - просмотр и фильтрация логов
- [ ] `styles/pages/AdminSystem.module.css` - основные стили

#### 2. Hooks и утилиты:
- [ ] `hooks/useSystemHealth.js` - fetch и real-time данные
- [ ] `hooks/useSystemLogs.js` - работа с логами и фильтрацией
- [ ] `utils/systemMetrics.js` - форматирование метрик

#### 3. API интеграция:
- [ ] Подключить `/api/system/health` для статуса
- [ ] Подключить `/api/system/metrics` для производительности  
- [ ] Real-time обновление каждые 30 секунд
- [ ] Обработка ошибок API

#### 4. UI/UX требования:
- [ ] Цветовое кодирование статусов (green/yellow/red)
- [ ] Loading скелетоны для всех компонентов
- [ ] Error states с retry функциональностью
- [ ] Hover эффекты и плавные анимации
- [ ] Responsive дизайн 320px-1920px+

#### 5. Accessibility:
- [ ] ARIA labels для всех интерактивных элементов
- [ ] Keyboard navigation для табов
- [ ] Screen reader support для статусов
- [ ] Focus management

#### 6. Performance:
- [ ] Мемоизация компонентов с React.memo
- [ ] Debounced поиск в логах (300ms)
- [ ] Виртуализация для больших списков логов
- [ ] Lazy loading для табов

### Приоритет реализации:
1. **MVP Core** (страница + хедер + обзор)
2. **Health Dashboard** (детальные метрики)
3. **Logs Management** (просмотр логов)
4. **Advanced Features** (кэш, база данных, задачи)

### Критерии приемки:
- ✅ Страница загружается за < 2 секунды
- ✅ Все статусы отображаются корректно с цветовым кодированием  
- ✅ Real-time обновление работает плавно
- ✅ Responsive на мобильных устройствах
- ✅ Нет ошибок в консоли браузера
- ✅ Accessibility score > 95 в Lighthouse

Дизайн готов к реализации frontend-uiux агентом! 🚀