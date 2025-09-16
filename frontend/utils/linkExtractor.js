/**
 * Утилита для извлечения ссылок из текста сообщений
 */

/**
 * Извлекает ссылки из текста сообщения
 * Поддерживает:
 * - Markdown ссылки: [текст](url)
 * - Обычные URL: https://example.com
 * - HTTP ссылки: http://example.com
 * 
 * @param {string} text - Текст сообщения
 * @returns {Array} Массив объектов с информацией о ссылках
 */
export const extractLinks = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const links = [];
  
  // Регулярное выражение для markdown ссылок [текст](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Регулярное выражение для обычных URL
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  
  let match;
  
  // Извлекаем markdown ссылки
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, url] = match;
    links.push({
      type: 'markdown',
      text: linkText,
      url: url.trim(),
      fullMatch,
      index: match.index
    });
  }
  
  // Создаем копию текста без markdown ссылок для поиска обычных URL
  let textWithoutMarkdown = text;
  links.forEach(link => {
    textWithoutMarkdown = textWithoutMarkdown.replace(link.fullMatch, '');
  });
  
  // Извлекаем обычные URL из оставшегося текста
  while ((match = urlRegex.exec(textWithoutMarkdown)) !== null) {
    const url = match[0].trim();
    // Проверяем, что этот URL не является частью уже найденной markdown ссылки
    const isAlreadyInMarkdown = links.some(link => link.url === url);
    
    if (!isAlreadyInMarkdown) {
      links.push({
        type: 'url',
        text: getDomainFromUrl(url) || url,
        url,
        fullMatch: url,
        index: match.index
      });
    }
  }
  
  // Удаляем дубликаты по URL
  const uniqueLinks = links.filter((link, index, self) => 
    index === self.findIndex(l => l.url === link.url)
  );
  
  // Сортируем по порядку появления в тексте
  return uniqueLinks.sort((a, b) => a.index - b.index);
};

/**
 * Извлекает домен из URL для отображения
 * @param {string} url - URL
 * @returns {string} Домен или null
 */
const getDomainFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
};

/**
 * Проверяет, является ли URL безопасным для открытия
 * @param {string} url - URL для проверки
 * @returns {boolean} Безопасен ли URL
 */
export const isUrlSafe = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Разрешаем только HTTP и HTTPS протоколы
  const allowedProtocols = ['http:', 'https:'];
  
  try {
    const urlObj = new URL(url);
    return allowedProtocols.includes(urlObj.protocol);
  } catch (e) {
    return false;
  }
};

/**
 * Укорачивает текст ссылки для отображения в кнопке
 * @param {string} text - Текст ссылки
 * @param {number} maxLength - Максимальная длина (по умолчанию 40)
 * @returns {string} Укороченный текст
 */
export const truncateLinkText = (text, maxLength = 40) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Получает иконку для ссылки на основе домена
 * @param {string} url - URL ссылки
 * @returns {string} Emoji иконка
 */
export const getLinkIcon = (url) => {
  if (!url) return '🔗';
  
  const domain = getDomainFromUrl(url);
  if (!domain) return '🔗';
  
  const iconMap = {
    'youtube.com': '📺',
    'youtu.be': '📺',
    'github.com': '💻',
    'google.com': '🔍',
    'wikipedia.org': '📚',
    'docs.google.com': '📄',
    'drive.google.com': '💾',
    'telegram.org': '💬',
    't.me': '💬',
    'whatsapp.com': '💬',
    'facebook.com': '📘',
    'instagram.com': '📸',
    'twitter.com': '🐦',
    'x.com': '🐦',
    'linkedin.com': '💼',
    'reddit.com': '🔥',
    'stackoverflow.com': '❓',
    'medium.com': '📝',
    'habr.com': '🔧',
    'vk.com': '🌐'
  };
  
  // Ищем точное совпадение домена
  if (iconMap[domain]) {
    return iconMap[domain];
  }
  
  // Ищем частичное совпадение для поддоменов
  for (const [key, icon] of Object.entries(iconMap)) {
    if (domain.includes(key)) {
      return icon;
    }
  }
  
  return '🔗';
};
