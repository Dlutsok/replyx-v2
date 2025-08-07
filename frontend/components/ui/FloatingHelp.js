import React, { useState } from 'react';
import { FiHelpCircle, FiX, FiBook, FiMessageSquare, FiExternalLink, FiZap } from 'react-icons/fi';
import styles from '../../styles/components/FloatingHelp.module.css';

const FloatingHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const quickHelp = [
    {
      title: 'Как создать бота?',
      description: 'Перейдите в AI-ассистент и выберите шаблон',
      link: '/ai-assistant',
      icon: FiZap
    },
    {
      title: 'Где смотреть диалоги?',
      description: 'Все сообщения доступны в разделе Диалоги',
      link: '/dialogs',
      icon: FiMessageSquare
    },
    {
      title: 'Полная документация',
      description: 'Подробные инструкции по всем функциям',
      link: '/docs',
      icon: FiBook
    }
  ];

  const toggleHelp = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.floatingHelp}>
      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
      
      {/* Help Panel */}
      {isOpen && (
        <div className={styles.helpPanel}>
          <div className={styles.helpHeader}>
            <h3 className={styles.helpTitle}>Быстрая помощь</h3>
            <button 
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              <FiX size={20} />
            </button>
          </div>
          
          <div className={styles.helpContent}>
            {quickHelp.map((item, index) => (
                             <a 
                 key={index}
                 href={item.link}
                 className={styles.helpItem}
                 onClick={() => setIsOpen(false)}
               >
                 {item.icon === FiZap ? (
                   <FiZap className={styles.helpIcon} />
                 ) : item.icon === FiMessageSquare ? (
                   <FiMessageSquare className={styles.helpIcon} />
                 ) : item.icon === FiBook ? (
                   <FiBook className={styles.helpIcon} />
                 ) : (
                   <FiZap className={styles.helpIcon} />
                 )}
                <div className={styles.helpText}>
                  <h4 className={styles.helpItemTitle}>{item.title}</h4>
                  <p className={styles.helpItemDesc}>{item.description}</p>
                </div>
                <FiExternalLink className={styles.linkIcon} />
              </a>
            ))}
          </div>
          
          <div className={styles.helpFooter}>
            <a href="/dashboard" className={styles.fullHelpLink}>
              Полный центр помощи
            </a>
          </div>
        </div>
      )}
      
      {/* Floating Button */}
      <button 
        className={`${styles.helpButton} ${isOpen ? styles.active : ''}`}
        onClick={toggleHelp}
        title="Помощь"
      >
        {isOpen ? <FiX size={24} /> : <FiHelpCircle size={24} />}
      </button>
    </div>
  );
};

export default FloatingHelp; 