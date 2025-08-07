// Design System для Landing страницы
// Единые константы для обеспечения консистентности

export const DESIGN_TOKENS = {
  // Отступы и spacing
  spacing: {
    sectionPadding: 'py-12',           // Стандартные отступы секций (48px)
    cardPadding: 'p-6',               // Отступы внутри карточек (24px)
    largePadding: 'p-8',              // Отступы крупных элементов (32px)
    containerPadding: 'px-4 sm:px-6 lg:px-8',
    maxWidth: 'max-w-7xl mx-auto',
    
    // Grid gaps
    gridGap: 'gap-6',                 // Стандартный gap для grid/flex (24px)
    smallGap: 'gap-4',                // Маленький gap (16px)
    largeGap: 'gap-8',                // Большой gap (32px)
    
    // Margins
    sectionMb: 'mb-8',                // Отступ под заголовками секций
    cardMb: 'mb-6',                   // Отступ под карточками
    textMb: 'mb-4',                   // Отступ под текстом
  },

  // Типографика
  typography: {
    // Заголовки
    h1: 'text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight',
    h2: 'text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight',
    h3: 'text-xl sm:text-2xl font-bold text-gray-900',
    h4: 'text-lg font-semibold text-gray-900',
    
    // Подзаголовки и текст
    subtitle: 'text-base text-gray-600 leading-relaxed',
    largeSubtitle: 'text-lg text-gray-600 leading-relaxed',
    bodyText: 'text-sm text-gray-600',
    smallText: 'text-xs text-gray-500',
    
    // Специальные стили
    sectionSubtitle: 'text-base text-gray-600 max-w-2xl mx-auto',
    cardTitle: 'text-lg font-semibold text-gray-900',
    cardDescription: 'text-sm text-gray-600',
  },

  // Цвета
  colors: {
    // Основная цветовая схема
    primary: 'text-purple-600',
    primaryBg: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-700',
    
    // Фоны
    background: 'bg-white',
    sectionBg: 'bg-gray-50',
    cardBg: 'bg-white',
    
    // Состояния
    success: 'text-green-600',
    successBg: 'bg-green-50',
    error: 'text-red-600',
    errorBg: 'bg-red-50',
    warning: 'text-yellow-600',
    warningBg: 'bg-yellow-50',
    
    // Текст
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-500',
  },

  // Иконки
  icons: {
    // Размеры
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    
    // Настройки
    strokeWidth: 2,
    
    // Цвета
    primary: 'text-purple-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    muted: 'text-gray-400',
  },

  // Анимации
  animation: {
    // Стандартные настройки для framer-motion
    default: {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-100px" },
      transition: { duration: 0.6, ease: "easeOut" }
    },
    
    // Анимация с задержкой
    withDelay: (delay) => ({
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-100px" },
      transition: { duration: 0.6, delay, ease: "easeOut" }
    }),
    
    // Быстрая анимация
    fast: {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-50px" },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    
    // Анимация слайда
    slideIn: {
      initial: { opacity: 0, x: -20 },
      whileInView: { opacity: 1, x: 0 },
      viewport: { once: true },
      transition: { duration: 0.5, ease: "easeOut" }
    }
  },

  // Кнопки
  buttons: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
    secondary: 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-600 hover:text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-md',
    small: 'px-6 py-3 text-base',
    large: 'px-10 py-5 text-xl',
  },

  // Карточки
  cards: {
    default: 'bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md hover:-translate-y-1',
    elevated: 'bg-white rounded-xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl hover:-translate-y-2',
    flat: 'bg-white rounded-xl border border-gray-200',
  },

  // Responsive breakpoints (для справки)
  breakpoints: {
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Хуки для удобного использования
export const useDesignTokens = () => DESIGN_TOKENS;

// Утилитарные функции
export const combineClasses = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const getAnimationWithDelay = (index, baseDelay = 0.1) => {
  return DESIGN_TOKENS.animation.withDelay(index * baseDelay);
};

// Компоненты-обертки для стандартизации
export const DesignComponents = {
  // Стандартная секция
  Section: ({ children, className = '', ...props }) => (
    <section 
      className={combineClasses(
        DESIGN_TOKENS.spacing.sectionPadding,
        DESIGN_TOKENS.colors.sectionBg,
        className
      )}
      {...props}
    >
      <div className={combineClasses(
        DESIGN_TOKENS.spacing.maxWidth,
        DESIGN_TOKENS.spacing.containerPadding
      )}>
        {children}
      </div>
    </section>
  ),

  // Стандартный заголовок секции
  SectionHeader: ({ title, subtitle, className = '' }) => (
    <div className={combineClasses('text-center', DESIGN_TOKENS.spacing.sectionMb, className)}>
      <h2 className={DESIGN_TOKENS.typography.h2}>
        {title}
      </h2>
      {subtitle && (
        <p className={combineClasses(DESIGN_TOKENS.typography.sectionSubtitle, 'mt-4')}>
          {subtitle}
        </p>
      )}
    </div>
  ),

  // Стандартная карточка
  Card: ({ children, className = '', elevated = false }) => (
    <div className={combineClasses(
      elevated ? DESIGN_TOKENS.cards.elevated : DESIGN_TOKENS.cards.default,
      DESIGN_TOKENS.spacing.cardPadding,
      className
    )}>
      {children}
    </div>
  )
};

export default DESIGN_TOKENS;