import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Montserrat } from 'next/font/google';
import { useRouter } from 'next/router';
import Script from 'next/script';
import DashboardLayout from '../components/layout/DashboardLayout';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ThemeProvider } from '../components/ui/ThemeProvider';
import '../styles/globals.css';

const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'] });

// Публичные маршруты (не показываем Layout)
const PUBLIC_ROUTES = [
  '/',
  '/landing',
  '/login',
  '/register', 
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/oauth-redirect'
];

// Админские маршруты (имеют свой собственный layout)
const ADMIN_ROUTES = [
  '/admin'
];

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  
  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);
  const isAdminRoute = ADMIN_ROUTES.includes(router.pathname);
  const isChatIframe = router.pathname === '/chat-iframe';
  const shouldShowLayout = isAuthenticated && !isPublicRoute && !isAdminRoute;

  // Принудительное перенаправление неавторизованных пользователей
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      console.warn('Unauthorized user on protected route, forcing redirect to landing');
      // Используем window.location.replace для мгновенного перенаправления
      window.location.replace('/landing');
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Дополнительная проверка - блокируем показ контента неавторизованным пользователям
  const shouldBlockContent = !isAuthenticated && !isPublicRoute && !isLoading;

  // Если загружается авторизация - показываем loading
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6366f1',
        fontFamily: montserrat.style.fontFamily
      }}>
        Загрузка...
      </div>
    );
  }

  // Для авторизованных пользователей на публичных страницах - немедленный редирект без показа сообщения
  if (isPublicRoute && isAuthenticated && router.pathname !== '/oauth-redirect') {
    router.replace('/dashboard');
    return null; // Просто возвращаем null без показа сообщения
  }

  // Для iframe чата показываем компонент без Layout и без проверок
  if (isChatIframe) {
    return <Component {...pageProps} />;
  }

  // Для публичных маршрутов показываем компонент без Layout
  if (isPublicRoute) {
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
    window.location.replace('/landing');
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#ef4444',
        backgroundColor: '#fff'
      }}>
        Доступ запрещен. Перенаправляем...
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
      <main className={montserrat.className}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent {...props} />
          </AuthProvider>
        </ThemeProvider>
      </main>
    </>
  );
}