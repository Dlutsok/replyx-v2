import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DialogHeader from './DialogHeader';
import MessageHistory from './MessageHistory';
import DialogFooter from './DialogFooter';
import styles from './DialogModal.module.css';

const DialogModal = ({ 
  isOpen, 
  onClose, 
  dialogId, 
  initialDialog = null 
}) => {
  const [dialog, setDialog] = useState(initialDialog);
  const [messages, setMessages] = useState([]);
  const [isTakenOver, setIsTakenOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [takeoverLoading, setTakeoverLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Загрузка данных диалога
  const loadDialog = useCallback(async () => {
    if (!dialogId || !token) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Диалог не найден');
      }

      const dialogData = await response.json();
      setDialog(dialogData);
      setIsTakenOver(!!dialogData.is_taken_over);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки диалога');
    } finally {
      setLoading(false);
    }
  }, [dialogId, token]);

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    if (!dialogId || !token) return;

    try {
      setMessagesLoading(true);
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки сообщений');
      }

      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (err) {
      setMessageError(err.message || 'Ошибка загрузки сообщений');
    } finally {
      setMessagesLoading(false);
    }
  }, [dialogId, token]);

  // Перехват диалога
  const handleTakeover = async () => {
    if (!dialogId || !token) return;

    try {
      setTakeoverLoading(true);
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/takeover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Ошибка перехвата диалога');
      }

      setIsTakenOver(true);
    } catch (err) {
      setError(err.message || 'Ошибка перехвата диалога');
    } finally {
      setTakeoverLoading(false);
    }
  };

  // Освобождение диалога
  const handleRelease = async () => {
    if (!dialogId || !token) return;

    try {
      setTakeoverLoading(true);
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Ошибка освобождения диалога');
      }

      setIsTakenOver(false);
    } catch (err) {
      setError(err.message || 'Ошибка освобождения диалога');
    } finally {
      setTakeoverLoading(false);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (messageText) => {
    if (!dialogId || !token || !messageText.trim()) return;

    try {
      setSendLoading(true);
      setMessageError('');
      
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: 'manager',
          text: messageText
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка отправки сообщения');
      }

      // Перезагружаем сообщения после отправки
      await loadMessages();
    } catch (err) {
      setMessageError(err.message || 'Ошибка отправки сообщения');
      throw err;
    } finally {
      setSendLoading(false);
    }
  };

  // Сброс состояния при закрытии
  const handleClose = () => {
    setMessages([]);
    setError('');
    setMessageError('');
    setIsTakenOver(false);
    onClose();
  };

  // Клик по оверлею
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && dialogId) {
      if (!initialDialog) {
        loadDialog();
      } else {
        setDialog(initialDialog);
        setIsTakenOver(!!initialDialog.is_taken_over);
      }
      loadMessages();
    }
  }, [isOpen, dialogId, initialDialog, loadDialog, loadMessages]);

  // Если диалог не найден
  if (isOpen && error && !dialog) {
    return (
      <AnimatePresence>
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className={styles.errorModal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h3>Ошибка</h3>
            <p>{error}</p>
            <button onClick={handleClose} className={styles.errorButton}>
              Закрыть
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className={styles.dialogModal}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {loading || !dialog ? (
              <div className={styles.loadingContainer}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className={styles.spinner}
                >
                  ⟳
                </motion.div>
                <p>Загрузка диалога...</p>
              </div>
            ) : (
              <>
                <DialogHeader 
                  dialog={dialog} 
                  onClose={handleClose} 
                />
                
                <MessageHistory
                  messages={messages}
                  loading={messagesLoading}
                  error={messageError}
                />
                
                <DialogFooter
                  dialog={dialog}
                  isTakenOver={isTakenOver}
                  onTakeover={handleTakeover}
                  onRelease={handleRelease}
                  onSendMessage={handleSendMessage}
                  loading={takeoverLoading}
                  sendLoading={sendLoading}
                  error={messageError}
                />
              </>
            )}
            
            {error && (
              <div className={styles.errorNotification}>
                {error}
                <button onClick={() => setError('')}>✕</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DialogModal;