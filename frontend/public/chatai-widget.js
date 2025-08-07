(function() {
  'use strict';
  
  // Конфигурация - может быть переопределена через window.ChatAIConfig
  const defaultConfig = {
    apiUrl: 'http://localhost:8000',
    frontendUrl: 'http://localhost:3000',
    siteToken: 'test_site_token_12345',
    theme: 'blue'
  };
  
  const config = window.ChatAIConfig ? { ...defaultConfig, ...window.ChatAIConfig } : defaultConfig;
  
  // Проверяем, что виджет еще не загружен
  if (window.ChatAIWidget) {
    return;
  }
  
  // Создаем namespace
  window.ChatAIWidget = {
    isMinimized: true,
    isLoaded: false,
    container: null,
    
    // Инициализация виджета
    init: function() {
      if (this.isLoaded) return;
      
      this.createContainer();
      this.loadStyles();
      this.createMinimizedWidget();
      this.isLoaded = true;
    },
    
    // Создаем основной контейнер
    createContainer: function() {
      this.container = document.createElement('div');
      this.container.id = 'chatai-widget-container';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      document.body.appendChild(this.container);
    },
    
    // Загружаем стили
    loadStyles: function() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes chatai-pulse {
          0% { box-shadow: 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 16px 50px rgba(0,0,0,0.3), 0 0 20px rgba(102, 126, 234, 0.4); }
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
          bottom: 20px;
          right: 20px;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 0.75rem;
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
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 30px rgba(102, 126, 234, 0.4);
        }
        
        .chatai-chat-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
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
        
        @media (max-width: 480px) {
          .chatai-chat-container {
            width: 100vw;
            height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
        }
      `;
      document.head.appendChild(style);
    },
    
    // Создаем свернутый виджет
    createMinimizedWidget: function() {
      const button = document.createElement('div');
      button.className = 'chatai-widget-button';
      button.innerHTML = `
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
          AI
        </div>
        
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 60% 40%, rgba(255,255,255,0.05) 1px, transparent 1px);"></div>
      `;
      
      button.addEventListener('click', () => {
        this.expand();
      });
      
      this.container.appendChild(button);
    },
    
    // Разворачиваем чат
    expand: function() {
      this.container.innerHTML = '';
      this.isMinimized = false;
      
      const chatContainer = document.createElement('div');
      chatContainer.className = 'chatai-chat-container';
      
      // Создаем iframe с нашим чатом (Safari-совместимо)
      const iframe = document.createElement('iframe');
      
      // Safari-совместимые атрибуты
      iframe.setAttribute('src', config.frontendUrl + '/chat-iframe?site_token=' + encodeURIComponent(config.siteToken));
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      
      // Применяем стили через объект для Safari
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
      
      // Слушаем сообщения от iframe
      window.addEventListener('message', (event) => {
        if (event.data.type === 'chatAI_minimize') {
          this.minimize();
        }
      });
    },
    
    // Сворачиваем чат
    minimize: function() {
      this.container.innerHTML = '';
      this.isMinimized = true;
      this.createMinimizedWidget();
    }
  };
  
  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ChatAIWidget.init();
    });
  } else {
    window.ChatAIWidget.init();
  }
  
})(); 