# 📋 Техническое задание: Унификация стилей личного кабинета

## 🎯 Задача для frontend-uiux агента

**Цель:** Привести все стили компонентов личного кабинета к единому стандарту с лендингом, уменьшив все font-size на 2px.

---

## 🛠 Конкретные изменения в файлах

### 1. frontend/styles/pages/Dashboard.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
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

.periodLabel {
  font-size: 12px; /* было 14px */
}

.periodButton {
  font-size: 12px; /* было 14px */
}

.dateInput {
  font-size: 12px; /* было 14px */
}

/* ЦВЕТА - унификация */
.badge {
  background: rgba(124, 58, 237, 0.08); /* было rgba(147, 51, 234, 0.08) */
  border: 1px solid rgba(124, 58, 237, 0.2);
  color: #7C3AED; /* было rgb(147 51 234) */
}

.avatar {
  border: 1px solid rgba(124, 58, 237, 0.2); /* было rgba(147, 51, 234, 0.2) */
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
  color: #7C3AED;
}

.loadingSpinner {
  border-top: 2px solid #7C3AED; /* было rgb(147 51 234) */
}

.dateInput:focus {
  border-color: #7C3AED; /* было rgb(147 51 234) */
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
}

.periodButton.active {
  background-color: #7C3AED; /* было rgb(147 51 234) */
}
```

### 2. frontend/styles/layout/Sidebar.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.logoText {
  font-size: 18px; /* было 20px */
}

.menuText {
  font-size: 12px; /* было 14px */
}

.groupTitle {
  font-size: 9px; /* было 11px */
}

/* ЦВЕТА - унификация */
.logoIcon {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(91, 47, 194, 0.9) 100%);
  border: 1px solid rgba(124, 58, 237, 0.2); /* было rgba(124, 77, 255, 0.2) */
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15); /* было rgba(124, 77, 255, 0.15) */
}

.logoIcon:hover {
  background: linear-gradient(135deg, rgba(124, 58, 237, 1) 0%, rgba(91, 47, 194, 1) 100%);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25); /* было rgba(124, 77, 255, 0.25) */
}

.menuLink:hover {
  background: rgba(124, 58, 237, 0.05); /* было rgba(124, 77, 255, 0.05) */
}

.menuLink.active {
  background: rgba(124, 58, 237, 0.08); /* было rgba(124, 77, 255, 0.08) */
  color: #7C3AED; /* было #7C4DFF */
}

.menuLink.active:hover {
  background: rgba(124, 58, 237, 0.12); /* было rgba(124, 77, 255, 0.12) */
}

.toggleButton:hover {
  color: #7C3AED; /* было #7c4dff */
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.15), /* было rgba(124, 77, 255, 0.15) */
}

.toggleButtonCollapsed {
  background: linear-gradient(135deg, #7C3AED 0%, #6366f1 100%); /* было #7c4dff */
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25), /* было rgba(124, 77, 255, 0.25) */
}
```

### 3. frontend/styles/pages/Dialogs.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.pageTitle {
  font-size: 22px; /* было 24px */
}

.statValue {
  font-size: 26px; /* было 28px */
}

.statLabel {
  font-size: 11px; /* было 13px */
}

.searchInput {
  font-size: 12px; /* было 14px */
}

.filtersToggleBtn {
  font-size: 12px; /* было 14px */
}

.timeSelect {
  font-size: 12px; /* было 14px */
}

.resultsCount {
  font-size: 12px; /* было 14px */
}

.botFilterBtn {
  font-size: 12px; /* было 14px */
}

.dialogUserName {
  font-size: 14px; /* было 16px */
}

.dialogUserEmail {
  font-size: 11px; /* было 13px */
}

.dialogMeta {
  font-size: 11px; /* было 13px */
}

.userName {
  font-size: 12px; /* было 14px */
}

.userSub {
  font-size: 10px; /* было 12px */
}

.openBtn {
  font-size: 12px; /* было 14px */
}

/* ЦВЕТА - унификация */
.filtersToggleBtn.active {
  background: #7C3AED; /* было #7C4DFF */
  border-color: #7C3AED;
}

