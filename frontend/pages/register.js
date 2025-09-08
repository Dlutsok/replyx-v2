import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../hooks/useAuth';
import API_CONFIG, { createApiUrl } from '../config/api';
import { validateRegistrationForm } from '../utils/validation';
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
    <>
      <Head>
        <title>Регистрация аккаунта - ReplyX</title>
        <meta name="description" content="Создайте аккаунт ReplyX для доступа к AI-ассистентам и управления диалогами." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Левая панель с градиентным фоном в стиле дашборда */}
      <div className="relative hidden lg:block overflow-hidden">
        {/* Градиентный фон в стиле дашборда */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-purple-50" />

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
                  Регистрация нового аккаунта
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Правая панель — форма регистрации в стиле дашборда */}
      <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
            {/* Welcome Section в стиле дашборда */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Создать аккаунт</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Заполните данные для регистрации
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Иван"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                <div className="relative">
                  <input
                    id="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="Не менее 8 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                    aria-label="Показать пароль"
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isPasswordVisible ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05m1.829 1.829l4.242 4.242M12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-1.563 3.029m-5.858-.908a3 3 0 01-4.243-4.243" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите пароль</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                    aria-label="Показать пароль"
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isConfirmPasswordVisible ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05m1.829 1.829l4.242 4.242M12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-1.563 3.029m-5.858-.908a3 3 0 01-4.243-4.243" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {message && (
                <div className={`rounded-xl px-4 py-3 text-sm ${
                  messageType === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl px-6 py-3 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                  isLoading
                    ? 'bg-primary-300 cursor-not-allowed'
                    : 'bg-primary-700 hover:bg-primary-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
              </button>

            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Уже есть аккаунт?{' '}
                <Link href="/login" style={{color: '#6334E5'}} className="font-medium transition-colors hover:opacity-80">
                  Войти
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500">
              Регистрируясь, вы соглашаетесь с{' '}
              <Link href="/legal/terms" style={{color: '#6334E5'}} className="underline-offset-2 hover:underline">
                Условиями использования
              </Link>{' '}и{' '}
              <Link href="/legal/privacy" style={{color: '#6334E5'}} className="underline-offset-2 hover:underline">
                Политикой конфиденциальности
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}