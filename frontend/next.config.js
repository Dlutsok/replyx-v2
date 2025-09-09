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
  
  // Заголовки безопасности (БЕЗ CORS - используем DynamicCORSMiddleware в бэкенде)
  async headers() {
    return [
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
              ? "frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; connect-src 'self' http://localhost:* https: wss: ws: https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru;" 
              : "frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru; connect-src 'self' https: wss: ws: https://*.tbank.ru https://*.tinkoff.ru https://*.tcsbank.ru https://*.nspk.ru https://*.t-static.ru;",
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