import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FiSearch, FiDatabase, FiTable, FiInfo, FiEye, FiGrid, FiList, FiUser, FiUsers, FiGlobe, FiFilter, FiExternalLink, FiLink, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { withAuth } from '../hooks/useAuth';
import { API_URL } from '../config/api';
import { DESIGN_TOKENS } from '../constants';
import DataTable from '../components/admin/DataTable';
import RecordEditor from '../components/admin/RecordEditor';
import CreateRecordModal from '../components/admin/CreateRecordModal';

// Схема базы данных с описаниями полей
const DATABASE_SCHEMA = {
  users: {
    title: 'Пользователи системы',
    description: 'Основная таблица пользователей с данными аутентификации и онбординга',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID пользователя', example: 1 },
      yandex_id: { type: 'String', description: 'ID пользователя в Яндексе (для OAuth)', example: 'yandex_123456' },
      email: { type: 'String', description: 'Email адрес пользователя', example: 'user@example.com' },
      hashed_password: { type: 'String', description: 'Хэш пароля (bcrypt)', example: '$2b$12$...' },
      role: { type: 'String', description: 'Роль пользователя', example: 'user', values: ['user', 'admin'] },
      status: { type: 'String', description: 'Статус аккаунта', example: 'active', values: ['active', 'inactive', 'banned'] },
      created_at: { type: 'DateTime', description: 'Дата регистрации', example: '2024-01-15 10:30:00' },
      last_activity: { type: 'DateTime', description: 'Последняя активность в ЛК', example: '2024-08-31 20:45:12' },
      is_email_confirmed: { type: 'Boolean', description: 'Подтвержден ли email', example: true },
      email_confirmation_code: { type: 'String', description: 'Код подтверждения email', example: 'ABC123DEF' },
      first_name: { type: 'String', description: 'Имя пользователя', example: 'Иван' },
      onboarding_completed: { type: 'Boolean', description: 'Завершен ли онбординг', example: true },
      onboarding_step: { type: 'Integer', description: 'Текущий шаг онбординга (0-5)', example: 3 },
      onboarding_started_at: { type: 'DateTime', description: 'Когда начат онбординг', example: '2024-01-15 10:35:00' },
      onboarding_completed_at: { type: 'DateTime', description: 'Когда завершен онбординг', example: '2024-01-15 11:20:00' },
      onboarding_skipped: { type: 'Boolean', description: 'Пропущен ли онбординг', example: false },
      first_bot_created: { type: 'Boolean', description: 'Создан ли первый бот', example: true },
      first_message_sent: { type: 'Boolean', description: 'Отправлено ли первое сообщение', example: true },
      tutorial_tips_shown: { type: 'Text(JSON)', description: 'Массив показанных подсказок', example: '["tip1", "tip2"]' },
      welcome_bonus_received: { type: 'Boolean', description: 'Получен ли приветственный бонус', example: false },
      password_reset_token: { type: 'String', description: 'Токен для сброса пароля', example: 'reset_token_123' },
      password_reset_expires: { type: 'DateTime', description: 'Срок действия токена сброса', example: '2024-08-31 23:59:59' }
    }
  },
  
  assistants: {
    title: 'AI Ассистенты',
    description: 'Настройки и конфигурация AI ассистентов пользователей',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID ассистента', example: 117 },
      user_id: { type: 'Integer', description: 'ID владельца ассистента', example: 1 },
      name: { type: 'String', description: 'Название ассистента', example: 'AI-консультант по продажам' },
      ai_model: { type: 'String', description: 'Модель AI', example: 'gpt-4o-mini', values: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
      system_prompt: { type: 'Text', description: 'Системный промпт', example: 'Вы корпоративный AI-ассистент...' },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-15 12:00:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-31 19:45:00' },
      is_active: { type: 'Boolean', description: 'Активен ли ассистент', example: true },
      website_integration_enabled: { type: 'Boolean', description: 'Включена ли интеграция с сайтом', example: true },
      allowed_domains: { type: 'Text', description: 'Разрешенные домены для виджета', example: 'https://stencom.ru, mysite.com' },
      knowledge_version: { type: 'Integer', description: 'Версия знаний для lazy reload', example: 15 },
      operator_name: { type: 'String', description: 'Имя оператора в виджете', example: 'Даниил' },
      business_name: { type: 'String', description: 'Название бизнеса в виджете', example: 'СтенКом' },
      avatar_url: { type: 'Text', description: 'URL аватара оператора', example: '/uploads/avatars/user1_avatar.jpg' },
      widget_theme: { type: 'String', description: 'Тема виджета', example: '#313131', values: ['blue', 'green', 'purple', 'orange', 'HEX код'] },
      widget_settings: { type: 'JSON', description: 'Дополнительные настройки виджета', example: '{"position": "bottom-right", "buttonSize": 80}' },
      widget_version: { type: 'Integer', description: 'Версия виджета для отзыва токенов', example: 1 }
    }
  },

  dialogs: {
    title: 'Диалоги',
    description: 'Диалоги пользователей с AI ассистентами и операторами',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID диалога', example: 1542 },
      user_id: { type: 'Integer', description: 'ID пользователя (если авторизован)', example: 1 },
      assistant_id: { type: 'Integer', description: 'ID ассистента, который ведет диалог', example: 117 },
      started_at: { type: 'DateTime', description: 'Время начала диалога', example: '2024-08-31 20:30:00' },
      ended_at: { type: 'DateTime', description: 'Время завершения диалога', example: null },
      auto_response: { type: 'Integer', description: 'Есть ли автоответы (1/0)', example: 1 },
      first_response_time: { type: 'Float', description: 'Время первого ответа (сек)', example: 2.5 },
      fallback: { type: 'Integer', description: 'Был ли fallback (1/0)', example: 0 },
      is_taken_over: { type: 'Integer', description: 'Перехвачен ли оператором (1/0)', example: 0 },
      telegram_chat_id: { type: 'String', description: 'ID чата в Telegram', example: '123456789' },
      telegram_username: { type: 'String', description: 'Username в Telegram', example: '@username' },
      first_name: { type: 'String', description: 'Имя из Telegram', example: 'Иван' },
      last_name: { type: 'String', description: 'Фамилия из Telegram', example: 'Петров' },
      guest_id: { type: 'String', description: 'ID гостя (для анонимных)', example: 'guest_abc123def456' },
      handoff_status: { type: 'String', description: 'Статус передачи оператору', example: 'none', values: ['none', 'requested', 'assigned', 'active', 'resolved'] },
      handoff_requested_at: { type: 'DateTime', description: 'Время запроса передачи', example: null },
      handoff_started_at: { type: 'DateTime', description: 'Время начала работы оператора', example: null },
      handoff_resolved_at: { type: 'DateTime', description: 'Время завершения работы оператора', example: null },
      handoff_reason: { type: 'String', description: 'Причина передачи оператору', example: 'complex_question' },
      assigned_manager_id: { type: 'Integer', description: 'ID назначенного менеджера', example: null },
      request_id: { type: 'String', description: 'UUID запроса передачи', example: 'req_abc123-def456-789' }
    }
  },

  dialog_messages: {
    title: 'Сообщения диалогов',
    description: 'Все сообщения в диалогах между пользователями, AI и операторами',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID сообщения', example: 15420 },
      dialog_id: { type: 'Integer', description: 'ID диалога', example: 1542 },
      sender: { type: 'String', description: 'Отправитель сообщения', example: 'user', values: ['user', 'assistant', 'manager'] },
      text: { type: 'Text', description: 'Текст сообщения', example: 'Здравствуйте! Подскажите про ваши услуги' },
      timestamp: { type: 'DateTime', description: 'Время отправки', example: '2024-08-31 20:30:15' },
      delivered: { type: 'Integer', description: 'Доставлено в Telegram (1/0)', example: 1 },
      message_kind: { type: 'String', description: 'Тип сообщения', example: 'user', values: ['user', 'assistant', 'operator', 'system'] },
      system_type: { type: 'String', description: 'Тип системного сообщения', example: null, values: ['handoff_requested', 'handoff_started', 'handoff_released'] }
    }
  },

  documents: {
    title: 'Документы',
    description: 'Загруженные пользователями документы для базы знаний',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID документа', example: 85 },
      user_id: { type: 'Integer', description: 'ID владельца документа', example: 1 },
      filename: { type: 'String', description: 'Имя файла', example: 'Инструкция_по_продуктам.docx' },
      size: { type: 'Integer', description: 'Размер файла в байтах', example: 245760 },
      upload_date: { type: 'DateTime', description: 'Дата загрузки', example: '2024-08-15 14:20:00' },
      doc_hash: { type: 'String', description: 'SHA-256 хэш документа', example: 'a1b2c3d4e5f6...' }
    }
  },

  knowledge_embeddings: {
    title: 'Векторные представления знаний',
    description: 'Embeddings фрагментов документов и Q&A для семантического поиска',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID embedding', example: 12540 },
      user_id: { type: 'Integer', description: 'ID владельца', example: 1 },
      assistant_id: { type: 'Integer', description: 'ID ассистента', example: 117 },
      doc_id: { type: 'Integer', description: 'ID документа (для doc embeddings)', example: 85 },
      qa_id: { type: 'Integer', description: 'ID Q&A записи', example: null },
      chunk_index: { type: 'Integer', description: 'Номер фрагмента в документе', example: 5 },
      chunk_text: { type: 'Text', description: 'Текст фрагмента', example: 'Наша компания предлагает услуги по автоматизации...' },
      embedding: { type: 'Vector(1536)', description: 'Векторное представление (OpenAI Ada)', example: '[0.123, -0.456, 0.789, ...]' },
      doc_type: { type: 'String', description: 'Тип документа', example: 'instruction', values: ['instruction', 'FAQ', 'regulation', 'manual'] },
      importance: { type: 'Integer', description: 'Важность фрагмента (1-10)', example: 8 },
      token_count: { type: 'Integer', description: 'Количество токенов', example: 150 },
      chunk_hash: { type: 'String', description: 'Хэш фрагмента', example: 'chunk_a1b2c3d4' },
      source: { type: 'String', description: 'Источник embedding', example: 'document', values: ['document', 'confirmed_knowledge', 'website'] },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-08-15 14:25:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-15 14:25:00' }
    }
  },

  qa_knowledge: {
    title: 'База знаний Q&A',
    description: 'Вопросы и ответы для обучения ассистентов',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID Q&A', example: 42 },
      user_id: { type: 'Integer', description: 'ID владельца', example: 1 },
      assistant_id: { type: 'Integer', description: 'ID ассистента', example: 117 },
      question: { type: 'Text', description: 'Вопрос', example: 'Какие услуги предоставляет компания?' },
      answer: { type: 'Text', description: 'Ответ', example: 'Мы предоставляем услуги по разработке чат-ботов, интеграции AI...' },
      category: { type: 'String', description: 'Категория Q&A', example: 'services', values: ['services', 'pricing', 'technical', 'general'] },
      keywords: { type: 'String', description: 'Ключевые слова', example: 'услуги, разработка, AI, боты' },
      importance: { type: 'Integer', description: 'Важность (1-10)', example: 9 },
      usage_count: { type: 'Integer', description: 'Количество использований', example: 25 },
      last_used: { type: 'DateTime', description: 'Последнее использование', example: '2024-08-31 19:30:00' },
      is_active: { type: 'Boolean', description: 'Активна ли запись', example: true },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-08-10 12:00:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-31 19:30:00' }
    }
  },

  bot_instances: {
    title: 'Экземпляры ботов',
    description: 'Настройки Telegram ботов пользователей',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID бота', example: 15 },
      user_id: { type: 'Integer', description: 'ID владельца', example: 1 },
      assistant_id: { type: 'Integer', description: 'ID связанного ассистента', example: 117 },
      platform: { type: 'String', description: 'Платформа бота', example: 'telegram', values: ['telegram'] },
      bot_token: { type: 'String', description: 'Токен Telegram бота', example: '1234567890:AABBCCddEEff...' },
      is_active: { type: 'Boolean', description: 'Активен ли бот', example: true },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-20 15:00:00' }
    }
  },

  user_balances: {
    title: 'Балансы пользователей',
    description: 'Финансовые балансы пользователей для оплаты услуг',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID баланса', example: 1 },
      user_id: { type: 'Integer', description: 'ID пользователя', example: 1 },
      balance: { type: 'Float', description: 'Текущий баланс (руб)', example: 245.50 },
      total_spent: { type: 'Float', description: 'Всего потрачено (руб)', example: 1254.50 },
      total_topped_up: { type: 'Float', description: 'Всего пополнено (руб)', example: 1500.00 },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-15 10:30:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-31 20:15:00' }
    }
  },

  balance_transactions: {
    title: 'Транзакции баланса',
    description: 'История пополнений и списаний с баланса пользователей',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID транзакции', example: 1540 },
      user_id: { type: 'Integer', description: 'ID пользователя', example: 1 },
      amount: { type: 'Float', description: 'Сумма (+ пополнение, - списание)', example: -2.50 },
      transaction_type: { type: 'String', description: 'Тип операции', example: 'ai_message', values: ['topup', 'ai_message', 'document_upload', 'bot_message', 'widget_message'] },
      description: { type: 'String', description: 'Описание операции', example: 'AI ответ в диалоге #1542' },
      balance_before: { type: 'Float', description: 'Баланс до операции', example: 248.00 },
      balance_after: { type: 'Float', description: 'Баланс после операции', example: 245.50 },
      related_id: { type: 'Integer', description: 'ID связанной сущности', example: 15420 },
      created_at: { type: 'DateTime', description: 'Дата операции', example: '2024-08-31 20:30:15' }
    }
  },

  ai_token_pool: {
    title: 'Пул AI токенов',
    description: 'Управление OpenAI API ключами и балансировка нагрузки',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID токена', example: 3 },
      name: { type: 'String', description: 'Название токена', example: 'Production Token #1' },
      token: { type: 'String', description: 'OpenAI API ключ', example: 'sk-proj-abcdef123456...' },
      model_access: { type: 'String', description: 'Доступные модели', example: 'gpt-4o,gpt-4o-mini' },
      daily_limit: { type: 'Integer', description: 'Лимит запросов в день', example: 10000 },
      monthly_limit: { type: 'Integer', description: 'Лимит запросов в месяц', example: 300000 },
      current_daily_usage: { type: 'Integer', description: 'Использовано сегодня', example: 1247 },
      current_monthly_usage: { type: 'Integer', description: 'Использовано в месяце', example: 45230 },
      last_reset_daily: { type: 'DateTime', description: 'Последний сброс дневного счетчика', example: '2024-08-31 00:00:00' },
      last_reset_monthly: { type: 'DateTime', description: 'Последний сброс месячного счетчика', example: '2024-08-01 00:00:00' },
      priority: { type: 'Integer', description: 'Приоритет использования (1-10)', example: 1 },
      is_active: { type: 'Boolean', description: 'Активен ли токен', example: true },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-10 00:00:00' },
      last_used: { type: 'DateTime', description: 'Последнее использование', example: '2024-08-31 20:30:15' },
      error_count: { type: 'Integer', description: 'Количество ошибок подряд', example: 0 },
      last_error: { type: 'DateTime', description: 'Время последней ошибки', example: null },
      notes: { type: 'Text', description: 'Заметки администратора', example: 'Основной продакшен токен' }
    }
  },

  ai_token_usage: {
    title: 'Логи использования AI токенов',
    description: 'Детальная статистика использования OpenAI API',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID лога', example: 85420 },
      token_id: { type: 'Integer', description: 'ID использованного токена', example: 3 },
      user_id: { type: 'Integer', description: 'ID пользователя', example: 1 },
      assistant_id: { type: 'Integer', description: 'ID ассистента', example: 117 },
      model_used: { type: 'String', description: 'Использованная модель', example: 'gpt-4o-mini' },
      prompt_tokens: { type: 'Integer', description: 'Токены в запросе', example: 850 },
      completion_tokens: { type: 'Integer', description: 'Токены в ответе', example: 120 },
      total_tokens: { type: 'Integer', description: 'Общее количество токенов', example: 970 },
      request_type: { type: 'String', description: 'Тип запроса', example: 'chat', values: ['chat', 'embedding', 'completion'] },
      response_time: { type: 'Float', description: 'Время ответа (сек)', example: 2.45 },
      success: { type: 'Boolean', description: 'Успешен ли запрос', example: true },
      error_message: { type: 'Text', description: 'Сообщение об ошибке', example: null },
      created_at: { type: 'DateTime', description: 'Время запроса', example: '2024-08-31 20:30:15' }
    }
  },

  system_settings: {
    title: 'Системные настройки',
    description: 'Конфигурация системы для админ панели',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID настройки', example: 15 },
      category: { type: 'String', description: 'Категория настройки', example: 'ai', values: ['general', 'ai', 'email', 'security', 'limits', 'maintenance'] },
      key: { type: 'String', description: 'Ключ настройки', example: 'default_model' },
      value: { type: 'Text', description: 'Значение настройки', example: 'gpt-4o-mini' },
      data_type: { type: 'String', description: 'Тип данных', example: 'string', values: ['string', 'boolean', 'integer', 'float', 'json'] },
      is_sensitive: { type: 'Boolean', description: 'Чувствительные данные', example: false },
      description: { type: 'Text', description: 'Описание настройки', example: 'Модель AI по умолчанию для новых ассистентов' },
      default_value: { type: 'Text', description: 'Значение по умолчанию', example: 'gpt-4o-mini' },
      is_active: { type: 'Boolean', description: 'Активна ли настройка', example: true },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-10 00:00:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-31 15:20:00' },
      updated_by: { type: 'Integer', description: 'ID пользователя, который обновил', example: 1 }
    }
  },

  handoff_audit: {
    title: 'Аудит передач операторам',
    description: 'Логирование всех изменений статусов передачи операторам',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID записи', example: 245 },
      dialog_id: { type: 'Integer', description: 'ID диалога', example: 1542 },
      from_status: { type: 'String', description: 'Предыдущий статус', example: 'none' },
      to_status: { type: 'String', description: 'Новый статус', example: 'requested' },
      user_id: { type: 'Integer', description: 'ID пользователя (если применимо)', example: 1 },
      reason: { type: 'String', description: 'Причина изменения', example: 'User requested human agent' },
      request_id: { type: 'String', description: 'UUID запроса', example: 'req_abc123-def456' },
      seq: { type: 'Integer', description: 'Порядковый номер изменения', example: 1 },
      extra_data: { type: 'JSON', description: 'Дополнительные данные', example: '{"queue_position": 2}' },
      created_at: { type: 'DateTime', description: 'Время изменения', example: '2024-08-31 20:35:00' }
    }
  },

  operator_presence: {
    title: 'Присутствие операторов',
    description: 'Отслеживание активности и доступности операторов',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID записи', example: 1 },
      user_id: { type: 'Integer', description: 'ID оператора', example: 1 },
      status: { type: 'String', description: 'Статус оператора', example: 'online', values: ['online', 'away', 'busy', 'offline'] },
      last_heartbeat: { type: 'DateTime', description: 'Последний heartbeat', example: '2024-08-31 20:46:00' },
      max_active_chats_web: { type: 'Integer', description: 'Макс. чатов с веб-виджета', example: 3 },
      max_active_chats_telegram: { type: 'Integer', description: 'Макс. чатов из Telegram', example: 5 },
      active_chats: { type: 'Integer', description: 'Текущее количество активных чатов', example: 1 },
      created_at: { type: 'DateTime', description: 'Дата создания', example: '2024-01-15 10:00:00' },
      updated_at: { type: 'DateTime', description: 'Дата обновления', example: '2024-08-31 20:46:00' }
    }
  },

  blog_posts: {
    title: 'Статьи блога',
    description: 'Статьи блога с поддержкой планирования публикации и SEO',
    fields: {
      id: { type: 'Integer', description: 'Уникальный ID статьи', example: 1 },
      title: { type: 'String', description: 'Заголовок статьи', example: 'Как использовать AI в бизнесе' },
      excerpt: { type: 'Text', description: 'Краткое описание статьи', example: 'Разбираем основные способы применения...' },
      content: { type: 'Text', description: 'Полное содержимое статьи', example: 'Искусственный интеллект сегодня...' },
      author: { type: 'String', description: 'Автор статьи', example: 'Даниил Логинов' },
      date: { type: 'DateTime', description: 'Дата создания', example: '2025-09-20 16:47:00' },
      read_time: { type: 'String', description: 'Время чтения', example: '5 мин' },
      category: { type: 'String', description: 'Категория статьи', example: 'Технологии' },
      tags: { type: 'JSON', description: 'Теги статьи', example: '["AI", "бизнес", "автоматизация"]' },
      image: { type: 'String', description: 'URL изображения', example: '/uploads/blog/ai-business.jpg' },
      featured: { type: 'Boolean', description: 'Рекомендуемая статья', example: false },
      views: { type: 'Integer', description: 'Количество просмотров', example: 0 },
      likes: { type: 'Integer', description: 'Количество лайков', example: 0 },
      is_published: { type: 'Boolean', description: 'Опубликована ли статья', example: false },
      slug: { type: 'String', description: 'SEO URL статьи', example: 'kak-ispolzovat-ai-v-biznese' },
      meta_title: { type: 'String', description: 'SEO заголовок', example: 'Как использовать AI в бизнесе | ReplyX' },
      meta_description: { type: 'String', description: 'SEO описание', example: 'Полное руководство по применению ИИ...' },
      keywords: { type: 'Text', description: 'SEO ключевые слова', example: 'AI, искусственный интеллект, бизнес' },
      scheduled_for: { type: 'DateTime', description: 'Время запланированной публикации (UTC)', example: '2025-09-20 13:49:00' },
      published_at: { type: 'DateTime', description: 'Время фактической публикации (UTC)', example: null },
      status: { type: 'String', description: 'Статус статьи', example: 'scheduled', values: ['draft', 'scheduled', 'published'] }
    }
  }
};

