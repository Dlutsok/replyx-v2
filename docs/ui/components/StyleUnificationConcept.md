# 🎨 Концепция унификации стилей личного кабинета ReplyX

## 🔍 Анализ текущего состояния

### Эталонные стили лендинга (Landing.module.css)
**Фирменный стиль лендинга:**
- **Цвета**: фиолетовый акцент #7C3AED, #8B5CF6, белый фон #FFFFFF
- **Округления**: border-radius: 0.75rem (rounded-xl)
- **Шрифты**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Тени**: мягкие (box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15))
- **Размеры шрифтов**: от 12px до 42px с четкой иерархией

### Проблемы текущих стилей личного кабинета

#### 1. Dashboard.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Цвета**: используется rgb(147 51 234) вместо #7C3AED
- ❌ **Радиусы**: местами 0.75rem, но не везде последовательно
- ❌ **Шрифты**: размеры превышают эталонные (+2-4px)
- ❌ **Фон**: #ffffff правильный, but градиенты и акценты не унифицированы

#### 2. Sidebar.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Цвета**: #7C4DFF вместо #7C3AED
- ❌ **Шрифты**: размеры 14px, 16px, 20px (нужно уменьшить на 2px)
- ❌ **Градиенты**: несколько вариантов фиолетовых градиентов

#### 3. HandoffQueue.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Радиусы**: 12px вместо 0.75rem (12px)
- ❌ **Цвета**: #7c3aed правильный, но используется непоследовательно
- ❌ **Шрифты**: 18px, 15px, 14px (нужно уменьшить на 2px)

#### 4. Dialogs.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Шрифты**: размеры 28px, 24px, 18px, 16px (нужно уменьшить на 2px)
- ❌ **Цвета**: #7C4DFF и #7c4dff вместо единого #7C3AED
- ❌ **Радиусы**: местами правильно 0.75rem, но не везде

#### 5. Balance.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Шрифты**: крупные размеры 42px, 28px, 18px (нужно уменьшить на 2px)
- ❌ **Цвета**: #7C4DFF вместо #7C3AED
- ❌ **Фон**: #fafbfc вместо #ffffff для некоторых секций

#### 6. Header.module.css
**РАСХОЖДЕНИЯ:**
- ❌ **Цвета**: #7C4DFF вместо #7C3AED
- ❌ **Шрифты**: 18px, 16px, 14px (нужно уменьшить на 2px)

---

## 🎯 Концепция унификации

### Дизайн-токены ReplyX (исправленные)

```css
/* ЦВЕТОВАЯ ПАЛИТРА */
--primary: #7C3AED;           /* основной фиолетовый */
--primary-gradient: #8B5CF6;  /* для градиентов */
--primary-50: #F3E8FF;        /* заливки/бейджи */
--success: #10B981;
--danger: #EF4444;
--info: #0EA5E9;

--bg: #FFFFFF;               /* основной фон */
--bg-soft: #F8FAFC;          /* секции/блоки */
--border: #E5E7EB;           /* серые границы */
--text-strong: #111827;      /* заголовки */
--text: #374151;             /* основной текст */
--text-muted: #6B7280;       /* подписи */

/* РАДИУСЫ */
--radius-base: 0.75rem;      /* 12px - базовый радиус */
--radius-sm: 0.5rem;         /* 8px - мелкие элементы */
--radius-lg: 1rem;           /* 16px - крупные блоки */

/* ТЕНИ */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);

/* ТИПОГРАФИКА (размеры уменьшены на 2px) */
--font-xs: 10px;    /* было 12px */
--font-sm: 12px;    /* было 14px */
--font-base: 14px;  /* было 16px */
--font-lg: 16px;    /* было 18px */
--font-xl: 18px;    /* было 20px */
--font-2xl: 22px;   /* было 24px */
--font-3xl: 26px;   /* было 28px */
--font-4xl: 34px;   /* было 36px */
--font-5xl: 40px;   /* было 42px */
```

