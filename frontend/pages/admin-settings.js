import React, { useState, useEffect } from 'react';
import { withAuth } from '../hooks/useAuth';
import { useAdminSettings } from '../hooks/useAdminSettings';
import AdminDashboard from '../components/layout/AdminDashboard';
import { 
  FiSettings, FiCpu, FiMail, FiShield, FiBarChart, FiTool,
  FiSave, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiLock
} from 'react-icons/fi';
import styles from '../styles/pages/AdminSettings.module.css';

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Используем хук для работы с настройками
  const {
    settings,
    isLoading,
    isSaving,
    error,
    lastUpdated,
    fetchSettings,
    updateSetting,
    saveSettings,
    saveCategorySettings,
    hasUnsavedChanges,
    getUnsavedChangesCount,
    clearError
  } = useAdminSettings({ autoRefresh: false });

  const settingsTabs = [
    {
      id: 'general',
      label: 'Основные',
      icon: FiSettings,
      description: 'Основные настройки системы'
    },
    {
      id: 'ai',
      label: 'AI провайдеры',
      icon: FiCpu,
      description: 'Настройки AI моделей и токенов'
    },
    {
      id: 'email',
      label: 'Email/SMS',
      icon: FiMail,
      description: 'Конфигурация уведомлений'
    },
    {
      id: 'security',
      label: 'Безопасность',
      icon: FiShield,
      description: 'Настройки аутентификации'
    },
    {
      id: 'limits',
      label: 'Лимиты',
      icon: FiBarChart,
      description: 'Квоты и ограничения'
    },
    {
      id: 'maintenance',
      label: 'Обслуживание',
      icon: FiTool,
      description: 'Backup и мониторинг'
    }
  ];

  // Обработчики для сообщений
  const handleSaveSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleSaveSettings = async (category = null) => {
    clearError();
    setSuccessMessage('');
    
    const result = category 
      ? await saveCategorySettings(category)
      : await saveSettings();
    
    if (result.success) {
      handleSaveSuccess(result.message);
    }
  };

  const handleSettingChange = (category, key, value) => {
    updateSetting(category, key, value);
  };

  const renderSettingField = (category, key, setting) => {
    const { data_type, value, description, is_sensitive } = setting;
    const fieldId = `${category}_${key}`;

    let inputElement;

    switch (data_type) {
      case 'boolean':
        inputElement = (
          <div className={styles.toggleContainer}>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={value === 'true' || value === true}
                onChange={(e) => handleSettingChange(category, key, e.target.checked ? 'true' : 'false')}
              />
              <span className={styles.toggleSlider}></span>
            </label>
            <span className={styles.toggleLabel}>
              {value === 'true' || value === true ? 'Включено' : 'Отключено'}
            </span>
          </div>
        );
        break;

      case 'integer':
      case 'float':
        inputElement = (
          <input
            type="number"
            id={fieldId}
            className={styles.settingInput}
            value={value || ''}
            step={data_type === 'float' ? '0.1' : '1'}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            placeholder={setting.default_value}
          />
        );
        break;

      default: // string
        inputElement = is_sensitive ? (
          <div className={styles.sensitiveField}>
            <input
              type="password"
              id={fieldId}
              className={styles.settingInput}
              value={value === '***HIDDEN***' ? '' : (value || '')}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              placeholder={value === '***HIDDEN***' ? 'Изменить пароль' : setting.default_value}
            />
            <FiLock className={styles.sensitiveIcon} />
          </div>
        ) : (
          <input
            type="text"
            id={fieldId}
            className={styles.settingInput}
            value={value || ''}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            placeholder={setting.default_value}
          />
        );
    }

    return (
      <div key={key} className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <h3 className={styles.settingTitle}>
            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            {is_sensitive && <FiLock className={styles.sensitiveIndicator} />}
          </h3>
        </div>
        {description && (
          <div className={styles.settingDescription}>{description}</div>
        )}
        <div className={styles.settingField}>
          {inputElement}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    const currentSettings = settings[activeTab] || {};

    if (Object.keys(currentSettings).length === 0) {
      return (
        <div className={styles.emptyState}>
          <FiSettings size={48} className={styles.emptyIcon} />
          <h3>Настройки не найдены</h3>
          <p>В этой категории пока нет настроек</p>
        </div>
      );
    }

    return (
      <div className={styles.settingsGrid}>
        <div className={styles.settingsList}>
          {Object.entries(currentSettings).map(([key, setting]) =>
            renderSettingField(activeTab, key, setting)
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminDashboard activeSection="settings">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Загрузка настроек...</p>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard activeSection="settings">
      <div className={styles.settingsPage}>
        {/* Header */}
        <div className={styles.settingsHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <FiSettings className={styles.titleIcon} />
              Настройки системы
            </h1>
            <p className={styles.subtitle}>
              Конфигурация основных параметров ReplyX MVP
              {lastUpdated && (
                <span> • Последнее обновление: {lastUpdated.toLocaleString('ru-RU')}</span>
              )}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.actionButton}
              onClick={fetchSettings}
              disabled={isLoading}
              title="Обновить настройки"
            >
              <FiRefreshCw size={16} className={isLoading ? styles.spinning : ''} />
              Обновить
            </button>
            <button
              className={`${styles.actionButton} ${styles.primaryButton}`}
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
            >
              <FiSave size={16} />
              {isSaving ? 'Сохранение...' : 'Сохранить все'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className={styles.message}>
            <FiAlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.message}>
            <FiCheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Settings Navigation */}
        <div className={styles.settingsNavigation}>
          <div className={styles.navigationGrid}>
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.activeNavItem : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className={styles.navIcon}>
                  <tab.icon size={20} />
                </div>
                <div className={styles.navContent}>
                  <span className={styles.navTitle}>{tab.label}</span>
                  <span className={styles.navDescription}>{tab.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className={styles.settingsContent}>
          <div className={styles.categoryHeader}>
            <h2>
              {settingsTabs.find(t => t.id === activeTab)?.icon &&
                React.createElement(settingsTabs.find(t => t.id === activeTab).icon, { size: 20, className: styles.categoryIcon })
              }
              {settingsTabs.find(t => t.id === activeTab)?.label}
            </h2>
            <div className={styles.categoryActions}>
              <button
                className={`${styles.actionButton} ${styles.primaryButton}`}
                onClick={() => handleSaveSettings(activeTab)}
                disabled={isSaving}
              >
                <FiSave size={16} />
                Сохранить раздел
              </button>
            </div>
          </div>

          {renderTabContent()}
        </div>
      </div>
    </AdminDashboard>
  );
};

// Защищаем страницу - только для администраторов
export default withAuth(AdminSettingsPage, { adminOnly: true });