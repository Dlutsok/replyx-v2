# 🌐 ReplyX Widget - Документация

**Полное руководство по интеграции и использованию ReplyX виджета на вашем сайте**

ReplyX Widget — это мощный iframe-виджет для интеграции AI чата на любой веб-сайт. Поддерживает realtime общение, передачу операторам, адаптивный дизайн и глубокую кастомизацию.

---

## 🚀 Быстрый старт

### 1. Получение embed кода

```bash
curl -X GET "https://api.replyx.com/api/embed-code?theme=blue" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Интеграция на сайт

```html
<!-- Плавающий виджет (рекомендуется) -->
<div id="replyx-widget" data-assistant="456" data-token="jwt_token" data-theme="blue"></div>
<script src="https://app.replyx.com/widget.js?token=jwt_token&assistant_id=456&theme=blue&host=https://app.replyx.com"></script>
```

### 3. Готово! 🎉

Виджет автоматически появится в правом нижнем углу и будет готов к общению.

---

## 🏗️ Архитектура

### Многоуровневая структура

```
┌─────────────────────────────────────────┐
│           Родительский сайт              │  ← Ваш сайт
├─────────────────────────────────────────┤
│ widget.js (внешний скрипт)              │  ← Загружается асинхронно
│ ┌─────────────────────────────────────┐ │
│ │      iframe (chat-iframe.js)        │ │  ← Изолированное окружение
│ │ ┌─────────────────────────────────┐ │ │
│ │ │    React чат компонент          │ │ │  ← Next.js приложение
│ │ │ ├─── WebSocket реального времени│ │ │
│ │ │ ├─── REST API запросы           │ │ │
│ │ │ └─── Адаптивный UI интерфейс    │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Ключевые компоненты

1. **widget.js** — Внешний скрипт для интеграции
2. **chat-iframe.js** — React компонент чата
3. **Backend API** — FastAPI сервер с WebSocket
4. **База знаний** — RAG система для контекстных ответов

---

## ⚙️ Конфигурация

### URL параметры виджета

| Параметр | Описание | По умолчанию |
|----------|----------|-------------|
| `api` | URL backend API | `http://localhost:8000` |
| `token` | Site token для авторизации | — |
| `assistant_id` | ID ассистента | — |
| `theme` | Цветовая тема | `blue` |
| `type` | Тип виджета | `floating` |
| `position` | Позиция на странице | `bottom-right` |
| `buttonSize` | Размер кнопки (px) | `80` |
| `host` | Frontend URL | Автоопределение |

### Цветовые темы

```html
<!-- Синяя тема (деловая) -->
<script src="...&theme=blue"></script>

<!-- Зеленая тема (экологичная) -->
<script src="...&theme=green"></script>

<!-- Фиолетовая тема (креативная) -->
<script src="...&theme=purple"></script>

<!-- Оранжевая тема (энергичная) -->
<script src="...&theme=orange"></script>
```

### Типы виджета

#### 1. Плавающий виджет (рекомендуется)
```html
<script src="...&type=floating&position=bottom-right"></script>
```

#### 2. Встроенный виджет
```html
<div id="chat-container"></div>
<script src="...&type=embedded"></script>
```

#### 3. Полноэкранный виджет
```html
<script src="...&type=fullscreen"></script>
```

---

## 🔑 Режимы авторизации

### 1. Site Token режим (рекомендуется)

**Для сайтов с пользовательской системой**

```javascript
// Получение site token
const response = await fetch('/api/embed-code', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assistant_id: 456
  })
});

const {site_token} = await response.json();

// Интеграция
const script = document.createElement('script');
script.src = `https://app.replyx.com/widget.js?token=${site_token}&theme=blue`;
document.head.appendChild(script);
```

### 2. Assistant ID режим

**Для простых сайтов без авторизации**

```html
<script src="https://app.replyx.com/widget.js?assistant_id=456&theme=blue"></script>
```

---

## 🎨 Кастомизация UI

### CSS переменные

```css
:root {
  --widget-primary-color: #667eea;
  --widget-secondary-color: #764ba2;
  --widget-border-radius: 12px;
  --widget-shadow: 0 12px 40px rgba(0,0,0,0.2);
}
```

### Позиционирование

```html
<!-- Левый нижний угол -->
<script src="...&position=bottom-left"></script>

<!-- По центру снизу -->
<script src="...&position=bottom-center"></script>

<!-- Правый нижний угол -->
<script src="...&position=bottom-right"></script>
```

### Размер кнопки

```html
<!-- Маленькая кнопка -->
<script src="...&buttonSize=60"></script>

<!-- Стандартная кнопка -->
<script src="...&buttonSize=80"></script>

