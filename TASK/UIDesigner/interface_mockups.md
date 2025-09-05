# Детальные макеты интерфейса: Страница управления AI-токенами

## 🎯 Обзор дизайн-концепции

**Философия дизайна**: Следуем принципам Yandex Console - чистота, функциональность, профессионализм  
**Цветовая основа**: Синяя палитра с белыми карточками  
**Подход**: Desktop-first для администраторов, максимальная информативность

---

## 📱 1. ОСНОВНАЯ СТРАНИЦА `/admin-ai-tokens`

### 🏗️ Общая структура макета
```
┌─[AdminDashboard Sidebar 280px]─┬─[Main Content Area]──────────────────┐
│ ▪ Обзор                        │                                      │
│ ▪ Пользователи                 │  [Page Header - sticky]              │
│ ● AI Токены      ← активен     │  ┌─────────────────────────────────┐  │
│ ▪ Аналитика                    │  │ Управление AI токенами          │  │
│ ▪ Мониторинг ботов             │  │ Активных: 3 • Лимит: 500k/день  │  │
│ ▪ Система                      │  └─────────────────────────────────┘  │
└────────────────────────────────┼──                                     │
                                 │  [Quick Stats Cards - 4 в ряд]      │
                                 │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
                                 │  │ 3/5  │ │ 45%  │ │ 67%  │ │  2   │  │
                                 │  │Active│ │ Day  │ │Month │ │Error │  │
                                 │  └──────┘ └──────┘ └──────┘ └──────┘  │
                                 │                                      │
                                 │  [Filters & Search Section]          │
                                 │  ┌─────────────────────────────────┐  │
                                 │  │ 🔍 Поиск... [▼Статус] [▼Priority] │  │
                                 │  └─────────────────────────────────┘  │
                                 │                                      │
                                 │  [AI Tokens Table - Основной блок]   │
                                 │  ┌─────────────────────────────────┐  │
                                 │  │ STATUS│NAME   │TOKEN │MODELS│... │  │
                                 │  │ ●●●   │●●●    │●●●   │●●●   │    │  │
                                 │  └─────────────────────────────────┘  │
                                 │                                      │
                                 │  [+ Добавить токен]                  │
                                 └──────────────────────────────────────┘
```

### 📋 A. Page Header (Sticky Header)
```html
<!-- СТРУКТУРА HEADER -->
<div class="pageHeader">
  <div class="headerContent">
    <div class="titleSection">
      <h1 class="title">
        <FiZap class="titleIcon" />
        Управление AI токенами
      </h1>
      <p class="subtitle">
        Активных токенов: 3 из 5 • Общий лимит: 500,000 запросов/день
      </p>
    </div>
    <div class="headerActions">
      <button class="addButton primary">
        <FiPlus size={16} />
        Добавить токен
      </button>
    </div>
  </div>
</div>
```

**Визуальные характеристики:**
- **Фон**: `white` с `border-bottom: 1px solid #e6e6e6`
- **Заголовок**: `font-size: 20px`, `font-weight: 500`, `color: #000`
- **Иконка**: `color: #0066cc` (синий Yandex)
- **Подзаголовок**: `font-size: 13px`, `color: #999`
- **Кнопка**: `background: #0066cc`, `padding: 8px 16px`, `border-radius: 3px`

