import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiMessageSquare, FiGlobe, FiZap, FiTrendingUp, FiUsers, FiShield,
  FiClock, FiBarChart, FiCheckCircle, FiStar, FiArrowRight, FiPlay,
  FiUser, FiMail, FiPhone, FiHome, FiGift, FiDollarSign, FiSettings,
  FiHeart, FiTarget, FiActivity, FiDatabase, FiCloud, FiLock,
  FiAlertCircle, FiChevronDown, FiCheck, FiX
} from 'react-icons/fi';
import {
  HeroSection,
  ProblemSection,
  BenchmarksSection,
  SetupStepsSection,
  CaseStudiesSection,
  PricingBlockSection,
  TestimonialsSection,
  FAQSection
} from '@/components/landing';
import landingStyles from '../styles/pages/Landing.module.css';

function LandingHeader() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Десктопная версия хедера */}
      <header className={`hidden lg:block ${landingStyles.header}`}>
        <div className={landingStyles.headerContainer}>
          <Link href="/" className={landingStyles.logo}>
            <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
          </Link>

          <nav className={landingStyles.nav}>
            <a href="#features" className={landingStyles.navLink}>Возможности</a>
            <a href="#solutions" className={landingStyles.navLink}>Решения</a>
            <a href="#pricing" className={landingStyles.navLink}>Тарифы</a>
            <Link href="/blog" className={landingStyles.navLink} style={{display: 'none'}}>Блог</Link>
          </nav>

          <div className={landingStyles.headerActions}>
            <button
              className={landingStyles.loginButton}
              onClick={() => router.push('/login')}
            >
              Войти
            </button>
            <button
              className="px-6 py-2.5 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 h-11"
              onClick={() => router.push('/register')}
              style={{backgroundColor: '#6334E5'}}
            >
              Зарегистрироваться
            </button>
          </div>
        </div>
      </header>

      {/* Мобильная версия хедера */}
      <header className={`block lg:hidden ${landingStyles.header}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Логотип */}
            <Link href="/" className={landingStyles.logo}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '120px', height: '60px'}} />
            </Link>

            {/* Мобильное меню */}
            <div className="flex items-center gap-3">
              {/* Гамбургер меню */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="Меню"
              >
                <div className="w-5 h-5 flex flex-col justify-center items-center">
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`}></span>
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`block w-4 h-0.5 bg-gray-600 transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное выдвигающееся меню */}
        <div className={`lg:hidden fixed right-0 top-0 z-[200] w-[80vw] h-screen transform transition-all duration-500 ease-out ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          {/* Фон с blur эффектом */}
          <div
            className="absolute inset-0 w-full h-full backdrop-blur-md bg-gradient-to-br from-[#4c1d95]/20 via-blue-900/15 to-indigo-900/20"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Декоративные элементы фона */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#6334E5]/50/10 to-transparent rounded-full blur-xl animate-pulse" style={{animationDuration: '4s'}}></div>
            <div className="absolute bottom-40 right-20 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-lg animate-pulse" style={{animationDuration: '6s', animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-indigo-400/10 to-transparent rounded-full blur-md animate-pulse" style={{animationDuration: '5s', animationDelay: '2s'}}></div>
          </div>

          {/* Полноэкранное меню */}
          <div className="absolute inset-0 w-full h-full bg-white backdrop-blur-xl">
            <div className="relative w-full h-full bg-white">
              {/* Градиентный overlay */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white/60 via-[#6334E5]/10/30 to-blue-50/30"></div>

              <div className="relative p-6 h-full flex flex-col">
                {/* Заголовок меню */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-[#6334E5] to-blue-600 bg-clip-text text-transparent">
                      Меню
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Навигация по сайту</p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-3 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all duration-300 group border border-transparent hover:border-red-200"
                    aria-label="Закрыть меню"
                  >
                    <svg className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Навигационные ссылки */}
                <nav className="space-y-4 mb-8 flex-1">
                  <a
                    href="#features"
                    className="group flex items-center px-6 py-5 text-gray-700 hover:text-white rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-[#6334E5] hover:to-blue-600 hover:shadow-xl hover:shadow-[#6334E5]/30 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6334E5]/20 to-blue-500/20 group-hover:from-white/30 group-hover:to-white/20 flex items-center justify-center mr-5 transition-all duration-300 group-hover:scale-110">
                      <svg className="w-6 h-6 text-[#6334E5] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-lg">Возможности</span>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 mt-1">Функционал платформы</p>
                    </div>
                  </a>
                  <a
                    href="#solutions"
                    className="group flex items-center px-6 py-5 text-gray-700 hover:text-white rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 group-hover:from-white/30 group-hover:to-white/20 flex items-center justify-center mr-5 transition-all duration-300 group-hover:scale-110">
                      <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-lg">Решения</span>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 mt-1">Интеграции и API</p>
                    </div>
                  </a>
                  <a
                    href="#pricing"
                    className="group flex items-center px-6 py-5 text-gray-700 hover:text-white rounded-2xl transition-all duration-300 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 group-hover:from-white/30 group-hover:to-white/20 flex items-center justify-center mr-5 transition-all duration-300 group-hover:scale-110">
                      <svg className="w-6 h-6 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-lg">Тарифы</span>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 mt-1">Цены и планы</p>
                    </div>
                  </a>
                </nav>

                {/* Кнопки действий */}
                <div className="space-y-4 mt-auto">
                  <button
                    className="w-full px-6 py-4 text-[#6334E5] border-2 border-[#6334E5]/30 font-semibold rounded-2xl hover:bg-[#6334E5] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#6334E5]/25 hover:scale-[1.02] active:scale-[0.98] bg-white/80 backdrop-blur-sm text-lg"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push('/login');
                    }}
                  >
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Войти в аккаунт
                    </span>
                  </button>
                  <button
                    className="w-full px-6 py-4 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-[#6334E5]/40 relative overflow-hidden group bg-gradient-to-r from-[#6334E5] to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-lg"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push('/register');
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center justify-center gap-3 z-10">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Начать работу
                    </span>
                  </button>
                </div>

                {/* Нижний декоративный элемент */}
                <div className="mt-6 pt-4 border-t border-gray-200/50">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-1 bg-gradient-to-r from-[#6334E5]/50 to-blue-400 rounded-full opacity-30"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}















function LandingFooter() {
  const router = useRouter();

  return (
    <footer className={landingStyles.whiteFooter}>
      {/* Десктопная версия */}
      <div className="hidden lg:block">
        <div className={landingStyles.whiteFooterContent}>
          <div className={landingStyles.whiteFooterLeft}>
            <Link href="/" className={landingStyles.whiteFooterBrand}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
            </Link>
            <p className={landingStyles.whiteFooterSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>

            {/* Виджеты социальных сетей */}
            <div className={landingStyles.footerWidgets}>
              <a href="#" className={landingStyles.footerWidget} title="TenChat">
                <svg width="24" height="22" viewBox="0 0 53 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.4095 2.25481C20.6737 -0.751604 32.5281 -0.751604 43.7923 2.25481C47.5736 3.2638 50.4615 6.36222 51.2122 10.2152C52.5422 17.0432 52.5422 24.066 51.2122 30.8941C50.4617 34.747 47.5737 37.8454 43.7923 38.8554C43.5067 38.9317 43.2205 39.0061 42.9339 39.0785C42.3669 39.2214 41.9664 39.7372 41.9664 40.3244V48.4863C41.9664 48.686 41.8504 48.868 41.6699 48.9522C41.4895 49.0363 41.2758 49.0079 41.1239 48.8788L32.8282 41.8501C32.129 41.258 31.2296 40.9556 30.316 41.0065C23.2777 41.3999 16.2217 40.6737 9.4095 38.8554C5.62808 37.8454 2.74012 34.747 1.98965 30.8941C0.659699 24.066 0.659699 17.0432 1.98965 10.2152C2.74032 6.36222 5.62827 3.2638 9.4095 2.25481ZM31.2107 30.8324C31.4917 30.8324 31.7229 30.6005 31.7229 30.3186V20.5546H41.4542C41.7352 20.5546 41.9664 20.3227 41.9664 20.0408V10.7906C41.9664 10.5088 41.7352 10.2768 41.4542 10.2768H11.7481C11.4671 10.2768 11.2359 10.5088 11.2359 10.7906V20.0408C11.2359 20.3227 11.4671 20.5546 11.7481 20.5546H21.4795V30.3186C21.4795 30.6005 21.7106 30.8324 21.9915 30.8324H31.2107Z" fill="#FC3234"/>
                  <rect width="31.8985" height="31.8985" transform="translate(10.7031 4.68359)" fill="#FC3234"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
                </svg>
                <span>TenChat</span>
              </a>
              <a href="#" className={landingStyles.footerWidget} title="Telegram">
                <svg width="24" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
                  <g>
                    <path d="M128,0 C57.307,0 0,57.307 0,128 L0,128 C0,198.693 57.307,256 128,256 L128,256 C198.693,256 256,198.693 256,128 L256,128 C256,57.307 198.693,0 128,0 L128,0 Z" fill="#40B3E0"></path>
                    <path d="M190.2826,73.6308 L167.4206,188.8978 C167.4206,188.8978 164.2236,196.8918 155.4306,193.0548 L102.6726,152.6068 L83.4886,143.3348 L51.1946,132.4628 C51.1946,132.4628 46.2386,130.7048 45.7586,126.8678 C45.2796,123.0308 51.3546,120.9528 51.3546,120.9528 L179.7306,70.5928 C179.7306,70.5928 190.2826,65.9568 190.2826,73.6308" fill="#FFFFFF"></path>
                    <path d="M98.6178,187.6035 C98.6178,187.6035 97.0778,187.4595 95.1588,181.3835 C93.2408,175.3085 83.4888,143.3345 83.4888,143.3345 L161.0258,94.0945 C161.0258,94.0945 165.5028,91.3765 165.3428,94.0945 C165.3428,94.0945 166.1418,94.5735 163.7438,96.8115 C161.3458,99.0505 102.8328,151.6475 102.8328,151.6475" fill="#D2E5F1"></path>
                    <path d="M122.9015,168.1154 L102.0335,187.1414 C102.0335,187.1414 100.4025,188.3794 98.6175,187.6034 L102.6135,152.2624" fill="#B5CFE4"></path>
                  </g>
                </svg>
                <span>Telegram</span>
              </a>
            </div>
          </div>

          <div className={landingStyles.whiteFooterRight}>
            <div className={landingStyles.whiteFooterLinks}>
              {/* Колонка 1: Продукт */}
              <div className={landingStyles.footerColumn}>
                <button
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Продукт
                </button>
                <a href="#features" className={landingStyles.whiteFooterLink}>
                  Возможности
                </a>
                <a href="#solutions" className={landingStyles.whiteFooterLink}>
                  Решения
                </a>
                <a href="#pricing" className={landingStyles.whiteFooterLink}>
                  Тарифы
                </a>
              </div>

              {/* Колонка 2: Компания */}
              <div className={landingStyles.footerColumn}>
                <button
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Компания
                </button>
                <Link href="/blog" className={landingStyles.whiteFooterLink} style={{display: 'none'}}>
                  Блог
                </Link>
                <button className={landingStyles.whiteFooterLink}>
                  О нас
                </button>
                <button className={landingStyles.whiteFooterLink}>
                  Контакты
                </button>
                <a href="mailto:support@replyx.ru" className={landingStyles.whiteFooterLink}>
                  Поддержка
                </a>
              </div>

              {/* Колонка 4: Правовая информация */}
              <div className={landingStyles.footerColumn}>
                <button
                  onClick={() => router.push('/legal')}
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    color: '#6334E5',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  Правовая информация
                </button>
              </div>
            </div>
            <div className={landingStyles.whiteFooterCopyright}>
              © 2025 ReplyX
            </div>
          </div>
        </div>
      </div>

      {/* Мобильная версия */}
      <div className="block lg:hidden px-4 sm:px-6 lg:px-8">
        <div className={landingStyles.whiteFooterContent}>
          {/* Логотип и слоган */}
          <div className="text-center mb-6">
            <Link href="/" className={landingStyles.whiteFooterBrand}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
            </Link>
            <p className={landingStyles.whiteFooterSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>
          </div>

          {/* Виджеты социальных сетей */}
          <div className="flex justify-center gap-4 mb-8">
            <a href="#" className={landingStyles.footerWidget} title="TenChat">
              <svg width="20" height="18" viewBox="0 0 53 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.4095 2.25481C20.6737 -0.751604 32.5281 -0.751604 43.7923 2.25481C47.5736 3.2638 50.4615 6.36222 51.2122 10.2152C52.5422 17.0432 52.5422 24.066 51.2122 30.8941C50.4617 34.747 47.5737 37.8454 43.7923 38.8554C43.5067 38.9317 43.2205 39.0061 42.9339 39.0785C42.3669 39.2214 41.9664 39.7372 41.9664 40.3244V48.4863C41.9664 48.686 41.8504 48.868 41.6699 48.9522C41.4895 49.0363 41.2758 49.0079 41.1239 48.8788L32.8282 41.8501C32.129 41.258 31.2296 40.9556 30.316 41.0065C23.2777 41.3999 16.2217 40.6737 9.4095 38.8554C5.62808 37.8454 2.74012 34.747 1.98965 30.8941C0.659699 24.066 0.659699 17.0432 1.98965 10.2152C2.74032 6.36222 5.62827 3.2638 9.4095 2.25481ZM31.2107 30.8324C31.4917 30.8324 31.7229 30.6005 31.7229 30.3186V20.5546H41.4542C41.7352 20.5546 41.9664 20.3227 41.9664 20.0408V10.7906C41.9664 10.5088 41.7352 10.2768 41.4542 10.2768H11.7481C11.4671 10.2768 11.2359 10.5088 11.2359 10.7906V20.0408C11.2359 20.3227 11.4671 20.5546 11.7481 20.5546H21.4795V30.3186C21.4795 30.6005 21.7106 30.8324 21.9915 30.8324H31.2107Z" fill="#FC3234"/>
                <rect width="31.8985" height="31.8985" transform="translate(10.7031 4.68359)" fill="#FC3234"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
              </svg>
              <span>TenChat</span>
            </a>
            <a href="#" className={landingStyles.footerWidget} title="Telegram">
              <svg width="20" height="20" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
                <g>
                  <path d="M128,0 C57.307,0 0,57.307 0,128 L0,128 C0,198.693 57.307,256 128,256 L128,256 C198.693,256 256,198.693 256,128 L256,128 C256,57.307 198.693,0 128,0 L128,0 Z" fill="#40B3E0"></path>
                  <path d="M190.2826,73.6308 L167.4206,188.8978 C167.4206,188.8978 164.2236,196.8918 155.4306,193.0548 L102.6726,152.6068 L83.4886,143.3348 L51.1946,132.4628 C51.1946,132.4628 46.2386,130.7048 45.7586,126.8678 C45.2796,123.0308 51.3546,120.9528 51.3546,120.9528 L179.7306,70.5928 C179.7306,70.5928 190.2826,65.9568 190.2826,73.6308" fill="#FFFFFF"></path>
                  <path d="M98.6178,187.6035 C98.6178,187.6035 97.0778,187.4595 95.1588,181.3835 C93.2408,175.3085 83.4888,143.3345 83.4888,143.3345 L161.0258,94.0945 C161.0258,94.0945 165.5028,91.3765 165.3428,94.0945 C165.3428,94.0945 166.1418,94.5735 163.7438,96.8115 C161.3458,99.0505 102.8328,151.6475 102.8328,151.6475" fill="#D2E5F1"></path>
                  <path d="M122.9015,168.1154 L102.0335,187.1414 C102.0335,187.1414 100.4025,188.3794 98.6175,187.6034 L102.6135,152.2624" fill="#B5CFE4"></path>
                </g>
              </svg>
              <span>Telegram</span>
            </a>
          </div>

          {/* Ссылки в два ряда */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Колонка 1: Продукт */}
            <div className={landingStyles.footerColumn}>
              <button
                className={landingStyles.footerColumnTitle}
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'inherit',
                  fontWeight: 'bold',
                  color: '#6334E5',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                Продукт
              </button>
              <a href="#features" className={landingStyles.whiteFooterLink}>
                Возможности
              </a>
              <a href="#solutions" className={landingStyles.whiteFooterLink}>
                Решения
              </a>
              <a href="#pricing" className={landingStyles.whiteFooterLink}>
                Тарифы
              </a>
            </div>

            {/* Колонка 2: Компания */}
            <div className={landingStyles.footerColumn}>
              <button
                className={landingStyles.footerColumnTitle}
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'inherit',
                  fontWeight: 'bold',
                  color: '#6334E5',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                Компания
              </button>
              <Link href="/blog" className={landingStyles.whiteFooterLink} style={{display: 'none'}}>
                Блог
              </Link>
              <button className={landingStyles.whiteFooterLink}>
                О нас
              </button>
              <button className={landingStyles.whiteFooterLink}>
                Контакты
              </button>
              <a href="mailto:support@replyx.ru" className={landingStyles.whiteFooterLink}>
                Поддержка
              </a>
            </div>

            {/* Колонка 3: Правовая информация */}
            <div className={`${landingStyles.footerColumn} col-span-2`}>
              <button
                onClick={() => router.push('/legal')}
                className={landingStyles.footerColumnTitle}
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'inherit',
                  fontWeight: 'bold',
                  color: '#6334E5',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                Правовая информация
              </button>
              <div className="flex flex-col gap-2">
                <button onClick={() => router.push('/legal/privacy')} className={landingStyles.whiteFooterLink}>
                  Конфиденциальность
                </button>
                <button onClick={() => router.push('/legal/terms')} className={landingStyles.whiteFooterLink}>
                  Условия использования
                </button>
                <button onClick={() => router.push('/legal/offer')} className={landingStyles.whiteFooterLink}>
                  Публичная оферта
                </button>
              </div>
            </div>
          </div>

          {/* Копирайт */}
          <div className={landingStyles.whiteFooterCopyright}>
            © 2025 ReplyX
          </div>
        </div>
      </div>
    </footer>
  );
}



export default function Landing() {
  return (
    <div className={landingStyles.landingPage}>
      <Head>
        <title>AI-ассистент ReplyX — автоматизация поддержки клиентов 24/7</title>
        <meta name="description" content="ReplyX — универсальный AI-ассистент для бизнеса. Автоматизация поддержки клиентов, интеграция с CRM, 1С, Telegram и мессенджерами. Запуск за 15 минут, без программистов." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Manrope Font для виджета */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <BenchmarksSection />
      <SetupStepsSection />
      <CaseStudiesSection />
      <PricingBlockSection />
      <TestimonialsSection />
      <FAQSection />
      <LandingFooter />
    </div>
  );
}