.quickFilterBtn.active {
  background: #7C3AED; /* было #7C4DFF */
  border-color: #7C3AED;
}

.timeSelect:focus {
  border-color: #7C3AED; /* было #7C4DFF */
}

.botFilterBtn.active {
  background: #7C3AED; /* было #7C4DFF */
  border-color: #7C3AED;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15); /* было rgba(124, 77, 255, 0.15) */
}

.filterOption.active {
  border-color: #7C3AED; /* было #7C4DFF */
  color: #7C3AED;
}

.realTimeToggle .active {
  color: #7C3AED; /* было #7C4DFF */
}

.openBtn {
  background: #7C3AED; /* было #7C4DFF */
}

.openBtn:hover {
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15); /* было rgba(124, 77, 255, 0.15) */
}

.loadingSpinner {
  color: #7C3AED; /* было #7C4DFF */
}
```

### 4. frontend/styles/pages/Balance.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.pageTitle {
  font-size: 26px; /* было 28px */
}

.balanceAmount {
  font-size: 40px; /* было 42px */
}

.balanceLabel {
  font-size: 12px; /* было 14px */
}

.statCardValue {
  font-size: 30px; /* было 32px */
}

.statCardTitle {
  font-size: 11px; /* было 13px */
}

.statCardChange {
  font-size: 11px; /* было 13px */
}

.tab {
  font-size: 12px; /* было 14px */
}

.quickAmountsSection h3 {
  font-size: 16px; /* было 18px */
}

.quickAmountLabel {
  font-size: 16px; /* было 18px */
}

.quickAmountSub {
  font-size: 11px; /* было 13px */
}

.quickAmountCalc {
  font-size: 10px; /* было 12px */
}

.formSection h3 {
  font-size: 16px; /* было 18px */
}

.inputGroup label {
  font-size: 12px; /* было 14px */
}

.amountInput input {
  font-size: 14px; /* было 16px */
}

.rechargeButton {
  font-size: 14px; /* было 16px */
}

.message {
  font-size: 12px; /* было 14px */
}

.infoBlock h4 {
  font-size: 12px; /* было 14px */
}

.infoBlock p {
  font-size: 11px; /* было 13px */
}

/* ЦВЕТА - унификация */
.balanceAmount.medium,
.balanceAmount.low {
  color: #7C3AED; /* было #7C4DFF */
}

.message.info {
  color: #7C3AED; /* было #7C4DFF */
}

.infoIcon {
  color: #7C3AED; /* было #0066cc */
}

/* ФОН - унификация */
.balancePage {
  background: #ffffff; /* было #fafbfc */
}
```

### 5. frontend/styles/layout/Header.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.pageTitle {
  font-size: 16px; /* было 18px */
}

.breadcrumbLink {
  font-size: 10px; /* было 12px */
}

.breadcrumbCurrent {
  font-size: 10px; /* было 12px */
}

.balanceButton {
  font-size: 12px; /* было 14px */
}

.balanceAmount {
  font-size: 12px; /* было 14px */
}

/* ЦВЕТА - унификация */
.hamburgerButton:hover {
  background: rgba(124, 58, 237, 0.05); /* было rgba(124, 77, 255, 0.05) */
  border-color: rgba(124, 58, 237, 0.2); /* было rgba(124, 77, 255, 0.2) */
  color: #7C3AED; /* было #7C4DFF */
}

.breadcrumbLink:hover {
  color: #7C3AED; /* было #7C4DFF */
}

.notificationButton:hover {
  background: rgba(124, 58, 237, 0.05); /* было rgba(124, 77, 255, 0.05) */
  border-color: rgba(124, 58, 237, 0.2); /* было rgba(124, 77, 255, 0.2) */
  color: #7C3AED; /* было #7C4DFF */
}

.balanceButton.good {
  background: rgba(124, 58, 237, 0.08); /* было rgba(124, 77, 255, 0.08) */
  color: #7C3AED; /* было #7C4DFF */
  border-color: rgba(124, 58, 237, 0.2); /* было rgba(124, 77, 255, 0.2) */
}

