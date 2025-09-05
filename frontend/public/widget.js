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
    // Фолбэк: используем localhost для разработки, иначе определяем из API URL
    return 'http://localhost:3000';
  };

  const defaultHost = (() => {
    // Пытаемся вычислить хост из источника скрипта
    if (scriptSrc) {
      try {
        const u = new URL(scriptSrc);
        return `${u.protocol}//${u.host}`;
      } catch (e) {}
    }
    return 'http://localhost:3000';
  })();

  const defaultApiUrl = (() => {
    // API URL для backend (порт 8000)
    if (scriptSrc) {
      try {
        const u = new URL(scriptSrc);
        // В продакшене API на том же хосте, но порт может отличаться
        return `${u.protocol}//${u.hostname}`;
      } catch (e) {}
    }
    return 'http://localhost';
  })();

  const config = {
    apiUrl: getParam(urlParams, 'api', defaultApiUrl),
    siteToken: getParam(urlParams, 'token', null),
    assistantId: getParam(urlParams, 'assistant_id', null),
    theme: getParam(urlParams, 'theme', 'blue'),
    type: getParam(urlParams, 'type', 'floating'),
    host: getParam(urlParams, 'host', defaultHost),
    position: getParam(urlParams, 'position', 'bottom-right'),
    buttonSize: parseInt(getParam(urlParams, 'buttonSize', '80')) || 80,
    borderRadius: 12,
    welcomeMessage: getParam(urlParams, 'welcomeMessage', 'Здравствуйте! Я ваш персональный AI-ассистент. Готов предоставить информацию и оказать помощь по любым вопросам.'),
    buttonText: getParam(urlParams, 'buttonText', 'AI'),
    showAvatar: getParam(urlParams, 'showAvatar', 'true') !== 'false',
    showOnlineStatus: getParam(urlParams, 'showOnlineStatus', 'true') !== 'false',
    // Режим только для разработчика: инициализировать виджет только если localStorage содержит нужный ключ
    devOnly: getParam(urlParams, 'devOnly', 'false'),
    devKey: getParam(urlParams, 'devKey', null)
  };
  
  // Debug логирование конфигурации
  console.log('[ReplyX Widget] Configuration:', {
    host: config.host,
    apiUrl: config.apiUrl,
    scriptSrc: scriptSrc,
    userAgent: navigator.userAgent,
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  });
  
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
  
  // Поддерживаем кастомные HEX цвета
  let currentTheme;
  if (config.theme && config.theme.startsWith('#')) {
    // Кастомная тема с HEX цветом
    currentTheme = {
      primary: config.theme,
      secondary: config.theme + '33', // добавляем прозрачность
      accent: config.theme
    };
  } else {
    // Предустановленная тема
    currentTheme = themes[config.theme] || themes.blue;
  }
  
  // Проверяем, что виджет еще не загружен
  if (window.ReplyXWidget) {
    return;
  }
  
  // Создаем namespace
  window.ReplyXWidget = {
    isMinimized: true,
    isLoaded: false,
    container: null,
    config: config,
    theme: currentTheme,
    
    // Инициализация виджета
    init: function() {
      if (this.isLoaded) return;
      
      // Проверяем домен ПЕРЕД инициализацией виджета (с серверной проверкой)
      this.validateDomainAndInit();
    },
    
    // Построение URL для iframe с персональными настройками
    buildIframeUrl: function(widgetConfig) {
      let iframeSrc = `${config.host}/chat-iframe?theme=${encodeURIComponent(config.theme)}&api=${encodeURIComponent(config.apiUrl)}`;
      
      if (config.assistantId) {
        iframeSrc += `&assistant_id=${config.assistantId}`;
      }
      if (config.siteToken) {
        iframeSrc += `&site_token=${config.siteToken}`;
      }
      
      // Добавляем персональные настройки виджета в URL
      if (widgetConfig) {
        if (widgetConfig.operator_name) {
          iframeSrc += `&operator_name=${encodeURIComponent(widgetConfig.operator_name)}`;
        }
        if (widgetConfig.business_name) {
          iframeSrc += `&business_name=${encodeURIComponent(widgetConfig.business_name)}`;
        }
        if (widgetConfig.avatar_url) {
          iframeSrc += `&avatar_url=${encodeURIComponent(widgetConfig.avatar_url)}`;
        }
        if (widgetConfig.widget_theme) {
          iframeSrc += `&widget_theme=${encodeURIComponent(widgetConfig.widget_theme)}`;
        }
      }
      
      return iframeSrc;
    },
    
    // Получение настроек виджета с сервера
    fetchWidgetConfig: async function() {
      if (!this.config.siteToken) {
        return null;
      }
      
      try {
        const response = await fetch(this.config.apiUrl + '/api/widget-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config.siteToken
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('[ReplyX Widget] ✅ Настройки получены:', result.config);
          return result.config;
        } else {
          console.warn('[ReplyX Widget] Не удалось получить настройки:', result.reason);
          return null;
        }
        
      } catch (error) {
        console.warn('[ReplyX Widget] Ошибка получения настроек:', error);
        return null;
      }
    },
    
    // Валидация домена и инициализация
    validateDomainAndInit: async function() {
      if (!this.config.siteToken) {
        console.warn('[ReplyX Widget] Отсутствует токен сайта');
        return;
      }
      
      // Локальная проверка токена
      let payload;
      try {
        const tokenParts = this.config.siteToken.split('.');
        if (tokenParts.length !== 3) {
          console.error('[ReplyX Widget] Неверный формат токена');
          return;
        }
        
        payload = JSON.parse(atob(tokenParts[1]));
        
        if (!payload.allowed_domains) {
          console.warn('[ReplyX Widget] В токене отсутствуют разрешенные домены');
          return;
        }
      } catch (error) {
        console.error('[ReplyX Widget] Ошибка декодирования токена:', error);
        return;
      }
      
      // ОБЯЗАТЕЛЬНАЯ серверная проверка перед инициализацией
      const currentDomain = window.location.hostname.toLowerCase().replace(/^www\./, '');
      
      try {
        const response = await fetch(this.config.apiUrl + '/api/validate-widget-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.config.siteToken,
            domain: currentDomain
          })
        });
        
        const validation = await response.json();
        
        if (!validation.valid) {
          console.warn('[ReplyX Widget] Серверная валидация не пройдена:', validation.reason);
          if (validation.reason === 'Domain not allowed') {
            console.warn('[ReplyX Widget] Домен не разрешен. Разрешенные домены:', validation.allowed_domains);
          }
          return;
        }
        
        console.log('[ReplyX Widget] ✅ Серверная валидация пройдена');
        
      } catch (error) {
        console.error('[ReplyX Widget] Ошибка серверной проверки, используем локальную:', error);
        
        // Fallback на локальную проверку при ошибке сети
        const allowedDomains = payload.allowed_domains
          .split(',')
          .map(domain => domain.trim().toLowerCase())
          .map(domain => domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''))
          .filter(domain => domain.length > 0);
        
        const isLocallyAllowed = allowedDomains.some(allowedDomain => 
          currentDomain === allowedDomain || currentDomain.endsWith('.' + allowedDomain)
        );
        
        if (!isLocallyAllowed) {
          console.error('[ReplyX Widget] Локальная проверка не пройдена');
          return;
        }
      }
      
      // Гейтинг: если devOnly=true, инициализируем только при совпадении ключа в localStorage
      try {
        if (this.config.devOnly === 'true') {
          const stored = window.localStorage ? window.localStorage.getItem('CHAT_AI_DEV_KEY') : null;
          if (!this.config.devKey || !stored || String(stored) !== String(this.config.devKey)) {
            return; // тихо выходим, виджет не инициализируем для других пользователей
          }
        }
      } catch (e) { /* no-op */ }
      
      // Получаем настройки виджета перед инициализацией
      const widgetConfig = await this.fetchWidgetConfig();
      
      // Инициализируем виджет только после успешной валидации
      this.createContainer();
      this.loadStyles();
      
      if (config.type === 'floating') {
        this.createFloatingWidget(widgetConfig);
      } else if (config.type === 'embedded') {
        this.createEmbeddedWidget(widgetConfig);
      } else if (config.type === 'fullscreen') {
        this.createFullscreenWidget(widgetConfig);
      }
      
      this.isLoaded = true;
    },
    
    // Валидация домена с проверкой на сервере
    validateDomain: function() {
      if (!this.config.siteToken) {
        console.warn('[ReplyX Widget] Отсутствует токен сайта');
        return false;
      }
      
      // Сначала локальная проверка
      try {
        const tokenParts = this.config.siteToken.split('.');
        if (tokenParts.length !== 3) {
          console.error('[ReplyX Widget] Неверный формат токена');
          return false;
        }
        
        const payload = JSON.parse(atob(tokenParts[1]));
        
        if (!payload.allowed_domains) {
          console.warn('[ReplyX Widget] В токене отсутствуют разрешенные домены');
          return false;
        }
        
        const currentDomain = window.location.hostname.toLowerCase();
        const allowedDomains = payload.allowed_domains
          .split(',')
          .map(domain => domain.trim().toLowerCase())
          .map(domain => domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''))
          .filter(domain => domain.length > 0);
        
        console.log('[ReplyX Widget] Локальная проверка - токен:', payload);
        console.log('[ReplyX Widget] Локальная проверка - домены:', allowedDomains);
        
        const currentDomainClean = currentDomain.replace(/^www\./, '');
        const isLocallyAllowed = allowedDomains.some(allowedDomain => 
          currentDomainClean === allowedDomain || currentDomainClean.endsWith('.' + allowedDomain)
        );
        
        if (!isLocallyAllowed) {
          console.error('[ReplyX Widget] Локальная проверка не прошла');
          return false;
        }
        
        console.log('[ReplyX Widget] ✅ Локальная проверка пройдена');
        
        // Дополнительная проверка актуальности на сервере (асинхронно)
        this.validateTokenOnServer(currentDomainClean);
        
        return true;
        
      } catch (error) {
        console.error('[ReplyX Widget] Ошибка валидации домена:', error);
        return false;
      }
    },
    
    // Проверка актуальности токена на сервере
    validateTokenOnServer: function(currentDomain) {
      fetch(this.config.apiUrl + '/api/validate-widget-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.config.siteToken,
          domain: currentDomain
        })
      })
      .then(response => response.json())
      .then(data => {
        if (!data.valid) {
          console.warn('[ReplyX Widget] Серверная проверка: токен не актуален -', data.reason);
          if (data.reason === 'Domains changed, token outdated' || data.reason === 'No domains configured') {
            console.warn('[ReplyX Widget] Виджет отключен из-за изменения настроек доменов');
            this.disableWidget('Настройки виджета изменились. Обновите embed-код.');
          }
        } else {
          console.log('[ReplyX Widget] ✅ Серверная проверка пройдена');
        }
      })
      .catch(error => {
        console.warn('[ReplyX Widget] Ошибка серверной проверки:', error);
        // Не блокируем виджет при ошибке сети
      });
    },
    
    // Отключение виджета
    disableWidget: function(message) {
      if (this.container) {
        this.container.innerHTML = '';
        console.warn('[ReplyX Widget] Виджет отключен:', message);
      }
    },
    
    // Создаем основной контейнер (Safari-совместимо)
    createContainer: function() {
      try {
        this.container = document.createElement('div');
        this.container.id = 'replyx-widget-container';
        
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
          if (this.container && this.container.style) {
            this.container.style[key] = value;
          }
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
        // no-op
      }
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
          ${this.getPositionStyles()}
          width: 56px;
          height: 56px;
          background: ${currentTheme.primary};
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
          ${this.getChatPositionStyles()};
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
        
        .replyx-embedded-container {
          width: 100%;
          height: 600px;
          background: #f8fafc;
          border-radius: 0.75rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          pointer-events: auto;
        }
        
        .replyx-fullscreen-container {
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
          .replyx-chat-container {
            width: 89vw;
            height: 79vh;
            bottom: 84px;
            right: 20px;
            border-radius: 16px;
          }
        }
        
        .replyx-notification-badge {
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
          animation: replyx-pulse 1s infinite;
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
    
    // Позиционирование чат-контейнера (выше кнопки на 5px)
    getChatPositionStyles: function() {
      const buttonHeight = 56; // высота кнопки
      const gap = 9; // отступ между кнопкой и чатом
      const totalOffset = 20 + buttonHeight + gap; // 20px изначальный отступ + высота кнопки + зазор
      
      switch(config.position) {
        case 'bottom-left':
          return `bottom: ${totalOffset}px; left: 20px;`;
        case 'bottom-center':
          return `bottom: ${totalOffset}px; left: 50%; transform: translateX(-50%);`;
        case 'bottom-right':
        default:
          return `bottom: ${totalOffset}px; right: 20px;`;
      }
    },
    
    // Создаем плавающий виджет
    createFloatingWidget: function(widgetConfig) {
      this.widgetConfig = widgetConfig; // Сохраняем настройки для использования в expand
      
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
    
    // Обновляем иконку кнопки
    updateButtonIcon: function() {
      if (this.button) {
        this.button.innerHTML = this.isMinimized ? this.getChatIcon() : this.getCloseIcon();
      }
    },
    
    // Создаем встроенный виджет
    createEmbeddedWidget: function(widgetConfig) {
      // Ищем script тег для замены
      const targetElement = script && script.parentNode ? script.parentNode : null;
      
      const container = document.createElement('div');
      container.className = 'replyx-embedded-container';
      
      const iframe = document.createElement('iframe');
      iframe.src = this.buildIframeUrl(widgetConfig);
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 0.75rem;
      `;
      
      container.appendChild(iframe);
      
      // Если скрипт находится в <head> (или родителя нет) — добавляем контейнер в <body>,
      // чтобы избежать проблем в Safari с невизуальными элементами в head
      const isBodyParent = targetElement && String(targetElement.nodeName).toLowerCase() === 'body';
      if (!isBodyParent) {
        const appendToBody = () => {
          if (document.body) {
            document.body.appendChild(container);
            if (script && script.parentNode) {
              try { script.parentNode.removeChild(script); } catch (e) {}
            }
          } else {
            setTimeout(appendToBody, 10);
          }
        };
        appendToBody();
      } else {
        targetElement.replaceChild(container, script);
      }
    },
    
    // Создаем полноэкранный виджет
    createFullscreenWidget: function(widgetConfig) {
      const container = document.createElement('div');
      container.className = 'replyx-fullscreen-container';
      
      const iframe = document.createElement('iframe');
      iframe.src = this.buildIframeUrl(widgetConfig);
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;
      
      container.appendChild(iframe);
      this.container.appendChild(container);
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
    
    // Разворачиваем чат (Safari-совместимо)
    expand: function() {
      try {
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
        
        // Safari-совместимое создание iframe
        const iframe = document.createElement('iframe');
        
        // Используем функцию построения URL с персональными настройками
        const iframeSrc = this.buildIframeUrl(this.widgetConfig);
        
        // Safari-совместимые атрибуты iframe
        iframe.setAttribute('src', iframeSrc);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'camera; microphone; geolocation');
        iframe.setAttribute('tabindex', '0');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-modals');
        iframe.setAttribute('loading', 'eager');
        iframe.setAttribute('referrerpolicy', 'origin-when-cross-origin');
        
        // Safari-specific attributes
        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          iframe.setAttribute('style', iframe.getAttribute('style') + '; -webkit-appearance: none;');
        }
        
        // Применяем стили через объект
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
        
        // Safari-совместимая загрузка iframe
        iframe.addEventListener('load', () => {
          console.log('[ReplyX Widget] iframe loaded successfully');
          setTimeout(() => {
            try {
              iframe.focus();
            } catch (e) {
              console.log('[ReplyX Widget] Focus failed (normal in some browsers)');
            }
          }, 100);
        });
        
        iframe.addEventListener('error', (e) => {
          console.error('[ReplyX Widget] iframe failed to load:', e);
        });
        
        // Safari fallback: Force iframe to reload if not loaded after timeout
        setTimeout(() => {
          if (!iframe.contentWindow || !iframe.contentWindow.document) {
            console.log('[ReplyX Widget] iframe not loaded, attempting reload...');
            const currentSrc = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => {
              iframe.src = currentSrc;
            }, 100);
          }
        }, 3000);
        
        chatContainer.appendChild(iframe);
        this.container.appendChild(chatContainer);
        this.container.appendChild(button); // Добавляем кнопку закрытия
        
        // Safari-совместимый обработчик сообщений
        const messageHandler = (event) => {
          try {
            // Проверяем origin для безопасности в Safari
            if (event.origin !== config.host && event.origin !== 'http://localhost:3000' && event.origin !== 'http://localhost:3001') {
              return;
            }
            
            if (event.data && event.data.type === 'replyX_minimize') {
              console.log('[DEBUG] Widget received replyX_minimize message');
              this.minimize();
            }
          } catch (error) {
            // no-op
          }
        };
        
        window.addEventListener('message', messageHandler, false);
        
        // Сохраняем обработчик для удаления
        this.messageHandler = messageHandler;
        
      } catch (error) {
        // no-op
      }
    },
    
    // Сворачиваем чат
    minimize: function() {
      console.log('[DEBUG] Widget minimize() called');
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
      if (window.ReplyXWidget && !window.ReplyXWidget.isLoaded) {
        window.ReplyXWidget.init();
      }
    } catch (error) {
      // no-op
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