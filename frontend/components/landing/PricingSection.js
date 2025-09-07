'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import SectionWrapper from '../common/SectionWrapper';
import Button from '../common/Button';

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
  
  // Расчёт цены ReplyX: сообщения в месяц × 5₽
  const replyxPrice = messages * 5;
  
  // Логика ценообразования конкурентов (подписочная модель с лимитами)
  const getCompetitorPrice = (monthlyMessages) => {
    if (monthlyMessages <= 3000) return 15000;        // до 3K сообщ/месяц
    if (monthlyMessages <= 7000) return 25000;        // до 7K сообщ/месяц  
    if (monthlyMessages <= 12000) return 35000;       // до 12K сообщ/месяц
    if (monthlyMessages <= 20000) return 50000;       // до 20K сообщ/месяц
    return 70000;                                     // свыше 20K сообщ/месяц
  };
  
  const competitorPrice = getCompetitorPrice(messages);
  const savings = competitorPrice - replyxPrice;
  const savingsPercent = Math.round((savings / competitorPrice) * 100);

  // Сравнение для 3 ключевых сценариев
  const pricingTable = [
    { messages: "1K", replyx: 3000, competitor: 15000, savings: "80%" },
    { messages: "5K", replyx: 15000, competitor: 25000, savings: "40%" },
    { messages: "15K", replyx: 45000, competitor: 50000, savings: "10%" }
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
      <SectionWrapper id="pricing">
        <SectionWrapper.Header 
        title={
          <>
            Единственная{' '}
            <span className="text-[#6334E5]">честная цена</span>
            {' '}на рынке AI‑поддержки
          </>
        }
        subtitle={
          <>
            Всего <span className="font-bold text-[#6334E5]">5₽ за сообщение</span>. Никаких подписок, лимитов и штрафов
          </>
        }
        className="mb-6"
      />

        {/* Профессиональная панель: сравнение + калькулятор */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden"
        >
          {/* Таблица сравнений по типовым объёмам */}
          <div className="px-4 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="font-medium py-2 pr-4">Сообщений в месяц</th>
                    <th className="font-medium py-2 pr-4">ReplyX</th>
                    <th className="font-medium py-2 pr-4">Конкуренты</th>
                    <th className="font-medium py-2">Экономия</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTable.map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="py-3 pr-4 text-gray-900 font-semibold">{row.messages}</td>
                      <td className="py-3 pr-4 text-[#6334E5] font-bold">{row.replyx.toLocaleString()}₽</td>
                      <td className="py-3 pr-4 text-gray-700">{row.competitor.toLocaleString()}₽</td>
                      <td className="py-3 text-green-600 font-semibold">{row.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Калькулятор */}
          <div className="p-4 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              {/* Управление объёмом */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={100}
                    max={15000}
                    value={messages}
                    onChange={(e) => setMessages(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-xl appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #7C4DFF 0%, #7C4DFF ${((messages - 100) / (15000 - 100)) * 100}%, #e5e7eb ${((messages - 100) / (15000 - 100)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <input
                    type="number"
                    min={100}
                    max={15000}
                    value={messages}
                    onChange={(e) => setMessages(Math.max(100, Math.min(15000, parseInt(e.target.value) || 0)))}
                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{messages.toLocaleString()} сообщ/мес (~{Math.round(messages / 30)} в день)</div>
              </div>

              {/* Итоги */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">ReplyX</span>
                  <span className="text-[#6334E5] font-bold">{replyxPrice.toLocaleString()}₽/мес</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Конкуренты (от)</span>
                  <span className="text-gray-800 font-semibold">{competitorPrice.toLocaleString()}₽/мес</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Экономия</span>
                  <span className="text-green-600 font-bold">+{savingsPercent}%</span>
                </div>
              </div>
            </div>

            {/* Экономия за год */}
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
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Примечания */}
            <div className="mt-3 text-xs text-gray-500">
              Без абонентской платы. Оплата только за фактические сообщения.
            </div>
          </div>
        </motion.div>

        {/* Компактные преимущества в одну строку */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-4 sm:gap-8 mb-6"
        >
          {advantages.map((advantage, index) => (
            <div key={index} className="flex items-center gap-2">
              <advantage.icon className={`${DESIGN_TOKENS.icons.medium} ${DESIGN_TOKENS.colors.primary} flex-shrink-0`} />
              <span className={`${DESIGN_TOKENS.typography.bodyText} font-medium`}>{advantage.title}</span>
            </div>
          ))}
        </motion.div>

        {/* Компактные кнопки CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="grid grid-cols-1 sm:flex gap-3 justify-center"
        >
          <Button className="w-full sm:w-auto" variant="primary">
            Рассчитать экономию
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary">
            Связаться с менеджером
          </Button>
        </motion.div>
    </SectionWrapper>
  );
};

export default PricingSection;