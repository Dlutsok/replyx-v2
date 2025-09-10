import { createProxyMiddleware } from 'http-proxy-middleware';

const proxy = createProxyMiddleware({
  target: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/dialogs': '/api/dialogs', // Убираем префикс если нужно
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Proxy error' });
  },
  onProxyReq: (proxyReq, req, res) => {
  },
  onProxyRes: (proxyRes, req, res) => {
    // Для SSE запросов устанавливаем правильные заголовки
    if (req.url.includes('/events')) {
      proxyRes.headers['cache-control'] = 'no-cache';
      proxyRes.headers['connection'] = 'keep-alive';
      proxyRes.headers['content-type'] = 'text/event-stream';
      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-headers'] = 'Last-Event-ID, Cache-Control';
    }
  },
  // Важно для SSE: не буферизовать ответ
  buffer: false,
  // Для SSE потоков
  selfHandleResponse: false,
  // Таймаут для длительных SSE соединений
  timeout: 0,
});

export default function handler(req, res) {
  // Отключаем Next.js body parsing для прокси
  return proxy(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