// Переводы полей таблиц
const FIELD_TRANSLATIONS = {
  // users
  id: 'ID',
  yandex_id: 'Яндекс ID',
  email: 'Email',
  hashed_password: 'Хэш пароля',
  role: 'Роль',
  status: 'Статус',
  created_at: 'Дата создания',
  last_activity: 'Последняя активность',
  is_email_confirmed: 'Email подтвержден',
  email_confirmation_code: 'Код подтверждения',
  first_name: 'Имя',
  onboarding_completed: 'Онбординг завершен',
  onboarding_step: 'Шаг онбординга',
  onboarding_started_at: 'Онбординг начат',
  onboarding_completed_at: 'Онбординг завершен',
  onboarding_skipped: 'Онбординг пропущен',
  first_bot_created: 'Первый бот создан',
  first_message_sent: 'Первое сообщение отправлено',
  tutorial_tips_shown: 'Показанные подсказки',
  welcome_bonus_received: 'Приветственный бонус получен',
  password_reset_token: 'Токен сброса пароля',
  password_reset_expires: 'Токен истекает',
  
  // assistants
  user_id: 'ID пользователя',
  name: 'Название',
  ai_model: 'AI модель',
  system_prompt: 'Системный промпт',
  updated_at: 'Обновлено',
  is_active: 'Активен',
  knowledge_version: 'Версия знаний',
  auto_handoff_enabled: 'Автопередача включена',
  handoff_threshold: 'Порог передачи',
  context_window: 'Окно контекста',
  avatar_url: 'URL аватара',
  allowed_domains: 'Разрешенные домены',
  
  // dialogs
  assistant_id: 'ID ассистента',
  session_id: 'ID сессии',
  site_user_name: 'Имя пользователя сайта',
  site_user_email: 'Email пользователя сайта',
  widget_position: 'Позиция виджета',
  is_widget: 'Это виджет',
  handoff_requested: 'Передача запрошена',
  handoff_reason: 'Причина передачи',
  handoff_started_at: 'Передача начата',
  manager_id: 'ID менеджера',
  handoff_completed_at: 'Передача завершена',
  
  // messages
  dialog_id: 'ID диалога',
  sender: 'Отправитель',
  content: 'Содержание',
  message_type: 'Тип сообщения',
  message_kind: 'Вид сообщения',
  ai_model: 'AI модель',
  tokens_used: 'Токенов использовано',
  response_time: 'Время ответа',
  
  // documents
  filename: 'Имя файла',
  original_filename: 'Оригинальное имя файла',
  file_size: 'Размер файла',
  file_type: 'Тип файла',
  upload_path: 'Путь загрузки',
  processing_status: 'Статус обработки',
  error_message: 'Сообщение об ошибке',
  doc_hash: 'Хэш документа',
  
  // bot_instances
  telegram_bot_token: 'Токен Telegram бота',
  telegram_chat_id: 'ID чата Telegram',
  
  // balance_transactions
  amount: 'Сумма',
  transaction_type: 'Тип транзакции',
  description: 'Описание',
  service_type: 'Тип услуги',
  
  // user_balances
  current_balance: 'Текущий баланс',
  total_spent: 'Всего потрачено',
  total_topped_up: 'Всего пополнено',
  
  // document_embeddings
  chunk_index: 'Индекс чанка',
  chunk_text: 'Текст чанка',
  embedding: 'Эмбеддинг',
  chunk_hash: 'Хэш чанка',
  source_page: 'Исходная страница',
  
  // operator_presence  
  operator_id: 'ID оператора',
  last_seen: 'Последний раз в сети',
  is_available: 'Доступен'
};

