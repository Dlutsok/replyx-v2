import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiCheckCircle, FiXCircle, FiInfo, FiAlertCircle } from 'react-icons/fi';
import MessageLinks from '../chat/MessageLinks';
import styles from './MessageHistory.module.css';

const MessageHistory = ({ messages, loading, error }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(50); // Начинаем с 50 сообщений
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Оптимизация: виртуализация сообщений для больших чатов
  const displayedMessages = useMemo(() => {
    if (messages.length <= visibleMessages) {
      return messages;
    }
    return messages.slice(-visibleMessages); // Показываем последние N сообщений
  }, [messages, visibleMessages]);

  // Отслеживание позиции скрола
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px от дна
    setIsAtBottom(atBottom);

    // Автоматическая загрузка большего количества сообщений при скроле вверх
    if (scrollTop < 100 && messages.length > visibleMessages) {
      setVisibleMessages(prev => Math.min(prev + 20, messages.length));
    }
  };

  useEffect(() => {
    if (messages.length > prevMessageCount && isAtBottom) {
      // Прокрутка вниз только если пользователь был внизу чата
      setTimeout(scrollToBottom, 100);
      setPrevMessageCount(messages.length);
    }
  }, [messages, prevMessageCount, isAtBottom]);

  // Сброс счетчика видимых сообщений при новом диалоге
  useEffect(() => {
    setVisibleMessages(50);
    setPrevMessageCount(0);
    setIsAtBottom(true);
  }, [messages.length > 0 && prevMessageCount === 0 ? messages[0]?.id : null]);

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
      default: return sender || 'system';
    }
  };

  const getAvatarLetter = (sender) => {
    const map = { user: 'U', assistant: 'A', manager: 'M' };
    return map[sender] || 'S';
  };

  // Обрабатываем текст (оставляем эмодзи, но убираем лишние пробелы)
  const sanitizeText = (text = '') => text.replace(/\s{2,}/g, ' ').trim();

  // Markdown utility function (copied from chat-iframe.js)
  const parseMarkdown = (text) => {
    // Guard clause: handle null, undefined, or non-string values
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Links [text](url) - обрабатываем ПЕРЕД остальными элементами
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    // Lists
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Wrap consecutive list items
    text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');

    return text;
  };

  const getSystemNoticeType = (text = '') => {
    const t = sanitizeText(text).toLowerCase();
    if (t.includes('подключил') || t.includes('оператор подключился') || t.includes('успешно')) return 'success';
    if (t.includes('возвращен к ai-ассистенту') || t.includes('переключаем') || t.includes('ожидайте')) return 'warning';
    if (t.includes('ошиб') || t.includes('не удалось') || t.includes('отмен')) return 'error';
    return 'info';
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
      {/* Индикатор виртуализации для больших чатов */}
      {messages.length > visibleMessages && (
        <div className={styles.virtualizationNotice}>
          <small>Показаны последние {visibleMessages} из {messages.length} сообщений</small>
          <button
            className={styles.loadMoreBtn}
            onClick={() => setVisibleMessages(prev => Math.min(prev + 50, messages.length))}
          >
            Загрузить ещё {Math.min(50, messages.length - visibleMessages)} сообщений
          </button>
        </div>
      )}

      <div
        className={styles.messagesContainer}
        ref={containerRef}
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {displayedMessages.map((message, index) => {
            const rowClass = message.sender === 'system'
              ? `${styles.messageRow} ${styles.system}`
              : `${styles.messageRow} ${styles[message.sender] || ''}`;
            return (
            <motion.div
              key={message.id || `msg-${index}`}
              className={rowClass}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
            >
              {message.sender !== 'system' ? (
                <>
                  <div className={styles.avatar}>{getAvatarLetter(message.sender)}</div>
                  <div className={styles.msgBody}>
                    <div className={styles.msgHeader}>
                      <span className={styles.senderName}>{getSenderLabel(message.sender)}</span>
                      {message.timestamp && (
                        <span className={styles.msgTime}>{formatTime(message.timestamp)}</span>
                      )}
                    </div>
                    <div className={styles.msgText} dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }} />
                    {/* Отображаем кнопки ссылок для сообщений ассистента и менеджера */}
                    {(message.sender === 'assistant' || message.sender === 'manager') && (
                      <MessageLinks 
                        messageText={message.text} 
                        sender={message.sender}
                        compact={false}
                      />
                    )}
                  </div>
                </>
              ) : (
                (() => {
                  const type = getSystemNoticeType(message.text);
                  const Icon = type === 'success' ? FiCheckCircle : type === 'error' ? FiXCircle : type === 'warning' ? FiAlertCircle : FiInfo;
                  return (
                    <div className={`${styles.systemNotice} ${styles[type]}`}>
                      <Icon className={styles.systemIcon} />
                      <div className={styles.systemContent}>
                        <div className={styles.systemText} dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }} />
                        {message.timestamp && (
                          <div className={styles.systemTime}>{formatTime(message.timestamp)}</div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </motion.div>
          )})}
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