### Типографическая иерархия (обновленная)
- **H1**: 34px (было 36px) - крупные заголовки
- **H2**: 26px (было 28px) - средние заголовки  
- **H3**: 18px (было 20px) - подзаголовки
- **Lead**: 16px (было 18px) - вводный текст
- **Body**: 14px (было 16px) - основной текст
- **Small**: 12px (было 14px) - подписи
- **XSmall**: 10px (было 12px) - метки

---

## 📋 Техническое задание для frontend-uiux

### 1. Компонент Dashboard (Dashboard.module.css)

#### Структура изменений:
```css
/* Заменить все вхождения */
.welcomeTitle {
  font-size: 22px; /* было 24px */
}

.welcomeSubtitle {
  font-size: 12px; /* было 14px */
}

.metricValue {
  font-size: 30px; /* было 32px */
}

.metricTitle {
  font-size: 11px; /* было 13px */
}

/* Унифицировать цвета */
.badge {
  background: rgba(124, 58, 237, 0.08); /* вместо rgba(147, 51, 234, 0.08) */
  border: 1px solid rgba(124, 58, 237, 0.2);
  color: #7C3AED;
}
```

### 2. Компонент Sidebar (Sidebar.module.css)

#### Структура изменений:
```css
/* Шрифты */
.logoText {
  font-size: 18px; /* было 20px */
}

.menuText {
  font-size: 12px; /* было 14px */
}

.groupTitle {
  font-size: 9px; /* было 11px */
}

/* Цвета */
.logoIcon {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(91, 47, 194, 0.9) 100%);
}

.menuLink.active {
  background: rgba(124, 58, 237, 0.08);
  color: #7C3AED;
}
```

### 3. Компонент HandoffQueue (HandoffQueue.module.css)

#### Структура изменений:
```css
/* Шрифты */
.queueHeader h3 {
  font-size: 16px; /* было 18px */
}

.dialogInfo h4 {
  font-size: 13px; /* было 15px */
}

.dialogMeta {
  font-size: 11px; /* было 13px */
}

/* Цвета */
.normalIcon {
  color: #7C3AED; /* вместо #7c3aed */
}

.takeButton {
  background: linear-gradient(to right, #7C3AED, #8B5CF6, #6366F1);
}
```

### 4. Компонент Dialogs (Dialogs.module.css)

#### Структура изменений:
```css
/* Заголовки */
.pageTitle {
  font-size: 22px; /* было 24px */
}

.statValue {
  font-size: 26px; /* было 28px */
}

.compactStatItem .statValue {
  font-size: 26px; /* было 28px */
}

.statLabel {
  font-size: 11px; /* было 13px */
}

/* Цвета - унификация всех фиолетовых */
.filtersToggleBtn.active,
.quickFilterBtn.active {
  background: #7C3AED; /* вместо #7C4DFF */
  border-color: #7C3AED;
}

.timeSelect:focus {
  border-color: #7C3AED; /* вместо #7C4DFF */
}
```

### 5. Компонент Balance (Balance.module.css)

#### Структура изменений:
```css
/* Основной заголовок */
.pageTitle {
  font-size: 26px; /* было 28px */
}

/* Баланс */
.balanceAmount {
  font-size: 40px; /* было 42px */
}

/* Карточки статистики */
.statCardValue {
  font-size: 30px; /* было 32px */
}

.statCardTitle {
  font-size: 11px; /* было 13px */
}

/* Цвета */
.balanceAmount.medium,
.balanceAmount.low {
  color: #7C3AED; /* вместо #7C4DFF */
}

/* Фон страницы */
.balancePage {
  background: #ffffff; /* вместо #fafbfc */
}
```

### 6. Компонент Header (Header.module.css)

#### Структура изменений:
```css
/* Заголовки */
.pageTitle {
  font-size: 16px; /* было 18px */
}

.breadcrumbLink {
  font-size: 10px; /* было 12px */
}

.breadcrumbCurrent {
  font-size: 10px; /* было 12px */
}

/* Цвета */
.balanceButton.good {
  background: rgba(124, 58, 237, 0.08); /* унификация */
  color: #7C3AED;
  border-color: rgba(124, 58, 237, 0.2);
}

.profileButton {
  background: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%);
  border: 1px solid rgba(124, 58, 237, 0.2);
}
```

