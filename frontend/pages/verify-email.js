import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/pages/Login.module.css';

const RESEND_TIMEOUT = 60; // секунд
const RESEND_KEY = 'verify_email_last_resend';

export default function VerifyEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  // Получаем email из query или localStorage
  useEffect(() => {
    if (router.query.email) {
      setEmail(router.query.email);
      localStorage.setItem('verify_email', router.query.email);
    } else {
      const saved = localStorage.getItem('verify_email');
      if (saved) setEmail(saved);
    }
  }, [router.query.email]);

  // Таймер для повторной отправки (с учётом localStorage)
  useEffect(() => {
    // При монтировании: вычисляем, сколько осталось до разблокировки
    const lastResend = localStorage.getItem(RESEND_KEY);
    if (lastResend) {
      const secondsAgo = Math.floor((Date.now() - parseInt(lastResend, 10)) / 1000);
      if (secondsAgo < RESEND_TIMEOUT) {
        setResendTimer(RESEND_TIMEOUT - secondsAgo);
      }
    }
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Обработка ввода в поля кода
  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Только один символ
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Автофокус на следующее поле
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Обработка клавиш
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Автоотправка при заполнении всех полей
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      handleSubmit(fullCode);
    }
  }, [code]);

  // Подтверждение кода
  const handleSubmit = useCallback(async (codeString) => {
    setMessage('');
    setMessageType('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/confirm_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeString })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Email успешно подтвержден!');
        setMessageType('success');
        localStorage.removeItem('verify_email');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        let errorMsg = 'Ошибка подтверждения';
        if (data.detail) {
          if (typeof data.detail === 'string') errorMsg = data.detail;
          else if (Array.isArray(data.detail)) errorMsg = data.detail.map(e => e.msg).join(', ');
          else if (typeof data.detail === 'object' && data.detail.msg) errorMsg = data.detail.msg;
          else errorMsg = JSON.stringify(data.detail);
    }
        setMessage(errorMsg);
        setMessageType('error');
      }
    } catch {
      setMessage('Ошибка сети. Попробуйте позже.');
      setMessageType('error');
    }
    setLoading(false);
  }, [email, router]);

  // Повторная отправка кода через /api/resend_email_code
  const handleResend = useCallback(async () => {
    setMessage("");
    setMessageType("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/resend_email_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "" })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("Код отправлен повторно. Проверьте почту.");
        setMessageType("success");
        setResendTimer(RESEND_TIMEOUT);
        localStorage.setItem(RESEND_KEY, Date.now().toString());
      } else {
        let errorMsg = "Ошибка отправки кода";
        if (data.detail) {
          if (typeof data.detail === 'string') errorMsg = data.detail;
          else if (Array.isArray(data.detail)) errorMsg = data.detail.map(e => e.msg).join(', ');
          else if (typeof data.detail === 'object' && data.detail.msg) errorMsg = data.detail.msg;
          else errorMsg = JSON.stringify(data.detail);
        }
        setMessage(errorMsg);
        setMessageType("error");
      }
    } catch {
      setMessage("Ошибка сети. Попробуйте позже.");
      setMessageType("error");
    }
    setLoading(false);
  }, [email]);

  return (
    <div className={styles.loginBg}>
      <div className={styles.verifyCard}>
        <div className={styles.logoContainer}>
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#7C4DFF"/>
            <path d="M14 19L24 27L34 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="15" width="20" height="18" rx="5" stroke="#fff" strokeWidth="3"/>
          </svg>
          <span className={styles.logoText}>ChatAI</span>
        </div>
        
        <h1 className={styles.verifyTitle}>Подтверждение Email</h1>
        
        <p className={styles.verifySubtitle}>
          Мы отправили 6‑значный код на <strong>{email}</strong>
        </p>
        
        <div className={styles.codeContainer}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="1"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className={styles.codeInput}
            />
          ))}
        </div>
        
        {message && <p className={`${styles.message} ${styles[messageType]}`}>{message}</p>}
        
        <button 
          onClick={() => handleSubmit(code.join(''))}
          disabled={loading || code.join('').length !== 6}
          className={styles.submitButton}
        >
          {loading ? 'Подтверждаем...' : 'Подтвердить'}
        </button>
        
        <button 
          onClick={handleResend}
          disabled={loading || resendTimer > 0}
          className={styles.resendButton}
        >
          {loading ? 'Отправляем...' : resendTimer > 0 ? `Отправить ещё код (${resendTimer}с)` : 'Отправить ещё код'}
        </button>
        
        <p className={styles.expiryText}>
          Код действителен 15 минут
        </p>
        
        <div className={styles.registerText}>
          <Link href="/login" className={styles.registerLink}>
            ← Назад ко входу
          </Link>
        </div>
      </div>
    </div>
  );
} 