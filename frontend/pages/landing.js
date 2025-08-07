import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  FiMessageSquare, FiGlobe, FiZap, FiTrendingUp, FiUsers, FiShield,
  FiClock, FiBarChart, FiCheckCircle, FiStar, FiArrowRight, FiPlay,
  FiUser, FiMail, FiPhone, FiHome, FiGift, FiDollarSign, FiSettings,
  FiHeart, FiTarget, FiActivity, FiDatabase, FiCloud, FiLock,
  FiAlertCircle, FiChevronDown, FiCheck, FiX
} from 'react-icons/fi';
import HeroSection from '../components/landing/HeroSection';
import ProblemSection from '../components/landing/ProblemSection';
import IndustrySection from '../components/landing/IndustrySection';
import TechSection from '../components/landing/TechSection';
import PricingSection from '../components/landing/PricingSection';
import landingStyles from '../styles/pages/Landing.module.css';

function LandingHeader() {
  const router = useRouter();

  return (
    <header className={landingStyles.header}>
      <div className={landingStyles.headerContainer}>
        <div className={landingStyles.logo}>
          <div className={landingStyles.logoIcon}>
            <FiMessageSquare size={28} />
          </div>
          <span className={landingStyles.logoText}>ChatAI</span>
        </div>
        
        <nav className={landingStyles.nav}>
          <a href="#features" className={landingStyles.navLink}>Возможности</a>
          <a href="#solutions" className={landingStyles.navLink}>Решения</a>
          <a href="#pricing" className={landingStyles.navLink}>Тарифы</a>
        </nav>
        
        <div className={landingStyles.headerActions}>
          <button 
            className={landingStyles.loginButton}
            onClick={() => router.push('/login')}
          >
            Войти
          </button>
          <button 
            className={landingStyles.ctaButton}
            onClick={() => router.push('/register')}
          >
            Начать бесплатно
          </button>
        </div>
      </div>
    </header>
  );
}













function CTASection() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 12 });

  // Имитация таймера для создания срочности
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className={landingStyles.ctaSection}>
      <div className={landingStyles.sectionContainer}>
        <div className={landingStyles.ctaContent}>
          <div className={landingStyles.ctaLeft}>
            <div className={landingStyles.ctaHeader}>
              <div className={landingStyles.ctaUrgencyBadge}>
                <FiGift size={14} />
                <span>Эксклюзивное предложение</span>
              </div>
              <div className={landingStyles.ctaCountdown}>
                <FiClock size={12} />
                <span>{String(timeLeft.hours).padStart(2, '0')}ч {String(timeLeft.minutes).padStart(2, '0')}м</span>
              </div>
            </div>

            <h2 className={landingStyles.ctaTitle}>
              <span className={landingStyles.highlight}>Месяц AI-автоматизации</span> абсолютно бесплатно
            </h2>
            
            <p className={landingStyles.ctaSubtitle}>
              Запустите умного ассистента за 5 минут и начните экономить до ₽180,000 в месяц на операторах. 
              <strong>Никаких обязательств. Полный функционал.</strong>
            </p>

            <div className={landingStyles.ctaValueProps}>
              <div className={landingStyles.valueProp}>
                <FiTrendingUp size={16} />
                <span><strong>Экономия до ₽180,000/мес</strong> на операторах</span>
              </div>
              <div className={landingStyles.valueProp}>
                <FiUsers size={16} />
                <span><strong>95% автоматизация</strong> типовых запросов</span>
              </div>
              <div className={landingStyles.valueProp}>
                <FiShield size={16} />
                <span><strong>Российские серверы</strong> — полное соответствие 152-ФЗ</span>
              </div>
            </div>
          </div>

          <div className={landingStyles.ctaRight}>
            <div className={landingStyles.ctaActions}>
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                onClick={() => router.push('/register')}
              >
                <FiZap size={18} />
                <strong>Запустить AI бесплатно</strong>
              </button>
              
              <button 
                className="bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-600 hover:text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-md flex items-center gap-2"
                onClick={() => router.push('/login')}
              >
                <FiPlay size={14} />
                Смотреть живое демо
              </button>
              
              <div className={landingStyles.ctaSubText}>Полный доступ на 30 дней</div>
            </div>

            <div className={landingStyles.ctaGuarantees}>
              <div className={landingStyles.guarantee}>
                <FiCheck size={16} />
                <span>Без обязательств</span>
              </div>
              <div className={landingStyles.guarantee}>
                <FiCheck size={16} />
                <span>Поддержка 24/7</span>
              </div>
              <div className={landingStyles.guarantee}>
                <FiCheck size={16} />
                <span>30 дней гарантии</span>
              </div>
            </div>
            
            <div className={landingStyles.socialProof}>
              <div className={landingStyles.socialStat}>
                <FiUsers size={14} />
                <span>1,200+ компаний</span>
              </div>
              <div className={landingStyles.socialStat}>
                <FiStar size={14} />
                <span>4.9/5 рейтинг</span>
              </div>
              <div className={landingStyles.socialStat}>
                <FiTrendingUp size={14} />
                <span>₽150 млн сэкономлено</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className={landingStyles.footer}>
      <div className={landingStyles.footerContainer}>
        <div className={landingStyles.footerContent}>
          <div className={landingStyles.footerBrand}>
            <div className={landingStyles.footerLogo}>
              <FiMessageSquare size={24} />
              <span>ChatAI</span>
            </div>
            <p className={landingStyles.footerDescription}>
              AI-ассистент для автоматизации клиентского сервиса российского бизнеса
            </p>
          </div>
          
          <div className={landingStyles.footerLinks}>
            <div className={landingStyles.linkGroup}>
              <h4>Продукт</h4>
              <a href="#features">Возможности</a>
              <a href="#solutions">Решения</a>
              <a href="#pricing">Тарифы</a>
            </div>
            <div className={landingStyles.linkGroup}>
              <h4>Поддержка</h4>
              <a href="/login">Войти</a>
              <a href="/register">Регистрация</a>
              <a href="mailto:support@chatai.ru">Поддержка</a>
            </div>
            <div className={landingStyles.linkGroup}>
              <h4>Компания</h4>
              <a href="mailto:info@chatai.ru">О нас</a>
              <a href="mailto:contact@chatai.ru">Контакты</a>
              <a href="/privacy">Конфиденциальность</a>
            </div>
          </div>
        </div>
        
        <div className={landingStyles.footerBottom}>
          <p>&copy; 2024 ChatAI. Все права защищены.</p>
          <div className={landingStyles.footerBottomLinks}>
            <a href="/terms">Условия использования</a>
            <a href="/privacy">Политика конфиденциальности</a>
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
        <title>ChatAI - AI-ассистент для автоматизации клиентского сервиса</title>
        <meta name="description" content="Современный AI-ассистент для российского бизнеса. Автоматизируйте до 95% обращений клиентов с помощью GPT-3.5 Turbo." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <IndustrySection />
      <TechSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}