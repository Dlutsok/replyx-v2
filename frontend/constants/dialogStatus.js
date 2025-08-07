// Статусы диалогов
export const STATUS_ACTIVE = 'active';
export const STATUS_TAKEN_OVER = 'taken_over';
export const STATUS_ALL = 'all';
export const STATUS_AUTO_RESPONSE = 'auto_response';

// Временные фильтры
export const TIME_ALL = 'all';
export const TIME_TODAY = 'today';
export const TIME_YESTERDAY = 'yesterday';
export const TIME_WEEK = 'week';
export const TIME_MONTH = 'month';

// Типы каналов
export const CHANNEL_TELEGRAM = 'telegram';
export const CHANNEL_WEBSITE = 'website';
export const CHANNEL_WHATSAPP = 'whatsapp';

// Режимы отображения
export const VIEW_CARDS = 'cards';
export const VIEW_TABLE = 'table';

// Опции быстрых фильтров статуса
export const QUICK_STATUS_OPTIONS = [
  { key: STATUS_ACTIVE, label: 'Активные', icon: 'FiCheckCircle' },
  { key: STATUS_TAKEN_OVER, label: 'Перехваченные', icon: 'FiUserCheck' }
];

// Опции временных фильтров
export const TIME_OPTIONS = [
  { key: TIME_ALL, label: 'Все время' },
  { key: TIME_TODAY, label: 'Сегодня' },
  { key: TIME_YESTERDAY, label: 'Вчера' },
  { key: TIME_WEEK, label: 'Неделя' },
  { key: TIME_MONTH, label: 'Месяц' }
];