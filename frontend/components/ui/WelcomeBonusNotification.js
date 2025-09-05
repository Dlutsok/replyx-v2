import { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import styles from '../../styles/components/WelcomeBonusNotification.module.css';

export default function WelcomeBonusNotification() {
  const { showSuccess, showError } = useNotifications();
  const [show, setShow] = useState(false);
  const [bonusInfo, setBonusInfo] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    checkWelcomeBonusStatus();
  }, []);

  const checkWelcomeBonusStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const base = typeof window !== 'undefined' ? `${window.location.origin}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      const response = await fetch(`${base}/api/balance/welcome-bonus-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setBonusInfo(data);
      
      // Показываем уведомление если бонус еще не получен
      if (!data.welcome_bonus_received) {
        setShow(true);
      }
    } catch (error) {
        console.error('Ошибка получения статуса приветственного бонуса:', error);
      }
  };

  const claimWelcomeBonus = async () => {
    if (claiming) return;
    setClaiming(true);

    try {
      const token = localStorage.getItem('token');
      const base = typeof window !== 'undefined' ? `${window.location.origin}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      const response = await fetch(`${base}/api/balance/claim-welcome-bonus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Обновляем баланс в header
        const balanceUpdateEvent = new CustomEvent('balanceUpdated', {
          detail: { newBalance: data.new_balance }
        });
        window.dispatchEvent(balanceUpdateEvent);
        
        // Закрываем уведомление
        setShow(false);
        
        // Показываем успешное сообщение через новую систему
        showSuccess(data.message);
      }
    } catch (error) {
        console.error('Ошибка получения приветственного бонуса:', error);
        showError('Ошибка при получении бонуса. Попробуйте позже.');
      } finally {
      setClaiming(false);
    }
  };

  if (!show || !bonusInfo || bonusInfo.welcome_bonus_received) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Верхняя часть */}
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className={styles.title}>Добро пожаловать в ReplyX!</h2>
          <p className={styles.subtitle}>Ваш AI-ассистент готов к работе</p>
        </div>
        
        {/* Блок с бонусом */}
        <div className={styles.bonusCard}>
          <div className={styles.bonusMain}>
            <div className={styles.bonusIconWrapper}>
              <svg className={styles.bonusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className={styles.bonusContent}>
              <h3 className={styles.bonusTitle}>Приветственный бонус</h3>
              <div className={styles.bonusAmount}>{bonusInfo.bonus_amount} ₽</div>
              <p className={styles.bonusSubtext}>~30–35 AI сообщений</p>
            </div>
          </div>
        </div>
        
        {/* Инфо-подсказка */}
        <p className={styles.infoText}>
          Средства зачислятся на баланс сразу после активации бонуса
        </p>
        
        {/* Кнопки */}
        <div className={styles.actions}>
          <button
            className={styles.claimButton}
            onClick={claimWelcomeBonus}
            disabled={claiming}
          >
            {claiming ? (
              <>
                <span className={styles.spinner}></span>
                Активируем бонус...
              </>
            ) : (
              'Активировать бонус'
            )}
          </button>
          <button
            className={styles.skipButton}
            onClick={() => setShow(false)}
            disabled={claiming}
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
}