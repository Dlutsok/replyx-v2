/**
 * Форматирует число с разделителями тысяч
 * @param {number} num - Число для форматирования
 * @returns {string} - Форматированное число
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  // Преобразуем в число и округляем до целого
  const number = Math.round(Number(num));

  // Используем Intl.NumberFormat для корректного форматирования
  return new Intl.NumberFormat('ru-RU').format(number);
}

/**
 * Форматирует число просмотров с сокращениями для больших чисел
 * @param {number} views - Количество просмотров
 * @returns {string} - Форматированное число просмотров
 */
export function formatViews(views) {
  if (views === null || views === undefined || isNaN(views)) {
    return '0';
  }

  const number = Math.round(Number(views));

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return formatNumber(number);
  }
}
