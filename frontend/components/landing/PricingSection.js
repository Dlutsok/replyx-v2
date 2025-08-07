'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

// Компактные иконки для преимуществ (уменьшены до 20px)
const TargetIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const ChartBarIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const BoltIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
  </svg>
);

const CurrencyDollarIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const PricingSection = () => {
  const [messages, setMessages] = useState(5000);
  
  // Расчёт цены ChatAI: сообщения в месяц × 3₽
  const chataiPrice = messages * 3;
  
  // Логика ценообразования конкурентов (подписочная модель с лимитами)
  const getCompetitorPrice = (monthlyMessages) => {
    if (monthlyMessages <= 3000) return 15000;        // до 3K сообщ/месяц
    if (monthlyMessages <= 7000) return 25000;        // до 7K сообщ/месяц  
    if (monthlyMessages <= 12000) return 35000;       // до 12K сообщ/месяц
    if (monthlyMessages <= 20000) return 50000;       // до 20K сообщ/месяц
    return 70000;                                     // свыше 20K сообщ/месяц
  };
  
  const competitorPrice = getCompetitorPrice(messages);
  const savings = competitorPrice - chataiPrice;
  const savingsPercent = Math.round((savings / competitorPrice) * 100);

  // Сравнение для 3 ключевых сценариев
  const pricingTable = [
    { messages: "1K", chatai: 3000, competitor: 15000, savings: "80%" },
    { messages: "5K", chatai: 15000, competitor: 25000, savings: "40%" },  
    { messages: "15K", chatai: 45000, competitor: 50000, savings: "10%" }
  ];

  const advantages = [
    {
      icon: TargetIcon,
      title: "Справедливо"
    },
    {
      icon: ChartBarIcon,
      title: "Прозрачно"
    },
    {
      icon: BoltIcon,
      title: "Гибко"
    },
    {
      icon: CurrencyDollarIcon,
      title: "Выгодно"
    }
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Компактный заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-2">
            Единственная{' '}
            <span className="text-purple-600">честная цена</span>
            {' '}на рынке AI‑поддержки
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Всего <span className="font-bold text-purple-600">3₽ за сообщение</span>. Никаких подписок, лимитов и штрафов
          </p>
        </motion.div>

        {/* Объединённая панель: таблица + калькулятор */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="bg-white rounded-lg border border-gray-200 mb-4"
        >
          {/* Карточки сравнения */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              {pricingTable.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-lg font-bold text-gray-900 mb-2">{item.messages}</div>
                  <div className="text-xs text-gray-500 mb-3">сообщений в месяц</div>
                  
                  <div className="space-y-2">
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-xs text-purple-600">ChatAI</div>
                      <div className="font-bold text-purple-600">{item.chatai.toLocaleString()}₽</div>
                    </div>
                    
                    <div className="bg-gray-100 rounded p-2">
                      <div className="text-xs text-gray-500">Конкуренты</div>
                      <div className="font-bold text-gray-600">{item.competitor.toLocaleString()}₽</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs font-semibold text-green-600">
                    Экономия {item.savings}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Компактный калькулятор в одной строке */}
          <div className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Слайдер */}
              <div className="flex-1 min-w-64">
                <input
                  type="range"
                  min="100"
                  max="15000"
                  value={messages}
                  onChange={(e) => setMessages(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #7C4DFF 0%, #7C4DFF ${((messages - 100) / (15000 - 100)) * 100}%, #e5e7eb ${((messages - 100) / (15000 - 100)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {messages.toLocaleString()} сообщ/мес (~{Math.round(messages / 30)} в день)
                </div>
              </div>

              {/* Результаты в одной строке */}
              <div className="flex items-center gap-3 text-sm whitespace-nowrap">
                <div className="text-purple-600 font-bold">
                  ChatAI: {chataiPrice.toLocaleString()}₽/мес
                </div>
                <div className="text-gray-400">|</div>
                <div className="text-gray-500">
                  Конкуренты: от {competitorPrice.toLocaleString()}₽/мес
                </div>
                <div className="text-gray-400">|</div>
                <div className="text-green-600 font-bold">
                  Экономия: +{savingsPercent}%
                </div>
              </div>
            </div>

            {/* Анимированный прогресс-бар экономии за год */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Экономия за год</span>
                <span className="font-bold text-green-600">{(savings * 12).toLocaleString()}₽</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <motion.div
                  className="h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(savingsPercent, 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Компактные преимущества в одну строку */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex items-center justify-center gap-8 mb-6"
        >
          {advantages.map((advantage, index) => (
            <div key={index} className="flex items-center gap-2">
              <advantage.icon className="w-6 h-6 text-purple-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">{advantage.title}</span>
            </div>
          ))}
        </motion.div>

        {/* Компактные кнопки CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="flex gap-3 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-11"
          >
            Рассчитать мою экономию
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-purple-600 hover:text-purple-600 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-11"
          >
            Связаться с менеджером
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;