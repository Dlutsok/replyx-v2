import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { ErrorHandlers } from '../utils/apiErrorHandler';

export default function ResetPassword() {
    const router = useRouter();
    const { token } = router.query;
    
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [tokenValid, setTokenValid] = useState(null);
    
    // Проверяем токен при загрузке страницы
    useEffect(() => {
        if (token) {
            validateToken();
        }
    }, [token]);
    
    const validateToken = async () => {
        try {
            const response = await fetch('/api/auth/validate-reset-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });
            
            if (response.ok) {
                setTokenValid(true);
            } else {
                setTokenValid(false);
                const data = await response.json();
                const errorMessage = ErrorHandlers.auth.validateToken(data);
                setError(errorMessage);
            }
        } catch (err) {
            setTokenValid(false);
            setError('Ошибка при проверке токена');
        }
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }
        
        if (formData.newPassword.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    new_password: formData.newPassword
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('Пароль успешно изменён! Перенаправляем на страницу входа...');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                const errorMessage = ErrorHandlers.auth.resetPassword(data);
                setError(errorMessage);
            }
        } catch (err) {
            setError('Ошибка соединения с сервером');
        }
        
        setLoading(false);
    };
    
    if (!token) {
        return (
            <>
                <Head>
                    <title>Сброс пароля - ReplyX</title>
                    <meta name="description" content="Создайте новый пароль для вашего аккаунта ReplyX." />
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
                            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl">
                                <Image src="/favicon.svg" alt="ReplyX" width={32} height={32} />
                            </div>
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
                                            Сброс пароля
                                        </div>
                                    </div>

                                    {/* Описание */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
                                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                                            Токен для сброса пароля не найден. Попробуйте перейти по ссылке из email еще раз.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Правая панель — ошибка в стиле дашборда */}
                    <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
                        <div className="w-full max-w-md">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
                                <div className="text-center mb-6">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <Link href="/" className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </Link>
                                        <h2 className="text-lg font-semibold text-gray-900">Ошибка</h2>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        Токен не найден в URL
                                    </p>
                                </div>

                                <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700 mb-4">
                                    Токен для сброса пароля не найден в URL
                                </div>

                                <Link href="/forgot-password" className="w-full rounded-xl px-6 py-3 bg-primary-700 text-white font-semibold transition-all duration-200 hover:bg-primary-800 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H7l5 4 4-4H13l-1.757-3.257A6 6 0 0115 5z" />
                                    </svg>
                                    Запросить новую ссылку
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (tokenValid === false) {
        return (
            <>
                <Head>
                    <title>Сброс пароля - ReplyX</title>
                    <meta name="description" content="Создайте новый пароль для вашего аккаунта ReplyX." />
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
                            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl">
                                <Image src="/favicon.svg" alt="ReplyX" width={32} height={32} />
                            </div>
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
                                            Сброс пароля
                                        </div>
                                    </div>

                                    {/* Описание */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
                                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                                            Ссылка для сброса пароля истекла или недействительна. Запросите новую ссылку.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Правая панель — ошибка в стиле дашборда */}
                    <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
                        <div className="w-full max-w-md">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
                                <div className="text-center mb-6">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <Link href="/" className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </Link>
                                        <h2 className="text-lg font-semibold text-gray-900">Ошибка</h2>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        Ссылка недействительна
                                    </p>
                                </div>

                                <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700 mb-4">
                                    {error}
                                </div>

                                <Link href="/forgot-password" className="w-full rounded-xl px-6 py-3 bg-primary-700 text-white font-semibold transition-all duration-200 hover:bg-primary-800 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H7l5 4 4-4H13l-1.757-3.257A6 6 0 0115 5z" />
                                    </svg>
                                    Запросить новую ссылку
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (tokenValid === null) {
        return (
            <>
                <Head>
                    <title>Сброс пароля - ReplyX</title>
                    <meta name="description" content="Создайте новый пароль для вашего аккаунта ReplyX." />
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
                            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl">
                                <Image src="/favicon.svg" alt="ReplyX" width={32} height={32} />
                            </div>
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
                                            Сброс пароля
                                        </div>
                                    </div>

                                    {/* Описание */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
                                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                                            Проверяем токен для сброса пароля...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Правая панель — загрузка в стиле дашборда */}
                    <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
                        <div className="w-full max-w-md">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
                                <div className="text-center mb-6">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <Link href="/" className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </Link>
                                        <h2 className="text-lg font-semibold text-gray-900">Загрузка</h2>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        Проверка токена
                                    </p>
                                </div>

                                <div className="flex justify-center">
                                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    
    return (
        <>
            <Head>
                <title>Сброс пароля - ReplyX</title>
                <meta name="description" content="Создайте новый пароль для вашего аккаунта ReplyX." />
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
                        <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl">
                            <Image src="/favicon.svg" alt="ReplyX" width={32} height={32} />
                        </div>
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
                                        Новый пароль
                                    </div>
                                </div>


                            </div>
                        </div>
                    </div>
                </div>

                {/* Правая панель — форма сброса пароля в стиле дашборда */}
                <div className="flex items-center justify-center px-4 sm:px-6 xl:px-8 py-6 bg-white">
                    <div className="w-full max-w-md">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 sm:p-8">
                                                            {/* Welcome Section в стиле дашборда */}
                                <div className="text-center mb-6">
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <Link href="/" className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </Link>
                                    <h2 className="text-lg font-semibold text-gray-900">Создание нового пароля</h2>
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Введите новый пароль
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        placeholder="Минимум 6 символов"
                                        required
                                        minLength="6"
                                        disabled={loading}
                                        className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите пароль</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Повторите новый пароль"
                                        required
                                        minLength="6"
                                        disabled={loading}
                                        className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Сообщения об ошибках/успехе */}
                                {message && (
                                    <div className="rounded-xl px-4 py-3 text-sm bg-green-50 border border-green-200 text-green-700">
                                        {message}
                                    </div>
                                )}

                                {error && (
                                    <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
                                        {error}
                                    </div>
                                )}

                                {/* Основная кнопка сброса */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full rounded-xl px-6 py-3 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                                        loading
                                            ? 'bg-primary-300 cursor-not-allowed'
                                            : 'bg-primary-700 hover:bg-primary-800 shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {loading ? 'Изменение пароля...' : 'Изменить пароль'}
                                </button>

                            </form>

                            {/* Ссылка на вход */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600">
                                    Вспомнили пароль?{' '}
                                    <Link href="/login" style={{color: '#6334E5'}} className="font-medium transition-colors hover:opacity-80">
                                        Войти
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 