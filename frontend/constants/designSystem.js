// ReplyX MVP 13 - Unified Design System
// Единые константы для Landing и Dashboard страниц

export const DESIGN_TOKENS = {
  // Отступы и spacing (обновлено под минималистичный дизайн)
  spacing: {
    // Landing страницы
    sectionPadding: 'pb-6',           // Стандартные отступы секций: убран верхний паддинг, низ 24px
    cardPadding: 'p-6',               // Отступы внутри карточек (24px)
    largePadding: 'p-8',              // Отступы крупных элементов (32px)
    containerPadding: 'px-4 sm:px-6 lg:px-8',
    maxWidth: 'max-w-1200 mx-auto',
    
    // Новые отступы для минималистичного дизайна
    modalPadding: 'p-6',              // 24px для модальных окон
    headerPadding: 'px-6',            // Горизонтальные отступы хедера
    sidebarWidth: 'w-16',             // 64px ширина sidebar
    buttonPadding: 'px-4 py-2',       // Стандартные отступы кнопок
    borderRadius: {
      small: 'rounded-lg',            // 8px
      medium: 'rounded-xl',           // 12px  
      large: 'rounded-2xl',          // 20px
    },
    
    // Dashboard страницы  
    dashboardContainer: 'px-4 sm:px-6 lg:px-8 py-6',
    dashboardMaxWidth: 'mx-auto',
    pageHeaderMb: 'mb-6',
    metricGridMb: 'mb-8',
    
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
    // Landing заголовки (усиленные размеры/контраст)
    h1: 'text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight',
    h2: 'text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight',
    h3: 'text-2xl sm:text-3xl font-bold text-gray-900',
    h4: 'text-xl font-semibold text-gray-900',
    
    // Dashboard заголовки
    pageTitle: 'text-2xl sm:text-3xl font-bold text-gray-900',
    pageSubtitle: 'text-lg text-gray-600 leading-relaxed',
    sectionTitle: 'text-xl sm:text-2xl font-semibold text-gray-900',
    cardTitle: 'text-lg font-semibold text-gray-900',
    
    // Подзаголовки и текст
    subtitle: 'text-base text-gray-600 leading-relaxed',
    largeSubtitle: 'text-lg text-gray-600 leading-relaxed',
    bodyText: 'text-sm text-gray-600',
    smallText: 'text-xs text-gray-500',
    
    // Специальные стили
    sectionSubtitle: 'text-lg text-gray-600 max-w-2xl',
    cardDescription: 'text-sm text-gray-600',
    metricValue: 'text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent',
    metricLabel: 'font-semibold text-gray-900',
  },

  // Цвета
  colors: {
    // Основная цветовая схема
    primary: 'text-purple-600',
    primaryBg: 'bg-[#7C3AED]',
    primaryHover: 'hover:bg-[#6C2BD9]',
    
    // Фоны
    background: 'bg-white',
    sectionBg: 'bg-white',
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
    xs: 'w-4 h-4',         // 16px - для мелких элементов
    small: 'w-5 h-5',      // 20px - стандартный размер
    medium: 'w-6 h-6',     // 24px - средний размер
    large: 'w-8 h-8',      // 32px - крупные иконки
    xl: 'w-10 h-10',       // 40px - очень крупные
    
    // Настройки
    strokeWidth: 2,
    thinStroke: 1.5,
    
    // Цвета
    primary: 'text-purple-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    error: 'text-red-500',
    warning: 'text-yellow-600',
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

  // Кнопки (минималистичный стиль)
  buttons: {
    primary: 'bg-[#7C3AED] hover:bg-[#6C2BD9] text-white px-6 py-2.5 font-medium transition-all duration-150 focus:outline-none h-11',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:border-purple-600 hover:text-purple-600 px-6 py-2.5 font-medium transition-all duration-150 h-11',
    headerButton: 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 px-4 py-2 font-medium transition-all duration-150 h-9',
    small: 'px-4 py-2 text-sm h-9',
    large: 'px-8 py-3 text-lg h-12',
    borderRadius: 'rounded-[0.9rem]', // 14.4px border-radius для всех кнопок
  },

  // Карточки (минималистичный стиль)
  cards: {
    // Landing страницы
    default: 'bg-white rounded-xl border border-gray-200 transition-all duration-150',
    elevated: 'bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-150',
    flat: 'bg-white rounded-xl border border-gray-200',
    
    // Dashboard карточки
    metric: 'bg-white rounded-xl border border-gray-200 p-6 transition-all duration-150',
    standard: 'bg-white rounded-xl border border-gray-200 transition-all duration-150',
    modal: 'bg-white rounded-xl border border-gray-200 shadow-sm',
    
    // Элементы интерфейса
    avatar: 'w-12 h-12 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center',
    iconContainer: 'w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600',
    
    // Специальные карточки
    dropdown: 'bg-white rounded-xl border border-gray-200 shadow-sm',
    sidebar: 'bg-[#f8f9fa] border-r border-gray-200',
  },

  // Грид системы для Dashboard
  grids: {
    metricsGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    cardsGrid: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    singleColumn: 'max-w-4xl mx-auto space-y-6',
    fullWidth: 'grid grid-cols-1 gap-6',
  },

  // Layout паттерны (обновленные под новый дизайн)
  layouts: {
    // Dashboard Layout
    mainContainer: 'ml-20 mt-10 p-5 bg-gray-50 min-h-screen',
    sidebar: 'fixed left-0 top-0 w-16 h-full bg-[#f8f9fa] border-r border-gray-200 z-101',
    header: 'fixed top-0 ml-21 left-0 right-0 h-14 bg-white border-b border-gray-200 z-100',
    
    // Компоненты
    pageHeader: 'flex items-center justify-between h-14',
    contextBar: 'mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200',
    collapseButton: 'absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full',
    
    // Модальные окна
    modalOverlay: 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-999999',
    modalContent: 'max-w-lg mx-auto bg-white rounded-xl shadow-sm',
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