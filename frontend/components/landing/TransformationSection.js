'use client';

import { motion } from 'framer-motion';
import ComparisonColumn from './ComparisonColumn';
import ResultBlock from './ResultBlock';

// Иконки для сравнения (встроенные SVG для производительности)
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const BookOpenIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const GlobeAltIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9Z" />
  </svg>
);

const TransformationSection = () => {
  // Данные для колонки "Было"
  const beforeData = {
    title: "Обычная поддержка",
    items: [
      {
        icon: ClockIcon,
        label: "Время ответа",
        value: "4 часа ожидания",
        description: "Клиенты теряют терпение и уходят"
      },
      {
        icon: BookOpenIcon,
        label: "Знание продукта",
        value: "30% информации",
        description: "Операторы знают только базовые вещи"
      },
      {
        icon: CheckCircleIcon,
        label: "Качество ответов",
        value: "60% правильных",
        description: "Много ошибок и неточностей"
      },
      {
        icon: GlobeAltIcon,
        label: "Доступность",
        value: "8 часов в день",
        description: "Только в рабочее время"
      }
    ]
  };

  // Данные для колонки "Стало"
  const afterData = {
    title: "ChatAI",
    items: [
      {
        icon: ClockIcon,
        label: "Время ответа",
        value: "0.8 секунды",
        description: "Мгновенная реакция на запрос"
      },
      {
        icon: BookOpenIcon,
        label: "Знание продукта",
        value: "100% информации",
        description: "Полная база знаний о компании"
      },
      {
        icon: CheckCircleIcon,
        label: "Качество ответов",
        value: "98.7% точность",
        description: "Проверенная точность ответов"
      },
      {
        icon: GlobeAltIcon,
        label: "Доступность",
        value: "24/7 без выходных",
        description: "Круглосуточная поддержка"
      }
    ]
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок секции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
            Как ChatAI превращает каждое обращение в 
            <span className="text-purple-600"> положительный опыт</span>
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto mb-6">
            Сравните традиционный подход к поддержке клиентов с возможностями современного ИИ
          </p>
          <div className="flex justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </motion.div>

        {/* Сравнительные колонки */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Колонка "Было" */}
          <ComparisonColumn
            title={beforeData.title}
            items={beforeData.items}
            isPositive={false}
            delay={0.2}
          />

          {/* Колонка "Стало" */}
          <ComparisonColumn
            title={afterData.title}
            items={afterData.items}
            isPositive={true}
            delay={0.4}
          />
        </div>

        {/* Тонкий разделитель VS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="hidden lg:flex items-center justify-center relative -mt-12 mb-8 z-10"
        >
          <div className="bg-white border border-gray-300 px-4 py-2 rounded-full shadow-sm">
            <span className="text-sm font-medium text-gray-500">VS</span>
          </div>
        </motion.div>

        {/* Блок с результатом */}
        <ResultBlock delay={0.8} />
      </div>
    </section>
  );
};

export default TransformationSection;