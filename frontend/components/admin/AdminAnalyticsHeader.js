import { FiCalendar, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import { useNotifications } from '../../hooks/useNotifications';

const AdminAnalyticsHeader = ({ 
  period, 
  setPeriod, 
  onRefresh, 
  isLoading = false,
  lastUpdated = null 
}) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const periodOptions = [
    { value: '24h', label: 'За сутки' },
    { value: '7d', label: 'За неделю' },
    { value: '30d', label: 'За месяц' },
    { value: '90d', label: 'За квартал' },
    { value: '1y', label: 'За год' }
  ];

  const handleExport = async () => {
    try {
      // TODO: Implement export functionality
      showInfo('Функция экспорта будет доступна в следующем обновлении', { title: 'Информация' });
    } catch (error) {
    }
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return `Обновлено: ${new Date(date).toLocaleString('ru-RU')}`;
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-6">
        {/* Основной заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`${DESIGN_TOKENS.typography.h2} text-gray-900`}>
              Подробная аналитика
            </h1>
            <p className={`mt-1 ${DESIGN_TOKENS.typography.subtitle} text-gray-600`}>
              Детальная статистика пользователей, диалогов и финансовых показателей
            </p>
            {lastUpdated && (
              <p className="mt-1 text-sm text-gray-500">
                {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </div>

          {/* Действия */}
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`
                inline-flex items-center gap-2 px-4 py-2 
                border border-gray-300 rounded-xl
                text-sm font-medium text-gray-700
                bg-white hover:bg-gray-50
                focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${isLoading ? 'animate-pulse' : ''}
              `}
            >
              <FiRefreshCw 
                size={16} 
                className={isLoading ? 'animate-spin' : ''} 
              />
              {isLoading ? 'Обновление...' : 'Обновить'}
            </button>

            <button
              onClick={handleExport}
              className="
                inline-flex items-center gap-2 px-4 py-2
                bg-gradient-to-r from-[#6334E5] to-violet-600
                hover:from-[#5028c2] hover:to-violet-700
                text-white rounded-xl text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:ring-offset-2
                transition-all duration-200
              "
            >
              <FiDownload size={16} />
              Экспорт
            </button>
          </div>
        </div>

        {/* Фильтр по периоду */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <FiCalendar size={16} className="text-gray-500" />
              <label className="text-sm font-medium text-gray-700">
                Период:
              </label>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${period === option.value 
                      ? 'bg-[#6334E5]/20 text-[#5028c2] border border-[#6334E5]/30' 
                      : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsHeader;