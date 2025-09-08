import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useSmartProgress } from '../../hooks/useSmartProgress';
import styles from '../../styles/layout/Sidebar.module.css';

// Компонент попапа о компании
const CompanyPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.popupClose} onClick={onClose}>&times;</button>

        <div className={styles.popupHeader}>
          <div className={styles.popupIcon}>
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_1_3)">
                <path fillRule="evenodd" clipRule="evenodd" d="M15.0271 32.4393C28.9459 31.8336 42.9639 31.6315 57.0814 31.8324C68.0006 42.729 78.5626 54.0577 88.7662 65.8179C82.0139 73.3354 75.1009 80.618 68.0271 87.6657C50.2554 69.1449 32.5885 50.7362 15.0271 32.4393Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M78.9729 32.4393C92.8917 31.8336 106.91 31.6315 121.027 31.8324C142.322 53.9624 163.542 76.2151 184.685 98.5897C185.069 98.9944 185.069 99.3986 184.685 99.8034C177.772 107.086 170.859 114.369 163.946 121.651C135.697 91.792 107.373 62.0546 78.9729 32.4393Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M57.0814 166.561C42.9639 166.761 28.9459 166.559 15.0271 165.954C43.2433 136.431 71.4715 106.897 99.7119 77.3486C107.066 85.541 113.992 91.1777 120.739 98.5896C121.123 98.9944 121.123 99.3986 120.739 99.8033C99.5961 122.178 78.3765 144.431 57.0814 166.561Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M121.027 166.561C106.91 166.762 92.8917 166.559 78.9729 165.954C96.6277 147.558 114.294 129.149 131.973 110.727C139.19 117.824 146.103 125.208 152.712 132.879C142.442 144.406 131.88 155.633 121.027 166.561Z" fill="#6334E6"/>
              </g>
              <defs>
                <clipPath id="clip0_1_3">
                  <rect width="200" height="200" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>
          <h2 className={styles.popupTitle}>ReplyX</h2>
        </div>

        <div className={styles.popupBody}>
          <p className={styles.popupDescription}>
            ReplyX — это не просто стартап.<br/>
            Мы создаём будущее, в котором искусственный интеллект работает на человека: ускоряет бизнес-процессы, освобождает время и открывает новые возможности.
          </p>

          <div className={styles.popupStats}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1M3 6v15c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6M3 6h18"/>
                  <path d="M8 6V4c0-.6.4-1 1-1h6c.6 0 1 .4 1 1v2"/>
                </svg>
              </div>
              <div className={styles.statNumber}>2025</div>
              <div className={styles.statLabel}>Основаны — уже меняем рынок</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div className={styles.statNumber}>MVP</div>
              <div className={styles.statLabel}>Стадия — амбиции глобальные</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"/>
                  <circle cx="9" cy="9" r="1"/>
                  <circle cx="15" cy="9" r="1"/>
                </svg>
              </div>
              <div className={styles.statNumber}>AI</div>
              <div className={styles.statLabel}>Технологии с реальным результатом</div>
            </div>
          </div>

          <div className={styles.popupMission}>
            <h4>Наша миссия</h4>
            <p>
              Помогать людям и компаниям становиться сильнее, эффективнее и успешнее
            </p>
          </div>

          <div className={styles.popupCallToAction}>
            <p>
              Мы не откладываем на завтра. Будущее создаётся сегодня.
            </p>
          </div>
        </div>

        <div className={styles.popupFooter}>
          <p className={styles.popupContact}>
            Есть вопросы? <a href="/help-center">Свяжитесь с нами</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Профессиональные иконки для корпоративного интерфейса
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"/>
    <rect x="14" y="3" width="7" height="5"/>
    <rect x="14" y="12" width="7" height="9"/>
    <rect x="3" y="16" width="7" height="5"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12l2 2 4-4"/>
    <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"/>
    <circle cx="9" cy="9" r="1"/>
    <circle cx="15" cy="9" r="1"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <path d="M1 10h22"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const SupportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const AdminIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    <polyline points="9,12 11,14 15,10"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const OnboardingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="currentColor">
    <path fillRule="evenodd" d="M17.127 5.813a.25.25 0 0 1 0-.354l1.768-1.768a.25.25 0 0 1 .353 0l1.061 1.06a.25.25 0 0 1 0 .354l-1.768 1.768a.25.25 0 0 1-.353 0zM12.75 4a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-1.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25zM20 12.75c0 .138.112.25.25.25h2.5a.25.25 0 0 0 .25-.25v-1.5a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25zm-16 0a.25.25 0 0 1-.25.25h-2.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25zm2.873-6.937a.25.25 0 0 0 0-.354L5.105 3.691a.25.25 0 0 0-.353 0l-1.06 1.061a.25.25 0 0 0 0 .354l1.767 1.767a.25.25 0 0 0 .354 0zM15 20v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1zm-7-8a4 4 0 1 1 6.4 3.2l-.4.3V17h-4v-1.5l-.4-.3A4 4 0 0 1 8 12m4-6a6 6 0 0 0-4 10.472v1.278c0 .69.56 1.25 1.25 1.25h5.5c.691 0 1.25-.56 1.25-1.25V16.47A6 6 0 0 0 12 6" clipRule="evenodd" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ minWidth: '24px', minHeight: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Sidebar({ isCollapsed = true, isOpen = false, isMobile = false, onToggle, onClose }) {
  const router = useRouter();
  const { user } = useAuth();

  // Состояние для отслеживания загрузки компонента
  const [isLoaded, setIsLoaded] = useState(false);

  // Состояние для попапа о компании
  const [isCompanyPopupOpen, setIsCompanyPopupOpen] = useState(false);

  // Проверяем роль администратора
  const isAdmin = user?.role === 'admin';

  // Получаем статус прогресса для скрытия иконки "Первые шаги"
  const { isAllStepsCompleted } = useSmartProgress();

  // Устанавливаем состояние загрузки после монтирования
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Группировка меню для лучшей навигации
  const menuGroups = [
    {
      title: 'Обзор',
      items: [
        { path: '/dashboard', name: 'Дашборд', icon: DashboardIcon, badge: null },
        // Скрываем "Первые шаги" если все шаги выполнены
        ...(isAllStepsCompleted() ? [] : [{ path: '/start', name: 'Первые шаги', icon: OnboardingIcon, badge: null }]),
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
        { path: '/usage', name: 'Расходы', icon: AnalyticsIcon, badge: null },
      ]
    },
    // Админ группа - показываем только для администраторов
    ...(isAdmin ? [{
      title: 'Администрирование',
      items: [
        { path: '/admin', name: 'Админ панель', icon: AdminIcon, badge: null },
        { path: '/database-explorer', name: 'База данных', icon: DatabaseIcon, badge: null }
      ]
    }] : [])
  ];

  const isActive = (path) => router.pathname === path;

  return (
    <div
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobile && isOpen ? styles.open : ''} ${isLoaded ? styles.loaded : ''}`}
      style={{
        transform: isMobile && isOpen ? 'translateX(0)' : isMobile && !isOpen ? 'translateX(-100%)' : 'none'
      }}
    >

      {/* Кнопка закрытия на мобильных - отдельно от заголовка */}
      {isMobile && (
        <button
          className={styles.floatingCloseButton}
          onClick={onClose}
          title="Закрыть меню"
        >
          <XIcon />
        </button>
      )}

      {/* Логотип и название приложения */}
      {isMobile && (
        <div className={styles.mobileHeader}>
          <Link href="/" className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className={styles.appName}>ReplyX</span>
          </Link>
          <div className={styles.divider}></div>
        </div>
      )}

      {/* Фавиконка приложения */}
      <div className={styles.faviconContainer}>
        <button
          className={styles.faviconLink}
          onClick={() => setIsCompanyPopupOpen(true)}
          title="О компании"
        >
          <div className={styles.faviconIcon}>
            <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_1_3)">
                <path fillRule="evenodd" clipRule="evenodd" d="M15.0271 32.4393C28.9459 31.8336 42.9639 31.6315 57.0814 31.8324C68.0006 42.729 78.5626 54.0577 88.7662 65.8179C82.0139 73.3354 75.1009 80.618 68.0271 87.6657C50.2554 69.1449 32.5885 50.7362 15.0271 32.4393Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M78.9729 32.4393C92.8917 31.8336 106.91 31.6315 121.027 31.8324C142.322 53.9624 163.542 76.2151 184.685 98.5897C185.069 98.9944 185.069 99.3986 184.685 99.8034C177.772 107.086 170.859 114.369 163.946 121.651C135.697 91.792 107.373 62.0546 78.9729 32.4393Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M57.0814 166.561C42.9639 166.761 28.9459 166.559 15.0271 165.954C43.2433 136.431 71.4715 106.897 99.7119 77.3486C107.066 85.541 113.992 91.1777 120.739 98.5896C121.123 98.9944 121.123 99.3986 120.739 99.8033C99.5961 122.178 78.3765 144.431 57.0814 166.561Z" fill="#6334E6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M121.027 166.561C106.91 166.762 92.8917 166.559 78.9729 165.954C96.6277 147.558 114.294 129.149 131.973 110.727C139.19 117.824 146.103 125.208 152.712 132.879C142.442 144.406 131.88 155.633 121.027 166.561Z" fill="#6334E6"/>
              </g>
              <defs>
                <clipPath id="clip0_1_3">
                  <rect width="200" height="200" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>
        </button>
      </div>

      {/* Меню с группировкой */}
      <nav className={styles.navigation}>
        {menuGroups.map((group, groupIndex) => (
          <div key={group.title} className={styles.menuGroup}>

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
                      title={isCollapsed && !isMobile ? item.name : ''}
                    >
                      <IconComponent />
                      {(!isCollapsed || isMobile) && (
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

      {/* Версия приложения */}
      <div className={styles.versionInfo}>
        <span className={styles.versionText}>v0.0.1</span>
      </div>

      {/* Попап о компании */}
      <CompanyPopup
        isOpen={isCompanyPopupOpen}
        onClose={() => setIsCompanyPopupOpen(false)}
      />

    </div>
  );
}