# Changelog - ReplyX MVP 13

## 2025-09-19 - Major Updates and Bug Fixes

### 🚀 New Features

#### Admin Chat Analytics System
- **Новая административная панель для аналитики чатов**
  - Добавлена вкладка "Аналитика чатов" в боковое меню админ-панели
  - Создан полноценный API для получения статистики по чатам и пользователям
  - Реализован интерфейс для просмотра всех диалогов пользователей
  - Добавлена возможность просмотра полных переписок в модальных окнах

**Файлы:**
- `backend/api/admin_chats.py` - новый API модуль
- `frontend/pages/admin-chats.js` - новая страница админ-панели
- `frontend/components/layout/AdminDashboard.js` - обновлено меню
- `frontend/pages/_app.tsx` - добавлен маршрут в ADMIN_ROUTES

**API Endpoints:**
- `GET /api/admin/chats/overview` - общая аналитика по чатам
- `GET /api/admin/chats/users` - список пользователей с статистикой
- `GET /api/admin/chats/user/{user_id}/dialogs` - диалоги конкретного пользователя
- `GET /api/admin/chats/dialog/{dialog_id}/messages` - сообщения диалога

### 🐛 Bug Fixes

#### 1. Yandex Search Engine Indexing
**Проблема:** Яндекс не мог проиндексировать favicon и главную страницу
**Решение:** Добавлены явные SEO заголовки для главной страницы

```javascript
// frontend/next.config.js
{
  source: '/',
  headers: [
    {
      key: 'X-Robots-Tag',
      value: 'index, follow'
    }
  ]
}
```

#### 2. Registration 500 Error
**Проблема:** Ошибка 500 при регистрации из-за отсутствующего импорта `get_db_stats`
**Решение:** Добавлен недостающий импорт в database/__init__.py

```python
# backend/database/__init__.py
from .connection import engine, Base, SessionLocal, get_db, get_db_stats
__all__ = ['engine', 'Base', 'SessionLocal', 'get_db', 'get_db_stats', 'models', 'schemas', 'crud', 'auth']
```

#### 3. Custom Welcome Messages in Widget
**Проблема:** Виджет не отображал кастомные приветственные сообщения, показывая только дефолтные
**Решение:** Исправлена передача параметра welcomeMessage через iframe URL

```javascript
// frontend/public/widget.js
if (widgetConfig.widget_settings && widgetConfig.widget_settings.welcomeMessage) {
  iframeSrc += `&welcomeMessage=${encodeURIComponent(widgetConfig.widget_settings.welcomeMessage)}`;
}

// frontend/pages/chat-iframe.js
const welcomeMessageParam = params.get('welcomeMessage');
if (welcomeMessageParam) {
  setWelcomeMessage(decodeURIComponent(welcomeMessageParam));
}
```

#### 4. Line Breaks in Welcome Messages
**Проблема:** Переносы строк в приветственных сообщениях не работали
**Решение:** Добавлена обработка переносов строк с помощью React элементов

```javascript
// frontend/pages/chat-iframe.js
{welcomeMessage.split('\n').map((line, index) => (
  <span key={index}>
    {line}
    {index < welcomeMessage.split('\n').length - 1 && <br />}
  </span>
))}
```

#### 5. Backend Database Model Issues
**Проблемы при реализации админ-панели:**

- **'channel' attribute error:** Модель Dialog не имеет поля 'channel'
  - **Решение:** Использование telegram_chat_id для определения канала (telegram vs website)

- **SQL nested aggregation error:** PostgreSQL не поддерживает avg(count(...))
  - **Решение:** Разделение запросов и вычисление средних значений в Python коде

- **'full_name' attribute error:** Модель User имеет только 'first_name'
  - **Решение:** Замена всех ссылок full_name на first_name

- **FiBot icon import error:** Иконка FiBot не существует в react-icons/fi
  - **Решение:** Замена на FiCpu иконку

### 🔒 Security

**Многоуровневая защита админ-панели:**
- Backend: аутентификация через `auth.get_current_admin`
- Frontend: проверка маршрутов в _app.tsx
- Component-level: проверки ролей пользователей

### 📊 Technical Improvements

#### Database Schema Optimizations
- Улучшена работа с полями telegram_chat_id для определения каналов
- Оптимизированы SQL запросы для аналитики чатов
- Добавлена пагинация для больших объемов данных

#### API Response Models
Созданы новые Pydantic модели для структурированных ответов:
- `UserChatOverview` - обзор пользователя с статистикой
- `UserChatStats` - общая статистика пользователей
- `DialogOverview` - обзор диалога
- `UserDialogsDetail` - детальная информация о диалогах пользователя
- `DialogMessageDetail` - детализация сообщений
- `ChatAnalyticsOverview` - общая аналитика чатов

#### Frontend Enhancements
- Модальные окна для просмотра переписок
- Пагинация и сортировка данных
- Адаптивный дизайн админ-панели
- Улучшенная обработка состояний загрузки

### 🧪 Testing & Quality Assurance

- Проверена безопасность реализации админ-панели
- Подтверждена целостность основного функционала
- Протестирована работа виджетов на клиентских сайтах
- Верифицирована корректность сборки проекта

### 📝 Technical Notes

**Важные изменения в архитектуре:**
1. Добавлен новый API модуль для админ-аналитики
2. Расширена навигация в админ-панели
3. Улучшена обработка параметров в виджете
4. Оптимизированы SQL запросы для аналитики

**Файлы, требующие внимания при развертывании:**
- `backend/api/admin_chats.py` - новый API модуль
- `frontend/pages/admin-chats.js` - новая админ-страница
- `frontend/public/widget.js` - обновлена логика виджета
- `frontend/pages/chat-iframe.js` - улучшена обработка параметров

### 🔄 Migration Notes

При развертывании убедитесь в:
1. Правильной настройке прав доступа для админ-ролей
2. Корректной работе всех API endpoints
3. Обновлении конфигурации веб-сервера для новых маршрутов
4. Проверке работы виджетов на клиентских сайтах

---

**Общий результат:** Система получила мощный инструмент для аналитики чатов, исправлены критические ошибки регистрации и виджетов, улучшена индексация поисковыми системами. Все изменения протестированы и безопасны для продакшн-среды.