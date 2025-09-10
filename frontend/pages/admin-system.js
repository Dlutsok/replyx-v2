import { useState, useEffect } from 'react';
import AdminDashboard from '@/components/layout/AdminDashboard';
import SystemHealthHeader from '../components/admin/SystemHealthHeader';
import SystemHealthOverview from '../components/admin/SystemHealthOverview';
import SystemTabs from '../components/admin/SystemTabs';
import PerformanceMetrics from '../components/admin/PerformanceMetrics';
import LogsManager from '../components/admin/LogsManager';
import DatabaseMonitor from '../components/admin/DatabaseMonitor';
import CacheManager from '../components/admin/CacheManager';
import TasksMonitor from '../components/admin/TasksMonitor';
import { useAuth } from '@/hooks';
import { useSystemHealth } from '../hooks/useSystemHealth';
import styles from '../styles/pages/AdminSystem.module.css';

const AdminSystemPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('health');
  const { healthData, isLoading, error, refetch, lastUpdated } = useSystemHealth({
    autoRefresh: true,
    interval: 30000 // 30 секунд
  });
  

  // Проверка прав доступа
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  const handleRefresh = () => {
    refetch();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'health':
        return (
          <>
            <div className={styles.metricsSection}>
              <PerformanceMetrics autoRefresh={true} />
            </div>
          </>
        );
      case 'logs':
        return (
          <div className={styles.tabContent}>
            <LogsManager />
          </div>
        );
      case 'database':
        return (
          <div className={styles.tabContent}>
            <DatabaseMonitor autoRefresh={true} />
          </div>
        );
      case 'cache':
        return (
          <div className={styles.tabContent}>
            <CacheManager autoRefresh={true} />
          </div>
        );
      case 'tasks':
        return (
          <div className={styles.tabContent}>
            <TasksMonitor autoRefresh={true} />
          </div>
        );
      default:
        return null;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className={styles.accessDenied}>
        <div className={styles.accessMessage}>
          <h2>Доступ запрещен</h2>
          <p>У вас нет прав для доступа к системному мониторингу.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard activeSection="system">
      <div className={styles.systemPage}>
        <SystemHealthHeader 
          status={healthData?.status || 'unknown'}
          lastUpdated={healthData?.timestamp}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
        
        <div className={styles.content}>
          <SystemHealthOverview 
            data={healthData}
            isLoading={isLoading}
            error={error}
          />
          
          <SystemTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          {renderTabContent()}
        </div>
      </div>
    </AdminDashboard>
  );
};

// Защищаем страницу от неавторизованного доступа
export default function ProtectedAdminSystemPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className={styles.accessDenied}>
        <div className={styles.accessMessage}>
          <h2>Доступ запрещен</h2>
          <p>Необходимы права администратора для доступа к системному мониторингу.</p>
        </div>
      </div>
    );
  }

  return <AdminSystemPage />;
}