// Переводы значений
const VALUE_TRANSLATIONS = {
  // roles
  admin: 'Администратор',
  user: 'Пользователь',
  manager: 'Менеджер',
  
  // status
  active: 'Активный',
  inactive: 'Неактивный',
  banned: 'Заблокирован',
  
  // boolean
  true: 'Да',
  false: 'Нет',
  
  // sender types
  assistant: 'Ассистент',
  operator: 'Оператор',
  system: 'Система',
  
  // message types
  text: 'Текст',
  image: 'Изображение',
  document: 'Документ',
  
  // transaction types
  debit: 'Списание',
  credit: 'Пополнение',
  bonus: 'Бонус',
  topup: 'Пополнение',
  
  // handoff status
  none: 'Нет передачи',
  requested: 'Запрошена',
  assigned: 'Назначен оператор',
  active: 'Активная',
  resolved: 'Завершена',
  
  // AI models
  'gpt-4o': 'GPT-4 Omni',
  'gpt-4o-mini': 'GPT-4 Omni Mini',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  
  // service types
  ai_message: 'AI сообщение',
  document_processing: 'Обработка документа',
  widget_message: 'Сообщение виджета',
  bot_message: 'Сообщение бота',
  document_upload: 'Загрузка документа',

  // blog_posts
  title: 'Заголовок',
  excerpt: 'Краткое описание',
  content: 'Содержимое',
  author: 'Автор',
  date: 'Дата создания',
  read_time: 'Время чтения',
  category: 'Категория',
  tags: 'Теги',
  image: 'Изображение',
  featured: 'Рекомендуемая',
  views: 'Просмотры',
  likes: 'Лайки',
  is_published: 'Опубликована',
  slug: 'SEO URL',
  meta_title: 'SEO заголовок',
  meta_description: 'SEO описание',
  keywords: 'Ключевые слова',
  scheduled_for: 'Запланировано на',
  published_at: 'Опубликована',
  status: 'Статус',

  // blog post statuses
  draft: 'Черновик',
  scheduled: 'Запланирована',
  published: 'Опубликована'
};

