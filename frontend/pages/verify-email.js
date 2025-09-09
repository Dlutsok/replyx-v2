import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { createApiUrl } from '../config/api';

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
      const response = await fetch(createApiUrl('/api/confirm_email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeString })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Email успешно подтвержден! Выполняется вход...');
        setMessageType('success');
        localStorage.removeItem('verify_email');

        // Если вернулся токен авторизации, автоматически входим в систему
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);

          // Перенаправляем на дашборд через 1 секунду
          // Используем window.location для полного обновления страницы и проверки авторизации
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          // Fallback на старое поведение если токен не вернулся
          setTimeout(() => router.push('/login'), 2000);
        }
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
      const response = await fetch(createApiUrl('/api/resend_email_code'), {
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
    <>
      <Head>
        <title>Подтверждение email - ReplyX</title>
        <meta name="description" content="Подтвердите ваш email адрес для завершения регистрации в ReplyX." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Левая панель с градиентным фоном в стиле дашборда */}
      <div className="relative hidden lg:block overflow-hidden">
        {/* Градиентный фон в стиле дашборда */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6334E5]/10 via-white to-[#6334E5]/10" />

        {/* Анимированные пузырьки по всей левой половине - едва заметные */}
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full opacity-5 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #6334E5, transparent)'}} />
        <div className="absolute top-1/4 right-20 w-80 h-80 rounded-full opacity-8 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #6b5aff, transparent)', animationDelay: '1s'}} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-6 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #8f7bff, transparent)', animationDelay: '2s'}} />
        <div className="absolute top-1/2 right-10 w-72 h-72 rounded-full opacity-7 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #6334E5, transparent)', animationDelay: '3s'}} />
        <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full opacity-5 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #5a2ed4, transparent)', animationDelay: '4s'}} />
        <div className="absolute top-3/4 right-1/3 w-56 h-56 rounded-full opacity-6 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #6b5aff, transparent)', animationDelay: '5s'}} />
        <div className="absolute bottom-1/3 left-1/2 w-68 h-68 rounded-full opacity-7 blur-3xl animate-pulse"
             style={{background: 'radial-gradient(circle, #8f7bff, transparent)', animationDelay: '6s'}} />

        {/* Логотип в верхнем левом углу */}
        <div className="absolute top-8 left-8 z-10">
          <Link href="/" className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl">
            <Image src="/favicon.svg" alt="ReplyX" width={32} height={32} />
          </Link>
        </div>

        {/* Эффект зеркала для затемнения спецэффектов */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] pointer-events-none" />

        {/* Центральный контент - только текст */}
        <div className="relative h-full w-full flex items-center justify-center">
          <div className="max-w-lg text-center">
            <div className="space-y-6">
              {/* Основной заголовок */}
              <div>
                <div className="text-6xl sm:text-7xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-[#6b5aff] to-[#6334E5] bg-clip-text text-transparent mb-3">
                  ReplyX
                </div>
                <div className="text-lg sm:text-xl text-gray-600 font-medium">
                  Подтверждение email
                </div>
              </div>

              {/* Описание */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
                <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                  Мы отправили 6-значный код подтверждения на <strong className="text-primary-700">{email || 'ваш email'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Правая панель — форма подтверждения email в стиле дашборда */}
      <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
            {/* Welcome Section в стиле дашборда */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Подтверждение email</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Введите 6-значный код из письма
              </p>
            </div>

            {/* Поля для ввода кода */}
            <div className="grid grid-cols-6 gap-3 mb-4">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="h-14 rounded-xl border border-gray-200 bg-white text-center text-xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              ))}
            </div>

            {/* Сообщения об ошибках/успехе */}
            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${
                messageType === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            {/* Основная кнопка подтверждения */}
            <button
              onClick={() => handleSubmit(code.join(''))}
              disabled={loading || code.join('').length !== 6}
              className={`w-full rounded-xl px-6 py-3 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 mb-3 ${
                loading || code.join('').length !== 6
                  ? 'bg-primary-300 cursor-not-allowed'
                  : 'bg-primary-700 hover:bg-primary-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? 'Подтверждаем...' : 'Подтвердить email'}
            </button>

            {/* Кнопка повторной отправки */}
            <button
              onClick={handleResend}
              disabled={loading || resendTimer > 0}
              className={`w-full rounded-xl border border-gray-200 px-6 py-3 font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                loading || resendTimer > 0
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-primary-300'
              }`}
            >
              {loading ? 'Отправляем...' : resendTimer > 0 ? `Отправить ещё код (${resendTimer}с)` : 'Отправить код повторно'}
            </button>

            {/* Информация о коде */}
            <p className="mt-4 text-center text-sm text-gray-500">
              Код действителен 15 минут
            </p>

            {/* Ссылка на вход */}
            <div className="mt-6 text-center">
              <Link href="/login" style={{color: '#6334E5'}} className="text-sm font-medium transition-colors hover:opacity-80">
                ← Назад ко входу
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 