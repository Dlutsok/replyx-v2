# Дизайн-концепция страницы Admin Settings

## Анализ текущего состояния

### Что есть сейчас
- Страница `/admin-settings` уже включена в навигацию AdminDashboard
- Пункт меню "Настройки" (Settings) с иконкой FiSettings
- Существующий layout AdminDashboard с фиолетовой цветовой схемой
- Стилистика в духе Yandex Console (судя по AdminAITokens.module.css)

### Проблемы и пробелы
- Страница еще не существует - нужна полная реализация
- Отсутствует четкая структура системных настроек
- Нет группировки настроек по функциональным областям
- Требуется продуманная UX для сложных конфигураций

## Research & современные тренды

### Источники вдохновения
1. **Yandex Cloud Console** - четкие формы, группировка, карточки
2. **Linear.app Settings** - минималистичные переключатели, секционная структура
3. **Vercel Dashboard** - табы для группировки, inline редактирование
4. **Stripe Dashboard** - четкие статусы, валидация в реальном времени

### Лучшие практики для админ-настроек
- Группировка по логическим разделам (AI, Email, Security)
- Четкие enable/disable статусы с визуальными индикаторами
- Inline редактирование с автосохранением
- Валидация конфигураций в реальном времени
- Breadcrumbs для навигации по сложным настройкам

## Дизайн-концепция

### Information Architecture

```
/admin-settings
├── Основные настройки системы
│   ├── Название системы
│   ├── Тайм-зона по умолчанию
│   ├── Язык интерфейса
│   └── Максимальные лимиты
├── AI провайдеры и модели
│   ├── OpenAI настройки
│   ├── Anthropic конфигурация
│   ├── Fallback стратегии
│   └── Rate limiting
├── Email и уведомления
│   ├── SMTP конфигурация
│   ├── Шаблоны писем
│   ├── Webhook endpoints
│   └── Уведомления администраторам
├── Безопасность и аутентификация
│   ├── Сессии и токены
│   ├── IP whitelisting
│   ├── 2FA настройки
│   └── Аудит логи
├── Лимиты и квоты
│   ├── Лимиты пользователей
│   ├── API rate limits
│   ├── Файловые ограничения
│   └── Backup настройки
└── Обслуживание системы
    ├── Режим обслуживания
    ├── Backup/restore
    ├── Логи и мониторинг
    └── Очистка данных
```

### User Scenarios

**Основные сценарии использования:**

1. **Настройка AI провайдеров**
   - Админ добавляет новый OpenAI токен
   - Устанавливает приоритеты между провайдерами
   - Настраивает fallback стратегии при сбоях

2. **Конфигурация email уведомлений**
   - Настройка SMTP сервера
   - Тестирование отправки писем
   - Редактирование шаблонов уведомлений

3. **Управление безопасностью**
   - Включение/отключение 2FA
   - Настройка IP whitelist
   - Управление сессиями пользователей

4. **Мониторинг и обслуживание**
   - Включение режима обслуживания
   - Создание backup'ов
   - Просмотр системных метрик

### Visual Hierarchy

1. **Page Header** - заголовок + статус системы
2. **Settings Tabs** - горизонтальные табы для группировки
3. **Settings Sections** - карточки с настройками в активном табе
4. **Action Buttons** - сохранение, тест, сброс

## Responsive стратегия

### Desktop (1024px+)
- Полноширинная сетка с табами наверху
- Боковые panel для quick actions
- Две колонки для dense layouts

### Tablet (768-1023px)  
- Табы превращаются в горизонтальный скролл
- Одна колонка с компактными карточками
- Sticky header с табами

### Mobile (320-767px)
- Табы становятся аккордеоном
- Stack layout для всех элементов
- Floating save button

## Техническое задание для frontend-uiux

### HTML/JSX структура

```jsx
<AdminDashboard activeSection="settings">
  <div className={styles.settingsPage}>
    
    {/* Page Header */}
    <div className={styles.pageHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.pageTitle}>Настройки системы</h1>
        <p className={styles.pageSubtitle}>
          Управление конфигурацией и параметрами ReplyX
        </p>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.systemStatus}>
          <StatusIndicator status="healthy" label="Система работает" />
        </div>
      </div>
    </div>

    {/* Settings Navigation Tabs */}
    <div className={styles.settingsNavigation}>
      <SettingsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: 'general', label: 'Основные', icon: FiSettings },
          { id: 'ai', label: 'AI провайдеры', icon: FiZap },
          { id: 'email', label: 'Email/SMS', icon: FiMail },
          { id: 'security', label: 'Безопасность', icon: FiShield },
          { id: 'limits', label: 'Лимиты', icon: FiBarChart2 },
          { id: 'maintenance', label: 'Обслуживание', icon: FiTool }
        ]}
      />
    </div>

    {/* Settings Content */}
    <div className={styles.settingsContent}>
      {renderTabContent()}
    </div>

    {/* Global Actions */}
    <div className={styles.globalActions}>
      <button className={styles.saveButton} onClick={handleSaveAll}>
        <FiCheck size={20} />
        Сохранить изменения
      </button>
      <button className={styles.resetButton} onClick={handleReset}>
        <FiRotateCcw size={20} />
        Сбросить
      </button>
    </div>
  </div>
</AdminDashboard>
```

### Стили (Tailwind классы)

**Основная структура:**
```css
.settingsPage {
  @apply min-h-screen bg-gray-50 p-6;
}

.pageHeader {
  @apply flex justify-between items-start mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200;
}

.pageTitle {
  @apply text-3xl font-bold text-gray-900 mb-2;
}

.pageSubtitle {
  @apply text-lg text-gray-600 leading-relaxed;
}
```

