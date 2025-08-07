import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/pages/Login.module.css';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Инструкции по восстановлению пароля отправлены на ваш email.');
        setMessageType('success');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setMessage(data.detail || 'Ошибка при отправке инструкций');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Не удалось подключиться к серверу. Попробуйте снова позже.');
      setMessageType('error');
    } finally {
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
        
        <h1 className={styles.title}>Восстановление пароля</h1>
        
        <p className={styles.subtitle}>
          Введите ваш email, и мы отправим ссылку для сброса пароля
        </p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
              className={styles.input}
            />
          </div>
          
          {message && <p className={`${styles.message} ${styles[messageType]}`}>{message}</p>}
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Отправляем...' : 'Отправить ссылку для сброса'}
          </button>
        </form>
        
        <div className={styles.registerText}>
          <Link href="/login" className={styles.registerLink}>
            ← Назад ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}