// Связи между таблицами для навигации
const TABLE_RELATIONSHIPS = {
  users: {
    assistants: { field: 'user_id', label: 'Ассистенты пользователя' },
    dialogs: { field: 'user_id', label: 'Диалоги пользователя' },
    documents: { field: 'user_id', label: 'Документы пользователя' },
    bot_instances: { field: 'user_id', label: 'Боты пользователя' },
    user_balances: { field: 'user_id', label: 'Баланс пользователя' },
    balance_transactions: { field: 'user_id', label: 'Транзакции пользователя' },
    ai_token_usage: { field: 'user_id', label: 'Использование AI токенов' }
  },
  assistants: {
    users: { field: 'id', relationField: 'user_id', label: 'Владелец ассистента' },
    dialogs: { field: 'id', relationField: 'assistant_id', label: 'Диалоги ассистента' },
    knowledge_embeddings: { field: 'id', relationField: 'assistant_id', label: 'Embeddings ассистента' },
    qa_knowledge: { field: 'id', relationField: 'assistant_id', label: 'База знаний Q&A' },
    bot_instances: { field: 'id', relationField: 'assistant_id', label: 'Боты ассистента' }
  },
  dialogs: {
    users: { field: 'user_id', relationField: 'id', label: 'Пользователь диалога' },
    assistants: { field: 'assistant_id', relationField: 'id', label: 'Ассистент диалога' },
    dialog_messages: { field: 'id', relationField: 'dialog_id', label: 'Сообщения диалога' },
    handoff_audit: { field: 'id', relationField: 'dialog_id', label: 'История передач' }
  },
  documents: {
    users: { field: 'user_id', relationField: 'id', label: 'Владелец документа' },
    knowledge_embeddings: { field: 'id', relationField: 'doc_id', label: 'Embeddings документа' }
  }
};

