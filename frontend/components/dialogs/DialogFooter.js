import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiUserCheck, FiUserX, FiRefreshCw } from 'react-icons/fi';
import styles from './DialogFooter.module.css';

const DialogFooter = ({ 
  dialog, 
  isTakenOver, 
  onTakeover, 
  onRelease, 
  onSendMessage, 
  loading, 
  sendLoading,
  error 
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (err) {
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.dialogFooter}>
      {/* Takeover Control */}
      <div className={styles.takeoverSection}>
        {isTakenOver ? (
          <motion.button
            className={`${styles.takeoverButton} ${styles.release}`}
            onClick={onRelease}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <FiRefreshCw />
              </motion.div>
            ) : (
              <FiUserX />
            )}
            Отпустить диалог
          </motion.button>
        ) : (
          <motion.button
            className={`${styles.takeoverButton} ${styles.takeover}`}
            onClick={onTakeover}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <FiRefreshCw />
              </motion.div>
            ) : (
              <FiUserCheck />
            )}
            Перехватить диалог
          </motion.button>
        )}
      </div>

      {/* Message Input */}
      {isTakenOver && (
        <motion.form
          className={styles.messageForm}
          onSubmit={handleSubmit}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              className={styles.messageInput}
              disabled={isSubmitting || sendLoading}
            />
            <motion.button
              type="submit"
              className={styles.sendButton}
              disabled={!message.trim() || isSubmitting || sendLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSubmitting || sendLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiRefreshCw />
                </motion.div>
              ) : (
                <FiSend />
              )}
            </motion.button>
          </div>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </motion.form>
      )}
    </div>
  );
};

export default DialogFooter;