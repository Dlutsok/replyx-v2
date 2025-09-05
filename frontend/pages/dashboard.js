import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks';
import { OnboardingWizard } from '@/components/wizards';
import { PageHeader, MetricCard, StandardCard } from '@/components/common';
import { DashboardSkeleton, LoadingIndicator, WidgetSkeleton } from '@/components/common/LoadingComponents';
import { DESIGN_TOKENS } from '@/constants';
import OnboardingBanner from '@/components/dashboard/OnboardingBanner';

import dashStyles from '../styles/pages/Dashboard.module.css';
import {
  FiUser, FiShield, FiClock, FiGrid, FiEye, FiEyeOff, FiRefreshCw,
  FiTrendingUp, FiCheckCircle, FiStar,
  FiArrowUp, FiArrowDown, FiZap, FiChevronRight, FiTrendingDown, FiCreditCard, FiDollarSign
} from 'react-icons/fi';

// Ленивая загрузка виджетов для оптимизации производительности
const WeeklyStats = lazy(() => import('@/components/dashboard/WeeklyStats'));
const QuickActions = lazy(() => import('@/components/dashboard/QuickActions'));

import { useDashboardData, useSmartProgress } from '@/hooks';

// Удаляем компоненты связанные с пробным периодом и тарифами

// Компонент-обертка для ленивой загрузки виджетов
const LazyWidgetWrapper = React.memo(({ children, fallback }) => (
  <Suspense fallback={fallback || <WidgetSkeleton />}>
    {children}
  </Suspense>
));

// Добавляем displayName для лучшей отладки
LazyWidgetWrapper.displayName = 'LazyWidgetWrapper';


function WidgetToggleBar({ availableWidgets, hiddenWidgets, toggleWidget }) {
  return (
    <div className="flex flex-wrap gap-2">
      {availableWidgets.map(widget => (
        <button
          key={widget.id}
          onClick={() => toggleWidget(widget.id)}
          className={`flex items-center px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
            hiddenWidgets.has(widget.id)
              ? 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
              : 'bg-purple-600 text-white border border-purple-600 hover:bg-purple-700'
          }`}
        >
          {hiddenWidgets.has(widget.id) ? <FiEyeOff className="w-3 h-3 mr-1" /> : <FiEye className="w-3 h-3 mr-1" />}
          {widget.title}
        </button>
      ))}
    </div>
  );
}

