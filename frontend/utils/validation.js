// Утилиты для валидации данных на клиенте

/**
 * Валидирует силу пароля
 * @param {string} password 
 * @returns {Object} {valid: boolean, message: string}
 */
export const validatePasswordStrength = (password) => {
  if (!password) {
    return { valid: false, message: 'Пароль обязателен' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Пароль должен содержать минимум 8 символов' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Пароль слишком длинный (максимум 128 символов)' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Пароль должен содержать хотя бы одну букву' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Пароль должен содержать хотя бы одну цифру' };
  }

  // Проверка на слабые пароли
  const weakPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 'letmein123', 
    'password123', '123456789', 'welcome123'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Пароль слишком простой' };
  }

  return { valid: true, message: 'Пароль соответствует требованиям безопасности' };
};

/**
 * Валидирует формат email
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmailFormat = (email) => {
  if (!email) return false;
  
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
};

/**
 * Очищает входную строку от потенциально опасных символов
 * @param {string} input 
 * @param {number} maxLength 
 * @returns {string}
 */
export const sanitizeInput = (input, maxLength = 255) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Ограничиваем длину
  let sanitized = input.slice(0, maxLength);

  // Удаляем потенциально опасные символы
  sanitized = sanitized.replace(/[<>"']/g, '');

  // Убираем лишние пробелы
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Валидирует имя пользователя
 * @param {string} name 
 * @returns {Object}
 */
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Имя обязательно' };
  }

  const sanitizedName = sanitizeInput(name, 100);
  
  if (sanitizedName.length < 2) {
    return { valid: false, message: 'Имя должно содержать минимум 2 символа' };
  }

  if (sanitizedName.length > 100) {
    return { valid: false, message: 'Имя слишком длинное' };
  }

  // Проверяем на недопустимые символы
  if (!/^[a-zA-Zа-яА-Я\s\-']+$/.test(sanitizedName)) {
    return { valid: false, message: 'Имя содержит недопустимые символы' };
  }

  return { valid: true, message: 'Имя корректно', sanitized: sanitizedName };
};

/**
 * Проверяет совпадение паролей
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {Object}
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { valid: false, message: 'Подтвердите пароль' };
  }

  if (password !== confirmPassword) {
    return { valid: false, message: 'Пароли не совпадают' };
  }

  return { valid: true, message: 'Пароли совпадают' };
};

/**
 * Валидирует все поля формы регистрации
 * @param {Object} formData 
 * @returns {Object}
 */
export const validateRegistrationForm = (formData) => {
  const errors = {};

  // Валидация email
  if (!validateEmailFormat(formData.email)) {
    errors.email = 'Некорректный формат email';
  }

  // Валидация имени
  const nameValidation = validateName(formData.fullName);
  if (!nameValidation.valid) {
    errors.fullName = nameValidation.message;
  }

  // Валидация пароля
  const passwordValidation = validatePasswordStrength(formData.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.message;
  }

  // Валидация совпадения паролей
  const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (!passwordMatchValidation.valid) {
    errors.confirmPassword = passwordMatchValidation.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: {
      email: sanitizeInput(formData.email?.toLowerCase(), 255),
      fullName: nameValidation.valid ? nameValidation.sanitized : formData.fullName,
      password: formData.password
    }
  };
};