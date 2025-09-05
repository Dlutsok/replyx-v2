import { useState, useEffect } from 'react';
import { FiX, FiHelpCircle } from 'react-icons/fi';
import styles from '../../styles/components/TutorialTooltip.module.css';

export default function TutorialTooltip({ 
  tipId, 
  title, 
  content, 
  position = 'top',
  children,
  trigger = 'hover' // 'hover', 'click', 'auto'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isShown, setIsShown] = useState(false);

  // Проверяем, была ли эта подсказка уже показана
  useEffect(() => {
    const checkIfShown = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/onboarding/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const shownTips = data.tutorial_tips_shown || [];
          setIsShown(shownTips.includes(tipId));
          
          // Автоматически показываем подсказку, если она не была показана
          if (trigger === 'auto' && !shownTips.includes(tipId)) {
            setTimeout(() => setIsVisible(true), 1000);
          }
        }
      } catch (error) {
        console.error('Ошибка проверки подсказок:', error);
      }
    };

    if (tipId) {
      checkIfShown();
    }
  }, [tipId, trigger]);

  const saveTip = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/users/onboarding/save-tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tip_id: tipId })
      });
      setIsShown(true);
    } catch (error) {
      console.error('Ошибка сохранения подсказки:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    saveTip();
  };

  const handleShow = () => {
    if (!isShown) {
      setIsVisible(true);
    }
  };

  const handleHide = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  // Не показываем подсказку, если она уже была показана ранее
  if (isShown && trigger === 'auto') {
    return children;
  }

  return (
    <div 
      className={styles.tooltipContainer}
      onMouseEnter={trigger === 'hover' ? handleShow : undefined}
      onMouseLeave={trigger === 'hover' ? handleHide : undefined}
      onClick={trigger === 'click' ? handleShow : undefined}
    >
      {children}
      
      {isVisible && (
        <div className={`${styles.tooltip} ${styles[position]}`}>
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipHeader}>
              <FiHelpCircle size={16} />
              <h4>{title}</h4>
              <button 
                className={styles.closeButton}
                onClick={handleClose}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className={styles.tooltipBody}>
              <p>{content}</p>
            </div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  );
}