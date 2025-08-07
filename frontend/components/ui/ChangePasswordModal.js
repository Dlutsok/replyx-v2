import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/components/ChangePasswordModal.module.css';
import { FiLock, FiX, FiEye, FiEyeOff } from 'react-icons/fi';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Валидация пароля
  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Пароль должен содержать минимум 6 символов';
    }
    return null;
  };

  // Обработка изменения формы
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Очищаем ошибку при вводе
  };

  // Переключение видимости пароля
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.currentPassword) {
      setError('Введите текущий пароль');
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Новый пароль должен отличаться от текущего');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка смены пароля');
      }

      setSuccess(true);
      
      // Закрываем модал через 2 секунды
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  };

  // Закрытие модала
  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setError('');
    setSuccess(false);
    onClose();
  };

  // Клик по оверлею
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
        {/* Заголовок */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <FiLock className={styles.titleIcon} />
            <h3 className={styles.title}>Изменить пароль</h3>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
          >
            <FiX />
          </button>
        </div>

        {/* Содержимое */}
        <div className={styles.content}>
          {success ? (
            <motion.div
              className={styles.successMessage}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className={styles.successIcon}>✓</div>
              <p>Пароль успешно изменён!</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Текущий пароль */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Текущий пароль</label>
                <div className={styles.passwordField}>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleChange('currentPassword', e.target.value)}
                    className={styles.input}
                    placeholder="Введите текущий пароль"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Новый пароль */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Новый пароль</label>
                <div className={styles.passwordField}>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleChange('newPassword', e.target.value)}
                    className={styles.input}
                    placeholder="Введите новый пароль"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {formData.newPassword && validatePassword(formData.newPassword) && (
                  <div className={styles.fieldError}>
                    {validatePassword(formData.newPassword)}
                  </div>
                )}
              </div>

              {/* Подтверждение пароля */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Подтверждение пароля</label>
                <div className={styles.passwordField}>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={styles.input}
                    placeholder="Повторите новый пароль"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {formData.confirmPassword && 
                 formData.newPassword !== formData.confirmPassword && (
                  <div className={styles.fieldError}>
                    Пароли не совпадают
                  </div>
                )}
              </div>

              {/* Ошибка */}
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              {/* Кнопки */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleClose}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className={styles.spinner}
                      >
                        ⟳
                      </motion.div>
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordModal;