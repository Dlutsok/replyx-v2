const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Настройки для продакшена
  output: 'standalone', // Для Docker контейнеризации
  compress: true,
  
  experimental: {
    // appDir: false  // Удалено, так как не нужно в новых версиях Next.js
  },
  
  // Настройки изображений
  images: {
    domains: ['localhost', 'replyx.ru', 'www.replyx.ru'],
    unoptimized: true
  },
  
  // Настройки переписывания путей для API (только для разработки)
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    },
  }),
  
  // Заголовки безопасности и SEO (БЕЗ CORS - используем DynamicCORSMiddleware в бэкенде)
  async headers() {
    return [
      {
        // SEO заголовки для публичных страниц
        source: '/((?!dashboard|admin|dialogs|balance|usage|database-explorer|ai-assistant|ai-tokens|login|register|forgot-password|reset-password|verify-email|logout|chat-iframe|test-admin-tokens|payment-success|payment-error|assistant).*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        // SEO блокировка для страниц личного кабинета
        source: '/(dashboard|admin|dialogs|balance|usage|database-explorer|ai-assistant|ai-tokens|login|register|forgot-password|reset-password|verify-email|logout|chat-iframe|test-admin-tokens|payment-success|payment-error|assistant)/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        // Для iframe страниц - только базовые заголовки безопасности (CSP устанавливается динамически через backend)
        source: '/chat-iframe',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy', 
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        // Для всех остальных страниц - стандартные заголовки безопасности
        source: '/((?!chat-iframe).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com https://yastatic.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://yookassa.ru https://*.yoomoney.ru; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com; connect-src 'self' http://localhost:* https: wss: ws: https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com; img-src 'self' data: https://mc.yandex.ru https://mc.yandex.com https://yastatic.net;"
              : "frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com https://yastatic.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://yookassa.ru https://*.yoomoney.ru; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com; connect-src 'self' https: wss: ws: https://yookassa.ru https://*.yoomoney.ru https://mc.yandex.ru https://mc.yandex.com; img-src 'self' data: https://mc.yandex.ru https://mc.yandex.com https://yastatic.net;",
          },
        ],
      },
    ];
  },
  
  // Настройки сборки
  webpack: (config) => {
    // Исправляем проблемы с модулями
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  // Настройки для разработки
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
};

module.exports = nextConfig; 