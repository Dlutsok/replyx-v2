'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import {
  FiBarChart,
  FiUsers,
  FiClock,
  FiCreditCard,
  FiStar,
  FiCheckCircle,
  FiArrowRight
} from 'react-icons/fi';

const CaseStudiesSection = () => {
  const router = useRouter();
  const [activeCase, setActiveCase] = useState(0);

  // Кейсы успешных внедрений
  const caseStudies = [
    {
      id: 1,
      company: 'TechCorp',
      industry: 'IT-компания',
      avatar: 'TC',
      avatarColor: 'bg-blue-500',
      results: [
        { metric: 'ROI', value: '+420%', icon: FiBarChart },
        { metric: 'Время ответа', value: '2 сек', icon: FiClock },
        { metric: 'Экономия', value: '₽180K/мес', icon: FiCreditCard }
      ],
      description: 'Автоматизировали поддержку 24/7. AI обрабатывает 85% запросов клиентов, сократив время ответа с 4 часов до 2 секунд.',
      testimonial: '"ReplyX увеличил нашу конверсию на 35% и сэкономил 180 000 рублей в месяц"',
      author: 'Алексей Петров',
      position: 'CTO TechCorp'
    },
    {
      id: 2,
      company: 'E-commerce Plus',
      industry: 'Интернет-магазин',
      avatar: 'EP',
      avatarColor: 'bg-green-500',
      results: [
        { metric: 'Продажи', value: '+65%', icon: FiBarChart },
        { metric: 'Поддержка', value: '24/7', icon: FiUsers },
        { metric: 'Удовлетворенность', value: '4.9/5', icon: FiStar }
      ],
      description: 'Интернет-магазин внедрил AI-ассистента для обработки заказов и консультаций. Результат - рост продаж на 65%.',
      testimonial: '"Клиенты довольны мгновенными ответами. Мы обработали на 200% больше запросов"',
      author: 'Мария Иванова',
      position: 'Руководитель отдела продаж'
    },
    {
      id: 3,
      company: 'MedCenter Pro',
      industry: 'Медицинская клиника',
      avatar: 'MP',
      avatarColor: 'bg-purple-500',
      results: [
        { metric: 'Записи', value: '+90%', icon: FiBarChart },
        { metric: 'Время на админ.', value: '-70%', icon: FiClock },
        { metric: 'Пациенты', value: '1200+', icon: FiUsers }
      ],
      description: 'Клиника автоматизировала запись на прием и первичные консультации. Сократили время на административные задачи на 70%.',
      testimonial: '"AI отвечает на вопросы пациентов круглосуточно, записывая на прием автоматически"',
      author: 'Дмитрий Сидоров',
      position: 'Главный врач'
    }
  ];

  return (
    <motion.section
      className={`${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg} pt-20 pb-20`}
      {...DESIGN_TOKENS.animation.default}
    >
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding}`}>
        {/* Заголовок секции */}
        <motion.div
          className="text-left mb-16"
          {...DESIGN_TOKENS.animation.withDelay(0.1)}
        >
          <h2 className={`${DESIGN_TOKENS.typography.h2} mb-4`}>
            Реальные результаты наших{' '}
            <span style={{
              background: 'linear-gradient(269deg, rgb(99, 52, 229) 28.67%, rgb(117, 197, 237) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>клиентов</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle}`}>
            Узнайте, как компании уже автоматизировали свою поддержку и увеличили эффективность бизнеса
          </p>
        </motion.div>

        {/* Мобильная версия - вертикальный стек */}
        <div className="block lg:hidden">
          <motion.div
            className="space-y-6 mb-8"
            {...DESIGN_TOKENS.animation.withDelay(0.2)}
          >
            {caseStudies.map((caseStudy, index) => (
              <motion.div
                key={caseStudy.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.3 + index * 0.15,
                  ease: "easeOut"
                }}
              >
                {/* Компания */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl ${caseStudy.avatarColor}`}>
                    {caseStudy.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{caseStudy.company}</h3>
                    <p className="text-sm text-gray-500">{caseStudy.industry}</p>
                  </div>
                </div>

                {/* Результаты - горизонтальная сетка */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {caseStudy.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="text-center">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <result.icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">{result.value}</p>
                      <p className="text-xs text-gray-500 leading-tight">{result.metric}</p>
                    </div>
                  ))}
                </div>

                {/* Описание */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {caseStudy.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Десктопная версия - сетка */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {caseStudies.map((caseStudy, index) => (
              <motion.div
                key={caseStudy.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-300"
                {...DESIGN_TOKENS.animation.withDelay(0.2 + index * 0.1)}
                onClick={() => setActiveCase(index)}
              >
                {/* Компания */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${caseStudy.avatarColor}`}>
                    {caseStudy.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{caseStudy.company}</h3>
                    <p className="text-sm text-gray-500">{caseStudy.industry}</p>
                  </div>
                </div>

                {/* Результаты */}
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {caseStudy.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                        <result.icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{result.value}</p>
                        <p className="text-xs text-gray-500">{result.metric}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Описание */}
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {caseStudy.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Мобильная версия CTA блока */}
        <div className="block lg:hidden">
          <motion.div
            className="relative text-center bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-6 overflow-hidden mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
          >
            {/* Декоративные элементы */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-2 left-2 w-16 h-16 rounded-full blur-lg opacity-10" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
              <div className="absolute bottom-2 right-2 w-20 h-20 rounded-full blur-xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
            </div>

            {/* Основной контент */}
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-3">
                Готовы к такому же результату?
              </h3>

              <p className="text-purple-100 mb-4 text-base leading-relaxed">
                Автоматизируйте поддержку за 15 минут и увеличьте эффективность бизнеса на{' '}
                <span className="font-bold text-white">300%</span>
              </p>

              {/* Преимущества - вертикальный стек */}
              <div className="space-y-3 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <FiBarChart className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
                  <p className="text-white font-medium text-sm">+300% эффективности</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <FiClock className="w-5 h-5 text-green-300 mx-auto mb-1" />
                  <p className="text-white font-medium text-sm">15 мин на настройку</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <FiCreditCard className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                  <p className="text-white font-medium text-sm">₽180K экономии/мес</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/register')}
                className="w-full py-3 px-6 text-base font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 bg-white text-[#6334E5] shadow-xl"
              >
                <span className="flex items-center justify-center gap-2">
                  <FiCheckCircle className="w-5 h-5" />
                  🚀 Начать бесплатно
                </span>
              </button>

              <p className="text-purple-200 mt-3 text-xs">
                <strong>14 дней бесплатно</strong> • Без обязательств
              </p>
            </div>
          </motion.div>
        </div>

        {/* Десктопная версия CTA блока */}
        <div className="hidden lg:block">
          <motion.div
            className="relative text-center bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-10 overflow-hidden"
            {...DESIGN_TOKENS.animation.withDelay(0.5)}
          >
            {/* Декоративные элементы */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-4 left-4 w-20 h-20 rounded-full blur-xl opacity-10" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
              <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full blur-2xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
            </div>

            {/* Основной контент */}
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Готовы к такому же результату?
              </h3>

              <p className="text-purple-100 mb-6 max-w-2xl mx-auto text-lg leading-relaxed">
                Автоматизируйте поддержку за 15 минут и увеличьте эффективность бизнеса на{' '}
                <span className="font-bold text-white">300%</span>
              </p>

              {/* Преимущества */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <FiBarChart className="w-6 h-6 text-yellow-300 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">+300% эффективности</p>
                </motion.div>

                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <FiClock className="w-6 h-6 text-green-300 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">15 мин на настройку</p>
                </motion.div>

                <motion.div
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <FiCreditCard className="w-6 h-6 text-blue-300 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">₽180K экономии/мес</p>
                </motion.div>
              </div>

              <motion.button
                onClick={() => router.push('/register')}
                className="px-10 py-4 text-lg font-bold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 h-14 relative overflow-hidden bg-white text-[#6334E5] shadow-2xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <FiCheckCircle className="w-6 h-6" />
                  Начать бесплатно
                  <FiArrowRight className="w-5 h-5" />
                </span>
              </motion.button>

              <motion.p
                className="text-purple-200 mt-4 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <strong>14 дней бесплатно</strong> • Без обязательств • Полный доступ ко всем функциям
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default CaseStudiesSection;
