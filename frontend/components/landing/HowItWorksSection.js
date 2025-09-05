'use client';

import { motion } from 'framer-motion';
import { FiUpload, FiSliders, FiLink2, FiZap } from 'react-icons/fi';
import SectionWrapper from '../common/SectionWrapper';

const steps = [
  {
    num: 1,
    title: 'Загрузите знания',
    description: 'Импортируйте FAQ, документы и страницы сайта. ReplyX сам построит базу знаний.',
    Icon: FiUpload,
    accent: 'bg-purple-50 border-purple-200 text-purple-600'
  },
  {
    num: 2,
    title: 'Настройте ассистента',
    description: 'Выберите тон, сценарии и правила эскалации. Всё — в no‑code интерфейсе.',
    Icon: FiSliders,
    accent: 'bg-blue-50 border-blue-200 text-blue-600'
  },
  {
    num: 3,
    title: 'Подключите каналы',
    description: 'Сайт‑виджет, Telegram, WhatsApp, email. Плюс API и Webhooks для интеграций.',
    Icon: FiLink2,
    accent: 'bg-green-50 border-green-200 text-green-600'
  },
  {
    num: 4,
    title: 'Запустите',
    description: 'Нажмите «Старт» — и ассистент начинает отвечать клиентам за 2,7 секунды, 24/7.',
    Icon: FiZap,
    accent: 'bg-amber-50 border-amber-200 text-amber-600'
  }
];

export default function HowItWorksSection() {
  return (
    <SectionWrapper id="how-it-works" bg="white" className="pb-4">
      <SectionWrapper.Header
        title="Запустите AI-поддержку за 5 минут"
        subtitle="Всего четыре шага — от загрузки знаний до круглосуточных ответов клиентам с точностью 98,7%."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {steps.map((step, idx) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: idx * 0.06, ease: 'easeOut' }}
            className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${step.accent} flex-shrink-0`}>
                  <step.Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Шаг {step.num}</span>
                  <h3 className="text-base font-semibold text-gray-900 leading-none mt-0 whitespace-nowrap">{step.title}</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}


