import { marked } from 'marked';

// Настройка marked для безопасного рендеринга
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Переносы строк как <br>
  sanitize: false, // Отключаем санитизацию для сохранения HTML
  smartLists: true,
  smartypants: true
});

// Используем стандартный рендерер без кастомных классов
// Стили будут применяться через Tailwind Typography

/**
 * Конвертирует Markdown в HTML с применением стилей
 * @param {string} markdown - Markdown текст
 * @returns {string} - HTML строка
 */
export function markdownToHtml(markdown) {
  if (!markdown) return '';

  try {
    const html = marked(markdown);
    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Возвращаем исходный текст в случае ошибки
    return markdown.replace(/\n/g, '<br>');
  }
}

/**
 * Получает дополнительные стили для кастомизации Tailwind Typography
 * Теперь используем только для переопределения базовых стилей
 */
export function getArticleStyles() {
  // Возвращаем пустую строку, так как используем Tailwind Typography
  return '';
}