### 📊 B. Quick Stats Cards (4 карточки)
```html
<!-- МЕТРИКИ В КАРТОЧКАХ -->
<div class="statsGrid">
  
  <!-- Card 1: Активные токены -->
  <div class="statCard">
    <div class="cardIcon">
      <FiZap size={24} color="#0066cc" />
    </div>
    <div class="cardContent">
      <h3>Активных токенов</h3>
      <div class="cardValue">3<span class="cardTotal">/5</span></div>
      <div class="cardChange positive">+1 за неделю</div>
    </div>
  </div>

  <!-- Card 2: Использование дневное -->
  <div class="statCard">
    <div class="cardIcon">
      <FiActivity size={24} color="#22c55e" />
    </div>
    <div class="cardContent">
      <h3>Использование дня</h3>
      <div class="cardValue">45%</div>
      <div class="progressMini">
        <div class="progressFill" style="width: 45%; background: #22c55e;"></div>
      </div>
    </div>
  </div>

  <!-- Card 3: Использование месячное -->
  <div class="statCard">
    <div class="cardIcon">
      <FiCalendar size={24} color="#f59e0b" />
    </div>
    <div class="cardContent">
      <h3>Использование месяца</h3>
      <div class="cardValue">67%</div>
      <div class="progressMini">
        <div class="progressFill" style="width: 67%; background: #f59e0b;"></div>
      </div>
    </div>
  </div>

  <!-- Card 4: Токены с ошибками -->
  <div class="statCard">
    <div class="cardIcon">
      <FiAlertTriangle size={24} color="#ef4444" />
    </div>
    <div class="cardContent">
      <h3>С ошибками</h3>
      <div class="cardValue">2</div>
      <div class="cardChange negative">Требуют внимания</div>
    </div>
  </div>
  
</div>
```

**Размеры карточек:**
- **Сетка**: `display: grid`, `grid-template-columns: repeat(4, 1fr)`, `gap: 16px`
- **Карточка**: `background: white`, `padding: 20px`, `border-radius: 6px`
- **Тень**: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)`
- **Значение**: `font-size: 24px`, `font-weight: 600`

### 🔍 C. Filters & Search Section
```html
<!-- ФИЛЬТРЫ И ПОИСК -->
<div class="filtersSection">
  <div class="filters">
    
    <!-- Поиск -->
    <div class="searchBox">
      <FiSearch class="searchIcon" />
      <input 
        class="searchInput" 
        placeholder="Поиск токенов по названию..."
        type="text"
      />
    </div>

    <!-- Фильтр по статусу -->
    <div class="filterBox">
      <FiFilter class="filterIcon" />
      <select class="filterSelect">
        <option value="all">Все статусы</option>
        <option value="active">Активные</option>
        <option value="inactive">Неактивные</option>
        <option value="error">С ошибками</option>
      </select>
    </div>

    <!-- Фильтр по приоритету -->
    <div class="filterBox">
      <FiLayers class="filterIcon" />
      <select class="filterSelect">
        <option value="all">Все приоритеты</option>
        <option value="1-3">Высокий (1-3)</option>
        <option value="4-7">Средний (4-7)</option>
        <option value="8-10">Низкий (8-10)</option>
      </select>
    </div>

    <!-- Сортировка -->
    <div class="sortBox">
      <span class="sortLabel">Сортировка:</span>
      <select class="sortSelect">
        <option value="priority">По приоритету</option>
        <option value="usage">По использованию</option>
        <option value="name">По названию</option>
        <option value="last_used">По активности</option>
      </select>
    </div>

  </div>
