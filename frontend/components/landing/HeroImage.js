'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const HeroImage = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const demoMessages = [
    {
      type: 'user',
      text: 'Можете помочь с возвратом товара?',
      delay: 0
    },
    {
      type: 'bot',
      text: 'Конечно! Я вижу, что вы покупали кроссовки Nike Air Max 90 (заказ #12847). Возврат возможен в течение 14 дней. Нужна ли вам курьерская доставка или предпочитаете принести в магазин?',
      delay: 1500
    },
    {
      type: 'user', 
      text: 'Курьером, пожалуйста. Когда можете забрать?',
      delay: 3000
    },
    {
      type: 'bot',
      text: 'Отлично! Ближайшее окно — завтра с 10:00 до 18:00. Курьер заберёт товар и сразу вернёт деньги на карту. Подтвердить на завтра?',
      delay: 4500
    },
    {
      type: 'user',
      text: 'Да, подтверждаю. А сколько времени займёт возврат денег?',
      delay: 6000
    },
    {
      type: 'bot',
      text: 'Деньги поступят на карту **** 4567 в течение 3-5 рабочих дней. Заявка на возврат создана, номер #RET-8934. SMS с деталями отправлено на +7 (999) 123-45-67.',
      delay: 7500
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageIndex < demoMessages.length - 1) {
        if (demoMessages[messageIndex + 1].type === 'bot') {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessageIndex(prev => prev + 1);
          }, 1000);
        } else {
          setMessageIndex(prev => prev + 1);
        }
      } else {
        // Перезапуск демо через 3 секунды
        setTimeout(() => {
          setMessageIndex(0);
        }, 3000);
      }
    }, demoMessages[messageIndex]?.delay || 2000);

    return () => clearTimeout(timer);
  }, [messageIndex]);

  return (
    <div className="relative max-w-lg mx-auto">
      {/* Мокап браузера/интерфейса */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Шапка браузера */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Кнопка закрытия */}
            <div className="w-3 h-3 bg-red-400 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer">
              <svg className="w-2 h-2 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Кнопка сворачивания */}
            <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-500 transition-colors cursor-pointer">
              <svg className="w-2 h-2 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Кнопка разворачивания */}
            <div className="w-3 h-3 bg-green-400 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors cursor-pointer">
              <svg className="w-2 h-2 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-lg px-3 py-1 text-sm text-gray-500 border">
              chatai.ru/dashboard
            </div>
          </div>
        </div>

        {/* Заголовок чата */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">ChatAI Помощник</h3>
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                  <p className="text-sm text-gray-500">отвечает мгновенно</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
              <span className="text-green-500">⚡</span>
              <span>0.8 сек</span>
            </div>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="h-80 p-6 space-y-4 overflow-y-auto bg-gray-50">
          {demoMessages.slice(0, messageIndex + 1).map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-sm px-4 py-3 rounded-2xl ${
                message.type === 'user' 
                  ? 'bg-purple-600 text-white rounded-br-md' 
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200 rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </motion.div>
          ))}

          {/* Индикатор печатания */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white text-gray-800 shadow-sm border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Поле ввода */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
              <input 
                type="text" 
                placeholder="Напишите сообщение..." 
                className="w-full bg-transparent text-sm focus:outline-none text-gray-700"
                disabled
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroImage;