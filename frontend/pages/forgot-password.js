import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ErrorHandlers } from '../utils/apiErrorHandler';

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
      const response = await fetch('/api/auth/forgot-password', {
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
        const errorMessage = ErrorHandlers.auth.forgotPassword(data);
        setMessage(errorMessage);
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
    <>
      <Head>
        <title>Восстановление пароля - ReplyX</title>
        <meta name="description" content="Восстановите доступ к аккаунту ReplyX. Получите инструкции по сбросу пароля на email." />
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
                  Восстановление пароля
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Правая панель — форма восстановления пароля в стиле дашборда */}
      <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
            {/* Welcome Section в стиле дашборда */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H7l5 4 4-4H13l-1.757-3.257A6 6 0 0115 5z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Восстановление пароля</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Введите email для получения инструкций
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>

              {/* Сообщения об ошибках/успехе */}
              {message && (
                <div className={`rounded-xl px-4 py-3 text-sm ${
                  messageType === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              {/* Основная кнопка отправки */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl px-6 py-3 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                  isLoading
                    ? 'bg-primary-300 cursor-not-allowed'
                    : 'bg-primary-700 hover:bg-primary-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? 'Отправляем...' : 'Отправить инструкции'}
              </button>

            </form>

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