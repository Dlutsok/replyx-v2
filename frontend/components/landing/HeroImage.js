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
    <div className="relative max-w-[23rem] mx-auto">
      {/* Dynamic animated background */}
      <div className="absolute inset-0 -m-8">
        <motion.div 
          className="absolute -top-16 -right-10 w-48 h-48 rounded-full blur-2xl opacity-70"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.4) 0%, rgba(168,85,247,0.3) 35%, rgba(192,132,252,0.2) 70%, transparent 100%)'
          }}
          animate={{ 
            scale: [1, 1.2, 1], 
            x: [0, 10, 0],
            y: [0, -5, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full blur-2xl opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(147,51,234,0.3) 50%, rgba(168,85,247,0.2) 80%, transparent 100%)'
          }}
          animate={{ 
            scale: [1.1, 0.9, 1.1], 
            x: [0, -8, 0],
            y: [0, 8, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute top-1/2 -right-12 w-24 h-24 rounded-full blur-xl opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.5) 0%, rgba(192,132,252,0.3) 60%, transparent 100%)'
          }}
          animate={{ 
            scale: [0.8, 1.3, 0.8], 
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "linear"
          }}
        />
      </div>

      
      <motion.div
        className="relative bg-white shadow-xl border border-gray-200 overflow-hidden"
        style={{ borderRadius: '16px' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Заголовок чата */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">ReplyX</h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-xs text-gray-600">Онлайн</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-md border border-green-200">
              <span>⚡ 2,7 секунды</span>
            </div>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="h-80 p-4 space-y-4 overflow-y-auto bg-white">
          {demoMessages.slice(0, messageIndex + 1).map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
                            <div
                className="max-w-sm px-4 py-3 shadow-sm"
                style={{
                  borderRadius: '16px',
                  ...(message.type === 'user'
                    ? { backgroundColor: '#374151', color: 'white', borderBottomRightRadius: '4px' }
                    : { backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #e5e7eb', borderBottomLeftRadius: '4px' }
                  )
                }}
              >
                <p className="text-sm leading-relaxed font-medium">{message.text}</p>
              </div>
            </motion.div>
          ))}

          {/* Индикатор печатания */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 text-gray-800 shadow-md px-4 py-3 border border-gray-200" style={{ borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
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
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-white px-4 py-3 shadow-sm border border-gray-200" style={{ borderRadius: '16px' }}>
              <input 
                type="text" 
                placeholder="Напишите сообщение..." 
                className="w-full bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                disabled
              />
            </div>
            <button
              className="w-12 h-12 text-white flex items-center justify-center shadow-md cursor-default"
              style={{
                backgroundColor: 'rgb(147, 51, 234)',
                borderRadius: '0.9rem'
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default HeroImage;