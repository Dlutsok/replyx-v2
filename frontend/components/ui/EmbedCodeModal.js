import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FiX, FiCopy, FiCheck, FiMessageSquare,
  FiExternalLink, FiSettings, FiChevronRight
} from 'react-icons/fi';
import styles from '../../styles/components/EmbedCodeModal.module.css';
import smartProgressApi from '../../utils/smartProgressApi';

/**
 * EmbedCodeModal - Профессиональный модальный компонент для отображения embed-кода
 * Полностью адаптирован под дизайн-систему ChatAI MVP 11
 *
 * @param {boolean} isOpen - Состояние видимости модального окна
 * @param {function} onClose - Функция закрытия модального окна
 * @param {Array} assistants - Массив доступных ассистентов
 * @param {function} onAssistantSelect - Функция выбора ассистента
 * @param {Object} selectedAssistant - Выбранный ассистент
 * @param {string} embedCode - Код для встраивания
 * @param {boolean} isLoading - Состояние загрузки
 */
const EmbedCodeModal = React.memo(({
  isOpen,
  onClose,
  assistants = [],
  onAssistantSelect,
  selectedAssistant,
  embedCode,
  isLoading = false
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  // Обработка клика вне модального окна
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Отправка события о копировании виджета
  const trackWidgetCopyEvent = useCallback(async () => {
    try {
      await smartProgressApi.post('/api/start/progress/mark-widget-copied');
      console.log('Widget copy event tracked successfully');
    } catch (error) {
      console.warn('Failed to track widget copy event:', error);
      // Не прерываем процесс копирования при ошибке аналитики
    }
  }, []);

  // Копирование кода в буфер обмена
  const handleCopyCode = useCallback(async () => {
    if (!embedCode) return;

    try {
      await navigator.clipboard.writeText(embedCode);
      setCopySuccess(true);

      // Отслеживаем событие копирования виджета
      trackWidgetCopyEvent();

      // Сброс состояния через 3 секунды
      const timeoutId = setTimeout(() => {
        setCopySuccess(false);
      }, 3000);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Failed to copy code:', error);
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = embedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);

      // Отслеживаем событие копирования виджета даже в fallback режиме
      trackWidgetCopyEvent();

      setTimeout(() => setCopySuccess(false), 3000);
    }
  }, [embedCode, trackWidgetCopyEvent]);

  // Обработка выбора ассистента
  const handleAssistantClick = useCallback((assistant) => {
    if (onAssistantSelect) {
      onAssistantSelect(assistant);
    }
  }, [onAssistantSelect]);

  // Обработка нажатия клавиши Escape
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Предотвращение прокрутки body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;

  // Рендер модального окна через портал
  return createPortal(
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-modal-title"
      aria-describedby="embed-modal-description"
    >
      <div className={styles.modal}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FiMessageSquare size={20} />
            </div>
            <div className={styles.headerText}>
              <h2 id="embed-modal-title" className={styles.headerTitle}>
                {embedCode ? 'Код веб-виджета' : 'Выберите ассистента'}
              </h2>
              <p id="embed-modal-description" className={styles.headerSubtitle}>
                {embedCode ? 'Готовый код для вставки' : 'Выберите AI-ассистента'}
              </p>
            </div>
          </div>

          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            type="button"
          >
            <FiX size={16} />
          </button>
        </header>

        {/* Content */}
        <main className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>Загрузка...</p>
            </div>
          ) : !embedCode ? (
            /* Выбор ассистента */
            <div className={styles.assistantSelection}>
              <div className={styles.selectionIcon}>
                <FiMessageSquare size={24} />
              </div>
              <h3 className={styles.selectionTitle}>
                Выберите ассистента
              </h3>
              <p className={styles.selectionDescription}>
                Выберите ассистента для получения кода веб-виджета
              </p>

              <div className={styles.assistantList}>
                {assistants.map((assistant) => (
                  <button
                    key={assistant.id}
                    className={styles.assistantCard}
                    onClick={() => handleAssistantClick(assistant)}
                    type="button"
                  >
                    <div className={styles.assistantCardLeft}>
                      <div className={styles.assistantAvatar}>
                        <FiMessageSquare size={16} />
                      </div>
                      <div className={styles.assistantInfo}>
                        <h4 className={styles.assistantName}>
                          {assistant.name}
                        </h4>
                        <p className={styles.assistantModel}>
                          Модель: {assistant.ai_model || 'gpt-4o-mini'}
                        </p>
                      </div>
                    </div>
                    <div className={styles.assistantAction}>
                      <span className={styles.assistantActionText}>
                        Выбрать
                      </span>
                      <FiChevronRight className={styles.assistantActionIcon} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Отображение embed-кода */
            <div className={styles.embedSection}>
              <header className={styles.embedHeader}>
                <div className={styles.embedIcon}>
                  <FiCopy size={24} />
                </div>
                <h3 className={styles.embedTitle}>
                  Код веб-виджета
                </h3>
                {selectedAssistant && (
                  <p className={styles.embedAssistant}>
                    Ассистент: <strong>{selectedAssistant.name}</strong>
                  </p>
                )}
                <p className={styles.embedDescription}>
                  Скопируйте код ниже и вставьте его перед закрывающим тегом &lt;/body&gt;
                </p>
              </header>

              <div className={styles.codeEditor}>
                <div className={styles.codeHeader}>
                  <h4 className={styles.codeTitle}>
                    Код виджета
                  </h4>
                  <button
                    className={`${styles.copyButton} ${
                      copySuccess ? styles.copyButtonSuccess : styles.copyButtonDefault
                    }`}
                    onClick={handleCopyCode}
                    type="button"
                    aria-label={copySuccess ? 'Код скопирован' : 'Копировать код'}
                  >
                    <FiCheck size={14} className={styles.copyIcon} />
                    {copySuccess ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
                <textarea
                  className={styles.codeTextarea}
                  value={embedCode}
                  readOnly
                  aria-label="Код для встраивания виджета"
                  spellCheck={false}
                />
              </div>

              <div className={styles.settingsCard}>
                <div className={styles.settingsContent}>
                  <div className={styles.settingsIcon}>
                    <FiSettings size={16} />
                  </div>
                  <div className={styles.settingsText}>
                    <h4 className={styles.settingsTitle}>
                      Настройка виджета
                    </h4>
                    <p className={styles.settingsDescription}>
                      Персонализируйте внешний вид и поведение виджета в настройках ассистента
                    </p>
                    {selectedAssistant && (
                      <button
                        className={styles.settingsButton}
                        onClick={() => {
                          onClose();
                          window.location.href = `/ai-assistant?assistant_id=${selectedAssistant.id}`;
                        }}
                        type="button"
                      >
                        <FiSettings size={14} />
                        Настроить виджет
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <FiMessageSquare className={styles.footerIcon} />
            Готово к использованию
          </div>

          <div className={styles.footerRight}>
            <button
              className={styles.closeButtonSecondary}
              onClick={onClose}
              type="button"
            >
              Закрыть
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
});

// Добавляем displayName для лучшей отладки
EmbedCodeModal.displayName = 'EmbedCodeModal';

export default EmbedCodeModal;
