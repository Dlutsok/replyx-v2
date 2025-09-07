'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dashStyles from '../../styles/pages/Dashboard.module.css';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import {
  FiClock,
  FiTarget,
  FiActivity,
  FiDollarSign,
  FiTrendingUp,
  FiCheckCircle,
  FiShield,
  FiZap,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';

// Компактный hook для анимации счетчика
const useCountUp = (end, start = 0, duration = 1500) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    
    const totalFrames = Math.floor(duration / 16);
    let frame = 0;
    
    const counter = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const newValue = start + (end - start) * easeProgress;
      
      if (progress >= 1) {
        setCount(end);
        clearInterval(counter);
      } else {
        if (end < 10 && end % 1 !== 0) {
          setCount(Math.round(newValue * 10) / 10);
        } else {
          setCount(Math.floor(newValue));
        }
      }
    }, 16);

    return () => clearInterval(counter);
  }, [isVisible, end, start, duration]);

  return { count, setIsVisible };
};

const BenchmarksSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef(null);

  // Авто-скролл к активному табу на мобильных устройствах
  const scrollToActiveTab = (tabIndex) => {
    if (scrollContainerRef.current && window.innerWidth < 1024) {
      const tabElement = scrollContainerRef.current.querySelector(`[data-tab-index="${tabIndex}"]`);
      if (tabElement) {
        const container = scrollContainerRef.current;
        const tabRect = tabElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const scrollLeft = container.scrollLeft + tabRect.left - containerRect.left - (containerRect.width / 2) + (tabRect.width / 2);

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleTabClick = (index) => {
    setActiveTab(index);
    scrollToActiveTab(index);
  };

  // Контент для табов
  const tabContent = [
    {
      title: 'AI, который знает всё о вашем бизнесе',
      subtitle: 'Персонализированная экспертиза',
      description: 'Наш AI изучает вашу компанию, продукты и услуги, чтобы предоставлять клиентам максимально точные и релевантные ответы. Он становится полноценным экспертом вашего бренда, способным решать сложные запросы 24/7 без потери качества обслуживания.',
      features: [
        'Загрузка PDF, Word, TXT и веб-страниц',
        'Мгновенное обучение без программистов',
        'Поиск по базе знаний в реальном времени',
        'Поддержка до 100 000 страниц данных'
      ]
    },
    {
      title: 'Кастомизация виджета',
      subtitle: 'Адаптация под ваш бренд',
      description: 'Виджет легко брендируется: фирменные цвета, логотип и приветственное сообщение делают его частью вашего сайта.',
      features: [
        'Кастомизация цвета виджета',
        'Настройка приветственного сообщения',
        'Добавление логотипа компании',
        'Адаптация под мобильные устройства'
      ]
    },
    {
      title: 'Запуск за 15 минут без программистов',
      subtitle: 'Универсальная интеграция',
      description: 'Виджет работает на любых сайтах независимо от платформы или CMS. WordPress, Bitrix, Joomla, custom HTML - наш AI-ассистент интегрируется везде без сложных настроек и дополнительных разработок.',
      features: [
        'Совместимость с HTML, Tilda, WordPress, Bitrix и др.',
        'Интеграция без техподдержки',
        'Поддержка мобильных и десктопных версий',
        'Масштабируемость под нагрузку'
      ]
    },
    {
      title: 'AI в Telegram',
      subtitle: 'Умный ассистент для мессенджера',
      description: 'Интегрируйте AI-ассистента в ваш Telegram-бот. Клиенты смогут получать мгновенные ответы на вопросы и персонализированную консультацию прямо в мессенджере.',
      features: [
        'Интеграция с Telegram Bot API',
        'Обработка текстовых и голосовых сообщений',
        'Персонализация ответов',
        'Статистика и аналитика'
      ]
    },
    {
      title: 'Аналитика и отчёты',
      subtitle: 'Детальная статистика работы',
      description: 'Получайте подробную аналитику работы AI-ассистента. Отчёты о количестве обращений, времени ответа, популярных вопросах и эффективности поддержки помогут оптимизировать обслуживание клиентов.',
      features: [
        'Статистика по обращениям',
        'Анализ времени ответа',
        'Популярные вопросы и темы',
        'Эффективность поддержки'
      ]
    },
    {
      title: 'Передача оператору',
      subtitle: 'Умная маршрутизация обращений',
      description: 'AI-ассистент мгновенно распознает сложные запросы и передает их опытным операторам с полным контекстом беседы. Операторы получают всю историю взаимодействия, что позволяет решать проблемы клиентов без повторных объяснений и ожидания.',
      features: [
        'Мгновенное распознавание сложных запросов',
        'Полная передача контекста беседы',
        'Автоматическая маршрутизация к специалистам',
        'Ручное подключение через интерфейс'
      ]
    }
  ];

  // Все 8 метрик в компактном формате
  const allMetrics = [
    {
      icon: FiZap,
      title: 'База знаний',
      value: 89,
      suffix: '%',
      subtitle: 'компания и продукты',
      trend: 12,
      color: 'purple'
    },
    {
      icon: FiClock,
      title: 'Кастомизация виджета',
      value: 0.3,
      suffix: ' сек',
      subtitle: 'адаптация под бренд',
      trend: 8,
      color: 'blue'
    },
    {
      icon: FiTarget,
      title: 'Запуск без границ',
      value: 94.2,
      suffix: '%',
      subtitle: 'доступность везде',
      trend: 15,
      color: 'green'
    },
    {
      icon: FiActivity,
      title: 'AI в Telegram',
      value: 12000,
      suffix: '+',
      subtitle: 'Поддержка в мессенджере',
      trend: 25,
      color: 'orange'
    },
    {
      icon: FiTrendingUp,
      title: 'Аналитика и отчёты',
      value: 35,
      suffix: '%',
      subtitle: 'детальная статистика',
      trend: 20,
      color: 'emerald'
    },
    {
      icon: FiShield,
      title: 'Передача оператору',
      value: 100,
      suffix: '%',
      subtitle: 'умная маршрутизация',
      trend: 0,
      color: 'cyan'
    },
    {
      icon: FiTrendingUp,
      title: 'ROI',
      value: 420,
      suffix: '%',
      subtitle: 'за первый год',
      trend: 35,
      color: 'emerald'
    },
    {
      icon: FiDollarSign,
      title: 'Экономия',
      value: 240,
      suffix: 'K₽',
      subtitle: 'в месяц',
      trend: 28,
      color: 'green'
    },
    {
      icon: FiCheckCircle,
      title: 'Uptime',
      value: 99.97,
      suffix: '%',
      subtitle: 'SLA гарантия',
      trend: 2,
      color: 'cyan'
    },
    {
      icon: FiShield,
      title: 'Compliance',
      value: 100,
      suffix: '%',
      subtitle: 'GDPR + 152-ФЗ',
      trend: 0,
      color: 'indigo'
    }
  ];

  const colorClasses = {
    purple: { bg: 'bg-[#6334E5]/10', icon: 'text-[#6334E5]', text: 'text-[#6334E5]' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', text: 'text-cyan-600' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-[#6334E5]', text: 'text-[#6334E5]' }
  };

  const getGradientClasses = (color) => {
    const gradients = {
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
      orange: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
    };
    return gradients[color] || 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200';
  };

  const getIconClasses = (color) => {
    const icons = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      purple: 'text-[#6334E5]'
    };
    return icons[color] || 'text-gray-600';
  };

  const getTextClasses = (color) => {
    const texts = {
      blue: { title: 'text-blue-900', subtitle: 'text-blue-700', desc: 'text-blue-800' },
      green: { title: 'text-green-900', subtitle: 'text-green-700', desc: 'text-green-800' },
      orange: { title: 'text-orange-900', subtitle: 'text-orange-700', desc: 'text-orange-800' },
      purple: { title: 'text-[#6334E5]', subtitle: 'text-[#6334E5]', desc: 'text-[#6334E5]' }
    };
    return texts[color] || { title: 'text-gray-900', subtitle: 'text-gray-700', desc: 'text-gray-800' };
  };



  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden pb-20">
      {/* Hero-style gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-purple-50/30 pointer-events-none" />

      <div className={`max-w-1200 mx-auto ${DESIGN_TOKENS.spacing.containerPadding} w-full relative`}>
        {/* Заголовок секции */}
        <motion.div
          className={`text-left ${DESIGN_TOKENS.spacing.sectionMb}`}
          {...DESIGN_TOKENS.animation.default}
        >
          <h2 className={`${DESIGN_TOKENS.typography.h2} text-2xl lg:text-3xl xl:text-4xl`}>
            <span className="text-gray-900">Наши возможности</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle} mt-3 lg:mt-4 text-sm lg:text-base xl:text-lg`}>
            Интеллектуальная система поддержки, сочетающая скорость, точность и масштабируемость
          </p>
        </motion.div>

        {/* Мобильная версия - горизонтальный скролл табов */}
        <div className="block lg:hidden">
          <div className="overflow-x-auto pb-4 mb-6" ref={scrollContainerRef}>
            <div className="flex gap-3" style={{width: 'max-content'}}>
              {allMetrics.slice(0, 6).map((metric, index) => (
                <motion.div
                  key={index}
                  {...DESIGN_TOKENS.animation.withDelay(0.1 + index * 0.1)}
                  className={`bg-white rounded-xl px-3 py-2 shadow-sm border transition-all duration-300 cursor-pointer flex-shrink-0 min-w-[180px] relative ${
                    activeTab === index
                      ? 'border-[#6334E5] shadow-md bg-[#6334E5]/10/50'
                      : 'border-gray-200 hover:shadow-md hover:border-purple-200'
                  }`}
                  data-tab-index={index}
                  onClick={() => handleTabClick(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      activeTab === index
                        ? 'bg-[#6334E5]/10'
                        : colorClasses[metric.color].bg
                    }`}>
                      <metric.icon
                        className={`w-5 h-5 transition-colors ${
                          activeTab === index
                            ? 'text-[#6334E5]'
                            : colorClasses[metric.color].icon
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{metric.title}</p>
                      <p className="text-xs text-gray-600 leading-tight">{metric.subtitle}</p>
                    </div>
                  </div>
                  {activeTab === index && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-[#6334E5] rounded-full"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Контент таба для мобильной версии */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {tabContent[activeTab].title}
              </h3>
              <p className="text-[#6334E5] font-medium mb-3 text-sm">
                {tabContent[activeTab].subtitle}
              </p>
              <p className="text-gray-600 leading-relaxed text-sm">
                {tabContent[activeTab].description}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Ключевые возможности:</h4>
              {tabContent[activeTab].features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#6334E5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiCheckCircle className="w-2.5 h-2.5 text-[#6334E5]" />
                  </div>
                  <span className="text-xs text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Десктопная версия - сетка */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-stretch">
            {/* Левая часть - интерактивные табы */}
            <motion.div
              {...DESIGN_TOKENS.animation.default}
              className="lg:col-span-2 min-h-[400px] lg:min-h-[500px]"
            >
              <div className="space-y-2 lg:space-y-3 h-full flex flex-col justify-start lg:justify-center">
                {allMetrics.slice(0, 6).map((metric, index) => (
                  <motion.div
                    key={index}
                    {...DESIGN_TOKENS.animation.withDelay(0.1 + index * 0.1)}
                    className={`bg-white rounded-lg px-3 py-2 lg:px-4 lg:py-3 shadow-sm border transition-all duration-300 cursor-pointer ${
                      activeTab === index
                        ? 'border-[#6334E5] shadow-md bg-[#6334E5]/10/50'
                        : 'border-gray-200 hover:shadow-md hover:border-purple-200'
                    }`}
                    onClick={() => handleTabClick(index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        activeTab === index
                          ? 'bg-[#6334E5]/10'
                          : colorClasses[metric.color].bg
                      }`}>
                        <metric.icon
                          className={`w-5 h-5 transition-colors ${
                            activeTab === index
                              ? 'text-[#6334E5]'
                              : colorClasses[metric.color].icon
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{metric.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{metric.subtitle}</p>
                      </div>
                      {activeTab === index && (
                        <div className="w-1.5 h-6 bg-[#6334E5] rounded-full"></div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Правая часть - контент таба */}
            <motion.div
              {...DESIGN_TOKENS.animation.withDelay(0.3)}
              className="lg:col-span-3 min-h-[500px]"
            >
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 p-4 lg:p-8 shadow-sm h-full flex flex-col justify-center"
              >
                <div className="mb-4 lg:mb-6">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                    {tabContent[activeTab].title}
                  </h3>
                  <p className="text-[#6334E5] font-medium mb-3 lg:mb-4 text-sm lg:text-base">
                    {tabContent[activeTab].subtitle}
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm lg:text-base">
                    {tabContent[activeTab].description}
                  </p>
                </div>

                <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2 lg:mb-3 text-sm lg:text-base">Ключевые возможности:</h4>
                  {tabContent[activeTab].features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 lg:gap-3">
                      <div className="w-4 h-4 lg:w-5 lg:h-5 bg-[#6334E5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiCheckCircle className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#6334E5]" />
                      </div>
                      <span className="text-xs lg:text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>


              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );

  // Additional section for more detailed metrics and explanations
  return (
    <div>
      {/* Main hero-style section */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
        {/* Hero-style gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-purple-50/30 pointer-events-none" />

        <div className={`max-w-1200 mx-auto ${DESIGN_TOKENS.spacing.containerPadding} w-full relative`}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-center">
            {/* Левая часть - контент в стиле hero */}
            <motion.div
              {...DESIGN_TOKENS.animation.default}
              className="lg:col-span-3 space-y-6"
            >
              {/* Профессиональный заголовок в стиле hero */}
              <motion.h2
                className={`${DESIGN_TOKENS.typography.h1} text-left text-3xl sm:text-4xl md:text-5xl`}
                {...DESIGN_TOKENS.animation.withDelay(0.1)}
              >
                Измеримые результаты и{' '}
                <span className={DESIGN_TOKENS.colors.primary}>гарантии качества</span>
              </motion.h2>

              {/* Подзаголовок */}
              <motion.p
                className={DESIGN_TOKENS.typography.sectionSubtitle + ' max-w-3xl text-left'}
                {...DESIGN_TOKENS.animation.withDelay(0.2)}
              >
                Производственные метрики в реальном времени подтверждают эффективность нашей AI-системы
              </motion.p>

              {/* Status badge */}
              <motion.div
                className="inline-flex items-center gap-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full px-4 py-2"
                {...DESIGN_TOKENS.animation.withDelay(0.25)}
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Все метрики обновляются в реальном времени</span>
              </motion.div>
            </motion.div>

            {/* Правая часть - метрики в стиле hero cards */}
            <motion.div
              {...DESIGN_TOKENS.animation.withDelay(0.15)}
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-1 gap-4">
                {allMetrics.slice(0, 4).map((metric, index) => (
                  <motion.div
                    key={index}
                    {...DESIGN_TOKENS.animation.withDelay(0.2 + index * 0.1)}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        colorClasses[metric.color].bg
                      }`}>
                        <metric.icon
                          className={`w-5 h-5 ${colorClasses[metric.color].icon}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {metric.value === 240
                              ? Math.floor(count)
                              : metric.value < 10 && metric.value % 1 !== 0
                                ? count.toFixed(1)
                                : Math.floor(count).toLocaleString('ru-RU')
                            }
                            <span className="text-xs font-medium text-gray-500 ml-1">
                              {metric.suffix}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <FiArrowUp className="text-emerald-600 w-3 h-3" />
                            <span className="text-emerald-600 font-medium text-xs">+{metric.trend}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{metric.title}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Additional metrics section in hero style */}
      <motion.section
        className={`${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg}`}
        {...DESIGN_TOKENS.animation.default}
      >
                  <div className={`max-w-1200 mx-auto ${DESIGN_TOKENS.spacing.containerPadding}`}>
          {/* Additional metrics in grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12"
            {...DESIGN_TOKENS.animation.withDelay(0.1)}
          >
            {allMetrics.slice(4).map((metric, index) => (
              <motion.div
                key={index + 4}
                {...DESIGN_TOKENS.animation.withDelay(0.2 + index * 0.1)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    colorClasses[metric.color].bg
                  }`}>
                    <metric.icon
                      className={`w-6 h-6 ${colorClasses[metric.color].icon}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {metric.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {metric.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className={dashStyles.metricValue}>
                    {metric.value < 10 && metric.value % 1 !== 0
                      ? metric.value.toFixed(1)
                      : Math.floor(metric.value).toLocaleString('ru-RU')
                    }
                    <span className="text-sm font-medium text-gray-500 ml-1">
                      {metric.suffix}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <FiArrowUp className="text-emerald-600" size={12} />
                    <span className="text-emerald-600 font-medium">+{metric.trend || 5}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quality assurance section */}
          <motion.div
            className="bg-white rounded-xl border border-gray-200 p-8"
            {...DESIGN_TOKENS.animation.withDelay(0.3)}
          >
            <div className="text-center mb-8">
              <h3 className={`${DESIGN_TOKENS.typography.h3} mb-4`}>
                Как мы достигаем таких результатов
              </h3>
              <p className={DESIGN_TOKENS.typography.subtitle}>
                Четыре ключевых принципа, обеспечивающих превосходное качество
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: FiTarget,
                  title: 'Точность ответов',
                  subtitle: 'Многоуровневая проверка',
                  description: 'Каждый ответ проходит через систему валидации, которая проверяет релевантность и точность информации.',
                  color: 'blue'
                },
                {
                  icon: FiClock,
                  title: 'Скорость обработки',
                  subtitle: 'Оптимизированная архитектура',
                  description: 'Специально разработанная инфраструктура обеспечивает мгновенное время отклика даже при высокой нагрузке.',
                  color: 'green'
                },
                {
                  icon: FiShield,
                  title: 'Безопасность данных',
                  subtitle: '152-ФЗ + GDPR',
                  description: 'Все данные шифруются и хранятся на российских серверах в соответствии с законодательством.',
                  color: 'orange'
                },
                {
                  icon: FiTrendingUp,
                  title: 'Непрерывное улучшение',
                  subtitle: 'ML и аналитика',
                  description: 'Система постоянно обучается на новых данных и улучшает качество ответов с помощью машинного обучения.',
                  color: 'purple'
                }
              ].map((item, index) => {
                const gradientClass = getGradientClasses(item.color);
                const iconClass = getIconClasses(item.color);
                const textClasses = getTextClasses(item.color);

                return (
                  <motion.div
                    key={index}
                    {...DESIGN_TOKENS.animation.withDelay(0.4 + index * 0.1)}
                    className={`${gradientClass} p-6 rounded-xl`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <item.icon className={`w-6 h-6 ${iconClass}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${textClasses.title}`}>{item.title}</p>
                        <p className={`text-xs ${textClasses.subtitle}`}>{item.subtitle}</p>
                      </div>
                    </div>
                    <p className={`text-sm ${textClasses.desc} leading-relaxed`}>
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default BenchmarksSection;