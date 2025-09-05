import React from 'react';
import { motion } from 'framer-motion';
import { DESIGN_TOKENS } from '@/constants';

/**
 * StandardCard - Универсальная карточка для контента
 * Соответствует дизайн-системе ChatAI MVP 11
 * Оптимизирована с React.memo для предотвращения лишних перерисовок
 */
const StandardCard = React.memo(({
  title,
  children,
  actions,
  loading = false,
  className = '',
  padding = 'default', // 'default' | 'large' | 'small'
  elevation = 'default', // 'default' | 'elevated' | 'flat'
  onClick,
  ...props
}) => {
  // Определение класса padding
  const paddingClass = {
    small: 'p-4',
    default: 'p-6',
    large: 'p-8'
  }[padding];

  // Определение базового класса карточки
  const baseCardClass = {
    default: DESIGN_TOKENS.cards.standard,
    elevated: DESIGN_TOKENS.cards.elevated,
    flat: DESIGN_TOKENS.cards.flat
  }[elevation];

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${baseCardClass} ${paddingClass} ${className}`}>
        <div className="animate-pulse space-y-4">
          {/* Skeleton заголовка */}
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
          
          {/* Skeleton контента */}
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          
          {/* Skeleton элементов */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {/* Заголовок и действия */}
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h3 className={DESIGN_TOKENS.typography.cardTitle}>
              {title}
            </h3>
          )}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Основной контент */}
      {children}
    </>
  );

  // Анимация карточки
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  };

  const hoverVariants = onClick ? {
    whileHover: { y: -2, transition: { duration: 0.2 } },
    whileTap: { scale: 0.98 }
  } : {};

  if (onClick) {
    return (
      <motion.button
        className={`${baseCardClass} ${paddingClass} text-left w-full ${className}`}
        onClick={onClick}
        {...cardVariants}
        {...hoverVariants}
        {...props}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      className={`${baseCardClass} ${paddingClass} ${className}`}
      {...cardVariants}
      {...props}
    >
      {content}
    </motion.div>
  );
});

// Добавляем displayName для лучшей отладки
StandardCard.displayName = 'StandardCard';

/**
 * EmptyState - Компонент для пустого состояния внутри карточек
 */
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = '' 
}) => (
  <div className={`text-center py-12 ${className}`}>
    {Icon && (
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    )}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {title}
    </h3>
    <p className="text-gray-600 mb-6">
      {description}
    </p>
    {action}
  </div>
);

/**
 * CardGrid - Компонент для сетки карточек
 */
export const CardGrid = ({ 
  children, 
  columns = 'auto', // 'auto' | '1' | '2' | '3' | '4'
  className = '' 
}) => {
  const gridClass = columns === 'auto' 
    ? DESIGN_TOKENS.grids.cardsGrid
    : `grid grid-cols-${columns} gap-6`;

  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
};

/**
 * CardList - Компонент для списка карточек (вертикально)
 */
export const CardList = ({ children, className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {children}
  </div>
);

export default StandardCard;