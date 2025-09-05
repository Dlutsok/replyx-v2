(function() {
  'use strict';
  
  // Конфигурация - может быть переопределена через window.ReplyXConfig
  const defaultOrigin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const defaultConfig = {
    apiUrl: defaultOrigin.replace(':3000', ':8000'),
    frontendUrl: defaultOrigin,
    siteToken: 'test_site_token_12345',
    theme: 'blue'
  };
  
  const config = window.ReplyXConfig ? { ...defaultConfig, ...window.ReplyXConfig } : defaultConfig;
  
  // Проверяем, что виджет еще не загружен
  if (window.ReplyXWidget) {
    return;
  }

  // Создаем namespace
  window.ReplyXWidget = {
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
      this.container.id = 'replyx-widget-container';
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
        
        @keyframes replyx-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .replyx-widget-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: rgba(8, 15, 26, 0.08) 0px 2px 8px 0px, rgba(8, 15, 26, 0.12) 0px 2px 2px 0px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 1000000;
          pointer-events: auto;
          border: none;
        }
        
        .replyx-chat-container {
          position: fixed;
          bottom: 89px;
          right: 20px;
          width: 400px;
          height: 600px;
          background: #f8fafc;
          border-radius: 0.75rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          z-index: 999999;
          animation: replyx-slide-up 0.3s ease-out;
          pointer-events: auto;
          cursor: default;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        @media (max-width: 480px) {
          .replyx-chat-container {
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
    
    // Chat иконка (speech bubble)
    getChatIcon: function() {
      return `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
          <path d="M0 0h24v24H0z" fill="none"></path>
        </svg>
      `;
    },
    
    // Close иконка (X)
    getCloseIcon: function() {
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M5.275 16L4 14.725L8.725 10L4 5.275L5.275 4L10 8.725L14.725 4L16 5.275L11.275 10L16 14.725L14.725 16L10 11.275L5.275 16Z"></path>
          <path d="M0 0h24v24H0z" fill="none"></path>
        </svg>
      `;
    },

    // Создаем свернутый виджет
    createMinimizedWidget: function() {
      const button = document.createElement('div');
      button.className = 'replyx-widget-button';
      button.innerHTML = this.getChatIcon();
      
      button.addEventListener('click', () => {
        if (this.isMinimized) {
          this.expand();
        } else {
          this.minimize();
        }
      });
      
      this.button = button; // Сохраняем ссылку для переключения иконок
      this.container.appendChild(button);
    },
    
    // Разворачиваем чат
    expand: function() {
      this.container.innerHTML = '';
      this.isMinimized = false;
      
      // Создаем кнопку с крестиком
      const button = document.createElement('div');
      button.className = 'replyx-widget-button';
      button.innerHTML = this.getCloseIcon();
      
      button.addEventListener('click', () => {
        this.minimize();
      });
      
      this.button = button;
      
      const chatContainer = document.createElement('div');
      chatContainer.className = 'replyx-chat-container';
      
      // Создаем iframe с нашим чатом (Safari-совместимо)
      const iframe = document.createElement('iframe');
      
      // Safari-совместимые атрибуты
      let iframeSrc = config.frontendUrl + '/chat-iframe?';
      const params = [];
      
      if (config.siteToken) {
        params.push('site_token=' + encodeURIComponent(config.siteToken));
      }
      
      if (config.apiUrl) {
        params.push('api=' + encodeURIComponent(config.apiUrl));
      }
      
      iframeSrc += params.join('&');
      
      console.log('[ReplyX Widget] Loading iframe with src:', iframeSrc);
      
      iframe.setAttribute('src', iframeSrc);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('tabindex', '0');
      iframe.setAttribute('scrolling', 'no');
      
      // Применяем стили через объект для Safari
      const iframeStyles = {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '0.75rem',
        pointerEvents: 'auto',
        display: 'block',
        outline: 'none'
      };
      
      for (const [key, value] of Object.entries(iframeStyles)) {
        iframe.style[key] = value;
      }
      
      // Добавляем обработчики для правильного взаимодействия с iframe
      chatContainer.addEventListener('click', (e) => {
        // Передаем focus в iframe при клике на контейнер
        e.stopPropagation();
        iframe.focus();
      });
      
      // Предотвращаем всплытие событий scroll к родительской странице
      chatContainer.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: false });
      
      chatContainer.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: false });
      
      iframe.addEventListener('load', () => {
        console.log('[ReplyX Widget] Iframe loaded successfully');
        // Устанавливаем focus на iframe после загрузки
        setTimeout(() => {
          iframe.focus();
        }, 100);
      });
      
      iframe.addEventListener('error', (e) => {
        console.error('[ReplyX Widget] Iframe failed to load:', e);
      });
      
      chatContainer.appendChild(iframe);
      this.container.appendChild(chatContainer);
      this.container.appendChild(button); // Добавляем кнопку закрытия
      
      // Слушаем сообщения от iframe
      window.addEventListener('message', (event) => {
        if (event.data.type === 'replyX_minimize') {
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
      window.ReplyXWidget.init();
    });
  } else {
    window.ReplyXWidget.init();
  }
  
})(); 