import { useState, useEffect } from 'react';
import { FiGift } from 'react-icons/fi';
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

      const base = typeof window !== 'undefined' ? `${window.location.origin}` : (process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru');
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
      }
  };

  const claimWelcomeBonus = async () => {
    if (claiming) return;
    setClaiming(true);

    try {
      const token = localStorage.getItem('token');
      const base = typeof window !== 'undefined' ? `${window.location.origin}` : (process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru');
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
            <svg className={styles.icon} viewBox="0 0 200 200" fill="none">
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
          <h2 className={styles.title}>Добро пожаловать в ReplyX!</h2>
          <p className={styles.subtitle}>Ваш AI-ассистент готов к работе</p>
        </div>
        
        {/* Блок с бонусом */}
        <div className={styles.bonusCard}>
          <div className={styles.bonusMain}>
            <div className={styles.bonusIconWrapper}>
              <FiGift className={styles.bonusIcon} />
            </div>
            <div className={styles.bonusContent}>
              <h3 className={styles.bonusTitle}>Приветственный бонус</h3>
              <div className={styles.bonusAmount}>{bonusInfo.bonus_amount} ₽</div>
              <p className={styles.bonusSubtext}>~50 AI сообщений</p>
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
        </div>
      </div>
    </div>
  );
}