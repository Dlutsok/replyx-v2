import { FiUsers, FiMessageSquare, FiDollarSign, FiBarChart } from 'react-icons/fi';

const AnalyticsTabs = ({ activeTab, onTabChange, isLoading = false }) => {
  const tabs = [
    {
      id: 'overview',
      label: 'Обзор',
      icon: FiBarChart,
      description: 'Ключевые показатели системы'
    },
    {
      id: 'users',
      label: 'Пользователи',
      icon: FiUsers,
      description: 'Статистика и активность пользователей'
    },
    {
      id: 'dialogs',
      label: 'Диалоги',
      icon: FiMessageSquare,
      description: 'Анализ диалогов и AI-ассистентов'
    },
    {
      id: 'revenue',
      label: 'Финансы',
      icon: FiDollarSign,
      description: 'Выручка и финансовые показатели'
    }
  ];

  const handleTabClick = (tabId) => {
    if (isLoading) return; // Блокируем переключение во время загрузки
    onTabChange(tabId);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-6">
      {/* Заголовок секции */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
          <FiBarChart className="text-gray-600" size={16} />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Разделы аналитики</h2>
      </div>

      {/* Desktop версия - кнопки в ряд */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLoading}
              className={`
                p-4 border rounded-lg transition-all duration-150 text-left
                ${isActive
                  ? 'border-[#6334E5]/40 bg-[#6334E5]/10 text-[#5028c2]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-[#6334E5]/20' : 'bg-gray-100'
                }`}>
                  <Icon
                    size={16}
                    className={isActive ? 'text-[#6334E5]' : 'text-gray-600'}
                  />
                </div>
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
              <p className="text-xs text-gray-600 leading-tight">{tab.description}</p>
            </button>
          );
        })}
      </div>

      {/* Mobile версия - кнопки в столбик */}
      <div className="sm:hidden space-y-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={isLoading}
              className={`
                w-full p-4 border rounded-lg transition-all duration-150 text-left
                ${isActive
                  ? 'border-[#6334E5]/40 bg-[#6334E5]/10 text-[#5028c2]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-[#6334E5]/20' : 'bg-gray-100'
                }`}>
                  <Icon
                    size={16}
                    className={isActive ? 'text-[#6334E5]' : 'text-gray-600'}
                  />
                </div>
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
              <p className="text-xs text-gray-600 leading-tight">{tab.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsTabs;