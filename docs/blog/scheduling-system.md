# Система планирования публикаций блога

## Обзор

Система планирования публикаций позволяет создавать статьи блога с отложенной публикацией. Статьи могут быть запланированы на определенное время и автоматически опубликованы системным планировщиком.

## Функциональность

### ⏰ Планирование публикации

- **Временная зона**: Все времена отображаются и работают в MSK (UTC+3)
- **Интерфейс**: HTML5 date/time inputs для выбора даты и времени
- **Валидация**: Нельзя запланировать публикацию в прошлом
- **Автозаполнение**: По умолчанию время установлено на текущее время + 10 минут

### 🔄 Автоматический планировщик

- **Частота проверки**: Каждые 30 секунд
- **Логирование**: Подробные логи с информацией о времени и статусе
- **Точность**: Публикация происходит в течение 30 секунд от запланированного времени

## Техническая архитектура

### Frontend (Next.js)

**Файл**: `/frontend/pages/admin-blog-new.js`

```javascript
// Корректная обработка временной зоны MSK
const [year, month, day] = scheduledDate.split('-').map(Number);
const [hours, minutes] = scheduledTime.split(':').map(Number);
submissionData.scheduled_for = `${year}-${month}-${day}T${hours}:${minutes}:00`;
```

**Особенности:**
- Избегает автоматического UTC преобразования в JavaScript Date
- Отправляет время в MSK как есть в бэкенд
- Отображает текущее время MSK с обновлением каждую секунду

### Backend (FastAPI)

**Файл**: `/backend/database/crud.py`

#### Функция создания поста
```python
def create_blog_post(db: Session, post: schemas.BlogPostCreate, user_id: int):
    # Обработка запланированного времени (MSK → UTC для хранения)
    if post.scheduled_for:
        # Время приходит в MSK, конвертируем в UTC для хранения
        moscow_tz = pytz.timezone('Europe/Moscow')
        scheduled_dt_msk = datetime.fromisoformat(post.scheduled_for.replace('Z', ''))
        scheduled_dt_msk = moscow_tz.localize(scheduled_dt_msk)
        scheduled_dt_utc = scheduled_dt_msk.astimezone(pytz.UTC)
        db_post.scheduled_for = scheduled_dt_utc.replace(tzinfo=None)
```

#### Функция планировщика
```python
def publish_scheduled_posts(db: Session):
    # Получаем текущее время UTC для сравнения
    now_utc = datetime.utcnow()

    # Ищем статьи готовые к публикации
    scheduled_posts = get_scheduled_posts(db)

    for post in scheduled_posts:
        scheduled_for_utc = post.scheduled_for
        if scheduled_for_utc <= now_utc:
            # Публикуем статью
            post.is_published = True
            post.published_at = now_utc
```

### База данных

**Таблица**: `blog_posts`

```sql
-- Поля для планирования
scheduled_for    TIMESTAMP    -- Время публикации в UTC
is_published     BOOLEAN      -- Флаг публикации
published_at     TIMESTAMP    -- Фактическое время публикации
status          VARCHAR       -- Статус: draft, scheduled, published
```

**Важно**:
- `scheduled_for` всегда хранится в UTC
- `published_at` записывается в UTC при публикации
- Конвертация MSK ↔ UTC происходит только на уровне приложения

## Планировщик (Background Task)

### Интеграция в FastAPI

**Файл**: `/backend/main.py`

```python
from services.blog_scheduler import start_blog_scheduler

@asyncio.coroutine
async def lifespan(app: FastAPI):
    # Запуск планировщика при старте приложения
    asyncio.create_task(start_blog_scheduler())
    yield
```

### Сервис планировщика

**Файл**: `/backend/services/blog_scheduler.py`

```python
async def start_blog_scheduler():
    """Фоновый планировщик для автоматической публикации статей"""
    while True:
        try:
            db = next(get_db())
            published_count = crud.publish_scheduled_posts(db)
            if published_count > 0:
                logger.info(f"📝 Published {published_count} scheduled posts")
        except Exception as e:
            logger.error(f"❌ Blog scheduler error: {e}")
        finally:
            await asyncio.sleep(30)  # Проверка каждые 30 секунд
```

