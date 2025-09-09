import { useState } from 'react';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '@/components/layout/AdminDashboard';
import useAdminAnalytics from '../hooks/useAdminAnalytics';

// Компоненты аналитики
import OverviewMetrics from '../components/admin/OverviewMetrics';
import AnalyticsTabs from '../components/admin/AnalyticsTabs';
import UsersAnalyticsPanel from '../components/admin/UsersAnalyticsPanel';
import DialogsAnalyticsPanel from '../components/admin/DialogsAnalyticsPanel';
import RevenueAnalyticsPanel from '../components/admin/RevenueAnalyticsPanel';

// Стили и иконки
import styles from '../styles/components/AdminAnalytics.module.css';
import { FiAlertCircle, FiRefreshCw, FiCalendar, FiDownload, FiBarChart } from 'react-icons/fi';

const AdminAnalyticsPage = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  // State для управления периодом и активной вкладкой
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Хук для работы с данными аналитики
  const {
    overviewData,
    usersData,
    dialogsData,
    revenueData,
    usersAIMessagesData,
    metrics,
    isLoading,
    error,
    usersPage,
    handleUsersPageChange,
    refreshData,
    formatters,
    fetchUsersAIMessagesData,
    clearError
  } = useAdminAnalytics(period, activeTab);

  // Обработчик смены периода
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setLastUpdated(new Date());
  };

  // Обработчик смены вкладки
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  // Обработчик обновления данных
  const handleRefresh = async () => {
    await refreshData();
    setLastUpdated(new Date());
  };

  // Компонент ошибки - Minimal Style
  const ErrorDisplay = ({ error, onRetry, onDismiss }) => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 text-red-600 mt-0.5">⚠️</div>
        <div className="flex-1">
          <p className="text-sm text-red-800 font-medium">{error}</p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-150"
            >
              <FiRefreshCw size={14} />
              Попробовать снова
            </button>
            <button
              onClick={onDismiss}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-all duration-150"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Компонент загрузки - Minimal Style
  const LoadingDisplay = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-[#6334E5] rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-gray-600 font-medium">Загрузка аналитики...</p>
    </div>
  );

  // Рендер контента для активной вкладки
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewMetrics
            metrics={metrics}
            formatters={formatters}
            isLoading={isLoading}
          />
        );
        
      case 'users':
        return (
          <UsersAnalyticsPanel
            usersData={usersData}
            formatters={formatters}
            isLoading={isLoading}
            usersPage={usersPage}
            handleUsersPageChange={handleUsersPageChange}
          />
        );
        
      case 'dialogs':
        return (
          <DialogsAnalyticsPanel
            dialogsData={dialogsData}
            formatters={formatters}
            isLoading={isLoading}
            usersAIMessagesData={usersAIMessagesData}
            fetchUsersAIMessagesData={fetchUsersAIMessagesData}
          />
        );
        
      case 'revenue':
        return (
          <RevenueAnalyticsPanel
            revenueData={revenueData}
            formatters={formatters}
            isLoading={isLoading}
          />
        );
        
      default:
        return (
          <OverviewMetrics
            metrics={metrics}
            formatters={formatters}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <AdminDashboard activeSection="analytics">
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
        {/* Заголовок с фильтрами - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - заголовок и описание */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiBarChart className="text-gray-600" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight mb-2">
                    Подробная аналитика
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Детальная статистика пользователей, диалогов и финансовых показателей
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Обновлено: {lastUpdated.toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>

            {/* Правая часть - действия */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Обновление...' : 'Обновить'}
              </button>

              <button
                onClick={() => showInfo('Функция экспорта будет доступна в следующем обновлении', { title: 'Информация' })}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:ring-offset-2 transition-all duration-200"
              >
                <FiDownload size={16} />
                Экспорт
              </button>
            </div>
          </div>

          {/* Фильтр по периоду */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <FiCalendar size={16} className="text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Период:</label>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: '24h', label: 'За сутки' },
                  { value: '7d', label: 'За неделю' },
                  { value: '30d', label: 'За месяц' },
                  { value: '90d', label: 'За квартал' },
                  { value: '1y', label: 'За год' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      period === option.value
                        ? 'bg-[#6334E5]/20 text-[#5028c2] border border-[#6334E5]/30'
                        : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Отображение ошибки */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={handleRefresh}
            onDismiss={clearError}
          />
        )}

        {/* Обзорные метрики - показываем на всех вкладках */}
        {activeTab !== 'overview' && !error && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 mb-6">
            <OverviewMetrics
              metrics={metrics}
              formatters={formatters}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Табы для переключения разделов */}
        <AnalyticsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoading}
        />

        {/* Контент активной вкладки */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 mb-6">
          {!error ? (
            renderActiveTabContent()
          ) : (
            <LoadingDisplay />
          )}
        </div>

        {/* Дополнительная информация */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Данные обновляются автоматически каждые 5 минут
            </div>
            <div>
              Последнее обновление: {lastUpdated.toLocaleTimeString('ru-RU')}
            </div>
          </div>
        </div>
      </div>
    </AdminDashboard>
  );
};

// Защищаем страницу - только для администраторов
export default withAuth(AdminAnalyticsPage, { adminOnly: true });