// Форматирование значений
const formatValue = (key, value, useTranslations = false) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  // Boolean values
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {useTranslations ? (value ? 'Да' : 'Нет') : String(value)}
      </span>
    );
  }

  // Date fields
  if (key.includes('_at') || key.includes('_date') || key === 'last_activity' || key === 'last_used') {
    try {
      return new Date(value).toLocaleString('ru-RU');
    } catch {
      return String(value);
    }
  }

  // Money fields
  if (key.includes('balance') || key.includes('amount') || key.includes('price')) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return (
        <span className={num >= 0 ? 'text-green-600' : 'text-red-600'}>
          {num.toLocaleString('ru-RU', { 
            style: 'currency', 
            currency: 'RUB',
            minimumFractionDigits: 2
          })}
        </span>
      );
    }
  }

  // Email fields
  if (key.includes('email')) {
    return (
      <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    );
  }

  // Token counts and usage
  if (key.includes('token') || key.includes('usage')) {
    const num = parseInt(value);
    if (!isNaN(num)) {
      return (
        <span className="font-mono text-sm">
          {num.toLocaleString('ru-RU')}
        </span>
      );
    }
  }

  // Status and role fields with translations
  if (useTranslations && (key === 'role' || key === 'status' || key === 'sender' || key === 'handoff_status')) {
    const translated = VALUE_TRANSLATIONS[value] || value;
    const colorClass = 
      key === 'role' && value === 'admin' ? 'bg-red-100 text-red-800' :
      key === 'role' && value === 'manager' ? 'bg-yellow-100 text-yellow-800' :
      key === 'role' && value === 'user' ? 'bg-green-100 text-green-800' :
      key === 'status' && value === 'active' ? 'bg-green-100 text-green-800' :
      key === 'status' && value === 'banned' ? 'bg-red-100 text-red-800' :
      key === 'handoff_status' && value === 'active' ? 'bg-blue-100 text-blue-800' :
      'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${colorClass}`}>
        {translated}
      </span>
    );
  }

  // Long text truncation
  const str = String(value);
  if (str.length > 100) {
    return (
      <span title={str} className="cursor-help">
        {str.substring(0, 100)}...
      </span>
    );
  }

  return str;
};

// Компонент кнопки навигации к связанной записи  
const RelationshipButton = ({ tableName, recordId, relationTable, relationField, label, useTranslations, onNavigate }) => {
  const handleClick = () => {
    onNavigate(relationTable, relationField, recordId);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
      title={`Перейти к ${label}`}
    >
      <FiExternalLink className="w-3 h-3" />
      {useTranslations ? label : relationTable}
    </button>
  );
};

