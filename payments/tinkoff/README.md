# Интеграция с Т-Банк (упрощенная)

## Подход: Перенаправление на сайт Т-Банка

Пользователь: Страница баланса → Сайт Т-Банка → Возврат с результатом

## Структура:

1. **Backend добавления:**
   - Модель `Payment` в `backend/database/models.py`
   - API endpoint в `backend/api/tinkoff_payments.py`
   - Конфигурация в `.env`

2. **Frontend добавления:**
   - Модификация страницы `frontend/pages/balance.js`
   - Страницы результатов `frontend/pages/payment-success.js` и `payment-error.js`

3. **Миграция:**
   - Добавление таблицы `payments`

## Процесс оплаты:
1. Пользователь вводит сумму и нажимает "Пополнить"
2. POST запрос на `/api/payments/create-payment`
3. Создается запись Payment в БД
4. Формируется POST форма с данными для Т-Банк
5. Автоматическое перенаправление на securepay.tinkoff.ru
6. После оплаты возврат на success_url или fail_url
7. Обновление баланса и статуса платежа