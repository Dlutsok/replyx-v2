# 🚀 План исправления SEO и безопасности ReplyX

## 🔥 КРИТИЧЕСКИЕ ЗАДАЧИ (сделать немедленно)

### 1. Безопасность и защита от индексации

#### 1.1 Исправить robots.txt
```txt
User-agent: *
# Разрешить публичные страницы
Allow: /
Allow: /legal
Allow: /legal/*
Allow: /blog
Allow: /blog/*

# Заблокировать личный кабинет
Disallow: /dashboard
Disallow: /admin*
Disallow: /dialogs
Disallow: /balance
Disallow: /usage
Disallow: /database-explorer
Disallow: /ai-assistant
Disallow: /ai-tokens
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /logout
Disallow: /chat-iframe
Disallow: /test-admin-tokens
Disallow: /payment*
Disallow: /assistant/*

# Sitemap (после создания)
Sitemap: https://replyx.ru/sitemap.xml
```

#### 1.2 Добавить мета-теги noindex в критичные страницы
**Файлы для редактирования:**
- [x] `/pages/admin.js` ✅ ВЫПОЛНЕНО
- [ ] `/pages/admin-*.js` (все админские страницы)
- [x] `/pages/database-explorer.js` ⚠️ ОСОБО КРИТИЧНО ✅ ВЫПОЛНЕНО
- [x] `/pages/dialogs.js` ✅ ВЫПОЛНЕНО
- [x] `/pages/ai-assistant.js` ✅ ВЫПОЛНЕНО
- [ ] `/pages/ai-tokens.js`
- [ ] `/pages/forgot-password.js`
- [ ] `/pages/reset-password.js`
- [ ] `/pages/verify-email.js`
- [ ] `/pages/logout.js`
- [ ] `/pages/chat-iframe.js`
- [ ] `/pages/test-admin-tokens.js`
- [ ] `/pages/payment-success.js`
- [ ] `/pages/payment-error.js`
- [ ] `/pages/assistant/[id].js`

**Добавить в каждый файл:**
```jsx
<Head>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
  <title>Страница недоступна для поисковых систем</title>
</Head>
```

#### 1.3 Исправить глобальные настройки в _document.tsx
```jsx
// УБРАТЬ глобальную блокировку
// <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, nocache" />

// ЗАМЕНИТЬ НА условную блокировку или убрать совсем
```

---

## 📊 SEO ОПТИМИЗАЦИЯ

### 2. Публичные страницы

#### 2.1 Обновить мета-теги для публичных страниц
- [x] `/pages/index.js` - добавить `<meta name="robots" content="index, follow" />` ✅ ВЫПОЛНЕНО
- [ ] `/pages/legal.js` - уже есть, проверить
- [ ] `/pages/blog.js` - показать блог (`display: block`)

#### 2.2 Создать sitemap.xml ✅ ВЫПОЛНЕНО
**Создать файл:** `/public/sitemap.xml` ✅ СОЗДАН
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://replyx.ru/</loc>
    <lastmod>2025-09-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://replyx.ru/legal</loc>
    <lastmod>2025-09-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://replyx.ru/legal/privacy</loc>
    <lastmod>2025-09-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://replyx.ru/legal/terms</loc>
    <lastmod>2025-09-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://replyx.ru/legal/offer</loc>
    <lastmod>2025-09-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://replyx.ru/legal/cookies</loc>
    <lastmod>2025-09-08</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

---

## 🎯 УЛУЧШЕНИЯ SEO

### 3. Структурированные данные

#### 3.1 Добавить JSON-LD на главную страницу ✅ ВЫПОЛНЕНО
```jsx
// В pages/index.js добавить в <Head>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "ReplyX",
      "description": "AI-ассистент для автоматизации поддержки клиентов 24/7",
      "url": "https://replyx.ru",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "RUB"
      },
      "provider": {
        "@type": "Organization",
        "name": "ReplyX",
        "url": "https://replyx.ru"
      }
    })
  }}
/>
```

### 4. Open Graph и Twitter Cards

