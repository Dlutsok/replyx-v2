import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';
import styles from './MessageHistory.module.css';

const MessageHistory = ({ messages, loading, error }) => {
  const messagesEndRef = useRef(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > prevMessageCount) {
      scrollToBottom();
      setPrevMessageCount(messages.length);
    }
  }, [messages, prevMessageCount]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSenderLabel = (sender) => {
    switch (sender) {
      case 'user': return 'Пользователь';
      case 'assistant': return 'Ассистент';
      case 'manager': return 'Менеджер';
      default: return sender;
    }
  };

  if (loading) {
    return (
      <div className={styles.messageHistory}>
        <div className={styles.loadingState}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiRefreshCw />
          </motion.div>
          <p>Загрузка сообщений...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.messageHistory}>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.messageHistory}>
      <div className={styles.messagesContainer}>
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              className={`${styles.messageWrapper} ${styles[message.sender]}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {message.sender !== 'user' && (
                <div className={styles.senderLabel}>
                  {getSenderLabel(message.sender)}
                </div>
              )}
              <div className={styles.messageBubble}>
                <div className={styles.messageText}>
                  {message.text}
                </div>
                {message.timestamp && (
                  <div className={styles.messageTime}>
                    {formatTime(message.timestamp)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {messages.length === 0 && (
        <div className={styles.emptyState}>
          <p>Сообщений пока нет</p>
        </div>
      )}
    </div>
  );
};

export default MessageHistory;