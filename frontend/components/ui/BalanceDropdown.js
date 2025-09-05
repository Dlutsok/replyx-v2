import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/components/BalanceDropdown.module.css';
import { FiActivity, FiAlertCircle, FiInfo, FiCheckCircle, FiCreditCard, FiTrendingUp } from 'react-icons/fi';

export default function BalanceDropdown({ balance, onClose }) {
  const router = useRouter();

  const handleNavigate = (path) => {
    router.push(path);
    onClose();
  };

  // Расчет количества дней использования
  const daysLeft = Math.floor(balance / 5 / 20); // 5₽ за запрос, ~20 запросов в день
  
  // Определение статуса баланса
  const getBalanceStatus = () => {
    if (balance < 100) return 'low'; // Меньше чем на 1 день
    if (balance < 300) return 'medium'; // Меньше чем на 5 дней
    return 'good'; // Больше 5 дней
  };

  const balanceStatus = getBalanceStatus();

  return (
    <div className={styles.dropdown}>
      {/* Основной баланс */}
      <div className={styles.mainBalanceSection}>
        <div className={styles.mainBalanceHeader}>
          <span className={styles.balanceLabel}>Баланс</span>
          <span className={`${styles.balanceAmount} ${styles[balanceStatus]}`}>
            {balance.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <hr className={styles.balanceDivider} />
        
        {balanceStatus === 'low' && (
          <div className={styles.balanceWarning}>
            <FiAlertCircle className={styles.warningIcon} />
            <span>Низкий! Рекомендуем пополнить</span>
          </div>
        )}
        
        {balanceStatus === 'medium' && (
          <div className={styles.balanceInfo}>
            <FiInfo className={styles.infoIcon} />
            <span>Хватит на ~{daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}</span>
          </div>
        )}
        
        {balanceStatus === 'good' && (
          <div className={styles.balanceSuccess}>
            <FiCheckCircle className={styles.successIcon} />
            <span>Хватит на ~{daysLeft} дней</span>
          </div>
        )}
      </div>


      {/* Основные действия */}
      <div className={styles.actions}>
        <button 
          className={styles.topUpButton}
          onClick={() => handleNavigate('/balance')}
        >
          <FiCreditCard />
          Пополнить баланс
        </button>
      </div>

      {/* Дополнительные ссылки */}
      <div className={styles.links}>
        <button 
          className={styles.link}
          onClick={() => {
            router.push('/balance');
            // Небольшая задержка для загрузки страницы
            setTimeout(() => {
              const tab = document.querySelector('[data-tab="usage"]');
              if (tab) tab.click();
            }, 100);
            onClose();
          }}
        >
          <FiActivity className={styles.linkIcon} />
          Статистика использования
        </button>
        
        <button 
          className={styles.link}
          onClick={() => {
            router.push('/balance');
            // Небольшая задержка для загрузки страницы
            setTimeout(() => {
              const tab = document.querySelector('[data-tab="transactions"]');
              if (tab) tab.click();
            }, 100);
            onClose();
          }}
        >
          <FiTrendingUp className={styles.linkIcon} />
          История транзакций
        </button>
      </div>
    </div>
  );
} 