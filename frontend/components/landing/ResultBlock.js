'use client';

import { motion } from 'framer-motion';

const ResultBlock = ({ delay = 0 }) => {
  const resultMetrics = [
    { 
      value: '95%', 
      label: 'клиентов довольны', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      description: 'Высокая удовлетворенность клиентов'
    },
    { 
      value: '80%', 
      label: 'экономия расходов', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      description: 'Сокращение операционных затрат'
    },
    { 
      value: '24/7', 
      label: 'без перерывов', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M2 12H22" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      description: 'Круглосуточная поддержка'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.7, 
        delay: delay,
        ease: "easeOut" 
      }}
      className="mt-16"
    >
      {/* Основной блок результата */}
      <div className="bg-gray-50 rounded-2xl p-8 lg:p-12 border border-gray-200">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: delay + 0.2 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
            Результат
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
            Довольные клиенты при снижении расходов на{' '}
            <span className="text-purple-600">80%</span>
          </h3>
        </motion.div>

        {/* Метрики в карточках */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {resultMetrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.5, 
                delay: delay + 0.4 + index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 text-center"
            >
              {/* Иконка */}
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600">
                {metric.icon}
              </div>
              
              {/* Значение */}
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {metric.value}
              </div>
              
              {/* Лейбл */}
              <div className="text-sm font-medium text-gray-700 mb-1">
                {metric.label}
              </div>
              
              {/* Описание */}
              <div className="text-xs text-gray-500">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Дополнительная информация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: delay + 1.0 }}
          className="mt-12 text-center"
        >
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-600 leading-relaxed">
              Мгновенные ответы + полное знание продукта + доступность 24/7 + 
              оптимизированные расходы = максимальная эффективность вашего бизнеса
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ResultBlock;