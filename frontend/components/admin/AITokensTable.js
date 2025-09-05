import { useState } from 'react';
import { FiEdit3, FiBarChart, FiTrash2, FiChevronUp, FiChevronDown, FiEye, FiEyeOff, FiCheckCircle, FiXCircle, FiKey } from 'react-icons/fi';
import styles from '../../styles/components/AITokensTable.module.css';

const AITokensTable = ({ tokens, onEdit, onDelete, onViewStats, loading }) => {
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleTokens, setVisibleTokens] = useState(new Set());

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleTokenVisibility = (tokenId) => {
    const newVisibleTokens = new Set(visibleTokens);
    if (newVisibleTokens.has(tokenId)) {
      newVisibleTokens.delete(tokenId);
    } else {
      newVisibleTokens.add(tokenId);
    }
    setVisibleTokens(newVisibleTokens);
  };

  const sortedTokens = [...tokens].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Special handling for different field types
    if (sortField === 'daily_usage_percentage' || sortField === 'monthly_usage_percentage') {
      aValue = calculateUsagePercentage(a, sortField.includes('daily') ? 'daily' : 'monthly');
      bValue = calculateUsagePercentage(b, sortField.includes('daily') ? 'daily' : 'monthly');
    } else if (sortField === 'models') {
      // Handle models array sorting
      aValue = (a.models || []).join(',');
      bValue = (b.models || []).join(',');
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const calculateUsagePercentage = (token, period) => {
    if (period === 'daily') {
      return token.daily_limit > 0 ? Math.round((token.daily_usage || 0) / token.daily_limit * 100) : 0;
    } else {
      return token.monthly_limit > 0 ? Math.round((token.monthly_usage || 0) / token.monthly_limit * 100) : 0;
    }
  };

  const getPriorityClass = (priority) => {
    if (priority <= 2) return styles.priorityHigh;
    if (priority <= 4) return styles.priorityMedium;
    return styles.priorityLow;
  };

  const getUsageClass = (percentage) => {
    if (percentage >= 80) return styles.usageCritical;
    if (percentage >= 50) return styles.usageWarning;
    return styles.usageNormal;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ru-RU').format(num || 0);
  };

  const maskToken = (token) => {
    if (!token) return '';
    return token.substring(0, 8) + '...' + token.substring(token.length - 4);
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className={`${styles.tableHeader} ${sortField === field ? styles.sorted : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className={styles.headerContent}>
        {children}
        <div className={styles.sortIcons}>
          <FiChevronUp 
            className={`${styles.sortIcon} ${sortField === field && sortDirection === 'asc' ? styles.active : ''}`}
          />
          <FiChevronDown 
            className={`${styles.sortIcon} ${sortField === field && sortDirection === 'desc' ? styles.active : ''}`}
          />
        </div>
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка токенов...</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <FiKey size={48} />
        </div>
        <h3>AI токены не найдены</h3>
        <p>Добавьте первый AI токен для начала работы с системой</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.tokensTable}>
          <thead>
            <tr>
              <SortableHeader field="id">ID</SortableHeader>
              <SortableHeader field="name">Название</SortableHeader>
              <th className={styles.tableHeader}>Токен</th>
              <SortableHeader field="models">Модели</SortableHeader>
              <SortableHeader field="daily_limit">Дневной лимит</SortableHeader>
              <SortableHeader field="monthly_limit">Месячный лимит</SortableHeader>
              <SortableHeader field="priority">Приоритет</SortableHeader>
              <SortableHeader field="is_active">Статус</SortableHeader>
              <th className={styles.tableHeader}>Использование</th>
              <th className={styles.tableHeader}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedTokens.map((token) => {
              const dailyPercentage = calculateUsagePercentage(token, 'daily');
              const monthlyPercentage = calculateUsagePercentage(token, 'monthly');
              const isTokenVisible = visibleTokens.has(token.id);

              return (
                <tr key={token.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <span className={styles.tokenId}>#{token.id}</span>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.tokenName}>
                      <span className={styles.nameText}>{token.name}</span>
                      {token.notes && (
                        <span className={styles.noteIndicator} title={token.notes}>
                          📝
                        </span>
                      )}
                    </div>
                  </td>

                  <td className={styles.tableCell}>
                    <div className={styles.tokenField}>
                      <code className={styles.tokenValue}>
                        {isTokenVisible ? token.token : maskToken(token.token)}
                      </code>
                      <button
                        className={styles.toggleTokenBtn}
                        onClick={() => toggleTokenVisibility(token.id)}
                        title={isTokenVisible ? 'Скрыть токен' : 'Показать токен'}
                      >
                        {isTokenVisible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.modelsCell}>
                      {(token.models || token.model_access?.split(',') || []).map((model, index) => (
                        <span key={index} className={styles.modelTag}>
                          {typeof model === 'string' ? model.trim() : model}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.limitInfo}>
                      <div className={styles.limitNumber}>
                        {formatNumber(token.daily_limit)}
                      </div>
                      <div className={styles.usageInfo}>
                        использовано: {formatNumber(token.daily_usage || 0)}
                      </div>
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.limitInfo}>
                      <div className={styles.limitNumber}>
                        {formatNumber(token.monthly_limit)}
                      </div>
                      <div className={styles.usageInfo}>
                        использовано: {formatNumber(token.monthly_usage || 0)}
                      </div>
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={`${styles.priorityBadge} ${getPriorityClass(token.priority)}`}>
                      <div className={styles.priorityDots}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`${styles.priorityDot} ${i < token.priority ? styles.active : ''}`}
                          />
                        ))}
                      </div>
                      <span className={styles.priorityNumber}>{token.priority}</span>
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <span
                      className={`${styles.statusBadge} ${
                        token.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {token.is_active ? (
                        <>
                          <FiCheckCircle size={14} />
                          Активен
                        </>
                      ) : (
                        <>
                          <FiXCircle size={14} />
                          Неактивен
                        </>
                      )}
                    </span>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.usageColumn}>
                      {/* Daily Usage Bar */}
                      <div className={styles.usageBar}>
                        <div className={styles.usageBarLabel}>
                          <span>Дневное:</span>
                          <span className={getUsageClass(dailyPercentage)}>
                            {dailyPercentage}%
                          </span>
                        </div>
                        <div className={styles.usageBarTrack}>
                          <div
                            className={`${styles.usageBarFill} ${getUsageClass(dailyPercentage)}`}
                            style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Monthly Usage Bar */}
                      <div className={styles.usageBar}>
                        <div className={styles.usageBarLabel}>
                          <span>Месячное:</span>
                          <span className={getUsageClass(monthlyPercentage)}>
                            {monthlyPercentage}%
                          </span>
                        </div>
                        <div className={styles.usageBarTrack}>
                          <div
                            className={`${styles.usageBarFill} ${getUsageClass(monthlyPercentage)}`}
                            style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className={styles.tableCell}>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => onEdit(token)}
                        title="Редактировать токен"
                      >
                        <FiEdit3 size={16} />
                      </button>
                      
                      <button
                        className={`${styles.actionBtn} ${styles.statsBtn}`}
                        onClick={() => onViewStats(token)}
                        title="Просмотр статистики"
                      >
                        <FiBarChart size={16} />
                      </button>
                      
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => onDelete(token)}
                        title="Удалить токен"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className={styles.tableFooter}>
        <div className={styles.recordsInfo}>
          Показано: <strong>{sortedTokens.length}</strong> из <strong>{tokens.length}</strong> токенов
        </div>
        
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.usageNormal}`}></div>
            <span>Использование &lt; 50%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.usageWarning}`}></div>
            <span>Использование 50-80%</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.usageCritical}`}></div>
            <span>Использование &gt; 80%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITokensTable;