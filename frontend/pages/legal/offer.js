import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import LandingHeader from '../../components/LandingHeader';
import landingStyles from '../../styles/pages/Landing.module.css';

// Футер с лендинга
function OfferFooter() {
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
              <a href="https://tenchat.ru/2710161" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="TenChat">
                <svg width="24" height="22" viewBox="0 0 53 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.4095 2.25481C20.6737 -0.751604 32.5281 -0.751604 43.7923 2.25481C47.5736 3.2638 50.4615 6.36222 51.2122 10.2152C52.5422 17.0432 52.5422 24.066 51.2122 30.8941C50.4617 34.747 47.5737 37.8454 43.7923 38.8554C43.5067 38.9317 43.2205 39.0061 42.9339 39.0785C42.3669 39.2214 41.9664 39.7372 41.9664 40.3244V48.4863C41.9664 48.686 41.8504 48.868 41.6699 48.9522C41.4895 49.0363 41.2758 49.0079 41.1239 48.8788L32.8282 41.8501C32.129 41.258 31.2296 40.9556 30.316 41.0065C23.2777 41.3999 16.2217 40.6737 9.4095 38.8554C5.62808 37.8454 2.74012 34.747 1.98965 30.8941C0.659699 24.066 0.659699 17.0432 1.98965 10.2152C2.74032 6.36222 5.62827 3.2638 9.4095 2.25481ZM31.2107 30.8324C31.4917 30.8324 31.7229 30.6005 31.7229 30.3186V20.5546H41.4542C41.7352 20.5546 41.9664 20.3227 41.9664 20.0408V10.7906C41.9664 10.5088 41.7352 10.2768 41.4542 10.2768H11.7481C11.4671 10.2768 11.2359 10.5088 11.2359 10.7906V20.0408C11.2359 20.3227 11.4671 20.5546 11.7481 20.5546H21.4795V30.3186C21.4795 30.6005 21.7106 30.8324 21.9915 30.8324H31.2107Z" fill="#FC3234"/>
                  <rect width="31.8985" height="31.8985" transform="translate(10.7031 4.68359)" fill="#FC3234"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
                </svg>
                <span>TenChat</span>
              </a>
              <a href="https://t.me/replyxai" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="Telegram">
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
            <div className="grid grid-cols-3 gap-8">
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
                <a href="#pricing" className={landingStyles.whiteFooterLink}>
                  Цена
                </a>
                <a href="#testimonials" className={landingStyles.whiteFooterLink}>
                  Отзывы
                </a>
              </div>

              {/* Колонка 2: Информация */}
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
                  Информация
                </button>
                <div className="flex flex-col gap-2">
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ИП Луцок Дан
                  </span>
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ОГРНИП 325508100484721
                  </span>
                  <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                    ИНН 330303450398
                  </span>
                </div>
              </div>

              {/* Колонка 3: Связь с нами */}
              <div className={landingStyles.footerColumn}>
                <div
                  className={landingStyles.footerColumnTitle}
                  style={{
                    cursor: 'default',
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
                  Связь с нами
                </div>
                <div className="flex flex-col gap-2">
                  <a href="mailto:info@replyx.ru" className={landingStyles.whiteFooterLink}>
                    Email: info@replyx.ru
                  </a>
                  <a href="tel:+79933349913" className={landingStyles.whiteFooterLink}>
                    Телефон: +7 (993) 334-99-13
                  </a>
                </div>
              </div>
            </div>
            <div className={landingStyles.whiteFooterCopyright} style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '32px'}}>
              <button onClick={() => router.push('/legal')} className={landingStyles.whiteFooterLink}>
                Правовая информация
              </button>
              <span>© 2025 ReplyX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Мобильная версия */}
      <div className="block lg:hidden px-4 sm:px-6 lg:px-8">
        <div className={landingStyles.whiteFooterContent}>
          {/* Логотип и слоган */}
          <div className="mb-6">
            <Link href="/" className={landingStyles.whiteFooterBrand}>
              <img src="/logo.svg" alt="Logo" className={landingStyles.logoIcon} style={{width: '130px', height: '60px'}} />
            </Link>
            <p className={landingStyles.whiteFooterSlogan}>
              Помогаем человечеству <br />
              шагнуть в будущее.
            </p>
          </div>

          {/* Виджеты социальных сетей */}
          <div className="flex justify-start gap-4 mb-8">
            <a href="https://tenchat.ru/2710161" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="TenChat">
              <svg width="20" height="18" viewBox="0 0 53 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.4095 2.25481C20.6737 -0.751604 32.5281 -0.751604 43.7923 2.25481C47.5736 3.2638 50.4615 6.36222 51.2122 10.2152C52.5422 17.0432 52.5422 24.066 51.2122 30.8941C50.4617 34.747 47.5737 37.8454 43.7923 38.8554C43.5067 38.9317 43.2205 39.0061 42.9339 39.0785C42.3669 39.2214 41.9664 39.7372 41.9664 40.3244V48.4863C41.9664 48.686 41.8504 48.868 41.6699 48.9522C41.4895 49.0363 41.2758 49.0079 41.1239 48.8788L32.8282 41.8501C32.129 41.258 31.2296 40.9556 30.316 41.0065C23.2777 41.3999 16.2217 40.6737 9.4095 38.8554C5.62808 37.8454 2.74012 34.747 1.98965 30.8941C0.659699 24.066 0.659699 17.0432 1.98965 10.2152C2.74032 6.36222 5.62827 3.2638 9.4095 2.25481ZM31.2107 30.8324C31.4917 30.8324 31.7229 30.6005 31.7229 30.3186V20.5546H41.4542C41.7352 20.5546 41.9664 20.3227 41.9664 20.0408V10.7906C41.9664 10.5088 41.7352 10.2768 41.4542 10.2768H11.7481C11.4671 10.2768 11.2359 10.5088 11.2359 10.7906V20.0408C11.2359 20.3227 11.4671 20.5546 11.7481 20.5546H21.4795V30.3186C21.4795 30.6005 21.7106 30.8324 21.9915 30.8324H31.2107Z" fill="#FC3234"/>
                <rect width="31.8985" height="31.8985" transform="translate(10.7031 4.68359)" fill="#FC3234"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
              </svg>
              <span>TenChat</span>
            </a>
            <a href="https://t.me/replyxai" target="_blank" rel="noopener noreferrer" className={landingStyles.footerWidget} title="Telegram">
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

          {/* Ссылки в две колонки */}
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
              <a href="#pricing" className={landingStyles.whiteFooterLink}>
                Цена
              </a>
              <a href="#testimonials" className={landingStyles.whiteFooterLink}>
                Отзывы
              </a>
            </div>

            {/* Колонка 2: Информация */}
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
                Информация
              </button>
              <div className="flex flex-col gap-2">
                <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                  ИП Луцок Дан
                </span>
                <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                  ОГРНИП 325508100484721
                </span>
                <span className={landingStyles.whiteFooterLink} style={{cursor: 'default', color: '#6b7280'}}>
                  ИНН 330303450398
                </span>
              </div>
            </div>

            {/* Колонка 3: Связь с нами */}
            <div className={landingStyles.footerColumn}>
              <div
                className={landingStyles.footerColumnTitle}
                style={{
                  cursor: 'default',
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
                Связь с нами
              </div>
              <div className="flex flex-col gap-2">
                <a href="mailto:info@replyx.ru" className={landingStyles.whiteFooterLink}>
                  Email: info@replyx.ru
                </a>
                <a href="tel:+79933349913" className={landingStyles.whiteFooterLink}>
                  Телефон: +7 (993) 334-99-13
                </a>
              </div>
            </div>
          </div>

          {/* Копирайт */}
          <div className={landingStyles.whiteFooterCopyright} style={{display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-start', flexWrap: 'wrap'}}>
            <button onClick={() => router.push('/legal')} className={landingStyles.whiteFooterLink}>
              Правовая информация
            </button>
            <span>© 2025 ReplyX</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LegalOfferPage() {
  const [screenSize, setScreenSize] = useState('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setScreenSize('mobile');
      } else if (width <= 768) {
        setScreenSize('tablet');
      } else if (width <= 1024) {
        setScreenSize('laptop');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isSmallScreen = isMobile || isTablet;

  return (
    <>
      <Head>
        <title>Публичная Оферта - ReplyX</title>
        <meta name="description" content="Публичная оферта сервиса ReplyX. Условия оплаты услуг и правила предоставления доступа к AI-ассистентам." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className={landingStyles.landingPage}>
        <LandingHeader />

        {/* Content */}
        <div style={{
          width: isMobile ? 'calc(100% - 8px)' : isTablet ? 'calc(100% - 16px)' : 'calc(100% - 32px)',
          maxWidth: screenSize === 'desktop' ? '1200px' : screenSize === 'laptop' ? '1000px' : '100%',
          margin: '0 auto',
          padding: isMobile ? '1rem 0' : isTablet ? '1.5rem 0' : '2rem 0'
        }}>
          <div style={{
            background: 'white',
            padding: isMobile ? '1rem' : isTablet ? '1.5rem 1.5rem' : '2rem 3rem',
            borderRadius: isMobile ? '0.5rem' : '0.75rem',
            boxShadow: isMobile ? '0 2px 4px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.07)',
            margin: isMobile ? '0 4px' : '0'
          }}>
            <h1 style={{
              fontSize: isMobile ? '1.5rem' : isTablet ? '1.75rem' : '2rem',
              fontWeight: '700',
              color: '#6334E5',
              textAlign: 'center',
              marginBottom: isMobile ? '1.5rem' : '2rem',
              lineHeight: isMobile ? '1.3' : '1.2'
            }}>
              Публичная Оферта
            </h1>

            <div style={{
              lineHeight: isMobile ? '1.5' : '1.6',
              color: '#374151',
              fontSize: isMobile ? '0.85rem' : '0.9rem'
            }}>

              {/* Заголовок оферты */}
              <div style={{
                marginBottom: isMobile ? '1.5rem' : '2rem',
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}>
                  на оказание услуг по предоставлению доступа к сервису ReplyX
                </p>
                <p style={{
                  fontSize: isMobile ? '0.8rem' : '0.85rem',
                  color: '#64748b'
                }}>
                  Последнее обновление: 08.09.2025, г. Щёлково, Московская область
                </p>
              </div>

              {/* Вводная часть */}
              <p style={{marginBottom: '1.5rem', textAlign: 'justify'}}>
                Индивидуальный предприниматель Луцок Дан (ИНН 330303450398, ОГРНИП 325508100484721),
                адрес регистрации: 141107, Россия, Московская область, г. Щёлково, ул. Неделина, д. 26, кв. 104
                (далее — «Исполнитель», «Администрация» или «Правообладатель»), публикует настоящую оферту
                (ст. 435, п. 2 ст. 437 ГК РФ) и предлагает неопределённому кругу лиц заключить договор возмездного
                оказания услуг по предоставлению доступа к сервису ReplyX на условиях, изложенных ниже.
              </p>

              <div style={{
                background: '#f1f5f9',
                padding: isMobile ? '0.75rem' : '1rem',
                borderRadius: '0.5rem',
                marginBottom: isMobile ? '1.5rem' : '2rem'
              }}>
                <p style={{
                  margin: '0.25rem 0',
                  fontSize: isMobile ? '0.85rem' : '0.9rem'
                }}><strong>Официальный сайт:</strong> <a href="https://replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}} target="_blank" rel="noopener noreferrer">https://replyx.ru</a></p>
                <p style={{
                  margin: '0.25rem 0',
                  fontSize: isMobile ? '0.85rem' : '0.9rem'
                }}><strong>Email поддержки:</strong> <a href="mailto:support@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>support@replyx.ru</a></p>
                <p style={{
                  margin: '0.25rem 0',
                  fontSize: isMobile ? '0.85rem' : '0.9rem'
                }}><strong>Контакты:</strong> <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a>, <a href="tel:+79933349913" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>+7 (993) 334-99-13</a></p>
              </div>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  1. Общие положения. Термины
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>1.1.</strong> ReplyX — наименование Сервиса (Платформы), предоставляемого Исполнителем. <a href="https://replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}} target="_blank" rel="noopener noreferrer">replyx.ru</a> — официальный сайт Сервиса.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.2.</strong> Оферта — настоящий документ, размещённый на сайте <a href="https://replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}} target="_blank" rel="noopener noreferrer">replyx.ru</a>.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.3.</strong> Акцепт — полное и безоговорочное принятие условий Оферты, выраженное любым из действий: регистрацией на Сайте, фактическим использованием Сервиса, пополнением Баланса/оплатой.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.4.</strong> Сервис / Платформа / Система ReplyX — программно-аппаратный комплекс Исполнителя (SaaS), предоставляющий доступ к функциям создания/обучения AI-ассистентов, веб-виджетов, интеграций и API.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.5.</strong> Личный кабинет (ЛК) — раздел Сервиса с учётной записью Пользователя.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.6.</strong> Сообщение — единица тарификации в ReplyX: исходящее ответное сообщение AI-ассистента (включая ответы в виджете/мессенджере/API), обработанное и отправленное Сервисом.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.7.</strong> Баланс (Лицевой счёт) — виртуальный счёт в ЛК, с которого производится автоматическое списание за Сообщения и иные платные операции.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.8.</strong> Пользователь — физическое лицо 18+, ИП или юридическое лицо, акцептовавшее Оферту.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.9.</strong> Тариф (Тарифный план) — совокупность условий использования Сервиса (лимиты, цена за Сообщение, доступные функции), опубликованных на Сайте.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.10.</strong> Интеграции — внешние сервисы и платформы (мессенджеры, AI-провайдеры, API), которые могут быть подключены Пользователем к ReplyX.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.11.</strong> Контент Пользователя — данные, тексты, изображения и иные материалы, которые Пользователь самостоятельно размещает или вводит при использовании Сервиса.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>1.12.</strong> Искусственный интеллект (ИИ) / AI — программные алгоритмы и модели машинного обучения, используемые в Сервисе для обработки запросов и генерации ответов. Ответы ИИ имеют справочно-информационный характер и не являются рекомендацией или консультацией, носят вероятностный характер и могут содержать неточности.</p>
                <p><strong>1.13.</strong> Иные термины используются в значениях, принятых законодательством РФ.</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  2. Предмет договора
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>2.1.</strong> Исполнитель предоставляет Пользователю право использования Сервиса ReplyX на условиях простой (неисключительной) лицензии и оказывает сопутствующие услуги (доступ через веб-интерфейс, виджеты, API, интеграции, техподдержка).</p>
                <p style={{marginBottom: '0.8rem'}}><strong>2.2.</strong> Конкретный набор функций, лимиты и порядок доступа определяются интерфейсом ЛК и/или действующими тарифными условиями на Сайте.</p>
                <p><strong>2.3.</strong> Настоящая Оферта является публичным договором (ст. 426 ГК РФ).</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  3. Порядок акцепта и заключения договора
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>3.1.</strong> Договор считается заключённым с момента совершения Пользователем одного из действий:</p>
                <ul style={{
                  margin: '0.5rem 0 1rem 1.5rem',
                  paddingLeft: isMobile ? '1rem' : '1.5rem'
                }}>
                  <li style={{marginBottom: '0.3rem'}}>• регистрации в ЛК;</li>
                  <li style={{marginBottom: '0.3rem'}}>• пополнения Баланса/оплаты;</li>
                  <li>• фактического использования функций Сервиса.</li>
                </ul>
                <p><strong>3.2.</strong> Акцептуя Оферту, Пользователь подтверждает дееспособность, полномочия (для ИП/юрлица) и согласие с Политикой конфиденциальности и иными документами на Сайте.</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  4. Регистрация и доступ
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>4.1.</strong> Регистрация осуществляется в ЛК с указанием достоверных данных. Для юрлиц/ИП указывается ответственное лицо.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>4.2.</strong> Минимальный возраст: 18 лет.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>4.3.</strong> Пользователь обязан обеспечивать конфиденциальность логина/пароля и несёт ответственность за все действия в ЛК.</p>
                <p><strong>4.4.</strong> Для корректной работы Сервиса Пользователю необходимо иметь устройство с доступом в Интернет (скорость от 1 Мбит/с), современный браузер (актуальные версии Chrome, Firefox, Safari или Edge), а также разрешение экрана не ниже 1280×720.</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  5. Услуги, тарификация и оплата
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>5.1.</strong> Модель оплаты — pay-per-use. Стоимость 1 (одного) Сообщения AI-ассистента — 5 (пять) рублей.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>5.2.</strong> Пробный лимит: предоставляется 50 сообщений бесплатно для первичного тестирования.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>5.3.</strong> Списание средств производится автоматически и немедленно после отправки Сообщения ассистентом.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>5.4.</strong> Пополнение Баланса — предоплата через интегрированный эквайринг (АО «ТБанк») и иные доступные в ЛК способы. Валюта — рубли РФ.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>5.5.</strong> При недостаточности средств операции блокируются до пополнения Баланса.</p>
                <p><strong>5.6.</strong> Счета/акты (для ИП/юрлиц) предоставляются по запросу на email, чеки ККТ — направляются автоматически на email Пользователя (54-ФЗ).</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  6. Возвраты и зачисления
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>6.1.</strong> Денежные средства, зачисленные на Баланс, не подлежат возврату, за исключением случаев установленного технического сбоя по вине Исполнителя, приведшего к полной недоступности Сервиса свыше 24 часов суммарно в расчётном месяце. Факт технического сбоя подтверждается на основании данных системных журналов (логов) Исполнителя. Пользователь вправе направить обращение в службу поддержки для проверки и подтверждения информации о сбое.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>6.2.</strong> При подтверждённом сбое Исполнитель по выбору:</p>
                <ul style={{margin: '0.5rem 0 1rem 1.5rem'}}>
                  <li style={{marginBottom: '0.3rem'}}>• зачисляет компенсационный кредит на Баланс; или</li>
                  <li>• возвращает неиспользованный остаток (за вычетом фактически оказанных услуг и банковских комиссий) при расторжении договора.</li>
                </ul>
                <p style={{marginBottom: '0.8rem'}}><strong>6.3.</strong> Операции, уже списанные за обработанные Сообщения, возврату не подлежат.</p>
                <p><strong>6.4.</strong> Заявление на возврат направляется в поддержку с указанием платежа, даты, обоснования и реквизитов; рассмотрение — до 10 рабочих дней.</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  7. Права и обязанности сторон
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>7.1. Исполнитель обязан:</strong></p>
                <ul style={{margin: '0.5rem 0 1rem 1.5rem'}}>
                  <li style={{marginBottom: '0.3rem'}}>• предоставлять доступ к Сервису после регистрации и оплаты;</li>
                  <li style={{marginBottom: '0.3rem'}}>• предпринимать разумные меры для бесперебойной работы и устранения критических ошибок;</li>
                  <li style={{marginBottom: '0.3rem'}}>• оказывать техподдержку в пределах, описанных на Сайте/в ЛК;</li>
                  <li>• соблюдать требования 152-ФЗ при обработке персональных данных.</li>
                </ul>
                <p style={{marginBottom: '0.8rem'}}><strong>7.2. Пользователь обязан:</strong></p>
                <ul style={{margin: '0.5rem 0', paddingLeft: '1.5rem'}}>
                  <li style={{marginBottom: '0.3rem'}}>• предоставлять точные данные, своевременно их обновлять;</li>
                  <li style={{marginBottom: '0.3rem'}}>• соблюдать лимиты и оплачивать услуги;</li>
                  <li style={{marginBottom: '0.3rem'}}>• использовать Сервис законно и по правилам Оферты;</li>
                  <li>• самостоятельно контролировать расход Баланса и работу своих ассистентов.</li>
                </ul>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  8. Запреты для Пользователя
                </h2>
                <p style={{marginBottom: '0.8rem'}}>Пользователю запрещается:</p>
                <ul style={{margin: '0.5rem 0', paddingLeft: '1.5rem'}}>
                  <li style={{marginBottom: '0.4rem'}}>• использовать Сервис для спама, мошенничества, навязчивой рекламы без согласия адресатов;</li>
                  <li style={{marginBottom: '0.4rem'}}>• использовать Сервис для противоправных целей (в т. ч. связанных с наркотическими средствами, оружием, азартными играми, экстремистскими материалами, разжиганием ненависти, нарушением ограничений по санкционному и иному праву РФ);</li>
                  <li style={{marginBottom: '0.4rem'}}>• загружать/распространять контент, нарушающий права третьих лиц (авторские/смежные права, товарные знаки, коммерческая тайна, персональные данные без согласия субъектов);</li>
                  <li style={{marginBottom: '0.4rem'}}>• вмешиваться в работу Сервиса: DDoS, подбор паролей, эксплуатация ошибок, попытки обхода ограничений, реверс-инжиниринг, декомпиляция, сканирование уязвимостей без разрешения;</li>
                  <li style={{marginBottom: '0.4rem'}}>• массово создавать учётные записи, передавать доступ к ЛК третьим лицам без согласия Исполнителя;</li>
                  <li style={{marginBottom: '0.4rem'}}>• использовать Сервис для создания продуктов/сервисов, напрямую конкурирующих с ReplyX, путём копирования/воспроизведения его функциональности и интерфейсов;</li>
                  <li>• размещать вредоносный код, вирусы, иные деструктивные компоненты.</li>
                </ul>
                <p style={{marginTop: '0.8rem', fontSize: '0.85rem', color: '#64748b'}}><em>Меры реагирования: при нарушениях Исполнитель вправе немедленно заблокировать аккаунт, ограничить функциональность, заморозить ассистента при неоплате, удалить противоправный контент и уведомить компетентные органы.</em></p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{fontSize: '1.2rem', fontWeight: '600', color: '#6334E5', marginBottom: '1rem'}}>
                  9. Интеллектуальная собственность
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>9.1.</strong> Исключительные права на Сервис, исходный/объектный код, базы данных, дизайн, интерфейсы и иные ОИС принадлежат Исполнителю.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>9.2.</strong> Пользователю предоставляется простая лицензия на использование Сервиса в пределах его функционала. Передача исключительных прав не осуществляется.</p>
                <p><strong>9.3.</strong> Пользователь сохраняет права на собственный контент, размещаемый в Сервисе, и предоставляет Исполнителю безвозмездную неисключительную лицензию использовать такой контент исключительно для целей исполнения настоящего договора (хранение, резервное копирование, обработка, показ в ЛК, техподдержка).</p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{fontSize: '1.2rem', fontWeight: '600', color: '#6334E5', marginBottom: '1rem'}}>
                  10. Персональные данные и конфиденциальность
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>10.1.</strong> Обработка персональных данных осуществляется в соответствии с 152-ФЗ и Политикой конфиденциальности. Акцепт Оферты означает согласие на обработку ПДн.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>10.2.</strong> Обрабатываются, в частности: email, имя (ник), хеш пароля, IP-адрес, данные использования, платёжные идентификаторы, служебные события.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>10.3.</strong> Локация данных: первичное хранение и обработка — на серверах, размещённых на территории РФ.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>10.4.</strong> Интеграции (например, Telegram, мессенджеры, внешние AI-провайдеры, API-сервисы) подключаются исключительно по инициативе Пользователя. В таком случае обработке могут подлежать только данные, которые Пользователь добровольно вводит в чат для взаимодействия с ИИ. ReplyX не осуществляет самостоятельной передачи персональных данных Пользователей третьим лицам. Условия обработки таких данных регулируются политиками соответствующих провайдеров.</p>
                <p><strong>10.5.</strong> Исполнитель применяет необходимые организационные и технические меры защиты (TLS, разграничение доступа, журналы доступа, резервное копирование).</p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{fontSize: '1.2rem', fontWeight: '600', color: '#6334E5', marginBottom: '1rem'}}>
                  11. Ответственность. Форс-мажор
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>11.1.</strong> Сервис предоставляется «как есть» и «как доступно». Исполнитель не гарантирует 100% доступности, отсутствия ошибок, полной совместимости с ПО/оборудованием Пользователя, а также точности и применимости ответов, генерируемых AI-ассистентами.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>11.2.</strong> Исполнитель не отвечает за сбои интернет-провайдеров, платёжных систем, внешних сервисов, действий третьих лиц и госорганов, а также за решения/убытки Пользователя, принятые на основе ответов AI.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>11.3.</strong> Ни одна из сторон не отвечает за косвенные убытки, упущенную выгоду.</p>
                <p><strong>11.4.</strong> Форс-мажор: стороны освобождаются от ответственности при чрезвычайных и непредотвратимых обстоятельствах (стихийные бедствия, акты госорганов, отключения, массовые сетевые сбои, кибератаки и т. п.). Сроки исполнения продлеваются на период форс-мажора.</p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{fontSize: '1.2rem', fontWeight: '600', color: '#6334E5', marginBottom: '1rem'}}>
                  12. Претензионный порядок и подсудность
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>12.1.</strong> Споры подлежат досудебному урегулированию: претензия направляется на <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a> или через ЛК. Срок ответа — 14 календарных дней с даты получения.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>12.2.</strong> При недостижении согласия спор подлежит рассмотрению в суде по месту регистрации ИП Луцок Дан (Московская область, г. Щёлково), если иное не установлено императивными нормами процессуального законодательства РФ.</p>
                <p><strong>12.3.</strong> Применимое право — материальное право Российской Федерации.</p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{fontSize: '1.2rem', fontWeight: '600', color: '#6334E5', marginBottom: '1rem'}}>
                  13. Срок действия, изменения и расторжение
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>13.1.</strong> Оферта действует бессрочно до её отзыва/замены. Договор вступает в силу с момента Акцепта и действует до прекращения сторонами.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>13.2.</strong> Исполнитель вправе изменять Оферту и тарифные условия, публикуя новую редакцию на <a href="https://replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}} target="_blank" rel="noopener noreferrer">replyx.ru</a>. Если изменения затрагивают цену — уведомление направляется Пользователю путём размещения информации на Сайте, а также посредством уведомлений в Личном кабинете и/или по электронной почте, указанной Пользователем при регистрации, не менее чем за 3 календарных дня до вступления в силу. Уже оплаченные объёмы услуг действуют на прежних условиях до конца оплаченного периода/остатка.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>13.3.</strong> Пользователь вправе в любой момент прекратить использование Сервиса и запросить расторжение; при этом возврат средств — по правилам разд. 6.</p>
                <p><strong>13.4.</strong> Исполнитель вправе расторгнуть договор при нарушениях Пользователя условий Оферты, законодательства РФ, неоплате, попытках компрометации безопасности.</p>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  14. Реквизиты Исполнителя
                </h2>
                <div style={{
                  background: '#f8fafc',
                  padding: isMobile ? '1rem' : '1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  fontSize: isMobile ? '0.85rem' : '0.9rem'
                }}>
                  <p style={{margin: '0.4rem 0'}}><strong>Индивидуальный предприниматель Луцок Дан</strong></p>
                  <p style={{margin: '0.4rem 0'}}><strong>Юридический адрес:</strong> 141107, Россия, Московская область, г. Щёлково, ул. Неделина, д. 26, кв. 104</p>
                  <p style={{margin: '0.4rem 0'}}><strong>ИНН:</strong> 330303450398</p>
                  <p style={{margin: '0.4rem 0'}}><strong>ОГРНИП:</strong> 325508100484721</p>
                  <p style={{margin: '0.4rem 0'}}><strong>Расчётный счёт:</strong> 40802810200008681473</p>
                  <p style={{margin: '0.4rem 0'}}><strong>Банк:</strong> АО «ТБанк»</p>
                  <p style={{margin: '0.4rem 0'}}><strong>ИНН банка:</strong> 7710140679</p>
                  <p style={{margin: '0.4rem 0'}}><strong>БИК:</strong> 044525974</p>
                  <p style={{margin: '0.4rem 0'}}><strong>Корр. счёт:</strong> 30101810145250000974</p>
                  <p style={{margin: '0.4rem 0'}}><strong>Адрес банка:</strong> 127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26</p>
                  <p style={{margin: '0.4rem 0'}}><strong>Поддержка:</strong> <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a></p>
                  <p style={{margin: '0.4rem 0'}}><strong>Контакты:</strong> <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a>, <a href="tel:+79933349913" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>+7 (993) 334-99-13</a></p>
                </div>
              </section>

              <section style={{marginBottom: isMobile ? '1.5rem' : '2rem'}}>
                <h2 style={{
                  fontSize: isMobile ? '1rem' : isTablet ? '1.1rem' : '1.2rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  lineHeight: isMobile ? '1.3' : '1.2'
                }}>
                  15. Заключительные положения
                </h2>
                <p style={{marginBottom: '0.8rem'}}><strong>15.1.</strong> Недействительность отдельного положения не влечёт недействительность Оферты в целом.</p>
                <p style={{marginBottom: '0.8rem'}}><strong>15.2.</strong> Приложения (неотъемлемые части): Политика конфиденциальности, Политика cookie (при наличии), техническая документация/ограничения в ЛК, актуальные цены/пояснения к тарификации на Сайте.</p>
                <p><strong>15.3.</strong> Продолжение использования Сервиса после публикации новой редакции Оферты означает согласие Пользователя с изменениями.</p>
              </section>

            </div>
          </div>
        </div>

        <OfferFooter />
      </div>
    </>
  );
}