import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import landingStyles from '../../styles/pages/Landing.module.css';

// Header компонент в стиле главной страницы
function TermsHeader() {
  const router = useRouter();

  return (
    <header className={landingStyles.header}>
      <div className={landingStyles.headerContainer}>
        <div className={landingStyles.logo} onClick={() => router.push('/')}>
          <svg className={landingStyles.logoIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"></path>
            <circle cx="9" cy="9" r="1"></circle>
            <circle cx="15" cy="9" r="1"></circle>
          </svg>
          <span className={landingStyles.logoText}>ReplyX</span>
        </div>

        <nav className={landingStyles.nav}>
          <button
            className={landingStyles.navLink}
            onClick={() => router.push('/')}
          >
            Главная
          </button>
        </nav>

        <div className={landingStyles.headerActions}>
          <button
            className={landingStyles.loginButton}
            onClick={() => router.push('/login')}
          >
            Войти
          </button>
          <button
            className="px-6 py-2.5 text-white font-semibold rounded-[0.9rem] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-200 h-11 relative overflow-hidden"
            onClick={() => router.push('/register')}
            style={{background: 'linear-gradient(90deg, #7c3aed, #6366f1)'}}
          >
            <span className="absolute inset-0 z-0 animate-wave-gradient" style={{background: 'linear-gradient(90deg, #a855f7, #7c3aed)'}} />
            <span className="relative z-10">Начать бесплатно</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// Новый белый футер с акцентной рамкой
function TermsFooter() {
  const router = useRouter();

  return (
    <footer className={landingStyles.whiteFooter}>
      <div className={landingStyles.whiteFooterContent}>
        <div className={landingStyles.whiteFooterLeft}>
          <div className={landingStyles.whiteFooterBrand}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"></path>
              <circle cx="9" cy="9" r="1"></circle>
              <circle cx="15" cy="9" r="1"></circle>
            </svg>
            <span>ReplyX</span>
          </div>
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
                <path fill-rule="evenodd" clip-rule="evenodd" d="M38.4365 10.2345C38.4365 9.46859 37.8156 8.84766 37.0496 8.84766H16.2463C15.4803 8.84766 14.8594 9.46859 14.8594 10.2345V15.0887C14.8594 15.8546 15.4803 16.4756 16.2463 16.4756H21.1043C21.8702 16.4756 22.4912 17.0965 22.4912 17.8625L22.4912 31.0311C22.4912 31.7971 23.1121 32.418 23.878 32.418H29.4256C30.1916 32.418 30.8125 31.7971 30.8125 31.0311L30.8125 17.8625C30.8125 17.0965 31.4334 16.4756 32.1994 16.4756H37.0496C37.8156 16.4756 38.4365 15.8546 38.4365 15.0887V10.2345Z" fill="white"/>
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
              <div className={landingStyles.footerColumnTitle}>
                Продукт
              </div>
              <button className={landingStyles.whiteFooterLink}>
                Возможности
              </button>
              <button className={landingStyles.whiteFooterLink}>
                Решения
              </button>
              <button className={landingStyles.whiteFooterLink}>
                Тарифы
              </button>
            </div>

            {/* Колонка 2: Компания */}
            <div className={landingStyles.footerColumn}>
              <div className={landingStyles.footerColumnTitle}>
                Компания
              </div>
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
              <div className={landingStyles.footerColumnTitle}>
                Правовая информация
              </div>
              <button onClick={() => router.push('/legal')} className={landingStyles.whiteFooterLink}>
                Правовая информация
              </button>
            </div>
          </div>
          <div className={landingStyles.whiteFooterCopyright}>
            © 2025 ReplyX
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LegalTermsPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerStyle = {
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: isMobile ? '1rem 0' : '2rem 0'
  };

  const contentStyle = {
    background: 'white',
    padding: isMobile ? '1.5rem 1rem' : '3rem 2rem',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    margin: '0 0.5rem'
  };

  return (
    <>
      <Head>
        <title>Пользовательское Соглашение и согласие на обработку ПДн - ReplyX</title>
        <meta name="description" content="Пользовательское соглашение и согласие на обработку персональных данных сервиса ReplyX. Правила использования платформы и условия предоставления услуг." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className={landingStyles.landingPage}>
        <TermsHeader />

        {/* Content */}
        <div style={containerStyle}>
          <div style={contentStyle}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(147 51 234)',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              Пользовательское Соглашение и согласие на обработку ПДн
            </h1>

            <p style={{
              textAlign: 'center',
              color: '#64748b',
              marginBottom: '3rem',
              fontSize: '0.9rem'
            }}>
              Последнее обновление: 08.09.2025, г. Щёлково, Московская область
            </p>

            <div style={{lineHeight: '1.6', color: '#374151'}}>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  Введение
                </h2>
                <p>
                  Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует использование онлайн-сервиса ReplyX (<a href="https://replyx.ru" style={{color: 'rgb(147 51 234)', textDecoration: 'none', fontWeight: '500'}} target="_blank" rel="noopener noreferrer">https://replyx.ru</a>) и одновременно подтверждает согласие Пользователя на обработку его персональных данных в соответствии с ФЗ № 152-ФЗ «О персональных данных».
                </p>
                <p style={{marginBottom: '1rem'}}>
                  Акцепт настоящего Соглашения (регистрация, оплата, использование функций) означает согласие с условиями Публичной оферты, Политики конфиденциальности и Политики использования cookie.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  1. Регистрация и аккаунт
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  1.1. Для доступа к Сервису Пользователь проходит регистрацию и создаёт учётную запись (Личный кабинет).
                </p>
                <p style={{marginBottom: '1rem'}}>
                  1.2. При регистрации предоставляются достоверные данные.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  1.3. Пользователь несёт ответственность за сохранность логина и пароля, а также за все действия через его аккаунт.
                </p>
                <p>
                  1.4. Передача учётной записи третьим лицам без согласия Администрации запрещена.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  2. Состав обрабатываемых данных
                </h2>
                <p>
                  ReplyX может обрабатывать следующие данные Пользователя:
                  <br />- имя или никнейм;
                  <br />- адрес электронной почты;
                  <br />- хэш пароля;
                  <br />- IP-адрес, данные браузера и cookie;
                  <br />- сведения о платежах (ID транзакции, сумма, маска карты);
                  <br />- действия в Личном кабинете (логи, статистика).
                </p>
                <p style={{marginBottom: '1rem'}}>
                  При использовании интеграций (Telegram, API, внешние AI-провайдеры) обрабатываются только данные, которые Пользователь сам вводит при взаимодействии с ИИ.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  3. Цели обработки данных
                </h2>
                <p>
                  - заключение и исполнение договора (оферты);
                  <br />- приём платежей и ведение бухгалтерского учёта;
                  <br />- регистрация и поддержка работы аккаунта;
                  <br />- аналитика использования сайта и ЛК;
                  <br />- техподдержка и безопасность;
                  <br />- рассылка маркетинговых сообщений — только при отдельном согласии Пользователя.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  4. Действия с данными
                </h2>
                <p>
                  ReplyX осуществляет:
                  сбор → запись → систематизацию → хранение → уточнение → использование → передачу (в т. ч. при интеграциях и возможную трансграничную) → обезличивание → блокирование/удаление → уничтожение.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  5. Хранение данных
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  5.1. Данные хранятся до достижения целей обработки или до удаления аккаунта Пользователем.
                </p>
                <p>
                  5.2. Резервные копии удаляются не позднее 90 календарных дней после удаления основных данных.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  6. Права Пользователя
                </h2>
                <p>
                  Пользователь вправе:
                  <br />- получать сведения об обработке своих данных;
                  <br />- требовать исправления или удаления;
                  <br />- отзывать согласие (<a href="mailto:support@replyx.ru" style={{color: 'rgb(147 51 234)', textDecoration: 'none', fontWeight: '500'}}>support@replyx.ru</a>);
                  <br />- обжаловать действия Исполнителя в Роскомнадзор или суд.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  Срок ответа на запрос — до 10 рабочих дней.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  7. Отзыв согласия
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  7.1. Отзыв возможен письменно или по e-mail на <a href="mailto:support@replyx.ru" style={{color: 'rgb(147 51 234)', textDecoration: 'none', fontWeight: '500'}}>support@replyx.ru</a>.
                </p>
                <p>
                  7.2. После отзыва обработка прекращается, но часть функций Сервиса может быть недоступна.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  8. Подтверждение согласия
                </h2>
                <p>
                  Нажимая «Зарегистрироваться», «Оплатить» или продолжая использовать Сервис после уведомления «Продолжая, Вы даёте согласие на обработку персональных данных», Пользователь подтверждает:
                  <br />- ознакомление с Политикой конфиденциальности;
                  <br />- добровольное согласие на обработку и возможную трансграничную передачу данных при использовании интеграций;
                  <br />- понимание, что ответы ИИ носят справочно-информационный характер и могут содержать неточности.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  9. Ограничение ответственности
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  9.1. Сервис предоставляется «как есть». Администрация не гарантирует 100% доступности и точности ответов ИИ.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  9.2. Администрация не отвечает за: сбои у интернет-провайдеров, эквайринга, интеграций; убытки, возникшие из-за решений, принятых на основе ответов ИИ.
                </p>
                <p>
                  9.3. Ответственность Администрации ограничена суммой фактически оплаченных и неиспользованных услуг.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  10. Применимое право и споры
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  10.1. Настоящее Соглашение регулируется правом Российской Федерации.
                </p>
                <p>
                  10.2. Споры подлежат досудебному урегулированию; при недостижении согласия — рассмотрению в суде по месту регистрации ИП Луцок Дан (г. Щёлково, Московская область).
                </p>
              </section>

              <section>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'rgb(147 51 234)',
                  marginBottom: '1rem'
                }}>
                  11. Контакты
                </h2>
                <div style={{
                  background: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Исполнитель:</strong> Индивидуальный предприниматель Луцок Дан
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>ИНН:</strong> 330303450398
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>ОГРНИП:</strong> 325508100484721
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Адрес:</strong> 141107, Россия, Московская область, г. Щёлково, ул. Неделина, д. 26, кв. 104
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>E-mail:</strong> <a href="mailto:support@replyx.ru" style={{color: 'rgb(147 51 234)', textDecoration: 'none', fontWeight: '500'}}>support@replyx.ru</a>
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Телефон:</strong> <a href="tel:+79933349913" style={{color: 'rgb(147 51 234)', textDecoration: 'none', fontWeight: '500'}}>+7 (993) 334-99-13</a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        <TermsFooter />
      </div>
    </>
  );
}

