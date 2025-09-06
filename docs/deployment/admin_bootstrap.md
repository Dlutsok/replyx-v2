# 🛡️ Создание первого администратора ReplyX

## Обзор

После развертывания базы данных система не содержит пользователей с административными правами. Для создания первого администратора используется безопасный bootstrap-скрипт `scripts/admin_bootstrap.py`.

## Особенности скрипта

- ✅ **Идемпотентный** - безопасно запускать повторно
- ✅ **Безопасный** - не хранит пароли в репозитории или логах  
- ✅ **Два режима работы** - invite (рекомендуется) и interactive
- ✅ **Автоматическая интеграция** с production_deploy.sh
- ✅ **Автоматическое создание баланса** - админу начисляется 200,000 руб

## Режимы работы

### Invite Mode (рекомендуется)

В invite-режиме скрипт создаёт администратора без пароля и генерирует одноразовую ссылку для безопасной установки пароля:

```bash
export FIRST_ADMIN_EMAIL="admin@your-domain.com"
export FIRST_ADMIN_MODE="invite"
export PUBLIC_APP_URL="https://replyx.your-domain.com"
python3 scripts/admin_bootstrap.py
```

**Вывод:**
```
✅ Admin created: admin@your-domain.com
💰 Created admin balance: 200000.00 руб
📧 Send this one-time password setup link (valid 24h):
   https://replyx.your-domain.com/reset-password?token=abc123...
```

### Interactive Mode

В интерактивном режиме скрипт запросит пароль безопасно через getpass:

```bash
export FIRST_ADMIN_EMAIL="admin@your-domain.com"
export FIRST_ADMIN_MODE="interactive"
python3 scripts/admin_bootstrap.py
```

## Интеграция с production_deploy.sh

Bootstrap-скрипт автоматически вызывается в production_deploy.sh, если установлена переменная `FIRST_ADMIN_EMAIL`:

```bash
export DATABASE_URL="postgresql://user:pass@host:port/db"
export FIRST_ADMIN_EMAIL="admin@your-domain.com"
export FIRST_ADMIN_MODE="invite"
export PUBLIC_APP_URL="https://replyx.your-domain.com"

./scripts/production_deploy.sh
```

Скрипт запустится после успешного применения миграций.

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|--------------|-------------|----------|
| `FIRST_ADMIN_EMAIL` | ✅ | - | Email первого администратора |
| `FIRST_ADMIN_MODE` | ❌ | `invite` | Режим: `invite` или `interactive` |
| `PUBLIC_APP_URL` | ❌ | `http://localhost:3000` | URL приложения для ссылок сброса |
| `SEND_ADMIN_EMAIL` | ❌ | `false` | Отправлять email в invite-режиме |

## Безопасность

### Почему invite-режим лучше

- 🔒 Пароль не передается через командную строку
- 🔒 Пароль не попадает в логи CI/CD или историю bash
- 🔒 Администратор сам задает пароль по защищенной ссылке
- 🔒 Ссылка действительна только 24 часа

### Что НЕ делать

❌ **НЕ создавайте админа в миграциях** - секреты не должны быть в миграциях
❌ **НЕ используйте ручной SQL** - легко забыть хеширование пароля  
❌ **НЕ храните пароли в переменных окружения** - небезопасно

## Примеры использования

### Локальная разработка
```bash
export FIRST_ADMIN_EMAIL="admin@localhost"
export FIRST_ADMIN_MODE="interactive"
python3 scripts/admin_bootstrap.py
```

### Staging/Production (с отправкой email)
```bash
export FIRST_ADMIN_EMAIL="admin@company.com"
export FIRST_ADMIN_MODE="invite"  
export PUBLIC_APP_URL="https://replyx.company.com"
export SEND_ADMIN_EMAIL="true"  # Отправить email автоматически
python3 scripts/admin_bootstrap.py
```

### Staging/Production (безопасно, без email)
```bash
export FIRST_ADMIN_EMAIL="admin@company.com"
export FIRST_ADMIN_MODE="invite"  
export PUBLIC_APP_URL="https://replyx.company.com"
# SEND_ADMIN_EMAIL не установлена = ссылка выводится в консоль
python3 scripts/admin_bootstrap.py
```

### В составе CI/CD
```bash
# В .github/workflows/deploy.yml или аналогичном
- name: Deploy database and create admin
  run: |
    export DATABASE_URL="${{ secrets.DATABASE_URL }}"
    export FIRST_ADMIN_EMAIL="${{ secrets.ADMIN_EMAIL }}"
    export FIRST_ADMIN_MODE="invite"
    export PUBLIC_APP_URL="${{ vars.PUBLIC_APP_URL }}"
    ./scripts/production_deploy.sh
```

## Проверка результата

После выполнения скрипта проверьте создание администратора:

```sql
-- Проверить наличие администраторов
SELECT id, email, role, status, is_email_confirmed, created_at 
FROM users 
WHERE role = 'admin';

-- Проверить баланс администратора
SELECT u.email, ub.balance, ub.total_topped_up, ub.created_at
FROM users u
JOIN user_balances ub ON u.id = ub.user_id
WHERE u.role = 'admin';

-- Проверить транзакции админа (должна быть admin_credit на 200,000)
SELECT bt.transaction_type, bt.amount, bt.description, 
       bt.balance_before, bt.balance_after, bt.created_at
FROM users u
JOIN balance_transactions bt ON u.id = bt.user_id
WHERE u.role = 'admin';
```

## Troubleshooting

**Ошибка: "FIRST_ADMIN_EMAIL is required"**
```bash
export FIRST_ADMIN_EMAIL="admin@your-domain.com"
```

**Ошибка: "Admin already exists"**  
Это нормально - скрипт идемпотентный и не создаст дубликат.

**Ошибка подключения к БД**
Проверьте `DATABASE_URL` и доступность базы данных.

## Что создается при bootstrap

Скрипт автоматически создаёт:

1. **Пользователя** с ролью `admin` и статусом `active`
2. **Баланс** в размере **200,000 руб** на счету администратора
3. **Транзакцию** типа `admin_credit` для начисления баланса
4. **Токен сброса пароля** (в invite-режиме) действительный 24 часа

## Дополнительные рекомендации

- 🔐 Включите MFA для админ-аккаунта после входа
- 🌐 Ограничьте доступ к админ-панели по IP в production
- 📧 Используйте корпоративный email для администратора
- 🔄 Периодически ротируйте пароли администраторов
- 💰 **Администратор получает 200,000 руб** для тестирования системы оплаты