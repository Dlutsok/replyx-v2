# Blog API Reference

## Обзор

API системы блога ReplyX предоставляет полный набор endpoints для работы с блогом как для публичного доступа, так и для административного управления.

## Базовые URL

- **Публичные endpoints**: `/api/blog/`
- **Административные endpoints**: `/api/admin/blog/`

## Аутентификация

Административные endpoints требуют JWT токен в заголовке `Authorization`:
```http
Authorization: Bearer <jwt_token>
```

---

## Публичные Endpoints

### Получить список статей

```http
GET /api/blog/posts
```

**Параметры запроса:**
- `skip` (int, optional): Количество статей для пропуска (default: 0)
- `limit` (int, optional): Максимальное количество статей (default: 10, max: 50)
- `category` (string, optional): Фильтр по категории
- `featured` (boolean, optional): Только рекомендуемые статьи

**Пример запроса:**
```http
GET /api/blog/posts?skip=0&limit=5&category=AI&featured=true
```

**Ответ:**
```json
[
  {
    "id": 1,
    "title": "Как AI меняет будущее бизнеса",
    "excerpt": "Узнайте, как компании используют ИИ...",
    "author": "Александр Иванов",
    "date": "2025-01-15T10:00:00Z",
    "read_time": "8 мин",
    "category": "Кейсы",
    "tags": ["AI", "Бизнес"],
    "image": "/api/files/blog-images/1/image.jpg",
    "featured": true,
    "views": 1250,
    "likes": 89,
    "is_published": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

### Получить статью по ID

```http
GET /api/blog/posts/{post_id}
```

**Параметры:**
- `post_id` (int): ID статьи

**Ответ:**
```json
{
  "id": 1,
  "title": "Как AI меняет будущее бизнеса",
  "excerpt": "Узнайте, как компании используют ИИ...",
  "content": "<h2>Введение</h2><p>Искусственный интеллект...</p>",
  "author": "Александр Иванов",
  "date": "2025-01-15T10:00:00Z",
  "read_time": "8 мин",
  "category": "Кейсы",
  "tags": ["AI", "Бизнес"],
  "image": "/api/files/blog-images/1/image.jpg",
  "featured": true,
  "views": 1250,
  "likes": 89,
  "is_published": true,
  "slug": "ai-business-future",
  "meta_title": "Как AI меняет бизнес | ReplyX",
  "meta_description": "Реальные кейсы внедрения ИИ в бизнесе",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Получить статью по slug

```http
GET /api/blog/posts/slug/{slug}
```

**Параметры:**
- `slug` (string): URL slug статьи

### Поставить лайк статье

```http
POST /api/blog/posts/{post_id}/like
```

**Ответ:**
```json
{
  "message": "Post liked successfully",
  "likes": 90
}
```

### Получить категории

```http
GET /api/blog/categories
```

**Ответ:**
```json
[
  {
    "category": "ИИ и технологии",
    "count": 15
  },
  {
    "category": "Кейсы",
    "count": 8
  }
]
```

### Получить рекомендуемые статьи

```http
GET /api/blog/featured
```

**Параметры запроса:**
- `limit` (int, optional): Количество статей (default: 3, max: 10)

---

## Административные Endpoints

### Получить все статьи (для админа)

```http
GET /api/admin/blog/posts
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
```

**Параметры запроса:**
- `skip` (int, optional): Пропустить статьи
- `limit` (int, optional): Лимит статей
- `category` (string, optional): Фильтр по категории
- `published` (boolean, optional): Фильтр по статусу публикации
- `featured` (boolean, optional): Фильтр по рекомендуемым

### Создать статью

```http
POST /api/admin/blog/posts
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "title": "Новая статья о AI",
  "excerpt": "Краткое описание статьи",
  "content": "<h2>Заголовок</h2><p>Контент статьи...</p>",
  "author": "Автор Статьи",
  "read_time": "5 мин",
  "category": "ИИ и технологии",
  "tags": ["AI", "Технологии"],
  "image": "/api/files/blog-images/1/image.jpg",
  "featured": false,
  "is_published": true,
  "slug": "new-ai-article",
  "meta_title": "Новая статья о AI | ReplyX",
  "meta_description": "Описание для поисковиков"
}
```

### Обновить статью

```http
PUT /api/admin/blog/posts/{post_id}
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Тело запроса:** Те же поля, что и при создании (все опциональные)

### Удалить статью

```http
DELETE /api/admin/blog/posts/{post_id}
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
```

**Ответ:**
```json
{
  "message": "Post deleted successfully"
}
```

### Получить статистику блога

```http
GET /api/admin/blog/stats
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
```

**Ответ:**
```json
{
  "total_posts": 25,
  "published_posts": 20,
  "draft_posts": 5,
  "featured_posts": 8
}
```

---

## AI-Ассистент Endpoints

### Использовать AI-ассистент

```http
POST /api/admin/blog/ai-assistant
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Тело запроса для генерации заголовка:**
```json
{
  "action": "generate_title",
  "topic": "Искусственный интеллект в медицине"
}
```

**Тело запроса для генерации контента:**
```json
{
  "action": "generate_content",
  "topic": "AI в бизнесе",
  "length": "medium"
}
```

**Тело запроса для улучшения текста:**
```json
{
  "action": "improve_text",
  "text": "Текст для улучшения",
  "style": "professional"
}
```

**Тело запроса для полной генерации статьи:**
```json
{
  "action": "generate_full_article",
  "example_text": "Пример статьи для анализа...",
  "include_project_mentions": true,
  "project_features": ["Чат с ИИ", "Генерация контента"],
  "mention_frequency": "medium",
  "article_settings": {
    "type": "informational",
    "style": "professional",
    "tone": "expert",
    "audience": "business",
    "length": "medium",
    "focus": "ai_technologies",
    "language": "ru",
    "seo_optimized": true,
    "include_examples": true,
    "include_statistics": false,
    "include_case_studies": true
  }
}
```

**Ответ:**
```json
{
  "success": true,
  "result": "Сгенерированный контент...",
  "suggestions": ["Альтернативный вариант 1", "Альтернативный вариант 2"]
}
```

### Настройки статьи (ArticleSettings)

**Поля настроек:**
- `type`: "informational" | "tutorial" | "analysis" | "news" | "opinion" | "case_study"
- `style`: "professional" | "casual" | "technical" | "conversational" | "academic"
- `tone`: "expert" | "friendly" | "authoritative" | "educational" | "inspiring"
- `audience`: "business" | "developers" | "general" | "professionals" | "beginners"
- `length`: "short" | "medium" | "long"
- `focus`: "ai_technologies" | "automation" | "digital_transformation" | "chatbots" | "machine_learning" | "business_intelligence" | "productivity" | "customer_service"
- `language`: "ru" | "en"
- `seo_optimized`: boolean
- `include_examples`: boolean
- `include_statistics`: boolean
- `include_case_studies`: boolean

---

## Загрузка изображений

### Загрузить изображение

```http
POST /api/admin/blog/upload-image
```

**Заголовки:**
```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Тело запроса:**
```
file: <image_file>
```

**Ограничения:**
- Максимальный размер: 10MB
- Поддерживаемые форматы: JPG, JPEG, PNG, WebP, GIF

**Ответ:**
```json
{
  "success": true,
  "filename": "blog_image_user123_timestamp.jpg",
  "url": "/api/files/blog-images/123/blog_image_user123_timestamp.jpg",
  "size": 2048576,
  "content_type": "image/jpeg",
  "object_key": "blog-images/user_123/blog_image_user123_timestamp.jpg"
}
```

---

## Коды ошибок

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Некорректный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `413` - Файл слишком большой
- `422` - Ошибка валидации данных
- `500` - Внутренняя ошибка сервера

## Примеры использования

### JavaScript/Fetch API

```javascript
// Получить статьи
const posts = await fetch('/api/blog/posts?limit=5&category=AI')
  .then(res => res.json());

// Создать статью (требует авторизации)
const newPost = await fetch('/api/admin/blog/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Новая статья',
    excerpt: 'Описание',
    content: '<p>Контент</p>',
    author: 'Автор',
    read_time: '5 мин',
    category: 'Технологии',
    tags: ['AI'],
    image: '/path/to/image.jpg'
  })
}).then(res => res.json());

// Использовать AI-ассистент
const aiResponse = await fetch('/api/admin/blog/ai-assistant', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'generate_title',
    topic: 'Машинное обучение'
  })
}).then(res => res.json());
```

### Python/Requests

```python
import requests

# Получить статьи
response = requests.get('http://localhost:8000/api/blog/posts',
                       params={'limit': 5, 'category': 'AI'})
posts = response.json()

# Создать статью
headers = {'Authorization': f'Bearer {token}'}
data = {
    'title': 'Новая статья',
    'excerpt': 'Описание',
    'content': '<p>Контент</p>',
    'author': 'Автор',
    'read_time': '5 мин',
    'category': 'Технологии',
    'tags': ['AI'],
    'image': '/path/to/image.jpg'
}
response = requests.post('http://localhost:8000/api/admin/blog/posts',
                        headers=headers, json=data)
```

## Дополнительные ресурсы

- [AI Generation Guide](./ai-generation-guide.md) - Подробное руководство по AI-ассистенту
- [Architecture Guide](./architecture.md) - Архитектура системы блога