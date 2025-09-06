import { useEffect, useRef, useState } from 'react';

// Динамическое определение API URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const explicitApi = urlParams.get('api');
    if (explicitApi) return explicitApi;
    
    // Если нет явного API, используем хост страницы с портом 8000 для backend
    if (window.location.hostname !== 'localhost') {
      // В продакшене backend на том же хосте
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
  }
  // Используем переменную окружения для backend URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
};

const API_URL = getApiUrl();

// Feature flags - MIGRATED TO SSE: Always use SSE transport
const USE_SSE_TRANSPORT = true;

// Debug логирование API URL
console.log('[ReplyX iframe] API_URL:', API_URL);
console.log('[ReplyX iframe] Transport mode: SSE (WebSocket removed)');
console.log('[ReplyX iframe] URL params:', typeof window !== 'undefined' ? window.location.search : 'N/A');

// Security utility: safely logs URLs with tokens
function safeLogUrl(url, label = "URL") {
  if (!url) return;
  try {
    const urlObj = new URL(url.replace(/^wss?:\/\//, 'https://'));
    const params = new URLSearchParams(urlObj.search);
    
    // Mask sensitive parameters
    ['site_token', 'token', 'api_key', 'secret'].forEach(param => {
      const value = params.get(param);
      if (value && value.length > 10) {
        params.set(param, `${value.substring(0, 10)}...(${value.length} chars)`);
      }
    });
    
    const safeUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`[ReplyX iframe] ${label}: ${safeUrl}`);
  } catch (e) {
    console.log(`[ReplyX iframe] ${label}: [invalid URL format]`);
  }
}

// Markdown utility function
function parseMarkdown(text) {
  // Guard clause: handle null, undefined, or non-string values
  if (!text || typeof text !== 'string') {
    return '';
  }
  
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
      // Проверяем поддержку crypto.randomUUID() с fallback
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        guestId = crypto.randomUUID();
      } else {
        // Fallback для старых браузеров
        guestId = 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
      }
      localStorage.setItem('guest_id', guestId);
    }
  } catch {
    // Fallback если localStorage недоступен (приватный режим, старые браузеры)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      guestId = crypto.randomUUID();
    } else {
      guestId = 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }
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

// Современные стили в стилистике скриншота с уникальными классами
const styles = `
  /* Intel Font - подключение */
  @import url('https://fonts.googleapis.com/css2?family=Intel+One+Mono:wght@400;500;600;700&display=swap');
  
  #replyx-chat-widget {
    z-index: 999999999 !important;
    position: fixed;
    width: 100%;
    height: 100%;
    bottom: 0px;
    right: 0px;
    pointer-events: none;
    font-family: 'Intel One Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  }

  /* Мобильная адаптация: делаем контейнер меньше */
  @media (max-width: 768px) {
    #replyx-chat-widget {
      bottom: 80px;
      right: 16px;
      left: 16px;
      top: 80px;
      width: auto;
      height: auto;
    }
  }
  
  .replyx-chat-root {
    pointer-events: none;
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .message-bubble {
    padding: 10px 16px;
    border-radius: 20px;
    margin: 2px 0px;
    font-size: 15px;
    line-height: 20px;
    overflow-wrap: break-word;
    display: inline-block;
    max-width: 85%;
    clear: both;
    position: relative;
    transition: margin 0.28s ease-in-out;
  }
  
  .user-message {
    background: var(--theme-primary, #3b82f6);
    color: white;
    margin-left: auto;
    margin-right: 16px;
    border-bottom-right-radius: 6px;
  }
  
  .assistant-message {
    background: #f3f4f6;
    color: #1f2937;
    margin-left: 16px;
    margin-right: auto;
    border-bottom-left-radius: 6px;
  }
  
  .message-time {
    font-size: 12px;
    opacity: 0.7;
    margin-top: 4px;
    text-align: right;
  }
  
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 16px;
    margin-right: auto;
    background: #f3f4f6;
    border-radius: 18px;
    padding: 12px 16px;
    max-width: 60px;
    margin-bottom: 8px;
  }
  
  .typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9ca3af;
    animation: typingBounce 1.4s infinite ease-in-out;
  }
  
  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }
  .typing-dot:nth-child(3) { animation-delay: 0s; }
  
  @keyframes typingBounce {
    0%, 80%, 100% { 
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% { 
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .chat-header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: white;
  }
  
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--theme-gradient, linear-gradient(135deg, #3b82f6, #1d4ed8));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    margin-right: 12px;
  }
  
  .header-info h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }
  
  .header-info p {
    margin: 2px 0 0 0;
    font-size: 13px;
    color: #6b7280;
  }
  
  .close-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: var(--theme-primary, #3b82f6);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px var(--theme-shadow, rgba(59, 130, 246, 0.4));
    transition: all 0.2s ease;
    z-index: 1000;
  }
  
  .close-button:hover {
    transform: scale(1.05);
    background: #2563eb;
  }
  
  .input-group {
    background: white;
  }
  
  .footer-input-wrapper {
    background: white;
  }
  
  .textarea-container textarea::placeholder {
    color: #9ca3af;
  }
  
  .footer-icons button:hover {
    color: #3b82f6;
  }
  
  /* Скрываем полосу прокрутки для textarea в webkit браузерах */
  textarea::-webkit-scrollbar {
    display: none;
  }

  /* Скрываем полосу прокрутки для панели эмодзи */
  .emoji-grid::-webkit-scrollbar {
    display: none;
  }
  
  .minimize-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: var(--theme-primary, #3b82f6);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 8px 32px var(--theme-shadow, rgba(59, 130, 246, 0.4));
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .minimize-button:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.5);
  }

  .minimize-button:active {
    transform: scale(0.95);
  }
  
  .chat-window {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
  }
  
  .close-button:hover {
    transform: scale(1.05);
    background: #2563eb;
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }
  
  /* Принудительное включение скролла для всех браузеров */
  .custom-scrollbar {
    overflow-y: scroll !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    position: relative;
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
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }
`;

