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
      description: 'Настройте AI-ассистента правильно',
      icon: FiUserPlus,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 2,
      title: 'Загрузите документы',
      description: 'Добавьте файлы для обучения',
      icon: FiFileText,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 3,
      title: 'Установите виджет',
      description: 'Получите код и разместите на сайте',
      icon: FiCode,
      status: 'pending',
      color: 'gray'
    },
    {
      id: 4,
      title: 'Протестируйте систему',
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
        bg: 'bg-[#6334E5]/10',
        border: 'border-[#6334E5]/30',
        icon: 'text-[#6334E5]',
        text: 'text-[#6334E5]',
        accent: 'text-[#6334E5]'
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
      className={`${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg} pb-20 pb-0 lg:pb-6`}
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
            <span style={{
              background: 'linear-gradient(269deg, rgb(99, 52, 229) 28.67%, rgb(117, 197, 237) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>полной автоматизации</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle} max-w-3xl`}>
            Простая настройка чат-ассистента на сайт за 15 минут. Интеграция без программистов
          </p>
        </motion.div>

        {/* Мобильная версия прогресс-бара */}
        <div className="block lg:hidden">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {/* Заголовок прогресса */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Прогресс настройки</h4>
                <span className="text-xs text-gray-500">
                  {steps.filter(step => step.status === 'completed').length} из {steps.length} шагов
                </span>
              </div>

              {/* Основной прогресс-бар */}
              <div className="relative mb-4">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6334E5] via-[#6334E5] to-[#6334E5] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: getProgressWidth() }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-[#6334E5] drop-shadow-sm">
                    {getProgressWidth()}
                  </span>
                </div>
              </div>

              {/* Мини-индикаторы шагов */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    className="flex flex-col items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.5 + index * 0.1,
                      ease: "easeOut"
                    }}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 mb-1
                      ${step.status === 'completed'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 text-white shadow-sm'
                        : step.status === 'current'
                        ? 'bg-gradient-to-br from-[#6334E5] to-violet-600 border-[#6334E5] text-white shadow-sm animate-pulse'
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {step.status === 'completed' ? (
                        <FiCheckCircle size={14} />
                      ) : (
                        <span className="text-xs font-semibold">{step.id}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Десктопная версия прогресс-бара */}
        <div className="hidden lg:block">
          <motion.div
            className="mb-12"
            {...DESIGN_TOKENS.animation.withDelay(0.2)}
          >
            <div className="relative">
              {/* Фон прогресс-бара */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#6334E5] via-[#6334E5] to-[#6334E5] rounded-full"
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
                      ${step.status === 'completed' ? 'bg-[#6334E5] border-[#6334E5] text-white' :
                        step.status === 'current' ? 'bg-[#6334E5] border-[#6334E5] text-white' :
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
        </div>

        {/* Мобильная версия - современный вертикальный стек */}
        <div className="block lg:hidden">
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            {steps.map((step, index) => {
              const statusColors = getStatusColor(step.status);

              return (
                <motion.div
                  key={step.id}
                  className={`
                    relative overflow-hidden transition-all duration-500
                    ${step.status === 'current'
                      ? 'bg-gradient-to-br from-[#6334E5]/10 via-[#6334E5]/10 to-[#6334E5]/10 border-2 border-[#6334E5]/30 shadow-lg'
                      : step.status === 'completed'
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-md'
                      : 'bg-white border-2 border-gray-100 shadow-sm'
                    }
                    rounded-3xl
                  `}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.6 + index * 0.15,
                    ease: "easeOut"
                  }}
                >
                  {/* Фоновый градиент для активного шага */}
                  {step.status === 'current' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-[#6334E5]/30 via-violet-50/20 to-[#6334E5]/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}

                  <div className="relative p-5">
                    {/* Верхняя часть с номером и статусом */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Большой номер шага */}
                        <div className={`
                          w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-300
                          ${step.status === 'completed'
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg'
                            : step.status === 'current'
                            ? 'bg-gradient-to-br from-[#6334E5] to-violet-600 text-white shadow-lg animate-pulse'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                          }
                        `}>
                          {step.status === 'completed' ? (
                            <FiCheckCircle size={20} />
                          ) : (
                            step.id
                          )}
                        </div>

                      </div>

                      {/* Иконка шага */}
                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
                        ${step.id === 1 ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                          step.id === 2 ? 'bg-gradient-to-br from-green-100 to-green-200' :
                          step.id === 3 ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
                          'bg-gradient-to-br from-[#6334E5]/10 to-[#6334E5]/20'}
                      `}>
                        <step.icon
                          className={`w-7 h-7 transition-colors duration-300 ${
                            step.id === 1 ? 'text-blue-600' :
                            step.id === 2 ? 'text-green-600' :
                            step.id === 3 ? 'text-orange-600' :
                            'text-[#6334E5]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Контент */}
                    <div className="space-y-2">
                      <h3 className={`text-lg font-bold leading-tight transition-colors duration-300 ${
                        step.status === 'completed' ? 'text-green-900' :
                        step.status === 'current' ? 'text-[#6334E5]' : 'text-gray-900'
                      }`}>
                        {step.title}
                      </h3>

                      <p className="text-sm text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>


                    {/* CTA для текущего шага */}
                    {step.status === 'current' && (
                      <motion.div
                        className="mt-4 pt-3 border-t border-[#6334E5]/30"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <button className="w-full bg-gradient-to-r from-[#6334E5] to-violet-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95">
                          Продолжить шаг {step.id}
                        </button>
                      </motion.div>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Десктопная версия - сетка */}
        <div className="hidden lg:block">
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
                    relative bg-white rounded-2xl border transition-all duration-300
                    ${statusColors.border} ${statusColors.bg}
                    ${step.status === 'current' ? 'shadow-lg border-[#6334E5]/40' :
                      step.status === 'completed' ? 'shadow-md' :
                      'shadow-sm border-gray-200'}
                  `}
                  {...DESIGN_TOKENS.animation.withDelay(0.5 + index * 0.1)}
                  onClick={() => setActiveStep(index)}
                >
                  {/* Статус индикатор */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center">
                    {step.status === 'completed' ? (
                      <div className="w-3 h-3 bg-gradient-to-br from-[#6334E5] to-[#6334E5] rounded-full" />
                    ) : step.status === 'current' ? (
                      <div className="w-3 h-3 bg-[#6334E5] rounded-full animate-pulse" />
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
                        'bg-[#6334E5]/10'}
                    `}>
                      <step.icon
                        className={`w-6 h-6 transition-colors duration-300 ${
                          step.id === 1 ? 'text-blue-600' :
                          step.id === 2 ? 'text-green-600' :
                          step.id === 3 ? 'text-orange-600' :
                          'text-[#6334E5]'
                        }`}
                      />
                    </div>

                    {/* Заголовок */}
                    <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                      step.status === 'completed' ? 'text-[#6334E5]' :
                      step.status === 'current' ? 'text-[#6334E5]' : 'text-gray-700'
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
                        className="flex items-center gap-2 text-[#6334E5]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="text-sm font-medium">Продолжить</span>
                        <FiChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Мобильная CTA кнопка */}
        <div className="block lg:hidden">
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8, ease: "easeOut" }}
          >
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <button
                onClick={() => router.push('/register')}
                className="w-full bg-gradient-to-r from-[#6334E5] via-[#6334E5] to-[#6334E5] text-white py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6334E5]/30 hover:from-[#6334E5] hover:via-[#6334E5] hover:to-[#6334E5] hover:shadow-lg active:scale-95 relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#6334E5] via-[#6334E5] to-[#6334E5] opacity-0 hover:opacity-20 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Начать настройку</span>
                </span>
              </button>
              <p className="text-xs text-green-600 text-center mt-3">
                Первые 50 сообщений бесплатно
              </p>
            </div>
          </motion.div>
        </div>

        {/* Десктопная CTA кнопка */}
        <div className="hidden lg:block">
          <motion.div
            className="text-center mt-12"
            {...DESIGN_TOKENS.animation.withDelay(0.8)}
          >
            <button
              onClick={() => router.push('/register')}
              className="relative overflow-hidden new-button-effect bg-[#6334E5] hover:bg-primary-700 text-white px-8 py-2.5 font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6334E5]/30 h-11"
              style={{transform: 'none'}}
            >
              <span className="absolute inset-0 z-0 hoverEffect">
                <div></div>
              </span>
              <span className="relative z-10">Начать настройку</span>
            </button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default SetupStepsSection;
