import React, { useCallback, useRef } from 'react';
import { 
  FiActivity, FiFileText, FiDatabase, 
  FiHardDrive, FiClock, FiSettings 
} from 'react-icons/fi';
import styles from '../../styles/pages/AdminSystem.module.css';

const SystemTabs = ({ activeTab = 'health', onTabChange }) => {
  const tabsRef = useRef(null);

  const tabs = [
    { 
      id: 'health', 
      label: 'Состояние системы', 
      icon: FiActivity,
      description: 'Общий статус и производительность'
    },
    { 
      id: 'logs', 
      label: 'Логи', 
      icon: FiFileText,
      description: 'Системные логи и события'
    },
    { 
      id: 'database', 
      label: 'База данных', 
      icon: FiDatabase,
      description: 'Мониторинг PostgreSQL'
    },
    { 
      id: 'cache', 
      label: 'Кэш', 
      icon: FiHardDrive,
      description: 'Redis кэш и управление'
    },
    { 
      id: 'tasks', 
      label: 'Задачи', 
      icon: FiClock,
      description: 'Фоновые процессы и воркеры'
    }
  ];

  const handleTabClick = useCallback((tabId) => {
    if (onTabChange && tabId !== activeTab) {
      onTabChange(tabId);
    }
  }, [activeTab, onTabChange]);

  const handleKeyDown = useCallback((event, tabId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabClick(tabId);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      let newIndex;
      
      if (event.key === 'ArrowLeft') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else {
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      }
      
      const newTabId = tabs[newIndex].id;
      handleTabClick(newTabId);
      
      // Фокус на новую кнопку
      const buttons = tabsRef.current?.querySelectorAll('[role="tab"]');
      if (buttons && buttons[newIndex]) {
        buttons[newIndex].focus();
      }
    }
  }, [activeTab, tabs, handleTabClick]);

  return (
    <div className={styles.tabsContainer}>
      <div 
        className={styles.systemTabs}
        role="tablist"
        aria-label="Разделы системного мониторинга"
        ref={tabsRef}
      >
        {tabs.map((tab, index) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              title={tab.description}
            >
              <TabIcon 
                size={16} 
                aria-hidden="true"
              />
              <span className={styles.tabLabel}>{tab.label}</span>
              
              {/* Индикатор активной вкладки для accessibility */}
              {isActive && (
                <span className="sr-only">
                  (активная вкладка)
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Визуальный индикатор активной вкладки */}
      <div className={styles.tabIndicator} aria-hidden="true">
        <div 
          className={styles.tabIndicatorLine}
          style={{
            transform: `translateX(${tabs.findIndex(tab => tab.id === activeTab) * 100}%)`,
            width: `${100 / tabs.length}%`
          }}
        />
      </div>
      
      {/* Описание активной вкладки */}
      <div className={styles.tabDescription}>
        <p className={styles.bodyTextMuted}>
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>
    </div>
  );
};

export default SystemTabs;