</div>
```

### 📋 D. AI Tokens Table (Основная таблица)
```html
<!-- ГЛАВНАЯ ТАБЛИЦА ТОКЕНОВ -->
<div class="tableContainer">
  <table class="table">
    <thead class="tableHeader">
      <tr>
        <th width="80px">Статус</th>
        <th width="200px">Название</th>
        <th width="120px">Токен</th>
        <th width="180px">Модели</th>
        <th width="140px">Дневной лимит</th>
        <th width="140px">Месячный лимит</th>
        <th width="120px">Последнее использование</th>
        <th width="80px">Ошибки</th>
        <th width="120px">Действия</th>
      </tr>
    </thead>
    <tbody>
      
      <!-- Row 1: Активный токен -->
      <tr class="tableRow">
        <!-- Статус -->
        <td>
          <div class="statusCell">
            <div class="statusDot active"></div>
            <span class="statusText">Активен</span>
          </div>
        </td>
        
        <!-- Название + Приоритет -->
        <td>
          <div class="nameCell">
            <span class="tokenName">Production Main</span>
            <div class="priorityBadge priority-1">П1</div>
          </div>
        </td>
        
        <!-- Токен (маскированный) -->
        <td>
          <div class="tokenCell">
            <code class="tokenMask">sk-...7f2g</code>
            <button class="copyBtn" title="Копировать">
              <FiCopy size={14} />
            </button>
          </div>
        </td>
        
        <!-- Модели -->
        <td>
          <div class="modelsCell">
            <span class="modelBadge">GPT-4O</span>
            <span class="modelBadge">GPT-4O-Mini</span>
          </div>
        </td>
        
        <!-- Дневное использование -->
        <td>
          <div class="usageCell">
            <div class="usageNumbers">2,543 / 10,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 25.4%; background: #22c55e;"></div>
            </div>
            <div class="usagePercent">25.4%</div>
          </div>
        </td>
        
        <!-- Месячное использование -->
        <td>
          <div class="usageCell">
            <div class="usageNumbers">45,678 / 300,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 15.2%; background: #22c55e;"></div>
            </div>
            <div class="usagePercent">15.2%</div>
          </div>
        </td>
        
        <!-- Последнее использование -->
        <td>
          <div class="timeCell">
            <span class="timeMain">2 мин. назад</span>
            <span class="timeDetail">14:30</span>
          </div>
        </td>
        
        <!-- Ошибки -->
        <td>
          <div class="errorsCell">
            <span class="errorCount">0</span>
          </div>
        </td>
        
        <!-- Действия -->
        <td>
          <div class="actions">
            <button class="actionBtn" title="Статистика">
              <FiBarChart size={16} />
            </button>
            <button class="actionBtn" title="Редактировать">
              <FiEdit size={16} />
            </button>
            <button class="actionBtn danger" title="Удалить">
              <FiTrash2 size={16} />
            </button>
          </div>
        </td>
      </tr>

      <!-- Row 2: Токен с предупреждением -->
      <tr class="tableRow">
        <td>
          <div class="statusCell">
            <div class="statusDot active"></div>
            <span class="statusText">Активен</span>
          </div>
        </td>
        <td>
          <div class="nameCell">
            <span class="tokenName">Backup Token</span>
            <div class="priorityBadge priority-2">П2</div>
          </div>
        </td>
        <td>
          <div class="tokenCell">
            <code class="tokenMask">sk-...9kh3</code>
            <button class="copyBtn" title="Копировать">
              <FiCopy size={14} />
            </button>
          </div>
        </td>
        <td>
          <div class="modelsCell">
            <span class="modelBadge">GPT-3.5</span>
          </div>
        </td>
        <td>
          <div class="usageCell">
            <div class="usageNumbers">8,750 / 10,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 87.5%; background: #f59e0b;"></div>
            </div>
            <div class="usagePercent warning">87.5%</div>
          </div>
        </td>
        <td>
          <div class="usageCell">
            <div class="usageNumbers">187,500 / 200,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 93.8%; background: #ef4444;"></div>
            </div>
            <div class="usagePercent critical">93.8%</div>
          </div>
        </td>
        <td>
          <div class="timeCell">
            <span class="timeMain">15 мин. назад</span>
            <span class="timeDetail">14:15</span>
          </div>
        </td>
        <td>
          <div class="errorsCell">
            <span class="errorCount">2</span>
          </div>
        </td>
        <td>
          <div class="actions">
            <button class="actionBtn" title="Статистика">
              <FiBarChart size={16} />
            </button>
            <button class="actionBtn" title="Редактировать">
              <FiEdit size={16} />
            </button>
            <button class="actionBtn danger" title="Удалить">
              <FiTrash2 size={16} />
            </button>
          </div>
        </td>
      </tr>

      <!-- Row 3: Неактивный токен -->
      <tr class="tableRow inactive">
        <td>
          <div class="statusCell">
            <div class="statusDot inactive"></div>
            <span class="statusText">Неактивен</span>
          </div>
        </td>
        <td>
          <div class="nameCell">
            <span class="tokenName">Development</span>
            <div class="priorityBadge priority-5">П5</div>
          </div>
        </td>
        <td>
          <div class="tokenCell">
            <code class="tokenMask">sk-...m2p8</code>
            <button class="copyBtn disabled" title="Токен неактивен">
              <FiCopy size={14} />
            </button>
          </div>
        </td>
        <td>
          <div class="modelsCell">
            <span class="modelBadge">GPT-4O-Mini</span>
          </div>
        </td>
        <td>
          <div class="usageCell disabled">
            <div class="usageNumbers">0 / 5,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 0%; background: #6b7280;"></div>
            </div>
            <div class="usagePercent">0%</div>
          </div>
        </td>
        <td>
          <div class="usageCell disabled">
            <div class="usageNumbers">0 / 100,000</div>
            <div class="progressBar">
              <div class="progressFill" style="width: 0%; background: #6b7280;"></div>
            </div>
            <div class="usagePercent">0%</div>
          </div>
        </td>
        <td>
          <div class="timeCell">
            <span class="timeMain">3 дня назад</span>
            <span class="timeDetail">22 янв</span>
          </div>
        </td>
        <td>
          <div class="errorsCell">
            <span class="errorCount">0</span>
          </div>
        </td>
        <td>
          <div class="actions">
            <button class="actionBtn disabled" title="Недоступно">
              <FiBarChart size={16} />
            </button>
            <button class="actionBtn" title="Редактировать">
              <FiEdit size={16} />
            </button>
            <button class="actionBtn danger" title="Удалить">
              <FiTrash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      
    </tbody>
  </table>