## Устранение проблем с временными зонами

### Проблемы которые были исправлены

1. **JavaScript Date автоконвертация**
   - **Проблема**: `new Date("2025-09-20T16:39")` интерпретировался как UTC
   - **Решение**: Ручной парсинг компонентов даты/времени

2. **Отображение времени +3 часа**
   - **Проблема**: Двойная конвертация MSK → UTC → MSK
   - **Решение**: Работа с локальным временем браузера (уже MSK)

3. **Немедленная публикация**
   - **Проблема**: Неправильное сравнение MSK vs UTC времен
   - **Решение**: Корректная конвертация для сравнения в планировщике

### Логирование и отладка

**Debug endpoint**: `/api/blog/debug/scheduler`

```python
@router.get("/debug/scheduler")
async def debug_scheduler_info(db: Session = Depends(get_db)):
    """Debug endpoint для проверки планировщика блога"""
    # Возвращает:
    # - Текущее время UTC и MSK
    # - Список запланированных постов
    # - Время до публикации для каждого поста
    # - Статус готовности к публикации
```

## Временные зоны

### Принципы работы

1. **Пользовательский интерфейс**: Всё время в MSK (UTC+3)
2. **Хранение в БД**: Всё время в UTC
3. **API**: Конвертация MSK ↔ UTC на границах системы
4. **Планировщик**: Работает с UTC для точности

### Конвертация времени

```python
import pytz

# MSK → UTC (для сохранения)
moscow_tz = pytz.timezone('Europe/Moscow')
msk_time = moscow_tz.localize(datetime(2025, 9, 20, 16, 49))
utc_time = msk_time.astimezone(pytz.UTC)

# UTC → MSK (для отображения)
utc_time = datetime(2025, 9, 20, 13, 49)  # UTC
moscow_tz = pytz.timezone('Europe/Moscow')
msk_time = pytz.utc.localize(utc_time).astimezone(moscow_tz)
```

## Мониторинг и логирование

### Ключевые метрики

- Количество запланированных постов
- Задержка публикации (должна быть < 30 секунд)
- Ошибки планировщика
- Время выполнения операций

### Логи планировщика

```
2025-09-20 16:48:16,792 - database.crud - INFO - BLOG SCHEDULER CHECK:
2025-09-20 16:48:16,793 - database.crud - INFO -   Current UTC time: 2025-09-20 13:48:16
2025-09-20 16:48:16,793 - database.crud - INFO -   Current MSK time: 2025-09-20 16:48:16
2025-09-20 16:48:16,793 - database.crud - INFO -   Found 1 scheduled posts to check
2025-09-20 16:48:16,793 - database.crud - INFO -   ⏰ Post will be published in 0:00:43
```

## API Endpoints

### Создание запланированного поста

```http
POST /api/admin/blog/posts
Authorization: Bearer <admin_token>

{
  "title": "Заголовок статьи",
  "content": "Содержимое статьи",
  "scheduled_for": "2025-09-20T16:49:00",  // MSK время
  "status": "scheduled"
}
```

### Получение запланированных постов

```http
GET /api/admin/blog/posts?status=scheduled
Authorization: Bearer <admin_token>
```

### Debug информация

```http
GET /api/blog/debug/scheduler
```

## Troubleshooting

### Статья не публикуется в запланированное время

1. Проверить логи планировщика
2. Убедиться что планировщик запущен
3. Проверить статус поста в БД (`status = 'scheduled'`)
4. Проверить корректность времени в БД (должно быть UTC)

### Неправильное отображение времени

1. Проверить временную зону браузера
2. Убедиться что сервер работает в правильной временной зоне
3. Проверить конвертацию UTC ↔ MSK в коде

### Планировщик не работает

1. Проверить что `start_blog_scheduler()` вызывается в `main.py`
2. Проверить логи на ошибки
3. Убедиться что БД доступна
4. Проверить что нет блокирующих операций в планировщике

---

**Последнее обновление**: 20 сентября 2025
**Версия**: 1.0