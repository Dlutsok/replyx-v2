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
  
  // CORS и безопасность
  async headers() {
    return [
      {
        // Для iframe страниц - разрешаем загрузку из любого источника
        source: '/chat-iframe',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *;",
          },
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