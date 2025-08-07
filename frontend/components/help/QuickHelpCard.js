import React from 'react';
import { FiHelpCircle, FiArrowRight, FiZap, FiMessageSquare, FiSettings } from 'react-icons/fi';
import styles from '../../styles/components/QuickHelpCard.module.css';

const QuickHelpCard = ({ user }) => {
  const quickTips = [
    {
      text: 'Создайте своего первого ассистента',
      link: '/ai-assistant',
      completed: user?.first_assistant_created,
      icon: FiZap
    },
    {
      text: 'Протестируйте в диалогах',
      link: '/dialogs',
      completed: user?.first_message_sent,
      icon: FiMessageSquare
    },
    {
      text: 'Настройте поведение',
      link: '/ai-assistant',
      completed: false,
      icon: FiSettings
    }
  ];

  const completedCount = quickTips.filter(tip => tip.completed).length;

  return (
    <div className={styles.quickHelpCard}>
      <div className={styles.header}>
        <FiHelpCircle className={styles.icon} />
        <div>
          <h3 className={styles.title}>Быстрый старт</h3>
          <p className={styles.subtitle}>
            {completedCount}/{quickTips.length} шагов завершено
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.progress}>
          <div 
            className={styles.progressBar}
            style={{ width: `${(completedCount / quickTips.length) * 100}%` }}
          />
        </div>

        <div className={styles.tips}>
          {quickTips.map((tip, index) => (
            <a 
              key={index}
              href={tip.link}
              className={`${styles.tip} ${tip.completed ? styles.completed : ''}`}
            >
              <tip.icon className={styles.tipIcon} />
              <span className={styles.tipText}>{tip.text}</span>
              {tip.completed ? (
                <span className={styles.checkmark}>✓</span>
              ) : (
                <FiArrowRight className={styles.arrow} />
              )}
            </a>
          ))}
        </div>

        <a href="/help-center" className={styles.fullHelpLink}>
          Полный центр помощи
          <FiArrowRight size={14} />
        </a>
      </div>
    </div>
  );
};

export default QuickHelpCard;