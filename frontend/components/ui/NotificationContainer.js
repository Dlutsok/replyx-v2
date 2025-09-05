import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, 
  FiLoader, FiX 
} from 'react-icons/fi';
import styles from '../../styles/components/NotificationContainer.module.css';
import { DESIGN_TOKENS } from '../../constants/designSystem';

// Иконки для разных типов уведомлений
const NotificationIcon = ({ type }) => {
  const iconProps = {
    size: 20,
    strokeWidth: 2
  };

  switch (type) {
    case 'success':
      return <FiCheckCircle {...iconProps} className={styles.successIcon} />;
    case 'error':
      return <FiXCircle {...iconProps} className={styles.errorIcon} />;
    case 'warning':
      return <FiAlertTriangle {...iconProps} className={styles.warningIcon} />;
    case 'info':
      return <FiInfo {...iconProps} className={styles.infoIcon} />;
    case 'loading':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiLoader {...iconProps} className={styles.loadingIcon} />
        </motion.div>
      );
    default:
      return <FiInfo {...iconProps} className={styles.infoIcon} />;
  }
};

// Отдельное уведомление
const Notification = React.forwardRef(({ notification, onRemove }, ref) => {
  const { id, type, message, title, action, autoClose } = notification;

  // Анимации в стиле ReplyX (плавные, профессиональные)
  const animations = {
    initial: { 
      opacity: 0, 
      y: -20,
      x: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      x: 0,
      scale: 1
    },
    exit: { 
      opacity: 0, 
      y: -10,
      x: 20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      {...animations}
      transition={{ 
        duration: 0.3, 
        ease: "easeOut",
        layout: { duration: 0.2 }
      }}
      className={`${styles.notification} ${styles[type]}`}
      role="alert"
      aria-live="polite"
    >
      {/* Иконка */}
      <div className={styles.iconContainer}>
        <NotificationIcon type={type} />
      </div>

      {/* Контент */}
      <div className={styles.content}>
        {title && (
          <div className={styles.title}>{title}</div>
        )}
        <div className={styles.message}>{message}</div>
        
        {/* Опциональное действие */}
        {action && (
          <button
            className={styles.actionButton}
            onClick={() => {
              action.onClick?.();
              onRemove(id);
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Кнопка закрытия */}
      {autoClose !== false && (
        <button
          className={styles.closeButton}
          onClick={() => onRemove(id)}
          aria-label="Закрыть уведомление"
        >
          <FiX size={16} />
        </button>
      )}
    </motion.div>
  );
});

// Добавляем displayName для лучшей отладки
Notification.displayName = 'Notification';

// Контейнер для уведомлений
const NotificationContainer = ({ notifications, onRemove }) => {
  // Если нет уведомлений, не рендерим ничего
  if (!notifications || notifications.length === 0) {
    return null;
  }
  
  // Группируем уведомления по позиции
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const position = notification.position || 'topRight';
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(notification);
    return groups;
  }, {});

  return (
    <>
      {Object.entries(groupedNotifications).map(([position, notificationList]) => (
        <div key={position} className={`${styles.container} ${styles[position]}`}>
          <AnimatePresence mode="popLayout">
            {notificationList.map((notification) => (
              <Notification
                key={notification.id}
                notification={notification}
                onRemove={onRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  );
};

export default NotificationContainer;