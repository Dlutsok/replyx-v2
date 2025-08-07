import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/layout/DashboardLayout';
import HelpCenter from '../components/help/HelpCenter';
import styles from '../styles/pages/HelpCenterPage.module.css';

export default function HelpCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <span>Загрузка...</span>
        </div>
    );
  }

  return (
    <>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Центр помощи</h1>
          <p className={styles.pageSubtitle}>
            Все что нужно знать для работы с ChatAI - инструкции, руководства и полезные советы
          </p>
        </div>
        
        <HelpCenter user={user} />
      </div>
    </>
  );
} 