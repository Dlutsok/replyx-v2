# Промпт для UI Designer: Дизайн страницы управления AI-токенами

## 🎯 РОЛЬ: UI Designer
Ты ведущий UI дизайнер в команде для создания страницы `/admin-ai-tokens` в ChatAI проекте.

## 📋 ПОЛНЫЙ КОНТЕКСТ ПРОЕКТА

### 🏗️ Архитектура системы ChatAI
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 13+ + React + CSS Modules + TypeScript
- **Рабочая директория**: `/Users/dan/Documents/chatAI/MVP 11`
- **Дизайн-система**: Стиль Yandex Console (чистый, функциональный, профессиональный)

### 🔍 Анализ существующих админ-страниц

#### ✅ Существующая структура админ-панели:

**1. Layout: AdminDashboard.js**
```javascript
// Боковая панель с навигацией:
menuItems = [
  { id: 'overview', label: 'Обзор', icon: FiHome, href: '/admin' },
  { id: 'users', label: 'Пользователи', icon: FiUsers, href: '/admin-users' },
  { id: 'analytics', label: 'Аналитика', icon: FiBarChart, href: '/admin-analytics' },
  { id: 'bots-monitoring', label: 'Мониторинг ботов', icon: FiCpu, href: '/admin-bots-monitoring' },
  { id: 'ai-tokens', label: 'AI Токены', icon: FiZap, href: '/admin-ai-tokens' }, // ← ТУТ БУДЕТ НАША СТРАНИЦА
  { id: 'system', label: 'Система', icon: FiMonitor, href: '/admin-system' }
]
```

**2. Цветовая схема (из AdminDashboard.module.css):**
```css
/* Основные цвета */
Primary Blue: #6366f1 (кнопки, активные элементы)
Background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)
Cards: white с box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08)
Text: #1f2937 (основной), #6b7280 (вторичный)
Borders: #e5e7eb
Success: #10b981
Warning: #f59e0b  
Error: #ef4444
```

**3. Эталонная страница: admin-users.js**
```javascript
// Структура страницы:
<AdminDashboard activeSection="users">
  <div className={styles.usersPage}>
    {/* Header */}
    <div className={styles.pageHeader}>
      <h1>Управление пользователями</h1>
      <p>Всего пользователей: {users.length}</p>
    </div>

    {/* Filters */}
    <div className={styles.filtersSection}>
      <SearchInput />
      <StatusFilter />
    </div>

    {/* Users Table */}
    <UsersTable />
    
    {/* Modals */}
    <EditUserModal />
    <BalanceAdjustmentModal />
  </div>
</AdminDashboard>
```

**4. Стилевые паттерны (AdminUsers.module.css):**
```css
/* Header стили */
.pageHeader {
  background: white;
  border-bottom: 1px solid #e6e6e6;
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Карточки */
.filtersSection {
  background: white;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

/* Таблицы */
.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### 📊 ДАННЫЕ ДЛЯ ДИЗАЙНА

#### AI Token Pool Structure:
```javascript
const aiToken = {
  id: 1,
  name: "Main Production Token",
  token: "sk-proj-...", // МАСКИРОВАННЫЙ в UI как "sk-...f2g4" 
  model_access: "gpt-4o,gpt-4o-mini,gpt-3.5-turbo",
  daily_limit: 10000,
  monthly_limit: 300000,
  current_daily_usage: 2543,     // 25.43% использования
  current_monthly_usage: 45678,  // 15.23% использования  
  priority: 1,                   // 1 = высший приоритет
  is_active: true,
  created_at: "2025-01-15T10:30:00Z",
  last_used: "2025-01-25T14:30:00Z",
  error_count: 0,
  last_error: null,
  notes: "Primary production token - handle with care"
}
```

#### Usage Statistics (за 30 дней):
```javascript
const usageStats = [
  {
    date: "2025-01-25",
    requests: 145,
    tokens: 28540,
    avg_response_time: 1.23,
    successful_requests: 143,
    failed_requests: 2,
    success_rate: 98.6
  }
  // ... остальные дни
]
```

## 🎨 ЗАДАЧА UI ДИЗАЙНЕРА

### 📌 Основные требования:

#### 1. **Главная страница `/admin-ai-tokens`**
**Структура:**
```
[AdminDashboard Sidebar] | [Main Content Area]
                        |
                        | [Page Header]
                        | [Quick Stats Cards]  
                        | [Filters & Search]
                        | [AI Tokens Table]
                        | [Action Buttons]
```

**Элементы для дизайна:**

**A. Page Header**
- Заголовок: "Управление AI токенами" + иконка FiZap
- Подзаголовок: "Активных токенов: X | Общий лимит: XXX запросов/день"
- Кнопка "Добавить токен" (primary blue)

**B. Quick Stats Cards (4 карточки в ряд)**
- **Активных токенов**: количество + процент от общего
- **Использование за день**: прогресс-бар + цифры
- **Использование за месяц**: прогресс-бар + цифры  
- **Токенов с ошибками**: количество + red indicator

**C. Filters & Search Section**
- Поиск по названию токена
- Фильтр по статусу: Все / Активные / Неактивные
- Фильтр по приоритету: 1-10
- Сортировка: По приоритету / По использованию / По дате

**D. AI Tokens Table** - ОСНОВНОЙ ЭЛЕМЕНТ
Колонки:
1. **Статус** - зеленая/красная точка + активен/неактивен
2. **Название** - name + приоритет badge
3. **Токен** - маскированный "sk-...f2g4" + кнопка копирования
4. **Модели** - badges для каждой модели
5. **Использование дневное** - прогресс-бар с процентами
6. **Использование месячное** - прогресс-бар с процентами  
7. **Последнее использование** - относительное время
8. **Ошибки** - счетчик с цветовой индикацией
9. **Действия** - кнопки Edit/Delete/View Stats

**E. Action Buttons**
- Кнопка "Добавить новый токен"
- Bulk actions (если выбраны токены)

#### 2. **Модальное окно создания/редактирования токена**

**Структура формы:**
```
[Modal Header: "Создать новый токен" / "Редактировать токен"]

