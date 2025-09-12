import { useState, useEffect } from 'react';
import Head from 'next/head';
import { withAuth } from '../hooks/useAuth';
import AdminDashboard from '@/components/layout/AdminDashboard';
import { 
  FiUsers, FiDollarSign, FiActivity, FiMessageSquare,
  FiTrendingUp, FiTrendingDown, FiAlertCircle, FiCheckCircle,
  FiServer, FiDatabase, FiCpu, FiWifi
} from 'react-icons/fi';
import styles from '../styles/pages/AdminPanel.module.css';

const AdminPanel = () => {
  return (
    <>
      <Head>
        <title>Админ-панель недоступна для поисковых систем</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="description" content="Административная страница недоступна для индексации" />
      </Head>
      <AdminPanelContent />
    </>
  );
};

const AdminPanelContent = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  // HEARTBEAT оператора: поддерживаем присутствие
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    
    let visibilityTimeout = null;
    
    const sendHeartbeat = async (status = 'online') => {
      try {
        await fetch('/api/operator/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });
      } catch (e) {
        // no-op: heartbeat не должен ломать UI
      }
    };
    
    // Первичный онлайн
    sendHeartbeat('online');
    
    // Периодический heartbeat каждые 30 секунд
    const intervalId = setInterval(() => sendHeartbeat('online'), 30 * 1000);
    
    // Смена видимости вкладки → away/online
    const handleVisibility = () => {
      clearTimeout(visibilityTimeout);
      if (document.hidden) {
        // Через 20 секунд скрытия помечаем away
        visibilityTimeout = setTimeout(() => sendHeartbeat('away'), 20 * 1000);
      } else {
        sendHeartbeat('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Уход со страницы → offline (best-effort)
    const handleBeforeUnload = () => {
      try {
        const data = JSON.stringify({ status: 'offline' });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/operator/heartbeat', blob);
      } catch (_) {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(visibilityTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Финальный best-effort offline
      try {
        const data = JSON.stringify({ status: 'offline' });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/operator/heartbeat', blob);
      } catch (_) {}
    };
  }, []);

  // Загрузка данных дашборда
  useEffect(() => {
    fetchDashboardData();
    fetchSystemHealth();
    fetchRealtimeStats();

    // Обновление каждые 30 секунд - все данные
    const interval = setInterval(async () => {
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchSystemHealth(), 
          fetchRealtimeStats()
        ]);
        setIsConnected(true);
        setLastUpdated(new Date());
      } catch (error) {
        setIsConnected(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/system-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setIsConnected(true);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/health'); // Health endpoint в корне, не требует авторизации
      
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/realtime-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRealtimeStats(data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };



  if (isLoading) {
    return (
      <AdminDashboard activeSection="overview">
        <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-[#6334E5] rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600 font-medium">Загрузка данных...</p>
          </div>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard activeSection="overview">
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
        {/* Header - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - заголовок и описание */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiActivity className="text-gray-600" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight mb-2">
                    Панель администратора
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Мониторинг системы и ключевые метрики • Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
                    {isConnected ? (
                      <span className="text-green-600 font-medium ml-1">• Подключено</span>
                    ) : (
                      <span className="text-red-600 font-medium ml-1">• Нет связи</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards - Minimal Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#6334E5]/10 rounded-lg flex items-center justify-center">
                <FiUsers className="text-[#6334E5]" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Активных пользователей</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                {formatNumber(dashboardData?.totalUsers)}
              </div>
              {dashboardData?.userGrowth && (
                <div className="flex items-center gap-1 text-sm">
                  <FiTrendingUp className="text-green-600" size={12} />
                  <span className="text-green-600 font-medium">+{dashboardData.userGrowth}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FiActivity className="text-blue-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Сегодня пользователей</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                {formatNumber(dashboardData?.activeUsersToday)}
              </div>
              {dashboardData?.dailyActiveGrowth && (
                <div className="flex items-center gap-1 text-sm">
                  <FiTrendingUp className="text-green-600" size={12} />
                  <span className="text-green-600 font-medium">+{dashboardData.dailyActiveGrowth}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <FiDollarSign className="text-green-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Выручка сегодня</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                {formatCurrency(realtimeStats?.revenue || 0)}
              </div>
              {realtimeStats?.revenueGrowth && realtimeStats.revenueGrowth > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <FiTrendingUp className="text-green-600" size={12} />
                  <span className="text-green-600 font-medium">+{realtimeStats.revenueGrowth}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <FiMessageSquare className="text-orange-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Активных диалогов</p>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-gray-900">
              {formatNumber(realtimeStats?.activeDialogs)}
            </div>
          </div>
        </div>

        {/* System Health - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <FiServer className="text-gray-600" size={16} />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Состояние системы</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systemHealth?.components && Object.entries(systemHealth.components).map(([component, data]) => (
              <div key={component} className={`p-4 rounded-lg border transition-all duration-150 ${
                data.status === 'healthy' ? 'bg-green-50 border-green-200' :
                data.status === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {data.status === 'healthy' ? (
                    <FiCheckCircle className="text-green-600" size={16} />
                  ) : (
                    <FiAlertCircle className={`${
                      data.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                    }`} size={16} />
                  )}
                  <span className={`text-xs font-medium uppercase tracking-wider ${
                    data.status === 'healthy' ? 'text-green-800' :
                    data.status === 'degraded' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {data.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {component.charAt(0).toUpperCase() + component.slice(1)}
                </h4>
                {data.error && <p className="text-xs text-gray-600">{data.error}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <FiActivity className="text-gray-600" size={16} />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Активность в реальном времени</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-gray-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FiWifi className="text-blue-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Онлайн пользователей</h4>
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-900 mb-1">{realtimeStats?.onlineUsers || 0}</div>
              <p className="text-xs text-gray-600">
                В ЛК: {realtimeStats?.lkActiveUsers || 0} • В диалогах: {realtimeStats?.dialogActiveUsers || 0}
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-gray-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#6334E5]/10 rounded-lg flex items-center justify-center">
                  <FiMessageSquare className="text-[#6334E5]" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Сообщений за час</h4>
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-900 mb-1">{realtimeStats?.messagesLastHour || 0}</div>
              <p className="text-xs text-gray-600">Включая ответы ассистентов</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-gray-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <FiUsers className="text-green-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">Новых пользователей</h4>
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-900 mb-1">{realtimeStats?.newUsersToday || 0}</div>
              <p className="text-xs text-gray-600">Зарегистрировано сегодня</p>
            </div>
          </div>
        </div>

        {/* Quick Actions - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="text-gray-600" size={16} />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Быстрые действия</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <button
              className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/10 group"
              onClick={() => window.open('/admin-users', '_self')}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors duration-150">
                  <FiUsers className="text-[#6334E5]" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900">Управление пользователями</span>
              </div>
            </button>

            <button
              className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/10 group"
              onClick={() => window.open('/admin-payments', '_self')}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors duration-150">
                  <FiDollarSign className="text-[#6334E5]" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900">Финансовые операции</span>
              </div>
            </button>

            <button
              className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/10 group"
              onClick={() => window.open('/admin-ai-tokens', '_self')}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors duration-150">
                  <FiCpu className="text-[#6334E5]" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900">AI Токены</span>
              </div>
            </button>

            <button
              className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/10 group"
              onClick={() => window.open('/admin-system', '_self')}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors duration-150">
                  <FiDatabase className="text-[#6334E5]" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900">Системные логи</span>
              </div>
            </button>

            <button
              className="p-4 border border-gray-200 rounded-lg transition-all duration-150 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/10 group"
              onClick={() => window.open('/admin-analytics', '_self')}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors duration-150">
                  <FiTrendingUp className="text-[#6334E5]" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900">Подробная аналитика</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AdminDashboard>
  );
};

// Защищаем страницу - только для админов
export default withAuth(AdminPanel, { adminOnly: true });