.balanceButton.good:hover {
  background: rgba(124, 58, 237, 0.12); /* было rgba(124, 77, 255, 0.12) */
  border-color: rgba(124, 58, 237, 0.3); /* было rgba(124, 77, 255, 0.3) */
}

.profileButton {
  background: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%); /* было #7c4dff */
  border: 1px solid rgba(124, 58, 237, 0.2); /* было rgba(124, 77, 255, 0.2) */
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15); /* было rgba(124, 77, 255, 0.15) */
}

.profileButton:hover {
  background: linear-gradient(135deg, #7C3AED 0%, #5b47c2 100%); /* было #7c4dff */
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25); /* было rgba(124, 77, 255, 0.25) */
}
```

### 6. frontend/styles/components/HandoffQueue.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.queueHeader h3 {
  font-size: 16px; /* было 18px */
}

.queueDescription {
  font-size: 12px; /* было 14px */
}

.dialogInfo h4 {
  font-size: 13px; /* было 15px */
}

.dialogMeta {
  font-size: 11px; /* было 13px */
}

.reason {
  font-size: 10px; /* было 12px */
}

.lastMessage {
  font-size: 11px; /* было 13px */
}

.takeButton {
  font-size: 12px; /* было 14px */
}

.cancelButton {
  font-size: 12px; /* было 14px */
}

.activeIndicator {
  font-size: 12px; /* было 14px */
}

.emptyState h3 {
  font-size: 16px; /* было 18px */
}

.emptyState p {
  font-size: 12px; /* было 14px */
}

/* ЦВЕТА - унификация */
.normalIcon {
  color: #7C3AED; /* было #7c3aed (правильный, но для консистентности) */
}

.takeButton {
  background: linear-gradient(to right, #7C3AED, #8B5CF6, #6366F1); /* было #7c3aed */
}

.takeButton:hover:not(:disabled) {
  background: linear-gradient(to right, #6D28D9, #7C3AED, #5B21B6); /* было #6d28d9, #7c3aed, #5b21b6 */
}

.activeIndicator {
  color: #7C3AED; /* было #7c3aed */
}
```

### 7. frontend/styles/components/BalanceDropdown.module.css

```css
/* ШРИФТЫ - уменьшить на 2px */
.balanceLabel {
  font-size: 14px; /* было 16px */
}

.balanceAmount {
  font-size: 26px; /* было 28px */
}

.balanceWarning,
.balanceInfo,
.balanceSuccess {
  font-size: 11px; /* было 13px */
}

.topUpButton {
  font-size: 14px; /* было 16px */
}

.link {
  font-size: 12px; /* было 14px */
}

/* ЦВЕТА - унификация */
.balanceAmount.medium,
.balanceAmount.low {
  color: #7C3AED; /* оставить как есть, уже правильный */
}

.topUpButton {
  background: linear-gradient(135deg, #7C3AED 0%, #6A3AE3 100%); /* унификация градиента */
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25); /* было rgba(124, 77, 255, 0.25) */
}

.topUpButton:hover {
  background: linear-gradient(135deg, #6A3AE3 0%, #5B2BC7 100%); /* унификация градиента */
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35); /* было rgba(124, 77, 255, 0.35) */
}
```

---

## 🎨 Создание глобальных CSS переменных

### Создать файл: frontend/styles/design-tokens.css

