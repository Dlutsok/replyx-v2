import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import API_CONFIG, { createApiUrl } from '../config/api';
import styles from '../styles/pages/Login.module.css';
import Image from 'next/image';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  // Обработка сообщений из URL параметров
  useEffect(() => {
    if (router.query.message) {
      const urlMessage = router.query.message;
      const urlEmail = router.query.email;
      
      if (urlMessage === 'invitation_accepted') {
        setMessage('✅ Приглашение успешно принято! Войдите в систему.');
        setMessageType('success');
        if (urlEmail) {
          setEmail(decodeURIComponent(urlEmail));
        }
      } else if (urlMessage === 'invitation_accepted_existing_user') {
        setMessage('✅ Приглашение принято! Войдите с вашим существующим паролем.');
        setMessageType('success');
        if (urlEmail) {
          setEmail(decodeURIComponent(urlEmail));
        }
      }
      
      // Очищаем URL от параметров
      router.replace('/login', undefined, { shallow: true });
    }
  }, [router.query]);

  // Быстрая проверка токена при монтировании компонента
  useEffect(() => {
    // Проверяем токен сразу, не дожидаясь checkAuth
    const token = localStorage.getItem('token');
    if (token && isAuthenticated && !authLoading) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Показываем загрузку если идет проверка авторизации
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6366f1'
      }}>
        Проверка авторизации...
      </div>
    );
  }

  // Перенаправляем авторизованных пользователей
  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Обрезаем пробелы из email и пароля
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const result = await login(trimmedEmail, trimmedPassword);
    
    if (result.success) {
      // Не показываем сообщение о перенаправлении, просто ждем редиректа
      // setMessage остается пустым, isLoading остается true до редиректа
    } else {
      setMessage(result.error);
      setMessageType('error');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginBg}>
      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#7C4DFF"/>
            <path d="M14 19L24 27L34 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="15" width="20" height="18" rx="5" stroke="#fff" strokeWidth="3"/>
          </svg>
          <span className={styles.logoText}>ChatAI</span>
        </div>
        
        <h1 className={styles.title}>Вход в систему</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              disabled={isLoading}
              autoComplete="email"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                disabled={isLoading}
                tabIndex={-1}
              >
                <Image src={isPasswordVisible ? "/eye-off.svg" : "/eye.svg"} alt="Показать пароль" width={20} height={20} />
              </button>
            </div>
          </div>
          
          <div className={styles.forgotPassword}>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Забыли пароль?
            </Link>
          </div>
          
          {message && <p className={`${styles.message} ${styles[messageType]}`}>{message}</p>}
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Входим...' : 'Войти'}
          </button>
          
          <a href={createApiUrl(API_CONFIG.ENDPOINTS.AUTH.YANDEX_LOGIN)} className={styles.yandexButton}>
            <Image src="/yandex-logo.svg" alt="Яндекс" width={20} height={20} />
            <span>Войти с Яндекс</span>
          </a>
        </form>
        
        <div className={styles.registerText}>
          Нет аккаунта? 
          <Link href="/register" className={styles.registerLink}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}