import { useState, useEffect } from 'react';
import { withAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import AdminDashboard from '@/components/layout/AdminDashboard';
import { 
  FiDollarSign, FiSearch, FiFilter, FiCalendar, FiUser, 
  FiCreditCard, FiEye, FiRefreshCw, FiDownload, FiTrendingUp
} from 'react-icons/fi';
import styles from '../styles/pages/AdminPayments.module.css';

const AdminPaymentsPage = () => {
  const { showSuccess, showError } = useNotifications();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchPaymentStats();
  }, [currentPage, statusFilter, periodFilter, searchTerm]);

  const fetchPayments = async () => {
    try {
      setIsLoadingPage(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 25,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(periodFilter !== 'all' && { period: periodFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/admin/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setPagination(data.pagination);
        setStats(data.stats);
        setErrorMessage('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.detail || 'Ошибка при загрузке платежей');
        showError('Ошибка при загрузке платежей');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setErrorMessage('Ошибка соединения с сервером');
      showError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
      setIsLoadingPage(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/payments/stats?period=30d', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        // Дополнительные статистики можно использовать в дашборде
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const viewPaymentDetails = async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedPayment(data);
        setShowDetailsModal(true);
      } else {
        showError('Ошибка при загрузке деталей платежа');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      showError('Ошибка при загрузке деталей платежа');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
      currency: 'RUB'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#10B981',
      pending: '#F59E0B',
      failed: '#EF4444',
      canceled: '#6B7280',
      expired: '#9CA3AF'
    };
    return colors[status] || '#6B7280';
  };

  const getStatusText = (status) => {
    const texts = {
      success: 'Успешно',
      pending: 'Ожидает',
      failed: 'Ошибка',
      canceled: 'Отменен',
      expired: 'Истек'
    };
    return texts[status] || status;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPeriodFilter('all');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (isLoading) {
    return (
      <AdminDashboard activeSection="payments">
        <div className={styles.loading}>
          <FiRefreshCw className={styles.loadingSpinner} />
          <p>Загрузка платежей...</p>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard activeSection="payments">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FiDollarSign size={24} />
            <h1>Финансовые операции</h1>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.refreshBtn}
              onClick={() => fetchPayments()}
              disabled={isLoadingPage}
            >
              <FiRefreshCw className={isLoadingPage ? styles.spinning : ''} />
              Обновить
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statsCard}>
              <div className={styles.statsIcon}>
                <FiDollarSign />
              </div>
              <div className={styles.statsContent}>
                <h3>Общий доход</h3>
                <p className={styles.statsValue}>
                  {formatCurrency(stats.total_revenue)}
                </p>
              </div>
            </div>
            <div className={styles.statsCard}>
              <div className={styles.statsIcon}>
                <FiTrendingUp />
              </div>
              <div className={styles.statsContent}>
                <h3>Успешные платежи</h3>
                <p className={styles.statsValue}>{stats.successful_payments}</p>
              </div>
            </div>
            <div className={styles.statsCard}>
              <div className={styles.statsIcon}>
                <FiCreditCard />
              </div>
              <div className={styles.statsContent}>
                <h3>Неуспешные</h3>
                <p className={styles.statsValue}>{stats.failed_payments}</p>
              </div>
            </div>
            <div className={styles.statsCard}>
              <div className={styles.statsIcon}>
                <FiCalendar />
              </div>
              <div className={styles.statsContent}>
                <h3>Ожидают</h3>
                <p className={styles.statsValue}>{stats.pending_payments}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск по email или номеру заказа"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label>Статус</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Все</option>
                <option value="success">Успешные</option>
                <option value="pending">Ожидают</option>
                <option value="failed">Неуспешные</option>
                <option value="canceled">Отмененные</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Период</label>
              <select 
                value={periodFilter} 
                onChange={(e) => setPeriodFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Все время</option>
                <option value="24h">За сутки</option>
                <option value="7d">За неделю</option>
                <option value="30d">За месяц</option>
                <option value="90d">За 3 месяца</option>
              </select>
            </div>
            
            <button 
              className={styles.resetFiltersBtn}
              onClick={resetFilters}
            >
              <FiFilter />
              Сбросить
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        {/* Payments Table */}
        <div className={styles.tableContainer}>
          {isLoadingPage && (
            <div className={styles.tableLoading}>
              <FiRefreshCw className={styles.loadingSpinner} />
            </div>
          )}
          
          <table className={styles.paymentsTable}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Сумма</th>
                <th>Способ оплаты</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className={styles.paymentRow}>
                  <td>
                    <div className={styles.dateCell}>
                      <span className={styles.primaryDate}>
                        {formatDate(payment.created_at)}
                      </span>
                      {payment.completed_at && payment.completed_at !== payment.created_at && (
                        <span className={styles.secondaryDate}>
                          Завершен: {formatDate(payment.completed_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userIcon}>
                        <FiUser />
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{payment.user_email}</span>
                        {payment.user_first_name && (
                          <span className={styles.userName}>{payment.user_first_name}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.amountCell}>
                      <span className={styles.amount}>
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className={styles.currency}>{payment.currency}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.methodCell}>
                      <FiCreditCard className={styles.methodIcon} />
                      <div className={styles.methodInfo}>
                        <span className={styles.methodName}>Тинькофф Банк</span>
                        {payment.card_mask && (
                          <span className={styles.cardMask}>**** {payment.card_mask}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className={styles.statusBadge}
                      style={{ 
                        backgroundColor: getStatusColor(payment.status),
                        color: 'white'
                      }}
                    >
                      {getStatusText(payment.status)}
                    </span>
                    {payment.tinkoff_status && payment.tinkoff_status !== payment.status && (
                      <div className={styles.tinkoffStatus}>
                        Тинькофф: {payment.tinkoff_status}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => viewPaymentDetails(payment.id)}
                        title="Просмотр деталей"
                      >
                        <FiEye />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {payments.length === 0 && !isLoadingPage && (
            <div className={styles.emptyState}>
              <FiDollarSign size={48} />
              <h3>Платежи не найдены</h3>
              <p>Попробуйте изменить фильтры поиска</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ←
            </button>
            
            <span className={styles.pageInfo}>
              Страница {currentPage} из {pagination.pages}
            </span>
            
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
            >
              →
            </button>
          </div>
        )}

        {/* Payment Details Modal */}
        {showDetailsModal && selectedPayment && (
          <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Детали платежа</h2>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={() => setShowDetailsModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalContent}>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailGroup}>
                    <h3>Информация о платеже</h3>
                    <div className={styles.detailRow}>
                      <span>Номер заказа:</span>
                      <strong>{selectedPayment.payment.order_id}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Сумма:</span>
                      <strong>{formatCurrency(selectedPayment.payment.amount)} {selectedPayment.payment.currency}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Статус:</span>
                      <span 
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(selectedPayment.payment.status) }}
                      >
                        {getStatusText(selectedPayment.payment.status)}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Описание:</span>
                      <span>{selectedPayment.payment.description}</span>
                    </div>
                  </div>
                  
                  <div className={styles.detailGroup}>
                    <h3>Информация о пользователе</h3>
                    {selectedPayment.user && (
                      <>
                        <div className={styles.detailRow}>
                          <span>Email:</span>
                          <strong>{selectedPayment.user.email}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Имя:</span>
                          <span>{selectedPayment.user.first_name || '-'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className={styles.detailGroup}>
                    <h3>Техническая информация</h3>
                    <div className={styles.detailRow}>
                      <span>ID Тинькофф:</span>
                      <span>{selectedPayment.payment.tinkoff_payment_id || '-'}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Создан:</span>
                      <span>{formatDate(selectedPayment.payment.created_at)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Завершен:</span>
                      <span>{formatDate(selectedPayment.payment.completed_at)}</span>
                    </div>
                    {selectedPayment.payment.error_message && (
                      <div className={styles.detailRow}>
                        <span>Ошибка:</span>
                        <span className={styles.errorText}>{selectedPayment.payment.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboard>
  );
};

export default withAuth(AdminPaymentsPage, { requireAdmin: true });