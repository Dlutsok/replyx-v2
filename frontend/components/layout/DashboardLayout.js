import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Sidebar, Header } from '@/components/layout';
import { WelcomeBonusNotification } from '@/components/ui';
import { PageTransition } from '@/components/common';

import styles from '@/styles/layout/DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Определяем мобильное устройство
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleCloseMobileSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar
        isCollapsed={true}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={handleCloseMobileSidebar}
      />

      {/* Мобильный оверлей */}
      {isMobile && sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={handleCloseMobileSidebar}
        />
      )}

      <div className={`${styles.mainContainer} ${styles.sidebarCollapsed}`}>
        <Header
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className={styles.mainContent}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <WelcomeBonusNotification />
    </div>
  );
}
 