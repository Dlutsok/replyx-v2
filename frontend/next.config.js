/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Настройки для продакшена
  experimental: {
    // appDir: false  // Удалено, так как не нужно в новых версиях Next.js
  },
  
  // Настройки изображений
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  
  // Настройки переписывания путей для API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  
  // CORS и безопасность
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Изменено с DENY для поддержки iframe виджетов
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
        // Разрешаем iframe для chat-iframe страницы
        source: '/chat-iframe',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
  
  // Настройки сборки
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
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