### 7. Компонент BalanceDropdown (BalanceDropdown.module.css)

#### Структура изменений:
```css
/* Шрифты */
.balanceLabel {
  font-size: 14px; /* было 16px */
}

.balanceAmount {
  font-size: 26px; /* было 28px */
}

.topUpButton {
  font-size: 14px; /* было 16px */
}

/* Цвета */
.balanceAmount.medium,
.balanceAmount.low {
  color: #7C3AED;
}

.topUpButton {
  background: linear-gradient(135deg, #7C3AED 0%, #6A3AE3 100%);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
}
```

---

## 🎨 Глобальные CSS переменные

### Создать файл: frontend/styles/design-tokens.css
```css
:root {
  /* Цвета */
  --replyx-primary: #7C3AED;
  --replyx-primary-gradient: #8B5CF6;
  --replyx-primary-50: #F3E8FF;
  --replyx-success: #10B981;
  --replyx-danger: #EF4444;
  --replyx-info: #0EA5E9;
  
  --replyx-bg: #FFFFFF;
  --replyx-bg-soft: #F8FAFC;
  --replyx-border: #E5E7EB;
  --replyx-text-strong: #111827;
  --replyx-text: #374151;
  --replyx-text-muted: #6B7280;
  
  /* Радиусы */
  --replyx-radius-base: 0.75rem;
  --replyx-radius-sm: 0.5rem;
  --replyx-radius-lg: 1rem;
  
  /* Тени */
  --replyx-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --replyx-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  /* Типографика */
  --replyx-font-xs: 10px;
  --replyx-font-sm: 12px;
  --replyx-font-base: 14px;
  --replyx-font-lg: 16px;
  --replyx-font-xl: 18px;
  --replyx-font-2xl: 22px;
  --replyx-font-3xl: 26px;
  --replyx-font-4xl: 34px;
  --replyx-font-5xl: 40px;
}
```

---

## 🚀 План реализации

### Этап 1: Обновление дизайн-токенов
1. Создать design-tokens.css
2. Подключить в globals.css
3. Обновить constants/designSystem.js

### Этап 2: Унификация компонентов (в порядке приоритета)
1. **Dashboard.module.css** - основная страница
2. **Sidebar.module.css** - навигация
3. **Header.module.css** - шапка
4. **Dialogs.module.css** - ключевая функциональность
5. **Balance.module.css** - важная страница
6. **HandoffQueue.module.css** - компонент дашборда
7. **BalanceDropdown.module.css** - UI компонент

### Этап 3: Проверка и тестирование
1. Визуальная проверка всех страниц
2. Проверка responsive поведения
3. Тестирование accessibility

---

## 📊 Критерии успеха

### Визуальные критерии:
✅ Все фиолетовые цвета используют #7C3AED  
✅ Все радиусы используют 0.75rem  
✅ Все font-size уменьшены на 2px  
✅ Фон везде чистый белый #FFFFFF  
✅ Тени единообразные и мягкие  

### Технические критерии:
✅ CSS переменные используются везде  
✅ Нет hardcoded значений цветов/размеров  
✅ Consistent naming convention  
✅ Responsive поведение сохранено  
✅ Accessibility не нарушена  

### UX критерии:
✅ Читаемость текста сохранена  
✅ Контрастность соответствует WCAG  
✅ Интерактивные элементы легко различимы  
✅ Визуальная иерархия четкая  

---

## 🔄 Миграционная стратегия

### 1. Безопасная миграция
- Создать backup существующих стилей
- Тестировать на локальном environment
- Поэтапное внедрение по компонентам

### 2. Fallback стратегия
- Сохранить возможность быстрого отката
- Использовать CSS custom properties с fallback
- Документировать все изменения

### 3. Проверка качества
- Визуальное тестирование на разных экранах
- Проверка в разных браузерах
- Валидация accessibility

---

**Результат:** Единый визуальный стиль личного кабинета, полностью соответствующий фирменному стилю лендинга ReplyX, с уменьшенными на 2px размерами шрифтов для более компактного и современного вида.