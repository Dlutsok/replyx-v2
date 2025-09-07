'use client';

import { motion } from 'framer-motion';
import { DESIGN_TOKENS, combineClasses } from '../../constants/designSystem';

const Button = ({ 
  variant = 'primary', 
  size = 'default', 
  children, 
  className = '',
  disabled = false,
  loading = false,
  icon,
  ...props 
}) => {
  // Базовые стили варианта
  const variantStyles = {
    primary: DESIGN_TOKENS.buttons.primary,
    secondary: DESIGN_TOKENS.buttons.secondary,
  };

  // Стили размера
  const sizeStyles = {
    small: DESIGN_TOKENS.buttons.small,
    default: 'px-6 py-2.5 text-base',
    large: DESIGN_TOKENS.buttons.large,
  };

  // Стили состояний
  const stateStyles = disabled 
    ? 'opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none'
    : '';

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <motion.button
      className={combineClasses(
        variant === 'primary' ? 'relative overflow-hidden new-button-effect' : '',
        variantStyles[variant],
        sizeStyles[size],
        stateStyles,
        'inline-flex items-center justify-center',
        'focus:outline-none focus:ring-4 focus:ring-purple-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        DESIGN_TOKENS.buttons.borderRadius,
        className
      )}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {variant === 'primary' && (
        <span className="absolute inset-0 z-0 hoverEffect">
          <div></div>
        </span>
      )}
      <span className={variant === 'primary' ? 'relative z-10 flex items-center' : 'flex items-center'}>
        {loading && <LoadingSpinner />}
        {icon && !loading && (
          <span className="mr-2 flex items-center">
            {icon}
          </span>
        )}
        {children}
      </span>
    </motion.button>
  );
};

export default Button;