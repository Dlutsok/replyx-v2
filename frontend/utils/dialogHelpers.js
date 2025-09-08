import { FiMessageCircle, FiSmartphone, FiSmile, FiFrown, FiMeh } from 'react-icons/fi';
import { CHANNEL_TELEGRAM, CHANNEL_WEBSITE, CHANNEL_WHATSAPP } from '../constants/dialogStatus';

/**
 * Очистка имени от лишних цифр в конце только для Telegram пользователей
 * @param {string} str - Исходное имя
 * @param {boolean} isTelegram - Является ли пользователь из Telegram
 */
export const cleanName = (str, isTelegram = false) => {
  if (!str || typeof str !== 'string') return str;
  
  // Удаляем цифры в конце только для Telegram пользователей (например "Дан0" -> "Дан")
  if (isTelegram) {
    const cleaned = str
      .replace(/\d+\s*$/, '') // Удаляем все цифры в конце строки
      .trim();
    
    return cleaned || str; // Если после очистки остается пустая строка, возвращаем оригинал
  }
  
  // Для пользователей сайта возвращаем имя как есть, только убираем лишние пробелы
  return str.trim();
};

/**
 * Получение инициалов пользователя
 */
export const getInitials = (dialog) => {
  const isTelegram = getChannelType(dialog) === CHANNEL_TELEGRAM;
  
  // Если есть имя из профиля пользователя
  if (dialog.name && dialog.name !== 'Неизвестно') {
    const cleaned = cleanName(dialog.name, isTelegram);
    return cleaned ? cleaned.charAt(0).toUpperCase() : 'U';
  }
  
  // Если есть Telegram данные
  if (dialog.first_name) {
    const cleaned = cleanName(dialog.first_name, isTelegram);
    return cleaned ? cleaned.charAt(0).toUpperCase() : 'U';
  }
  
  if (dialog.telegram_username) {
    const cleaned = cleanName(dialog.telegram_username, isTelegram);
    return cleaned ? cleaned.charAt(0).toUpperCase() : 'U';
  }
  
  // Для guest пользователей
  if (dialog.guest_id) {
    return 'П'; // Первая буква от "Пользователь"
  }
  
  // Если есть email
  if (dialog.email) {
    return dialog.email.charAt(0).toUpperCase();
  }
  
  return 'U';
};

/**
 * Определение типа канала по диалогу
 */
export const getChannelType = (dialog) => {
  if (dialog.telegram_username || dialog.first_name || dialog.last_name) {
    return CHANNEL_TELEGRAM;
  }
  if (dialog.guest_id) {
    return CHANNEL_WEBSITE;
  }
  return CHANNEL_WEBSITE;
};

/**
 * Получение названия канала
 */
export const getChannelName = (dialog) => {
  const channelType = getChannelType(dialog);
  switch(channelType) {
    case CHANNEL_TELEGRAM:
      return 'Telegram';
    case CHANNEL_WEBSITE:
      return 'Сайт';
    case CHANNEL_WHATSAPP:
      return 'WhatsApp';
    default:
      return 'Неизвестно';
  }
};

/**
 * Получение иконки канала
 */
export const getChannelIcon = (dialog) => {
  if (dialog.telegram_username) {
    return <FiMessageCircle className="channelIcon" />;
  }
  return <FiSmartphone className="channelIcon" />;
};

/**
 * Получение иконки настроения
 */
export const getSentimentIcon = (sentiment) => {
  if (sentiment === 'positive') return <FiSmile className="positive" />;
  if (sentiment === 'negative') return <FiFrown className="negative" />;
  return <FiMeh className="neutral" />;
};

/**
 * Форматирование времени в локальный формат
 */
export const toLocal = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Получение отображаемого имени пользователя
 */
export const getUserDisplayName = (dialog) => {
  const isTelegram = getChannelType(dialog) === CHANNEL_TELEGRAM;
  let userName = dialog.name;
  
  if (!userName) {
    if (dialog.first_name && dialog.last_name) {
      userName = `${cleanName(dialog.first_name, isTelegram)} ${cleanName(dialog.last_name, isTelegram)}`;
    } else if (dialog.first_name) {
      userName = cleanName(dialog.first_name, isTelegram);
    } else if (dialog.telegram_username) {
      userName = `@${cleanName(dialog.telegram_username, isTelegram)}`;
    } else if (dialog.guest_id) {
      userName = `Пользователь#${dialog.id}`;
    } else {
      userName = 'Неизвестно';
    }
  } else {
    // Очищаем name от цифр в конце только для Telegram
    userName = cleanName(userName, isTelegram);
  }
  
  return userName;
};

/**
 * Получение подписи пользователя (username/email/id)
 */
export const getUserSubtitle = (dialog) => {
  if (dialog.telegram_username) return `@${dialog.telegram_username}`;
  if (dialog.email && dialog.email !== 'admin@example.com') return dialog.email;
  return `ID: ${dialog.user_id}`;
};