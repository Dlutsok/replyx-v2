import { useRouter } from 'next/router';
import styles from '../../styles/layout/Sidebar.module.css';

// Профессиональные иконки для корпоративного интерфейса
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9"/>
    <rect x="14" y="3" width="7" height="5"/>
    <rect x="14" y="12" width="7" height="9"/>
    <rect x="3" y="16" width="7" height="5"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4"/>
    <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"/>
    <circle cx="9" cy="9" r="1"/>
    <circle cx="15" cy="9" r="1"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <path d="M1 10h22"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const SupportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const AdminIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    <polyline points="9,12 11,14 15,10"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);

export default function Sidebar({ isCollapsed, isOpen, isMobile, onToggle, onClose }) {
  const router = useRouter();

  // Получаем роль пользователя из localStorage
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') : null;

  // Группировка меню для лучшей навигации
  const menuGroups = [
    {
      title: 'Обзор',
      items: [
        { path: '/dashboard', name: 'Дашборд', icon: DashboardIcon, badge: null },
      ]
    },
    {
      title: 'Работа с ботами',
      items: [
        { path: '/dialogs', name: 'Диалоги', icon: ChatIcon, badge: null },
        { path: '/ai-assistant', name: 'AI Ассистент', icon: BotIcon, badge: null },
      ]
    },
    {
      title: 'Управление',
      items: [
        { path: '/balance', name: 'Баланс', icon: WalletIcon, badge: null },
        { path: '/usage', name: 'Аналитика', icon: AnalyticsIcon, badge: null },
        { path: '/help-center', name: 'Поддержка', icon: SupportIcon, badge: null },
      ]
    },
    // Админ группа - показываем только для администраторов
    ...(userRole === 'admin' ? [{
      title: 'Администрирование',
      items: [
        { path: '/admin', name: 'Админ панель', icon: AdminIcon, badge: null }
      ]
    }] : [])
  ];

  const isActive = (path) => router.pathname === path;

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobile && isOpen ? styles.open : ''}`}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.logo}>
          {!isCollapsed ? (
            <>
              <div className={styles.logoIcon}>
                <BotIcon />
              </div>
              <span className={styles.logoText}>ChatAI</span>
            </>
          ) : (
            <button 
              className={styles.toggleButtonCollapsed}
              onClick={onToggle}
              title="Развернуть меню"
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>
        
        {!isCollapsed && (
          <button 
            className={styles.toggleButton}
            onClick={onToggle}
            title="Свернуть меню"
          >
            <ChevronLeftIcon />
          </button>
        )}
      </div>

      {/* Меню с группировкой */}
      <nav className={styles.navigation}>
        {menuGroups.map((group, groupIndex) => (
          <div key={group.title} className={styles.menuGroup}>
            {!isCollapsed && (
              <h3 className={styles.groupTitle}>{group.title}</h3>
            )}
            <ul className={styles.menuList}>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.path} className={styles.menuItem}>
                    <button
                      className={`${styles.menuLink} ${isActive(item.path) ? styles.active : ''}`}
                      onClick={() => {
                        router.push(item.path);
                        if (isMobile && onClose) {
                          onClose();
                        }
                      }}
                      title={isCollapsed ? item.name : ''}
                    >
                      <IconComponent />
                      {!isCollapsed && (
                        <>
                          <span className={styles.menuText}>{item.name}</span>
                          {item.badge && (
                            <span className={styles.badge}>{item.badge}</span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </div>
  );
}