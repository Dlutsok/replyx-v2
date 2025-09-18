# CHANGELOG - ReplyX

Все значительные изменения в проекте ReplyX документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [2025-09-18] - Централизация системы промптов

### 🔥 КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ (BREAKING CHANGES)
- **ИЗМЕНЕНА схема БД**: Убран дефолтный промпт из модели `Assistant`
- **ОБЯЗАТЕЛЬНА миграция БД**: `alembic upgrade head` для обновления существующих данных

### ✅ Добавлено (Added)
- **Новый модуль**: `backend/constants/prompts.py` - централизованное управление промптами
  - Функция `get_default_prompt()` - получение дефолтного промпта
  - Функция `get_prompt_templates()` - получение шаблонов промптов
  - Функция `migrate_legacy_prompt()` - миграция старых промптов
- **Новый API эндпоинт**: `GET /api/prompt-templates` - получение шаблонов для фронтенда
- **Новая миграция БД**: `55711b9775e1_remove_system_prompt_default_add_.py`
  - Удаление дефолтного значения из колонки `system_prompt`
  - Автоматическая миграция всех существующих агентов на новые промпты

### 🔄 Изменено (Changed)
- **`backend/database/crud.py`**:
  ```python
  def create_assistant(db: Session, user_id: int, assistant: schemas.AssistantCreate):
      from constants.prompts import get_default_prompt

      assistant_data = assistant.dict()
      if not assistant_data.get('system_prompt'):
          assistant_data['system_prompt'] = get_default_prompt()
      # ...
  ```

- **`backend/database/models.py`**:
  ```python
  # БЫЛО:
  system_prompt = Column(Text, default='Привет! Я ваш AI-помощник...')

  # СТАЛО:
  system_prompt = Column(Text, nullable=True)  # Дефолт в crud.create_assistant()
  ```

- **`backend/ai/ai_assistant.py`**:
  - Добавлен импорт `get_prompt_templates`
  - Добавлен эндпоинт `get_prompt_templates_endpoint()`

- **`backend/database/schemas.py`**:
  ```python
  # Добавлен импорт
  from constants.prompts import get_default_prompt

  # Изменена схема
  system_prompt: Optional[str] = None  # Автоматически заполнится дефолтным промптом
  ```

- **`backend/api/dialogs.py`**:
  ```python
  # БЫЛО: множественные системные промпты
  messages.append({"role": "system", "content": assistant.system_prompt})
  messages.append({"role": "system", "content": "Отвечай по-русски."})
  messages.append({"role": "system", "content": "Используй базу знаний..."})

  # СТАЛО: консолидированный системный промпт
  system_parts = [assistant.system_prompt, "Отвечай по-русски.", ...]
  consolidated_system_prompt = "\n\n".join(system_parts)
  messages.append({"role": "system", "content": consolidated_system_prompt})
  ```

- **`frontend/components/wizards/QuickAssistantWizard.js`**:
  - Убран хардкодный массив `promptTemplates`
  - Добавлено состояние `const [promptTemplates, setPromptTemplates] = useState([])`
  - Добавлена функция `fetchPromptTemplates()` с API вызовом
  - Добавлен `useEffect` для загрузки промптов при монтировании

- **`frontend/components/wizards/OnboardingWizard.js`**:
  - Убран хардкодный массив `ASSISTANT_TEMPLATES`
  - Добавлено состояние `const [assistantTemplates, setAssistantTemplates] = useState([])`
  - Добавлена функция `fetchPromptTemplates()` с маппингом UI
  - Добавлен `useEffect` для загрузки при монтировании

### 🗑️ Удалено (Removed)
- **Хардкодные промпты** из всех компонентов фронтенда
- **Дефолтное значение** из модели БД `Assistant.system_prompt`
- **Дублирование промптов** в файлах:
  - `backend/ai/professional_prompts.py` (частично)
  - `backend/ai/prompt_variations.py` (частично)

### 🐛 Исправлено (Fixed)
- **Критическая проблема**: Новые агенты игнорировали системные промпты
- **Проблема с агентом ID 17**: Отвечал на математические вопросы вместо отказа
- **Архитектурная проблема**: Отсутствие единого источника истины для промптов
- **Проблема миграции**: Старые промпты не обновлялись автоматически
- **Конфликт системных промптов**: Множественные системные промпты в `dialogs.py` переопределяли ограничения

### 🔒 Безопасность (Security)
- **Улучшенный контроль промптов**: Агенты теперь четко ограничены в ответах на нерелевантные вопросы
- **Централизованное управление**: Все промпты контролируются из одного места

## Технические детали

### Структура нового модуля промптов
```
backend/constants/prompts.py
├── DEFAULT_SYSTEM_PROMPT (str) - основной промпт
├── PROMPT_TEMPLATES (dict) - шаблоны промптов
├── get_default_prompt() -> str
├── get_prompt_templates() -> List[dict]
└── migrate_legacy_prompt(old_prompt: str) -> str
```

### Новый API эндпоинт
```http
GET /api/prompt-templates
Content-Type: application/json

Response:
[
  {
    "id": "support",
    "name": "Служба поддержки",
    "description": "Помогает клиентам решать вопросы и проблемы",
    "prompt": "Ты ассистент службы поддержки..."
  },
  // ...
]
```

### Миграция БД
```sql
-- Убираем дефолтное значение
ALTER TABLE assistants ALTER COLUMN system_prompt DROP DEFAULT;

-- Обновляем существующие записи
UPDATE assistants SET system_prompt = ? WHERE system_prompt IN (?);
UPDATE assistants SET system_prompt = ? WHERE system_prompt IS NULL;
```

### Список обновленных промптов в БД
Миграция заменила следующие старые промпты на новый централизованный:
- `'Привет! Я ваш AI-помощник. Готов ответить на вопросы и помочь с любыми задачами. Чем могу быть полезен?'`
- `'Добро пожаловать! Я Ваш AI-ассистент...'`
- `'Ты — дружелюбный специалист службы поддержки...'`
- `'Ты — опытный консультант по продажам...'`
- `'Ты — информационный ассистент...'`
- `'Ты — ассистент для записи на услуги...'`
- `'Ты — полезный AI-ассистент...'`

### Процедура отката (Rollback)
```bash
# Откат миграции БД
cd backend
python -m alembic downgrade -1

# Восстановление старых файлов из git
git checkout HEAD~1 -- backend/database/models.py
git checkout HEAD~1 -- backend/database/crud.py
# и т.д. для всех измененных файлов
```

### Тестирование
```bash
# Проверка работы API
curl -X GET http://localhost:8000/api/prompt-templates

# Проверка создания агента
python -c "from backend.database import crud, schemas; ..."

# Проверка миграции БД
python -c "
from backend.database.connection import engine
# SELECT system_prompt FROM assistants WHERE id = 17;
"
```

---

**Затронутые компоненты**: Backend API, Frontend UI, Database Schema, AI System
**Уровень изменений**: CRITICAL - требует миграции БД
**Автор**: Claude Code
**Дата**: 18 сентября 2025