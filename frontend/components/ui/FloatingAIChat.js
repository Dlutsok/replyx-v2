import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from '../../styles/components/FloatingAIChat.module.css';

// Простые SVG иконки для избежания проблем с react-icons
const ChatIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const CloseIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SendIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22,2 15,22 11,13 2,9 22,2"/>
  </svg>
);

const UserIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BotIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" y1="16" x2="8" y2="16"/>
    <line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);

const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  // Ключи для localStorage
  const SESSION_KEY = 'ai_chat_session';
  const MESSAGES_KEY = 'ai_chat_messages';

  // Функция для генерации sessionId
  const generateSessionId = () => {
    return crypto.randomUUID();
  };

  // Функция для сохранения сессии
  const saveSession = useCallback((sessionData) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
        console.error('Ошибка сохранения сессии:', error);
      }
  }, []);

  // Функция для сохранения сообщений
  const saveMessages = useCallback((messages) => {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
        console.error('Ошибка сохранения сообщений:', error);
      }
  }, []);

  // Функция для загрузки сессии
  const loadSession = useCallback(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      const savedMessages = localStorage.getItem(MESSAGES_KEY);
      
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        setSessionId(sessionData.sessionId);
        
        if (savedMessages) {
          const messagesData = JSON.parse(savedMessages);
          setMessages(messagesData);
        }
        
        return sessionData;
      }
      
      return null;
    } catch (error) {
        console.error('Ошибка загрузки сессии:', error);
        return null;
      }
  }, []);

  // Функция инициализации новой сессии
  const initializeNewSession = useCallback(async () => {
    const newSessionId = generateSessionId();
    const sessionData = {
      sessionId: newSessionId,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    setSessionId(newSessionId);
    saveSession(sessionData);
    
    // Отправляем контекст при создании новой сессии
    await sendInitialContext(newSessionId);
    
    setIsSessionInitialized(true);
  }, []);

  // Функция отправки начального контекста
  const sendInitialContext = async (sessionId) => {
    const context = {
      companyName: 'ChatAI MVP',
      serviceDescription: 'Масштабируемая AI платформа для управления 1000+ Telegram/VK ботами',
      faq: [
        {
          question: 'Что такое ChatAI MVP?',
          answer: 'Это платформа для создания и управления множественными AI-ботами в Telegram и VK'
        },
        {
          question: 'Как создать бота?',
          answer: 'Зайдите в панель управления, нажмите "Создать бота" и следуйте инструкциям'
        },
        {
          question: 'Сколько ботов можно создать?',
          answer: 'Платформа поддерживает управление более чем 1000 ботами одновременно'
        }
      ],
      features: [
        'Создание AI-ботов для Telegram и VK',
        'Масштабируемая архитектура',
        'Интеграция с OpenAI GPT',
        'Система управления токенами',
        'Мониторинг и аналитика'
      ]
    };

    try {
      await fetch('/api/support/initialize-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          context,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
        console.error('Ошибка отправки контекста:', error);
      }
  };

  // Инициализация сессии при загрузке компонента
  useEffect(() => {
    const existingSession = loadSession();
    
    if (existingSession) {
      // Восстанавливаем существующую сессию
      setIsSessionInitialized(true);
    } else {
      // Создаем новую сессию
      initializeNewSession();
    }
  }, [loadSession, initializeNewSession]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Обновляем сохранение сообщений при их изменении
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
      saveMessages(messages);
    }
  }, [messages, saveMessages]);

  // Функция для парсинга Markdown и кнопок
  const parseMessageContent = (message) => {
    // Функция для парсинга текста с поддержкой переносов и markdown
    const parseText = (text) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    };
    
    // Проверяем, есть ли кнопки
    if (message.buttons && Array.isArray(message.buttons)) {
      return {
        text: parseText(message.text),
        buttons: message.buttons,
        hasButtons: true
      };
    }
    
    return {
      text: parseText(message.text),
      buttons: null,
      hasButtons: false
    };
  };

  // Обработчик нажатия на кнопку
  const handleButtonClick = (button) => {
    if (button.url) {
      // Переход по ссылке
      window.open(button.url, '_blank');
    } else if (button.action) {
      // Выполнение действия
      handleButtonAction(button.action);
    }
  };

  // Обработчик действий кнопок
  const handleButtonAction = (action) => {
    switch (action) {
      case 'form:request':
        // Открываем форму заявки
        // Здесь можно открыть модальное окно с формой
        break;
      case 'show:pricing':
        // Показать тарифы
        window.open('/pricing', '_blank');
        break;
      case 'start:demo':
        // Запустить демо
        window.open('/demo', '_blank');
        break;
      default:
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || !isSessionInitialized) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      // Отправляем сообщение на AI эндпоинт
      const response = await fetch('/api/support/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: input.trim(),
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        const assistantMessage = {
          id: Date.now() + 1,
          sender: 'assistant',
          text: result.message || result.text || 'Ответ получен',
          timestamp: new Date().toISOString(),
          buttons: result.buttons || null
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setTyping(false);
        setLoading(false);
      } else {
        throw new Error('Ошибка отправки сообщения');
      }
    } catch (error) {
        console.error('Error sending message:', error);
      
        // Показываем сообщение об ошибке
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'Извините, произошла ошибка при отправке сообщения. Попробуйте еще раз.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        setTyping(false);
        setLoading(false);
      }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.floatingAIChat}>
      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
      
      {/* Chat Panel */}
      {isOpen && (
        <div className={styles.chatPanel}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.statusDot}></div>
              <div>
                <h3 className={styles.chatTitle}>Поддержка</h3>
                <p className={styles.chatSubtitle}>Онлайн</p>
              </div>
            </div>
            <button 
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть чат"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          
          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.length === 0 && (
              <div className={styles.welcomeMessage}>
                <div className={styles.welcomeIcon}>
                  <BotIcon size={32} />
                </div>
                <h4>Добро пожаловать!</h4>
                <p>Опишите ваш вопрос, и мы поможем вам</p>
              </div>
            )}
            
            {messages.map((message) => {
              const content = parseMessageContent(message);
              return (
                <div 
                  key={message.id} 
                  className={`${styles.message} ${styles[message.sender]}`}
                >
                  <div className={styles.messageAvatar}>
                    {message.sender === 'user' ? (
                      <UserIcon size={16} />
                    ) : (
                      <BotIcon size={16} />
                    )}
                  </div>
                  <div className={styles.messageContent}>
                    <div 
                      className={styles.messageText}
                      dangerouslySetInnerHTML={{ __html: content.text }}
                    />
                    
                    {/* Кнопки */}
                    {content.hasButtons && content.buttons && (
                      <div className={styles.messageButtons}>
                        {content.buttons.map((button, index) => (
                          <button
                            key={index}
                            className={styles.actionButton}
                            onClick={() => handleButtonClick(button)}
                          >
                            {button.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className={styles.messageTime}>
                      {new Date(message.timestamp).toLocaleTimeString('ru', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {typing && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageAvatar}>
                  <BotIcon size={16} />
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Напишите ваш вопрос..."
                className={styles.messageInput}
                disabled={loading}
                rows={1}
              />
              <button 
                className={styles.sendButton}
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Отправить сообщение"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Button */}
      <button 
        className={`${styles.chatButton} ${isOpen ? styles.active : ''}`}
        onClick={toggleChat}
        aria-label="Открыть чат поддержки"
      >
        {isOpen ? <CloseIcon size={24} /> : <ChatIcon size={24} />}
        <div className={styles.buttonText}>ИИ</div>
        <div className={styles.buttonEffects}></div>
      </button>
    </div>
  );
};

export default FloatingAIChat;