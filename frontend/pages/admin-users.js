import { useState, useEffect } from 'react';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '../components/layout/AdminDashboard';
import { 
  FiUsers, FiSearch, FiFilter, FiDollarSign, FiCalendar, FiMail, 
  FiEdit, FiTrash2, FiUserCheck, FiUserX
} from 'react-icons/fi';
import styles from '../styles/pages/AdminUsers.module.css';

const AdminUsersPage = () => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState({
    first_name: '',
    role: '',
    status: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Error fetching users:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Фильтр по поиску
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleBalanceAdjustment = async () => {
    if (!selectedUser || !balanceAmount) {
      setErrorMessage('Пожалуйста, укажите сумму для корректировки');
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) {
      setErrorMessage('Сумма должна быть числом');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance/topup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          description: balanceDescription || `Ручное ${amount > 0 ? 'пополнение' : 'списание'} администратором`
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Обновляем список пользователей
        await fetchUsers();
        setShowBalanceModal(false);
        setBalanceAmount('');
        setBalanceDescription('');
        setSelectedUser(null);
        setErrorMessage('');
        
        // Показываем успешное сообщение
        showSuccess(`Баланс успешно обновлен. Новый баланс: ${result.new_balance}₽`);
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || 'Не удалось обновить баланс');
      }
    } catch (error) {
      console.error('Error adjusting balance:', error);
      setErrorMessage('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editUserData)
      });

      if (response.ok) {
        await fetchUsers();
        setShowEditModal(false);
        setSelectedUser(null);
        setEditUserData({ first_name: '', role: '', status: '' });
        setErrorMessage('');
        showSuccess('Пользователь успешно обновлен!');
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || 'Не удалось обновить пользователя');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    // Используем простой confirm для критически важных действий
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.email}? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchUsers();
        showSuccess('Пользователь успешно удален!');
      } else {
        const error = await response.json();
        showError(`Ошибка: ${error.detail || 'Не удалось удалить пользователя'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Ошибка при удалении пользователя');
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchUsers();
        showSuccess(`Пользователь ${newStatus === 'active' ? 'активирован' : 'заморожен'}!`);
      } else {
        const error = await response.json();
        showError(`Ошибка: ${error.detail || 'Не удалось изменить статус'}`);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      showError('Ошибка при изменении статуса');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditUserData({
      first_name: user.first_name || '',
      role: user.role,
      status: user.status
    });
    setShowEditModal(true);
    setErrorMessage('');
  };


  if (isLoading) {
    return (
      <AdminDashboard activeSection="users">
        <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600 font-medium">Загрузка пользователей...</p>
          </div>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard activeSection="users">
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8">
        {/* Page Header - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - заголовок и статистика */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiUsers className="text-gray-600" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight mb-2">
                    Управление пользователями
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Всего пользователей: {users.length} • Активных: {users.filter(u => u.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

                {/* Filters - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Search Box */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по email или имени..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</label>
                <div className="relative">
                  <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150 min-w-[140px]"
                  >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users List - Minimal Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FiUsers className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Пользователи не найдены</h3>
              <p className="text-sm text-gray-600 text-center">Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-150">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 font-semibold text-sm">
                          {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {user.first_name || 'Без имени'}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FiMail size={12} />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                      </div>
                    </div>

                    {/* Status & Balance */}
                    <div className="flex flex-col sm:flex-row gap-3 lg:gap-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Баланс</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(user.balance || 0)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Регистрация</span>
                        <span className="text-xs text-gray-600">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-shrink-0">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-all duration-150"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowBalanceModal(true);
                        }}
                        title="Пополнить баланс"
                      >
                        <FiDollarSign size={12} />
                        Баланс
                      </button>

                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium rounded-lg transition-all duration-150"
                        onClick={() => openEditModal(user)}
                        title="Редактировать пользователя"
                      >
                        <FiEdit size={12} />
                        Изменить
                      </button>

                      <button
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                          user.status === 'active'
                            ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                        }`}
                        onClick={() => toggleUserStatus(user)}
                        title={user.status === 'active' ? 'Заморозить' : 'Активировать'}
                      >
                        {user.status === 'active' ? <FiUserX size={12} /> : <FiUserCheck size={12} />}
                        {user.status === 'active' ? 'Заморозить' : 'Активировать'}
                      </button>

                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-medium rounded-lg transition-all duration-150"
                        onClick={() => handleDeleteUser(user)}
                        title="Удалить пользователя"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balance Modal - Minimal Style */}
        {showBalanceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Корректировка баланса</h3>
                <button
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  onClick={() => {
                    setShowBalanceModal(false);
                    setSelectedUser(null);
                    setBalanceAmount('');
                    setBalanceDescription('');
                    setErrorMessage('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-gray-900">{selectedUser?.first_name || 'Пользователь'}</div>
                  <div className="text-sm text-gray-600">{selectedUser?.email}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Текущий баланс: <span className="font-medium">{formatCurrency(selectedUser?.balance || 0)}</span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium text-gray-700">Сумма (₽)</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="Введите сумму (+ для пополнения, - для списания)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                  />
                  <p className="text-xs text-gray-500">Положительное число - пополнение, отрицательное - списание</p>
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-gray-700">Описание операции</label>
                  <input
                    id="description"
                    type="text"
                    value={balanceDescription}
                    onChange={(e) => setBalanceDescription(e.target.value)}
                    placeholder="Причина корректировки баланса"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                  />
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <span className="text-red-600 mt-0.5">⚠️</span>
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-200 justify-end">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-150"
                  onClick={() => {
                    setShowBalanceModal(false);
                    setSelectedUser(null);
                    setBalanceAmount('');
                    setBalanceDescription('');
                    setErrorMessage('');
                  }}
                >
                  Отмена
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleBalanceAdjustment}
                  disabled={!balanceAmount || isSubmitting}
                >
                  {isSubmitting ? '⏳ Обработка...' : 'Применить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal - Minimal Style */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Редактирование пользователя</h3>
                <button
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditUserData({ first_name: '', role: '', status: '' });
                    setErrorMessage('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* User Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-gray-900">{selectedUser?.first_name || 'Пользователь'}</div>
                  <div className="text-sm text-gray-600">{selectedUser?.email}</div>
                  <div className="text-sm text-gray-600 mt-1">ID: {selectedUser?.id}</div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <span className="text-red-600 mt-0.5">⚠️</span>
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                )}

                {/* Name Input */}
                <div className="space-y-2">
                  <label htmlFor="edit_first_name" className="text-sm font-medium text-gray-700">Имя</label>
                  <input
                    id="edit_first_name"
                    type="text"
                    value={editUserData.first_name}
                    onChange={(e) => setEditUserData({...editUserData, first_name: e.target.value})}
                    placeholder="Введите имя пользователя"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                  />
                </div>

                {/* Role Select */}
                <div className="space-y-2">
                  <label htmlFor="edit_role" className="text-sm font-medium text-gray-700">Роль</label>
                  <select
                    id="edit_role"
                    value={editUserData.role}
                    onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                {/* Status Select */}
                <div className="space-y-2">
                  <label htmlFor="edit_status" className="text-sm font-medium text-gray-700">Статус</label>
                  <select
                    id="edit_status"
                    value={editUserData.status}
                    onChange={(e) => setEditUserData({...editUserData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-200 justify-end">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-150"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditUserData({ first_name: '', role: '', status: '' });
                    setErrorMessage('');
                  }}
                >
                  Отмена
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleEditUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '⏳ Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboard>
  );
};

export default withAuth(AdminUsersPage, { adminOnly: true });