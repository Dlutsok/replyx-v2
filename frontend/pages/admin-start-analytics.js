import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiEye, 
  FiTarget,
  FiBarChart3,
  FiClock,
  FiFilter,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi';
import AdminDashboard from '../components/layout/AdminDashboard';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config/api';
import styles from '../styles/pages/AdminStartAnalytics.module.css';

const AdminStartAnalyticsPage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [analytics, setAnalytics] = useState(null);
  const [funnelAnalysis, setFunnelAnalysis] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    days: 7,
    eventType: 'all'
  });

  // Проверка доступа администратора
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Загрузка аналитики
  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Загружаем основную аналитику
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [analyticsRes, funnelRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/api/start/analytics/overview?days=${filters.days}`, { headers }),
        fetch(`${API_URL}/api/start/analytics/funnel?days=${filters.days}`, { headers }),
        fetch(`${API_URL}/api/start/analytics/events?days=${filters.days}&limit=50&event_type=${filters.eventType === 'all' ? '' : filters.eventType}`, { headers })
      ]);

      const analyticsData = await analyticsRes.json();
      const funnelData = await funnelRes.json();
      const eventsData = await eventsRes.json();

      setAnalytics(analyticsData);
      setFunnelAnalysis(funnelData);
      setRecentEvents(eventsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Ошибка загрузки аналитики');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAnalytics();
    }
  }, [user, filters]);

  // Обработчик изменения фильтров
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Экспорт данных
  const exportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/start/analytics/events?days=${filters.days}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const blob = new Blob([JSON.stringify(recentEvents, null, 2)], { 
        type: 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `start-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  if (loading || !user) {
    return <div>Загрузка...</div>;
  }

  if (user.role !== 'admin') {
    return <div>Доступ запрещен</div>;
  }

  return (
    <AdminDashboard activeSection="start-analytics">
      <Head>
        <title>Аналитика страницы /start - Админ панель</title>
        <meta name="description" content="Аналитика онбординга пользователей на странице /start" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.adminContent}>
        {/* Header */}
        <div className={styles.adminHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.adminTitle}>
              <FiBarChart3 />
              Аналитика страницы /start
            </h1>
            <p className={styles.adminSubtitle}>
              Отслеживание онбординга пользователей и конверсии по шагам
            </p>
          </div>
          <div className={styles.headerRight}>
            <button
              onClick={loadAnalytics}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              <FiRefreshCw className={isLoading ? styles.spinning : ''} />
              Обновить
            </button>
            <button
              onClick={exportData}
              className={styles.exportButton}
            >
              <FiDownload />
              Экспорт
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>
              <FiClock />
              Период:
            </label>
            <select 
              value={filters.days}
              onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
            >
              <option value={1}>Последний день</option>
              <option value={7}>Последняя неделя</option>
              <option value={30}>Последний месяц</option>
              <option value={90}>Последние 3 месяца</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>
              <FiFilter />
              Тип событий:
            </label>
            <select 
              value={filters.eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
            >
              <option value="all">Все события</option>
              <option value="page_view">Просмотры страницы</option>
              <option value="step_click">Клики по шагам</option>
              <option value="step_complete">Завершения шагов</option>
              <option value="task_action">Действия пользователей</option>
            </select>
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка аналитики...</p>
          </div>
        ) : analytics && (
          <>
            {/* Key Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>
                  <FiEye />
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {analytics.total_page_views?.toLocaleString() || '0'}
                  </div>
                  <div className={styles.metricLabel}>Просмотров страницы</div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>
                  <FiUsers />
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {analytics.unique_sessions?.toLocaleString() || '0'}
                  </div>
                  <div className={styles.metricLabel}>Уникальных сессий</div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>
                  <FiClock />
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {analytics.average_time_on_page ? 
                      `${Math.round(analytics.average_time_on_page / 60)}м ${Math.round(analytics.average_time_on_page % 60)}с` : 
                      '0м 0с'
                    }
                  </div>
                  <div className={styles.metricLabel}>Среднее время на странице</div>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>
                  <FiTarget />
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {funnelAnalysis?.full_completion_rate?.toFixed(1) || '0.0'}%
                  </div>
                  <div className={styles.metricLabel}>Полная конверсия</div>
                </div>
              </div>
            </div>

            {/* Funnel Analysis */}
            {funnelAnalysis && (
              <div className={styles.analysisSection}>
                <h2>Анализ воронки</h2>
                <div className={styles.funnelChart}>
                  <div className={styles.funnelStep}>
                    <div className={styles.funnelStepBar} style={{ width: '100%' }}>
                      <span>Всего сессий: {funnelAnalysis.total_sessions}</span>
                    </div>
                  </div>
                  
                  {[1, 2, 3, 4].map(stepId => {
                    const views = funnelAnalysis[`step_${stepId}_views`] || 0;
                    const completions = funnelAnalysis[`step_${stepId}_completion`] || 0;
                    const viewsPercent = funnelAnalysis.total_sessions > 0 ? 
                      (views / funnelAnalysis.total_sessions * 100) : 0;
                    const completionsPercent = views > 0 ? (completions / views * 100) : 0;

                    return (
                      <div key={stepId} className={styles.funnelStep}>
                        <div 
                          className={styles.funnelStepBar}
                          style={{ width: `${Math.max(viewsPercent, 10)}%` }}
                        >
                          <span>
                            Шаг {stepId}: {views} просмотров, {completions} завершений
                            ({completionsPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Steps Completion Chart */}
            <div className={styles.analysisSection}>
              <h2>Статистика по шагам</h2>
              <div className={styles.stepsGrid}>
                {Object.entries(analytics.steps_completion || {}).map(([stepId, count]) => {
                  const conversionRate = analytics.conversion_rate?.[stepId] || 0;
                  const dropOffRate = analytics.drop_off_rate?.[stepId] || 0;

                  return (
                    <div key={stepId} className={styles.stepCard}>
                      <h3>Шаг {stepId}</h3>
                      <div className={styles.stepMetrics}>
                        <div className={styles.stepMetric}>
                          <span className={styles.stepMetricValue}>{count}</span>
                          <span className={styles.stepMetricLabel}>Завершений</span>
                        </div>
                        <div className={styles.stepMetric}>
                          <span className={styles.stepMetricValue}>{conversionRate.toFixed(1)}%</span>
                          <span className={styles.stepMetricLabel}>Конверсия</span>
                        </div>
                        <div className={styles.stepMetric}>
                          <span className={styles.stepMetricValue}>{dropOffRate.toFixed(1)}%</span>
                          <span className={styles.stepMetricLabel}>Отсев</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Actions */}
            {analytics.most_popular_actions && analytics.most_popular_actions.length > 0 && (
              <div className={styles.analysisSection}>
                <h2>Популярные действия</h2>
                <div className={styles.actionsList}>
                  {analytics.most_popular_actions.map((action, index) => (
                    <div key={index} className={styles.actionItem}>
                      <span className={styles.actionName}>{action.action}</span>
                      <span className={styles.actionCount}>{action.count} раз</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events */}
            <div className={styles.analysisSection}>
              <h2>Последние события</h2>
              <div className={styles.eventsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>Сессия</th>
                      <th>Пользователь</th>
                      <th>Тип события</th>
                      <th>Шаг</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td>{new Date(event.created_at).toLocaleString('ru-RU')}</td>
                        <td className={styles.sessionId}>
                          {event.session_id.substring(0, 12)}...
                        </td>
                        <td>{event.user_id || 'Анонимный'}</td>
                        <td>
                          <span className={`${styles.eventType} ${styles[event.event_type.replace('_', '')]}`}>
                            {event.event_type}
                          </span>
                        </td>
                        <td>{event.step_id || '-'}</td>
                        <td>{event.action_type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminDashboard>
  );
};

export default AdminStartAnalyticsPage;