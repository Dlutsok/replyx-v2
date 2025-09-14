import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import landingStyles from '../styles/pages/Landing.module.css';

export default function LandingHeader() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Проверяем, находимся ли на главной странице
  const isHomePage = router.pathname === '/';

  // Функция для обработки клика по якорным ссылкам
  const handleAnchorClick = (anchor) => {
    if (isHomePage) {
      // Если на главной странице, просто скроллим к секции
      const element = document.querySelector(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Если не на главной странице, переходим на главную с якорем
      router.push(`/${anchor}`);
    }
  };

  return (
    <>
      {/* Десктопная версия хедера */}
      <header className={`hidden lg:block ${landingStyles.header}`}>
        <div className={landingStyles.headerContainer}>
          <Link href="/" className={landingStyles.logo}>
            <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
          </Link>

          <nav className={landingStyles.nav}>
            <button
              onClick={() => handleAnchorClick('#features')}
              className={landingStyles.navLink}
              style={{background: 'none', border: 'none', cursor: 'pointer'}}
            >
              Возможности
            </button>
            <button
              onClick={() => handleAnchorClick('#pricing')}
              className={landingStyles.navLink}
              style={{background: 'none', border: 'none', cursor: 'pointer'}}
            >
              Цена
            </button>
            <button
              onClick={() => handleAnchorClick('#testimonials')}
              className={landingStyles.navLink}
              style={{background: 'none', border: 'none', cursor: 'pointer'}}
            >
              Отзывы
            </button>
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
        <div className={`lg:hidden fixed right-0 top-0 z-[200] w-[80vw] h-screen transform transition-all duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          {/* Фон оверлея */}
          <div
            className="absolute inset-0 w-full h-full bg-black/20"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Простое меню */}
          <div className="absolute inset-0 w-full h-full bg-white shadow-xl">
            <div className="p-6 h-full flex flex-col">
              {/* Заголовок меню */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-[#6334E5]">Меню</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Закрыть меню"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Навигационные ссылки */}
              <nav className="space-y-3 mb-8 flex-1">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleAnchorClick('#features');
                  }}
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                  style={{background: 'none', border: 'none'}}
                >
                  <span className="font-medium text-lg">Возможности</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleAnchorClick('#pricing');
                  }}
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                  style={{background: 'none', border: 'none'}}
                >
                  <span className="font-medium text-lg">Цена</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleAnchorClick('#testimonials');
                  }}
                  className="flex items-center px-4 py-3 text-gray-700 hover:text-[#6334E5] hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                  style={{background: 'none', border: 'none'}}
                >
                  <span className="font-medium text-lg">Отзывы</span>
                </button>
              </nav>

              {/* Кнопки действий */}
              <div className="space-y-3 mt-auto">
                <button
                  className="w-full px-6 py-3 text-[#6334E5] border border-[#6334E5] font-medium rounded-lg hover:bg-[#6334E5] hover:text-white transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push('/login');
                  }}
                >
                  Войти
                </button>
                <button
                  className="w-full px-6 py-3 bg-[#6334E5] text-white font-medium rounded-lg hover:bg-[#5429c7] transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push('/register');
                  }}
                >
                  Зарегистрироваться
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}