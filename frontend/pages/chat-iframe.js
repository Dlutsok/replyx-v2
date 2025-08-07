import { useEffect, useRef, useState } from 'react';

// Динамическое определение API URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host') || 'http://localhost:3000';
    // Заменяем порт 3000 на 8000 для API
    return host.replace(':3000', ':8000');
  }
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

// Markdown utility function
function parseMarkdown(text) {
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
}

function getOrCreateGuestId() {
  let guestId = null;
  try {
    guestId = localStorage.getItem('guest_id');
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem('guest_id', guestId);
    }
  } catch {
    guestId = crypto.randomUUID();
  }
  return guestId;
}

// Звуковые уведомления
const playNotificationSound = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvmgm'); 
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (error) {
  }
};

// Профессиональные стили
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  
  .chat-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .professional-shadow {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  }
  
  .hover-lift:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .smooth-transition {
    transition: all 0.2s ease;
  }
  
  .button-active:active {
    transform: scale(0.98);
  }
  
  .typing-indicator {
    opacity: 0.6;
  }
  
  .typing-dot {
    animation: typingPulse 1.4s infinite ease-in-out;
  }
  
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  
  @keyframes typingPulse {
    0%, 60%, 100% { opacity: 0.4; }
    30% { opacity: 1; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeInUp {
    from { 
      opacity: 0; 
      transform: translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }

  .message-fade-in {
    animation: fadeInUp 0.3s ease-out;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.75rem;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }

  .message-content strong {
    font-weight: 600;
  }

  .message-content em {
    font-style: italic;
  }

  .message-content code {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 4px;
    border-radius: 0.75rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }

  .message-content pre {
    background: rgba(0, 0, 0, 0.05);
    padding: 12px;
    border-radius: 0.75rem;
    margin: 8px 0;
    overflow-x: auto;
  }

  .message-content pre code {
    background: none;
    padding: 0;
  }

  .message-content ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .message-content li {
    margin: 4px 0;
    list-style-type: disc;
  }

  .message-content br {
    margin: 4px 0;
  }
`;

// Главный компонент чата
export default function ChatIframe() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteToken, setSiteToken] = useState(null);
  const [assistantId, setAssistantId] = useState(null);
  const [dialogId, setDialogId] = useState(null);
  const [ws, setWs] = useState(null);
  const [typing, setTyping] = useState(false);
  const [guestId, setGuestId] = useState(null);
  const [debugInfo, setDebugInfo] = useState("Инициализация...");
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [chatTheme, setChatTheme] = useState('blue'); // blue, green, purple, orange
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageCache, setMessageCache] = useState({});
  const messagesEndRef = useRef(null);

  // Функция для надёжной прокрутки к последнему сообщению
  const scrollToBottom = (delay = 100) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    }, delay);
  };

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Добавляем стили в head
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  // Цветовые темы с расширенной палитрой
  const themes = {
    blue: { 
      primary: '#2563eb', 
      secondary: '#dbeafe', 
      accent: '#1d4ed8',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#eff6ff'
    },
    green: { 
      primary: '#059669', 
      secondary: '#d1fae5', 
      accent: '#047857',
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      light: '#f0fdf4'
    },
    purple: { 
      primary: '#7c3aed', 
      secondary: '#e9d5ff', 
      accent: '#6d28d9',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#faf5ff'
    },
    orange: { 
      primary: '#ea580c', 
      secondary: '#fed7aa', 
      accent: '#c2410c',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      light: '#fff7ed'
    }
  };

  const currentTheme = themes[chatTheme];


  // Message caching for performance
  useEffect(() => {
    if (dialogId && messages.length > 0) {
      setMessageCache(prev => ({ ...prev, [dialogId]: messages }));
    }
  }, [dialogId, messages]);

  // Load cached messages on dialog change
  useEffect(() => {
    if (dialogId && messageCache[dialogId]) {
      setMessages(messageCache[dialogId]);
      // Auto-scroll to bottom when loading cached messages
      scrollToBottom(200);
    }
  }, [dialogId, messageCache]);

  // Auto-scroll when messages change (fallback for any missed cases)
  useEffect(() => {
    if (messages.length > 0 && !isMinimized) {
      scrollToBottom(50);
    }
  }, [messages.length, isMinimized]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('site_token');
    const assistantId = params.get('assistant_id');
    const theme = params.get('theme') || 'blue';
    setChatTheme(theme);
    setSiteToken(token);
    const gid = getOrCreateGuestId();
    setGuestId(gid);
    
    // Если есть assistant_id - используем гостевой режим
    if (assistantId && gid) {
      setDebugInfo(`Гостевой режим. Assistant ID: ${assistantId}, Guest ID: ${gid}`);
      setAssistantId(assistantId);
      fetchOrCreateDialogWidget(assistantId, gid);
    } else if (token && gid) {
      setDebugInfo(`Токен режим. Токен: ${token ? '✅' : '❌'}, Guest ID: ${gid}`);
      fetchOrCreateDialog(token, gid);
    } else {
      setDebugInfo(`❌ Не указан ни token, ни assistant_id`);
    }
  }, []);

  useEffect(() => {
    if (dialogId && (siteToken || assistantId) && guestId) {
      setDebugInfo(`Подключаю WebSocket для диалога ${dialogId}...`);
      let wsUrl;
      const wsApiUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (assistantId) {
        // Используем новый WebSocket для гостевого режима
        wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
      } else {
        wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
      }
      const socket = new window.WebSocket(wsUrl);
      
      socket.onopen = () => {
        setDebugInfo(`✅ Чат готов к работе!`);
        setIsOnline(true);
        
        // Уведомляем родительское окно о подключении WebSocket
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'chatAI_websocket_connected'
          }, '*');
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Обработка разных типов сообщений
          if (data.type === 'typing_start') {
            setTyping(true);
            return;
          }
          
          if (data.type === 'typing_stop') {
            setTyping(false);
            return;
          }
          
          // Обычное сообщение
          if (data.message) {
            const msg = data.message;
            
            setMessages((prev) => {
              // Проверяем, не дублируется ли сообщение
              const exists = prev.find(m => m.id === msg.id);
              if (exists) return prev;
              
              const newMessages = [...prev, msg];
              // Update cache immediately
              setMessageCache(cache => ({ ...cache, [dialogId]: newMessages }));
              return newMessages;
            });
          }
          
          // Обработка сообщений от ассистента
          if (data.message && data.message.sender === 'assistant') {
            const msg = data.message;
            setTyping(false);
            setLoading(false);
            
            // Уведомляем родительское окно о получении ответа
            if (typeof window !== 'undefined' && window.parent) {
              window.parent.postMessage({
                type: 'chatAI_message_received',
                text: msg.text,
                timestamp: msg.timestamp
              }, '*');
            }
            
            // Если чат минимизирован и получено сообщение от ассистента
            if (isMinimized) {
              setNewMessageCount(prev => prev + 1);
              playNotificationSound();
              
              // Показываем браузерное уведомление
              if (Notification.permission === 'granted') {
                new Notification("Новое сообщение в чате", {
                  body: msg.text.slice(0, 100) + (msg.text.length > 100 ? '...' : ''),
                  icon: '/favicon.ico'
                });
              }
            }
          }
          
          scrollToBottom();
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (error) => {
        setDebugInfo(`❌ Ошибка WebSocket: ${error}`);
        setIsOnline(false);
        
        // Уведомляем родительское окно об ошибке
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'chatAI_error',
            message: `WebSocket error: ${error}`
          }, '*');
        }
      };
      
      socket.onclose = () => {
        setDebugInfo(`⚠️ Соединение прервано`);
        setIsOnline(false);
      };
      
      setWs(socket);
      return () => socket.close();
    }
  }, [dialogId, siteToken, assistantId, guestId]);

  // Запрос разрешения на уведомления
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Отправляем сообщение родительскому окну об изменении состояния
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent) {
      if (isMinimized) {
        window.parent.postMessage({
          type: 'chatAI_minimize'
        }, '*');
      }
    }
  }, [isMinimized]);

  // Гостевой режим для виджета
  const fetchOrCreateDialogWidget = async (assistantId, gid) => {
    try {
      setDebugInfo(`Получаю диалоги для ассистента ${assistantId}...`);
      const res = await fetch(`${API_URL}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения диалогов: ${res.status}`);
        return;
      }
      const dialogs = await res.json();
      if (dialogs.length > 0) {
        setDialogId(dialogs[0].id);
        setDebugInfo(`Найден диалог ${dialogs[0].id}, загружаю сообщения...`);
        fetchMessagesWidget(dialogs[0].id, assistantId, gid);
      } else {
        setDebugInfo(`Создаю новый диалог...`);
        const res2 = await fetch(`${API_URL}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${gid}`, { method: 'POST' });
        if (res2.ok) {
          const d = await res2.json();
          setDialogId(d.id);
          setMessages([]);
          setDebugInfo(`✅ Диалог ${d.id} создан!`);
        } else {
          setDebugInfo(`❌ Ошибка создания диалога: ${res2.status}`);
        }
      }
    } catch (e) {
      setDebugInfo(`❌ Ошибка: ${e.message}`);
    }
  };

  const fetchOrCreateDialog = async (token, gid) => {
    try {
      setDebugInfo(`Получаю диалоги...`);
    const res = await fetch(`${API_URL}/api/site/dialogs?site_token=${token}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения диалогов: ${res.status}`);
        return;
      }
    const dialogs = await res.json();
      
    if (dialogs.length > 0) {
      setDialogId(dialogs[0].id);
        setDebugInfo(`✅ Найден диалог ${dialogs[0].id}, загружаю сообщения...`);
      fetchMessages(dialogs[0].id, token, gid);
    } else {
        setDebugInfo(`Создаю новый диалог...`);
      const res2 = await fetch(`${API_URL}/api/site/dialogs?site_token=${token}&guest_id=${gid}`, { method: 'POST' });
      if (res2.ok) {
        const d = await res2.json();
        setDialogId(d.id);
        setMessages([]);
          setDebugInfo(`✅ Создан диалог ${d.id}`);
        } else {
          setDebugInfo(`❌ Ошибка создания диалога: ${res2.status}`);
        }
      }
    } catch (error) {
      setDebugInfo(`❌ Ошибка: ${error.message}`);
    }
  };

  const fetchMessagesWidget = async (dialogId, assistantId, gid) => {
    try {
      const res = await fetch(`${API_URL}/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения сообщений: ${res.status}`);
        return;
      }
      const msgs = await res.json();
      setMessages(msgs);
      setDebugInfo(`✅ Загружено ${msgs.length} сообщений`);
      scrollToBottom();
    } catch (error) {
      setDebugInfo(`❌ Ошибка загрузки сообщений: ${error.message}`);
    }
  };

  const fetchMessages = async (dialogId, token, gid) => {
    try {
    const res = await fetch(`${API_URL}/api/site/dialogs/${dialogId}/messages?site_token=${token}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения сообщений: ${res.status}`);
        return;
      }
    const msgs = await res.json();
    setMessages(msgs);
      setDebugInfo(`✅ Загружено ${msgs.length} сообщений`);
    scrollToBottom();
    } catch (error) {
      setDebugInfo(`❌ Ошибка загрузки сообщений: ${error.message}`);
    }
  };

  const handleSend = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || !dialogId || !guestId) return;
    
    // Проверяем, что есть либо токен, либо assistant_id
    if (!siteToken && !assistantId) return;
    
    setLoading(true);
    // НЕ показываем typing сразу - backend отправит typing_start
    
    // Immediately add user message to UI for better UX
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      setMessageCache(cache => ({ ...cache, [dialogId]: newMessages }));
      return newMessages;
    });
    
    if (!messageText) setInput('');
    
    // Auto-scroll to bottom after sending message
    scrollToBottom();
    
    try {
      let res;
      if (assistantId) {
        // Гостевой режим
        res = await fetch(`${API_URL}/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}&guest_id=${guestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: 'user', text: textToSend })
        });
      } else {
        // Режим с токеном
        res = await fetch(`${API_URL}/api/site/dialogs/${dialogId}/messages?site_token=${siteToken}&guest_id=${guestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: 'user', text: textToSend })
        });
      }
      
      if (res.ok) {
        // Сообщение успешно отправлено, ожидаем typing_start от backend
        setDebugInfo(`✅ Сообщение отправлено, ожидаю ответ...`);
        
        // Уведомляем родительское окно об отправке сообщения
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'chatAI_message_sent',
            text: textToSend,
            timestamp: new Date().toISOString()
          }, '*');
        }
        
        // Обновляем сообщение пользователя с реальными данными
        const responseData = await res.json();
        if (responseData.user_message) {
          setMessages(prev => prev.map(m => 
            m.id === userMessage.id ? { ...responseData.user_message, delivered: true } : m
          ));
        }
      } else {
        setDebugInfo(`❌ Ошибка отправки: ${res.status}`);
        setTyping(false);
        setLoading(false);
        // Remove the optimistically added message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } catch (error) {
      setDebugInfo(`❌ Ошибка отправки: ${error.message}`);
      setTyping(false);
      setLoading(false);
      // Remove the optimistically added message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }
    
    // Не сбрасываем loading здесь - это делается при получении ответа через WebSocket
    // setLoading(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setNewMessageCount(0);
      // Auto-scroll to bottom when expanding chat
      scrollToBottom(300);
    }
  };


  // Показываем загрузку если нет диалога
  if (!dialogId && debugInfo && !debugInfo.includes('✅')) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ 
          width: '100%', 
          height: '100vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '300px',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              animation: 'bounce 2s infinite'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '18px' }}>ChatAI</h3>
            <p style={{ margin: '0', color: '#666', fontSize: '14px', lineHeight: '1.4' }}>{debugInfo}</p>
            <div style={{
              width: '40px',
              height: '4px',
              background: currentTheme.primary,
              borderRadius: '0.75rem',
              margin: '16px auto 0',
              animation: 'pulse 1.5s infinite'
            }}></div>
          </div>
        </div>
      </>
    );
  }

  // Основной интерфейс чата
  return (
    <>
      <style>{styles}</style>
      <div style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        pointerEvents: isMinimized ? 'none' : 'auto'
      }}>
        {/* AI-виджет в свернутом состоянии */}
        {isMinimized ? (
          <div 
            onClick={toggleMinimize}
            style={{
              position: 'fixed',
              bottom: '10px',
              right: '10px',
              width: '80px',
              height: '80px',
              background: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.accent})`,
              borderRadius: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 1000,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              animation: 'aiPulse 3s ease-in-out infinite',
              pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05) rotate(2deg)';
              e.target.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3), 0 0 30px rgba(66, 153, 225, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) rotate(0deg)';
              e.target.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)';
            }}
          >
          {/* AI Brain Icon */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M12 7v5l3 3"/>
            </svg>
            
            {/* Floating particles */}
            <div style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: '#fff',
              borderRadius: '50%',
              top: '5px',
              right: '5px',
              animation: 'float1 2s ease-in-out infinite',
              opacity: '0.7'
            }}></div>
            <div style={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              background: '#fff',
              borderRadius: '50%',
              bottom: '5px',
              left: '5px',
              animation: 'float2 2.5s ease-in-out infinite',
              opacity: '0.5'
            }}></div>
          </div>
          
          {/* AI Label */}
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '1px',
            opacity: '0.9',
            textTransform: 'uppercase'
          }}>
            AI
          </div>
          
          {/* Neural network lines */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: `
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 60% 40%, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            animation: 'neuralPulse 4s ease-in-out infinite'
          }}></div>
          
          {/* Notification badge */}
          {newMessageCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '0.75rem',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center',
              animation: 'pulse 1s infinite',
              border: '2px solid #fff'
            }}>
              {newMessageCount}
            </div>
          )}
        </div>
      ) : (
        <div className="chat-container" style={{ 
          width: '100%', 
          height: '100vh',
          background: '#f8fafc',
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* Заголовок чата */}
          <div 
            onClick={toggleMinimize}
            className="professional-shadow smooth-transition"
            style={{ 
              background: currentTheme.primary,
              color: '#fff',
              padding: isMobile ? '14px 18px' : '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isOnline ? '#10b981' : '#ef4444'
            }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>Чат</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {isOnline ? 'Онлайн' : 'Переподключение...'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {newMessageCount > 0 && (
              <div style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '0.75rem',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {newMessageCount}
              </div>
            )}
            
            <div style={{ 
              transform: isMinimized ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
          </div>
        </div>


        {/* Основная область чата */}
        {!isMinimized && (
          <>

            
            {/* Область сообщений */}
            <div className="custom-scrollbar" style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '24px 20px',
              background: 'transparent'
            }}>
              {messages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#64748b'
                }}>
                  <div className="professional-shadow" style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: currentTheme.primary,
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    color: '#1e293b', 
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>Чат</h3>
                  <p style={{ 
                    margin: '0', 
                    fontSize: '14px', 
                    lineHeight: '1.5',
                    color: '#64748b'
                  }}>
                    Напишите ваш вопрос
                  </p>
                </div>
              )}
              
              {messages.map((m) => (
                <div key={m.id} className="message-fade-in" style={{ 
                  marginBottom: '16px', 
                  display: 'flex', 
                  flexDirection: m.sender === 'user' ? 'row-reverse' : 'row', 
                  alignItems: 'flex-end',
                  gap: '8px'
                }}>
                                    <div className="professional-shadow" style={{ 
                     width: '36px', 
                     height: '36px', 
                     borderRadius: '50%', 
                     background: m.sender === 'user' ? currentTheme.primary : '#10b981',
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     color: '#fff', 
                     fontSize: '14px',
                     flexShrink: 0
                   }}>
                     {m.sender === 'user' ? (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                         <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                       </svg>
                     ) : (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                       </svg>
                     )}
                   </div>
                  <div className="smooth-transition hover-lift" style={{
                    background: m.sender === 'user' ? currentTheme.primary : '#fff',
                    color: m.sender === 'user' ? '#fff' : '#1e293b',
                    borderRadius: '0.75rem',
                    padding: '12px 16px',
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontWeight: '400',
                    boxShadow: m.sender === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : `0 1px 3px ${currentTheme.primary}33`,
                    border: m.sender === 'assistant' ? '1px solid #e5e7eb' : 'none'
                  }}>
                    <div className="message-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(m.text) }} />
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      marginTop: '4px',
                      textAlign: m.sender === 'user' ? 'right' : 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                      {new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      {m.sender === 'user' && (
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                          {/* Статус доставки */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={m.delivered ? '#64748b' : '#94a3b8'} strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          {m.read && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ marginLeft: '-4px' }}>
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {typing && (
                <div className="typing-indicator message-fade-in" style={{ 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'flex-end',
                  gap: '8px'
                }}>
                  <div className="professional-shadow" style={{ 
                     width: '36px', 
                     height: '36px', 
                     borderRadius: '50%', 
                     background: '#10b981',
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     color: '#fff', 
                     fontSize: '14px',
                     flexShrink: 0
                   }}>
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                     </svg>
                   </div>
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '0.75rem', 
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#64748b',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>Печатаю</span>
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                  </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>


            
                         {/* Поле ввода */}
             <div className="professional-shadow" style={{ 
               background: '#fff',
               borderTop: '1px solid #e5e7eb',
               padding: '16px'
             }}>
               <div style={{
                 display: 'flex',
                 gap: '8px',
                 alignItems: 'center',
                 justifyContent: 'center',
                 maxWidth: '600px',
                 margin: '0 auto'
               }}>
                 
                 <div style={{ flex: 1, position: 'relative' }}>
                   <textarea
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSend();
                       }
                     }}
                     placeholder="Напишите сообщение..."
                     disabled={loading}
                     className="smooth-transition"
                     style={{ 
                       width: '100%',
                       border: '1px solid #d1d5db',
                       borderRadius: '0.75rem',
                       padding: '12px 16px',
                       fontSize: '14px',
                       outline: 'none',
                       resize: 'none',
                       minHeight: '44px',
                       maxHeight: '120px',
                       background: '#fff',
                       fontFamily: 'inherit'
                     }}
                     onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
                     onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                   />
                 </div>

                 <button 
                   className="button-active smooth-transition professional-shadow"
                   onClick={() => handleSend()}
                   disabled={loading || !input.trim()}
                   style={{ 
                     background: loading || !input.trim() ? '#d1d5db' : currentTheme.primary,
                     color: '#fff',
                     border: 'none',
                     borderRadius: '50%',
                     width: '44px',
                     height: '44px',
                     cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                     flexShrink: 0,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}
                 >
                   {loading ? (
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                       <path d="M21 12a9 9 0 11-6.219-8.56"/>
                     </svg>
                   ) : (
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <line x1="22" y1="2" x2="11" y2="13"/>
                       <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                     </svg>
                   )}
                 </button>
               </div>

               </div>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
} 