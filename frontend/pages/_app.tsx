import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Manrope } from 'next/font/google';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { DashboardLayout } from '@/components/layout';
import { AuthProvider, useAuth, GlobalLoadingProvider } from '@/hooks';
import { ThemeProvider } from '@/components/ui';
import { CookieConsent } from '@/components/common';
import { NotificationProvider } from '../contexts/NotificationContext';
import '../styles/globals.css';

// Import global styles for specific pages
import '../styles/pages/AssistantPage.global.css';

const manrope = Manrope({ subsets: ['latin', 'cyrillic'] });

// Публичные маршруты (не показываем Layout)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email'
];

// Правовые и контент-маркетинговые страницы (доступны всем, включая авторизованных пользователей)
const LEGAL_ROUTES = [
  '/privacy',
  '/cookies',
  '/legal',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/terms',
  '/legal/offer',
  '/terms',
  '/offer',
  '/help-center',
  '/blog'
];

// Админские маршруты (имеют свой собственный layout)
const ADMIN_ROUTES = [
  '/admin',
  '/admin-users',
  '/admin-analytics',
  '/admin-bots-monitoring',
  '/admin-ai-tokens',
  '/admin-system',
  '/admin-settings'
];

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  
  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
  const isLegalRoute = LEGAL_ROUTES.includes(router.pathname);
  const isAdminRoute = ADMIN_ROUTES.includes(router.pathname);
  const isChatIframe = router.pathname === '/chat-iframe';
  const shouldShowLayout = isAuthenticated && !isPublicRoute && !isLegalRoute && !isAdminRoute;

  // Принудительное перенаправление неавторизованных пользователей
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute && !isLegalRoute && !isChatIframe) {
      console.warn('Unauthorized user on protected route, forcing redirect to home');
      // Используем window.location.replace для мгновенного перенаправления
      window.location.replace('/');
    }
  }, [isAuthenticated, isLoading, isPublicRoute, isLegalRoute, isChatIframe, router]);

  // Дополнительная проверка - блокируем показ контента неавторизованным пользователям
  const shouldBlockContent = !isAuthenticated && !isPublicRoute && !isLegalRoute && !isChatIframe && !isLoading;

  // Если загружается авторизация - показываем loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-purple-600 font-medium">Загрузка приложения...</p>
          <p className="text-sm text-gray-500 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  // Для авторизованных пользователей на публичных страницах (кроме правовых) - немедленный редирект
  if (isPublicRoute && isAuthenticated && !isLegalRoute) {
    router.replace('/dashboard');
    return null; // Просто возвращаем null без показа сообщения
  }

  // Для iframe чата показываем компонент без Layout и без проверок
  if (isChatIframe) {
    return <Component {...pageProps} />;
  }

  // Для публичных и правовых маршрутов показываем компонент без Layout
  if (isPublicRoute || isLegalRoute) {
    return <Component {...pageProps} />;
  }

  // Для админских маршрутов показываем компонент без DashboardLayout (у них свой layout)
  if (isAdminRoute && isAuthenticated) {
    return <Component {...pageProps} />;
  }

  // Для защищенных маршрутов показываем Layout только если авторизован
  if (shouldShowLayout) {
    return (
      <DashboardLayout>
        <Component {...pageProps} />
      </DashboardLayout>
    );
  }

  // КРИТИЧНО: Если пользователь не авторизован на защищенном маршруте - мгновенно блокируем
  if (shouldBlockContent) {
    console.warn('BLOCKING unauthorized access to protected content');
    // Мгновенное перенаправление без ожидания
    window.location.replace('/');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-purple-600 font-medium">Перенаправление...</p>
          <p className="text-sm text-gray-500 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function App(props: AppProps) {
  return (
    <>
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                var initialTheme = theme || systemTheme;
                document.documentElement.setAttribute('data-theme', initialTheme);
              } catch (e) {}
            })();
          `,
        }}
      />
      <main className={manrope.className}>
        <ThemeProvider>
          <GlobalLoadingProvider>
            <AuthProvider>
              <NotificationProvider>
                <AppContent {...props} />
                <CookieConsent />
              </NotificationProvider>
            </AuthProvider>
          </GlobalLoadingProvider>
        </ThemeProvider>
      </main>
    </>
  );
}