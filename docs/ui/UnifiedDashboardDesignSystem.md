# ChatAI MVP 11 - Unified Dashboard Design System (Updated)

## Обзор концепции

Обновленная единая дизайн-система для страниц личного кабинета ChatAI MVP 11, основанная на **минималистичном светлом дизайне** с фиолетовым акцентом. Система полностью переработана для максимальной чистоты и профессиональности.

## Дизайн-философия

**"Чистый минимализм без лишних эффектов"**

Новая философия дизайна основана на принципах:
- Никаких теней, подъемов и сложных эффектов
- Простые переходы (150ms ease)
- Чистые линии и границы
- Максимальная читаемость и профессионализм

### Ключевые принципы (обновленные)

1. **Минимализм превыше всего** - убраны все лишние эффекты, тени, подъемы
2. **Чистый светлый дизайн** - белые элементы, простые серые границы, единственный акцент - фиолетовый
3. **Быстрые переходы** - все анимации 150ms для мгновенного отклика
4. **Функциональность** - каждый элемент имеет четкую цель без декоративных излишеств

## Цветовая палитра (обновленная)

### Основные цвета
```css
--primary: #7C3AED;           /* Единственный акцентный цвет - фиолетовый */
--primary-hover: #6C2BD9;     /* Hover состояние */

--background: #FFFFFF;        /* Белый фон для всех элементов */
--surface: #F8F9FA;           /* Серый фон (sidebar, main container) */
--border: #E5E7EB;           /* Серые границы */

--text-primary: #111827;      /* Основной черный текст */
--text-secondary: #6B7280;    /* Серый текст */
--text-muted: #9CA3AF;       /* Приглушенный текст */

--success: #16A34A;          /* Зеленый для успеха */
--error: #DC2626;            /* Красный для ошибок */
--warning: #F59E0B;          /* Желтый для предупреждений */
```

### Принципы использования цветов
1. **Минимум цветов**: Только белый, серый и фиолетовый
2. **Четкие контрасты**: Темный текст на светлом фоне
3. **Один акцент**: Фиолетовый используется только для важных действий
4. **Простые границы**: Серые границы вместо теней

## Новая структура Layout

### Общая архитектура
Полностью переработанная структура dashboard с минималистичным подходом:

```
┌─────────────────────────────────────────────────────────┐
│ [S]                    Header (fixed top)                │ ← Высота 58px
│ [I]  Balance | Notifications | Profile                   │   margin-left: 84px
│ [D]                                                       │
│ [E] ┌───────────────────────────────────────────────────┐ │
│ [B] │                                                   │ │
│ [A] │              Main Content Area                    │ │ ← margin-left: 84px 
│ [R] │                                                   │ │   margin-top: 39px
│ [6] │        (Белый фон с серой рамкой)                │ │   padding: 20px
│ [4] │                                                   │ │
│ [p] │                                                   │ │
│ [x] └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Компоненты Layout

#### 1. Sidebar (обновленный)
- **Ширина**: 64px (вместо 200px)
- **Стиль**: Вертикальные иконки без текста
- **Фон**: #f8f9fa (единый серый цвет)
- **Активное состояние**: #7C3AED с белыми иконками
- **Z-index**: 101

```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 64px;
  height: 100vh;
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
  z-index: 101;
}
```

#### 2. Header (обновленный)
- **Высота**: 58px (вместо 64px) 
- **Отступ слева**: 84px (для sidebar)
- **Элементы**: Название страницы + trio (баланс, уведомления, профиль)
- **Стиль trio**: Минималистичный белый фон с серыми границами

```css
.header {
  position: fixed;
  top: 0;
  left: 84px;
  right: 0;
  height: 58px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 100;
}
```

#### 3. Main Container (обновленный)
- **Отступы**: margin-left: 84px, margin-top: 39px
- **Внутренние отступы**: 20px со всех сторон
- **Фон**: #f8f9fa (серая рамка вокруг белого контента)

```css
.mainContainer {
  margin-left: 84px;
  margin-top: 39px;
  padding: 20px;
  background: #f8f9fa;
  min-height: calc(100vh - 39px);
}
```

## Модальные окна и UI компоненты

### Принципы модальных окон
Все модальные окна теперь используют **React Portal** для правильного отображения поверх всех элементов:

```jsx
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, children }) => {
  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content">
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};
```

### Стилизация модальных окон

#### Оверлей
```css
.modalOverlay {
  position: fixed !important;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999999;
}
```

#### Контент модального окна
```css
.modal {
  background: white;
  border-radius: 20px;        /* Основное закругление */
  border: 1px solid #e5e7eb;  /* Простая граница без тени */
  max-width: 480px;
  margin: auto;
}
```

#### Элементы внутри модального окна
- **Кнопки**: border-radius: 12px
- **Поля ввода**: border-radius: 20px  
- **Статусные плашки**: border-radius: 12px

## Кнопки и интерактивные элементы

### Стили кнопок (обновленные)

#### Основные кнопки
```css
.primaryButton {
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 150ms ease;
}