**Settings карточки:**
```css
.settingsCard {
  @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 transition-all duration-200 hover:shadow-md;
}

.settingItem {
  @apply flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0;
}

.settingLabel {
  @apply flex-1 mr-4;
}

.settingTitle {
  @apply text-base font-semibold text-gray-900 mb-1;
}

.settingDescription {
  @apply text-sm text-gray-600 leading-relaxed;
}
```

**Табы и навигация:**
```css
.settingsNavigation {
  @apply bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-8 overflow-x-auto;
}

.tabButton {
  @apply flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 whitespace-nowrap;
}

.tabButton.active {
  @apply text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md;
}
```

### Интерактивные состояния

**Toggle switches:**
```css
.toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2;
}

.toggle.enabled {
  @apply bg-purple-600;
}

.toggle.disabled {
  @apply bg-gray-200;
}

.toggleThumb {
  @apply inline-block h-4 w-4 transform rounded-full bg-white transition-transform;
}
```

**Form elements:**
```css
.formInput {
  @apply w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors;
}

.formSelect {
  @apply w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500;
}

.formTextarea {
  @apply w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500;
}
```

**Validation states:**
```css
.inputError {
  @apply border-red-300 focus:ring-red-500 focus:border-red-500;
}

.inputSuccess {
  @apply border-green-300 focus:ring-green-500 focus:border-green-500;
}

.errorMessage {
  @apply text-sm text-red-600 mt-1 flex items-center gap-1;
}

.successMessage {
  @apply text-sm text-green-600 mt-1 flex items-center gap-1;
}
```

### Анимации Framer Motion

**Page transitions:**
```js
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};
```

**Tab content transitions:**
```js
const tabContentVariants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 }
};
```

**Settings card animations:**
```js
const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  in: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 }
};
```

### Файлы для создания/изменения

**Основные компоненты:**
- `frontend/pages/admin-settings.js` - основная страница
- `frontend/components/admin/SettingsTabs.js` - табы навигации
- `frontend/components/admin/SettingsCard.js` - карточка настроек
- `frontend/components/admin/SettingToggle.js` - переключатель
- `frontend/components/admin/StatusIndicator.js` - индикатор статуса

**Стили:**
- `frontend/styles/pages/AdminSettings.module.css` - стили страницы
- `frontend/styles/components/SettingsCard.module.css` - стили карточки
- `frontend/styles/components/SettingsTabs.module.css` - стили табов

**Hooks:**
- `frontend/hooks/useSystemSettings.js` - управление настройками
- `frontend/hooks/useSettingsValidation.js` - валидация форм

### Дизайн-токены (следование фирменному стилю)

**Цветовая схема:**
- Primary: `#6366f1` (индиго-500) для активных элементов
- Primary hover: `#4f46e5` (индиго-600) 
- Background: `#f8fafc` (slate-50)
- Card background: `#ffffff`
- Text primary: `#111827` (gray-900)
- Text secondary: `#6b7280` (gray-500)
- Border: `#e5e7eb` (gray-200)
- Success: `#10b981` (emerald-500)
- Error: `#ef4444` (red-500)

**Закругления:**
- Карточки: `rounded-xl` (12px)
- Кнопки: `rounded-lg` (8px) 
- Inputs: `rounded-xl` (12px)

**Тени:**
- Базовая: `shadow-sm`
- Hover: `shadow-md`
- Активная: `shadow-lg`

**Типографика:**
- Page title: `text-3xl font-bold`
- Section title: `text-xl font-semibold` 
- Setting title: `text-base font-semibold`
- Description: `text-sm text-gray-600`

### User Experience принципы

1. **Прогрессивное раскрытие** - показывать только необходимые настройки
2. **Immediate feedback** - валидация в реальном времени
3. **Safe defaults** - безопасные значения по умолчанию
4. **Clear actions** - понятные кнопки сохранения/отмены
5. **Status awareness** - четкие индикаторы состояния настроек

### Accessibility требования

- **Клавиатурная навигация** - Tab, Enter, Space для всех элементов
- **Screen reader поддержка** - aria-labels для всех интерактивных элементов
- **Focus indicators** - видимые focus states
- **Color contrast** - минимум 4.5:1 для текста
- **Error announcements** - программное объявление ошибок

### Критерии успеха для frontend-uiux

**Функциональность:**
- [ ] Все табы корректно переключаются с анимацией
- [ ] Формы валидируются в реальном времени
- [ ] Toggle switches работают плавно
- [ ] Данные сохраняются через API
- [ ] Показываются loading состояния

**Дизайн соответствие:**
- [ ] Использует фирменную цветовую схему (#6366f1)
- [ ] Все закругления rounded-xl для карточек
- [ ] Мягкие тени shadow-sm/shadow-md
- [ ] Консистентные отступы p-6 для карточек
- [ ] Градиентные кнопки для primary actions

**Responsive поведение:**
- [ ] Табы превращаются в аккордеон на мобильных
- [ ] Карточки stack вертикально на маленьких экранах
- [ ] Floating action buttons на мобильных
- [ ] Горизонтальный скролл табов на планшетах

**Performance:**
- [ ] Плавные анимации 60fps
- [ ] Lazy loading для больших настроек
- [ ] Debounced валидация форм
- [ ] Оптимизированные re-renders

**UX качество:**
- [ ] Четкие feedback при сохранении
- [ ] Подтверждения для опасных действий  
- [ ] Breadcrumbs для сложной навигации
- [ ] Contextual help tooltips