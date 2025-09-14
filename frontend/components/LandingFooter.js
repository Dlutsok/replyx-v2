import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import landingStyles from '../styles/pages/Landing.module.css';

export default function LandingFooter() {
  const router = useRouter();

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
                <button
                  onClick={() => handleAnchorClick('#features')}
                  className={landingStyles.whiteFooterLink}
                  style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
                >
                  Возможности
                </button>
                <button
                  onClick={() => handleAnchorClick('#pricing')}
                  className={landingStyles.whiteFooterLink}
                  style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
                >
                  Цена
                </button>
                <button
                  onClick={() => handleAnchorClick('#testimonials')}
                  className={landingStyles.whiteFooterLink}
                  style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
                >
                  Отзывы
                </button>
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
              <button
                onClick={() => handleAnchorClick('#features')}
                className={landingStyles.whiteFooterLink}
                style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
              >
                Возможности
              </button>
              <button
                onClick={() => handleAnchorClick('#pricing')}
                className={landingStyles.whiteFooterLink}
                style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
              >
                Цена
              </button>
              <button
                onClick={() => handleAnchorClick('#testimonials')}
                className={landingStyles.whiteFooterLink}
                style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'block'}}
              >
                Отзывы
              </button>
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