<!-- Большая кнопка -->
<script src="...&buttonSize=100"></script>
```

---

## 📱 Адаптивность

### Автоматическая адаптация

Виджет автоматически адаптируется под размер экрана:

- **Desktop** — Плавающее окно 400x600px
- **Mobile (≤768px)** — Полноэкранный режим
- **Safari** — Специальные обходы для совместимости

### Медиа-запросы

```css
@media (max-width: 480px) {
  .replyx-chat-container {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
}
```

---

## ⚡ Realtime возможности

### WebSocket события

Виджет получает события в реальном времени:

```javascript
// Начало печати
{type: "typing_start"}

// Окончание печати  
{type: "typing_stop"}

// Новое сообщение
{
  message: {
    id: 123,
    sender: "assistant",
    text: "Привет! Как дела?",
    timestamp: "2025-01-23T10:00:00Z"
  }
}

// Передача оператору
{type: "handoff_requested", message: "Передаем оператору..."}
{type: "handoff_started", message: "Оператор подключился"}
{type: "handoff_released", message: "Диалог возвращен к AI-ассистенту"}
```

### Handoff система

**Автоматические триггеры:**
- Ключевые слова: `оператор`, `человек`, `менеджер`, `поддержка`
- Ручной вызов через кнопку в интерфейсе

**Статусы передачи:**
- `none` — Обычный режим (AI отвечает)
- `requested` — Запрошен оператор (ожидание)
- `active` — Активная работа оператора
- `released` — Возврат к AI

---

## 🤖 AI интеграция

### RAG система

Виджет автоматически использует базу знаний для контекстных ответов:

```python
# Поиск релевантного контекста
relevant_chunks = embeddings_service.search_relevant_chunks(
    query=user_message,
    user_id=current_user.id,
    assistant_id=target_assistant.id,
    top_k=5,
    min_similarity=0.75
)
```

### Модели AI

Поддерживаемые модели:
- `gpt-4o-mini` (рекомендуется)
- `gpt-4o`
- `gpt-3.5-turbo`

---

## 🔐 Безопасность

### JWT токены

```javascript
// Site token (бессрочный)
{
  user_id: 123,
  assistant_id: 456,
  type: 'site'
  // без exp - токен действует пока существует ассистент
}
```

### CORS настройки

```python
CORS_ORIGINS = [
    "https://yoursite.com",
    "http://localhost:3000"  # для разработки
]
```

### Rate limiting

- **60 запросов/минуту** на IP
- **1000 сообщений/месяц** на пользователя (базовый тариф)

---

## 📊 Мониторинг

### События для аналитики

```javascript
// Слушаем события виджета
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.replyx.com') return;
  
  switch (event.data.type) {
    case 'replyX_message_sent':
      // Пользователь отправил сообщение
      analytics.track('Widget Message Sent', {
        text: event.data.text,
        timestamp: event.data.timestamp
      });
      break;
      
    case 'replyX_message_received':
      // Получен ответ от AI
      analytics.track('Widget AI Response', {
        text: event.data.text,
        timestamp: event.data.timestamp
      });
      break;
      
    case 'replyX_operator_message_received':
      // Сообщение от оператора
      analytics.track('Widget Operator Message', {
        text: event.data.text,
        timestamp: event.data.timestamp
      });
      break;
  }
});
```

### Метрики производительности

```javascript
// Время загрузки виджета
performance.mark('widget-start');
// После инициализации
performance.mark('widget-ready');
performance.measure('widget-load-time', 'widget-start', 'widget-ready');
```

---

## 🛠️ Разработка и отладка

### Dev-only режим

```html
<!-- Показывать только разработчикам -->
<script src="...&devOnly=true&devKey=secret123"></script>

<script>
// В localStorage разработчика
localStorage.setItem('CHAT_AI_DEV_KEY', 'secret123');
</script>
```

### Debug логи

```javascript
// В консоли браузера
console.log('[ReplyX Widget] Configuration:', config);
console.log('[ReplyX iframe] API_URL:', API_URL);
console.log('📨 [Widget] WebSocket message received:', data);
```

### Тестирование

```bash
# Тест загрузки виджета
curl -I "https://app.replyx.com/widget.js"

# Тест API
curl "https://api.replyx.com/api/widget/dialogs?assistant_id=456&guest_id=test"
```

---

## 🚨 Troubleshooting

### Частые проблемы

#### 1. Виджет не загружается

```javascript
// Проверка CSP заголовков
Content-Security-Policy: frame-src https://app.replyx.com;
                        script-src https://app.replyx.com;

// Проверка в консоли
console.log(window.ReplyXWidget);
```

#### 2. WebSocket не подключается

```javascript
// Проверка сети
fetch('https://api.replyx.com/health')
  .then(r => console.log('API доступно'))
  .catch(e => console.log('API недоступно:', e));