[Form Section 1: Основная информация]
- Название токена* (input)
- OpenAI API ключ* (password input с show/hide)
- Заметки (textarea)

[Form Section 2: Конфигурация доступа]  
- Доступные модели (multi-select checkboxes):
  ☑ gpt-4o
  ☑ gpt-4o-mini  
  ☐ gpt-3.5-turbo
  ☐ gpt-4-turbo

[Form Section 3: Лимиты и приоритеты]
- Дневной лимит (number input, default: 10,000)
- Месячный лимит (number input, default: 300,000)  
- Приоритет (slider 1-10, default: 1)
- Активен (toggle switch)

[Modal Footer]
[Cancel] [Save Token]
```

#### 3. **Модальное окно статистики токена**

**Детальная статистика за 30 дней:**
- График использования по дням (линейный график)
- Метрики: requests, tokens, success rate, avg response time
- Таблица с разбивкой по дням
- Топ ошибок (если есть)

#### 4. **Состояния UI для дизайна**

**Loading State:**
- Skeleton для таблицы токенов
- Спиннер + "Загрузка токенов..."

**Empty State:**  
- Иллюстрация пустого состояния
- "Токены не найдены"
- Кнопка "Добавить первый токен"

**Error State:**
- Ошибка подключения к API
- Кнопка "Повторить попытку"

### 🎨 Дизайнерские решения:

#### **Цветовые индикаторы:**
```css
/* Использование лимитов */
Low usage (< 70%): #10b981 (зеленый)
Medium usage (70-90%): #f59e0b (желтый)  
High usage (> 90%): #ef4444 (красный)

/* Приоритет токенов */
Priority 1-3: #6366f1 (синий) - высокий
Priority 4-7: #8b5cf6 (фиолетовый) - средний
Priority 8-10: #6b7280 (серый) - низкий

/* Статусы */
Active: #10b981 (зеленый)
Inactive: #6b7280 (серый) 
Error: #ef4444 (красный)
```

#### **Типографика** (следовать AdminUsers):
```css
Page Title: 20px, font-weight: 500
Section Headers: 16px, font-weight: 500  
Table Headers: 13px, font-weight: 600, uppercase
Body Text: 14px, font-weight: 400
Small Text: 12px, font-weight: 400
```

#### **Компоненты для продумывания:**

1. **Progress Bars** для лимитов использования
2. **Badge Components** для статусов и приоритетов
3. **Tooltip** для маскированных токенов  
4. **Dropdown Menu** для действий в таблице
5. **Multi-Select** для фильтра по моделям
6. **Data Visualization** для статистики использования

### 📐 Технические ограничения:

- **Минимальная ширина**: 1200px (desktop-first)
- **Максимальная высота таблицы**: 600px с вертикальным скроллом
- **Модальные окна**: max-width 600px для форм, 900px для статистики
- **Адаптивность**: не критична (админ-панель в основном для desktop)

### 🔄 Референсы для вдохновения:

1. **Yandex Cloud Console** - базовая стилистика
2. **Stripe Dashboard** - tables и data visualization
3. **GitHub Settings** - forms и модальные окна
4. **Vercel Dashboard** - clean UI и состояния

## 🎯 РЕЗУЛЬТАТ РАБОТЫ UI DESIGNER:

Создать детальный дизайн со всеми состояниями интерфейса:

### 📁 Файлы для создания:
```
TASK/UIDesigner/
├── main_page_design.md           // Основная страница с таблицей
├── create_edit_modal_design.md   // Модальное окно создания/редактирования  
├── usage_statistics_modal.md     // Модальное окно статистики
├── ui_components_specifications.md // Детальные спецификации компонентов
├── color_scheme_and_tokens.md    // Цвета, отступы, шрифты
└── user_interaction_flows.md     // UX сценарии взаимодействия
```

### 📋 Что должно быть в каждом файле:
- **Детальное описание** каждого UI элемента
- **Размеры, отступы, цвета** всех компонентов
- **Состояния элементов** (hover, active, disabled, loading)
- **Responsive behavior** (если применимо)
- **Accessibility considerations** (keyboard navigation, screen readers)

## ⚡ ПРИОРИТЕТЫ:

### 🔴 КРИТИЧНО:
1. **Консистентность** с существующими админ-страницами
2. **Удобство работы** с большим количеством токенов (100+)
3. **Четкая визуализация** статуса и использования токенов
4. **Безопасность UI** (маскирование токенов, подтверждения удаления)

### 🟡 ВАЖНО:
1. Красивые графики статистики использования
2. Интуитивное управление приоритетами  
3. Быстрые действия (bulk operations)
4. Продуманные микроанимации

### 🟢 ЖЕЛАТЕЛЬНО:
1. Drag & drop для изменения приоритетов
2. Экспорт статистики  
3. Темная тема (в будущем)

## 📞 НАЧИНАЙ РАБОТУ!

Проанализируй существующую дизайн-систему проекта и создай детальные спецификации интерфейса для страницы управления AI-токенами. 

**После завершения своей части передай управление Frontend UX Designer для доработки пользовательских сценариев.**

---

*Промпт создан системным аналитиком для UI Designer*  
*ChatAI Team • Версия 1.0 • 25.01.2025*