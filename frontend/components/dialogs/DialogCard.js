import { motion } from 'framer-motion';
import { 
  FiMessageCircle, FiSmartphone, FiUser, FiClock, 
  FiCheckCircle, FiUserCheck, FiAlertCircle,
  FiMoreVertical, FiEye, FiX
} from 'react-icons/fi';
import styles from './DialogCard.module.css';
import { getUserDisplayName as getDialogUserDisplayName } from '../../utils/dialogHelpers';

const DialogCard = ({ 
  dialog, 
  onOpen, 
  onTakeover, 
  onRelease, 
  bots,
  index 
}) => {
  const getChannelType = (dialog) => {
    if (dialog.telegram_chat_id || dialog.telegram_username) return 'telegram';
    if (dialog.guest_id) return 'website';
    return 'unknown';
  };

  const getChannelIcon = (dialog) => {
    const type = getChannelType(dialog);
    return type === 'telegram' ? <FiMessageCircle /> : <FiSmartphone />;
  };

  const getChannelName = (dialog) => {
    const type = getChannelType(dialog);
    return type === 'telegram' ? 'Telegram' : 'Веб-чат';
  };

  const getUserDisplayName = (dialog) => {
    return getDialogUserDisplayName(dialog);
  };

  const getInitials = (name, email, dialog = null) => {
    if (name && name !== 'Неизвестно') {
      return name.charAt(0).toUpperCase();
    }
    
    if (dialog) {
      if (dialog.first_name) {
        return dialog.first_name.charAt(0).toUpperCase();
      }
      if (dialog.telegram_username) {
        return dialog.telegram_username.charAt(0).toUpperCase();
      }
    }
    
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    return date.toLocaleDateString('ru-RU');
  };

  const getStatusInfo = (dialog) => {
    const now = new Date();
    const lastMsg = new Date(dialog.last_message_at);
    const needsAttention = (now - lastMsg) > 60 * 60 * 1000; // Более часа

    if (dialog.is_taken_over === 1) {
      return {
        text: 'Перехвачен',
        color: 'yellow',
        icon: <FiUserCheck />
      };
    }
    
    if (needsAttention) {
      return {
        text: 'Требует внимания',
        color: 'red',
        icon: <FiAlertCircle />
      };
    }
    
    if (dialog.auto_response) {
      return {
        text: 'Активен',
        color: 'green',
        icon: <FiCheckCircle />
      };
    }

    return {
      text: 'Новый',
      color: 'blue',
      icon: <FiMessageCircle />
    };
  };

  const getBotName = (dialog) => {
    const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
    return bot ? bot.assistant_name : 'Неизвестный бот';
  };

  const displayName = getUserDisplayName(dialog);
  const statusInfo = getStatusInfo(dialog);
  const botName = getBotName(dialog);

  return (
    <motion.div
      className={`${styles.dialogCard} ${styles[statusInfo.color]}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => onOpen(dialog)}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.userSection}>
          <div className={styles.avatar}>
            {getInitials(dialog.name, dialog.email, dialog)}
          </div>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>{displayName}</h3>
            <p className={styles.userSub}>
              {dialog.telegram_username ? `@${dialog.telegram_username}` :
               dialog.email || `ID: ${dialog.user_id}`}
            </p>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          <motion.button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(dialog);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <FiEye />
          </motion.button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`${styles.statusBadge} ${styles[statusInfo.color]}`}>
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            {getChannelIcon(dialog)}
            <span>{getChannelName(dialog)}</span>
          </div>
          <div className={styles.metaItem}>
            <FiUser />
            <span>{botName}</span>
          </div>
        </div>

        <div className={styles.timeInfo}>
          <FiClock />
          <span>{formatTime(dialog.last_message_at || dialog.started_at)}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.cardFooter}>
        {dialog.is_taken_over === 1 ? (
          <motion.button
            className={`${styles.footerBtn} ${styles.release}`}
            onClick={(e) => {
              e.stopPropagation();
              onRelease(dialog.id);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <FiX />
            Освободить
          </motion.button>
        ) : (
          <motion.button
            className={`${styles.footerBtn} ${styles.takeover}`}
            onClick={(e) => {
              e.stopPropagation();
              onTakeover(dialog.id);
            }}
            whileTap={{ scale: 0.95 }}
          >
            <FiUserCheck />
            Перехватить
          </motion.button>
        )}
        
        <motion.button
          className={`${styles.footerBtn} ${styles.open}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(dialog);
          }}
          whileTap={{ scale: 0.95 }}
        >
          <FiMessageCircle />
          Открыть
        </motion.button>
      </div>

      {/* Swipe Indicator */}
      <div className={styles.swipeIndicator}>
        <div className={styles.swipeDots}>
          <div className={styles.swipeDot}></div>
          <div className={styles.swipeDot}></div>
          <div className={styles.swipeDot}></div>
        </div>
      </div>
    </motion.div>
  );
};

export default DialogCard;