function PeriodSelector({ period, onChange, customDate, onCustomDateChange }) {
  const periods = [
    { value: 'day', label: 'День' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'custom', label: 'Дата' }
  ];

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    onCustomDateChange(selectedDate);
    onChange('custom');
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className={dashStyles.periodSelector}>
      <span className={dashStyles.periodLabel}>Период:</span>
      <div className={dashStyles.periodControls}>
        <div className={dashStyles.periodButtons}>
          {periods.map(p => (
            <button
              key={p.value}
              className={`${dashStyles.periodButton} ${period === p.value ? dashStyles.active : ''}`}
              onClick={() => onChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <input
            type="date"
            value={customDate || getCurrentDate()}
            onChange={handleDateChange}
            className={dashStyles.dateInput}
            max={getCurrentDate()}
          />
        )}
      </div>
    </div>
  );
}

const Dashboard = React.memo(function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customDate, setCustomDate] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState(null);

  const [hiddenWidgets, setHiddenWidgets] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  const { user, logout } = useAuth();
  const { metrics, balance, bots, assistants, loading, error: dataError, refetch } = useDashboardData();
  const { isAllStepsCompleted } = useSmartProgress();

  // Мемоизация функций для предотвращения пересоздания
  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setCustomDate('');
    }
    refetch();
  }, [refetch]);

  const toggleWidget = useCallback((widgetId) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  }, []);

  // Мемоизация конфигурации виджетов
  const availableWidgets = useMemo(() => [
    { id: 'weeklyStats', title: 'Статистика недели', component: WeeklyStats },
    { id: 'quickActions', title: 'Быстрые действия', component: QuickActions }
  ], []);

  // Проверка статуса онбординга
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');

    fetch('/api/users/onboarding/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setOnboardingStatus(data);
        })
        .catch(err => {
          console.error('Error fetching onboarding status:', err);
        });
    }
  }, [user]);

  // Установка флага загрузки стилей после небольшой задержки
  useEffect(() => {
    const timer = setTimeout(() => {
      setStylesLoaded(true);
    }, 150); // Задержка для корректного применения CSS-модулей

    return () => clearTimeout(timer);
  }, []);

  const handleChangeBalance = useCallback(() => {
    window.location.href = '/balance';
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingStatus(null);
    refetch();
  }, [refetch]);

  const handleOnboardingSkip = useCallback(() => {
    const token = localStorage.getItem('token');

    fetch('/api/users/onboarding/skip', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(() => {
        setShowOnboarding(false);
        setOnboardingStatus(null);
      })
      .catch(err => {
        console.error('Error completing onboarding:', err);
      });
  }, []);

  const handleCreateAssistant = useCallback(() => {
    window.location.href = '/ai-assistant';
  }, []);

  const handleViewDialogs = useCallback(() => {
    // TODO: Показать активные диалоги
    console.log('Показать диалоги');
  }, []);

  const handleViewAnalytics = useCallback(() => {
    // TODO: Показать аналитику
    console.log('Показать аналитику');
  }, []);

  // Условные return должны быть после всех хуков
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator message="Загрузка профиля..." size="large" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={DESIGN_TOKENS.spacing.dashboardContainer}>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Личный кабинет - ReplyX</title>
        <meta name="description" content="Управление AI-ассистентами, диалогами и настройками аккаунта в ReplyX." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
        {/* Error Alert */}
      {error && (
        <div className={dashStyles.errorAlert}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Welcome Section - Dashboard Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
          {/* Левая часть - приветствие и информация */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <FiUser className="text-gray-600" size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:gap-2 mb-2">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight">
                    Добро пожаловать, {user?.first_name || user?.email}
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {assistants?.length > 0 ? 'Продолжить работу с ассистентами' : 'Создайте первого ассистента'}
                </p>
              </div>
            </div>

            {/* Единый виджет онбординга для всех пользователей */}
            {!isAllStepsCompleted() && (
              <div className="mt-4 sm:mt-5 md:mt-6">
                <OnboardingBanner
                  assistants={assistants}
                  onComplete={handleCreateAssistant}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Quick Metrics - Minimal Style */}
      {stylesLoaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon}>
              <FiDollarSign size={20} />
            </div>
            <div className={dashStyles.metricTitle}>Вы сэкономили</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={dashStyles.metricValue}>
              {loading ? '...' : `${((metrics?.messages_processed || 0) * 20).toLocaleString('ru-RU')}₽`}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <FiArrowUp className="text-emerald-600" size={12} />
              <span className="font-semibold text-emerald-600">
                +{metrics?.messages_processed || 0} ответов
              </span>
            </div>
          </div>
          <div className={dashStyles.metricSubtitle}>в этом месяце</div>
        </div>
        
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon}>
              <FiCheckCircle size={20} />
            </div>
            <div className={dashStyles.metricTitle}>Сообщений обработано</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={dashStyles.metricValue}>
              {loading ? '...' : (metrics?.messages_processed || 0)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {(metrics?.messages_trend || '+0%').startsWith('+') ? (
                <FiArrowUp className="text-emerald-600" size={12} />
              ) : (metrics?.messages_trend || '0%').startsWith('-') ? (
                <FiTrendingDown className="text-red-500" size={12} />
              ) : (
                <FiArrowUp className="text-gray-400" size={12} />
              )}
              <span className={`font-semibold ${
                (metrics?.messages_trend || '+0%').startsWith('+') ? 'text-emerald-600' :
                (metrics?.messages_trend || '0%').startsWith('-') ? 'text-red-500' : 'text-gray-400'
              }`}>
                {metrics?.messages_trend || '+0%'}
              </span>
            </div>
          </div>
          <div className={dashStyles.metricSubtitle}>в этом месяце</div>
        </div>

        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon}>
              <FiClock size={20} />
            </div>
            <div className={dashStyles.metricTitle}>Время ответа</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={dashStyles.metricValue}>
              {loading ? '...' : `${metrics?.avg_response_time || '0.8'}с`}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {(metrics?.response_time_trend || '0s').startsWith('-') ? (
                <FiTrendingDown className="text-emerald-600" size={12} />
              ) : (metrics?.response_time_trend || '0s').startsWith('+') ? (
                <FiArrowUp className="text-red-500" size={12} />
              ) : (
                <FiArrowUp className="text-gray-400" size={12} />
              )}
              <span className={`font-semibold ${
                (metrics?.response_time_trend || '0s').startsWith('-') ? 'text-emerald-600' :
                (metrics?.response_time_trend || '0s').startsWith('+') ? 'text-red-500' : 'text-gray-400'
              }`}>
                {metrics?.response_time_trend || '0s'}
              </span>
            </div>
          </div>
        </div>

        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon}>
              <FiCreditCard size={20} />
            </div>
            <div className={dashStyles.metricTitle}>Баланс</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={dashStyles.metricValue}>
              {loading ? '...' : `${(balance?.current || 0).toLocaleString('ru-RU')}₽`}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <FiArrowUp className="text-emerald-600" size={12} />
              <span className="text-emerald-600 font-semibold">
                {balance?.current > 1000 ? '+5%' : balance?.current > 500 ? '+2%' : '0%'}
              </span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Widgets Section - Minimal Layout */}
      <div className="space-y-4">
        {/* Top Row - Weekly Stats and Quick Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:gap-4">
          {!hiddenWidgets.has('weeklyStats') && (
            <LazyWidgetWrapper>
              <WeeklyStats
                metrics={metrics}
                loading={loading}
                onRefresh={refetch}
              />
            </LazyWidgetWrapper>
          )}

          {!hiddenWidgets.has('quickActions') && (
            <LazyWidgetWrapper>
              <QuickActions
                assistants={assistants}
                onRefresh={refetch}
              />
            </LazyWidgetWrapper>
          )}
        </div>


      </div>

      {/* Onboarding Modal */}
      {onboardingStatus?.needs_onboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
    </>
  );
});

// Добавляем displayName для лучшей отладки
Dashboard.displayName = 'Dashboard';

export default Dashboard;