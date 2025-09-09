import { withAuth } from '../hooks/useAuth';
import useBotsMonitoring from '../hooks/useBotsMonitoring';
import AdminDashboard from '@/components/layout/AdminDashboard';
import BotsMonitoringGrid from '../components/admin/BotsMonitoringGrid';
import BotsStatsCards from '../components/admin/BotsStatsCards';
import BotDetailsModal from '../components/admin/BotDetailsModal';
import BotStatusCard from '../components/admin/BotStatusCard';
import { 
  FiRefreshCw, FiSettings, FiSearch, FiCpu, FiWifi
} from 'react-icons/fi';
import styles from '../styles/pages/AdminBotsMonitoring.module.css';

const AdminBotsMonitoring = () => {
  const {
    filteredBots,
    statsData,
    loading,
    error,
    filters,
    selectedBot,
    showBotDetails,
    handleBotAction,
    setFilter,
    openBotDetails,
    closeBotDetails,
    refresh,
    isConnected,
    lastUpdate
  } = useBotsMonitoring({
    autoRefresh: true,
    refreshInterval: 30000,
    realTimeUpdates: true
  });

  if (loading) {
    return (
      <AdminDashboard activeSection="bots-monitoring">
        <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-[#6334E5] rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600 font-medium">Загрузка данных мониторинга...</p>
          </div>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard activeSection="bots-monitoring">
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
        {/* Header - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - заголовок и статистика */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiCpu className="text-gray-600" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight mb-2">
                    Мониторинг ботов
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Всего ботов: {filteredBots.length} •
                    <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {isConnected ? 'Подключено' : 'Нет связи'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Обновлено: {lastUpdate.toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>

            {/* Правая часть - действия */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:ring-offset-2 transition-all duration-200"
                onClick={refresh}
              >
                <FiRefreshCw size={16} />
                Обновить
              </button>

              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:ring-offset-2 transition-all duration-200">
                <FiSettings size={16} />
                Настройки
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-700">
              <strong>Ошибка загрузки данных:</strong> {error}
            </div>
            <button 
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              onClick={refresh}
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Filters - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Search Box */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск AI-ассистента..."
                  value={filters.search}
                  onChange={(e) => setFilter('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter('status', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 min-w-[140px]"
                >
                  <option value="all">Все статусы</option>
                  <option value="online">Онлайн</option>
                  <option value="offline">Оффлайн</option>
                  <option value="error">С ошибками</option>
                  <option value="starting">Запуск</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Период</label>
                <select
                  value={filters.period}
                  onChange={(e) => setFilter('period', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 min-w-[140px]"
                >
                  <option value="24h">За 24 часа</option>
                  <option value="7d">За 7 дней</option>
                  <option value="30d">За 30 дней</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <BotsStatsCards statsData={statsData} />

        {/* Bots Content - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
          {filteredBots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FiCpu className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-ассистенты не найдены</h3>
              <p className="text-sm text-gray-600 text-center">Измените фильтры или создайте нового AI-ассистента</p>
            </div>
          ) : (
            <>
              {/* Desktop: Bots Table */}
              <div className="hidden md:block">
                <BotsMonitoringGrid
                  bots={filteredBots}
                  onBotAction={handleBotAction}
                  onBotDetails={openBotDetails}
                  loading={loading}
                />
              </div>

              {/* Mobile: Bot Cards */}
              <div className="block md:hidden">
                <div className="space-y-4">
                  {filteredBots.map(bot => (
                    <div key={bot.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-150">
                      <div className="flex items-start gap-4">
                        {/* Bot Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-[#6334E5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCpu className="text-[#6334E5]" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                              {bot.name || 'Без имени'}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">
                              {bot.description || 'Без описания'}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                bot.status === 'online' ? 'bg-green-100 text-green-800' :
                                bot.status === 'offline' ? 'bg-red-100 text-red-800' :
                                bot.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {bot.status === 'online' ? 'Онлайн' :
                                 bot.status === 'offline' ? 'Оффлайн' :
                                 bot.status === 'error' ? 'Ошибка' : 'Запуск'}
                              </span>
                              <span className="text-xs text-gray-500">
                                ID: {bot.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium rounded-lg transition-all duration-150"
                            onClick={() => openBotDetails(bot)}
                          >
                            <FiSettings size={12} />
                            Детали
                          </button>

                          <button
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                              bot.status === 'online'
                                ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                            }`}
                            onClick={() => handleBotAction(bot, bot.status === 'online' ? 'stop' : 'start')}
                          >
                            {bot.status === 'online' ? 'Остановить' : 'Запустить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bot Details Modal */}
        <BotDetailsModal
          bot={selectedBot}
          isOpen={showBotDetails}
          onClose={closeBotDetails}
          onBotAction={handleBotAction}
        />
      </div>
    </AdminDashboard>
  );
};

// Защищаем страницу - только для админов
export default withAuth(AdminBotsMonitoring, { adminOnly: true });