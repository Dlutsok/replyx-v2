# PerformanceMetrics Widget - UI/UX Концепция

## 🔍 Анализ текущего состояния

**Что есть сейчас:**
- RealtimeMetrics.js - компонент реального времени с 4 метриками в сетке 2x4
- Существующая стилистика Dashboard.module.css для metricCard
- BalanceWidget высотой 340px как референс размера

**Проблемы:**
- Отсутствует специализированный виджет для ключевых метрик производительности
- RealtimeMetrics слишком широкий для компактного размещения
- Нужен фокус на основных KPI производительности системы

## 📊 Research & Тренды

**Современные решения:**
- **Linear.app**: Компактные метрики с визуальной иерархией
- **Vercel Dashboard**: Производительность с трендами и индикаторами
- **Stripe Dashboard**: Главная метрика + сетка вторичных

**Лучшие практики:**
- Визуальная иерархия: 1 главная + 4 вторичных метрики
- Семантические цвета для индикаторов производительности
- Тренд-стрелки для быстрого понимания динамики
- Компактная высота для размещения в grid

## 🎨 Дизайн-концепция

### Information Architecture
```
┌─────────────────────────────────────┐
│ [📊] Производительность    [🔄]     │  ← Header
├─────────────────────────────────────┤
│ [💬] 1,247 сообщений/час     [↗️]    │  ← Main Metric
├─────────────────────────────────────┤
│ [⏱️] 2.3с    │ [✅] 94%             │  ← Secondary 
│ Время ответа │ Успешность           │    Metrics
├──────────────┼──────────────────────┤    2x2 Grid
│ [👥] 23      │ [⚡] 15.2k           │
│ Активные     │ AI токены            │
└─────────────────────────────────────┘
```

### User Scenarios
1. **Быстрый обзор**: Пользователь сканирует главную метрику за 2 секунды
2. **Детальный анализ**: Hover на вторичные метрики для трендов
3. **Мониторинг**: Отслеживание изменений через тренд-индикаторы

### Visual Hierarchy
1. **Заголовок** - text-lg, иконка фиолетовая
2. **Главная метрика** - text-2xl, градиентный текст, большая иконка
3. **Вторичные метрики** - text-base, компактные карточки
4. **Подписи** - text-xs, приглушенные

## 📱 Responsive стратегия

### Mobile (320-767px)
- Высота уменьшается до 280px
- Padding p-4 вместо p-6
- Главная метрика text-xl
- Сетка остается 2x2, но с меньшими отступами

### Desktop (768px+)
- Полная высота 300px
- Padding p-6
- Главная метрика text-2xl
- Сетка 2x2 с комфортными отступами gap-4

## 📋 Техническое задание для frontend-uiux

### Структура JSX:
```jsx
const PerformanceMetrics = ({ 
  messagesPerHour = 0,
  avgResponseTime = 0,
  successRate = 0,
  activeDialogsCount = 0,
  tokensUsed = 0,
  trends = {},
  loading = false,
  onRefresh
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[300px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiBarChart className="mr-2 text-purple-600" />
          Производительность
        </h3>
        <button 
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors focus:ring-2 focus:ring-purple-200 rounded-lg"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Main Metric */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 flex items-center justify-center">
            <FiMessageSquare className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {formatNumber(messagesPerHour)}
            </div>
            <div className="text-sm text-gray-500">сообщений/час</div>
          </div>
          <TrendIndicator trend={trends.messages} />
        </div>
      </div>
      
      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
        <MetricCard 
          icon={FiClock} 
          value={avgResponseTime} 
          suffix="с"
          label="Время ответа"
          color="yellow"
          trend={trends.responseTime}
          format={(val) => val.toFixed(1)}
        />
        <MetricCard 
          icon={FiCheckCircle} 
          value={successRate} 
          suffix="%"
          label="Успешность"
          color="green"
          trend={trends.successRate}
          format={(val) => Math.round(val)}
        />
        <MetricCard 
          icon={FiUsers} 
          value={activeDialogsCount}
          label="Активные"
          color="blue"
          trend={trends.activeDialogs}
        />
        <MetricCard 
          icon={FiZap} 
          value={tokensUsed}
          label="AI токены"
          color="orange"
          trend={trends.tokens}
          format={formatTokens}
        />
      </div>
    </div>
  );
};
```

### Компонент MetricCard:
```jsx
const MetricCard = ({ icon: Icon, value, suffix = '', label, color, trend, format }) => {
  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600', 
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="p-3 rounded-lg border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <TrendIndicator trend={trend} size="sm" />
      </div>
      <div className="text-base font-bold text-gray-900">
        {format ? format(value) : value}{suffix}
      </div>
      <div className="text-xs text-gray-500 leading-tight">
        {label}
      </div>
    </div>
  );
};
```

### Компонент TrendIndicator:
```jsx
const TrendIndicator = ({ trend, size = 'default' }) => {
  if (!trend || trend === 0) return null;
  
  const isPositive = trend > 0;
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? (
        <FiTrendingUp className={sizeClasses} />
      ) : (
        <FiTrendingDown className={sizeClasses} />
      )}
      <span className="text-xs ml-1 font-medium">
        {Math.abs(trend)}%
      </span>
    </div>
  );
};
```

### Стили CSS Module (PerformanceMetrics.module.css):
```css
.container {
  @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[300px] flex flex-col;
  transition: box-shadow 0.2s ease;
}

.container:hover {
  @apply shadow-md;
}

.mainMetric {
  @apply mb-6;
}

.mainMetricIcon {
  @apply w-12 h-12 rounded-xl flex items-center justify-center;
  background: linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%);
}

.mainMetricValue {
  @apply text-2xl font-bold;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.secondaryGrid {
  @apply grid grid-cols-2 gap-4 flex-1;
}

.metricCard {
  @apply p-3 rounded-lg border border-gray-200 transition-all duration-200;
}

.metricCard:hover {
  @apply shadow-sm border-gray-300 bg-gray-50;
}

@media (max-width: 640px) {
  .container {
    @apply p-4 h-[280px];
  }
  
  .secondaryGrid {
    @apply gap-3;
  }
  
  .mainMetricValue {
    @apply text-xl;
  }
}
```

### Утилиты форматирования:
```js
const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const formatTokens = (tokens) => {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
};
```

### Интерактивность:
- **Hover на виджете**: shadow-md, поднятие
- **Hover на метриках**: bg-gray-50, border-gray-300
- **Focus на кнопках**: ring-2 ring-purple-200
- **Анимации**: плавные transitions 200ms

### Интеграция в Dashboard:
```jsx
// В pages/dashboard.js
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
  <BalanceWidget {...balanceProps} />
  <PerformanceMetrics {...performanceProps} />
  <ActiveDialogs {...dialogsProps} />
  <QuickActions {...actionsProps} />
</div>
```

## Критерии успеха:
1. Виджет имеет высоту ~300px и вписывается в grid
2. Все 5 метрик читаемы на мобильных
3. Главная метрика выделяется визуально
4. Градиентный текст отображается корректно
5. Hover эффекты работают плавно
6. Тренд-индикаторы семантически понятны
7. Responsive поведение корректно
8. Loading states не ломают layout