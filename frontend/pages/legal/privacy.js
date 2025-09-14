import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import LandingHeader from '../../components/LandingHeader';
import LandingFooter from '../../components/LandingFooter';
import landingStyles from '../../styles/pages/Landing.module.css';


export default function LegalPrivacyPage() {
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
        <title>Политика Конфиденциальности - ReplyX</title>
        <meta name="description" content="Политика конфиденциальности сервиса ReplyX. Узнайте, как мы обрабатываем и защищаем ваши персональные данные." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className={landingStyles.landingPage}>
        <LandingHeader />

        {/* Content */}
        <div style={containerStyle}>
          <div style={contentStyle}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#6334E5',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              Политика Конфиденциальности ReplyX
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
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  1. Общие положения
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  1.1. Политика разработана в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и иными нормативными актами РФ.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  1.2. Администрация Сервиса (ИП Луцок Дан) является оператором персональных данных и обеспечивает их защиту.
                </p>
                <p>
                  1.3. Политика является публичным документом и обязательным приложением к Публичной оферте.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  2. Состав обрабатываемых данных
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  2.1. При регистрации и использовании Сервиса могут обрабатываться: имя/никнейм; адрес электронной почты; хэш пароля; IP-адрес, данные о браузере, cookie; идентификаторы платежей (без хранения полных реквизитов карт); данные о действиях в Личном кабинете (логи, статистика).
                </p>
                <p>
                  2.2. В случае подключения интеграций (Telegram, API, внешние AI-провайдеры и др.) обрабатываются только те данные, которые Пользователь самостоятельно вводит для взаимодействия с ИИ.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  3. Цели обработки
                </h2>
                <p>
                  Персональные данные используются для: регистрации и идентификации Пользователя; предоставления доступа к функционалу ReplyX; исполнения договорных обязательств (оказание услуг, расчёты, бухгалтерия); обеспечения технической поддержки и безопасности; аналитики работы Сервиса и улучшения качества; исполнения требований законодательства.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  4. Правовые основания
                </h2>
                <p>
                  4.1. Обработка осуществляется на основании: согласия Пользователя (акцепт Публичной оферты или отдельная отметка в интерфейсе); договора об оказании услуг (Публичная оферта); требований законодательства РФ.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  5. Условия и меры защиты
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  5.1. Обработка ведётся с использованием автоматизированных систем и/или без них.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  5.2. ReplyX применяет меры защиты: TLS-шифрование, разграничение прав доступа, хранение хэшей вместо паролей, резервное копирование.
                </p>
                <p>
                  5.3. Доступ к данным имеют только уполномоченные сотрудники Исполнителя.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  6. Передача третьим лицам
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  6.1. ReplyX не осуществляет самостоятельной передачи персональных данных третьим лицам.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  6.2. Передача может осуществляться: при использовании интеграций (мессенджеры, внешние AI-провайдеры) — в объёме, который Пользователь сам вводит; банку-эквайеру (АО «ТБанк») — для приёма платежей; по требованию госорганов РФ в пределах закона.
                </p>
                <p>
                  6.3. При подключении внешних ИИ-провайдеров данные могут быть переданы на серверы за пределами РФ. Пользователь даёт отдельное согласие на такую передачу при активации интеграции.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  7. Хранение и сроки
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  7.1. Данные хранятся на серверах на территории РФ.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  7.2. Хранение осуществляется до удаления учётной записи Пользователя или достижения целей обработки.
                </p>
                <p>
                  7.3. Резервные копии удаляются не позднее чем через 90 календарных дней после удаления основных данных.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  8. Cookie и техническая информация
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  8.1. Сервис использует cookie-файлы для авторизации и работы интерфейса.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  8.2. Маркетинговые и аналитические cookie применяются только после согласия Пользователя («Принять» в уведомлении).
                </p>
                <p>
                  8.3. Пользователь может отказаться от cookie в настройках браузера, но это может ограничить работу Сервиса.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  9. Права Пользователя
                </h2>
                <p>
                  Пользователь имеет право: получать информацию об обработке своих данных; требовать исправления, блокирования, удаления данных; отзывать согласие на обработку; обжаловать действия Исполнителя в Роскомнадзор или суд.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  10. Уведомления об инцидентах
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  10.1. В случае утечки персональных данных Исполнитель уведомит Роскомнадзор и затронутых Пользователей не позднее 24 часов с момента обнаружения.
                </p>
                <p>
                  10.2. Дополнительная информация о нарушении предоставляется в течение 72 часов.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  11. Изменение Политики
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  11.1. Новая редакция публикуется на сайте <a href="/legal" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>replyx.ru/legal</a>.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  11.2. Уведомления об изменениях направляются Пользователям через Личный кабинет и/или по email.
                </p>
                <p>
                  11.3. Продолжение использования Сервиса означает согласие с новой редакцией.
                </p>
              </section>

              <section style={{marginBottom: '2rem'}}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  12. Согласие на обработку данных
                </h2>
                <p style={{marginBottom: '1rem'}}>
                  12.1. Нажатие кнопки «Зарегистрироваться», «Оплатить», «Продолжить» либо фактическое использование функций ReplyX считается согласием на обработку персональных данных.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  12.2. Согласие действует до достижения целей обработки или его отзыва.
                </p>
                <p style={{marginBottom: '1rem'}}>
                  12.3. Отзыв согласия возможен через запрос на <a href="mailto:support@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>support@replyx.ru</a>; срок рассмотрения — до 10 рабочих дней.
                </p>
                <p>
                  12.4. Отзыв согласия может ограничить или сделать невозможным использование отдельных функций Сервиса.
                </p>
              </section>

              <section>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  marginBottom: '1rem'
                }}>
                  13. Контакты
                </h2>
                <div style={{
                  background: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Оператор:</strong> Индивидуальный предприниматель Луцок Дан
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
                    <strong>Расчётный счёт:</strong> 40802810200008681473
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Банк:</strong> АО «ТБанк»
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>ИНН банка:</strong> 7710140679
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>БИК:</strong> 044525974
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Корр. счёт:</strong> 30101810145250000974
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Адрес банка:</strong> 127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>E-mail:</strong> <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a>
                  </p>
                  <p style={{margin: '0.5rem 0', fontWeight: '500'}}>
                    <strong>Телефон:</strong> <a href="tel:+79933349913" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>+7 (993) 334-99-13</a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        <LandingFooter />
      </div>
    </>
  );
}
