import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import API_CONFIG, { createApiUrl } from '../config/api';
import { validateRegistrationForm } from '../utils/validation';
import styles from '../styles/pages/Login.module.css';
import Image from 'next/image';
import Link from 'next/link';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();

  // Перенаправляем авторизованных пользователей
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    
    // Клиентская валидация
    const validation = validateRegistrationForm({
      email,
      fullName,
      password,
      confirmPassword
    });
    
    if (!validation.isValid) {
      // Показываем первую ошибку
      const firstError = Object.values(validation.errors)[0];
      setMessage(firstError);
      setMessageType('error');
      setIsLoading(false);
      return;
    }
    
    // Используем очищенные данные
    const result = await register(
      validation.sanitizedData.email, 
      validation.sanitizedData.password, 
      validation.sanitizedData.fullName
    );
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(validation.sanitizedData.email)}`);
      }, 2000);
    } else {
      setMessage(result.error);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  return (
    <div className={styles.loginBg}>
      <div className={styles.registerCard}>
        <div className={styles.logoContainer}>
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#7C4DFF"/>
            <path d="M14 19L24 27L34 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="15" width="20" height="18" rx="5" stroke="#fff" strokeWidth="3"/>
          </svg>
          <span className={styles.logoText}>ChatAI</span>
        </div>
        
        <h1 className={styles.title}>Создать аккаунт</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              id="fullName"
              type="text"
              placeholder="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="name"
              className={styles.input}
            />
          </div>
          
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
                placeholder="Пароль (не менее 8 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
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
          
          <div className={styles.inputGroup}>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                disabled={isLoading}
                tabIndex={-1}
              >
                <Image src={isConfirmPasswordVisible ? "/eye-off.svg" : "/eye.svg"} alt="Показать пароль" width={20} height={20} />
              </button>
            </div>
          </div>
          
          {message && <p className={`${styles.message} ${styles[messageType]}`}>{message}</p>}
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
          
          <a href={createApiUrl(API_CONFIG.ENDPOINTS.AUTH.YANDEX_LOGIN)} className={styles.yandexButton}>
            <Image src="/yandex-logo.svg" alt="Яндекс" width={20} height={20} />
            <span>Зарегистрироваться с Яндекс</span>
          </a>
        </form>
        
        <div className={styles.registerText}>
          Уже есть аккаунт? 
          <Link href="/login" className={styles.registerLink}>
            Войти
          </Link>
        </div>
        
        <div className={styles.termsText}>
          Регистрируясь, вы соглашаетесь с{' '}
          <Link href="/terms" className={styles.termsLink}>
            Условиями использования
          </Link>{' '}и{' '}
          <Link href="/privacy" className={styles.termsLink}>
            Политикой конфиденциальности
          </Link>
        </div>
      </div>
    </div>
  );
}