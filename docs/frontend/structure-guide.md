# Frontend Structure Guide

## Обзор

Фронтенд ReplyX использует современную архитектуру с чистой организацией компонентов и удобными импортами. Структура построена по принципам модульности, переиспользования и масштабируемости.

## Архитектура

### Технологический стек
- **Framework**: Next.js 13.5+ (Pages Router)
- **Language**: JavaScript + TypeScript (частично)
- **Styling**: Tailwind CSS + CSS Modules
- **UI Framework**: React 18.2.0
- **Animations**: Framer Motion
- **Icons**: React Icons (Feather Icons)

### Дизайн-система
- **Тема**: Светлая
- **Акцент**: Фиолетовый (#7C3AED, #8B5CF6)
- **Радиусы**: `rounded-xl` (12px)
- **Тени**: Мягкие (`shadow-sm`, `shadow-md`)
- **Анимации**: Быстрые (200-300ms)

## Структура проекта

```
/frontend
├── components/           # Все компоненты с barrel файлами
│   ├── common/          # Переиспользуемые UI компоненты
│   │   ├── Button.js
│   │   ├── LoadingSpinner.js
│   │   ├── CookieConsent.js
│   │   └── index.ts     # Barrel файл
│   ├── ui/              # Специализированные UI элементы
│   │   ├── modals, dropdowns, notifications
│   │   └── index.ts
│   ├── layout/          # Компоненты разметки
│   │   ├── Header.js, Sidebar.js, DashboardLayout.js
│   │   └── index.ts
│   ├── dashboard/       # Виджеты дашборда
│   │   ├── ActiveDialogs.js, BalanceWidget.js
│   │   └── index.ts
│   ├── dialogs/         # Управление диалогами
│   │   ├── DialogModal.js, ChatWidgetCard.js
│   │   └── index.ts
│   ├── landing/         # Секции лендинга
│   │   ├── HeroSection.js, PricingSection.js
│   │   └── index.ts
│   ├── wizards/         # Мастера настройки
│   │   ├── BotCreationWizard.js, OnboardingWizard.js
│   │   └── index.ts
│   ├── ai-assistant/    # AI ассистент
│   │   └── index.ts
│   ├── help/           # Справочная система
│   │   └── index.ts
│   ├── security/       # Компоненты безопасности
│   │   └── index.ts
│   └── index.ts        # Главный barrel файл
├── hooks/              # React хуки
│   ├── useAuth.js, useDashboardData.js
│   └── index.ts        # Barrel файл
├── utils/              # Утилиты и helpers
│   ├── validation.js, apiErrorHandler.js
│   └── index.ts
├── config/             # Конфигурация
│   ├── api.js
│   └── index.ts
├── constants/          # Константы
│   ├── designSystem.js, dialogStatus.js
│   └── index.ts
├── styles/             # CSS модули и глобальные стили
│   ├── components/     # Стили компонентов
│   ├── layout/        # Стили разметки
│   ├── pages/         # Стили страниц
│   └── globals.css    # Глобальные стили
└── pages/             # Next.js страницы
    ├── _app.tsx       # App wrapper
    ├── _document.tsx  # Document wrapper
    ├── index.js       # Главная (лендинг)
    ├── dashboard.js   # Дашборд
    └── api/          # API routes
```

## Система импортов

### Алиасы путей
Настроены в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/hooks/*": ["hooks/*"],
      "@/utils/*": ["utils/*"],
      "@/config/*": ["config/*"],
      "@/constants/*": ["constants/*"],
      "@/styles/*": ["styles/*"]
    }
  }
}
```

### Barrel файлы
Каждая группа компонентов имеет свой `index.ts` для удобных импортов:

```typescript
// components/common/index.ts
export { default as Button } from './Button';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as CookieConsent } from './CookieConsent';
// ... etc
```

### Примеры использования

```javascript
// ❌ Плохо - относительные импорты
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

// ✅ Хорошо - алиасы и barrel файлы
import { Button, LoadingSpinner } from '@/components/common';

// ✅ Альтернативно - главный barrel
import { Button, LoadingSpinner } from '@/components';
```

## Работа с компонентами

### Добавление нового компонента

1. **Определите категорию** (common, ui, dashboard и т.д.)
2. **Создайте компонент** в соответствующей папке
3. **Добавьте экспорт** в `index.ts` группы
4. **При необходимости** добавьте CSS модуль в `styles/components/`

Пример:
```javascript
// components/ui/NewModal.js
import { motion } from 'framer-motion';

const NewModal = ({ isOpen, onClose, children }) => {
  return (
    <motion.div className="fixed inset-0 z-50 bg-black/50">
      {/* modal content */}
    </motion.div>
  );
};

export default NewModal;
```

```typescript
// components/ui/index.ts
export { default as NewModal } from './NewModal';
// ... другие экспорты
```

### Стилизация компонентов

Используется гибридный подход:

1. **Tailwind CSS** - для большинства стилей
2. **CSS Modules** - для сложных компонентов (анимации, состояния)

```javascript
// Пример с Tailwind
const Button = ({ variant = 'primary', children, ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-xl font-medium transition-all duration-200';
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Лучшие практики

### Именование файлов
- **Компоненты**: PascalCase (`UserProfile.js`)
- **Хуки**: camelCase с префиксом `use` (`useAuth.js`)
- **Утилиты**: camelCase (`apiErrorHandler.js`)
- **Константы**: camelCase (`designSystem.js`)

### Организация компонентов
- **Один компонент = один файл**
- **Сопутствующие файлы рядом** (CSS модуль в той же папке)
- **Barrel файлы** для удобных импортов
- **Группировка по функциональности**, не по типу

### Стилизация
- **Приоритет Tailwind CSS** для новых компонентов
- **CSS Modules** только для сложных случаев
- **Единые дизайн-токены** через `constants/designSystem.js`
- **Responsive design** через Tailwind breakpoints

### TypeScript миграция
При переводе компонентов в TypeScript:

1. Переименуйте файл `.js` → `.tsx`
2. Добавьте типы для props
3. Обновите экспорт в barrel файле
4. Проверьте сборку `npm run build`

```typescript
// До
const Button = ({ variant, children, onClick }) => { ... };

// После
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, onClick }) => { ... };
```

## Команды разработки

```bash
# Запуск dev сервера
npm run dev

# Сборка проекта
npm run build

# Запуск prod сервера
npm start

# Проверка TypeScript
npx tsc --noEmit
```

## Миграционный план

### Фаза 1: TypeScript конверсия
- [ ] Перевод критических компонентов в `.tsx`
- [ ] Добавление базовых типов
- [ ] Настройка строгого режима TypeScript

### Фаза 2: Стилизация
- [ ] Консолидация дизайн-токенов в Tailwind config
- [ ] Постепенный отказ от CSS Modules
- [ ] Унификация компонентов под единый стиль

### Фаза 3: App Router
- [ ] Миграция с Pages Router на App Router
- [ ] Реструктуризация API routes
- [ ] Добавление middleware

## Troubleshooting

### Распространенные проблемы

**Импорты не работают**
- Проверьте настройки алиасов в `tsconfig.json`
- Убедитесь что barrel файлы обновлены
- Перезапустите dev сервер

**CSS не применяется**
- Проверьте правильность CSS модулей
- Убедитесь что Tailwind классы корректны
- Проверьте `tailwind.config.js`

**TypeScript ошибки**
- Добавьте необходимые типы для props
- Проверьте импорты типов из библиотек
- Используйте `npx tsc --noEmit` для проверки

---

*Документ обновлен: 2025-08-22*  
*Версия структуры: 2.0*