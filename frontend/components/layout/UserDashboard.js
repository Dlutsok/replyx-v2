import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiMessageSquare, FiBarChart, FiUser, FiSettings, FiHelpCircle, 
  FiLogOut, FiCreditCard, FiZap, FiMenu, FiX, FiHome, FiCpu
} from 'react-icons/fi';
import styles from '../../styles/layout/UserDashboard.module.css';

const UserDashboard = ({ children, activeSection = 'dashboard' }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Главная',
      icon: FiHome,
      href: '/dashboard'
    },
    {
      id: 'ai-assistant',
      label: 'AI Ассистент',
      icon: FiCpu,
      href: '/ai-assistant'
    },
    {
      id: 'dialogs',
      label: 'Диалоги',
      icon: FiMessageSquare,
      href: '/dialogs'
    },

    {
      id: 'tokens',
      label: 'Токены',
      icon: FiZap,
      href: '/ai-tokens'
    },

  ];

  const bottomMenuItems = [
    {
      id: 'balance',
      label: 'Баланс',
      icon: FiCreditCard,
      href: '/balance'
    },
    {
      id: 'help',
      label: 'Помощь',
      icon: FiHelpCircle,
      href: '/help-center'
    }
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <FiZap size={24} />
            {!sidebarCollapsed && <span>ChatAI</span>}
          </div>
          <button 
            className={styles.toggleBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
          </button>
        </div>

        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <FiUser size={20} />
          </div>
          {!sidebarCollapsed && (
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user?.first_name || user?.email?.split('@')[0] || 'Пользователь'}
              </div>
              <div className={styles.userPlan}>
                {user?.plan === 'free' ? 'Бесплатный' : 
                 user?.plan === 'pro' ? 'Профессиональный' : 
                 user?.plan === 'business' ? 'Бизнес' : 'Базовый'} план
              </div>
            </div>
          )}
        </div>

        <nav className={styles.navigation}>
          <div className={styles.navSection}>
            {menuItems.map(item => (
              <Link key={item.id} href={item.href}>
                <div className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}>
                  <item.icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionDivider}></div>
            {bottomMenuItems.map(item => (
              <Link key={item.id} href={item.href}>
                <div className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}>
                  <item.icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
            
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <FiLogOut size={20} />
              {!sidebarCollapsed && <span>Выйти</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`${styles.mainContainer} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;