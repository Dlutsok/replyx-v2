-- Чеклист SQL-команд для базы chat_ai (PostgreSQL)

-- 1. Посмотреть всех пользователей
SELECT * FROM users;

-- 2. Посмотреть все диалоги
SELECT * FROM dialogs;

-- 3. Посмотреть все сообщения в диалогах
SELECT * FROM dialog_messages;

-- 4. Посмотреть все рассылки (история)
SELECT * FROM broadcasts ORDER BY created_at DESC;

-- 5. Посмотреть все Telegram токены
SELECT * FROM telegram_tokens;

-- 6. Посмотреть все OpenAI токены
SELECT * FROM openai_tokens;

-- 7. Посмотреть все интеграционные токены
SELECT * FROM integration_tokens;

-- 8. Посмотреть все документы
SELECT * FROM documents;

-- 9. Посмотреть знания пользователя
SELECT * FROM user_knowledge;

-- 10. Добавить нового пользователя (пример)
INSERT INTO users (email, hashed_password, role, status, created_at, ai_model, system_prompt)
VALUES ('user@example.com', 'HASHED_PASSWORD', 'user', 'active', NOW(), 'gpt-4', 'Ты — ИИ');

-- 11. Изменить роль пользователя на admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

-- 12. Удалить пользователя
DELETE FROM users WHERE email = 'user@example.com';

-- 13. Посчитать количество пользователей
SELECT COUNT(*) FROM users;

-- 14. Найти все диалоги конкретного пользователя
SELECT * FROM dialogs WHERE user_id = 1;

-- 15. Найти все сообщения в диалоге
SELECT * FROM dialog_messages WHERE dialog_id = 1 ORDER BY timestamp;

-- 16. Найти все рассылки, которые были прочитаны
SELECT * FROM broadcasts WHERE read_count > 0;

-- 17. Посмотреть структуру таблицы (пример для users)
\d users;

-- 18. Получить список всех таблиц
\dt

-- 19. Выйти из psql
\q

-- 20. Справка по psql
\?