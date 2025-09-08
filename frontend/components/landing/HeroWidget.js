'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const HeroWidget = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [widgetTheme, setWidgetTheme] = useState('purple');

  const themes = {
    purple: {
      primary: '#4b5563',
      secondary: '#e9d5ff',
      accent: '#6d28d9',
      gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
      light: '#faf5ff'
    }
  };

  const currentTheme = themes[widgetTheme];

  const demoMessages = [
    {
      id: '1',
      sender: 'assistant',
      text: 'Здравствуйте! Я ReplyX AI-ассистент. Помогаю компаниям автоматизировать поддержку клиентов. Интегрируюсь с CRM, сайтом и мессенджерами. Чем могу помочь?',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      sender: 'user',
      text: 'Расскажите подробнее о ваших услугах. Сколько стоит внедрение?',
      timestamp: new Date(Date.now() + 2000).toISOString()
    },
    {
      id: '3',
      sender: 'assistant',
      text: '🚀 **ReplyX — оплата только за результат:**\n\n💰 **Простая модель оплаты:**\n• **5 рублей за сообщение**\n• **Без абонентской платы**\n• **Без скрытых комиссий**\n• **Платишь только за то, что работает**\n\n📊 **Пример расчета для интернет-магазина:**\n• **500 чатов в месяц** = 2,500₽\n• **2,000 чатов в месяц** = 10,000₽\n• **10,000 чатов в месяц** = 50,000₽\n\n⚡ **Что входит:**\n• AI-ассистент 24/7\n• Интеграция с вашей CRM\n• Аналитика и отчеты\n• Техническая поддержка\n\n🎯 **Экономия до 80% на поддержке клиентов**',
      timestamp: new Date(Date.now() + 4000).toISOString()
    },
    {
      id: '4',
      sender: 'user',
      text: 'А можно ли интегрировать с нашей 1С и Telegram ботом?',
      timestamp: new Date(Date.now() + 6000).toISOString()
    },
    {
      id: '5',
      sender: 'assistant',
      text: '✅ **Да, полная интеграция поддерживается:**\n\n🔗 **Интеграции в комплекте:**\n• **1С:Предприятие** — синхронизация заказов\n• **Telegram Bot** — автоматические ответы\n• **WhatsApp Business** — корпоративный чат\n• **ВКонтакте** — сообщества и группы\n• **Instagram** — Direct сообщения\n\n🛠️ **Дополнительные интеграции:**\n• amoCRM, Bitrix24, Salesforce\n• Zendesk, Freshdesk, LiveChat\n• API для кастомных решений\n\n⚙️ **Внедрение:** 2-4 недели, обучение команды включено',
      timestamp: new Date(Date.now() + 8000).toISOString()
    },
    {
      id: '6',
      sender: 'user',
      text: 'Как быстро AI обучается на наших данных? И что по безопасности?',
      timestamp: new Date(Date.now() + 10000).toISOString()
    },
    {
      id: '7',
      sender: 'assistant',
      text: '💡 **Почему ReplyX выгоднее традиционных решений:**\n\n💰 **Экономия с оплатой за сообщение:**\n• **Нет фиксированных платежей**\n• **Платишь только за реальных клиентов**\n• **Масштабируешься без переплат**\n• **ROI виден в каждом чате**\n\n⚡ **Технологии и безопасность:**\n• **Обучение AI:** 2-4 часа\n• **Шифрование:** AES-256\n• **Хранение:** РФ (VK Cloud)\n• **Соответствие:** 152-ФЗ, GDPR\n\n📊 **Показатели эффективности:**\n• **Точность:** 94%\n• **Скорость:** <2 секунды\n• **Экономия:** до 80% бюджета\n• **Обработка:** 100,000+ чатов/день\n\n🎯 **Начни с 1,000₽ тестового бюджета!**\n\nХочешь протестировать на своем сайте? 🚀',
      timestamp: new Date(Date.now() + 12000).toISOString()
    }
  ];

  const messageDelays = [0, 2000, 4000, 6000, 8000, 10000, 12000];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentMessageIndex < demoMessages.length) {
        if (demoMessages[currentMessageIndex].sender === 'assistant' && currentMessageIndex > 0) {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, demoMessages[currentMessageIndex]]);
            setCurrentMessageIndex(prev => prev + 1);
          }, 1500);
        } else {
          setMessages(prev => [...prev, demoMessages[currentMessageIndex]]);
          setCurrentMessageIndex(prev => prev + 1);
        }
      } else {
        // Перезапуск через 8 секунд после последнего сообщения
        setTimeout(() => {
          setMessages([]);
          setCurrentMessageIndex(0);
        }, 8000);
      }
    }, messageDelays[currentMessageIndex] || 2000);

    return () => clearTimeout(timer);
  }, [currentMessageIndex]);

  const parseMarkdown = (text) => {
    if (!text || typeof text !== 'string') return '';

    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');

    return text;
  };

  const widgetStyles = `
    .hero-chat-widget {
      position: relative;
      width: 100%;
      max-width: 380px;
      height: 600px;
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
    }

    .hero-chat-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
    }

    .hero-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      margin-right: 12px;
    }

    .hero-header-info h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }

    .hero-header-info p {
      margin: 2px 0 0 0;
      font-size: 13px;
      color: #10b981;
    }

    .hero-ai-badge {
      margin-left: auto;
      background: linear-gradient(269deg, rgb(99, 52, 229) 28.67%, rgb(117, 197, 237) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      cursor: pointer;
      position: relative;
    }

    .hero-messages-container {
      flex: 1;
      padding: 16px;
      background: white;
      min-height: 0;
      max-height: 100%;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
    }

    .hero-messages-container::-webkit-scrollbar {
      width: 4px;
    }

    .hero-messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .hero-messages-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .hero-message-bubble {
      padding: 10px 16px;
      border-radius: 20px;
      margin: 8px 0px;
      font-size: 15px;
      font-weight: 500;
      line-height: 20px;
      overflow-wrap: break-word;
      display: inline-block;
      max-width: 85%;
      clear: both;
      position: relative;
      transition: margin 0.28s ease-in-out;
    }

    .hero-user-message {
      background: ${currentTheme.primary};
      color: white;
      margin-left: auto;
      margin-right: 16px;
      border-bottom-right-radius: 6px;
    }

    .hero-assistant-message {
      background: #f3f4f6;
      color: #1f2937;
      margin-left: 16px;
      margin-right: auto;
      border-bottom-left-radius: 6px;
    }

    .hero-typing-indicator {
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

    .hero-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typingBounce 1.4s infinite ease-in-out;
    }

    .hero-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .hero-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .hero-typing-dot:nth-child(3) { animation-delay: 0s; }

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

    .hero-input-group {
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .hero-footer-input-wrapper {
      background: white;
    }

    .hero-textarea-container textarea::placeholder {
      color: #9ca3af;
    }

    .hero-footer-icons button:hover {
      color: ${currentTheme.primary};
    }

    .hero-input-field {
      flex: 1;
      border: none;
      outline: none;
      resize: none;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      background: transparent;
      padding: 16px 0;
      line-height: 20px;
      min-height: 20px;
      max-height: 80px;
      overflow-y: hidden;
    }

    .hero-send-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .hero-send-btn.active {
      opacity: 1;
    }

    .hero-footer {
      padding: 0 16px 16px 16px;
    }

    .hero-footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .hero-footer-icons {
      display: flex;
      gap: 8px;
    }

    .hero-emoji-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #647491;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero-powered-by {
      text-decoration: none;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.5px;
      color: #647491;
    }

    .hero-brand-name {
      color: #6334E5;
      font-weight: 700;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: widgetStyles }} />
      <div className="relative max-w-[23rem] mx-auto">
        {/* Dynamic animated background */}
        <div className="absolute inset-0 -m-8">
          <motion.div
            className="absolute -top-16 -right-10 w-52 h-52 rounded-full blur-2xl opacity-85"
            style={{
              background: 'radial-gradient(circle, rgba(147,51,234,0.6) 0%, rgba(168,85,247,0.5) 35%, rgba(192,132,252,0.4) 70%, transparent 100%)'
            }}
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 15, 0],
              y: [0, -8, 0]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full blur-2xl opacity-75"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(147,51,234,0.5) 50%, rgba(168,85,247,0.4) 80%, transparent 100%)'
            }}
            animate={{
              scale: [1.2, 0.8, 1.2],
              x: [0, -12, 0],
              y: [0, 12, 0]
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <motion.div
          className="hero-chat-widget"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Chat Header */}
          <div className="hero-chat-header">
            <div className="hero-avatar">
              <img
                alt="ReplyX"
                loading="lazy"
                width="32"
                height="32"
                decoding="async"
                src="/favicon.svg"
                style={{
                  color: 'transparent',
                  borderRadius: '50%'
                }}
              />
            </div>
            <div className="hero-header-info">
              <h3>ReplyX</h3>
              <p>Онлайн</p>
            </div>
            <div className="hero-ai-badge">
              AI
            </div>
          </div>

          {/* Messages Area */}
          <div className="hero-messages-container">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`hero-message-bubble ${message.sender === 'user' ? 'hero-user-message' : 'hero-assistant-message'}`}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(message.text) }}
                />
              </motion.div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="hero-typing-indicator">
                  <div className="hero-typing-dot"></div>
                  <div className="hero-typing-dot"></div>
                  <div className="hero-typing-dot"></div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="hero-input-group">
            <div className="hero-footer-input-wrapper">
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                <textarea
                  placeholder="Введите ваше сообщение..."
                  disabled
                  rows="1"
                  className="hero-input-field"
                />
                <button className="hero-send-btn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill={currentTheme.primary}/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="hero-footer">
              <div className="hero-footer-content">
                <div className="hero-footer-icons">
                  <button className="hero-emoji-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#647491">
                      <path d="M0 0h24v24H0z" fill="none"></path>
                      <path fillRule="evenodd" clipRule="evenodd" d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11ZM8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11ZM12.0006 17.5C14.3306 17.5 16.3106 16.04 17.1106 14L6.89062 14C7.69063 16.04 9.67063 17.5 12.0006 17.5Z"></path>
                    </svg>
                  </button>
                </div>
                <a href="https://replyx.ru" target="_blank" rel="noopener noreferrer" className="hero-powered-by">
                  POWERED BY <span className="hero-brand-name">ReplyX</span> ⚡
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default HeroWidget;