.primaryButton:hover {
  background: #6C2BD9;
}
```

#### Второстепенные кнопки  
```css
.secondaryButton {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 150ms ease;
}

.secondaryButton:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}
```

#### Header элементы (баланс, уведомления, профиль)
```css
.headerButton {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 36px;
  font-weight: 500;
  transition: all 150ms ease;
}

.headerButton:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}
```

## Типографическая система

### Заголовки
- **H1**: `text-2xl sm:text-3xl font-bold text-gray-900` - Основные заголовки страниц
- **H2**: `text-xl sm:text-2xl font-semibold text-gray-900` - Заголовки секций
- **H3**: `text-lg font-semibold text-gray-900` - Заголовки карточек
- **H4**: `text-base font-medium text-gray-900` - Подзаголовки

### Текст
- **Body Large**: `text-base text-gray-600 leading-relaxed` - Основной текст
- **Body**: `text-sm text-gray-600` - Стандартный текст
- **Caption**: `text-xs text-gray-500` - Вспомогательный текст
- **Link**: `text-purple-600 hover:text-purple-700` - Ссылки

## Spacing система

### Отступы (Tailwind классы)
```css
/* Контейнеры */
.page-container { @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }
.card-padding { @apply p-6; }
.section-gap { @apply space-y-6; }
.grid-gap { @apply gap-6; }

/* Margins */
.section-mb { @apply mb-8; }
.card-mb { @apply mb-6; }
.text-mb { @apply mb-4; }
```

### Grid система
```css
/* Responsive сетки */
.metrics-grid { @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6; }
.cards-grid { @apply grid grid-cols-1 lg:grid-cols-2 gap-6; }
.single-column { @apply max-w-4xl mx-auto; }
```

## Компоненты

### 1. PageHeader (Универсальный заголовок страницы)

**Структура:**
```jsx
<PageHeader 
  title="Dashboard"
  subtitle="Обзор активности и метрики"
  icon={DashboardIcon}
  showAvatar={true}
  actions={<ActionsComponent />}
  contextBar={<ContextBar />}
/>
```

**Внешний вид:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Avatar] Page Title                              [Badge] [Actions] │
│          Subtitle/Description                                     │
│                                                                   │
│ ┌─ Optional Context Bar (breadcrumbs, stats, filters) ──────────┐ │
│ │ [Icon] Context • [Metric] Value • [Filter] Active             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Tailwind классы:**
- Контейнер: `mb-6`
- Основная секция: `flex items-center justify-between`
- Заголовок: `text-2xl sm:text-3xl font-bold text-gray-900`
- Аватар: `w-12 h-12 bg-purple-50 border border-purple-200 rounded-xl`
- Контекстная панель: `mt-4 p-3 bg-gray-50 rounded-xl border`

### 2. MetricCard (Карточка метрики)

**Структура:**
```jsx
<MetricCard 
  title="Активные диалоги"
  value="142"
  unit="шт"
  icon={MessageSquareIcon}
  trend="+12%"
  description="За последние 24 часа"
/>
```

**Внешний вид:**
```
┌─────────────────────────────────┐
│ [Icon]  Title                   │
│         ┌─────────────────────┐ │
│         │ 1,234               │ │
│         │ Large metric value  │ │
│         └─────────────────────┘ │
│         Secondary info          │
│         [Progress bar]          │
│         ↗ Trend indicator      │
└─────────────────────────────────┘
```

**Tailwind классы:**
- Карточка: `bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all duration-200`
- Иконочный контейнер: `w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center`
- Значение: `text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent`
- Заголовок: `font-semibold text-gray-900`

### 3. StandardCard (Стандартная карточка)

**Структура:**
```jsx
<StandardCard 
  title="Заголовок карточки"
  actions={<Actions />}
  loading={false}
  className="custom-styles"
>
  <CardContent />
</StandardCard>
```

**Tailwind классы:**
- Основная: `bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200`
- Заголовок: `text-lg font-semibold text-gray-900 mb-4`
- Содержимое: `p-6`

### 4. Layout Patterns (Паттерны размещения)

#### Dashboard Layout
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <PageHeader {...props} />
  
  {/* Метрики */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <MetricCard />
    <MetricCard />
    <MetricCard />
    <MetricCard />
  </div>
  
  {/* Основной контент */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <StandardCard />
    <StandardCard />
  </div>
</div>
```

#### Single Column Layout
```jsx
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <PageHeader {...props} />
  
  <div className="space-y-6">
    <StandardCard />
    <StandardCard />
  </div>
</div>
```

## Интерактивные состояния

### Hover эффекты
```css
.card-hover {
  @apply hover:shadow-md hover:-translate-y-0.5 transition-all duration-200;
}

.button-hover {
  @apply hover:bg-purple-700 transition-colors duration-200;
}
```

### Focus состояния
```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2;
}
```

### Loading состояния
```jsx
const LoadingCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
    </div>
  </div>
);
```

### Empty состояния
```jsx
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6">{description}</p>
    {action && action}
  </div>
);
```

## Кнопки

