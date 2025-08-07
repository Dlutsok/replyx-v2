(function() {
  'use strict';
  
  // Получаем параметры из script тега (Safari-совместимо)
  const getCurrentScript = () => {
    if (document.currentScript) {
      return document.currentScript;
    }
    // Fallback для Safari и старых браузеров
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1];
  };
  
  const script = getCurrentScript();
  const scriptSrc = script ? script.src : '';
  
  // Safari-совместимый парсинг URL параметров
  const parseUrlParams = (url) => {
    const params = {};
    const queryString = url.split('?')[1];
    if (queryString) {
      const pairs = queryString.split('&');
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair.length === 2) {
          params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
      }
    }
    return params;
  };
  
  const urlParams = parseUrlParams(scriptSrc);
  
  // Конфигурация из URL параметров (Safari-совместимо)
  const getParam = (params, key, defaultValue) => {
    return params[key] !== undefined ? params[key] : defaultValue;
  };
  
  // Автоматическое определение хоста из script src
  const getHostFromScript = () => {
    if (scriptSrc) {
      try {
        const url = new URL(scriptSrc);
        return `${url.protocol}//${url.host}`;
      } catch (e) {
        // Используем default значение
      }
    }
    return 'http://localhost:3000';
  };

  const config = {
    apiUrl: getParam(urlParams, 'api', 'http://localhost:8000'),
    siteToken: getParam(urlParams, 'token', null),
    assistantId: getParam(urlParams, 'assistant_id', null),
    theme: getParam(urlParams, 'theme', 'blue'),
    type: getParam(urlParams, 'type', 'floating'),
    host: getParam(urlParams, 'host', getHostFromScript()),
    position: getParam(urlParams, 'position', 'bottom-right'),
    buttonSize: parseInt(getParam(urlParams, 'buttonSize', '80')) || 80,
    borderRadius: 12,
    welcomeMessage: getParam(urlParams, 'welcomeMessage', 'Привет! Как дела? Чем могу помочь?'),
    buttonText: getParam(urlParams, 'buttonText', 'AI'),
    showAvatar: getParam(urlParams, 'showAvatar', 'true') !== 'false',
    showOnlineStatus: getParam(urlParams, 'showOnlineStatus', 'true') !== 'false'
  };
  
  // Цветовые темы
  const themes = {
    blue: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#5a67d8'
    },
    green: {
      primary: '#48bb78',
      secondary: '#38a169',
      accent: '#2f855a'
    },
    purple: {
      primary: '#9f7aea',
      secondary: '#805ad5',
      accent: '#6b46c1'
    },
    orange: {
      primary: '#ed8936',
      secondary: '#dd6b20',
      accent: '#c05621'
    }
  };
  
  const currentTheme = themes[config.theme] || themes.blue;
  
  // Проверяем, что виджет еще не загружен
  if (window.ChatAIWidget) {
    return;
  }
  
  // Создаем namespace
  window.ChatAIWidget = {
    isMinimized: true,
    isLoaded: false,
    container: null,
    config: config,
    theme: currentTheme,
    
    // Инициализация виджета
    init: function() {
      if (this.isLoaded) return;
      
      this.createContainer();
      this.loadStyles();
      
      if (config.type === 'floating') {
        this.createFloatingWidget();
      } else if (config.type === 'embedded') {
        this.createEmbeddedWidget();
      } else if (config.type === 'fullscreen') {
        this.createFullscreenWidget();
      }
      
      this.isLoaded = true;
    },
    
    // Создаем основной контейнер (Safari-совместимо)
    createContainer: function() {
      try {
        this.container = document.createElement('div');
        this.container.id = 'chatai-widget-container';
        
        // Safari-совместимое применение стилей
        const containerStyles = {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: '999999',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };
        
        for (const [key, value] of Object.entries(containerStyles)) {
          this.container.style[key] = value;
        }
        
        // Безопасное добавление к body
        if (document.body) {
          document.body.appendChild(this.container);
        } else {
          // Если body еще не готов
          const addToBody = () => {
            if (document.body) {
              document.body.appendChild(this.container);
            } else {
              setTimeout(addToBody, 10);
            }
          };
          addToBody();
        }
      } catch (error) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      }
        }
      }
    },
    
    // Загружаем стили
    loadStyles: function() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes chatai-pulse {
          0% { box-shadow: 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 16px 50px rgba(0,0,0,0.3), 0 0 20px rgba(${this.hexToRgb(currentTheme.primary)}, 0.4); }
          100% { box-shadow: 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1); }
        }
        
        @keyframes chatai-float1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-3px) translateX(2px); }
          50% { transform: translateY(-6px) translateX(0); }
          75% { transform: translateY(-3px) translateX(-2px); }
        }
        
        @keyframes chatai-float2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(3px) translateX(-2px); }
          66% { transform: translateY(6px) translateX(2px); }
        }
        
        @keyframes chatai-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .chatai-widget-button {
          position: fixed;
          ${this.getPositionStyles()}
          width: ${config.buttonSize}px;
          height: ${config.buttonSize}px;
          background: linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.secondary});
          border-radius: ${config.borderRadius}px;
          cursor: pointer;
          box-shadow: 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000000;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          animation: chatai-pulse 3s ease-in-out infinite;
          pointer-events: auto;
        }
        
        .chatai-widget-button:hover {
          transform: scale(1.05) rotate(2deg);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 30px rgba(${this.hexToRgb(currentTheme.primary)}, 0.4);
        }
        
        .chatai-chat-container {
          position: fixed;
          ${this.getPositionStyles()};
          width: 400px;
          height: 600px;
          background: #f8fafc;
          border-radius: 0.75rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          z-index: 1000000;
          animation: chatai-slide-up 0.3s ease-out;
          pointer-events: auto;
        }
        
        .chatai-embedded-container {
          width: 100%;
          height: 600px;
          background: #f8fafc;
          border-radius: 0.75rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          pointer-events: auto;
        }
        
        .chatai-fullscreen-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          z-index: 1000000;
          pointer-events: auto;
        }
        
        @media (max-width: 480px) {
          .chatai-chat-container {
            width: 100vw;
            height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
        }
        
        .chatai-notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          border-radius: 0.75rem;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
          border: 2px solid white;
          animation: chatai-pulse 1s infinite;
        }
      `;
      document.head.appendChild(style);
    },
    
    // Конвертируем hex в rgb
    hexToRgb: function(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r}, ${g}, ${b}`;
      }
      return '102, 126, 234'; // fallback
    },

    // Получаем стили позиционирования
    getPositionStyles: function() {
      switch(config.position) {
        case 'bottom-left':
          return 'bottom: 20px; left: 20px;';
        case 'bottom-center':
          return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
        case 'bottom-right':
        default:
          return 'bottom: 20px; right: 20px;';
      }
    },
    
    // Создаем плавающий виджет
    createFloatingWidget: function() {
      const button = document.createElement('div');
      button.className = 'chatai-widget-button';
      button.innerHTML = this.getAIIcon();
      
      button.addEventListener('click', () => {
        this.expand();
      });
      
      this.container.appendChild(button);
    },
    
    // Создаем встроенный виджет
    createEmbeddedWidget: function() {
      // Ищем script тег для замены
      const targetElement = script.parentNode;
      
      const container = document.createElement('div');
      container.className = 'chatai-embedded-container';
      
      const iframe = document.createElement('iframe');
      let iframeSrc = `${config.host}/chat-iframe?theme=${config.theme}`;
      if (config.assistantId) {
        iframeSrc += `&assistant_id=${config.assistantId}`;
      } else if (config.siteToken) {
        iframeSrc += `&site_token=${config.siteToken}`;
      }
      iframe.src = iframeSrc;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 0.75rem;
      `;
      
      container.appendChild(iframe);
      targetElement.replaceChild(container, script);
    },
    
    // Создаем полноэкранный виджет
    createFullscreenWidget: function() {
      const container = document.createElement('div');
      container.className = 'chatai-fullscreen-container';
      
      const iframe = document.createElement('iframe');
      let iframeSrc = `${config.host}/chat-iframe?theme=${config.theme}`;
      if (config.assistantId) {
        iframeSrc += `&assistant_id=${config.assistantId}`;
      } else if (config.siteToken) {
        iframeSrc += `&site_token=${config.siteToken}`;
      }
      iframe.src = iframeSrc;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;
      
      container.appendChild(iframe);
      this.container.appendChild(container);
    },
    
    // AI иконка
    getAIIcon: function() {
      return `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 7v5l3 3"/>
          </svg>
          
          <div style="position: absolute; width: 4px; height: 4px; background: white; border-radius: 50%; top: 5px; right: 5px; animation: chatai-float1 2s ease-in-out infinite; opacity: 0.7;"></div>
          <div style="position: absolute; width: 3px; height: 3px; background: white; border-radius: 50%; bottom: 5px; left: 5px; animation: chatai-float2 2.5s ease-in-out infinite; opacity: 0.5;"></div>
        </div>
        
        <div style="font-size: 10px; font-weight: 600; letter-spacing: 1px; opacity: 0.9; text-transform: uppercase;">
          ${config.buttonText}
        </div>
        
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 60% 40%, rgba(255,255,255,0.05) 1px, transparent 1px);"></div>
      `;
    },
    
    // Разворачиваем чат (Safari-совместимо)
    expand: function() {
      try {
        this.container.innerHTML = '';
        this.isMinimized = false;
        
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chatai-chat-container';
        
        // Safari-совместимое создание iframe
        const iframe = document.createElement('iframe');
        
        // Строим URL более безопасно для Safari
        let iframeSrc = config.host + '/chat-iframe?theme=' + encodeURIComponent(config.theme);
        if (config.assistantId) {
          iframeSrc += '&assistant_id=' + encodeURIComponent(config.assistantId);
        } else if (config.siteToken) {
          iframeSrc += '&site_token=' + encodeURIComponent(config.siteToken);
        }
        
        // Safari-совместимые атрибуты iframe
        iframe.setAttribute('src', iframeSrc);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'camera; microphone; geolocation');
        
        // Применяем стили через объект
        const iframeStyles = {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0.75rem'
        };
        
        for (const [key, value] of Object.entries(iframeStyles)) {
          iframe.style[key] = value;
        }
        
        chatContainer.appendChild(iframe);
        this.container.appendChild(chatContainer);
        
        // Safari-совместимый обработчик сообщений
        const messageHandler = (event) => {
          try {
            // Проверяем origin для безопасности в Safari
            if (event.origin !== config.host && event.origin !== 'http://localhost:3000' && event.origin !== 'http://localhost:3001') {
              return;
            }
            
            if (event.data && event.data.type === 'chatAI_minimize') {
              this.minimize();
            }
          } catch (error) {
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      }
            }
          }
        };
        
        window.addEventListener('message', messageHandler, false);
        
        // Сохраняем обработчик для удаления
        this.messageHandler = messageHandler;
        
      } catch (error) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      }
        }
      }
    },
    
    // Сворачиваем чат
    minimize: function() {
      this.container.innerHTML = '';
      this.isMinimized = true;
      this.createFloatingWidget();
      
      // Удаляем обработчик сообщений
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }
    }
  };
  
  // Safari-совместимая инициализация
  const initWidget = () => {
    try {
      if (window.ChatAIWidget && !window.ChatAIWidget.isLoaded) {
        window.ChatAIWidget.init();
      }
    } catch (error) {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      }
      }
    }
  };
  
  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
    // Дополнительный fallback для Safari
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        setTimeout(initWidget, 100);
      }
    });
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // Небольшая задержка для Safari
    setTimeout(initWidget, 50);
  } else {
    initWidget();
  }
  
})(); 