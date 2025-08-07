import { motion } from 'framer-motion';
import { FiMessageCircle, FiUser, FiClock, FiEye } from 'react-icons/fi';
import styles from './ChatWidgetCard.module.css';
import { 
  getUserDisplayName, 
  getUserSubtitle, 
  getInitials,
  getChannelType,
  toLocal 
} from '../../utils/dialogHelpers';

const ChatWidgetCard = ({ dialog, bots, onOpen, index }) => {
  const getAssistantName = () => {
    const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
    return bot ? bot.assistant_name : 'AI Ассистент';
  };

  const getLastMessage = () => {
    if (dialog.last_message) return dialog.last_message;
    if (dialog.topic) return dialog.topic;
    return 'Привет! Чем могу помочь?';
  };

  const isActive = dialog.is_taken_over !== 1 && dialog.auto_response;
  const isTakenOver = dialog.is_taken_over === 1;

  return (
    <motion.div
      className={styles.chatWidget}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={() => onOpen(dialog)}
    >
      {/* Статус индикатор */}
      <div className={`${styles.statusIndicator} ${
        isTakenOver ? styles.takenOver : 
        isActive ? styles.active : styles.inactive
      }`} />

      {/* Хэдер виджета */}
      <div className={styles.widgetHeader}>
        <div className={styles.brandInfo}>
          <div className={styles.brandIcon}>
            <FiMessageCircle />
          </div>
          <div className={styles.brandText}>
            <span className={styles.assistantName}>
              {getAssistantName()}
            </span>
            <span className={styles.channelType}>
              {getChannelType(dialog) === 'telegram' ? 'Telegram' : 'Веб-чат'}
            </span>
          </div>
        </div>
        <div className={styles.headerTime}>
          {toLocal(dialog.last_message_at)}
        </div>
      </div>

      {/* Область чата */}
      <div className={styles.chatArea}>
        {/* Сообщения */}
        <div className={styles.messagesContainer}>
          {/* Сообщение от пользователя */}
          <div className={styles.messageGroup}>
            <div className={styles.userMessage}>
              <div className={styles.messageAvatar}>
                {getInitials(dialog)}
              </div>
              <div className={styles.messageBubble + ' ' + styles.userBubble}>
                {getLastMessage().slice(0, 50)}{getLastMessage().length > 50 ? '...' : ''}
              </div>
            </div>
          </div>

          {/* Сообщение от ассистента */}
          <div className={styles.messageGroup}>
            <div className={styles.assistantMessage}>
              <div className={styles.messageAvatar + ' ' + styles.assistantAvatar}>
                🤖
              </div>
              <div className={styles.messageBubble + ' ' + styles.assistantBubble}>
                {isTakenOver ? 'Диалог перехвачен менеджером' : 
                 isActive ? 'Отлично! Чем могу помочь?' : 
                 'Диалог завершён'}
              </div>
            </div>
          </div>
        </div>

        {/* Поле ввода (декоративное) */}
        <div className={styles.inputArea}>
          <div className={styles.inputField}>
            <span className={styles.inputPlaceholder}>Напишите сообщение...</span>
          </div>
          <div className={styles.sendButton}>
            <FiMessageCircle />
          </div>
        </div>
      </div>

      {/* Информация о пользователе */}
      <div className={styles.userInfo}>
        <div className={styles.userDetails}>
          <FiUser className={styles.userIcon} />
          <div className={styles.userText}>
            <div className={styles.userName}>{getUserDisplayName(dialog)}</div>
            <div className={styles.userSubtitle}>{getUserSubtitle(dialog)}</div>
          </div>
        </div>
        <div className={styles.cardActions}>
          <motion.button
            className={styles.viewButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(dialog);
            }}
          >
            <FiEye />
            <span>Открыть</span>
          </motion.button>
        </div>
      </div>

      {/* Статусная строка */}
      <div className={styles.statusBar}>
        <div className={styles.statusText}>
          {isTakenOver ? (
            <span className={styles.statusTaken}>👨‍💼 Диалог перехвачен</span>
          ) : isActive ? (
            <span className={styles.statusActive}>🟢 Активный диалог</span>
          ) : (
            <span className={styles.statusInactive}>⏸️ Неактивный</span>
          )}
        </div>
        <div className={styles.lastActivity}>
          <FiClock />
          <span>{new Date(dialog.last_message_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatWidgetCard;