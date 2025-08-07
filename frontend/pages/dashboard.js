import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import OnboardingWizard from '../components/wizards/OnboardingWizard';

import dashStyles from '../styles/pages/Dashboard.module.css';
import { 
  FiUser, FiShield, FiClock, FiGrid, FiEye, FiEyeOff, FiRefreshCw,
  FiMessageSquare, FiTrendingUp, FiCheckCircle, FiStar,
  FiArrowUp, FiArrowDown
} from 'react-icons/fi';

// Импортируем все виджеты
import ActiveDialogs from '../components/dashboard/ActiveDialogs';
import BalanceWidget from '../components/dashboard/BalanceWidget';  
import QuickActions from '../components/dashboard/QuickActions';
import { useDashboardData } from '../hooks/useDashboardData';

// Удаляем компоненты связанные с пробным периодом и тарифами

function WelcomeHeader({ user, onChangeBalance, metrics, availableWidgets, hiddenWidgets, toggleWidget }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className={dashStyles.welcomeSection}>
      <div className={dashStyles.welcomeContent}>
        <div className={dashStyles.avatarSection}>
          <div className={dashStyles.avatar}>
            <FiUser size={28} />
          </div>
          <div className={dashStyles.userInfo}>
            <h1 className={dashStyles.welcomeTitle}>
              {getGreeting()}, {user.first_name || user.email.split('@')[0]}!
            </h1>
            <p className={dashStyles.welcomeSubtitle}>
              Добро пожаловать в панель управления AI-ассистентом
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className={`${dashStyles.badge} cursor-help`}>
              <FiStar size={16} />
              <span>Уровень: Исследователь</span>
            </div>
            {/* Кастомный tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Функционал в разработке
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Переключатель виджетов для мобильных устройств */}
      <div className="mt-6 md:hidden">
        <div className="flex flex-wrap gap-2">
          {availableWidgets.map(widget => (
            <button
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                hiddenWidgets.has(widget.id)
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {hiddenWidgets.has(widget.id) ? <FiEyeOff className="w-3 h-3 mr-1" /> : <FiEye className="w-3 h-3 mr-1" />}
              {widget.title}
            </button>
          ))}
        </div>
      </div>
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

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customDate, setCustomDate] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState(null);

  const [hiddenWidgets, setHiddenWidgets] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  
  const { user, logout } = useAuth();
  const { metrics, balance, bots, dialogs, assistants, loading, error: dataError, refetch } = useDashboardData();

  // Функция для обновления периода
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setCustomDate('');
    }
    refetch();
  };

  // Функция для переключения видимости виджетов
  const toggleWidget = (widgetId) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  // Определяем доступные виджеты
  const availableWidgets = [
    { id: 'balance', title: 'Баланс', component: BalanceWidget },
    { id: 'quickActions', title: 'Быстрые действия', component: QuickActions },
    { id: 'dialogs', title: 'Активные диалоги', component: ActiveDialogs }
  ];

  // Проверка статуса онбординга
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      
      fetch('http://localhost:8000/api/users/onboarding/status', {
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

  if (!user) {
    return (
      <div className={dashStyles.loadingContainer}>
        <div className={dashStyles.loadingSpinner}></div>
        <span>Загрузка...</span>
      </div>
    );
  }

  const handleChangeBalance = () => {
    window.location.href = '/balance';
  };

  const handleOnboardingComplete = () => {
    setOnboardingStatus(null);
    refetch();
  };

  const handleOnboardingSkip = () => {
    const token = localStorage.getItem('token');
    
    fetch('http://localhost:8000/api/users/onboarding/skip', {
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
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <div className={dashStyles.errorAlert}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <WelcomeHeader 
        user={user} 
        metrics={metrics}
        onChangeBalance={handleChangeBalance}
        availableWidgets={availableWidgets}
        hiddenWidgets={hiddenWidgets}
        toggleWidget={toggleWidget}
      />

      {/* Main Content */}
      <main className={dashStyles.mainContent}>
        {/* Dashboard Grid - Фиксированная сетка */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          
          {/* Баланс */}
          {!hiddenWidgets.has('balance') && (
            <div className="lg:col-span-1 xl:col-span-1">
              <BalanceWidget 
                balance={balance}
                loading={loading}
                onRefresh={refetch}
              />
            </div>
          )}

          {/* Быстрые действия */}
          {!hiddenWidgets.has('quickActions') && (
            <div className="lg:col-span-1 xl:col-span-2">
              <QuickActions 
                assistants={assistants}
                onRefresh={refetch}
              />
            </div>
          )}

          {/* Активные диалоги - на всю ширину */}
          {!hiddenWidgets.has('dialogs') && (
            <div className="lg:col-span-2 xl:col-span-3">
              <ActiveDialogs 
                dialogs={dialogs}
                loading={loading}
                onRefresh={refetch}
              />
            </div>
          )}

        </div>

      </main>

      {/* Onboarding Modal */}
      {onboardingStatus?.needs_onboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  );
}