// Главный компонент чата
export default function ChatIframe() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteToken, setSiteToken] = useState(null);
  const [assistantId, setAssistantId] = useState(null);
  const [handoffStatus, setHandoffStatus] = useState('none');
  const [dialogId, setDialogId] = useState(null);
  const [typing, setTyping] = useState(false);
  const [guestId, setGuestId] = useState(null);
  const [debugInfo, setDebugInfo] = useState("Инициализация...");
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const [creatingDialog, setCreatingDialog] = useState(false);


  // HANDOFF FUNCTION - Запрос оператора
  const requestHandoff = async () => {
    if (!dialogId) {
      alert('Диалог еще не создан');
      return;
    }

    try {
      const requestId = crypto.randomUUID(); // Идемпотентность
      const url = `${API_URL}/api/dialogs/${dialogId}/handoff/request`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Авторизация через site_token или assistant_id
      if (siteToken) {
        headers['Authorization'] = `Bearer ${siteToken}`;
      }
      
      const body = {
        reason: 'manual',
        request_id: requestId
      };
      
      // Для widget добавляем assistant_id и guest_id в параметры
      let fetchUrl = url;
      if (assistantId) {
        fetchUrl += `?assistant_id=${assistantId}&guest_id=${guestId}`;
      } else if (siteToken) {
        fetchUrl += `?guest_id=${guestId}`;
      }
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const result = await response.json();
        setHandoffStatus(result.status);
        
        // Добавляем системное сообщение
        const systemMessage = {
          id: `system-${Date.now()}`,
          sender: 'system',
          text: 'Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время',
          timestamp: new Date().toISOString(),
          system_type: 'handoff_requested'
        };
        
        setMessages(prev => [...prev, systemMessage]);
        scrollToBottom();
        
      } else {
        const error = await response.json();
        alert(`Сообщение об ошибке: ${error.detail || 'Ошибка запроса оператора'}`);
      }
    } catch (error) {
      console.error('Error requesting handoff:', error);
      alert('Ошибка соединения. Попробуйте позже.');
    }
  };
  const isMinimized = false; // В iframe всегда развернут
  
  // isMinimized больше не изменяется в iframe
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [chatTheme, setChatTheme] = useState('blue'); // blue, green, purple, orange
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageCache, setMessageCache] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  // Message caching for performance
  useEffect(() => {
    if (dialogId && messages.length > 0) {
      setMessageCache(prev => ({ ...prev, [dialogId]: messages }));
    }
  }, [dialogId, messages]);

  // Load cached messages on dialog change (только если нет текущих сообщений)
  useEffect(() => {
    if (dialogId && messageCache[dialogId] && messages.length === 0) {
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


  // Загружаем сохраненный текст при инициализации
  useEffect(() => {
    try {
      const savedInput = localStorage.getItem('replyx_draft_message');
      if (savedInput) {
        setInput(savedInput);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Сохраняем текст при изменении
  useEffect(() => {
    try {
      if (input.trim()) {
        localStorage.setItem('replyx_draft_message', input);
      } else {
        localStorage.removeItem('replyx_draft_message');
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [input]);

  // Персонализация виджета - объявляем перед использованием
  const [operatorName, setOperatorName] = useState('Поддержка');
  const [businessName, setBusinessName] = useState('Наша компания');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [widgetTheme, setWidgetTheme] = useState('blue');
  const [welcomeMessage, setWelcomeMessage] = useState('Здравствуйте! Я ваш персональный AI-ассистент. Готов предоставить информацию и оказать помощь по любым вопросам.');

  // Цветовые темы с расширенной палитрой
  const themes = {
    blue: { 
      primary: '#2563eb', 
      secondary: '#dbeafe', 
      accent: '#1d4ed8',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      light: '#eff6ff'
    },
    green: { 
      primary: '#059669', 
      secondary: '#d1fae5', 
      accent: '#047857',
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      light: '#f0fdf4'
    },
    purple: { 
      primary: '#7c3aed', 
      secondary: '#e9d5ff', 
      accent: '#6d28d9',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      light: '#faf5ff'
    },
    orange: { 
      primary: '#ea580c', 
      secondary: '#fed7aa', 
      accent: '#c2410c',
      gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      light: '#fff7ed'
    }
  };

  // Получение актуальной темы (поддержка кастомных цветов)
  const currentTheme = themes[widgetTheme] || (widgetTheme && widgetTheme.startsWith('#') ? {
    primary: widgetTheme,
    accent: widgetTheme + '33', // добавляем прозрачность для лучшей видимости
    secondary: widgetTheme + '20',
    light: widgetTheme + '10',
    gradient: `linear-gradient(135deg, ${widgetTheme} 0%, ${widgetTheme}dd 100%)`
  } : themes.blue);

  // Добавляем стили в head с темой
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = `
      :root {
        --theme-primary: ${currentTheme.primary};
        --theme-accent: ${currentTheme.accent};
        --theme-gradient: ${currentTheme.gradient};
        --theme-shadow: ${currentTheme.primary.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')};
      }
      ${styles}
    `;
    document.head.appendChild(styleSheet);
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, [currentTheme]);

  // Функция получения настроек виджета через API
  const fetchWidgetSettings = async (token) => {
    try {
      console.log('[CHAT_IFRAME] 🔄 Запрашиваем настройки виджета через API...');
      
      const response = await fetch(`${API_URL}/api/widget-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });
      
      const result = await response.json();
      
      if (result.success && result.config) {
        console.log('[CHAT_IFRAME] ✅ Настройки получены:', result.config);
        
        // Применяем полученные настройки
        if (result.config.operator_name) {
          setOperatorName(result.config.operator_name);
        }
        if (result.config.business_name) {
          setBusinessName(result.config.business_name);
        }
        if (result.config.avatar_url) {
          // Конструируем полный URL для аватара
          const fullAvatarUrl = result.config.avatar_url.startsWith('http') 
            ? result.config.avatar_url 
            : `${API_URL}${result.config.avatar_url}`;
          console.log('[CHAT_IFRAME] 🖼️ Устанавливаем URL аватара:', fullAvatarUrl);
          setAvatarUrl(fullAvatarUrl);
        }
        if (result.config.widget_theme) {
          setWidgetTheme(result.config.widget_theme);
          setChatTheme(result.config.widget_theme);
        }
        if (result.config.widget_settings && result.config.widget_settings.welcomeMessage) {
          setWelcomeMessage(result.config.widget_settings.welcomeMessage);
        }
        
        return result.config;
      } else {
        console.warn('[CHAT_IFRAME] ⚠️ Не удалось получить настройки:', result.reason);
        return null;
      }
    } catch (error) {
      console.error('[CHAT_IFRAME] ❌ Ошибка получения настроек:', error);
      return null;
    }
  };



  useEffect(() => {
    const initializeChat = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('site_token');
      const assistantId = params.get('assistant_id');
      let theme = params.get('theme') || params.get('widget_theme') || 'blue';
      
      // Декодируем URL-кодированную тему (для HEX цветов)
      if (theme && theme.includes('%23')) {
        theme = decodeURIComponent(theme);
      }
      
      // Получение параметров персонализации из URL
      const operatorNameParam = params.get('operator_name');
      const businessNameParam = params.get('business_name');
      const avatarUrlParam = params.get('avatar_url');
      
      // Устанавливаем параметры из URL, если они есть
      if (operatorNameParam) setOperatorName(decodeURIComponent(operatorNameParam));
      if (businessNameParam) setBusinessName(decodeURIComponent(businessNameParam));
      if (avatarUrlParam) {
        const decodedAvatarUrl = decodeURIComponent(avatarUrlParam);
        // Конструируем полный URL для аватара из параметров URL
        const fullAvatarUrl = decodedAvatarUrl.startsWith('http') 
          ? decodedAvatarUrl 
          : `${API_URL}${decodedAvatarUrl}`;
        console.log('[CHAT_IFRAME] 🖼️ Аватар из URL параметров:', fullAvatarUrl);
        setAvatarUrl(fullAvatarUrl);
      }
      
      // Если нет URL параметров персонализации, но есть токен - запрашиваем через API
      if (token && !operatorNameParam && !businessNameParam && !avatarUrlParam) {
        console.log('[CHAT_IFRAME] 🔍 URL параметры персонализации отсутствуют, запрашиваем через API...');
        await fetchWidgetSettings(token);
      }
      
      setChatTheme(theme);
      setWidgetTheme(theme);
      setSiteToken(token);
      const gid = getOrCreateGuestId();
      setGuestId(gid);
      
      // Проверяем, есть ли уже существующие диалоги или создаем при первом сообщении
      if (token && gid) {
        setDebugInfo(`Токен режим. Проверяю существующие диалоги...`);
        if (assistantId) {
          setAssistantId(assistantId);
        }
        // Проверяем существующие диалоги
        try {
          const existingDialogId = await fetchOrCreateDialog(token, gid);
          if (existingDialogId) {
            setDebugInfo(`✅ Диалог инициализирован`);
          }
        } catch (error) {
          console.error('Ошибка инициализации:', error);
          setDebugInfo(`✅ Готов к созданию диалога при первом сообщении`);
        }
      } else if (assistantId && gid && !token) {
        setDebugInfo(`Гостевой режим. Проверяю существующие диалоги...`);
        setAssistantId(assistantId);
        // Проверяем существующие диалоги
        try {
          const existingDialogId = await fetchOrCreateDialogWidget(assistantId, gid);
          if (existingDialogId) {
            setDebugInfo(`✅ Диалог инициализирован`);
          }
        } catch (error) {
          console.error('Ошибка инициализации:', error);
          setDebugInfo(`✅ Готов к созданию диалога при первом сообщении`);
        }
      } else {
        setDebugInfo(`❌ Не указан ни token, ни assistant_id или отсутствует guest_id`);
      }
    };
    
    initializeChat();
  }, []);

  // SSE Connection Effect - Replaces WebSocket
  useEffect(() => {
    if (dialogId && (siteToken || assistantId) && guestId) {
      setDebugInfo(`Подключаю SSE для диалога ${dialogId}...`);
      
      // Build SSE endpoint URL
      let sseUrl = `${API_URL}/api/dialogs/${dialogId}/events`;
      const params = new URLSearchParams();
      
      if (siteToken) {
        params.append('site_token', siteToken);
      }
      if (assistantId) {
        params.append('assistant_id', assistantId);  
      }
      if (guestId) {
        params.append('guest_id', guestId);
      }
      
      if (params.toString()) {
        sseUrl += `?${params.toString()}`;
      }
      
      console.log('[ReplyX iframe] SSE URL:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        setDebugInfo(`✅ Чат готов к работе (SSE)!`);
        setIsOnline(true);
        
        // После соединения — подтягиваем статус handoff для синхронизации
        (async () => {
          try {
            const statusRes = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/status`);
            if (statusRes.ok) {
              const s = await statusRes.json();
              if (s && s.status) setHandoffStatus(s.status);
            }
          } catch (e) {}
        })();
        
        // Уведомляем родительское окно о подключении SSE
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'replyX_sse_connected'
          }, '*');
        }
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 [Widget] SSE message received:', data);
          
          // Обработка разных типов сообщений через SSE
          if (data.type === 'typing_start') {
            if (handoffStatus === 'none') {
              setTyping(true);
            }
            return;
          }
          
          if (data.type === 'typing_stop') {
            setTyping(false);
            return;
          }

          // HANDOFF EVENTS - Обработка событий передачи оператору
          if (data.type === 'handoff_requested') {
            setHandoffStatus('requested');
            setTyping(false);
            const systemMessage = {
              id: `system-${Date.now()}`,
              sender: 'system',
              text: data.message || 'Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время',
              timestamp: new Date().toISOString(),
              system_type: 'handoff_requested'
            };
            setMessages(prev => [...prev, systemMessage]);
            scrollToBottom();
            return;
          }

          if (data.type === 'handoff_started') {
            setHandoffStatus('active');
            setTyping(false);
            const systemMessage = {
              id: `system-${Date.now()}`,
              sender: 'system',
              text: 'Оператор подключился',
              timestamp: new Date().toISOString(),
              system_type: 'handoff_started'
            };
            setMessages(prev => [...prev, systemMessage]);
            scrollToBottom();
            return;
          }

          if (data.type === 'handoff_released') {
            setHandoffStatus('none');
            const systemMessage = {
              id: `system-${Date.now()}`,
              sender: 'system',
              text: 'Диалог возвращен к AI-ассистенту. Спасибо за обращение!',
              timestamp: new Date().toISOString(),
              system_type: 'handoff_released'
            };
            setMessages(prev => [...prev, systemMessage]);
            scrollToBottom();
            return;
          }

          // Обычное сообщение в прямом формате {id, sender, text, timestamp} 
          if (data.id && data.sender && data.text && !data.type) {
            setMessages((prev) => {
              const exists = prev.find(m => m.id === data.id);
              if (exists) return prev;
              
              // Для сообщений пользователя: проверяем дубли по тексту и времени
              if (data.sender === 'user') {
                const recentDuplicate = prev.find(m => 
                  m.sender === 'user' && 
                  m.text === data.text && 
                  Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 60000 // в пределах минуты
                );
                if (recentDuplicate) {
                  console.log(`🔄 [Widget] Skipping duplicate user message: ${data.text}`);
                  return prev;
                }
              }
              
              setDialogLoaded(true);
              const newMessages = [...prev, data];
              setMessageCache(cache => ({ ...cache, [dialogId]: newMessages }));
              return newMessages;
            });
            
            if (data.sender === 'assistant') {
              setTyping(false);
              setLoading(false);
              
              // Уведомляем родительское окно о получении ответа
              if (typeof window !== 'undefined' && window.parent) {
                window.parent.postMessage({
                  type: 'replyX_message_received',
                  text: data.text,
                  timestamp: data.timestamp
                }, '*');
              }
            }
            
            scrollToBottom();
            return;
          }

          // Обычное сообщение в формате {message: {id, sender, text, timestamp}}
          if (data.message && data.message.sender) {
            const msg = data.message;
            
            setMessages((prev) => {
              const exists = prev.find(m => m.id === msg.id);
              if (exists) return prev;
              
              // Для сообщений пользователя: проверяем дубли по тексту и времени
              if (msg.sender === 'user') {
                const recentDuplicate = prev.find(m => 
                  m.sender === 'user' && 
                  m.text === msg.text && 
                  Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 60000 // в пределах минуты
                );
                if (recentDuplicate) {
                  console.log(`🔄 [Widget] Skipping duplicate user message: ${msg.text}`);
                  return prev;
                }
              }
              
              setDialogLoaded(true);
              const newMessages = [...prev, msg];
              setMessageCache(cache => ({ ...cache, [dialogId]: newMessages }));
              return newMessages;
            });
            
            if (msg.sender === 'assistant') {
              setTyping(false);
              setLoading(false);
              
              // Уведомляем родительское окно о получении ответа
              if (typeof window !== 'undefined' && window.parent) {
                window.parent.postMessage({
                  type: 'replyX_message_received',
                  text: msg.text,
                  timestamp: msg.timestamp
                }, '*');
              }
              
              // Если чат минимизирован и получено сообщение от ассистента
              if (isMinimized) {
                setNewMessageCount(prev => prev + 1);
                playNotificationSound();
              }
            }
          }
          
          scrollToBottom();
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setDebugInfo(`❌ Ошибка SSE: Переподключение...`);
        setIsOnline(false);
        
        // Уведомляем родительское окно об ошибке
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'replyX_error',
            message: `SSE error: ${error}`
          }, '*');
        }
      };
      
      return () => {
        eventSource.close();
      };
    }
  }, [dialogId, siteToken, assistantId, guestId]);

  // Network и visibility awareness для SSE переподключения
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isOnline) {
        console.log('Visibility changed, SSE reconnect logic here');
      }
    }
    
    const handleOnlineStatus = () => {
      if (navigator.onLine && !isOnline) {
        console.log('Online status changed, SSE reconnect logic here');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
    };
  }, [isOnline]);


  // Запрос разрешения на уведомления (с защитой для Safari/iOS)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {}
  }, []);

  // Отправляем сообщение родительскому окну при ручном сворачивании
  // (убрано из useEffect, чтобы избежать автоматического сворачивания при обновлениях состояния)

  // Гостевой режим для виджета
  const fetchOrCreateDialogWidget = async (assistantId, gid) => {
    try {
      setDebugInfo(`Получаю диалоги для ассистента ${assistantId}...`);
      const res = await fetch(`${API_URL}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения диалогов: ${res.status}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const dialogs = await res.json();
      if (dialogs.length > 0) {
        setDialogId(dialogs[0].id);
        setDebugInfo(`Найден диалог ${dialogs[0].id}, загружаю сообщения...`);
        await fetchMessagesWidget(dialogs[0].id, assistantId, gid);
        setDialogLoaded(true);
        return dialogs[0].id;
      } else {
        setDebugInfo(`Создаю новый диалог...`);
        const res2 = await fetch(`${API_URL}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${gid}`, { method: 'POST' });
        if (res2.ok) {
          const d = await res2.json();
          setDialogId(d.id);
          setMessages([]);
          setDialogLoaded(true);
          setDebugInfo(`✅ Диалог ${d.id} создан!`);
          return d.id;
        } else {
          setDebugInfo(`❌ Ошибка создания диалога: ${res2.status}`);
          throw new Error(`HTTP ${res2.status}`);
        }
      }
    } catch (e) {
      setDebugInfo(`❌ Ошибка: ${e.message}`);
      setCreatingDialog(false); // Сбрасываем флаг при ошибке
      throw e;
    }
  };

  const fetchOrCreateDialog = async (token, gid) => {
    try {
      setDebugInfo(`Получаю диалоги...`);
      const res = await fetch(`${API_URL}/api/site/dialogs?site_token=${token}&guest_id=${gid}`);
      if (!res.ok) {
        setDebugInfo(`❌ Ошибка получения диалогов: ${res.status}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const dialogs = await res.json();
      
      if (dialogs.length > 0) {
        setDialogId(dialogs[0].id);
        setDebugInfo(`✅ Найден диалог ${dialogs[0].id}, загружаю сообщения...`);
        await fetchMessages(dialogs[0].id, token, gid);
        setDialogLoaded(true);
        return dialogs[0].id;
      } else {
        setDebugInfo(`Создаю новый диалог...`);
        const res2 = await fetch(`${API_URL}/api/site/dialogs?site_token=${token}&guest_id=${gid}`, { method: 'POST' });
        if (res2.ok) {
          const d = await res2.json();
          setDialogId(d.id);
          setMessages([]);
          setDialogLoaded(true);
          setDebugInfo(`✅ Создан диалог ${d.id}`);
          return d.id;
        } else {
          setDebugInfo(`❌ Ошибка создания диалога: ${res2.status}`);
          throw new Error(`HTTP ${res2.status}`);
        }
      }
    } catch (error) {
      setDebugInfo(`❌ Ошибка: ${error.message}`);
      setCreatingDialog(false); // Сбрасываем флаг при ошибке
      throw error;
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
      console.log('[FETCH_MESSAGES_WIDGET] Загружено сообщений:', msgs.length);
      
      setMessages(msgs);
      setDialogLoaded(true);
      
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
    console.log('[FETCH_MESSAGES] Загружено сообщений:', msgs.length);
    
    setMessages(msgs);
    setDialogLoaded(true);
    
      setDebugInfo(`✅ Загружено ${msgs.length} сообщений`);
    scrollToBottom();
    } catch (error) {
      setDebugInfo(`❌ Ошибка загрузки сообщений: ${error.message}`);
    }
  };

  const handleSend = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || !guestId || loading || creatingDialog) return;
    
    // Проверяем, что есть либо токен, либо assistant_id
    if (!siteToken && !assistantId) return;
    
    // Если диалога еще нет - создаем его при первом сообщении
    if (!dialogId && !creatingDialog) {
      try {
        setCreatingDialog(true);
        setDebugInfo(`Создаю диалог при первом сообщении...`);
        let newDialogId;
        if (siteToken && guestId) {
          newDialogId = await fetchOrCreateDialog(siteToken, guestId);
        } else if (assistantId && guestId) {
          newDialogId = await fetchOrCreateDialogWidget(assistantId, guestId);
        }
        
        setCreatingDialog(false);
        
        if (!newDialogId) {
          setDebugInfo(`❌ Не удалось создать диалог`);
          return;
        }
        
        // Проверяем, что dialogId теперь установлен
        if (newDialogId !== dialogId) {
          setDebugInfo(`❌ Несоответствие dialogId: ${newDialogId} !== ${dialogId}`);
          return;
        }
        
      } catch (error) {
        setCreatingDialog(false);
        setDebugInfo(`❌ Ошибка создания диалога: ${error.message}`);
        return;
      }
    } else if (!dialogId && creatingDialog) {
      // Диалог уже создается, отменяем это сообщение
      return;
    }
    
    setLoading(true);
    // Показываем индикатор печатания только если диалог НЕ у оператора
    if (handoffStatus === 'none') {
      setTyping(true);
    }
    
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
    
    if (!messageText) {
      setInput('');
      // Очищаем сохраненный текст после отправки
      try {
        localStorage.removeItem('replyx_draft_message');
      } catch (e) {
        // Ignore localStorage errors
      }
      // Сбрасываем высоту textarea после отправки
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.overflowY = 'hidden';
      }
    }
    setLoading(false); // Разблокируем кнопку сразу после добавления сообщения
    
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
        // Сообщение успешно отправлено, ожидаем ответ
        setLoading(false); // Сразу разблокируем кнопку после успешной отправки
        setDebugInfo(`✅ Сообщение отправлено, ожидаю ответ...`);
        
        // Уведомляем родительское окно об отправке сообщения
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({
            type: 'replyX_message_sent',
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
    
    // Не сбрасываем loading здесь - это делается при получении ответа через SSE
    // setLoading(false);
  };

  // Функция для вставки эмодзи
  const insertEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Функция для получения системных иконок
  const getSystemIcon = (type) => {
    switch (type) {
      case 'handoff_requested':
        return `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; margin-right: 8px;">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 9H14V4H5V21H19V9Z" fill="#3b82f6"/>
          </svg>
        `;
      case 'handoff_started':
        return `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; margin-right: 8px;">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.5C10.07 14.5 8.5 16.07 8.5 18C8.5 19.93 10.07 21.5 12 21.5C13.93 21.5 15.5 19.93 15.5 18C15.5 16.07 13.93 14.5 12 14.5ZM12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5Z" fill="#10b981"/>
          </svg>
        `;
      case 'handoff_released':
        return `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; margin-right: 8px;">
            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="#10b981"/>
          </svg>
        `;
      case 'operator_handling':
        return `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; margin-right: 8px;">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.5C10.07 14.5 8.5 16.07 8.5 18C8.5 19.93 10.07 21.5 12 21.5C13.93 21.5 15.5 19.93 15.5 18C15.5 16.07 13.93 14.5 12 14.5Z" fill="#f59e0b"/>
          </svg>
        `;
      case 'handoff_cancelled':
        return `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; margin-right: 8px;">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#ef4444"/>
          </svg>
        `;
      default:
        return '';
    }
  };

  // Закрыть панель эмодзи при клике вне её
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker') && !event.target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  // toggleMinimize не используется в iframe - минимизацией управляет родительское окно


  // Показываем загрузку только если есть критическая ошибка (убираем обычную загрузку)
  if (!dialogId && debugInfo && debugInfo.includes('❌') && !debugInfo.includes('Подключаю SSE')) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ 
          width: '100%', 
          height: '100vh', 
          background: '#f8fafc',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '0'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '40px 32px',
            textAlign: 'center',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            border: 'none',
            borderRadius: '0'
          }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: '#f1f5f9',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '1px solid #e2e8f0'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#1e293b', 
              fontSize: '18px', 
              fontWeight: '600',
              letterSpacing: '-0.025em'
            }}>ReplyX</h3>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#64748b', 
              fontSize: '14px', 
              lineHeight: '1.5'
            }}>
              {debugInfo.includes('Failed to fetch') ? 'Проблема с подключением к серверу' : debugInfo.replace('❌ ', '')}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
            >
              Попробовать снова
            </button>
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
        {/* Окно чата - всегда отображается */}
        <div className="chat-window">
          <div className="chat-container" style={{ 
            width: '100%', 
            height: '100%',
            background: 'white',
            borderRadius: '0',
            boxShadow: 'none',
            display: 'flex', 
            flexDirection: 'column'
          }}>
            
            {/* Заголовок в стиле скриншота */}
            <div className="chat-header">
              <div className="avatar" style={{
                ...(avatarUrl ? {
                  backgroundImage: `url(${avatarUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {})
              }}>
                {!avatarUrl && (operatorName ? operatorName.charAt(0).toUpperCase() : 'П')}
              </div>
              
              <div className="header-info">
                <h3>{businessName}</h3>
              </div>
              
              <div
                style={{
                  color: '#6b7280',
                  padding: '8px',
                  marginLeft: 'auto',
                  fontSize: '14px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                AI
                {showTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '8px',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    width: '200px',
                    wordBreak: 'normal',
                    textAlign: 'left',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}>
                    Работает на технологии искусственного интеллекта • ReplyX⚡
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: '16px',
                      width: '0',
                      height: '0',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: '6px solid #1f2937'
                    }}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Область сообщений в стилистике скриншота */}
            <div className="custom-scrollbar" style={{ 
              flex: 1, 
              padding: '16px 0',
              background: 'white',
              minHeight: '0',
              maxHeight: '100%'
            }}>
              {(() => {
                const filteredMessages = messages.filter(m => m.text && m.text.trim());
                
                // Показываем приветственное сообщение только если:
                // 1. Нет сообщений И 2. Диалог загружен (не показываем при временной загрузке)
                if (filteredMessages.length === 0 && dialogLoaded) {
                  return (
                    <>
                      <div key="welcome_virtual" style={{ 
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start'
                      }}>
                        <div className="message-bubble assistant-message">
                          <div className="message-content">
                            {welcomeMessage}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                }
                
                // Показываем индикатор загрузки, если диалог ещё не загружен
                if (!dialogLoaded) {
                  return (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      padding: '20px',
                      color: '#64748b',
                      fontSize: '14px'
                    }}>
                      Загрузка...
                    </div>
                  );
                }
                
                // Показываем сообщения
                return (
                  <>
                    {filteredMessages.map((m) => (
                m.sender === 'system' ? (
                  <div key={m.id} style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 16px'
                  }}>
                    <div style={{
                      background: '#f3f4f6',
                      color: '#64748b',
                      borderRadius: '18px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      textAlign: 'center',
                      maxWidth: '80%'
                    }}>
                      <div dangerouslySetInnerHTML={{ 
                        __html: (m.system_type ? getSystemIcon(m.system_type) : '') + m.text 
                      }} />
                    </div>
                  </div>
                ) : (
                  <div key={m.id} style={{ 
                    marginBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div 
                      className={`message-bubble ${m.sender === 'user' ? 'user-message' : 'assistant-message'}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <div className="message-content" dangerouslySetInnerHTML={{ 
                        __html: (m.system_type ? getSystemIcon(m.system_type) : '') + parseMarkdown(m.text) 
                      }} />
                    </div>
                  </div>
                )
                  ))}
                  
                  {typing && (
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              );
              })()}
            </div>

            {/* Поле ввода точно как в примере */}
            <div className="input-group">
              <div className="drag-active-wrapper footer-input-wrapper">
                <hr style={{
                  border: 'none',
                  borderTop: '1px solid #e5e7eb',
                  margin: '0 20px'
                }}/>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px'
                }}>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Автоматическое изменение высоты
                      const target = e.target;
                      target.style.height = 'auto';
                      const scrollHeight = target.scrollHeight;
                      const lineHeight = 20; // примерная высота строки
                      const maxHeight = lineHeight * 4; // максимум 4 строки
                      
                      if (scrollHeight <= maxHeight) {
                        target.style.height = scrollHeight + 'px';
                        target.style.overflowY = 'hidden';
                      } else {
                        target.style.height = maxHeight + 'px';
                        target.style.overflowY = 'scroll';
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Введите ваше сообщение..."
                    disabled={loading || creatingDialog}
                    rows="1"
                    style={{
                      flex: '1',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      background: 'transparent',
                      padding: '16px 0',
                      lineHeight: '20px',
                      minHeight: '20px',
                      maxHeight: '80px', // 4 строки * 20px
                      overflowY: 'hidden',
                      // Скрываем полосу прокрутки, но оставляем функциональность
                      scrollbarWidth: 'none', // Firefox
                      msOverflowStyle: 'none' // IE/Edge
                    }}
                  />
                  
                  <button
                    onClick={() => handleSend()}
                    disabled={loading || creatingDialog || !input.trim()}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: input.trim() && !loading && !creatingDialog ? 'pointer' : 'default',
                      opacity: input.trim() && !loading && !creatingDialog ? 1 : 0.5,
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill={input.trim() && !loading && !creatingDialog ? currentTheme.primary : "#647491"}/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Футер с иконками точно как в примере */}
              <div style={{ padding: '0 16px 16px 16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {/* Иконки слева - только смайлик (убрал файл) */}
                  <div className="footer-icons-wrapper" style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button 
                      type="button" 
                      className="emoji-button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#647491',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#647491">
                        <path d="M0 0h24v24H0z" fill="none"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11ZM8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11ZM12.0006 17.5C14.3306 17.5 16.3106 16.04 17.1106 14L6.89062 14C7.69063 16.04 9.67063 17.5 12.0006 17.5Z"></path>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Powered by ReplyX */}
                  <div>
                    <a href="https://replyx.ru" target="_blank" rel="noopener noreferrer" style={{
                      textDecoration: 'none',
                      fontSize: '10px',
                      fontWeight: '500',
                      letterSpacing: '0.5px',
                      color: '#647491'
                    }}>
                      POWERED BY <span style={{ color: currentTheme.primary, fontWeight: '700' }}>ReplyX</span> ⚡
                    </a>
                  </div>
                </div>
              </div>

              {/* Панель эмодзи */}
              {showEmojiPicker && (
                <div className="emoji-picker" style={{
                  position: 'absolute',
                  bottom: '120px',
                  left: '16px',
                  right: '16px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '16px',
                  zIndex: 1000
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }} className="emoji-grid">
                    {['😀', '😃', '😄', '😁', '😊', '😇', '🙂', '🙃',
                      '😉', '😌', '😍', '😘', '😗', '😙', '😚', '😋',
                      '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
                      '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
                      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
                      '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
                      '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
                      '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
                      '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
                      '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
                      '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
                      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
                      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                      '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌',
                      '🔥', '💯', '✨', '⭐', '🌟', '💫', '⚡', '💥'
                    ].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.2s',
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
} 