import { useState } from 'react';
import { 
  FiUser, FiMail, FiCalendar, FiActivity, FiDollarSign, 
  FiChevronLeft, FiChevronRight, FiSearch, FiFilter,
  FiCheckCircle, FiXCircle, FiClock
} from 'react-icons/fi';

const UsersAnalyticsPanel = ({ 
  usersData, 
  formatters, 
  isLoading, 
  usersPage, 
  handleUsersPageChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Получаем данные пользователей
  const users = usersData?.users || [];
  const pagination = usersData?.pagination || {};
  const { total = 0, pages = 1, page: current_page = 1, limit: per_page = 20 } = pagination;

  // Статусы пользователей
  const statusOptions = [
    { value: 'all', label: 'Все пользователи' },
    { value: 'active', label: 'Активные' },
    { value: 'inactive', label: 'Неактивные' },
    { value: 'premium', label: 'Премиум' },
    { value: 'trial', label: 'Пробный период' }
  ];

  // Компонент загрузки таблицы
  const LoadingTable = () => (
    <div className="animate-pulse">
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="h-4 bg-gray-200 rounded col-span-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Компонент статуса пользователя
  const UserStatus = ({ status, isActive }) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <FiCheckCircle size={12} />
          Активен
        </span>
      );
    }
    
    const statusConfig = {
      premium: { color: 'purple', text: 'Премиум', icon: FiDollarSign },
      trial: { color: 'blue', text: 'Пробный', icon: FiClock },
      inactive: { color: 'gray', text: 'Неактивен', icon: FiXCircle }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  // Компонент строки пользователя
  const UserRow = ({ user }) => (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Пользователь */}
      <div className="sm:col-span-2 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#6334E5]/20 rounded-full flex items-center justify-center">
          <FiUser size={16} className="text-[#6334E5]" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {user.first_name || user.email?.split('@')[0] || 'Пользователь'}
          </div>
          <div className="text-sm text-gray-500 truncate">{user.email}</div>
        </div>
      </div>

      {/* Дата регистрации */}
      <div className="text-sm text-gray-600">
        {formatters.date(user.created_at)}
      </div>

      {/* Статус */}
      <div>
        <UserStatus status={user.status} isActive={user.is_active} />
      </div>

      {/* Диалоги */}
      <div className="text-sm">
        <div className="font-medium text-gray-900">
          {user.total_dialogs || user.dialogs_count || 0}
        </div>
        <div className="text-gray-500">диалогов</div>
      </div>

      {/* Баланс */}
      <div className="text-sm">
        <div className="font-medium text-gray-900">
          {formatters.currency(user.balance || 0)}
        </div>
        <div className="text-gray-500">баланс</div>
      </div>
    </div>
  );

  // Пагинация
  const Pagination = () => {
    if (pages <= 1) return null;

    const maxVisiblePages = 5;
    const startPage = Math.max(1, current_page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pages, startPage + maxVisiblePages - 1);
    const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    return (
      <div className="flex items-center justify-between pt-6">
        <div className="text-sm text-gray-700">
          Показано {((current_page - 1) * per_page) + 1} - {Math.min(current_page * per_page, total)} из {total} пользователей
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUsersPageChange(current_page - 1)}
            disabled={current_page <= 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft size={16} />
          </button>
          
          {visiblePages.map(page => (
            <button
              key={page}
              onClick={() => handleUsersPageChange(page)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                current_page === page
                  ? 'bg-[#6334E5]/20 text-[#5028c2] border border-[#6334E5]/40'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handleUsersPageChange(current_page + 1)}
            disabled={current_page >= pages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Аналитика пользователей
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Детальная информация о пользователях и их активности
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Поиск */}
          <div className="relative flex-1">
            <FiSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по email или имени..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6334E5]/100 focus:border-[#6334E5]/100"
            />
          </div>

          {/* Фильтр по статусу */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6334E5]/100 focus:border-[#6334E5]/100"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Заголовки таблицы (desktop) */}
        <div className="hidden sm:grid sm:grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-2">Пользователь</div>
          <div>Регистрация</div>
          <div>Статус</div>
          <div>Диалоги</div>
          <div>Баланс</div>
        </div>

        {/* Список пользователей */}
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6">
              <LoadingTable />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2 p-4">
              {users.map(user => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FiUser size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Пользователи не найдены
              </h3>
              <p className="text-gray-600">
                Попробуйте изменить параметры фильтрации
              </p>
            </div>
          )}
        </div>

        {/* Пагинация */}
        {!isLoading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Pagination />
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersAnalyticsPanel;