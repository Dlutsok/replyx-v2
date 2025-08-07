import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/pages/Referral.module.css';
import { 
  FiUsers, FiGift, FiCopy, FiCheck, FiShare2, 
  FiDollarSign, FiTrendingUp, FiCalendar
} from 'react-icons/fi';

export default function Referral() {
  const [referralStats, setReferralStats] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Загружаем статистику рефералов
    Promise.all([
      fetch('http://localhost:8000/api/referral/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:8000/api/referral/link', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ])
      .then(async ([statsRes, linkRes]) => {
        const stats = await statsRes.json();
        const link = await linkRes.json();
        
        setReferralStats(stats);
        setReferralLink(link.referral_link);
      })
      .catch(err => {
        console.error('Ошибка загрузки реферальных данных:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      }
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Присоединяйся к YoManage!',
          text: 'Попробуй лучшую платформу для создания AI ассистентов',
          url: referralLink,
        });
      } catch (err) {
        // Fallback на копирование в буфер обмена
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h1 className={styles.title}>Реферальная программа</h1>
        <p className={styles.subtitle}>
          Приглашайте друзей и получайте бонусы за каждого активного пользователя
        </p>
      </div>

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiUsers />
          </div>
          <div className={styles.statContent}>
            <h3>Всего рефералов</h3>
            <div className={styles.statValue}>{referralStats?.total_referrals || 0}</div>
            <div className={styles.statDescription}>
              Подтверждено: {referralStats?.confirmed_referrals || 0}
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiDollarSign />
          </div>
          <div className={styles.statContent}>
            <h3>Заработано</h3>
            <div className={styles.statValue}>
              {referralStats?.total_earned?.toLocaleString('ru-RU') || 0} ₽
            </div>
            <div className={styles.statDescription}>
              Реферальные бонусы
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiTrendingUp />
          </div>
          <div className={styles.statContent}>
            <h3>В ожидании</h3>
            <div className={styles.statValue}>{referralStats?.pending_referrals || 0}</div>
            <div className={styles.statDescription}>
              Требуют подтверждения
            </div>
          </div>
        </div>
      </div>

      {/* Реферальная ссылка */}
      <div className={styles.linkSection}>
        <h2 className={styles.sectionTitle}>Ваша реферальная ссылка</h2>
        <div className={styles.linkCard}>
          <div className={styles.linkDisplay}>
            <input 
              type="text" 
              value={referralLink} 
              readOnly 
              className={styles.linkInput}
            />
            <button 
              className={styles.copyButton}
              onClick={copyToClipboard}
              title="Копировать ссылку"
            >
              {copied ? <FiCheck /> : <FiCopy />}
            </button>
            <button 
              className={styles.shareButton}
              onClick={shareReferralLink}
              title="Поделиться"
            >
              <FiShare2 />
            </button>
          </div>
          <div className={styles.linkActions}>
            <div className={styles.referralCode}>
              Ваш код: <strong>{referralStats?.referral_code}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Условия программы */}
      <div className={styles.conditionsSection}>
        <h2 className={styles.sectionTitle}>Условия программы</h2>
        <div className={styles.conditionsGrid}>
          <div className={styles.conditionCard}>
            <div className={styles.conditionIcon}>
              <FiGift />
            </div>
            <div className={styles.conditionContent}>
              <h3>Бонус для друга</h3>
              <p>Ваш друг получает <strong>50 ₽</strong> на баланс сразу после регистрации</p>
            </div>
          </div>

          <div className={styles.conditionCard}>
            <div className={styles.conditionIcon}>
              <FiDollarSign />
            </div>
            <div className={styles.conditionContent}>
              <h3>Ваш бонус</h3>
              <p>Вы получаете <strong>100 ₽</strong> после того, как друг потратит первые 100 ₽</p>
            </div>
          </div>

          <div className={styles.conditionCard}>
            <div className={styles.conditionIcon}>
              <FiTrendingUp />
            </div>
            <div className={styles.conditionContent}>
              <h3>Дополнительные бонусы</h3>
              <p>Получайте <strong>10% от пополнений</strong> ваших активных рефералов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Список рефералов */}
      {referralStats?.referrals && referralStats.referrals.length > 0 && (
        <div className={styles.referralsSection}>
          <h2 className={styles.sectionTitle}>Ваши рефералы</h2>
          <div className={styles.referralsList}>
            {referralStats.referrals.map((referral, index) => (
              <div key={referral.id} className={styles.referralItem}>
                <div className={styles.referralInfo}>
                  <div className={styles.referralNumber}>#{index + 1}</div>
                  <div className={styles.referralDetails}>
                    <div className={styles.referralDate}>
                      <FiCalendar />
                      {new Date(referral.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div className={styles.referralStatus}>
                      <span className={`${styles.statusBadge} ${styles[referral.status]}`}>
                        {referral.status === 'confirmed' ? 'Подтвержден' : 'Ожидает'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.referralBonus}>
                  {referral.status === 'confirmed' ? 
                    `+${referral.bonus_amount} ₽` : 
                    'Ожидает'
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Referral; 