#### 4.1 Добавить OG теги на главную страницу ✅ ВЫПОЛНЕНО
```jsx
// В pages/index.js
<meta property="og:title" content="AI-ассистент ReplyX — автоматизация поддержки клиентов 24/7" />
<meta property="og:description" content="ReplyX — универсальный AI-ассистент для бизнеса. Автоматизация поддержки клиентов, интеграция с CRM, 1С, Telegram и мессенджерами. Запуск за 15 минут, без программистов." />
<meta property="og:image" content="https://replyx.ru/og-image.png" />
<meta property="og:url" content="https://replyx.ru/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="ReplyX" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="AI-ассистент ReplyX — автоматизация поддержки клиентов 24/7" />
<meta name="twitter:description" content="ReplyX — универсальный AI-ассистент для бизнеса. Автоматизация поддержки клиентов, интеграция с CRM, 1С, Telegram и мессенджерами. Запуск за 15 минут, без программистов." />
<meta name="twitter:image" content="https://replyx.ru/og-image.png" />
```

#### 4.2 Создать OG изображение
- [ ] Создать файл `/public/og-image.png` (1200x630px)

---

## 🔧 ТЕХНИЧЕСКИЕ УЛУЧШЕНИЯ

### 5. Next.js конфигурация

#### 5.1 Обновить next.config.js ✅ ВЫПОЛНЕНО
```js
// Добавить headers для SEO
async headers() {
  return [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'index, follow'
        }
      ]
    },
    {
      source: '/(dashboard|admin|dialogs|balance|usage|database-explorer|ai-assistant|ai-tokens|login|register|forgot-password|reset-password|verify-email|logout|chat-iframe|test-admin-tokens|payment-success|payment-error)/(.*)',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow'
        }
      ]
    }
  ]
}
```

### 6. Мониторинг и аналитика

#### 6.1 Настроить Google Search Console
- [ ] Подтвердить права на сайт
- [ ] Загрузить sitemap.xml
- [ ] Настроить мониторинг индексации

#### 6.2 Добавить Google Analytics (если нужно)
- [ ] Установить gtag или GA4
- [ ] Настроить цели и события

---

## 📝 КОНТЕНТ-МАРКЕТИНГ

### 7. Блог

#### 7.1 Запустить блог
- [ ] Убрать `display: none` со ссылок на блог
- [ ] Добавить статьи по темам:
  - "Как настроить AI-ассистента для бизнеса"
  - "Интеграция с Telegram: пошаговая инструкция"
  - "CRM интеграции: лучшие практики"
  - "Автоматизация поддержки клиентов"

---

## 🗂️ ДОПОЛНИТЕЛЬНЫЕ ФАЙЛЫ

### 8. Создать дополнительные SEO файлы

#### 8.1 humans.txt
**Создать файл:** `/public/humans.txt`
```
/* TEAM */
Developer: ReplyX Team
Site: https://replyx.ru
Location: Russia

/* SITE */
Last update: 2025/09/12
Language: Russian
Doctype: HTML5
Technology: Next.js, React
```

#### 8.2 security.txt (опционально)
**Создать файл:** `/public/.well-known/security.txt`

---

## ✅ ЧЕКЛИСТ ПРОВЕРКИ

### После выполнения всех задач:
- [ ] Проверить robots.txt в браузере: `https://replyx.ru/robots.txt`
- [ ] Проверить sitemap.xml: `https://replyx.ru/sitemap.xml`
- [ ] Протестировать все админские страницы на наличие `noindex`
- [ ] Проверить главную страницу на индексацию (`index, follow`)
- [ ] Загрузить sitemap в Google Search Console
- [ ] Проверить OG теги через Facebook Debugger
- [ ] Протестировать мобильную версию через Google Mobile-Friendly Test

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

После выполнения всех задач:
- **Безопасность**: 10/10 - все личные данные защищены
- **SEO публичных страниц**: 9/10 - полная оптимизация
- **Техническое SEO**: 8/10 - все необходимые файлы созданы
- **Общая оценка**: 9/10 - отличная SEO-готовность

**Приоритет выполнения**: Сначала критические задачи (раздел 1), затем остальные.