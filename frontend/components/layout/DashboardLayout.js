import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
import FloatingAIChat from '../ui/FloatingAIChat';
import WelcomeBonusNotification from '../ui/WelcomeBonusNotification';
import styles from '../../styles/layout/DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Определяем мобильное устройство
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Получаем состояние сайдбара из localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }

    // Слушаем изменения в localStorage
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      const newCollapsed = !sidebarCollapsed;
      setSidebarCollapsed(newCollapsed);
      localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
    }
  };
  
  const handleCloseMobileSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onToggle={handleToggleSidebar}
        onClose={handleCloseMobileSidebar}
      />
      
      {/* Мобильный оверлей */}
      {isMobile && sidebarOpen && (
        <div 
          className={styles.overlay}
          onClick={handleCloseMobileSidebar}
        />
      )}
      
      <div className={`${styles.mainContainer} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        <Header 
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
        />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
      <FloatingAIChat />
      <WelcomeBonusNotification />
    </div>
  );
}
 