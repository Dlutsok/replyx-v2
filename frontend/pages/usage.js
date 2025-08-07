import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/pages/Usage.module.css';
import DashboardLayout from '../components/layout/DashboardLayout';
import { 
  FiMessageSquare, FiFileText, FiCreditCard, FiTrendingUp, 
  FiFilter, FiDownload, FiCalendar, FiSearch, FiActivity,
  FiUsers, FiZap, FiDollarSign, FiClock,
  FiArrowUp, FiArrowDown, FiLoader, FiRefreshCw
} from 'react-icons/fi';

function Usage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    avgPerTransaction: 0,
    thisMonth: 0
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    period: '30',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Типы операций для фильтра
  const operationTypes = [
    { value: 'all', label: 'Все операции', icon: FiActivity },
    { value: 'ai_message', label: 'AI сообщения', icon: FiMessageSquare },
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
  }, []);

  // Применение фильтров
  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadUsageData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/balance/transactions/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        calculateStats(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Ошибка загрузки данных:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
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
      avgPerTransaction: spendingTransactions.length > 0 ? totalSpent / spendingTransactions.length : 0,
      thisMonth: thisMonthSpent
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Фильтр по типу
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filters.type);
    }

    // Фильтр по периоду
    if (filters.period !== 'all') {
      const days = parseInt(filters.period);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(t => new Date(t.created_at) >= cutoffDate);
    }

    // Поиск
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchLower) ||
        t.related_info?.message_text?.toLowerCase().includes(searchLower) ||
        t.related_info?.filename?.toLowerCase().includes(searchLower) ||
        t.related_info?.dialog_info?.user_email?.toLowerCase().includes(searchLower) ||
        t.related_info?.dialog_info?.telegram_username?.toLowerCase().includes(searchLower)
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (filters.sortBy) {
        case 'date':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'amount':
          aVal = Math.abs(a.amount);
          bVal = Math.abs(b.amount);
          break;
        case 'type':
          aVal = a.transaction_type;
          bVal = b.transaction_type;
          break;
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }

      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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

  const exportData = () => {
    const csv = [
      ['Дата', 'Тип', 'Сумма', 'Описание', 'Баланс после'].join(','),
      ...filteredTransactions.map(t => [
        formatDate(t.created_at),
        getOperationLabel(t.transaction_type),
        t.amount,
        t.description || '',
        t.balance_after
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usage_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FiLoader className={styles.spinner} />
        <span>Загрузка данных об использовании...</span>
      </div>
    );
  }

  return (
    <div className={styles.usagePage}>
      {/* Управление страницей */}
      <div className={styles.pageControls}>
        <h1 className={styles.pageTitle}>Использование сервиса</h1>
        <div className={styles.pageActions}>
          
          <button 
            className={styles.exportButton}
            onClick={exportData}
            title="Экспорт в CSV"
          >
            <FiDownload />
            Экспорт
          </button>
        </div>
      </div>

      {/* Статистические карточки */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <FiDollarSign className={styles.statCardIcon} />
            <span className={styles.statCardTitle}>Всего потрачено</span>
          </div>
          <div className={styles.statCardValue}>{stats.totalSpent.toFixed(2)} ₽</div>
          <div className={styles.statCardChange}>
            За все время использования
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <FiActivity className={styles.statCardIcon} />
            <span className={styles.statCardTitle}>Операций</span>
          </div>
          <div className={styles.statCardValue}>{stats.totalTransactions}</div>
          <div className={styles.statCardChange}>
            Общее количество операций
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <FiTrendingUp className={styles.statCardIcon} />
            <span className={styles.statCardTitle}>Средний чек</span>
          </div>
          <div className={styles.statCardValue}>{stats.avgPerTransaction.toFixed(2)} ₽</div>
          <div className={styles.statCardChange}>
            На одну операцию
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <FiCalendar className={styles.statCardIcon} />
            <span className={styles.statCardTitle}>Этот месяц</span>
          </div>
          <div className={styles.statCardValue}>{stats.thisMonth.toFixed(2)} ₽</div>
          <div className={styles.statCardChange}>
            Потрачено в этом месяце
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className={styles.filtersSection}>
        <div className={styles.searchContainer}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Поиск по операциям..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterControls}>
          <button
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter />
            Фильтры
          </button>

          <select
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className={styles.filterSelect}
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className={styles.expandedFilters}>
          <div className={styles.filterGroup}>
            <label>Тип операции:</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className={styles.filterSelect}
            >
              {operationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Сортировка:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="date">По дате</option>
              <option value="amount">По сумме</option>
              <option value="type">По типу</option>
            </select>

            <button
              className={styles.sortOrderButton}
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {filters.sortOrder === 'desc' ? <FiArrowDown /> : <FiArrowUp />}
            </button>
          </div>
        </div>
      )}

      {/* Таблица транзакций */}
      <div className={styles.transactionsSection}>
        <div className={styles.sectionHeader}>
          <h2>Детализация операций</h2>
          <span className={styles.resultsCount}>
            {filteredTransactions.length} операций
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className={styles.emptyState}>
            <FiActivity className={styles.emptyStateIcon} />
            <h3>Операции не найдены</h3>
            <p>Попробуйте изменить параметры фильтрации</p>
          </div>
        ) : (
          <div className={styles.transactionsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderCell}>Операция</div>
              <div className={styles.tableHeaderCell}>Детали</div>
              <div className={styles.tableHeaderCell}>Дата</div>
              <div className={styles.tableHeaderCell}>Сумма</div>
              <div className={styles.tableHeaderCell}>Баланс</div>
            </div>

            <div className={styles.tableBody}>
              {filteredTransactions.map((transaction) => {
                const IconComponent = getOperationIcon(transaction.transaction_type);
                
                return (
                  <div key={transaction.id} className={styles.tableRow}>
                    <div className={styles.tableCell}>
                      <div className={styles.operationInfo}>
                        <div className={`${styles.operationIcon} ${styles[transaction.transaction_type]}`}>
                          <IconComponent />
                        </div>
                        <div className={styles.operationDetails}>
                          <div className={styles.operationType}>
                            {getOperationLabel(transaction.transaction_type)}
                          </div>
                          <div className={styles.operationDescription}>
                            {transaction.description}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.tableCell}>
                      {transaction.related_info && (
                        <div className={styles.relatedDetails}>
                          {transaction.related_info.type === 'message' && (
                            <>
                              <div className={styles.messagePreview}>
                                {`"${transaction.related_info.message_text}"`}
                              </div>
                              {transaction.related_info.dialog_info && (
                                <div className={styles.userInfo}>
                                  {transaction.related_info.dialog_info.telegram_username ? (
                                    <>👤 @{transaction.related_info.dialog_info.telegram_username}</>
                                  ) : (
                                    <>📧 {transaction.related_info.dialog_info.user_email}</>
                                  )}
                                  {transaction.related_info.dialog_info.telegram_chat_id && (
                                    <span className={styles.channelBadge}>Telegram</span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          
                          {transaction.related_info.type === 'document' && (
                            <div className={styles.documentInfo}>
                              📄 {transaction.related_info.filename}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.tableCell}>
                      <div className={styles.dateInfo}>
                        <div className={styles.dateMain}>
                          {formatDate(transaction.created_at)}  
                        </div>
                      </div>
                    </div>

                    <div className={styles.tableCell}>
                      <div className={`${styles.amount} ${transaction.amount > 0 ? styles.positive : styles.negative}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} ₽
                      </div>
                    </div>

                    <div className={styles.tableCell}>
                      <div className={styles.balance}>
                        {transaction.balance_after} ₽
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsagePage() {
  return <Usage />;
} 