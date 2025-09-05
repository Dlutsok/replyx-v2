'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import {
  FiUserPlus,
  FiFileText,
  FiCode,
  FiCheckCircle,
  FiChevronRight
} from 'react-icons/fi';

const SetupStepsSection = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredStep, setHoveredStep] = useState(null);
  const scrollRef = useRef(null);

  // Шаги настройки AI-ассистента
  const steps = [
    {
      id: 1,
      title: 'Создайте ассистента',
      description: 'Настройте AI-ассистента с готовым шаблоном',
      icon: FiUserPlus,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 2,
      title: 'Документы загружены',
      description: 'Добавьте файлы для обучения',
      icon: FiFileText,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 3,
      title: 'Виджет установлен',
      description: 'Получите код и разместите на сайте',
      icon: FiCode,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 4,
      title: 'Система протестирована',
      description: 'Проверьте работу в тестовом диалоге',
      icon: FiCheckCircle,
      status: 'pending',
      color: 'gray'
    }
  ];

  // Функция для получения цвета по статусу
  const getStatusColor = (status, color) => {
    const colorMap = {
      completed: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        text: 'text-green-700',
        accent: 'text-green-600'
      },
      current: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        text: 'text-purple-700',
        accent: 'text-purple-600'
      },
      pending: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'text-gray-400',
        text: 'text-gray-500',
        accent: 'text-gray-400'
      }
    };
    return colorMap[status] || colorMap.pending;
  };

  // Анимация прогресс-бара
  const getProgressWidth = () => {
    // Фиксированный прогресс до начала первой цифры (единички)
    return '8%';
  };

  return (
    <motion.section
      className={`${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg}`}
      {...DESIGN_TOKENS.animation.default}
    >
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding}`}>
        {/* Заголовок секции */}
        <motion.div
          className="mb-12"
          {...DESIGN_TOKENS.animation.withDelay(0.1)}
        >
          <h2 className={`${DESIGN_TOKENS.typography.h2} mb-4`}>
            4 шага до{' '}
            <span className={DESIGN_TOKENS.colors.primary}>полной автоматизации</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle} max-w-3xl`}>
            Простая и интуитивная настройка AI-ассистента без технических навыков
          </p>
        </motion.div>

        {/* Прогресс-бар */}
        <motion.div
          className="mb-12"
          {...DESIGN_TOKENS.animation.withDelay(0.2)}
        >
          <div className="relative">
            {/* Фон прогресс-бара */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: getProgressWidth() }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </div>

            {/* Индикаторы шагов */}
            <div className="absolute -top-6 left-0 right-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className="flex justify-center"
                  {...DESIGN_TOKENS.animation.withDelay(0.3 + index * 0.1)}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${step.status === 'completed' ? 'bg-purple-500 border-purple-500 text-white' :
                      step.status === 'current' ? 'bg-purple-500 border-purple-500 text-white' :
                      'bg-white border-gray-300 text-gray-400'}
                  `}>
                    {step.status === 'completed' ? (
                      <FiCheckCircle size={20} />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Шаги в виде карточек */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          {...DESIGN_TOKENS.animation.withDelay(0.4)}
        >
          {steps.map((step, index) => {
            const statusColors = getStatusColor(step.status);

            return (
              <motion.div
                key={step.id}
                className={`
                  relative bg-white rounded-2xl border transition-all duration-300 cursor-pointer
                  ${statusColors.border} ${statusColors.bg}
                  ${step.status === 'current' ? 'shadow-lg hover:shadow-xl border-purple-300' :
                    step.status === 'completed' ? 'shadow-md hover:shadow-lg' :
                    'shadow-sm hover:shadow-md border-gray-200'}
                `}
                {...DESIGN_TOKENS.animation.withDelay(0.5 + index * 0.1)}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => setActiveStep(index)}
              >
                {/* Статус индикатор */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center">
                  {step.status === 'completed' ? (
                    <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full" />
                  ) : step.status === 'current' ? (
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 bg-gray-300 rounded-full" />
                  )}
                </div>

                {/* Контент карточки */}
                <div className="p-6">
                  {/* Иконка */}
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                    ${step.id === 1 ? 'bg-blue-100' :
                      step.id === 2 ? 'bg-green-100' :
                      step.id === 3 ? 'bg-orange-100' :
                      'bg-purple-100'}
                  `}>
                    <step.icon
                      className={`w-6 h-6 transition-colors duration-300 ${
                        step.id === 1 ? 'text-blue-600' :
                        step.id === 2 ? 'text-green-600' :
                        step.id === 3 ? 'text-orange-600' :
                        'text-purple-600'
                      }`}
                    />
                  </div>

                  {/* Заголовок */}
                  <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                    step.status === 'completed' ? 'text-purple-900' :
                    step.status === 'current' ? 'text-purple-900' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </h3>



                  {/* Описание */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Стрелка для текущего шага */}
                  {step.status === 'current' && (
                    <motion.div
                      className="flex items-center gap-2 text-purple-600"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-sm font-medium">Продолжить</span>
                      <FiChevronRight className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>

                {/* Hover эффект */}
                {hoveredStep === index && step.status !== 'completed' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 rounded-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA кнопка */}
        <motion.div
          className="text-center mt-12"
          {...DESIGN_TOKENS.animation.withDelay(0.8)}
        >
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-2.5 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-11 relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700"
          >
            <span className="absolute inset-0 z-0 animate-wave-gradient bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-400" />
            <span className="relative z-10">Начать настройку</span>
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default SetupStepsSection;
