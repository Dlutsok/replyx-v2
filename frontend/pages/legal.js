import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import landingStyles from '../styles/pages/Landing.module.css';


export default function LegalPage() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

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

  const documentCardStyle = {
    background: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
  };

  return (
    <>
      <Head>
        <title>Правовая информация - ReplyX</title>
        <meta name="description" content="Правовая информация сервиса ReplyX. Политика конфиденциальности, условия использования, публичная оферта и другие юридические документы." />
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
              marginBottom: '1rem'
            }}>
              Правовая информация
            </h1>

            <p style={{
              textAlign: 'center',
              color: '#64748b',
              marginBottom: '3rem',
              fontSize: '1rem'
            }}>
              Все юридические документы сервиса ReplyX
            </p>

            <div style={{lineHeight: '1.6', color: '#374151'}}>
              <div style={{marginBottom: '2rem'}}>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: isMobile ? '1rem' : '1.5rem',
                  padding: isMobile ? '0 0.5rem' : '0'
                }}>

                  {/* Политика конфиденциальности */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: isMobile ? '1.5rem 1rem' : '2rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      margin: isMobile ? '0 0.25rem' : '0'
                    }}
                    onClick={() => router.push('/legal/privacy')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 52, 229, 0.15)';
                      e.currentTarget.style.borderColor = '#6334E5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #6334E5, #6334E5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#6334E5',
                      marginBottom: '0.5rem'
                    }}>
                      Политика конфиденциальности
                    </h3>
                    <p style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      Как мы обрабатываем и защищаем персональные данные (152-ФЗ).
                    </p>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}>
                      Обновлено: 08.09.2025
                    </p>
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 52, 229, 0.1)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#6334E5',
                      fontWeight: '500'
                    }}>
                      Читать →
                    </div>
                  </div>

                  {/* Политика использования cookie */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: isMobile ? '1.5rem 1rem' : '2rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      margin: isMobile ? '0 0.25rem' : '0'
                    }}
                    onClick={() => router.push('/legal/cookies')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 52, 229, 0.15)';
                      e.currentTarget.style.borderColor = '#6334E5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #6334E5, #6334E5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#6334E5',
                      marginBottom: '0.5rem'
                    }}>
                      Политика использования cookie
                    </h3>
                    <p style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      Категории cookie, получение согласия и управление настройками.
                    </p>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}>
                      Обновлено: 08.09.2025
                    </p>
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 52, 229, 0.1)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#6334E5',
                      fontWeight: '500'
                    }}>
                      Читать →
                    </div>
                  </div>

                  {/* Публичная оферта */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: isMobile ? '1.5rem 1rem' : '2rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      margin: isMobile ? '0 0.25rem' : '0'
                    }}
                    onClick={() => router.push('/legal/offer')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 52, 229, 0.15)';
                      e.currentTarget.style.borderColor = '#6334E5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #6334E5, #6334E5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#6334E5',
                      marginBottom: '0.5rem'
                    }}>
                      Публичная оферта
                    </h3>
                    <p style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      Условия оказания услуг, права и обязанности сторон.
                    </p>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}>
                      Обновлено: 08.09.2025
                    </p>
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 52, 229, 0.1)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#6334E5',
                      fontWeight: '500'
                    }}>
                      Читать →
                    </div>
                  </div>

                  {/* Условия использования */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: isMobile ? '1.5rem 1rem' : '2rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      margin: isMobile ? '0 0.25rem' : '0'
                    }}
                    onClick={() => router.push('/legal/terms')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 52, 229, 0.15)';
                      e.currentTarget.style.borderColor = '#6334E5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #6334E5, #6334E5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M16 4h.01M16 20h.01M8 8h.01M8 12h.01M8 16h.01M12 8h.01M12 12h.01M12 16h.01"></path>
                        <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V6a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1H3c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7h1z"></path>
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#6334E5',
                      marginBottom: '0.5rem'
                    }}>
                      Пользовательское соглашение и согласие на обработку ПДн
                    </h3>
                    <p style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      Правила пользования сервисом и согласие на обработку ПДн.
                    </p>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}>
                      Обновлено: 08.09.2025
                    </p>
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 52, 229, 0.1)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#6334E5',
                      fontWeight: '500'
                    }}>
                      Читать →
                    </div>
                  </div>

                </div>
              </div>

              {/* Контактная информация */}
              <div style={{
                background: '#f8fafc',
                padding: '2rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                marginTop: '3rem'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#6334E5',
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  Контакты
                </h3>

                <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem'}}>
                  <div>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Оператор персональных данных
                    </h4>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>ИП Луцок Дан</strong>
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem'}}>
                      ОГРНИП 325508100484721<br />
                      ИНН 330303450398
                    </p>
                  </div>


                  <div>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Банковские реквизиты
                    </h4>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>Расчётный счёт:</strong> 40802810200008681473
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>Банк:</strong> АО «ТБанк»
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>ИНН банка:</strong> 7710140679
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>БИК:</strong> 044525974
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem'}}>
                      <strong>Корр. счёт:</strong> 30101810145250000974
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem'}}>
                      <strong>Адрес банка:</strong> 127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26
                    </p>
                  </div>

                  <div>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Связь с нами
                    </h4>
                    <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem'}}>
                      <strong>Email:</strong> <a href="mailto:info@replyx.ru" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>info@replyx.ru</a>
                    </p>
                    <p style={{color: '#64748b', fontSize: '0.9rem'}}>
                      <strong>Телефон:</strong> <a href="tel:+79933349913" style={{color: '#6334E5', textDecoration: 'none', fontWeight: '500'}}>+7 (993) 334-99-13</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LandingFooter />
      </div>
    </>
  );
}
