import React from 'react';

/**
 * Универсальный компонент загрузки
 * @param {string} size - размер спиннера: 'sm', 'md', 'lg'
 * @param {string} variant - вариант отображения: 'spinner', 'dots', 'pulse'
 * @param {string} text - текст загрузки
 * @param {boolean} overlay - показать как оверлей
 * @param {string} className - дополнительные CSS классы
 */
const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'spinner', 
  text = '', 
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const SpinnerComponent = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`${sizeClasses[size]} rounded-full animate-pulse`} style={{ backgroundColor: '#7C3AED', animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} rounded-full animate-pulse`} style={{ backgroundColor: '#7C3AED', animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} rounded-full animate-pulse`} style={{ backgroundColor: '#7C3AED', animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} rounded-full animate-pulse ${className}`} style={{ backgroundColor: '#7C3AED' }}></div>
        );
      
      case 'spinner':
      default:
        return (
          <div 
            className={`${sizeClasses[size]} border-2 border-gray-200 rounded-full animate-spin ${className}`}
            style={{ borderTopColor: '#7C3AED' }}
          ></div>
        );
    }
  };

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center space-y-3">
      <SpinnerComponent />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <LoadingContent />
        </div>
      </div>
    );
  }

  return <LoadingContent />;
};

/**
 * Компонент скелетона для плейсхолдеров
 */
export const SkeletonLoader = ({ lines = 3, height = 'h-4', className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className={`${height} bg-gray-200 rounded skeleton`}
          style={{ 
            width: index === lines - 1 ? '75%' : '100%' 
          }}
        ></div>
      ))}
    </div>
  );
};

/**
 * Компонент кнопки с загрузкой
 */
export const LoadingButton = ({ 
  loading = false, 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900", 
    outline: "border text-white hover:bg-gray-50"
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm", 
    lg: "px-6 py-3 text-base"
  };

  const buttonStyle = variant === 'primary' ? { backgroundColor: '#7C3AED' } : {};
  const hoverHandlers = variant === 'primary' ? {
    onMouseEnter: (e) => e.target.style.backgroundColor = '#6C2BD9',
    onMouseLeave: (e) => e.target.style.backgroundColor = '#7C3AED'
  } : {};

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled || loading}
      {...hoverHandlers}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
      )}
      {children}
    </button>
  );
};

/**
 * Компонент полноэкранной загрузки
 */
export const PageLoader = ({ text = "Загрузка..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-gray-600">{text}</p>
    </div>
  </div>
);

/**
 * Компонент загрузки для карточек
 */
export const CardLoader = ({ className = '' }) => (
  <div className={`bg-white rounded-lg p-6 border ${className}`}>
    <div className="space-y-4">
      <SkeletonLoader lines={1} height="h-6" />
      <SkeletonLoader lines={2} height="h-4" />
      <div className="flex space-x-3">
        <div className="w-20 h-8 bg-gray-200 rounded skeleton"></div>
        <div className="w-16 h-8 bg-gray-200 rounded skeleton"></div>
      </div>
    </div>
  </div>
);

export default LoadingSpinner;