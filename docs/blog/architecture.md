# Blog System Architecture

## Обзор архитектуры

Система блога ReplyX построена по модульной архитектуре с разделением на frontend (Next.js) и backend (FastAPI), интегрированной с AI-сервисами для генерации контента.

## Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  Public Pages           │  Admin Pages                         │
│  ┌─────────────────┐    │  ┌─────────────────────────────────┐  │
│  │ /blog (index)   │    │  │ /admin-blog (list)              │  │
│  │ /blog/[id]      │    │  │ /admin-blog-new (create)        │  │
│  │                 │    │  │ /admin-blog-edit/[id] (edit)    │  │
│  └─────────────────┘    │  └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     API Layer (fetch)                          │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│  Public API              │  Admin API                          │
│  ┌─────────────────┐     │  ┌─────────────────────────────────┐ │
│  │ /api/blog/*     │     │  │ /api/admin/blog/*               │ │
│  │ - posts         │     │  │ - posts CRUD                    │ │
│  │ - categories    │     │  │ - stats                         │ │
│  │ - featured      │     │  │ - ai-assistant                  │ │
│  │ - like          │     │  │ - upload-image                  │ │
│  └─────────────────┘     │  └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer                              │
│  ┌─────────────────┐     ┌─────────────────┐                  │
│  │ CRUD Operations │     │ AI Assistant    │                  │
│  │ (database/crud) │     │ (ai_token_mgr)  │                  │
│  └─────────────────┘     └─────────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│                     Data Layer                                 │
│  ┌─────────────────┐     ┌─────────────────┐                  │
│  │ PostgreSQL DB   │     │ S3 Storage      │                  │
│  │ (blog_posts)    │     │ (images)        │                  │
│  └─────────────────┘     └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                            │
│  ┌─────────────────┐     ┌─────────────────┐                  │
│  │ OpenAI API      │     │ Timeweb S3      │                  │
│  │ (GPT-4o)        │     │ (File Storage)  │                  │
│  └─────────────────┘     └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Компоненты системы

### Frontend Architecture

#### 1. **Public Blog Pages**

**`/frontend/pages/blog/index.js`**
- Главная страница блога
- Список статей с фильтрацией по категориям
- Поиск статей (UI готов, логика планируется)
- Sidebar с категориями и подпиской

**Ключевые компоненты:**
```javascript
// Основные компоненты страницы
BlogHeader()     // Навигация и брендинг
BlogHero()       // Hero секция с поиском
BlogPostCard()   // Карточка статьи
BlogSidebar()    // Боковая панель с фильтрами
```

**`/frontend/pages/blog/[id].js`**
- Страница отдельной статьи
- Поддержка как ID, так и slug URL
- Система лайков и шэринга
- Похожие статьи
- SEO оптимизация с Open Graph

**Ключевые компоненты:**
```javascript
ArticleHeader()     // Навигация
Breadcrumbs()      // Хлебные крошки
ArticleHero()      // Заголовок статьи с мета-информацией
ArticleContent()   // Основной контент
RelatedArticles()  // Похожие статьи
ArticleFooter()    // Подвал
```

#### 2. **Admin Pages**

**`/frontend/pages/admin-blog.js`**
- Список всех статей для администратора
- Управление статьями (редактирование, удаление)
- Статистика блога

**`/frontend/pages/admin-blog-new.js`**
- Создание новых статей
- **AI-ассистент** с продвинутыми настройками
- React Quill редактор
- Загрузка изображений
- SEO настройки

**Ключевые особенности:**
```javascript
// AI Generation Settings (строки 55-68)
const [articleSettings, setArticleSettings] = useState({
  type: 'informational',        // 6 типов статей
  style: 'professional',        // 5 стилей
  tone: 'expert',              // 5 тонов
  audience: 'business',        // 5 аудиторий
  length: 'medium',            // 3 размера
  focus: 'ai_technologies',    // 8 тем
  // + дополнительные опции
});
```

**`/frontend/pages/admin-blog-edit.js`**
- Редактирование существующих статей
- Те же возможности, что и при создании

### Backend Architecture

#### 1. **API Layer**

**`/backend/api/blog.py`**
- Все endpoints для работы с блогом
- Публичные и административные маршруты
- AI-ассистент для генерации контента
- Загрузка изображений

**Структура endpoints:**
```python
# Публичные
GET  /api/blog/posts                    # Список статей
GET  /api/blog/posts/{id}               # Статья по ID
GET  /api/blog/posts/slug/{slug}        # Статья по slug
POST /api/blog/posts/{id}/like          # Лайк статьи
GET  /api/blog/categories               # Категории
GET  /api/blog/featured                 # Рекомендуемые

# Административные (требуют auth)
GET    /api/admin/blog/posts            # Все статьи
POST   /api/admin/blog/posts            # Создать
PUT    /api/admin/blog/posts/{id}       # Обновить
DELETE /api/admin/blog/posts/{id}       # Удалить
GET    /api/admin/blog/stats            # Статистика
POST   /api/admin/blog/ai-assistant     # AI помощник
POST   /api/admin/blog/upload-image     # Загрузка изображений
```

#### 2. **Data Models**

**`/backend/database/models.py`**
```python
class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    excerpt = Column(Text)
    content = Column(Text)
    author = Column(String)
    read_time = Column(String)
    category = Column(String)
    tags = Column(JSON)  # Список тегов
    image = Column(String)
    featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    slug = Column(String, unique=True, index=True)
    meta_title = Column(String)
    meta_description = Column(String)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**`/backend/database/schemas.py`**
```python
# Pydantic схемы для валидации
class BlogPostCreate(BlogPostBase): pass
class BlogPostRead(BlogPostBase): # + id, dates, views, likes
class BlogPostUpdate(BaseModel): # Все поля опциональные

# AI Assistant схемы
class ArticleSettings(BaseModel):
    type: str = "informational"
    style: str = "professional"
    tone: str = "expert"
    audience: str = "business"
    length: str = "medium"
    focus: str = "ai_technologies"
    # + дополнительные boolean опции

class AIAssistantRequest(BaseModel):
    action: str  # Тип операции
    article_settings: Optional[ArticleSettings]
    example_text: Optional[str]
    # + параметры для упоминания проекта
```

#### 3. **Service Layer**

**CRUD Operations (`/backend/database/crud.py`):**
- `get_blog_posts()` - получение списка с фильтрами
- `get_blog_post()` - получение одной статьи
- `create_blog_post()` - создание
- `update_blog_post()` - обновление
- `delete_blog_post()` - удаление
- `get_blog_categories()` - категории с подсчетом
- `increment_blog_post_views()` - счетчики просмотров/лайков

**AI Assistant Integration:**
- Интеграция с `ai_token_manager`
- Продвинутая система промптов
- Поддержка GPT-4o модели
- Обработка различных типов генерации

### AI Generation System

#### 1. **Prompt Engineering**

**Система промптов (`/backend/api/blog.py`, строки 455-657):**
```python
def _create_full_article_prompt(request):
    # Извлечение настроек
    settings = request.article_settings

    # Маппинг значений для читабельности
    type_map = {...}
    style_map = {...}
    tone_map = {...}

    # Построение системного промпта
    system_prompt = f"""Ты опытный копирайтер...
    ТВОЙ ПРОФИЛЬ:
    - Экспертиза: {focus_map.get(focus)}
    - Стиль: {style_map.get(style)}
    - Аудитория: {audience_map.get(audience)}
    """

    # Пользовательский промпт с инструкциями
    user_prompt = f"""Создай {type_map.get(type)} статью...
    НАСТРОЙКИ: {...}
    ТРЕБОВАНИЯ: {...}
    ФОРМАТИРОВАНИЕ: {...}
    """

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
```

#### 2. **Content Processing**

**Markdown to HTML Conversion:**
```javascript
// Frontend: admin-blog-new.js (строки 420-446)
const htmlContent = content
  .replace(/^### (.*)$/gm, '<h3>$1</h3>')
  .replace(/^## (.*)$/gm, '<h2>$1</h2>')
  .replace(/^# (.*)$/gm, '<h1>$1</h1>')
  .replace(/^#$/gm, '<br>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .split('\n\n')
  .map(paragraph => {
    if (paragraph.startsWith('<h') || paragraph === '<br>') {
      return paragraph;
    }
    return `<p>${paragraph}</p>`;
  })
  .join('');
```

### File Storage System

#### S3 Integration

**Image Upload (`/backend/api/blog.py`, строки 663-764):**
```python
@router.post("/admin/blog/upload-image")
async def upload_blog_image(file: UploadFile, user, db):
    # Валидация файла
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(413, "File too large")

    # Генерация безопасного имени
    secure_filename = s3_service.generate_widget_icon_filename(
        user_id=user.id,
        original_filename=file.filename,
        content=content
    ).replace('widget_icon', 'blog_image')

    # Загрузка в S3
    object_key = s3_service.get_user_object_key(
        user.id, secure_filename, "blog-images"
    )

    # Возврат proxy URL
    proxy_url = f"/api/files/blog-images/{user.id}/{secure_filename}"
    return {"url": proxy_url, ...}
```

### Security Architecture

#### Authentication & Authorization

**JWT Token Protection:**
```python
# Все admin endpoints защищены
@router.post("/admin/blog/posts")
def create_post(
    blog_post: schemas.BlogPostCreate,
    current_user: models.User = Depends(auth.get_current_admin)
):
    # Только администраторы могут создавать статьи
```

**Data Validation:**
- Pydantic схемы для всех входящих данных
- Валидация размера и типа файлов
- HTML санитизация в frontend

**File Security:**
- Ограничения по размеру (10MB)
- Проверка MIME типов
- Безопасные имена файлов
- Изоляция по пользователям

### Performance Considerations

#### Frontend Optimizations

**Image Handling:**
```javascript
// Lazy loading и fallback для изображений
<img
  src={getImageUrl(post.image)}
  alt={post.title}
  onError={(e) => {
    e.target.src = '/images/blog/blog-default.webp';
  }}
/>
```

**API Calls:**
- Pagination для списков статей
- Кэширование на frontend
- Optimistic updates для лайков

#### Backend Optimizations

**Database Queries:**
- Индексы на часто используемые поля (slug, category, featured)
- Eager loading для связанных данных
- Pagination с offset/limit

**AI Service:**
- Async/await для OpenAI API
- Timeout настройки (30s)
- Error handling и fallbacks

### Monitoring & Logging

#### Application Logging

**CRUD Operations:**
```python
logger.info(f"Admin {user.email} created blog post: {post.title}")
logger.info(f"Retrieved blog post by slug: {slug}")
```

**AI Usage Tracking:**
- Логирование всех AI запросов
- Отслеживание токенов
- Мониторинг качества генерации

#### Metrics Collection

- Просмотры статей
- Лайки и взаимодействия
- Использование AI-ассистента
- Загрузка изображений

## Data Flow

### 1. Article Creation Flow

```
User → Admin Panel → AI Settings → AI Request → OpenAI API →
Content Generation → Markdown Processing → HTML Conversion →
Database Storage → Publication
```

### 2. Article Reading Flow

```
User → Blog Page → API Request → Database Query →
Content Retrieval → HTML Rendering → View Increment
```

### 3. Image Upload Flow

```
User → File Selection → Size/Type Validation →
S3 Upload → Secure URL Generation → Database Update
```

## Deployment Architecture

### Environment Configuration

**Frontend (Next.js):**
```bash
NEXT_PUBLIC_API_URL=https://api.replyx.ru
```

**Backend (FastAPI):**
```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
S3_ENDPOINT_URL=https://s3.timeweb.cloud
S3_BUCKET_NAME=replyx-files
```

### Docker Services

```yaml
# docker-compose.yml
services:
  backend:
    image: replyx/backend
    ports: ["8000:8000"]

  frontend:
    image: replyx/frontend
    ports: ["3000:3000"]

  postgres:
    image: postgres:14

  redis:
    image: redis:7
```

## Future Enhancements

### Planned Features

1. **Search Implementation**
   - Full-text search в PostgreSQL
   - Elasticsearch интеграция
   - AI-powered content recommendations

2. **Advanced Analytics**
   - Reading time tracking
   - User engagement metrics
   - A/B testing для AI-generated content

3. **Content Workflow**
   - Draft system
   - Editorial review process
   - Scheduled publishing

4. **Performance Improvements**
   - Redis caching layer
   - CDN для изображений
   - Database query optimization

### Technical Debt

1. **Testing Coverage**
   - Unit tests для AI generation
   - Integration tests для API
   - E2E tests для admin panel

2. **Error Handling**
   - Better AI error recovery
   - Graceful degradation
   - User-friendly error messages

3. **Documentation**
   - API OpenAPI specs
   - Frontend component docs
   - Deployment runbooks

## Troubleshooting

### Common Issues

**AI Generation Fails:**
- Check OpenAI API key and credits
- Validate article settings schema
- Monitor token usage limits

**Image Upload Issues:**
- Verify S3 credentials and bucket permissions
- Check file size limits (10MB)
- Validate MIME types

**Performance Issues:**
- Monitor database query performance
- Check API response times
- Analyze frontend bundle size

### Debug Information

**Logging Locations:**
- Backend: `logs/uvicorn.log`
- Frontend: Browser console
- Database: PostgreSQL logs

**Monitoring Endpoints:**
- Health check: `/health`
- Metrics: `/metrics` (if implemented)
- Admin stats: `/api/admin/blog/stats`

---

Данная архитектура обеспечивает масштабируемую, безопасную и производительную систему блога с мощными AI-возможностями для генерации контента.