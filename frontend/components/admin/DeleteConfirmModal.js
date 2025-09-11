import { useState } from 'react';
import { FiX, FiAlertTriangle, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import styles from '../../styles/components/DeleteConfirmModal.module.css';

const DeleteConfirmModal = ({ token, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState(null);

  const expectedConfirmText = token.name;
  const isConfirmValid = confirmText === expectedConfirmText;

  const handleConfirm = async () => {
    if (!isConfirmValid) {
      setError('Введите точное название токена для подтверждения');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Произошла ошибка при удалении токена');
      setLoading(false);
    }
  };

  const maskToken = (tokenStr) => {
    if (!tokenStr) return '';
    return tokenStr.substring(0, 8) + '...' + tokenStr.substring(tokenStr.length - 4);
  };

  const calculateUsagePercentage = (usage, limit) => {
    return limit > 0 ? Math.round((usage || 0) / limit * 100) : 0;
  };

  const dailyPercentage = calculateUsagePercentage(token.daily_usage, token.daily_limit);
  const monthlyPercentage = calculateUsagePercentage(token.monthly_usage, token.monthly_limit);

  const hasActiveUsage = dailyPercentage > 0 || monthlyPercentage > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerIcon}>
            <FiAlertTriangle size={32} className={styles.warningIcon} />
          </div>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              Удаление AI токена
            </h2>
            <p className={styles.modalSubtitle}>
              Это действие нельзя отменить
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Token Info */}
          <div className={styles.tokenInfo}>
            <div className={styles.tokenHeader}>
              <div className={styles.tokenMain}>
                <h3 className={styles.tokenName}>{token.name}</h3>
                <span className={styles.tokenId}>ID: {token.id}</span>
              </div>
              <div className={styles.tokenStatus}>
                <span className={`${styles.statusBadge} ${
                  token.is_active ? styles.active : styles.inactive
                }`}>
                  {token.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            </div>

            <div className={styles.tokenDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>API Token:</span>
                <div className={styles.tokenField}>
                  <code className={styles.tokenValue}>
                    {showToken ? token.token : maskToken(token.token)}
                  </code>
                  <button
                    type="button"
                    className={styles.toggleTokenButton}
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Модели:</span>
                <div className={styles.modelsContainer}>
                  {(token.model_access || '').split(',').filter(model => model.trim()).map((model, index) => (
                    <span key={index} className={styles.modelTag}>
                      {model.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Лимиты:</span>
                <div className={styles.limitsInfo}>
                  <span>Дневной: {token.daily_limit?.toLocaleString()} запросов</span>
                  <span>Месячный: {token.monthly_limit?.toLocaleString()} запросов</span>
                </div>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Приоритет:</span>
                <div className={styles.priorityInfo}>
                  <div className={styles.priorityDots}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`${styles.priorityDot} ${i < token.priority ? styles.active : ''}`}
                      />
                    ))}
                  </div>
                  <span>{token.priority}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Warning */}
          {hasActiveUsage && (
            <div className={styles.usageWarning}>
              <div className={styles.warningHeader}>
                <FiAlertTriangle size={20} />
                <span>Токен используется!</span>
              </div>
              <div className={styles.usageDetails}>
                <div className={styles.usageItem}>
                  <span>Дневное использование:</span>
                  <div className={styles.usageProgress}>
                    <div className={styles.usageBar}>
                      <div 
                        className={styles.usageFill}
                        style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                      />
                    </div>
                    <span>{dailyPercentage}%</span>
                  </div>
                </div>
                <div className={styles.usageItem}>
                  <span>Месячное использование:</span>
                  <div className={styles.usageProgress}>
                    <div className={styles.usageBar}>
                      <div 
                        className={styles.usageFill}
                        style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                      />
                    </div>
                    <span>{monthlyPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Consequences Warning */}
          <div className={styles.warningSection}>
            <h4 className={styles.warningTitle}>Последствия удаления:</h4>
            <ul className={styles.warningList}>
              <li>Токен будет удален без возможности восстановления</li>
              <li>Все связанные статистические данные будут утеряны</li>
              <li>Активные AI-запросы, использующие этот токен, могут завершиться ошибкой</li>
              {token.is_active && (
                <li className={styles.criticalWarning}>
                  Токен активен - его удаление может нарушить работу системы
                </li>
              )}
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className={styles.confirmSection}>
            <label className={styles.confirmLabel}>
              Для подтверждения введите точное название токена:
              <strong className={styles.expectedText}>{expectedConfirmText}</strong>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Введите название токена..."
              className={`${styles.confirmInput} ${
                confirmText && !isConfirmValid ? styles.inputError : ''
              } ${
                isConfirmValid ? styles.inputValid : ''
              }`}
              autoFocus
            />
            {confirmText && !isConfirmValid && (
              <div className={styles.confirmError}>
                Название не совпадает с требуемым
              </div>
            )}
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <FiAlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleConfirm}
            disabled={!isConfirmValid || loading}
          >
            {loading ? (
              <>
                <div className={styles.buttonSpinner}></div>
                Удаление...
              </>
            ) : (
              <>
                <FiTrash2 size={16} />
                Удалить токен
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;