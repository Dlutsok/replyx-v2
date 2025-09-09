import { useState, useEffect } from 'react';
import { withAuth } from '../hooks/useAuth';
import AdminDashboard from '@/components/layout/AdminDashboard';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import AITokensTable from '../components/admin/AITokensTable';
import AddTokenModal from '../components/admin/AddTokenModal';
import EditTokenModal from '../components/admin/EditTokenModal';
import TokenUsageModal from '../components/admin/TokenUsageModal';
import DeleteConfirmModal from '../components/admin/DeleteConfirmModal';
import styles from '../styles/pages/AdminAITokens.module.css';

const AdminAITokensPage = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);

  // Load tokens on component mount
  useEffect(() => {
    console.log('🔍 AdminAITokensPage useEffect - checking auth and loading tokens');
    const token = localStorage.getItem('token');
    console.log('🔑 Token found:', !!token);
    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    }
    loadTokens();
  }, []);

  // Автоматическое получение токена если его нет
  const ensureAuthToken = async () => {
    // Используем тот же ключ что и основная система авторизации
    let token = localStorage.getItem('token');
    
    if (!token) {
      console.log('🔐 Токен не найден в localStorage, пользователь не авторизован');
      window.location.href = '/login';
      return null;
    }
    
    return token;
  };

  const loadTokens = async () => {
    console.log('📥 loadTokens called');
    try {
      setLoading(true);
      setError(null);
      
      const token = await ensureAuthToken();
      console.log('🔑 ensureAuthToken returned:', !!token);
      if (!token) return; // Если токен отсутствует, пользователь будет перенаправлен
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
      console.log('🌐 Making request to:', `${apiUrl}/api/admin/ai-tokens`);
      const response = await fetch(`${apiUrl}/api/admin/ai-tokens`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Response status:', response.status, response.statusText);

      if (!response.ok) {
        // Если токен истек, перенаправляем на страницу входа
        if (response.status === 401) {
          localStorage.removeItem('token');
          console.log('🔄 Токен истек, перенаправляем на страницу входа...');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTokens(data || []);
    } catch (err) {
      console.error('Error loading tokens:', err);
      setError('Не удалось загрузить AI токены. Попробуйте перезагрузить страницу.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async (tokenData) => {
    try {
      const token = await ensureAuthToken();
      if (!token) return; // Если токен отсутствует, пользователь будет перенаправлен
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
      const response = await fetch(`${apiUrl}/api/admin/ai-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка создания токена');
      }

      await loadTokens(); // Reload tokens
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding token:', err);
      throw err; // Re-throw to be handled by modal
    }
  };

  const handleEditToken = async (tokenId, tokenData) => {
    try {
      const token = await ensureAuthToken();
      if (!token) return; // Если токен отсутствует, пользователь будет перенаправлен
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
      const response = await fetch(`${apiUrl}/api/admin/ai-tokens/${tokenId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка обновления токена');
      }

      await loadTokens(); // Reload tokens
      setShowEditModal(false);
      setSelectedToken(null);
    } catch (err) {
      console.error('Error editing token:', err);
      throw err; // Re-throw to be handled by modal
    }
  };

  const handleDeleteToken = async (tokenId) => {
    try {
      const token = await ensureAuthToken();
      if (!token) return; // Если токен отсутствует, пользователь будет перенаправлен
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
      const response = await fetch(`${apiUrl}/api/admin/ai-tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка удаления токена');
      }

      await loadTokens(); // Reload tokens
      setShowDeleteModal(false);
      setSelectedToken(null);
    } catch (err) {
      console.error('Error deleting token:', err);
      throw err; // Re-throw to be handled by modal
    }
  };

  // Filter tokens based on search and filters
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = !searchQuery || 
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (token.models || []).join(',').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && token.is_active) ||
      (statusFilter === 'inactive' && !token.is_active);
    
    const matchesPriority = priorityFilter === 'all' ||
      (priorityFilter === 'high' && token.priority >= 1 && token.priority <= 2) ||
      (priorityFilter === 'medium' && token.priority >= 3 && token.priority <= 4) ||
      (priorityFilter === 'low' && token.priority >= 5);

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openEditModal = (token) => {
    setSelectedToken(token);
    setShowEditModal(true);
  };

  const openUsageModal = (token) => {
    setSelectedToken(token);
    setShowUsageModal(true);
  };

  const openDeleteModal = (token) => {
    setSelectedToken(token);
    setShowDeleteModal(true);
  };

  return (
    <AdminDashboard activeSection="ai-tokens">
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
        {/* Page Header - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - заголовок и описание */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiPlus className="text-gray-600" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight mb-2">
                    Управление AI токенами
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Управление пулом API токенов для работы с различными AI моделями
                  </p>
                </div>
              </div>
            </div>
            {/* Правая часть - кнопка добавления */}
            <div className="flex-shrink-0">
              <button
                className="inline-flex items-center gap-2 bg-[#6334E5] hover:bg-[#5028c2] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 hover:shadow-lg hover:shadow-[#6334E5]/25"
                onClick={() => setShowAddModal(true)}
              >
                <FiPlus size={18} />
                Добавить токен
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Search Box */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по названию или моделям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 min-w-[120px]"
                >
                  <option value="all">Все</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Неактивные</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Приоритет</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 min-w-[140px]"
                >
                  <option value="all">Все</option>
                  <option value="high">Высокий (1-2)</option>
                  <option value="medium">Средний (3-4)</option>
                  <option value="low">Низкий (5+)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex-shrink-0 w-5 h-5 text-red-600 mt-0.5">⚠️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
              <button
                onClick={loadTokens}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              >
                Повторить попытку
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#6334E5] rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-600 font-medium">Загрузка AI токенов...</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FiPlus className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI токены не найдены</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Добавьте первый AI токен для начала работы с системой</p>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-lg font-medium transition-all duration-150"
                onClick={() => setShowAddModal(true)}
              >
                <FiPlus size={18} />
                Добавить токен
              </button>
            </div>
          ) : (
            /* Tokens Cards Grid */
            <div className="space-y-4">
              {filteredTokens.map(token => {
                const dailyPercentage = token.daily_limit > 0 ? Math.round((token.daily_usage || 0) / token.daily_limit * 100) : 0;
                const monthlyPercentage = token.monthly_limit > 0 ? Math.round((token.monthly_usage || 0) / token.monthly_limit * 100) : 0;

                return (
                  <div key={token.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-150">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Token Header */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-[#6334E5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiPlus className="text-[#6334E5]" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                {token.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>ID: #{token.id}</span>
                                {token.notes && <span title={token.notes}>📝</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                token.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {token.is_active ? 'Активен' : 'Неактивен'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                token.priority <= 2 ? 'bg-red-100 text-red-800' :
                                token.priority <= 4 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Приоритет {token.priority}
                              </span>
                            </div>
                          </div>

                          {/* Models */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(token.models || token.model_access?.split(',') || []).slice(0, 3).map((model, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                                {typeof model === 'string' ? model.trim() : model}
                              </span>
                            ))}
                            {(token.models || token.model_access?.split(',') || []).length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                                +{(token.models || token.model_access?.split(',') || []).length - 3}
                              </span>
                            )}
                          </div>

                          {/* Usage Stats */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Дневной лимит</span>
                                <span className={`font-medium ${
                                  dailyPercentage >= 80 ? 'text-red-600' :
                                  dailyPercentage >= 50 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {dailyPercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    dailyPercentage >= 80 ? 'bg-red-500' :
                                    dailyPercentage >= 50 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Intl.NumberFormat('ru-RU').format(token.daily_usage || 0)} / {new Intl.NumberFormat('ru-RU').format(token.daily_limit)}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Месячный лимит</span>
                                <span className={`font-medium ${
                                  monthlyPercentage >= 80 ? 'text-red-600' :
                                  monthlyPercentage >= 50 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {monthlyPercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    monthlyPercentage >= 80 ? 'bg-red-500' :
                                    monthlyPercentage >= 50 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Intl.NumberFormat('ru-RU').format(token.monthly_usage || 0)} / {new Intl.NumberFormat('ru-RU').format(token.monthly_limit)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row lg:flex-col gap-2 lg:w-32">
                        <button
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-all duration-150"
                          onClick={() => openEditModal(token)}
                          title="Редактировать токен"
                        >
                          <FiPlus size={16} className="rotate-45" />
                          Изменить
                        </button>

                        <button
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#6334E5]/10 border border-[#6334E5]/30 hover:bg-[#6334E5]/20 text-[#5028c2] text-sm font-medium rounded-lg transition-all duration-150"
                          onClick={() => openUsageModal(token)}
                          title="Просмотр статистики"
                        >
                          <FiPlus size={16} />
                          Статистика
                        </button>

                        <button
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-all duration-150"
                          onClick={() => openDeleteModal(token)}
                          title="Удалить токен"
                        >
                          <FiPlus size={16} className="rotate-45" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        {showAddModal && (
          <AddTokenModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddToken}
          />
        )}

        {showEditModal && selectedToken && (
          <EditTokenModal
            token={selectedToken}
            onClose={() => {
              setShowEditModal(false);
              setSelectedToken(null);
            }}
            onSave={(tokenData) => handleEditToken(selectedToken.id, tokenData)}
          />
        )}

        {showUsageModal && selectedToken && (
          <TokenUsageModal
            token={selectedToken}
            onClose={() => {
              setShowUsageModal(false);
              setSelectedToken(null);
            }}
          />
        )}

        {showDeleteModal && selectedToken && (
          <DeleteConfirmModal
            token={selectedToken}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedToken(null);
            }}
            onConfirm={() => handleDeleteToken(selectedToken.id)}
          />
        )}
      </div>
    </AdminDashboard>
  );
};

export default withAuth(AdminAITokensPage, { adminOnly: true });