import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/pages/Usage.module.css';
import dashStyles from '../styles/pages/Dashboard.module.css';
import { useNotifications } from '../hooks/useNotifications';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  FiMessageSquare, FiFileText, FiCreditCard,
  FiFilter, FiDownload, FiCalendar, FiSearch, FiActivity,
  FiZap, FiArrowUp, FiArrowDown, FiLoader, FiStar, FiGlobe,
  FiTrendingUp, FiBarChart, FiTarget, FiInfo, FiArrowRight,
  FiChevronRight, FiBook, FiDollarSign
} from 'react-icons/fi';
import { FaRubleSign } from 'react-icons/fa6';

// Быстрые действия для страницы расходов
function QuickActions({ onExportClick, onFilterToggle }) {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const actions = [
    {
      title: 'Скачать отчет в Excel',
      description: 'Экспорт в формате Excel',
      icon: FiDownload,
      color: 'green',
      action: onExportClick
    },
    {
      title: 'Фильтры',
      description: 'Настроить фильтры поиска',
      icon: FiFilter,
      color: 'purple',
      action: onFilterToggle
    },
    {
      title: 'Аналитика',
      description: 'Подробный анализ расходов',
      icon: FiBarChart,
      color: 'green',
      action: () => {
        showInfo('Функция аналитики расходов будет доступна в ближайшее время', { title: 'Информация' });
      }
    },
    {
      title: 'Советы экономии',
      description: 'Рекомендации по оптимизации',
      icon: FiTarget,
      color: 'orange',
      action: () => {
        showInfo('Советы по экономии:\n• Используйте промпты эффективно\n• Загружайте документы заранее\n• Мониторьте использование', { title: 'Советы по экономии' });
      }
    }
  ];

  const getIconStyle = (color) => {
    switch (color) {
      case 'purple':
        return { bg: 'bg-[#6334E5]/10', text: 'text-[#6334E5]' };
      case 'blue':
        return { bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'green':
        return { bg: 'bg-green-50', text: 'text-green-600' };
      case 'orange':
        return { bg: 'bg-orange-50', text: 'text-orange-600' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600' };
    }
  };

  const handleActionClick = (action) => {
    if (action.action) {
      action.action();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <FiActivity className="text-blue-600" size={16} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Быстрые действия</h3>
      </div>

      <div className="space-y-3">
        {actions.map((action, index) => {
          const iconStyle = getIconStyle(action.color);
          const IconComponent = action.icon || FiActivity;

          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleActionClick(action)}
            >
              <div className={`w-8 h-8 ${iconStyle.bg} rounded-lg flex items-center justify-center`}>
                {React.createElement(IconComponent, {
                  className: iconStyle.text,
                  size: 16
                })}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-xs text-gray-600">{action.description}</p>
              </div>
              <FiArrowRight className="text-gray-400" size={16} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Компонент метрик расходов
function UsageMetrics({ stats, total, dashboardMetrics }) {
  const messagesProcessed = dashboardMetrics?.messages_processed || 0;
  const savingsAmount = messagesProcessed * 20; // Та же формула, что и на дашборде

  const metrics = [
    {
      title: 'Вы сэкономили',
      value: `${savingsAmount.toLocaleString('ru-RU')}₽`,
      icon: FaRubleSign,
      change: `+${messagesProcessed} ответов`,
      subtitle: 'в этом месяце'
    },
    {
      title: 'КОЛИЧЕСТВО ОПЕРАЦИЙ',
      value: `${stats.totalTransactions || 0}`,
      icon: FiActivity,
      change: '+0%'
    },
    {
      title: 'РАСХОДЫ ЗА МЕСЯЦ',
      value: `${(messagesProcessed * 5).toLocaleString('ru-RU')} ₽`,
      icon: FiCalendar,
      change: '0%'
    },
    {
      title: 'ОБЩЕЕ КОЛИЧЕСТВО',
      value: `${total} транзакций`,
      icon: FiTrendingUp,
      change: '+0%'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon}>
              {React.createElement(metric.icon, { size: 20 })}
            </div>
            <div className={dashStyles.metricTitle}>{metric.title}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={dashStyles.metricValue}>
              {metric.value}
            </div>
            {metric.change && (
              <div className="flex items-center gap-1 text-sm">
                <FiTrendingUp className={metric.title === 'Вы сэкономили' ? "text-emerald-600" : "text-gray-400"} size={12} />
                <span className={metric.title === 'Вы сэкономили' ? "font-semibold text-emerald-600" : "text-gray-400 font-medium"}>{metric.change}</span>
              </div>
            )}
          </div>
          {metric.subtitle && (
            <div className={dashStyles.metricSubtitle}>
              {metric.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Usage() {
  const { showSuccess, showError } = useNotifications();
  const { metrics: dashboardMetrics, loading: dashboardLoading } = useDashboardData();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    thisMonth: 0
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    period: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  // Типы операций для фильтра
  const operationTypes = [
    { value: 'all', label: 'Все операции', icon: FiActivity },
    { value: 'ai_message', label: 'AI сообщения', icon: FiMessageSquare },
    { value: 'widget_message', label: 'Сообщения виджета', icon: FiGlobe },
    { value: 'document_upload', label: 'Загрузка документов', icon: FiFileText },
    { value: 'bot_message', label: 'Сообщения ассистента', icon: FiZap },
    { value: 'topup', label: 'Пополнения', icon: FiCreditCard }
  ];

  // Периоды для фильтра
  const periods = [
    { value: '7', label: 'За неделю' },
    { value: '30', label: 'За месяц' },
    { value: '90', label: 'За 3 месяца' },
    { value: 'all', label: 'За все время' }
  ];

  // Загрузка данных
  useEffect(() => {
    loadUsageData();
  }, [page, limit, filters]);


  const loadUsageData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      // Строим параметры запроса с учетом фильтрации
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      });

      // Добавляем фильтры если они установлены
      if (filters.type !== 'all') {
        params.append('transaction_type', filters.type);
      }
      
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      
      if (filters.period !== 'all') {
        params.append('period_days', filters.period);
      }

      // Загружаем пагинированные транзакции для отображения
      const transactionsResponse = await fetch(`/api/balance/transactions/detailed/paged?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (transactionsResponse.ok) {
        const { items, total: totalCount } = await transactionsResponse.json();
        setTransactions(items);
        setTotal(totalCount || 0);

        // Пытаемся загрузить полную статистику
        try {
          const statsResponse = await fetch('/api/balance/usage-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData);
          } else {
            // Если новый API не работает, используем старый способ
            calculateStatsFromTransactions(items);
          }
        } catch (statsError) {
          // Если новый API не работает, используем старый способ
          calculateStatsFromTransactions(items);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStatsFromTransactions = (data) => {
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const spendingTransactions = data.filter(t => t.amount < 0);
    
    const totalSpent = Math.abs(spendingTransactions.reduce((sum, t) => sum + t.amount, 0));
    const thisMonthSpent = Math.abs(spendingTransactions
      .filter(t => new Date(t.created_at) >= thisMonth)
      .reduce((sum, t) => sum + t.amount, 0));

    setStats({
      totalSpent,
      totalTransactions: spendingTransactions.length,
      thisMonth: thisMonthSpent
    });
  };



  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Сбрасываем страницу на первую при изменении фильтров (кроме сортировки)
    if (key !== 'sortBy' && key !== 'sortOrder') {
      setPage(1);
    }
  };

  const getOperationIcon = (type) => {
    const operation = operationTypes.find(op => op.value === type);
    return operation ? operation.icon : FiActivity;
  };

  const getOperationLabel = (type) => {
    const operation = operationTypes.find(op => op.value === type);
    return operation ? operation.label : 'Операция';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (number) => {
    return Math.abs(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const exportData = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // Получаем все транзакции без фильтров для полного экспорта
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Получаем общее количество операций
      const firstPageResponse = await fetch(`/api/balance/transactions/detailed/paged?page=1&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let exportTransactions = [];
      let totalOperations = 0;

      if (firstPageResponse.ok) {
        const { items, total } = await firstPageResponse.json();
        exportTransactions = [...items];
        totalOperations = total;

        // Вычисляем количество страниц (используя лимит 100, как в API)
        const totalPages = Math.ceil(total / 100);

        // Загружаем остальные страницы
        for (let page = 2; page <= totalPages; page++) {
          try {
            const pageResponse = await fetch(`/api/balance/transactions/detailed/paged?page=${page}&limit=100`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (pageResponse.ok) {
              const { items: pageItems } = await pageResponse.json();
              exportTransactions = [...exportTransactions, ...pageItems];
            }
          } catch (pageError) {
          }
        }
      } else {
        // Fallback: используем текущие загруженные данные
        exportTransactions = [...transactions];
        totalOperations = total;
      }

      // Создаем HTML таблицу в формате Excel
      const htmlTable = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .positive { color: #16a34a; font-weight: bold; }
            .negative { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип операции</th>
                <th>Сумма</th>
                <th>Описание</th>
                <th>Баланс после</th>
              </tr>
            </thead>
            <tbody>
              ${exportTransactions.map(t => `
                <tr>
                  <td>${formatDate(t.created_at)}</td>
                  <td>${getOperationLabel(t.transaction_type)}</td>
                  <td class="${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${formatNumber(Math.abs(t.amount))} ₽</td>
                  <td>${t.description || ''}</td>
                  <td>${formatNumber(t.balance_after)} ₽</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlTable], {
        type: 'application/vnd.ms-excel;charset=utf-8;'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `расходы_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();

      // Показываем уведомление об успешном экспорте
      showSuccess(`Экспортировано ${exportTransactions.length} из ${totalOperations} операций в Excel`, { title: 'Экспорт завершен' });
    } catch (error) {
      showError('Ошибка при экспорте данных', { title: 'Ошибка' });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={dashStyles.loadingContainer}>
        <FiLoader className={dashStyles.loadingSpinner} />
        <span>Загрузка расходов...</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Расходы - ReplyX</title>
        <meta name="description" content="Анализ расходов и история транзакций в платформе ReplyX." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 animate-fade-in rounded-2xl">
        {/* Welcome Section - Dashboard Style */}
        <div className={dashStyles.welcomeSection}>
          <div className={dashStyles.welcomeContent}>
            <div className={dashStyles.avatarSection}>
              <div className={dashStyles.avatar}>
                <FiActivity size={28} />
              </div>
              <div className={dashStyles.userInfo}>
                <h1 className={dashStyles.welcomeTitle}>Расходы и аналитика</h1>
                <p className={dashStyles.welcomeSubtitle}>
                  Статистика использования и история транзакций платформы
                </p>
              </div>
            </div>

            <div className={dashStyles.badge}>
              <FiStar size={16} />
              <span>Онлайн аналитика</span>
            </div>
          </div>
        </div>

        {/* Top Level Layout - Metrics and Quick Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Left Side - Usage Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="text-blue-600" size={16} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Общая статистика</h3>
              </div>
              <UsageMetrics stats={stats} total={total} dashboardMetrics={dashboardMetrics} />
            </div>
          </div>

          {/* Right Side - Quick Actions */}
          <div className="space-y-6">
            <QuickActions
              onExportClick={exportData}
              onFilterToggle={() => setShowFilters(!showFilters)}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col gap-4 mb-6">
            {/* Верхняя часть - заголовок и счетчик */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="text-green-600" size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">История операций</h3>
                  <p className="text-sm text-gray-600">Детализация всех транзакций</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {total.toLocaleString('ru-RU')} операций
                  </span>
                </div>
                <button
                  onClick={exportData}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 disabled:bg-green-25 disabled:cursor-not-allowed text-green-700 rounded-lg transition-colors duration-200 border border-green-200 hover:border-green-300 disabled:border-green-200"
                  title="Экспорт в Excel"
                >
                  {isExporting ? (
                    <FiLoader size={14} className="animate-spin" />
                  ) : (
                    <FiDownload size={14} />
                  )}
                  <span className="hidden sm:inline">
                    {isExporting ? 'Экспорт...' : 'Excel'}
                  </span>
                </button>
              </div>
            </div>

            {/* Нижняя часть - фильтры и поиск */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Поиск */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по операциям..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:border-transparent"
                />
              </div>

              {/* Мобильные кнопки фильтров */}
              <div className="flex gap-2">
                {/* Кнопка фильтров */}
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors flex-1 sm:flex-none justify-center ${
                    showFilters
                      ? 'border-[#6334E5]/40 bg-[#6334E5]/10 text-[#5028c2]'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FiFilter size={16} />
                  <span className="hidden sm:inline">Фильтры</span>
                </button>

                {/* Период */}
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filters.period}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    className="px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:border-transparent w-full appearance-none bg-white cursor-pointer"
                  >
                    {periods.map(period => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Расширенные фильтры */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Тип операции:</label>
                  <div className="relative">
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                      {operationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Сортировка:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:border-transparent appearance-none bg-white cursor-pointer"
                      >
                        <option value="date">По дате</option>
                        <option value="amount">По сумме</option>
                        <option value="type">По типу</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        className={`px-2 py-2 text-sm border rounded-lg transition-colors ${
                          filters.sortOrder === 'desc'
                            ? 'border-[#6334E5]/40 bg-[#6334E5]/10 text-[#5028c2]'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                        onClick={() => handleFilterChange('sortOrder', 'desc')}
                        title="По убыванию"
                      >
                        <FiArrowDown size={14} />
                      </button>
                      <button
                        className={`px-2 py-2 text-sm border rounded-lg transition-colors ${
                          filters.sortOrder === 'asc'
                            ? 'border-[#6334E5]/40 bg-[#6334E5]/10 text-[#5028c2]'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                        onClick={() => handleFilterChange('sortOrder', 'asc')}
                        title="По возрастанию"
                      >
                        <FiArrowUp size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Мобильная кнопка применения фильтров */}
              <div className="block sm:hidden mt-4 pt-4 border-t border-gray-200">
                <button
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-[#6334E5] rounded-lg hover:bg-[#5028c2] transition-colors"
                  onClick={() => setShowFilters(false)}
                >
                  Применить фильтры
                </button>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <FiActivity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Операции не найдены</h3>
              <p className="text-gray-600">Попробуйте изменить параметры фильтрации</p>
            </div>
          ) : (
            <>
              {/* Десктопная версия - таблица */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Операция</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Дата</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Сумма</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Баланс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const IconComponent = getOperationIcon(transaction.transaction_type);

                      return (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                {React.createElement(IconComponent, { size: 16, className: "text-blue-600" })}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getOperationLabel(transaction.transaction_type)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {transaction.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-900">
                            {formatDate(transaction.created_at)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}{formatNumber(Math.abs(transaction.amount))} ₽
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium text-gray-900">
                            {formatNumber(transaction.balance_after)} ₽
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Мобильная и планшетная версия - карточки */}
              <div className="lg:hidden space-y-3">
                {transactions.map((transaction) => {
                  const IconComponent = getOperationIcon(transaction.transaction_type);

                  return (
                    <div key={transaction.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            {React.createElement(IconComponent, { size: 16, className: "text-blue-600" })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm sm:text-base leading-tight">
                              {getOperationLabel(transaction.transaction_type)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                              {transaction.description}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs sm:text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`font-semibold text-sm sm:text-base ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatNumber(Math.abs(transaction.amount))} ₽
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            Баланс: {formatNumber(transaction.balance_after)} ₽
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Пагинация */}
          {transactions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              {/* Мобильная и планшетная пагинация */}
              <div className="block md:hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs sm:text-sm text-gray-500">
                    {page} из {totalPages}
                  </div>
                  <select
                    className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md sm:rounded-lg"
                    value={limit}
                    onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value)); }}
                  >
                    {[25, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-sm border border-gray-300 rounded-md sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canPrev}
                    onClick={() => canPrev && setPage(page - 1)}
                  >
                    ‹
                  </button>
                  <div className="px-3 py-1 sm:px-4 sm:py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md sm:rounded-lg">
                    {page}
                  </div>
                  <button
                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-sm border border-gray-300 rounded-md sm:rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canNext}
                    onClick={() => canNext && setPage(page + 1)}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Десктопная пагинация */}
              <div className="hidden md:flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Страница {page} из {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canPrev}
                    onClick={() => canPrev && setPage(page - 1)}
                  >
                    Назад
                  </button>
                  <select
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    value={limit}
                    onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value)); }}
                  >
                    {[25, 50, 100].map(size => (
                      <option key={size} value={size}>{size} на странице</option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canNext}
                    onClick={() => canNext && setPage(page + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </>
  );
}

export default function UsagePage() {
  return <Usage />;
} 