</div>
```

### 📱 E. Bottom Action Bar
```html
<!-- НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ -->
<div class="bottomActions">
  <div class="bulkActions" style="display: none;">
    <span class="selectedCount">Выбрано: 2 токена</span>
    <button class="bulkBtn secondary">Активировать</button>
    <button class="bulkBtn secondary">Деактивировать</button>
    <button class="bulkBtn danger">Удалить</button>
  </div>
  
  <div class="pagination">
    <span class="paginationInfo">Показано 1-10 из 15 токенов</span>
    <div class="paginationControls">
      <button class="pageBtn" disabled>←</button>
      <span class="currentPage">1</span>
      <button class="pageBtn">→</button>
    </div>
  </div>
</div>
```

---

## 📊 2. СОСТОЯНИЯ UI

### ⏳ Loading State
```html
<div class="loading">
  <div class="loadingSpinner">
    <div class="spinner"></div>
  </div>
  <p>Загрузка AI токенов...</p>
</div>
```

### 🚫 Empty State
```html
<div class="emptyState">
  <div class="emptyIcon">
    <FiZap size={64} color="#6b7280" />
  </div>
  <h3>Токены не найдены</h3>
  <p>У вас пока нет настроенных AI токенов</p>
  <button class="addFirstToken">
    <FiPlus size={16} />
    Добавить первый токен
  </button>
</div>
```

### ❌ Error State
```html
<div class="errorState">
  <div class="errorIcon">
    <FiAlertTriangle size={64} color="#ef4444" />
  </div>
  <h3>Ошибка подключения</h3>
  <p>Не удалось загрузить данные о токенах</p>
  <button class="retryBtn">
    <FiRefreshCw size={16} />
    Повторить попытку
  </button>
</div>
```

---

## 🎨 3. ЦВЕТОВЫЕ ИНДИКАТОРЫ

### 📊 Использование лимитов:
- **< 70%**: `#22c55e` (зеленый) - безопасно
- **70-89%**: `#f59e0b` (желтый) - предупреждение  
- **90%+**: `#ef4444` (красный) - критично

### 🏷️ Приоритет токенов:
- **1-3**: `#0066cc` (синий) - высокий приоритет
- **4-7**: `#8b5cf6` (фиолетовый) - средний приоритет
- **8-10**: `#6b7280` (серый) - низкий приоритет

### ⚡ Статусы токенов:
- **Активен**: `#22c55e` (зеленая точка)
- **Неактивен**: `#6b7280` (серая точка)
- **Ошибка**: `#ef4444` (красная точка)

---

*Макет создан UI Designer для максимальной функциональности и консистентности с существующим дизайном ChatAI*  
*Версия 1.0 • 25.01.2025*