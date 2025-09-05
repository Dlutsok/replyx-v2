import { useState, useEffect } from 'react';
import { FiX, FiTrendingUp, FiTrendingDown, FiActivity, FiClock, FiCheckCircle, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';
import styles from '../../styles/components/TokenUsageModal.module.css';

const TokenUsageModal = ({ token, onClose }) => {
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    loadUsageData();
  }, [token.id, selectedPeriod]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const authToken = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/admin/ai-tokens/${token.id}/usage`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsageData(data || []);
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError('Не удалось загрузить статистику использования');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (usageData.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        successRate: 0,
        totalDays: 0,
        avgRequestsPerDay: 0,
        peakDay: null,
        trend: 'neutral'
      };
    }

    const totalRequests = usageData.reduce((sum, day) => sum + day.requests, 0);
    const totalTokens = usageData.reduce((sum, day) => sum + day.tokens, 0);
    const totalSuccessful = usageData.reduce((sum, day) => sum + day.successful_requests, 0);
    const avgResponseTime = usageData.reduce((sum, day) => sum + (day.avg_response_time || 0), 0) / usageData.length;
    
    const successRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;
    const avgRequestsPerDay = Math.round(totalRequests / Math.max(usageData.length, 1));
    
    // Find peak usage day
    const peakDay = usageData.reduce((peak, day) => 
      !peak || day.requests > peak.requests ? day : peak
    , null);

    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(usageData.length / 2);
    const firstHalf = usageData.slice(0, midpoint);
    const secondHalf = usageData.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.requests, 0) / Math.max(firstHalf.length, 1);
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.requests, 0) / Math.max(secondHalf.length, 1);
    
    let trend = 'neutral';
    const trendDiff = ((secondHalfAvg - firstHalfAvg) / Math.max(firstHalfAvg, 1)) * 100;
    if (trendDiff > 10) trend = 'up';
    else if (trendDiff < -10) trend = 'down';

    return {
      totalRequests,
      totalTokens,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      successRate: Math.round(successRate * 10) / 10,
      totalDays: usageData.length,
      avgRequestsPerDay,
      peakDay,
      trend,
      trendPercentage: Math.abs(Math.round(trendDiff))
    };
  };

  const stats = calculateStats();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ru-RU').format(num || 0);
  };

  const getMaxRequests = () => {
    return Math.max(...usageData.map(day => day.requests), 1);
  };

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up': return <FiTrendingUp className={styles.trendUp} />;
      case 'down': return <FiTrendingDown className={styles.trendDown} />;
      default: return <FiActivity className={styles.trendNeutral} />;
    }
  };

  const getTrendText = () => {
    switch (stats.trend) {
      case 'up': return `Рост на ${stats.trendPercentage}%`;
      case 'down': return `Снижение на ${stats.trendPercentage}%`;
      default: return 'Стабильное использование';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2 className={styles.modalTitle}>
              Статистика использования: {token.name}
            </h2>
            <div className={styles.tokenInfo}>
              <span className={styles.tokenId}>ID: {token.id}</span>
              <span className={styles.tokenStatus}>
                <FiCheckCircle className={styles.statusIcon} size={16} />
                {token.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage}>
              <FiAlertCircle size={20} />
              <span>{error}</span>
              <button onClick={loadUsageData} className={styles.retryBtn}>
                Повторить
              </button>
            </div>
          )}

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Загрузка статистики...</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <FiActivity size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>
                      {formatNumber(stats.totalRequests)}
                    </div>
                    <div className={styles.statLabel}>Всего запросов</div>
                    <div className={styles.statSubtext}>
                      ~{formatNumber(stats.avgRequestsPerDay)} в день
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <FiCheckCircle size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>
                      {stats.successRate}%
                    </div>
                    <div className={styles.statLabel}>Успешность</div>
                    <div className={styles.statSubtext}>
                      {formatNumber(stats.totalRequests - (stats.totalRequests * stats.successRate / 100))} ошибок
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <FiClock size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>
                      {stats.avgResponseTime}с
                    </div>
                    <div className={styles.statLabel}>Среднее время</div>
                    <div className={styles.statSubtext}>
                      Время ответа API
                    </div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    {getTrendIcon()}
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>
                      {formatNumber(stats.totalTokens)}
                    </div>
                    <div className={styles.statLabel}>Всего токенов</div>
                    <div className={styles.statSubtext}>
                      {getTrendText()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Chart */}
              <div className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    График использования за {stats.totalDays} дней
                  </h3>
                  {stats.peakDay && (
                    <div className={styles.peakInfo}>
                      Пик: {formatNumber(stats.peakDay.requests)} запросов 
                      ({formatDate(stats.peakDay.date)})
                    </div>
                  )}
                </div>

                <div className={styles.chart}>
                  {usageData.length > 0 ? (
                    <div className={styles.chartContainer}>
                      <div className={styles.chartBars}>
                        {usageData.map((day, index) => {
                          const height = (day.requests / getMaxRequests()) * 100;
                          return (
                            <div
                              key={day.date}
                              className={styles.chartBar}
                              style={{ height: `${height}%` }}
                              title={`${formatDate(day.date)}: ${formatNumber(day.requests)} запросов`}
                            >
                              <div className={styles.barFill} />
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className={styles.chartLabels}>
                        {usageData.map((day, index) => {
                          // Show only every 5th label to avoid crowding
                          if (index % Math.ceil(usageData.length / 6) === 0) {
                            return (
                              <div key={day.date} className={styles.chartLabel}>
                                {formatDate(day.date)}
                              </div>
                            );
                          }
                          return <div key={day.date} className={styles.chartLabel}></div>;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noData}>
                      <div className={styles.noDataIcon}>
                        <FiActivity size={48} />
                      </div>
                      <p>Нет данных за выбранный период</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Table */}
              <div className={styles.tableSection}>
                <h3 className={styles.sectionTitle}>Подробная статистика по дням</h3>
                
                <div className={styles.tableContainer}>
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Запросы</th>
                        <th>Токены</th>
                        <th>Успешные</th>
                        <th>Ошибки</th>
                        <th>Успешность</th>
                        <th>Ср. время</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageData.slice().reverse().map((day) => (
                        <tr key={day.date}>
                          <td className={styles.dateCell}>
                            {new Date(day.date).toLocaleDateString('ru-RU')}
                          </td>
                          <td className={styles.numberCell}>
                            {formatNumber(day.requests)}
                          </td>
                          <td className={styles.numberCell}>
                            {formatNumber(day.tokens)}
                          </td>
                          <td className={styles.numberCell}>
                            {formatNumber(day.successful_requests)}
                          </td>
                          <td className={styles.numberCell}>
                            {formatNumber(day.failed_requests)}
                          </td>
                          <td className={`${styles.percentCell} ${
                            day.success_rate >= 95 ? styles.successHigh :
                            day.success_rate >= 80 ? styles.successMedium : styles.successLow
                          }`}>
                            {day.success_rate}%
                          </td>
                          <td className={styles.timeCell}>
                            {day.avg_response_time ? `${day.avg_response_time}с` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {usageData.length === 0 && (
                    <div className={styles.emptyTable}>
                      <p>Нет данных для отображения</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeBtn} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
