# ReplyX Widget - Документация

## Обзор
Документация по встраиваемому чат-виджету ReplyX для интеграции с веб-сайтами.

## Актуальная документация (сентябрь 2025)

### 📋 Техническая архитектура
- **[widget-architecture-2025-09-05.md](./widget-architecture-2025-09-05.md)** - Полная техническая документация (АКТУАЛЬНАЯ)
  - Архитектура WebSocket соединений
  - Lifecycle виджета  
  - API endpoints и routing
  - Критические исправления от 5.09.2025

### 🔧 Диагностика и исправления
- **[../troubleshooting/widget-fixes-2025-09-05.md](../troubleshooting/widget-fixes-2025-09-05.md)** - Документация исправлений (5 сентября 2025)
- **[../troubleshooting/websocket-widget-issues.md](../troubleshooting/websocket-widget-issues.md)** - Диагностика WebSocket проблем
- **[../troubleshooting/unsolved-problem-2025-09-05.md](../troubleshooting/unsolved-problem-2025-09-05.md)** - Анализ нерешенных проблем

## Историческая документация

### 📚 Предыдущие версии
- **[WIDGET_FUNCTIONALITY_FIXES_DOCUMENTATION.md](./WIDGET_FUNCTIONALITY_FIXES_DOCUMENTATION.md)** - Исправления от 2 сентября 2025
  - Приветственное сообщение
  - Двойная отправка сообщений
  - State management

## Быстрая навигация

### 🚀 Для разработчиков
1. **Интеграция виджета:** читайте [widget-architecture-2025-09-05.md](./widget-architecture-2025-09-05.md) секция "Жизненный цикл виджета"
2. **Диагностика проблем:** используйте [websocket-widget-issues.md](../troubleshooting/websocket-widget-issues.md)
3. **Последние исправления:** смотрите [widget-fixes-2025-09-05.md](../troubleshooting/widget-fixes-2025-09-05.md)

### 🔍 Для DevOps
1. **Мониторинг:** команды из [widget-architecture-2025-09-05.md](./widget-architecture-2025-09-05.md) секция "Troubleshooting"
2. **Логи и диагностика:** [websocket-widget-issues.md](../troubleshooting/websocket-widget-issues.md) секция "Команды диагностики"

### 🐛 Для QA
1. **Тестирование:** [widget-architecture-2025-09-05.md](./widget-architecture-2025-09-05.md) секция "Инструкции по применению"
2. **Известные проблемы:** [websocket-widget-issues.md](../troubleshooting/websocket-widget-issues.md) секция "Типичные проблемы"

## Статус документации

| Документ | Дата | Статус | Актуальность |
|----------|------|--------|--------------|
| widget-architecture-2025-09-05.md | 5 сент 2025 | ✅ Актуален | Полная техническая документация |
| widget-fixes-2025-09-05.md | 5 сент 2025 | ✅ Актуален | Критические исправления |
| websocket-widget-issues.md | 5 сент 2025 | ✅ Обновлен | Диагностика (обновлен) |
| WIDGET_FUNCTIONALITY_FIXES_DOCUMENTATION.md | 2 сент 2025 | ⚠️ Частично | Исторические исправления |

## Ключевые изменения от 5 сентября 2025

### 🚨 Критические исправления
1. **WebSocket routing** - исправлен неправильный пул соединений для widget endpoint
2. **Дублирующие endpoints** - удален конфликтующий endpoint в site.py
3. **Race condition** - исправлена проблема с порядком инициализации
4. **Логирование** - добавлены подробные логи для всех WebSocket соединений

### 📈 Результаты
- ✅ Стабильные WebSocket подключения
- ✅ Надежная доставка real-time сообщений  
- ✅ Отсутствие конфликтов endpoints
- ✅ Полная видимость в логах

## Контакты
При обнаружении проблем с виджетом:
1. Проверьте [troubleshooting документацию](../troubleshooting/)
2. Запустите диагностические команды
3. Создайте issue с логами и описанием проблемы

---
**Последнее обновление:** 5 сентября 2025  
**Ответственный:** Команда разработки ReplyX