### Варианты стилей
```jsx
// Primary Button
<button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
  Primary Action
</button>

// Secondary Button  
<button className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300 hover:border-purple-300 transition-all duration-200">
  Secondary Action
</button>

// Ghost Button
<button className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg font-medium transition-all duration-200">
  Ghost Action
</button>
```

### Размеры
- **Small**: `px-3 py-1.5 text-sm`
- **Medium**: `px-4 py-2 text-sm` (по умолчанию)
- **Large**: `px-6 py-3 text-base`

## Responsive дизайн

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px - 1279px
- **Large Desktop**: 1280px+

### Adaptive поведение
```jsx
// Mobile First подход
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">

// Условное отображение
<div className="block sm:hidden"> {/* Только на мобильных */}
<div className="hidden sm:block"> {/* Скрыть на мобильных */}

// Responsive spacing
<div className="p-4 lg:p-6"> {/* 16px на мобильных, 24px на desktop */}
```

## Анимации (Framer Motion)

### Стандартные анимации
```jsx
// Анимация появления страницы
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

// Stagger анимация для карточек
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
};
```

### Hover анимации
```jsx
<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  transition={{ duration: 0.2 }}
  className="bg-white rounded-xl border border-gray-200 p-6"
>
  {/* Содержимое карточки */}
</motion.div>
```

## Accessibility

### Клавиатурная навигация
```jsx
// Focus trap для модальных окон
<div 
  role="dialog" 
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  onKeyDown={handleEscKey}
>

// Доступные кнопки
<button 
  aria-label="Закрыть диалог"
  className="focus:ring-2 focus:ring-purple-500"
>
```

### Цветовая контрастность
- Основной текст: минимум 4.5:1 (WCAG AA)
- Крупный текст: минимум 3:1 (WCAG AA)
- Интерактивные элементы: минимум 3:1

## Иконки (Feather Icons)

### Стандартные размеры
- **XS**: `w-4 h-4` (16px) - для мелких элементов
- **Small**: `w-5 h-5` (20px) - стандартный размер
- **Medium**: `w-6 h-6` (24px) - в карточках
- **Large**: `w-8 h-8` (32px) - в заголовках

### Цвета иконок
```jsx
<Icon className="w-5 h-5 text-purple-600" />  {/* Primary */}
<Icon className="w-5 h-5 text-gray-600" />    {/* Secondary */}
<Icon className="w-5 h-5 text-gray-400" />    {/* Muted */}
<Icon className="w-5 h-5 text-green-600" />   {/* Success */}
<Icon className="w-5 h-5 text-red-500" />     {/* Error */}
```

## Применение по страницам

### Dashboard
- PageHeader с аватаром и приветствием
- Сетка 4 MetricCard для основных метрик
- Широкие карточки для детальной информации

### AI Assistant  
- PageHeader с иконкой CPU и бейджем уровня
- Список ассистентов в StandardCard
- Модальные окна для создания/редактирования

### Dialogs
- PageHeader с индикатором реального времени
- Фильтры в виде chip'ов
- Карточки диалогов в сетке

### Balance
- PageHeader с информацией о балансе
- MetricCard для статистики
- Форма пополнения в StandardCard

### Usage
- PageHeader со статистикой периода
- MetricCard для ключевых показателей
- Таблица транзакций в StandardCard

## Критерии успеха

### Визуальная консистентность
- [ ] Все страницы используют одинаковые заголовки (PageHeader)
- [ ] Единообразные карточки и отступы
- [ ] Согласованная цветовая схема
- [ ] Одинаковые hover и focus эффекты

### UX консистентность  
- [ ] Предсказуемые взаимодействия
- [ ] Единообразные loading и error состояния
- [ ] Консистентная навигация
- [ ] Одинаковые анимации и переходы

### Техническое качество
- [ ] Переиспользуемые компоненты
- [ ] Чистый, поддерживаемый код
- [ ] Хорошая производительность
- [ ] Accessibility compliance

## Примеры использования

### Создание новой страницы
```jsx
import { PageHeader, MetricCard, StandardCard } from '@/components/common';

export default function NewPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader 
        title="Новая страница"
        subtitle="Описание функционала"
        icon={NewIcon}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard title="Метрика 1" value="100" />
        <MetricCard title="Метрика 2" value="200" />
        <MetricCard title="Метрика 3" value="300" />
      </div>
      
      <StandardCard title="Основной контент">
        {/* Содержимое */}
      </StandardCard>
    </div>
  );
}
```

### Кастомизация компонентов
```jsx
// Расширение базового компонента
const CustomMetricCard = ({ ...props }) => (
  <MetricCard 
    {...props}
    className="border-2 border-purple-200 bg-purple-50"
  />
);

// Использование с дополнительными элементами
<StandardCard 
  title="Заголовок"
  actions={
    <button className="text-purple-600 hover:text-purple-700">
      Действие
    </button>
  }
>
  <div className="space-y-4">
    {/* Кастомное содержимое */}
  </div>
</StandardCard>
```

Эта дизайн-система обеспечивает последовательный, современный и доступный пользовательский интерфейс для всех страниц личного кабинета ChatAI MVP 11.