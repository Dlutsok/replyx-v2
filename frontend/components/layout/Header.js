import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/layout/Header.module.css';
import { FiUser, FiBell, FiMenu, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import BalanceDropdown from '../ui/BalanceDropdown';
import ProfileDropdown from '../ui/ProfileDropdown';
import ChangePasswordModal from '../ui/ChangePasswordModal';

export default function Header({ isMobile, sidebarOpen, setSidebarOpen }) {
  const [userBalance, setUserBalance] = useState(0);
  const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Получение заголовка страницы и breadcrumbs
  const getPageInfo = () => {
    const path = router.pathname;
    const pathMap = {
      '/dashboard': { title: 'Дашборд', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }] },
      '/start': { title: 'Настройка', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'Настройка', path: '/start' }] },
      '/dialogs': { title: 'Диалоги', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'Диалоги', path: '/dialogs' }] },
      '/ai-assistant': { title: 'AI Ассистент', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'AI Ассистент', path: '/ai-assistant' }] },
      '/balance': { title: 'Баланс', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'Баланс', path: '/balance' }] },
      '/usage': { title: 'Расходы', breadcrumbs: [{ name: 'Расходы', path: '/usage' }] },
      '/help-center': { title: 'Поддержка', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'Поддержка', path: '/help-center' }] },
      '/admin': { title: 'Админ панель', breadcrumbs: [{ name: 'Главная', path: '/dashboard' }, { name: 'Админ панель', path: '/admin' }] }
    };
    return pathMap[path] || { title: 'ReplyX', breadcrumbs: [] };
  };

  // Определение статуса баланса для цветовой индикации
  const getBalanceStatus = () => {
    if (userBalance < 100) return 'low'; // Меньше чем на 1 день (5₽ * 20 запросов)
    if (userBalance < 500) return 'medium'; // Меньше чем на 5 дней
    return 'good'; // Больше 5 дней
  };

  useEffect(() => {
    // Получаем данные пользователя
    const token = localStorage.getItem('token');
    if (token) {
      // Получаем данные пользователя
      fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) return;
          setUserName(data.first_name || data.email || 'Пользователь');
          setUserEmail(data.email || '');
        })
        .catch(err => {
          console.error('Error fetching user data:', err);
        });

      // Получаем баланс отдельно
      fetch('/api/balance/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) return;
          setUserBalance(data.balance || 0);
        })
        .catch(err => {
          console.error('Error fetching balance:', err);
        });
    }
    
    // Слушаем обновления баланса
    const handleBalanceUpdate = (event) => {
      setUserBalance(event.detail.newBalance);
    };
    
    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    // Закрываем другие dropdown перед открытием профиля
    setShowBalanceDropdown(false);
    setShowNotifications(false);
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleBalanceClick = (e) => {
    e.stopPropagation();
    // Закрываем другие dropdown перед открытием баланса
    setShowProfileDropdown(false);
    setShowNotifications(false);
    setShowBalanceDropdown(!showBalanceDropdown);
  };


  const handleNotificationClick = (e) => {
    e.stopPropagation();
    // Закрываем другие dropdown перед открытием уведомлений
    setShowProfileDropdown(false);
    setShowBalanceDropdown(false);
    setShowNotifications(!showNotifications);
  };

  const handleSidebarToggle = () => {
    if (setSidebarOpen) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.balanceContainer}`)) {
        setShowBalanceDropdown(false);
      }
      if (!e.target.closest(`.${styles.profileContainer}`)) {
        setShowProfileDropdown(false);
      }
      if (!e.target.closest(`.${styles.notificationsContainer}`)) {
        setShowNotifications(false);
      }
    };

    if (showBalanceDropdown || showProfileDropdown || showNotifications) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBalanceDropdown, showProfileDropdown, showNotifications]);

  const pageInfo = getPageInfo();

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Левая часть - заголовок страницы */}
        <div className={styles.leftSection}>
          {/* Кнопка открытия сайдбара на мобильных */}
          {isMobile && (
            <button
              className={styles.sidebarToggle}
              onClick={handleSidebarToggle}
              title="Открыть меню"
            >
              <FiMenu className={styles.sidebarToggleIcon} />
            </button>
          )}

          <h1 className={styles.pageTitle}>
            <span className={styles.standardHeader}>{pageInfo.title}</span>
          </h1>
        </div>

        
        {/* Правая часть - баланс, уведомления и профиль */}
        <div className={styles.rightSection}>
          {/* Баланс */}
          <div className={styles.balanceContainer}>
            <button 
              className={`${styles.balanceButton} ${styles[getBalanceStatus()]}`}
              onClick={handleBalanceClick}
            >
              <span className={styles.balanceAmount}>
                {userBalance.toLocaleString('ru-RU')} ₽
              </span>
            </button>
            
            {showBalanceDropdown && (
              <BalanceDropdown 
                balance={userBalance}
                onClose={() => setShowBalanceDropdown(false)}
              />
            )}
          </div>

          {/* Уведомления */}
          <div className={styles.notificationsContainer}>
            <button 
              className={styles.notificationButton}
              onClick={handleNotificationClick}
              title="Уведомления"
            >
              <FiBell className={styles.notificationIcon} />
              {notifications.length > 0 && (
                <span className={styles.notificationBadge}>{notifications.length}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className={styles.notificationsDropdown}>
                <div className={styles.notificationsHeader}>
                  <h3>Уведомления</h3>
                </div>
                <div className={styles.notificationsList}>
                  {notifications.length === 0 ? (
                    <p className={styles.noNotifications}>Нет новых уведомлений</p>
                  ) : (
                    notifications.map((notification, index) => (
                      <div key={index} className={styles.notificationItem}>
                        {notification.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Профиль */}
          <div className={styles.profileContainer}>
            <button 
              className={styles.profileButton}
              onClick={handleProfileClick}
              title={userName}
            >
              <FiUser className={styles.profileIcon} />
            </button>
            
            {showProfileDropdown && (
              <ProfileDropdown 
                userName={userName}
                userEmail={userEmail}
                onClose={() => setShowProfileDropdown(false)}
                onChangePassword={handleChangePassword}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно смены пароля */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </header>
  );
}