function DatabaseExplorer() {
  const router = useRouter();
  
  // Существующие состояния для схемы
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedField, setSelectedField] = useState(null);

  // Новые состояния для работы с данными
  const [mode, setMode] = useState('schema'); // 'schema', 'data', или 'users'
  const [loading, setLoading] = useState(false);
  const [tableSchema, setTableSchema] = useState(null);
  
  // Состояния для переводов и улучшений
  const [useTranslations, setUseTranslations] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [userRelatedData, setUserRelatedData] = useState({});
  
  // Состояния для фильтрации и навигации
  const [activeFilter, setActiveFilter] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  
  // Модальные окна
  const [editingRecord, setEditingRecord] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Загрузка схемы таблицы
  const fetchTableSchema = async (tableName) => {
    if (!tableName) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/database/tables/${tableName}/schema?_=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const schema = await response.json();
        setTableSchema(schema);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Загрузка списка пользователей для режима "По пользователям"
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/database/tables/users/data`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: 1,
          limit: 1000,
          search: null,
          filter_field: null,
          filter_value: null,
          sort_field: 'created_at',
          sort_order: 'desc'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setUsersList(result.data || []);
      } else {
      }
    } catch (error) {
    }
  };

  // Загрузка всех данных пользователя
  const fetchUserRelatedData = async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const relatedData = {};
      
      // Сначала получим список доступных таблиц из API
      let availableTables = [];
      try {
        const tablesResponse = await fetch(`${API_URL}/api/admin/database/tables`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tablesResponse.ok) {
          const tablesData = await tablesResponse.json();
          availableTables = tablesData.tables.map(t => t.name);
        }
      } catch (error) {
      }
      
      // Определяем таблицы, связанные с пользователями (только те, что доступны)
      const potentialUserRelatedTables = [
        { table: 'assistants', field: 'user_id' },
        { table: 'dialogs', field: 'user_id' },  
        { table: 'documents', field: 'user_id' },
        { table: 'bot_instances', field: 'user_id' },
        { table: 'user_balances', field: 'user_id' },
        { table: 'balance_transactions', field: 'user_id' }
      ];
      
      // Фильтруем только доступные таблицы
      const userRelatedTables = potentialUserRelatedTables.filter(
        ({ table }) => availableTables.length === 0 || availableTables.includes(table)
      );

      // Загружаем данные из каждой связанной таблицы
      for (const { table, field } of userRelatedTables) {
        try {
          const response = await fetch(
            `${API_URL}/api/admin/database/tables/${table}/data`, 
            {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                page: 1,
                limit: 1000,
                search: null,
                filter_field: field,
                filter_value: userId.toString(),
                sort_field: 'created_at',
                sort_order: 'desc'
              })
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            relatedData[table] = result.data || [];
          } else {
            relatedData[table] = [];
          }
        } catch (error) {
          relatedData[table] = [];
          // Пропускаем таблицу при ошибке сервера
          continue;
        }
      }
      
      // Для диалогов также загружаем сообщения
      if (relatedData.dialogs?.length > 0) {
        relatedData.messages = [];
        for (const dialog of relatedData.dialogs.slice(0, 5)) { // Ограничиваем до 5 диалогов
          try {
            const response = await fetch(
              `${API_URL}/api/admin/database/tables/dialog_messages/data`,
              {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  page: 1,
                  limit: 100,
                  search: null,
                  filter_field: 'dialog_id',
                  filter_value: dialog.id.toString(),
                  sort_field: 'timestamp',
                  sort_order: 'desc'
                })
              }
            );
            
            if (response.ok) {
              const result = await response.json();
              relatedData.messages.push(...(result.data || []));
            }
          } catch (error) {
          }
        }
      }

      setUserRelatedData(relatedData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Навигация по связанным данным
  const navigateToRelatedData = (targetTable, filterField, filterValue) => {
    // Сохраняем текущее состояние в историю
    setNavigationHistory(prev => [...prev, {
      table: selectedTable,
      user: selectedUser,
      mode: mode
    }]);
    
    // Переключаемся в режим данных и устанавливаем фильтр
    setMode('data');
    setSelectedTable(targetTable);
    setSelectedUser(null);
    setActiveFilter({ field: filterField, value: filterValue });
  };

  // Возврат назад по истории навигации
  const navigateBack = () => {
    if (navigationHistory.length === 0) return;
    
    const lastState = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(prev => prev.slice(0, -1));
    
    setMode(lastState.mode);
    setSelectedTable(lastState.table);
    setSelectedUser(lastState.user);
    setActiveFilter(null);
  };

  // Загрузка схемы при выборе таблицы в режиме данных
  useEffect(() => {
    if (mode === 'data' && selectedTable) {
      fetchTableSchema(selectedTable);
    }
  }, [mode, selectedTable]);

  // Загружаем пользователей при переключении в режим "По пользователям"
  useEffect(() => {
    if (mode === 'users') {
      fetchUsers();
    }
  }, [mode]);

  // Загружаем связанные данные при выборе пользователя
  useEffect(() => {
    if (selectedUser) {
      fetchUserRelatedData(selectedUser.id);
    }
  }, [selectedUser]);

  // Фильтрация таблиц по поисковому запросу
  const filteredTables = Object.keys(DATABASE_SCHEMA).filter(tableName => {
    const table = DATABASE_SCHEMA[tableName];
    const searchLower = searchTerm.toLowerCase();
    
    return (
      tableName.toLowerCase().includes(searchLower) ||
      table.title.toLowerCase().includes(searchLower) ||
      table.description.toLowerCase().includes(searchLower) ||
      Object.keys(table.fields).some(fieldName => 
        fieldName.toLowerCase().includes(searchLower) ||
        table.fields[fieldName].description.toLowerCase().includes(searchLower)
      )
    );
  });

  const getTypeColor = (type) => {
    if (type.includes('Integer')) return 'text-blue-600 bg-blue-50';
    if (type.includes('String')) return 'text-green-600 bg-green-50';
    if (type.includes('DateTime')) return 'text-[#6334E5] bg-[#6334E5]/10';
    if (type.includes('Boolean')) return 'text-orange-600 bg-orange-50';
    if (type.includes('Float')) return 'text-cyan-600 bg-cyan-50';
    if (type.includes('Text')) return 'text-gray-600 bg-gray-50';
    if (type.includes('JSON')) return 'text-pink-600 bg-pink-50';
    if (type.includes('Vector')) return 'text-indigo-600 bg-indigo-50';
    return 'text-gray-600 bg-gray-50';
  };


  return (
    <>
      <Head>
        <title>База данных недоступна для поисковых систем</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="description" content="Административная страница недоступна для индексации" />
      </Head>
      <div>
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
        {/* Welcome Section - Dashboard Style */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
            {/* Левая часть - приветствие и информация */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-[#6334E5]/10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiDatabase className="text-[#6334E5]" size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:gap-2 mb-2">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight">
                      База данных ReplyX
                    </h1>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {mode === 'schema'
                      ? 'Исследователь схемы базы данных'
                      : mode === 'data'
                      ? 'Просмотр и редактирование данных'
                      : 'Анализ данных по пользователям'
                    }
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{Object.keys(DATABASE_SCHEMA).length} таблиц</span>
                    <span>•</span>
                    <span>{Object.keys(TABLE_RELATIONSHIPS).length} со связями</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Навигация и переключатель режимов */}
            <div className="flex items-center gap-4">
              {/* Кнопка "Назад" */}
              {navigationHistory.length > 0 && (
                <button
                  onClick={navigateBack}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ← Назад
                </button>
              )}

              {/* Текущий фильтр */}
              {activeFilter && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#6334E5]/10 border border-[#6334E5]/30 rounded-xl text-sm">
                  <FiFilter className="w-4 h-4 text-[#6334E5]" />
                  <span className="text-[#5028c2]">
                    {useTranslations ? (FIELD_TRANSLATIONS[activeFilter.field] || activeFilter.field) : activeFilter.field}: {activeFilter.value}
                  </span>
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="text-[#6334E5] hover:text-[#4c1d95] ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Переключатель режимов в стиле dashboard */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setMode('schema')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'schema'
                      ? 'bg-[#6334E5] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FiGrid className="w-4 h-4" />
                  Схема БД
                </button>
                <button
                  onClick={() => setMode('data')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'data'
                      ? 'bg-[#6334E5] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FiList className="w-4 h-4" />
                  Реальные данные
                </button>
                <button
                  onClick={() => setMode('users')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'users'
                      ? 'bg-[#6334E5] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FiUsers className="w-4 h-4" />
                  По пользователям
                </button>
              </div>

              {/* Кнопка переводов в стиле dashboard */}
              {(mode === 'data' || mode === 'users') && (
                <button
                  onClick={() => setUseTranslations(!useTranslations)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    useTranslations
                      ? 'bg-[#6334E5]/10 text-[#5028c2] border-[#6334E5]/30'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FiGlobe className="w-4 h-4" />
                  {useTranslations ? 'English' : 'Русский'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Metrics - Minimal Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center text-[#6334E5]">
                <FiTable size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                  ВСЕГО ТАБЛИЦ
                </p>
                <div className="text-xl font-semibold text-gray-900">
                  {Object.keys(DATABASE_SCHEMA).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center text-[#6334E5]">
                <FiLink size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                  СВЯЗЕЙ МЕЖДУ ТАБЛИЦАМИ
                </p>
                <div className="text-xl font-semibold text-gray-900">
                  {Object.keys(TABLE_RELATIONSHIPS).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center text-[#6334E5]">
                <FiDatabase size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                  ПОЛЕЙ В БАЗЕ
                </p>
                <div className="text-xl font-semibold text-gray-900">
                  {Object.values(DATABASE_SCHEMA).reduce((acc, table) => acc + Object.keys(table.fields).length, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center text-[#6334E5]">
                <FiUsers size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                  ПОЛЬЗОВАТЕЛЕЙ
                </p>
                <div className="text-xl font-semibold text-gray-900">
                  {usersList.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {mode === 'schema' && (
          <>
            {/* Search для схемы */}
            <div className="mb-6">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск таблиц и полей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5]/100"
                />
              </div>
            </div>

            {/* Схема БД - существующий функционал */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Tables List */}
          <div className="xl:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiTable className="w-5 h-5" />
              Таблицы ({filteredTables.length})
            </h2>
            <div className="space-y-3 max-h-screen overflow-y-auto">
              {filteredTables.map(tableName => (
                <motion.div
                  key={tableName}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTable(tableName);
                    setSelectedField(null);
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedTable === tableName
                      ? 'bg-[#6334E5]/10 border-2 border-[#6334E5]/30 shadow-sm'
                      : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{tableName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{DATABASE_SCHEMA[tableName].title}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{Object.keys(DATABASE_SCHEMA[tableName].fields).length} полей</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Table Details */}
          <div className="xl:col-span-2">
            {selectedTable ? (
              <div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {DATABASE_SCHEMA[selectedTable].title}
                  </h2>
                  <p className="text-gray-600 mb-4">{DATABASE_SCHEMA[selectedTable].description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiTable className="w-4 h-4" />
                      {selectedTable}
                    </span>
                    <span>{Object.keys(DATABASE_SCHEMA[selectedTable].fields).length} полей</span>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {Object.entries(DATABASE_SCHEMA[selectedTable].fields).map(([fieldName, field]) => (
                    <motion.div
                      key={fieldName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-xl border cursor-pointer transition-all ${
                        selectedField === fieldName
                          ? 'border-[#6334E5]/30 shadow-md ring-2 ring-[#6334E5]/20'
                          : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedField(selectedField === fieldName ? null : fieldName)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900 font-mono">
                                {fieldName}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-md ${getTypeColor(field.type)}`}>
                                {field.type}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{field.description}</p>
                            
                            {/* Example */}
                            <div className="text-sm">
                              <span className="text-gray-500">Пример: </span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">
                                {field.example !== null ? String(field.example) : 'null'}
                              </code>
                            </div>

                            {/* Possible Values */}
                            {field.values && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500">Возможные значения: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {field.values.map((value, idx) => (
                                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                      {value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <FiEye className={`w-4 h-4 ml-4 transition-transform ${
                            selectedField === fieldName ? 'rotate-180' : ''
                          } text-gray-400`} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center mx-auto mb-4 text-[#6334E5]">
                  <FiInfo size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите таблицу</h3>
                <p className="text-gray-600">
                  Выберите таблицу из списка слева, чтобы просмотреть её поля и структуру
                </p>
              </div>
            )}
            </div>
          </div>
        </>
        )}
        
        {mode === 'data' && (
          // Режим данных - новый функционал
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Список таблиц для данных */}
            <div className="xl:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiTable className="w-5 h-5" />
                Таблицы ({Object.keys(DATABASE_SCHEMA).length})
              </h2>
              <div className="space-y-3 max-h-screen overflow-y-auto">
                {Object.keys(DATABASE_SCHEMA).map(tableName => (
                  <motion.div
                    key={tableName}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedTable(tableName);
                      setSelectedField(null);
                      setActiveFilter(null); // Сбрасываем фильтр при переключении
                    }}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedTable === tableName
                        ? 'bg-[#6334E5]/10 border-2 border-[#6334E5]/30 shadow-sm'
                        : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{tableName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{DATABASE_SCHEMA[tableName].title}</p>
                      </div>
                      {/* Показываем связанные таблицы */}
                      {TABLE_RELATIONSHIPS[tableName] && (
                        <div className="flex items-center text-xs text-gray-400 ml-2">
                          <FiLink className="w-3 h-3" />
                          <span className="ml-1">{Object.keys(TABLE_RELATIONSHIPS[tableName]).length}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Данные таблицы */}
            <div className="xl:col-span-3">
              {selectedTable && tableSchema ? (
                <DataTable
                  tableName={selectedTable}
                  schema={tableSchema}
                  onEdit={(record) => setEditingRecord(record)}
                  onCreate={() => setShowCreateModal(true)}
                />
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center mx-auto mb-4 text-[#6334E5]">
                    <FiInfo size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите таблицу</h3>
                  <p className="text-gray-600">
                    Выберите таблицу из списка слева, чтобы просмотреть и редактировать её данные
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {mode === 'users' && (
          // Режим "По пользователям"
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Список пользователей */}
            <div className="xl:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiUsers className="w-5 h-5" />
                Пользователи ({usersList.length})
              </h2>

              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-[#6334E5] rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3 max-h-screen overflow-y-auto">
                  {usersList.map(user => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedTable(null);
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedUser?.id === user.id
                          ? 'bg-[#6334E5]/10 border-2 border-[#6334E5]/30 shadow-sm'
                          : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#6334E5]/10 border border-[#6334E5]/30 rounded-full flex items-center justify-center">
                          <FiUser className="w-4 h-4 text-[#6334E5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {useTranslations && user.first_name ? user.first_name : user.first_name || user.email}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{user.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'manager'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-[#6334E5]/20 text-[#4c1d95]'
                            }`}>
                              {useTranslations ? (VALUE_TRANSLATIONS[user.role] || user.role) : user.role}
                            </span>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Данные пользователя */}
            <div className="xl:col-span-3">
              {selectedUser ? (
                <div className="space-y-6">
                  {/* Информация о пользователе */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-[#6334E5]/10 border border-[#6334E5]/30 rounded-full flex items-center justify-center">
                        <FiUser className="w-8 h-8 text-[#6334E5]" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedUser.first_name || selectedUser.email}
                        </h2>
                        <p className="text-gray-600 mb-4">{selectedUser.email}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">ID:</span>
                            <span className="ml-2 font-medium">{selectedUser.id}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              {useTranslations ? 'Роль:' : 'Role:'}
                            </span>
                            <span className="ml-2 font-medium">
                              {useTranslations ? (VALUE_TRANSLATIONS[selectedUser.role] || selectedUser.role) : selectedUser.role}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              {useTranslations ? 'Статус:' : 'Status:'}
                            </span>
                            <span className="ml-2 font-medium">
                              {useTranslations ? (VALUE_TRANSLATIONS[selectedUser.status] || selectedUser.status) : selectedUser.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              {useTranslations ? 'Создан:' : 'Created:'}
                            </span>
                            <span className="ml-2 font-medium">
                              {new Date(selectedUser.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Связанные данные по категориям */}
                  {Object.entries(userRelatedData).map(([tableName, data]) => {
                    if (!data || data.length === 0) return null;
                    
                    return (
                      <div key={tableName} className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FiTable className="w-5 h-5" />
                          {useTranslations ? (
                            tableName === 'assistants' ? 'Ассистенты' :
                            tableName === 'dialogs' ? 'Диалоги' :
                            tableName === 'messages' ? 'Сообщения' :
                            tableName === 'documents' ? 'Документы' :
                            tableName === 'bot_instances' ? 'Боты Telegram' :
                            tableName === 'user_balances' ? 'Балансы' :
                            tableName === 'balance_transactions' ? 'Транзакции' :
                            tableName
                          ) : tableName} ({data.length})
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {data[0] && Object.keys(data[0]).slice(0, 5).map(key => (
                                  <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {useTranslations ? (FIELD_TRANSLATIONS[key] || key) : key}
                                  </th>
                                ))}
                                {/* Колонка для связанных данных */}
                                {TABLE_RELATIONSHIPS[tableName] && (
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Связи
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {data.slice(0, 5).map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  {Object.entries(row).slice(0, 5).map(([key, value]) => (
                                    <td key={key} className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                                      {formatValue(key, value, useTranslations)}
                                    </td>
                                  ))}
                                  {/* Кнопки навигации по связанным данным */}
                                  {TABLE_RELATIONSHIPS[tableName] && (
                                    <td className="px-4 py-4">
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(TABLE_RELATIONSHIPS[tableName]).map(([relationTable, relation]) => (
                                          <RelationshipButton
                                            key={relationTable}
                                            tableName={tableName}
                                            recordId={row[relation.relationField || relation.field]}
                                            relationTable={relationTable}
                                            relationField={relation.relationField || 'id'}
                                            label={relation.label}
                                            useTranslations={useTranslations}
                                            onNavigate={navigateToRelatedData}
                                          />
                                        ))}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {data.length > 5 && (
                            <div className="mt-4 text-center">
                              <p className="text-sm text-gray-500">
                                Показаны первые 5 из {data.length} записей
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Если нет связанных данных */}
                  {Object.keys(userRelatedData).length === 0 && !loading && (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <div className="w-16 h-16 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center mx-auto mb-4 text-[#6334E5]">
                        <FiInfo size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Нет связанных данных
                      </h3>
                      <p className="text-gray-600">
                        У этого пользователя пока нет ассистентов, диалогов или других данных
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-xl bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center mx-auto mb-4 text-[#6334E5]">
                    <FiUsers size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Выберите пользователя</h3>
                  <p className="text-gray-600">
                    Выберите пользователя из списка слева, чтобы посмотреть все его данные
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Модальные окна */}
        {editingRecord && tableSchema && (
          <RecordEditor
            isOpen={!!editingRecord}
            onClose={() => setEditingRecord(null)}
            record={editingRecord}
            tableName={selectedTable}
            schema={tableSchema}
            onSave={() => {
              // Обновление завершено - DataTable сам обновится
              setEditingRecord(null);
            }}
          />
        )}

        {showCreateModal && tableSchema && (
          <CreateRecordModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            tableName={selectedTable}
            schema={tableSchema}
            onCreate={() => {
              // Создание завершено - DataTable сам обновится
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}

// Защищаем страницу - только для админов
export default withAuth(DatabaseExplorer, { adminOnly: true });