// Проверка токена
console.log('Site token valid:', siteToken);
```

#### 3. Сообщения не отправляются

```javascript
// Проверка guest_id
const guestId = localStorage.getItem('guest_id');
console.log('Guest ID:', guestId);

// Проверка dialog_id
console.log('Dialog ID:', dialogId);
```

### Коды ошибок

| Код | Описание | Решение |
|-----|----------|---------|
| 400 | Неверные параметры | Проверить assistant_id/token |
| 401 | Не авторизован | Обновить site_token |
| 404 | Ассистент не найден | Проверить assistant_id |
| 429 | Превышен лимит | Ждать или обновить тариф |
| 500 | Ошибка сервера | Связаться с поддержкой |

---

## 📈 Оптимизация производительности

### Ленивая загрузка

```javascript
// Загрузка по клику
document.getElementById('chat-btn').addEventListener('click', () => {
  if (!window.ReplyXWidget) {
    const script = document.createElement('script');
    script.src = 'https://app.replyx.com/widget.js?...';
    document.head.appendChild(script);
  }
});
```

### Предзагрузка

```html
<!-- Предзагружаем скрипт -->
<link rel="preload" href="https://app.replyx.com/widget.js" as="script">

<!-- Предзагружаем iframe -->
<link rel="prefetch" href="https://app.replyx.com/chat-iframe">
```

### Кэширование

```javascript
// Service Worker кэширование
self.addEventListener('fetch', event => {
  if (event.request.url.includes('widget.js')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

---

## 🔗 API Reference

### Основные эндпоинты

```http
# Получение диалогов
GET /api/widget/dialogs?assistant_id={id}&guest_id={guid}

# Создание диалога  
POST /api/widget/dialogs?assistant_id={id}&guest_id={guid}

# Получение сообщений
GET /api/widget/dialogs/{dialog_id}/messages?assistant_id={id}&guest_id={guid}

# Отправка сообщения
POST /api/widget/dialogs/{dialog_id}/messages?assistant_id={id}&guest_id={guid}
Body: {"sender": "user", "text": "Привет!"}

# WebSocket подключение
WS /ws/widget/dialogs/{dialog_id}?assistant_id={id}
```

### Полный список API — [endpoints.md](../api/endpoints.md)

---

## 📚 Примеры интеграции

### React приложение

```jsx
import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.replyx.com/widget.js?assistant_id=456&theme=blue';
    script.async = true;
    document.body.appendChild(script);
    
    return () => document.body.removeChild(script);
  }, []);

  return <div>My React App</div>;
}
```

### Vue.js приложение

```vue
<template>
  <div>My Vue App</div>
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://app.replyx.com/widget.js?assistant_id=456&theme=green';
    document.body.appendChild(script);
  }
}
</script>
```

### WordPress плагин

```php
function replyx_widget_init() {
    $assistant_id = get_option('replyx_assistant_id', '456');
    $theme = get_option('replyx_theme', 'blue');
    
    wp_enqueue_script(
        'replyx-widget',
        "https://app.replyx.com/widget.js?assistant_id=$assistant_id&theme=$theme",
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'replyx_widget_init');
```

---

## 🎯 Use Cases

### 1. E-commerce поддержка

```html
<!-- Виджет с темой компании -->
<script src="https://app.replyx.com/widget.js?assistant_id=123&theme=orange&position=bottom-right"></script>
```

### 2. SaaS продукт

```javascript
// Показывать только авторизованным пользователям
if (user.isLoggedIn) {
  loadReplyXWidget({
    assistant_id: 456,
    theme: 'blue',
    userContext: {
      userId: user.id,
      plan: user.plan
    }
  });
}
```

### 3. Образовательная платформа

```html
<!-- Полноэкранный режим для курсов -->
<script src="https://app.replyx.com/widget.js?assistant_id=789&type=fullscreen&theme=purple"></script>
```

---

## 📞 Поддержка

### Получить помощь

- 📚 **Документация** — [docs.replyx.com](https://docs.replyx.com)
- 💬 **Чат поддержки** — Используйте виджет на нашем сайте
- 📧 **Email** — support@replyx.com
- 🐛 **Баги** — GitHub Issues

### Полезные ссылки

- [API Reference](../api/endpoints_complete.md) — Полный список эндпоинтов
- [WebSocket Documentation](../realtime/websockets.md) — Realtime интеграция
- [Security Guide](../security/authentication.md) — Настройка безопасности
- [Performance Guide](../perf/findings.md) — Оптимизация производительности

---

**📅 Последнее обновление:** 2025-01-23  
**🔄 Версия виджета:** 1.2.0  
**✅ Статус:** Production Ready

*Happy chatting! 🤖💬*