'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import {
  FiX,
  FiCheck,
  FiDollarSign,
  FiMessageSquare,
  FiArrowRight,
  FiZap,
  FiCreditCard,
  FiTrendingUp
} from 'react-icons/fi';

const PricingBlockSection = () => {
  const router = useRouter();

  // Тарифные планы конкурентов
  const competitorPlans = [
    {
      name: 'Базовый тариф',
      price: '5,000₽/мес',
      features: ['500 сообщений', 'Базовая поддержка'],
      icon: '📊'
    },
    {
      name: 'Профессиональный',
      price: '15,000₽/мес',
      features: ['2,000 сообщений', 'Приоритетная поддержка'],
      icon: '🚀'
    },
    {
      name: 'Корпоративный',
      price: '35,000₽/мес',
      features: ['10,000 сообщений', 'Персональный менеджер'],
      icon: '🏢'
    },
    {
      name: 'Дополнительные платежи',
      price: 'от 2,000₽/мес',
      features: ['Штрафы за превышение', 'Доп. комиссии'],
      icon: '💸'
    }
  ];

  return (
    <motion.section
      className={`mt-20 ${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg} pb-20`}
      {...DESIGN_TOKENS.animation.default}
    >
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding}`}>
        {/* Заголовок секции */}
        <motion.div
          className="mb-16"
          {...DESIGN_TOKENS.animation.withDelay(0.1)}
        >
          <h2 className={`${DESIGN_TOKENS.typography.h2} mb-4`}>
            Простая и{' '}
            <span className={DESIGN_TOKENS.colors.primary}>честная цена</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle} max-w-3xl`}>
            Никаких подписок и лимитов. Платите только за то, что используете
          </p>
        </motion.div>

        {/* Мобильная версия - вертикальный стек */}
        <div className="block lg:hidden">
          <motion.div
            className="space-y-8"
            {...DESIGN_TOKENS.animation.withDelay(0.2)}
          >
            {/* Левая часть - перечеркнутые тарифы */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mb-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Тарифы конкурентов
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Вот что обычно платят другие компании
                  </p>
                </div>
                <div className="space-y-3">
                  {competitorPlans.map((plan, index) => (
                    <motion.div
                      key={index}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative min-h-[80px]"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                    >
                      {/* Перечеркивающая линия */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300 to-transparent transform -rotate-12 opacity-20 rounded-xl"></div>

                      <div className="flex items-start gap-3 relative z-10">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          {index === 0 && <FiDollarSign className="w-4.5 h-4.5 text-gray-600" />}
                          {index === 1 && <FiTrendingUp className="w-4.5 h-4.5 text-gray-600" />}
                          {index === 2 && <FiMessageSquare className="w-4.5 h-4.5 text-gray-600" />}
                          {index === 3 && <FiCreditCard className="w-4.5 h-4.5 text-gray-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 line-through decoration-red-500 decoration-2 text-sm leading-tight">
                              {plan.name}
                            </h4>
                            <p className="text-sm text-gray-600 line-through decoration-red-400 decoration-2">
                              {plan.price}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500 line-through decoration-red-400 decoration-2 leading-tight">
                              {plan.features[0]}
                            </div>
                            <div className="text-xs text-gray-500 line-through decoration-red-400 decoration-2 leading-tight">
                              {plan.features[1]}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Правая часть - наша цена */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                {/* Декоративные элементы */}
                <div className="absolute top-0 left-0 w-full h-full">
                  <div className="absolute top-2 left-2 w-16 h-16 rounded-full blur-lg opacity-10" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
                  <div className="absolute bottom-2 right-2 w-20 h-20 rounded-full blur-xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
                </div>

                <div className="relative z-10 text-center">
                  {/* Значок преимущества */}
                  <motion.div
                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                  >
                    <FiCheck className="w-4 h-4" />
                    Только за сообщения
                  </motion.div>

                  {/* Основная цена */}
                  <motion.div
                    className="mb-4"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                  >
                    <div className="text-5xl font-bold mb-1">
                      5₽
                    </div>
                    <div className="text-lg font-medium text-purple-100">
                      за одно сообщение
                    </div>
                  </motion.div>

                  {/* Преимущества */}
                  <div className="space-y-2 mb-6">
                    <motion.div
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiCheck className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Пополнение любым способом</span>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiCheck className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Видите все расходы в личном кабинете</span>
                    </motion.div>

                    <motion.div
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 }}
                    >
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiCheck className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Точная оплата за использование</span>
                    </motion.div>
                  </div>

                  {/* CTA кнопка */}
                  <motion.button
                    onClick={() => router.push('/register')}
                    className="w-full bg-white text-purple-600 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                  >
                    <FiZap className="w-5 h-5" />
                    🚀 Начать использовать
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Десктопная версия */}
        <div className="hidden lg:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Левая часть - перечеркнутые тарифы */}
          <motion.div
            className="space-y-6"
            {...DESIGN_TOKENS.animation.withDelay(0.2)}
          >
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Тарифы конкурентов
                </h3>
                <p className="text-gray-600 text-sm">
                  Вот что обычно платят другие компании
                </p>
              </div>
                <div className="grid grid-cols-1 gap-3">
                {competitorPlans.map((plan, index) => (
                  <motion.div
                    key={index}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    {/* Перечеркивающая линия */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300 to-transparent transform -rotate-12 opacity-20 rounded-xl"></div>

                      <div className="flex items-center justify-between relative z-10 gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {index === 0 && <FiDollarSign className="w-5 h-5 text-gray-600" />}
                          {index === 1 && <FiTrendingUp className="w-5 h-5 text-gray-600" />}
                          {index === 2 && <FiMessageSquare className="w-5 h-5 text-gray-600" />}
                          {index === 3 && <FiCreditCard className="w-5 h-5 text-gray-600" />}
                        </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 line-through decoration-red-500 decoration-2 text-sm leading-tight">
                            {plan.name}
                          </h4>
                          <p className="text-sm text-gray-600 line-through decoration-red-400 decoration-2">
                            {plan.price}
                          </p>
                        </div>
                      </div>
                        <div className="text-right flex-shrink-0 min-w-0">
                          <div className="text-xs text-gray-500 line-through decoration-red-400 decoration-2 leading-tight">
                          {plan.features[0]}
                        </div>
                          <div className="text-xs text-gray-500 line-through decoration-red-400 decoration-2 leading-tight">
                          {plan.features[1]}
                          </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Правая часть - наша цена */}
          <motion.div
            className="relative"
            {...DESIGN_TOKENS.animation.withDelay(0.3)}
          >
            <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
              {/* Декоративные элементы */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-4 left-4 w-20 h-20 rounded-full blur-xl opacity-10" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
                <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full blur-2xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-5" style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}></div>
              </div>

              <div className="relative z-10 text-center">
                {/* Значок преимущества */}
                <motion.div
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  <FiCheck className="w-4 h-4" />
                  Только за сообщения
                </motion.div>

                {/* Основная цена */}
                <motion.div
                  className="mb-6"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                >
                  <div className="text-6xl md:text-7xl font-bold mb-2">
                    5₽
                  </div>
                  <div className="text-xl font-medium text-purple-100">
                    за одно сообщение
                  </div>
                </motion.div>

                {/* Преимущества */}
                <div className="space-y-3 mb-8">
                  <motion.div
                    className="flex items-center gap-3 text-left"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm">Пополнение любым способом</span>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 text-left"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm">Видите все расходы в личном кабинете</span>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 text-left"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm">Точная оплата за использование</span>
                  </motion.div>
                </div>

                {/* CTA кнопка */}
                <motion.button
                  onClick={() => router.push('/register')}
                  className="w-full bg-white text-purple-600 font-bold py-4 px-6 rounded-[0.9rem] hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3 shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <FiZap className="w-5 h-5" />
                  Начать использовать
                  <FiArrowRight className="w-5 h-5" />
                </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
        </div>


      </div>
    </motion.section>
  );
};

export default PricingBlockSection;