```css
/**
 * ReplyX Design Tokens
 * Унифицированные токены дизайна для всего приложения
 */

:root {
  /* Основная цветовая палитра */
  --replyx-primary: #7C3AED;
  --replyx-primary-gradient: #8B5CF6;
  --replyx-primary-hover: #6D28D9;
  --replyx-primary-50: #F3E8FF;
  
  /* Семантические цвета */
  --replyx-success: #10B981;
  --replyx-danger: #EF4444;
  --replyx-warning: #F59E0B;
  --replyx-info: #0EA5E9;
  
  /* Фоны и поверхности */
  --replyx-bg: #FFFFFF;
  --replyx-bg-soft: #F8FAFC;
  --replyx-bg-muted: #F1F5F9;
  
  /* Границы */
  --replyx-border: #E5E7EB;
  --replyx-border-light: #F3F4F6;
  --replyx-border-dark: #D1D5DB;
  
  /* Текст */
  --replyx-text-strong: #111827;
  --replyx-text: #374151;
  --replyx-text-muted: #6B7280;
  --replyx-text-light: #9CA3AF;
  
  /* Радиусы */
  --replyx-radius-sm: 0.5rem;    /* 8px */
  --replyx-radius-base: 0.75rem; /* 12px */
  --replyx-radius-lg: 1rem;      /* 16px */
  
  /* Тени */
  --replyx-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --replyx-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --replyx-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  /* Типографика (уменьшены на 2px) */
  --replyx-font-xs: 10px;   /* было 12px */
  --replyx-font-sm: 12px;   /* было 14px */
  --replyx-font-base: 14px; /* было 16px */
  --replyx-font-lg: 16px;   /* было 18px */
  --replyx-font-xl: 18px;   /* было 20px */
  --replyx-font-2xl: 22px;  /* было 24px */
  --replyx-font-3xl: 26px;  /* было 28px */
  --replyx-font-4xl: 30px;  /* было 32px */
  --replyx-font-5xl: 34px;  /* было 36px */
  --replyx-font-6xl: 40px;  /* было 42px */
  
  /* Отступы и интервалы */
  --replyx-space-1: 0.25rem;  /* 4px */
  --replyx-space-2: 0.5rem;   /* 8px */
  --replyx-space-3: 0.75rem;  /* 12px */
  --replyx-space-4: 1rem;     /* 16px */
  --replyx-space-5: 1.25rem;  /* 20px */
  --replyx-space-6: 1.5rem;   /* 24px */
  --replyx-space-8: 2rem;     /* 32px */
  --replyx-space-10: 2.5rem;  /* 40px */
  --replyx-space-12: 3rem;    /* 48px */
  --replyx-space-16: 4rem;    /* 64px */
}

/* Темная тема (если потребуется) */
@media (prefers-color-scheme: dark) {
  :root {
    --replyx-bg: #1F2937;
    --replyx-bg-soft: #374151;
    --replyx-text-strong: #F9FAFB;
    --replyx-text: #E5E7EB;
    --replyx-text-muted: #9CA3AF;
    --replyx-border: #4B5563;
  }
}
```

### Обновить frontend/styles/globals.css

```css
/* Импорт дизайн-токенов */
@import './design-tokens.css';

/* Остальные глобальные стили... */
```

---

## 🚀 План выполнения

### Приоритет файлов для изменения:

1. **Высокий приоритет**:
   - `frontend/styles/design-tokens.css` (создать)
   - `frontend/styles/globals.css` (обновить импорт)
   - `frontend/styles/pages/Dashboard.module.css`
   - `frontend/styles/layout/Sidebar.module.css`
   - `frontend/styles/layout/Header.module.css`

2. **Средний приоритет**:
   - `frontend/styles/pages/Dialogs.module.css`
   - `frontend/styles/pages/Balance.module.css`

3. **Низкий приоритет**:
   - `frontend/styles/components/HandoffQueue.module.css`
   - `frontend/styles/components/BalanceDropdown.module.css`

### Шаги выполнения:

1. **Создать дизайн-токены**
2. **Обновить каждый файл согласно спецификации**
3. **Проверить визуальную консистентность**
4. **Протестировать на разных размерах экрана**

---

## ✅ Критерии приемки

### Обязательные изменения:
- ✅ Все font-size уменьшены ровно на 2px
- ✅ Все фиолетовые цвета используют #7C3AED
- ✅ Все градиенты используют консистентные цвета
- ✅ Все радиусы используют 0.75rem
- ✅ Фон везде чистый белый #FFFFFF
- ✅ Созданы CSS переменные в design-tokens.css

### Проверки качества:
- ✅ Читаемость текста не нарушена
- ✅ Responsive поведение сохранено
- ✅ Hover эффекты работают корректно
- ✅ Accessibility не пострадала
- ✅ Visual regression testing пройден

---

**ВАЖНО:** Все изменения должны быть применены точно в соответствии со спецификацией. Никаких дополнительных изменений без согласования!