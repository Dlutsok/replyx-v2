# Архитектура системы мониторинга ботов

## Обзор

Система мониторинга ботов ReplyX представляет собой полнофункциональный админский модуль для отслеживания состояния, производительности и управления всеми Telegram-ботами в реальном времени. Система построена по принципам многослойной архитектуры с автоматическим обновлением данных и responsive-дизайном.

## Архитектурная схема

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOTS MONITORING SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                    FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│ /admin-bots-monitoring                                         │
│   ├── MonitoringHeader (фильтры + real-time индикатор)        │
│   ├── FiltersPanel (поиск, статус, период)                    │
│   ├── BotsStatsCards (KPI метрики в карточках)                │
│   ├── BotsMonitoringGrid (таблица ботов для десктопа)         │
│   ├── BotStatusCard (мобильные карточки ботов)                │
│   └── BotDetailsModal (детальная информация о боте)           │
├─────────────────────────────────────────────────────────────────┤
│                    HOOKS LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│ useBotsMonitoring                                              │
│   ├── Управление состоянием (боты, фильтры, UI)               │
│   ├── API интеграция (2 endpoints + WebSocket)                │
│   ├── Автообновление (30 сек интервал)                        │
│   ├── Real-time индикатор подключения                         │
│   ├── Система фильтрации и поиска                             │
│   └── Управление ботами (старт/стоп/рестарт)                  │
├─────────────────────────────────────────────────────────────────┤
│                    API LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│ /api/admin/bots-monitoring/*                                   │
│   ├── GET / - данные ботов с фильтрацией                      │
│   ├── GET /stats - KPI статистика                             │
│   └── POST /bots/{id}/action - управление ботами              │
├─────────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│ BotManagerService                                              │
│   ├── Получение статусов ботов из PM2                         │
│   ├── Взаимодействие с Telegram API                           │
│   ├── Агрегация метрик производительности                     │
│   ├── Управление жизненным циклом ботов                       │
│   └── Real-time обновления через WebSocket                    │
├─────────────────────────────────────────────────────────────────┤
│                    DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL Tables                                              │
│   ├── bot_instances (экземпляры ботов)                        │
│   ├── dialogs (диалоги с ботами)                              │
│   ├── dialog_messages (сообщения)                             │
│   ├── users (пользователи ботов)                              │
│   └── bot_metrics (метрики производительности)                │
└─────────────────────────────────────────────────────────────────┘
```

## Компонентная архитектура

### Frontend компоненты

#### 1. AdminBotsMonitoring (Основная страница)
**Расположение**: `/frontend/pages/admin-bots-monitoring.js`  
**Назначение**: Главная страница мониторинга ботов  
**Ключевые функции**:
- Интеграция с useBotsMonitoring hook
- Защита доступа (adminOnly через withAuth)
- Responsive компоновка (таблица → карточки)
- Real-time индикатор подключения
- Обработка состояний загрузки и ошибок

**Основные секции**:
```javascript
// Header с контролами
<HeaderControls>
  - Real-time индикатор
  - Кнопки обновления и настроек
  - Счетчик активных ботов
</HeaderControls>

// Панель фильтров
<FiltersPanel>
  - Поиск по имени/ID бота
  - Фильтр по статусу (online/offline/error)
  - Период анализа (24h/7d/30d)
</FiltersPanel>

// Статистические карточки
<BotsStatsCards />

// Основной контент
<Desktop>: BotsMonitoringGrid
<Mobile>: BotStatusCard[]
```

#### 2. useBotsMonitoring (Core Hook)
**Расположение**: `/frontend/hooks/useBotsMonitoring.js`  
**Назначение**: Центральный hook для управления состоянием мониторинга  

**Состояние данных**:
```javascript
state: {
  bots: [],                    // Список ботов
  loading: true,               // Состояние загрузки
  error: null,                 // Ошибки
  filters: {
    search: '',               // Поиск по тексту
    status: 'all',           // Фильтр статуса
    user: 'all',             // Фильтр пользователя
    period: '7d'             // Период анализа
  },
  selectedBot: null,          // Выбранный бот для деталей
  showBotDetails: false,      // Показать модальное окно
  realTimeData: {
    connected: true,          // Статус соединения
    lastUpdate: new Date()    // Время последнего обновления
  }
}
```

**API интеграция**:
```javascript
// Основные данные
fetchBotsData() -> GET /api/admin/bots-monitoring
  - Параметры: status, search, period
  - AbortController для отмены запросов
  - Обработка ошибок и повторных попыток

// Статистика
fetchStatsData() -> GET /api/admin/bots-monitoring/stats
  - КПИ метрики
  - Изменения за период
  - Агрегированные данные

// Управление ботами
handleBotAction(botId, action) -> POST /api/admin/bots/{id}/action
  - Действия: start, stop, restart
  - Optimistic UI обновления
  - Fallback к мок-данным
```

**Автоматизация**:
- **Автообновление**: каждые 30 секунд
- **Real-time индикатор**: обновление времени
- **Фильтрация**: мгновенная клиентская фильтрация
- **Управление запросами**: AbortController для отмены

#### 3. BotsStatsCards
**Расположение**: `/frontend/components/admin/BotsStatsCards.js`  
**Назначение**: Отображение KPI метрик в карточках  

**Метрики**:
```javascript
statsData: {
  activeBots: number,        // Активные боты
  totalBots: number,         // Общее количество ботов  
  messagesPerHour: number,   // Сообщений в час
  activeUsers: number,       // Активные пользователи
  errorBots: number,         // Боты с ошибками
  changes: {                 // Изменения за период
    activeBots: number,
    messagesPerHour: number,
    activeUsers: number,
    errorBots: number
  }
}
```

#### 4. BotsMonitoringGrid
**Расположение**: `/frontend/components/admin/BotsMonitoringGrid.js`  
**Назначение**: Табличное отображение ботов (десктоп)  

**Колонки таблицы**:
- **ID бота** - уникальный идентификатор
- **Имя** - название бота
- **Статус** - online/offline/error/starting
- **Пользователь** - владелец бота
- **Сообщения** - количество за период
- **Uptime** - время работы
- **Последняя активность** - timestamp
- **Действия** - кнопки управления

#### 5. BotStatusCard  
**Расположение**: `/frontend/components/admin/BotStatusCard.js`  
**Назначение**: Карточки ботов (мобильная версия)  

**Информация в карточке**:
- Статус бота с цветовой индикацией
- Основные метрики (сообщения, uptime)
- Кнопки быстрых действий
- Последняя активность

#### 6. BotDetailsModal
**Расположение**: `/frontend/components/admin/BotDetailsModal.js`  
**Назначение**: Детальная информация о боте в модальном окне  

**Разделы модального окна**:
```javascript
<BotDetailsModal>
  <BasicInfo>           // Основная информация
    - ID, имя, описание
    - Токен (скрыт)
    - Владелец
    - Дата создания
  </BasicInfo>
  
  <StatusInfo>          // Информация о статусе
    - Текущий статус
    - Uptime
    - Последний restart
    - Версия API
  </StatusInfo>
  
  <PerformanceMetrics>  // Метрики производительности
    - Сообщения за период
    - Активные пользователи
    - Среднее время ответа
    - Ошибки
  </PerformanceMetrics>
  
  <ActionButtons>       // Действия с ботом
    - Start/Stop/Restart
    - Просмотр логов
    - Редактирование настроек
  </ActionButtons>
</BotDetailsModal>
```

### Backend архитектура

#### API Endpoints

#### 1. GET /admin/bots-monitoring
**Назначение**: Получение данных мониторинга ботов  
**Параметры**:
```python
status: str = 'all' | 'online' | 'offline' | 'error' | 'starting'
search: str = ''  # Поиск по имени/ID
period: str = '7d' | '24h' | '30d'  # Период анализа
```

**Ответ**:
```json
[
  {
    "id": "bot_123",
    "name": "Support Bot",
    "status": "online",
    "user_email": "user@example.com", 
    "messages_count": 1250,
    "active_users": 45,
    "uptime": "5d 12h 30m",
    "last_activity": "2025-01-23T14:30:00Z",
    "performance": {
      "avg_response_time": 0.8,
      "errors_count": 2,
      "memory_usage": "145MB"
    }
  }
]
```

#### 2. GET /admin/bots-monitoring/stats  
**Назначение**: Получение агрегированной статистики  
**Параметры**:
```python
period: str = '7d' | '24h' | '30d'
```

**Ответ**:
```json
{
  "active_bots": 12,
  "total_bots": 15,
  "messages_per_hour": 450,
  "active_users": 1200,
  "error_bots": 1,
  "changes": {
    "active_bots": +2,
    "messages_per_hour": +15,
    "active_users": +85,
    "error_bots": -1
  }
}
```

#### 3. POST /admin/bots/{bot_id}/action
**Назначение**: Управление ботами  
**Параметры**:
```python
action: str = 'start' | 'stop' | 'restart'
```

**Тело запроса**:
```json
{
  "action": "restart"
}
```

### Стили и дизайн

#### CSS архитектура
**Файл**: `/frontend/styles/pages/AdminBotsMonitoring.module.css`

**Принципы дизайна**:
- ReplyX фирменный стиль
- Светлая тема с фиолетовыми акцентами
- Большие заголовки и мягкие тени
- Закругления `rounded-xl`
- Responsive дизайн (mobile-first)

**Основные классы**:
```css
.adminBotsMonitoring     // Главный контейнер
.header                  // Заголовок с контролами
.realTimeIndicator       // Индикатор подключения
.filtersPanel           // Панель фильтров
.emptyState             // Пустое состояние
.loading                // Состояние загрузки
.spinner                // Спиннер загрузки
```

**Цветовая схема**:
- **Онлайн боты**: `text-green-600`, `bg-green-50`
- **Оффлайн боты**: `text-gray-500`, `bg-gray-50`  
- **Боты с ошибками**: `text-red-600`, `bg-red-50`
- **Запускающиеся боты**: `text-yellow-600`, `bg-yellow-50`

## Безопасность

### Авторизация и доступ
```javascript
// Защита страницы
export default withAuth(AdminBotsMonitoring, { 
  adminOnly: true  // Только для администраторов
});

// Backend защита
@router.get("/admin/bots-monitoring")
def get_bots_monitoring_data(
    current_user: models.User = Depends(auth.get_current_admin)
):
```

### Валидация данных
- **Query параметры**: Enum validation для status/period
- **Bot actions**: Whitelist разрешенных действий
- **Токены**: Никогда не передаются в frontend
- **Логи**: Санитизация чувствительной информации

## Производительность

### Frontend оптимизации
- **Автообновление**: Silent updates без loading state
- **AbortController**: Отмена предыдущих запросов
- **Мемоизация**: Кэширование фильтрованных данных
- **Debouncing**: Задержка поиска 300ms

### Backend оптимизации  
- **Индексы БД**: На bot_id, status, user_id, created_at
- **Агрегация**: Расчет статистики на уровне SQL
- **Пагинация**: Лимиты на количество записей
- **Кэширование**: Redis для часто запрашиваемых метрик

### Real-time обновления
```javascript
// Автообновление с интервалом 30 сек
setInterval(() => {
  fetchBotsData(true);     // silent update
  fetchStatsData();        // обновить статистику  
  updateRealTimeIndicator(); // обновить timestamp
}, 30000);
```

## Мониторинг и логирование

### Метрики для отслеживания
- **Время ответа API**: < 500ms для 95% запросов
- **Частота обновлений**: каждые 30 секунд  
- **Статус ботов**: количество online/offline/error
- **Активность пользователей**: просмотры страницы админами

### Логирование
```python
# Backend логирование
logger.info(f"Bots monitoring request: {current_user.email}")
logger.error(f"Error in bots monitoring: {e}")

# Аудит действий
logger.info(f"Bot action {action} on {bot_id} by {current_user.email}")
```

## Развертывание

### Зависимости

**Backend**:
- FastAPI
- SQLAlchemy  
- psutil (системные метрики)
- requests (Telegram API)

**Frontend**:
- React hooks (useState, useEffect, useCallback)
- react-icons/fi (Feather icons)
- Next.js роутинг

### Переменные окружения
```bash
# Telegram API
TELEGRAM_BOT_TOKEN=your_bot_token

# База данных
DATABASE_URL=postgresql://...

# Redis (опционально для кэширования)
REDIS_URL=redis://localhost:6379
```

## Расширяемость

### Добавление новых метрик
1. **Backend**: Расширить SQL запрос в `/admin/bots-monitoring/stats`
2. **Frontend**: Добавить поле в `statsData` hook'а  
3. **UI**: Создать новую карточку в `BotsStatsCards`

### Новые типы ботов
1. **Модель**: Добавить тип в `bot_instances.type`
2. **API**: Обработать новый тип в фильтрации
3. **UI**: Добавить иконку и стили для типа

### WebSocket integration (будущее)
```javascript
// Real-time обновления через WebSocket
const ws = new WebSocket('/ws/admin/bots-monitoring');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateBotStatus(update.bot_id, update.status);
};
```

## TypeScript совместимость

Система готова для миграции на TypeScript:
```typescript
// Типы данных
interface Bot {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'starting';
  user_email: string;
  messages_count: number;
  uptime: string;
  last_activity: string;
}

interface StatsData {
  active_bots: number;
  total_bots: number;
  messages_per_hour: number;
  active_users: number;
  error_bots: number;
  changes: Record<string, number>;
}
```

## Заключение

Архитектура системы мониторинга ботов ReplyX обеспечивает:

- **Real-time мониторинг** с автообновлением каждые 30 секунд
- **Полное управление ботами** через единый интерфейс  
- **Responsive дизайн** для работы на всех устройствах
- **Высокую производительность** через оптимизированные запросы
- **Безопасность** через строгую авторизацию админов
- **Расширяемость** для добавления новых функций
- **Удобство сопровождения** через четкое разделение компонентов

Система является критически важной частью админской панели и обеспечивает полный контроль над инфраструктурой ботов платформы.