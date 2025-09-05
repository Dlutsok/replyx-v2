import React from 'react';

/**
 * LoadingComponents - Набор оптимизированных компонентов для отображения состояний загрузки
 * Использует React.memo для предотвращения лишних перерисовок
 */

// Универсальный скелетон загрузки
export const Skeleton = React.memo(({ className = '', variant = 'default' }) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  const variants = {
    default: '',
    text: 'h-4',
    title: 'h-6',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-20',
    card: 'h-32',
    metric: 'h-20'
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
});

// Скелетон для карточки метрики
export const MetricCardSkeleton = React.memo(() => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div className="animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton variant="avatar" className="w-10 h-10" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
));

// Скелетон для виджета
export const WidgetSkeleton = React.memo(({ height = 'h-[300px]' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${height} flex flex-col`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton variant="button" />
      </div>
      <div className="space-y-3 flex-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-16 w-full mt-auto" />
      </div>
    </div>
  </div>
));

// Скелетон для всего дашборда
export const DashboardSkeleton = React.memo(() => (
  <div className="space-y-6">
    {/* Скелетон заголовка */}
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="animate-pulse flex items-center space-x-4">
        <Skeleton variant="avatar" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>

    {/* Скелетон метрик */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>

    {/* Скелетон виджетов */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <WidgetSkeleton />
      <WidgetSkeleton />
    </div>

    {/* Скелетон диалогов */}
    <WidgetSkeleton height="h-[400px]" />
  </div>
));

// Компонент прогресс-бара
export const ProgressBar = React.memo(({
  progress,
  className = '',
  color = 'bg-[#7C3AED]',
  showPercentage = true
}) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className={`h-2 rounded-full transition-all duration-300 ${color}`}
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
    {showPercentage && (
      <div className="text-xs text-gray-600 mt-1 text-right">
        {Math.round(progress)}%
      </div>
    )}
  </div>
));

// Компонент индикатора загрузки с текстом
export const LoadingIndicator = React.memo(({
  message = 'Загрузка...',
  size = 'medium',
  className = ''
}) => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizes[size]} border-2 border-gray-300 rounded-full animate-spin`} style={{ borderTopColor: '#7C3AED' }} />
      <span className="text-gray-600">{message}</span>
    </div>
  );
});

// Компонент overlay загрузки
export const LoadingOverlay = React.memo(({
  isLoading,
  message = 'Загрузка...',
  children
}) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
        <LoadingIndicator message={message} />
      </div>
    )}
  </div>
));

// Добавляем displayName для лучшей отладки
Skeleton.displayName = 'Skeleton';
MetricCardSkeleton.displayName = 'MetricCardSkeleton';
WidgetSkeleton.displayName = 'WidgetSkeleton';
DashboardSkeleton.displayName = 'DashboardSkeleton';
ProgressBar.displayName = 'ProgressBar';
LoadingIndicator.displayName = 'LoadingIndicator';
LoadingOverlay.displayName = 'LoadingOverlay';

export default {
  Skeleton,
  MetricCardSkeleton,
  WidgetSkeleton,
  DashboardSkeleton,
  ProgressBar,
  LoadingIndicator,
  LoadingOverlay
};
