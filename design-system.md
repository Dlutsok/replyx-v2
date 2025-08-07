# Design System - ChatAI

## 📋 Содержание
1. [Основные принципы](#основные-принципы)
2. [Цветовая палитра](#цветовая-палитра)
3. [Типографика](#типографика)
4. [Spacing & Layout](#spacing--layout)
5. [Компоненты](#компоненты)
6. [Анимации](#анимации)
7. [Примеры использования](#примеры-использования)

---

## Основные принципы

### Философия дизайна
- **Минимализм**: Чистый и современный интерфейс без лишних элементов
- **Консистентность**: Единообразие во всех частях приложения
- **Доступность**: Поддержка темной/светлой темы, читаемые шрифты
- **Отзывчивость**: Адаптивность под все устройства
- **Производительность**: Легкие компоненты, оптимизированные анимации

---

## Цветовая палитра

### Основные цвета

```css
:root {
  /* Primary Colors */
  --primary-50: #e6f3ff;
  --primary-100: #b3daff;
  --primary-200: #80c1ff;
  --primary-300: #4da8ff;
  --primary-400: #1a8fff;
  --primary-500: #0076e6;  /* Main Primary */
  --primary-600: #005db3;
  --primary-700: #004480;
  --primary-800: #002b4d;
  --primary-900: #00121a;

  /* Secondary Colors */
  --secondary-50: #f0f9ff;
  --secondary-100: #e0f2fe;
  --secondary-200: #bae6fd;
  --secondary-300: #7dd3fc;
  --secondary-400: #38bdf8;
  --secondary-500: #0ea5e9;  /* Main Secondary */
  --secondary-600: #0284c7;
  --secondary-700: #0369a1;
  --secondary-800: #075985;
  --secondary-900: #0c4a6e;

  /* Accent Colors */
  --accent-purple: #8b5cf6;
  --accent-pink: #ec4899;
  --accent-orange: #f97316;
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;

  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Semantic Colors */
  --success: #10b981;
  --success-light: #d1fae5;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #3b82f6;
  --info-light: #dbeafe;
}

/* Dark Theme */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --bg-elevated: #475569;
  
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --text-muted: #64748b;
  
  --border-default: #334155;
  --border-hover: #475569;
  --border-focus: #0ea5e9;
}

/* Light Theme */
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-elevated: #ffffff;
  
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  
  --border-default: #e2e8f0;
  --border-hover: #cbd5e1;
  --border-focus: #0ea5e9;
}
```

---

## Типографика

### Шрифты

```css
:root {
  /* Font Families */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  /* Font Weights */
  --font-thin: 100;
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}
```

### Типографические стили

```css
/* Headings */
.heading-1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
}

.heading-2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

.heading-3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.heading-4 {
  font-size: var(--text-xl);
  font-weight: var(--font-medium);
  line-height: var(--leading-snug);
}

/* Body Text */
.body-large {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.body-base {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

.body-small {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* Labels & Captions */
.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.caption {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-tertiary);
}
```

---

## Spacing & Layout

### Spacing System

```css
:root {
  /* Spacing Scale */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.125rem;  /* 2px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-3xl: 1.5rem;   /* 24px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

### Grid System

```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 640px) {
  .container { max-width: 640px; }
}

@media (min-width: 768px) {
  .container { max-width: 768px; }
}

@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}

@media (min-width: 1536px) {
  .container { max-width: 1536px; }
}
```

---

## Компоненты

### Button Component

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
  outline: none;
  position: relative;
  white-space: nowrap;
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.btn-md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

.btn-lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
}

/* Button Variants */
.btn-primary {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover {
  background: var(--primary-600);
  border-color: var(--primary-600);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-danger {
  background: var(--error);
  color: white;
  border-color: var(--error);
}

.btn-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* Button States */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px var(--primary-200);
}
```

### Card Component

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.card-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.card-body {
  color: var(--text-secondary);
}

.card-footer {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-default);
}
```

### Input Component

```css
.input-group {
  margin-bottom: var(--space-4);
}

.input-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-base);
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  outline: none;
}

.input:hover {
  border-color: var(--border-hover);
}

.input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.input-error {
  border-color: var(--error);
}

.input-error:focus {
  box-shadow: 0 0 0 3px var(--error-light);
}

.input-helper {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.input-error-message {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--error);
}
```

### Modal Component

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
  animation: fadeIn 0.2s ease;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-elevated);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-2xl);
  z-index: var(--z-modal);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  animation: slideUp 0.3s ease;
}

.modal-sm { width: 400px; }
.modal-md { width: 600px; }
.modal-lg { width: 800px; }
.modal-xl { width: 1200px; }

.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-default);
}

.modal-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-6);
}

.modal-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--border-default);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

### Badge Component

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.badge-primary {
  background: var(--primary-100);
  color: var(--primary-700);
}

.badge-success {
  background: var(--success-light);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-light);
  color: var(--warning);
}

.badge-error {
  background: var(--error-light);
  color: var(--error);
}

.badge-info {
  background: var(--info-light);
  color: var(--info);
}
```

---

## Анимации

```css
/* Keyframes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Transition Classes */
.transition-all { transition: all 0.2s ease; }
.transition-colors { transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease; }
.transition-opacity { transition: opacity 0.2s ease; }
.transition-transform { transition: transform 0.2s ease; }

/* Animation Classes */
.animate-spin { animation: spin 1s linear infinite; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-fadeIn { animation: fadeIn 0.3s ease; }
.animate-slideDown { animation: slideDown 0.3s ease; }
```

---

## Примеры использования

### Пример страницы логина

```html
<!DOCTYPE html>
<html lang="ru" data-theme="light">
<head>
  <meta charset="UTF-8">
  <title>Login - ChatAI</title>
  <link rel="stylesheet" href="design-system.css">
</head>
<body>
  <div class="container">
    <div class="card" style="max-width: 400px; margin: 100px auto;">
      <div class="card-header">
        <h1 class="card-title">Вход в систему</h1>
      </div>
      
      <div class="card-body">
        <form>
          <div class="input-group">
            <label class="input-label" for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              class="input" 
              placeholder="example@mail.com"
            >
          </div>
          
          <div class="input-group">
            <label class="input-label" for="password">Пароль</label>
            <input 
              type="password" 
              id="password" 
              class="input" 
              placeholder="••••••••"
            >
            <span class="input-helper">
              Минимум 8 символов
            </span>
          </div>
          
          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: var(--space-4);">
            Войти
          </button>
          
          <button type="button" class="btn btn-ghost btn-md" style="width: 100%; margin-top: var(--space-2);">
            Забыли пароль?
          </button>
        </form>
      </div>
      
      <div class="card-footer" style="text-align: center;">
        <span class="caption">Нет аккаунта?</span>
        <a href="#" style="color: var(--primary-500); text-decoration: none;">
          Зарегистрироваться
        </a>
      </div>
    </div>
  </div>
</body>
</html>
```

### Пример карточки чата

```html
<div class="card">
  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h3 class="heading-4">Чат с клиентом</h3>
      <span class="caption">Последнее сообщение 5 минут назад</span>
    </div>
    <span class="badge badge-success">Активен</span>
  </div>
  
  <div class="card-body">
    <div class="message-list">
      <!-- Сообщения -->
    </div>
  </div>
  
  <div class="card-footer">
    <div style="display: flex; gap: var(--space-2);">
      <input type="text" class="input" placeholder="Введите сообщение...">
      <button class="btn btn-primary">
        <svg><!-- Icon --></svg>
        Отправить
      </button>
    </div>
  </div>
</div>
```

### Пример модального окна

```html
<div class="modal-backdrop"></div>
<div class="modal modal-md">
  <div class="modal-header">
    <h2 class="modal-title">Подтверждение действия</h2>
  </div>
  
  <div class="modal-body">
    <p class="body-base">
      Вы уверены, что хотите удалить этот элемент? 
      Это действие нельзя отменить.
    </p>
  </div>
  
  <div class="modal-footer">
    <button class="btn btn-secondary">Отмена</button>
    <button class="btn btn-danger">Удалить</button>
  </div>
</div>
```

---

## Использование в React/Next.js

### Создание компонента Button

```jsx
// components/ui/Button.jsx
import styles from './Button.module.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  onClick,
  ...props 
}) => {
  const classNames = [
    styles.btn,
    styles[`btn-${variant}`],
    styles[`btn-${size}`]
  ].join(' ');

  return (
    <button 
      className={classNames}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
```

### Создание ThemeProvider

```jsx
// components/ThemeProvider.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## Интеграция с существующим проектом

### 1. Создайте файл с CSS переменными

```css
/* styles/design-tokens.css */
@import './design-system.css';
```

### 2. Импортируйте в главный файл стилей

```css
/* styles/globals.css */
@import './design-tokens.css';

/* Ваши существующие стили */
```

### 3. Используйте переменные в компонентах

```css
/* components/MyComponent.module.css */
.myComponent {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

---

## Чеклист внедрения

- [ ] Создать файл с дизайн-токенами
- [ ] Настроить CSS переменные для цветов
- [ ] Добавить типографические стили
- [ ] Создать базовые компоненты (Button, Card, Input, Modal)
- [ ] Настроить систему тем (светлая/темная)
- [ ] Создать документацию компонентов
- [ ] Провести аудит существующих стилей
- [ ] Мигрировать старые компоненты на новую систему
- [ ] Настроить Storybook для демонстрации компонентов
- [ ] Создать гайдлайны для команды

---

## Ресурсы и инструменты

### Полезные инструменты
- **Figma**: Для создания дизайн-макетов
- **Storybook**: Для документации компонентов
- **PostCSS**: Для обработки CSS
- **CSS Modules**: Для изоляции стилей
- **Tailwind CSS**: Альтернативная утилитарная система

### Полезные ссылки
- [Material Design Guidelines](https://material.io/design)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Контакты для вопросов

По вопросам дизайн-системы обращайтесь к команде разработки.

---

*Последнее обновление: [Дата]*
*Версия: 1.0.0*
