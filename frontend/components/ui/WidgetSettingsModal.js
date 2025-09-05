import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { SketchPicker } from 'react-color';
import {
  FiX, FiSave, FiSettings,
  FiUser, FiCircle, FiCornerDownRight, FiCornerDownLeft,
  FiCornerUpRight, FiCornerUpLeft, FiCheck,
  FiStar, FiSun, FiTool, FiTrash2, FiMessageSquare
} from 'react-icons/fi';
import styles from '../../styles/components/WidgetSettingsModal.module.css';

const WidgetSettingsModal = ({ isOpen, onClose, onSave, selectedAssistant, isNewAssistant = false }) => {
  const [settings, setSettings] = useState({
    operatorName: selectedAssistant?.operator_name || 'Dan',
    businessName: selectedAssistant?.business_name || 'Поддержка',
    avatarUrl: selectedAssistant?.avatar_url && !selectedAssistant.avatar_url.startsWith('http') ? 
               `${process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'}${selectedAssistant.avatar_url}` : 
               selectedAssistant?.avatar_url || '',
    theme: selectedAssistant?.widget_theme || 'blue',
    allowedDomains: selectedAssistant?.allowed_domains || '',
    position: 'bottom-right',
    buttonSize: 80,
    borderRadius: 12,
    welcomeMessage: 'Добро пожаловать! Я ваш AI-ассистент, готов предоставить необходимую информацию и помочь решить любые вопросы. Чем могу быть полезен?',
    buttonText: 'Чат с AI',
    showAvatar: true,
    showOnlineStatus: true
  });

  const [showSettings, setShowSettings] = useState(true);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [welcomeMessageFocused, setWelcomeMessageFocused] = useState(false);

  // Обновляем настройки при изменении selectedAssistant
  useEffect(() => {
    if (selectedAssistant) {
      const widgetTheme = selectedAssistant.widget_theme || 'blue';
      
      // Загружаем widget_settings
      const widgetSettings = selectedAssistant.widget_settings || {};
      
      // Проверяем, является ли тема кастомным цветом (HEX-код)
      if (widgetTheme.startsWith('#')) {
        setCustomColor(widgetTheme);
        setSettings(prev => ({
          ...prev,
          operatorName: selectedAssistant.operator_name || 'Dan',
          businessName: selectedAssistant.business_name || 'Поддержка',
          avatarUrl: selectedAssistant.avatar_url || '',
          theme: 'custom',
          allowedDomains: selectedAssistant.allowed_domains || '',
          position: widgetSettings.position || 'bottom-right',
          buttonSize: widgetSettings.buttonSize || 80,
          borderRadius: widgetSettings.borderRadius || 12,
          welcomeMessage: widgetSettings.welcomeMessage || 'Добро пожаловать! Я ваш AI-ассистент, готов предоставить необходимую информацию и помочь решить любые вопросы. Чем могу быть полезен?',
          buttonText: widgetSettings.buttonText || 'Чат с AI',
          showAvatar: widgetSettings.showAvatar !== undefined ? widgetSettings.showAvatar : true,
          showOnlineStatus: widgetSettings.showOnlineStatus !== undefined ? widgetSettings.showOnlineStatus : true
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          operatorName: selectedAssistant.operator_name || 'Dan',
          businessName: selectedAssistant.business_name || 'Поддержка',
          avatarUrl: selectedAssistant.avatar_url || '',
          theme: widgetTheme,
          allowedDomains: selectedAssistant.allowed_domains || '',
          position: widgetSettings.position || 'bottom-right',
          buttonSize: widgetSettings.buttonSize || 80,
          borderRadius: widgetSettings.borderRadius || 12,
          welcomeMessage: widgetSettings.welcomeMessage || 'Добро пожаловать! Я ваш AI-ассистент, готов предоставить необходимую информацию и помочь решить любые вопросы. Чем могу быть полезен?',
          buttonText: widgetSettings.buttonText || 'Чат с AI',
          showAvatar: widgetSettings.showAvatar !== undefined ? widgetSettings.showAvatar : true,
          showOnlineStatus: widgetSettings.showOnlineStatus !== undefined ? widgetSettings.showOnlineStatus : true
        }));
      }
    }
  }, [selectedAssistant]);

  const themes = [
    { id: 'blue', name: 'Синяя', icon: <FiCircle />, colors: { primary: '#3b82f6', secondary: '#dbeafe', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' } },
    { id: 'green', name: 'Зеленая', icon: <FiCheck />, colors: { primary: '#10b981', secondary: '#d1fae5', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' } },
    { id: 'purple', name: 'Фиолетовая', icon: <FiStar />, colors: { primary: '#8b5cf6', secondary: '#e9d5ff', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' } },
    { id: 'orange', name: 'Оранжевая', icon: <FiSun />, colors: { primary: '#f59e0b', secondary: '#fef3c7', gradient: 'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)' } },
    { id: 'custom', name: 'Кастомный', icon: <FiTool />, colors: { primary: customColor, secondary: customColor + '20', gradient: `linear-gradient(135deg, ${customColor} 0%, ${customColor}dd 100%)` } }
  ];

  const positions = [
    { id: 'bottom-right', name: 'Правый нижний угол', icon: <FiCornerDownRight /> },
    { id: 'bottom-left', name: 'Левый нижний угол', icon: <FiCornerDownLeft /> },
    { id: 'top-right', name: 'Правый верхний угол', icon: <FiCornerUpRight /> },
    { id: 'top-left', name: 'Левый верхний угол', icon: <FiCornerUpLeft /> }
  ];

  const currentTheme = themes.find(t => t.id === settings.theme) || themes[0];

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      showNotification('Пожалуйста, выберите изображение', 'error');
      return;
    }

    // Проверка размера файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Размер файла не должен превышать 5MB', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'}/api/upload/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Убедимся, что URL абсолютный
        const avatarUrl = data.url.startsWith('http') ? data.url : 
                         `${process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'}${data.url}`;
        setSettings(prev => ({ ...prev, avatarUrl }));
        showNotification('Аватар успешно загружен!', 'success');
      } else {
        throw new Error('Ошибка загрузки');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotification('Ошибка загрузки аватара', 'error');
    }
  };

  const handleSave = async () => {
    try {
      // Сохраняем настройки виджета и ассистента
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'}/api/assistants/${selectedAssistant?.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operator_name: settings.operatorName,
          business_name: settings.businessName,
          avatar_url: settings.avatarUrl,
          widget_theme: settings.theme === 'custom' ? customColor : settings.theme,
          allowed_domains: settings.allowedDomains.trim(),
          // Дополнительные настройки виджета
          widget_settings: {
            position: settings.position,
            buttonSize: settings.buttonSize,
            borderRadius: settings.borderRadius,
            welcomeMessage: settings.welcomeMessage,
            buttonText: settings.buttonText,
            showAvatar: settings.showAvatar,
            showOnlineStatus: settings.showOnlineStatus
          }
        })
      });

      if (response.ok) {
        onSave?.(settings);
        showNotification('Настройки сохранены!', 'success');
        setTimeout(() => onClose?.(), 500);
      } else {
        const error = await response.json();
        showNotification(`Ошибка: ${error.detail || 'Неизвестная ошибка'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
      showNotification('Ошибка сохранения настроек', 'error');
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 0.75rem;
      z-index: 10000;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };



  // Close dropdown and color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showThemeDropdown && !event.target.closest(`.${styles.themeDropdownWrapper}`)) {
        setShowThemeDropdown(false);
      }
      
      if (showColorPicker && !event.target.closest(`.${styles.colorPickerModal}`)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showThemeDropdown, showColorPicker]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.overlay}>
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Close Button */}
        <button className={styles.closeBtn} onClick={onClose} style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 10
        }}>
          <FiX />
        </button>

        <div className={styles.content}>
          <div className={styles.mainContent}>
            {/* Left Panel - Settings (White background) */}
            <div className={styles.leftPanel}>
              {/* Welcome Section */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeContent}>
                  <h1 className={styles.welcomeTitle}>Настройте виджет чата в соответствии с дизайном вашего сайта</h1>
                </div>
              </div>

              {/* LOGICAL GROUP STRUCTURE */}
              {/* Group 1: Basic Information */}
              <div className={styles.settingsGroup}>
                <div className={styles.groupHeader}>
                  <FiUser className={styles.groupIcon} />
                  <div>
                    <h2 className={styles.groupTitle}>Базовая информация</h2>
                    <p className={styles.groupSubtitle}>Основные настройки вашего ассистента</p>
                  </div>
                </div>

                {/* Business Name Input */}
                <div className={styles.simpleSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Название бизнеса</h3>
                    <div className={styles.tooltipContainer}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.tooltipIcon}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      <div className={styles.tooltip}>
                        Это название будет отображаться в заголовке виджета чата вместо "Поддержка".
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    className={styles.input}
                    placeholder="Введите название бизнеса"
                    style={{ marginBottom: '0' }}
                  />
                </div>

                {/* Avatar Upload - Compact Horizontal */}
                <div className={styles.simpleSection}>
                  <div className={styles.avatarSection}>
                    <div className={styles.avatarContainer}>
                      <div className={styles.avatarPreview}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAvatarUpload(e)}
                          className={styles.avatarInput}
                          id="avatar-upload"
                        />
                        {settings.avatarUrl ? (
                          <img src={settings.avatarUrl} alt="Avatar" className={styles.avatarImage} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={styles.uploadIcon}>
                              <path d="M0 0h24v24H0z" fill="none"></path>
                              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      {settings.avatarUrl && (
                        <button
                          className={styles.avatarRemove}
                          onClick={() => setSettings(prev => ({ ...prev, avatarUrl: '' }))}
                          title="Удалить аватар"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                    <div className={styles.avatarInfo}>
                      <h4 className={styles.avatarLabel}>Аватар оператора</h4>
                      <p className={styles.avatarDescription}>
                        {settings.avatarUrl
                          ? 'Нажмите для изменения или используйте крестик для удаления'
                          : 'Нажмите для загрузки изображения. Рекомендуемый размер: 100x100px'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Appearance */}
              <div className={styles.settingsGroup}>
                <div className={styles.groupHeader}>
                  <FiSun className={styles.groupIcon} />
                  <div>
                    <h2 className={styles.groupTitle}>Внешний вид</h2>
                    <p className={styles.groupSubtitle}>Цветовая схема и стиль виджета</p>
                  </div>
                </div>

                {/* Color Theme Dropdown - Simplified */}
                <div className={styles.simpleSection}>
                  <h3>Цветовая схема</h3>
                  <div className={styles.themeDropdownWrapper}>
                    <button
                      className={styles.themeDropdownButton}
                      onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                    >
                      <div
                        className={styles.selectedColorCircle}
                        style={{ background: currentTheme.colors.primary }}
                      ></div>
                      <span className={styles.selectedThemeText}>
                        {settings.theme === 'blue' ? 'Цвет1' :
                         settings.theme === 'purple' ? 'Цвет2' :
                         settings.theme === 'orange' ? 'Цвет3' :
                         settings.theme === 'green' ? 'Цвет4' :
                         settings.theme === 'custom' ? 'Кастомный цвет' : 'Цвет5'}
                      </span>
                      <span className={styles.dropdownArrow}>▼</span>
                    </button>

                    {/* Dropdown menu */}
                    {showThemeDropdown && (
                      <div className={styles.themeDropdownMenu}>
                        {/* Custom color picker option */}
                        <div
                          className={styles.customColorOption}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowColorPicker(true);
                            setShowThemeDropdown(false);
                          }}
                        >
                          <FiTool className={styles.customColorIcon} />
                          <span>Выбери свой цвет</span>
                        </div>

                        {/* Themes label */}
                        <div className={styles.themesHeader}>Темы</div>

                        {/* Theme options */}
                        {[
                          { id: 'blue', name: 'Цвет1', color: '#3b82f6' },
                          { id: 'purple', name: 'Цвет2', color: '#8b5cf6' },
                          { id: 'orange', name: 'Цвет3', color: '#f59e0b' },
                          { id: 'green', name: 'Цвет4', color: '#10b981' },
                          { id: 'black', name: 'Цвет5', color: '#374151' }
                        ].map(theme => (
                          <div
                            key={theme.id}
                            className={styles.themeDropdownItem}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, theme: theme.id }));
                              setShowThemeDropdown(false);
                            }}
                          >
                            <div
                              className={styles.themeDropdownCircle}
                              style={{ background: theme.color }}
                            ></div>
                            <span>{theme.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Color Picker Modal */}
                    {showColorPicker && (
                      <div className={styles.colorPickerModal}>
                        <SketchPicker
                          color={customColor}
                          onChange={(color) => {
                            setCustomColor(color.hex);
                            setSettings(prev => ({ ...prev, theme: 'custom' }));
                          }}
                          onChangeComplete={(color) => {
                            setCustomColor(color.hex);
                            setSettings(prev => ({ ...prev, theme: 'custom' }));
                          }}
                          disableAlpha={true}
                          presetColors={[
                            '#ff6b35', '#f7931e', '#ffd23f', '#6b7280',
                            '#10b981', '#8b5cf6', '#7c3aed', '#3b82f6',
                            '#06b6d4', '#14b8a6', '#84cc16', '#374151',
                            '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 3: Content */}
              <div className={styles.settingsGroup}>
                <div className={styles.groupHeader}>
                  <FiMessageSquare className={styles.groupIcon} />
                  <div>
                    <h2 className={styles.groupTitle}>Контент</h2>
                    <p className={styles.groupSubtitle}>Настройки текста и сообщений</p>
                  </div>
                </div>

                {/* Welcome Message Input */}
                <div className={styles.simpleSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Приветственное сообщение</h3>
                    <div className={styles.tooltipContainer}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.tooltipIcon}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      <div className={styles.tooltip}>
                        Первое сообщение, которое увидит пользователь при открытии чата.
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={settings.welcomeMessage}
                    onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    onFocus={() => setWelcomeMessageFocused(true)}
                    onBlur={() => setWelcomeMessageFocused(false)}
                    className={styles.textarea}
                    placeholder="Введите приветственное сообщение"
                    rows={3}
                    style={{ marginBottom: '0' }}
                  />
                </div>
              </div>

              {/* Group 4: Domain Settings */}
              <div className={styles.settingsGroup}>
                <div className={styles.groupHeader}>
                  <FiSettings className={styles.groupIcon} />
                  <div>
                    <h2 className={styles.groupTitle}>Настройки домена</h2>
                    <p className={styles.groupSubtitle}>Где будет работать виджет чата</p>
                  </div>
                </div>

                {/* Allowed Domains */}
                <div className={styles.simpleSection}>
                  <h3>Доменные имена</h3>
                  <input
                    type="text"
                    value={settings.allowedDomains}
                    onChange={(e) => setSettings(prev => ({ ...prev, allowedDomains: e.target.value }))}
                    className={styles.input}
                    placeholder="example.com"
                    style={{ marginBottom: '12px' }}
                  />
                  <div className={styles.domainExplanation}>
                    <p className={styles.explanationText}>
                      Укажите доменные имена сайтов, где будет работать виджет.
                      Можно указать несколько доменов через запятую.
                    </p>
                    <div className={styles.explanationExample}>
                      <strong>Примеры:</strong>
                      <div>• example.com (только основной домен)</div>
                      <div>• example.com, www.example.com (с www)</div>
                      <div>• *.example.com (все поддомены)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Block - Additional customization info */}
              <div className={styles.infoBlock}>
                <div className={styles.infoIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="default" className={styles.infoSvg} style={{minWidth: '24px', minHeight: '24px'}}>
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8"></path>
                  </svg>
                </div>
                <div className={styles.infoContent}>
                  <p className={styles.infoText}>
                    Вы всегда можете вернуться и внести дополнительные изменения во внешний вид виджета чата в настройках.
                  </p>
                </div>
              </div>

              {/* Footer moved to left panel */}
              <div className={styles.leftPanelFooter}>
                <div className={styles.footerActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={onClose}
                  >
                    Отмена
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                  >
                    <FiSave />
                    {isNewAssistant ? 'Сохранить и продолжить' : 'Сохранить настройки'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Widget Preview (Gray background) */}
            <div className={styles.rightPanel}>
              <div className={styles.widgetPreviewContainer}>
                {/* Real Widget Chat Interface - Exact copy from chat-iframe.js */}
                <div className={styles.realChatWidget}>
                  
                  {/* Chat Header - Exact from chat-iframe.js */}
                  <div className={styles.chatHeader}>
                    <div className={styles.avatar}>
                      {settings.avatarUrl ? (
                        <img
                          src={settings.avatarUrl}
                          alt={settings.operatorName || 'Operator'}
                          className={styles.avatarImage}
                          onLoad={(e) => {
                            e.target.style.display = 'block';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'none';
                            }
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : (
                        <img
                          src="/avatar.jpg"
                          alt={settings.operatorName || 'Operator'}
                          className={styles.avatarImage}
                          onLoad={(e) => {
                            e.target.style.display = 'block';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'none';
                            }
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      )}
                      <span
                        className={styles.fallbackText}
                        style={{ background: currentTheme.colors.gradient }}
                      >
                        {settings.operatorName ? settings.operatorName.charAt(0).toUpperCase() : 'D'}
                      </span>
                    </div>
                    <div className={styles.headerInfo}>
                      <h3>{settings.businessName || 'Поддержка'}</h3>
                    </div>
                    <div className={styles.aiLabel}>
                      AI
                    </div>
                  </div>

                  {/* Chat Messages Area - Exact from chat-iframe.js */}
                  <div className={styles.messagesContainer}>
                    {/* Welcome Message */}
                    <div className={`${styles.messageFromBot} ${welcomeMessageFocused ? styles.highlightedMessage : ''}`}>
                      <div className={`${styles.messageBubble} ${styles.assistantMessage}`}>
                        <div className={styles.messageContent}>
                          {settings.welcomeMessage || 'Добро пожаловать! Я ваш AI-ассистент, готов предоставить необходимую информацию и помочь решить любые вопросы. Чем могу быть полезен?'}
                        </div>
                      </div>
                    </div>

                    {/* Sample User Message 1 */}
                    {!welcomeMessageFocused && (
                      <div className={styles.messageFromUser}>
                        <div className={`${styles.messageBubble} ${styles.userMessage}`} style={{ background: currentTheme.colors.primary }}>
                          <div className={styles.messageContent}>
                            Нас интересует автоматизация клиентской поддержки.<br/>
                            Хотим сократить время ответа и повысить конверсию обращений.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sample Bot Response 1 */}
                    {!welcomeMessageFocused && (
                      <div className={styles.messageFromBot}>
                        <div className={`${styles.messageBubble} ${styles.assistantMessage}`}>
                          <div className={styles.messageContent}>
                            Отлично. Наши AI-ассистенты закрывают до 90% обращений<br/>
                            без участия оператора, интегрируются в CRM и мессенджеры,<br/>
                            а также дают детальную аналитику по каждому каналу.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sample User Message 2 */}
                    {!welcomeMessageFocused && (
                      <div className={styles.messageFromUser}>
                        <div className={`${styles.messageBubble} ${styles.userMessage}`} style={{ background: currentTheme.colors.primary }}>
                          <div className={styles.messageContent}>
                            То, что нужно. Давайте обсудим пилотное внедрение.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Area - Exact from chat-iframe.js */}
                  <div className={styles.inputGroup}>
                    <div className={styles.footerInputWrapper}>
                      <hr className={styles.inputSeparator}/>
                      <div className={styles.inputRow}>
                        <textarea
                          placeholder="Введите ваше сообщение..."
                          className={styles.chatInputField}
                          readOnly
                          rows="1"
                        />
                        <button className={styles.sendBtn}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill={currentTheme.colors.primary}/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Footer with emoji and branding - Exact from chat-iframe.js */}
                    <div className={styles.inputFooter}>
                      <div className={styles.footerContent}>
                        <div className={styles.footerIconsWrapper}>
                          <button className={styles.emojiBtn}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#647491">
                              <path d="M0 0h24v24H0z" fill="none"></path>
                              <path fillRule="evenodd" clipRule="evenodd" d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11ZM8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11ZM12.0006 17.5C14.3306 17.5 16.3106 16.04 17.1106 14L6.89062 14C7.69063 16.04 9.67063 17.5 12.0006 17.5Z"></path>
                            </svg>
                          </button>
                        </div>
                        <div className={styles.poweredBy}>
                          <span className={styles.poweredByText}>POWERED BY</span>
                          <span className={styles.brandName} style={{ color: currentTheme.colors.primary }}>ReplyX</span>
                          <span>⚡</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button - positioned as part of the widget group */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '10px',
                  width: '380px', // такая же ширина как у виджета
                  margin: '10px auto 0 auto' // центрируем относительно контейнера
                }}>
                  <div
                    className={styles.closeButton}
                    style={{
                      width: '50px',
                      height: '50px',
                      background: currentTheme.colors.primary,
                      border: 'none',
                      borderRadius: '50%',
                      color: 'white',
                      fontSize: '20px',
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${currentTheme.colors.primary}40`,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FiX />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WidgetSettingsModal;