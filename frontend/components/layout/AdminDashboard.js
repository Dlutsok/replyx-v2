import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks';
import { 
  FiHome, FiUsers, FiBarChart, FiSettings, FiShield, FiCpu, 
  FiLogOut, FiMenu, FiX, FiMonitor, FiDollarSign, FiActivity,
  FiDatabase, FiZap, FiTrendingUp, FiUser
} from 'react-icons/fi';
import styles from '@/styles/layout/AdminDashboard.module.css';

const AdminDashboard = ({ children, activeSection = 'overview' }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: 'overview',
      label: 'Обзор',
      icon: FiHome,
      href: '/admin'
    },
    {
      id: 'users',
      label: 'Пользователи',
      icon: FiUsers,
      href: '/admin-users'
    },
    {
      id: 'analytics',
      label: 'Аналитика',
      icon: FiBarChart,
      href: '/admin-analytics'
    },
    {
      id: 'payments',
      label: 'Финансы',
      icon: FiDollarSign,
      href: '/admin-payments'
    },
    {
      id: 'bots-monitoring',
      label: 'Мониторинг ботов',
      icon: FiCpu,
      href: '/admin-bots-monitoring'
    },
    {
      id: 'ai-tokens',
      label: 'AI Токены',
      icon: FiZap,
      href: '/admin-ai-tokens'
    },
    {
      id: 'system',
      label: 'Система',
      icon: FiMonitor,
      href: '/admin-system'
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: FiSettings,
      href: '/admin-settings'
    }
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    router.push('/login');
  };

  const handleMenuItemClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={styles.adminDashboard}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <FiShield size={20} />
            {!sidebarCollapsed && <span>Admin Panel</span>}
          </div>
        </div>

        <div className={styles.adminInfo}>
          <div className={styles.adminAvatar}>
            <FiShield size={16} />
          </div>
          {!sidebarCollapsed && (
            <div className={styles.adminDetails}>
              <div className={styles.adminName}>
                {user?.first_name || user?.email?.split('@')[0] || 'Администратор'}
              </div>
              <div className={styles.adminRole}>
                Администратор системы
              </div>
            </div>
          )}
        </div>

        <nav className={styles.navigation}>
          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>
              {!sidebarCollapsed && 'Управление'}
            </div>
            {menuItems.slice(0, 5).map(item => (
              <Link key={item.id} href={item.href} onClick={handleMenuItemClick}>
                <div className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}>
                  <item.icon size={16} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>
              {!sidebarCollapsed && 'Мониторинг'}
            </div>
            {menuItems.slice(5, 7).map(item => (
              <Link key={item.id} href={item.href} onClick={handleMenuItemClick}>
                <div className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}>
                  <item.icon size={16} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>
              {!sidebarCollapsed && 'Конфигурация'}
            </div>
            {menuItems.slice(7).map(item => (
              <Link key={item.id} href={item.href} onClick={handleMenuItemClick}>
                <div className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}>
                  <item.icon size={16} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
            
            <div className={styles.logoutBtn} onClick={handleLogout}>
              <FiLogOut size={16} />
              {!sidebarCollapsed && <span>Выйти</span>}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`${styles.mainContainer} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <FiMenu size={20} />
        </button>

        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;