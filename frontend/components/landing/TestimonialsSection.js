'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

// Custom styles for navigation buttons and animations
const customNavigationStyles = `
  .testimonial-prev.swiper-button-disabled,
  .testimonial-next.swiper-button-disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }

  /* Анимация плавающих элементов */
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  /* Интерактивные эффекты для декоративных элементов */
  .cta-decoration:hover {
    transform: scale(1.1);
    transition: transform 0.3s ease;
  }

  .cta-decoration-pulse:hover {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(147, 51, 234, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(147, 51, 234, 0.6), 0 0 30px rgba(139, 69, 229, 0.4);
    }
  }
`;

const TestimonialsSection = () => {
  // Add custom styles for navigation buttons
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = customNavigationStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const testimonials = [
    {
      id: 1,
      name: 'Алексей Петров',
      position: 'CTO, TechCorp',
      company: 'TechCorp',
      rating: 5,
      text: 'ReplyX полностью автоматизировал нашу поддержку клиентов. Теперь мы отвечаем мгновенно 24/7, а экономия составила более 180 000 рублей в месяц.',
      avatar: 'AP'
    },
    {
      id: 2,
      name: 'Мария Иванова',
      position: 'Руководитель отдела продаж',
      company: 'E-commerce Plus',
      rating: 5,
      text: 'Увеличение продаж на 65% за 3 месяца использования. Клиенты довольны мгновенными ответами, а мы обработали в 2 раза больше запросов.',
      avatar: 'MI'
    },
    {
      id: 3,
      name: 'Дмитрий Сидоров',
      position: 'Главный врач',
      company: 'MedCenter Pro',
      rating: 5,
      text: 'AI-ассистент работает круглосуточно, автоматически записывая пациентов на прием. Мы сократили время на административные задачи на 70%.',
      avatar: 'DS'
    },
    {
      id: 4,
      name: 'Елена Козлова',
      position: 'Директор по маркетингу',
      company: 'RetailHub',
      rating: 5,
      text: 'Простая интеграция и понятная цена. За 15 минут настроили чат-бот, который обрабатывает 80% входящих запросов. Рекомендую!',
      avatar: 'EK'
    },
    {
      id: 5,
      name: 'Игорь Морозов',
      position: 'Владелец бизнеса',
      company: 'ServicePro',
      rating: 5,
      text: 'Отличная альтернатива дорогим CRM-системам. Платим только за сообщения, нет абонентской платы. ROI уже в первый месяц использования.',
      avatar: 'IM'
    },
    {
      id: 6,
      name: 'Ольга Сергеева',
      position: 'Менеджер по работе с клиентами',
      company: 'Consulting Group',
      rating: 5,
      text: 'Наши консультанты теперь фокусируются на сложных задачах, а рутинные вопросы решает AI. Качество ответов на высоком уровне.',
      avatar: 'OS'
    }
  ];

  return (
    <section className={`${DESIGN_TOKENS.spacing.sectionPadding} ${DESIGN_TOKENS.colors.sectionBg} pt-20 pb-20`}>
      <div className={`${DESIGN_TOKENS.spacing.maxWidth} ${DESIGN_TOKENS.spacing.containerPadding}`}>
        {/* Заголовок секции */}
        <div className="text-left mb-16">
          <h2 className={`${DESIGN_TOKENS.typography.h2} mb-4`}>
            Что говорят наши <span className="text-[#6334E5]">клиенты</span>
          </h2>
          <p className={`${DESIGN_TOKENS.typography.sectionSubtitle}`}>
            Реальные отзывы компаний, которые уже используют ReplyX для автоматизации поддержки
          </p>
        </div>

        {/* Слайдер с отзывами */}
        <div className="relative">

          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation={{
              nextEl: '.testimonial-next',
              prevEl: '.testimonial-prev',
            }}
            pagination={false}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
            className="pb-4"
          >
            {testimonials.map((testimonial) => (
              <SwiperSlide key={testimonial.id}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 h-[280px] hover:shadow-lg transition-all duration-300 flex flex-col">
                  {/* Рейтинг */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FiStar key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  {/* Отзыв */}
                  <blockquote className="text-gray-700 leading-relaxed mb-4 flex-1 overflow-hidden">
                    <div className="overflow-hidden">
                      {testimonial.text.length > 120
                        ? `"${testimonial.text.substring(0, 120)}..."`
                        : `"${testimonial.text}"`
                      }
                    </div>
                  </blockquote>

                  {/* Автор */}
                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6334E5] to-[#6334E5] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {testimonial.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {testimonial.name}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">
                        {testimonial.position}
                      </p>
                      <p className="text-xs text-[#6334E5] font-medium truncate">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Навигация внизу */}
          <div className="flex justify-end mt-6">
            <div className="flex gap-3">
              <button className="testimonial-prev w-10 h-10 bg-white border border-gray-200 rounded-[0.9rem] flex items-center justify-center hover:bg-[#6334E5]/10 hover:border-[#6334E5] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button className="testimonial-next w-10 h-10 bg-white border border-gray-200 rounded-[0.9rem] flex items-center justify-center hover:bg-[#6334E5]/10 hover:border-[#6334E5] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Профессиональный CTA блок */}
        <div className="mt-20">
          {/* Десктопная версия */}
          <div className="hidden lg:block max-w-4xl xl:max-w-[1200px] mx-auto px-4 sm:px-6 xl:px-0">
            {/* Центральный CTA элемент */}
            <div className="relative bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 md:p-10 xl:p-12 shadow-lg overflow-hidden">
              {/* Декоративные элементы фона */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Основной градиентный круг */}
                <div className="absolute top-0 right-0 w-32 sm:w-40 xl:w-32 h-32 sm:h-40 xl:h-32 bg-gradient-to-br from-purple-100/40 via-purple-200/30 to-transparent rounded-full blur-3xl transform translate-x-16 sm:translate-x-20 xl:translate-x-16 -translate-y-8 sm:-translate-y-10 xl:-translate-y-8"></div>

                {/* Маленькие декоративные круги */}
                <div className="absolute top-12 sm:top-16 xl:top-12 left-12 sm:left-16 xl:left-12 w-6 sm:w-8 xl:w-6 h-6 sm:h-8 xl:h-6 bg-gradient-to-br from-purple-200/60 to-purple-300/40 rounded-full blur-sm animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute bottom-16 sm:bottom-20 xl:bottom-16 right-16 sm:right-20 xl:right-16 w-8 sm:w-12 xl:w-8 h-8 sm:h-12 xl:h-8 bg-gradient-to-br from-purple-200/50 to-purple-300/30 rounded-full blur-md animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-1/2 left-1/4 sm:left-1/3 xl:left-1/4 w-5 sm:w-6 xl:w-5 h-5 sm:h-6 xl:h-5 bg-gradient-to-br from-purple-200/70 to-purple-300/50 rounded-full blur-sm animate-pulse" style={{animationDelay: '0.5s'}}></div>

                {/* Геометрические элементы */}
                <div className="absolute top-6 sm:top-8 xl:top-6 left-6 sm:left-8 xl:left-6 w-1.5 sm:w-2 xl:w-1.5 h-1.5 sm:h-2 xl:h-1.5 bg-purple-300/60 rotate-45 animate-bounce" style={{animationDelay: '3s'}}></div>
                <div className="absolute bottom-6 sm:bottom-8 xl:bottom-6 right-6 sm:right-8 xl:right-6 w-2 sm:w-3 xl:w-2 h-2 sm:h-3 xl:h-2 bg-purple-300/50 rotate-12 animate-bounce" style={{animationDelay: '1.5s'}}></div>
                <div className="absolute top-1/4 right-1/3 sm:right-1/4 xl:right-1/3 w-1 h-1 sm:w-1.5 sm:h-1.5 xl:w-1 xl:h-1 bg-purple-300/70 rounded-full animate-ping" style={{animationDelay: '4s'}}></div>

                {/* Тонкие линии */}
                <div className="absolute top-16 sm:top-20 xl:top-16 left-0 w-px h-12 sm:h-16 xl:h-12 bg-gradient-to-b from-transparent via-purple-200/40 to-transparent"></div>
                <div className="absolute bottom-12 sm:bottom-16 xl:bottom-12 right-0 w-px h-8 sm:h-12 xl:h-8 bg-gradient-to-b from-transparent via-purple-200/40 to-transparent"></div>

                {/* Плавающие иконки */}
                <div className="absolute top-8 sm:top-12 xl:top-8 right-8 sm:right-12 xl:right-8 w-4 sm:w-6 xl:w-4 h-4 sm:h-6 xl:h-4 opacity-20 animate-float" style={{animationDelay: '0s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div className="absolute bottom-8 sm:bottom-12 xl:bottom-8 left-8 sm:left-12 xl:left-8 w-3 sm:w-5 xl:w-3 h-3 sm:h-5 xl:h-3 opacity-15 animate-float" style={{animationDelay: '2s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="absolute top-1/3 left-6 sm:left-8 xl:left-6 w-3 sm:w-4 xl:w-3 h-3 sm:h-4 xl:h-3 opacity-25 animate-float" style={{animationDelay: '1s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>

              <div className="relative z-10 text-center max-w-3xl mx-auto">
                {/* Заголовок */}
                <h3 className="text-2xl sm:text-3xl md:text-4xl xl:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                  Масштабируйте бизнес с{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    ReplyX
                  </span>
                </h3>

                {/* Описание */}
                <p className="text-lg sm:text-xl xl:text-lg text-gray-600 mb-6 sm:mb-8 xl:mb-6 leading-relaxed">
                  От малого бизнеса до корпораций — автоматизируйте поддержку и фокусируйтесь на росте
                </p>

                {/* CTA кнопка */}
                <div className="flex justify-center mb-6 sm:mb-8 xl:mb-6">
                  <button className="px-6 sm:px-8 xl:px-6 py-3 sm:py-4 xl:py-3 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-12 sm:h-14 xl:h-12 relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-base sm:text-lg xl:text-base">
                    <span className="absolute inset-0 z-0 animate-wave-gradient bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-400" />
                    <span className="relative z-10 flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Начать бесплатно
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>

                {/* Социальное доказательство */}
                <div className="border-t border-gray-200 pt-6 sm:pt-8 xl:pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 xl:gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">500+ компаний</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">4.9/5 рейтинг</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">14 дней бесплатно</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Мобильная версия */}
          <div className="block lg:hidden max-w-1200 mx-auto">
            {/* Центральный CTA элемент */}
            <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-lg overflow-hidden">
              {/* Декоративные элементы фона */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Основной градиентный круг */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100/40 via-purple-200/30 to-transparent rounded-full blur-3xl transform translate-x-12 -translate-y-6"></div>

                {/* Маленькие декоративные круги */}
                <div className="absolute top-8 left-8 w-4 h-4 bg-gradient-to-br from-purple-200/60 to-purple-300/40 rounded-full blur-sm animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute bottom-12 right-12 w-6 h-6 bg-gradient-to-br from-purple-200/50 to-purple-300/30 rounded-full blur-md animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-gradient-to-br from-purple-200/70 to-purple-300/50 rounded-full blur-sm animate-pulse" style={{animationDelay: '0.5s'}}></div>

                {/* Геометрические элементы */}
                <div className="absolute top-4 left-4 w-1 h-1 bg-purple-300/60 rotate-45 animate-bounce" style={{animationDelay: '3s'}}></div>
                <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-purple-300/50 rotate-12 animate-bounce" style={{animationDelay: '1.5s'}}></div>
                <div className="absolute top-1/4 right-1/3 w-0.5 h-0.5 bg-purple-300/70 rounded-full animate-ping" style={{animationDelay: '4s'}}></div>

                {/* Тонкие линии */}
                <div className="absolute top-12 left-0 w-px h-8 bg-gradient-to-b from-transparent via-purple-200/40 to-transparent"></div>
                <div className="absolute bottom-8 right-0 w-px h-6 bg-gradient-to-b from-transparent via-purple-200/40 to-transparent"></div>

                {/* Плавающие иконки */}
                <div className="absolute top-6 right-6 w-3 h-3 opacity-20 animate-float" style={{animationDelay: '0s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div className="absolute bottom-6 left-6 w-2 h-2 opacity-15 animate-float" style={{animationDelay: '2s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="absolute top-1/3 left-4 w-2 h-2 opacity-25 animate-float" style={{animationDelay: '1s'}}>
                  <svg className="w-full h-full text-[#6334E5]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>

              <div className="relative z-10 text-center max-w-3xl mx-auto">
                {/* Заголовок */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                  Масштабируйте бизнес с{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    ReplyX
                  </span>
                </h3>

                {/* Описание */}
                <p className="text-base text-gray-600 mb-4 leading-relaxed">
                  От малого бизнеса до корпораций — автоматизируйте поддержку и фокусируйтесь на росте
                </p>

                {/* CTA кнопка */}
                <div className="flex justify-center mb-4">
                  <button className="px-6 py-3 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-12 relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-base">
                    <span className="absolute inset-0 z-0 animate-wave-gradient bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-400" />
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Начать бесплатно
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>

                {/* Социальное доказательство */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col items-center justify-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">500+ компаний</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">4.9/5 рейтинг</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">14 дней бесплатно</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
