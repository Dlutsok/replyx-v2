import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, FiSave, FiEye, FiSettings, FiEdit, 
  FiUser, FiCircle, FiCornerDownRight, FiCornerDownLeft,
  FiCornerUpRight, FiCornerUpLeft
} from 'react-icons/fi';
import styles from '../../styles/components/WidgetSettingsModal.module.css';

const WidgetSettingsModal = ({ isOpen, onClose, onSave, selectedAssistant, isNewAssistant = false }) => {
  const [settings, setSettings] = useState({
    theme: 'blue',
    position: 'bottom-right',
    buttonSize: 80,
    borderRadius: 12,
    welcomeMessage: 'Привет! Как дела? Чем могу помочь?',
    buttonText: 'Чат с AI',
    showAvatar: true,
    showOnlineStatus: true
  });

  const [showSettings, setShowSettings] = useState(true);

  const themes = [
    { id: 'blue', name: 'Синяя', icon: '💙', colors: { primary: '#3b82f6', secondary: '#dbeafe' } },
    { id: 'green', name: 'Зеленая', icon: '💚', colors: { primary: '#10b981', secondary: '#d1fae5' } },
    { id: 'purple', name: 'Фиолетовая', icon: '💜', colors: { primary: '#8b5cf6', secondary: '#e9d5ff' } },
    { id: 'orange', name: 'Оранжевая', icon: '🧡', colors: { primary: '#f59e0b', secondary: '#fef3c7' } }
  ];

  const positions = [
    { id: 'bottom-right', name: 'Правый нижний угол', icon: <FiCornerDownRight /> },
    { id: 'bottom-left', name: 'Левый нижний угол', icon: <FiCornerDownLeft /> },
    { id: 'top-right', name: 'Правый верхний угол', icon: <FiCornerUpRight /> },
    { id: 'top-left', name: 'Левый верхний угол', icon: <FiCornerUpLeft /> }
  ];

  const currentTheme = themes.find(t => t.id === settings.theme) || themes[0];

  const handleSave = async () => {
    try {
      // Сохраняем настройки виджета
      const response = await fetch(`/api/assistants/${selectedAssistant?.id}/widget-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        onSave?.(settings);
        // Показываем уведомление
        showNotification('Настройки сохранены!', 'success');
      } else {
        showNotification('Ошибка сохранения настроек', 'error');
      }
    } catch (error) {
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

  const openPreview = () => {
    const params = new URLSearchParams({
      theme: settings.theme,
      position: settings.position,
      buttonSize: settings.buttonSize.toString(),
      borderRadius: settings.borderRadius.toString(),
      buttonText: settings.buttonText,
      showOnlineStatus: settings.showOnlineStatus.toString()
    });
    
    const previewUrl = `/widget-demo?${params.toString()}`;
    window.open(previewUrl, '_blank', 'width=1000,height=700');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <motion.div 
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <FiEdit className={styles.headerIcon} />
            <div>
              <h2>
                {isNewAssistant ? '🎉 Настройте ваш новый виджет' : 'Настройка внешнего вида виджета'}
              </h2>
              <p>
                {isNewAssistant 
                  ? `Отлично! Ассистент "${selectedAssistant?.name}" создан. Теперь настройте внешний вид виджета для вашего сайта.`
                  : 'Настройте внешний вид чат-виджета для вашего сайта'
                }
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {/* Settings Toggle */}
          <div className={styles.settingsToggle}>
            <button 
              className={styles.toggleBtn}
              onClick={() => setShowSettings(!showSettings)}
            >
              <FiSettings />
              {showSettings ? 'Скрыть настройки' : 'Показать настройки'}
            </button>
          </div>

          <div className={styles.mainContent}>
            {/* Settings Panel */}
            {showSettings && (
              <motion.div 
                className={styles.settingsPanel}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                  {/* Color Theme */}
                  <div className={styles.settingGroup}>
                    <h3>Цветовая тема:</h3>
                    <div className={styles.themeGrid}>
                      {themes.map(theme => (
                        <button
                          key={theme.id}
                          className={`${styles.themeOption} ${settings.theme === theme.id ? styles.active : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, theme: theme.id }))}
                        >
                          <span className={styles.themeIcon}>{theme.icon}</span>
                          <span className={styles.themeName}>{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div className={styles.settingGroup}>
                    <h3>Позиция на странице:</h3>
                    <div className={styles.positionGrid}>
                      {positions.map(position => (
                        <button
                          key={position.id}
                          className={`${styles.positionOption} ${settings.position === position.id ? styles.active : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, position: position.id }))}
                        >
                          {position.icon}
                          <span>{position.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Size */}
                  <div className={styles.settingGroup}>
                    <h3>Размер кнопки:</h3>
                    <div className={styles.sliderGroup}>
                      <input
                        type="range"
                        min="60"
                        max="120"
                        value={settings.buttonSize}
                        onChange={(e) => setSettings(prev => ({ ...prev, buttonSize: parseInt(e.target.value) }))}
                        className={styles.slider}
                      />
                      <span className={styles.sliderValue}>{settings.buttonSize}px</span>
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div className={styles.settingGroup}>
                    <h3>Скругление углов:</h3>
                    <div className={styles.sliderGroup}>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={settings.borderRadius}
                        onChange={(e) => setSettings(prev => ({ ...prev, borderRadius: parseInt(e.target.value) }))}
                        className={styles.slider}
                      />
                      <span className={styles.sliderValue}>{settings.borderRadius}px</span>
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div className={styles.settingGroup}>
                    <h3>Приветственное сообщение:</h3>
                    <textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                      className={styles.textarea}
                      rows="3"
                      placeholder="Введите приветственное сообщение..."
                    />
                  </div>

                  {/* Button Text */}
                  <div className={styles.settingGroup}>
                    <h3>Текст на кнопке:</h3>
                    <input
                      type="text"
                      value={settings.buttonText}
                      onChange={(e) => setSettings(prev => ({ ...prev, buttonText: e.target.value }))}
                      className={styles.input}
                      placeholder="Текст на кнопке"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className={styles.settingGroup}>
                    <h3>Дополнительные настройки:</h3>
                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={settings.showAvatar}
                          onChange={(e) => setSettings(prev => ({ ...prev, showAvatar: e.target.checked }))}
                        />
                        <span className={styles.checkmark}></span>
                        <FiUser className={styles.checkboxIcon} />
                        Показывать аватар ассистента
                      </label>

                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={settings.showOnlineStatus}
                          onChange={(e) => setSettings(prev => ({ ...prev, showOnlineStatus: e.target.checked }))}
                        />
                        <span className={styles.checkmark}></span>
                        <FiCircle className={styles.checkboxIcon} />
                        Показывать статус "онлайн"
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

            {/* Preview Panel */}
            <div className={styles.previewPanel}>
              <h3>Предварительный просмотр</h3>
              <div className={styles.previewContainer}>
                <div className={styles.previewDevice}>
                  <div className={styles.previewScreen}>
                    {/* Mock website content */}
                    <div className={styles.mockContent}>
                      <div className={styles.mockHeader}></div>
                      <div className={styles.mockText}></div>
                      <div className={styles.mockText}></div>
                      <div className={styles.mockText}></div>
                    </div>

                    {/* Widget Preview */}
                    <div 
                      className={styles.widgetPreview}
                      style={{
                        [settings.position.includes('bottom') ? 'bottom' : 'top']: '20px',
                        [settings.position.includes('right') ? 'right' : 'left']: '20px',
                        width: `${settings.buttonSize}px`,
                        height: `${settings.buttonSize}px`,
                        borderRadius: `${settings.borderRadius}px`,
                        background: currentTheme.colors.primary
                      }}
                    >
                      <div className={styles.widgetContent}>
                        <span className={styles.widgetText}>
                          {settings.buttonText.slice(0, 2).toUpperCase()}
                        </span>
                        {settings.showOnlineStatus && (
                          <div className={styles.onlineIndicator}></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.previewInfo}>
                  <div className={styles.previewDetail}>
                    <strong>Тема:</strong> {currentTheme.name}
                  </div>
                  <div className={styles.previewDetail}>
                    <strong>Позиция:</strong> {positions.find(p => p.id === settings.position)?.name}
                  </div>
                  <div className={styles.previewDetail}>
                    <strong>Размер:</strong> {settings.buttonSize}px
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            className={styles.previewBtn}
            onClick={openPreview}
          >
            <FiEye />
            Предварительный просмотр
          </button>
          
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
      </motion.div>
    </div>
  );
};

export default WidgetSettingsModal;