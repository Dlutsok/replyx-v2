# Tinkoff API URLs Configuration Guide

**Дата:** 2025-09-11  
**Статус:** Критическое исправление  
**Версия:** 1.0  

---

## 🚨 Критическая ошибка в конфигурации API URLs

### Проблема
При интеграции с Tinkoff API была допущена ошибка в понимании логики использования URL для разных типов терминалов, что привело к ошибке **501 "Терминал не найден"** в тестовой среде.

### Корень проблемы
**Неправильное понимание документации Tinkoff:**
- Предполагалось: тестовый терминал → тестовая среда
- **Реальность:** тестовый терминал → **боевая среда**

---

## 📚 Правильная логика Tinkoff API URLs

### Согласно официальной документации Tinkoff:

| Тип терминала | Суффикс | API URL | Назначение |
|---------------|---------|---------|------------|
| **Тестовый терминал** | `DEMO` | `https://securepay.tinkoff.ru/v2/` | **Боевая среда** для тестирования |
| **Боевой терминал** | без суффикса | `https://rest-api-test.tinkoff.ru/v2/` | **Тестовая среда** для отладки |
| **Продакшн терминал** | без суффикса | `https://securepay.tinkoff.ru/v2/` | **Боевая среда** для реальных платежей |

### Примеры терминалов:
- **Тестовый:** `1757348842151DEMO` → `securepay.tinkoff.ru`
- **Боевой:** `1757348842151` → `rest-api-test.tinkoff.ru` (для тестов)
- **Боевой:** `1757348842151` → `securepay.tinkoff.ru` (для продакшна)

---

## 🔧 Новая конфигурация

### Переменные окружения (.env)

```bash
# ==============================================
# TINKOFF API CONFIGURATION
# ==============================================

# ТЕРМИНАЛ И КЛЮЧИ
TINKOFF_TERMINAL_KEY=1757348842151DEMO
TINKOFF_SECRET_KEY=lczutIQhGoZoZrgW

# РЕЖИМ РАБОТЫ
# true = тестирование (используется тестовый терминал + боевая среда)
# false = продакшн (используется боевой терминал + боевая среда)
TINKOFF_SANDBOX_MODE=true

# API URLs
TINKOFF_TEST_API_URL=https://securepay.tinkoff.ru/v2/
TINKOFF_PRODUCTION_API_URL=https://securepay.tinkoff.ru/v2/

# ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ
TINKOFF_MOCK_MODE=false
TINKOFF_DEBUG_LOGGING=true
TINKOFF_REQUEST_TIMEOUT=30

# CALLBACK URLs
TINKOFF_SUCCESS_URL=http://localhost:3000/payment/success
TINKOFF_FAIL_URL=http://localhost:3000/payment/error
TINKOFF_NOTIFICATION_URL=https://your-ngrok-url.ngrok-free.app/api/payments/tinkoff-notification

# ОКРУЖЕНИЕ
ENVIRONMENT=development
```

### Логика переключения в коде:

```python
# Определение API URL на основе режима
if TINKOFF_SANDBOX_MODE:
    # Тестовый режим: тестовый терминал + боевая среда
    TINKOFF_API_URL = TINKOFF_TEST_API_URL
    TERMINAL_TYPE = "DEMO"
else:
    # Продакшн режим: боевой терминал + боевая среда
    TINKOFF_API_URL = TINKOFF_PRODUCTION_API_URL
    TERMINAL_TYPE = "PRODUCTION"
```

---

## 🎯 Сценарии использования

### 1. Разработка и тестирование
```bash
TINKOFF_SANDBOX_MODE=true
TINKOFF_TERMINAL_KEY=1757348842151DEMO
# → Использует securepay.tinkoff.ru с тестовым терминалом
```

### 2. Продакшн
```bash
TINKOFF_SANDBOX_MODE=false
TINKOFF_TERMINAL_KEY=1757348842151
# → Использует securepay.tinkoff.ru с боевым терминалом
```

### 3. Отладка (Mock режим)
```bash
TINKOFF_SANDBOX_MODE=true
TINKOFF_MOCK_MODE=true
# → Эмулирует платежи без обращения к API
```

---

## 📋 Миграция с старой конфигурации

### Что было (неправильно):
```python
TINKOFF_SANDBOX_API_URL = 'https://rest-api-test.tinkoff.ru/v2/'  # ❌ Неправильно!
TINKOFF_PRODUCTION_API_URL = 'https://securepay.tinkoff.ru/v2/'
```

### Что стало (правильно):
```python
TINKOFF_TEST_API_URL = 'https://securepay.tinkoff.ru/v2/'         # ✅ Правильно!
TINKOFF_PRODUCTION_API_URL = 'https://securepay.tinkoff.ru/v2/'
```

---

## ⚠️ Важные моменты

### 1. Тестовые карты
Для тестирования используйте официальные тестовые карты Tinkoff:
- **Успешная оплата:** `2200000000000004`
- **Отклонен банком:** `2200000000000012`
- **3DS авторизация:** `2200000000000020`

### 2. Безопасность webhook'ов
**ИЗМЕНЕНО 2025-09-11:** Убрана строгая проверка IP для webhook'ов
- **Причина:** IP адреса T-Bank могут изменяться без уведомления
- **Решение:** Полагаемся на проверку подписи (токена) как основную защиту
- **Безопасность:** Подпись проверяется с использованием SECRET_KEY

### 3. Webhook URL
Обязательно используйте публично доступный URL для webhook'ов (ngrok, tunneling service).

### 4. Отладка webhook'ов
Если платежи не пополняют баланс:
1. Проверьте логи backend на предмет webhook'ов от T-Bank
2. Убедитесь что TINKOFF_NOTIFICATION_URL доступен из интернета
3. Используйте `test_webhook_manual.py` для тестирования обработки webhook'ов

---

## 🔄 Процедура переключения режимов

### Переключение в тестовый режим:
1. Установите `TINKOFF_SANDBOX_MODE=true`
2. Убедитесь что `TINKOFF_TERMINAL_KEY` содержит суффикс `DEMO`
3. Перезапустите приложение
4. Тестируйте с тестовыми картами

### Переключение в продакшн:
1. Установите `TINKOFF_SANDBOX_MODE=false`
2. Замените `TINKOFF_TERMINAL_KEY` на боевой терминал (без `DEMO`)
3. Обновите `TINKOFF_SECRET_KEY` на боевой ключ
4. Обновите callback URL на продакшн домены
5. Перезапустите приложение

---

## 📞 Контакты поддержки

**Tinkoff Business:**
- Телефон: 8-800-755-75-49
- Email: business.welcome@tinkoff.ru
- Чат в личном кабинете T-Bank Business

---

## 📝 История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 2025-09-11 | 1.0 | Создание документа, исправление критической ошибки с API URLs |

---

**Автор:** AI Assistant  
**Проверено:** В процессе  
**Статус:** Активный документ
