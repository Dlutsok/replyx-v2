'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import Button from '../common/Button';

// Профессиональные иконки
const LightningIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const CPUIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M16.5 3v1.5M3 8.25h1.5m15 0H21M3 16.5h1.5m15 0H21M8.25 21v-1.5M16.5 21v-1.5M6.75 6.75h10.5v10.5H6.75V6.75z" />
  </svg>
);

const TrendingUpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Иконки отраслей
const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993z" />
  </svg>
);

const HeartIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const BanknotesIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
);

const AcademicCapIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);

const CogIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
  </svg>
);

const TruckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125A1.125 1.125 0 0021 16.875v-6.75a1.125 1.125 0 00-1.125-1.125H12.75a.75.75 0 00-.75.75v12m0-12V9a1.125 1.125 0 00-1.125-1.125H9m0 0V5.625a1.125 1.125 0 011.125-1.125h1.5a1.125 1.125 0 011.125 1.125V7.5M9 7.5h3m-3 0a1.125 1.125 0 01-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125V6.375A1.125 1.125 0 0110.5 7.5H9z" />
  </svg>
);

const HomeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const BuildingOfficeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l-.75 18H5.25L4.5 3zM9 9h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" />
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

// Компонент карусели отраслей
const IndustryCarousel = () => {
  const industries = [
    { icon: ShoppingBagIcon, name: 'Ритейл', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: HeartIcon, name: 'Медицина', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
    { icon: BanknotesIcon, name: 'Финансы', bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: AcademicCapIcon, name: 'Образование', bgColor: 'bg-purple-50', iconColor: 'text-[#6334E5]' },
    { icon: CogIcon, name: 'Производство', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
    { icon: TruckIcon, name: 'Логистика', bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { icon: HomeIcon, name: 'Недвижимость', bgColor: 'bg-teal-50', iconColor: 'text-teal-600' },
    { icon: BuildingOfficeIcon, name: 'B2B сервисы', bgColor: 'bg-white border border-gray-200', iconColor: 'text-gray-600' },
    { icon: PhoneIcon, name: 'Телеком', bgColor: 'bg-pink-50', iconColor: 'text-pink-600' },
    { icon: ShoppingBagIcon, name: 'E-commerce', bgColor: 'bg-cyan-50', iconColor: 'text-cyan-600' }
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="flex animate-scroll-left">
        {/* Первый набор */}
        {industries.map((industry, index) => (
          <div
            key={`first-${index}`}
            className="flex items-center gap-3 mx-4 flex-shrink-0 group cursor-pointer"
          >
            <div className={`${DESIGN_TOKENS.icons.xl} ${industry.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <industry.icon className={`${DESIGN_TOKENS.icons.small} ${industry.iconColor}`} />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-300 whitespace-nowrap">
              {industry.name}
            </span>
          </div>
        ))}
        {/* Дублированный набор для бесконечной прокрутки */}
        {industries.map((industry, index) => (
          <div
            key={`second-${index}`}
            className="flex items-center gap-3 mx-4 flex-shrink-0 group cursor-pointer"
          >
            <div className={`${DESIGN_TOKENS.icons.xl} ${industry.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <industry.icon className={`${DESIGN_TOKENS.icons.small} ${industry.iconColor}`} />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-300 whitespace-nowrap">
              {industry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeroContent = () => {
  const router = useRouter();

  const handleStartCTA = () => {
    router.push('/register');
  };

  return (
    <div className="space-y-8">
      {/* Новый профессиональный заголовок */}
      <motion.h1 
        className={`${DESIGN_TOKENS.typography.h1} text-left text-3xl sm:text-4xl md:text-5xl`}
        {...DESIGN_TOKENS.animation.withDelay(0.1)}
      >
        Автоматизируйте общение <br/>с клиентами через <span style={{
          background: 'linear-gradient(269deg, rgb(99, 52, 229) 28.67%, rgb(117, 197, 237) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}><br/>AI-ассистента</span>
      </motion.h1>

      {/* Подзаголовок */}
      <motion.p
        className={DESIGN_TOKENS.typography.sectionSubtitle + ' max-w-3xl text-left'}
        style={{marginTop: '0.75rem'}}
        {...DESIGN_TOKENS.animation.withDelay(0.2)}
      >
      Виджет на сайт за 5 минут без программистов
      </motion.p>

      {/* Бейджи с ключевыми метриками */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2"
        {...DESIGN_TOKENS.animation.withDelay(0.25)}
      >
        {[
          { icon: LightningIcon, label: '2,7 секунды', sub: 'время ответа' },
          { icon: CPUIcon, label: '98.7%', sub: 'точность ответов' },
          { icon: AcademicCapIcon, label: '100%', sub: 'знает вашу компанию' },
          { icon: ClockIcon, label: '24/7', sub: 'без выходных' }
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
            <b.icon className={`${DESIGN_TOKENS.icons.medium} ${DESIGN_TOKENS.colors.primary}`} />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{b.label}</span>
              <span className="text-sm text-gray-600">{b.sub}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* CTA и доверие */}
      <motion.div 
        className="pt-4"
        {...DESIGN_TOKENS.animation.withDelay(0.3)}
      >
        <Button className="w-full sm:w-auto" onClick={handleStartCTA} variant="primary" size="default">
          Создать AI-ассистента
        </Button>

        {/* Зеленая надпись под кнопкой */}
        <p className="text-left text-green-500 text-xs font-normal mt-4">
          Первые 100 сообщений бесплатно
        </p>
      </motion.div>

    </div>
  );
};

export default HeroContent;