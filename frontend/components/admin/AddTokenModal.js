import { useState } from 'react';
import { FiX, FiEye, FiEyeOff, FiInfo, FiCheck, FiAlertCircle } from 'react-icons/fi';
import styles from '../../styles/components/AddTokenModal.module.css';

const AddTokenModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    token: '',
    model_access: 'gpt-4o,gpt-4o-mini',
    daily_limit: 10000,
    monthly_limit: 300000,
    priority: 3,
    notes: ''
  });

  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [validationState, setValidationState] = useState({});

  // Available models for selection
  const availableModels = [
    { id: 'gpt-4o', label: 'GPT-4o', popular: true },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', popular: true },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', popular: false },
    { id: 'gpt-4', label: 'GPT-4', popular: false },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', popular: false }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Real-time validation
    validateField(field, value);
  };

  const validateField = (field, value) => {
    let isValid = true;
    let message = '';

    switch (field) {
      case 'name':
        isValid = value.trim().length >= 3 && value.trim().length <= 50;
        message = isValid ? 'Название корректно' : 'Название должно быть от 3 до 50 символов';
        break;
      
      case 'token':
        // Basic OpenAI API key format validation
        isValid = /^sk-[a-zA-Z0-9]{48}$/.test(value.trim()) || /^sk-proj-[a-zA-Z0-9_-]{48,}$/.test(value.trim());
        message = isValid ? 'Токен имеет корректный формат' : 'Неверный формат токена OpenAI';
        break;
      
      case 'daily_limit':
        isValid = value > 0 && value <= 1000000;
        message = isValid ? 'Лимит корректен' : 'Дневной лимит должен быть от 1 до 1,000,000';
        break;
      
      case 'monthly_limit':
        isValid = value > 0 && value <= 10000000 && value >= formData.daily_limit;
        message = isValid ? 'Лимит корректен' : 'Месячный лимит должен быть больше дневного';
        break;
      
      case 'priority':
        isValid = value >= 1 && value <= 10;
        message = isValid ? 'Приоритет корректен' : 'Приоритет должен быть от 1 до 10';
        break;
      
      default:
        isValid = true;
    }

    setValidationState(prev => ({
      ...prev,
      [field]: { isValid, message }
    }));

    return isValid;
  };

  const handleModelToggle = (modelId) => {
    const currentModels = formData.model_access.split(',').map(m => m.trim()).filter(Boolean);
    let newModels;
    
    if (currentModels.includes(modelId)) {
      newModels = currentModels.filter(m => m !== modelId);
    } else {
      newModels = [...currentModels, modelId];
    }
    
    handleInputChange('model_access', newModels.join(','));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Название должно быть не менее 3 символов';
    }

    if (!formData.token.trim()) {
      newErrors.token = 'API токен обязателен';
    } else if (!validateField('token', formData.token)) {
      newErrors.token = 'Неверный формат токена OpenAI';
    }

    if (!formData.model_access.trim()) {
      newErrors.model_access = 'Выберите хотя бы одну модель';
    }

    if (formData.daily_limit <= 0) {
      newErrors.daily_limit = 'Дневной лимит должен быть больше 0';
    }

    if (formData.monthly_limit <= 0) {
      newErrors.monthly_limit = 'Месячный лимит должен быть больше 0';
    } else if (formData.monthly_limit < formData.daily_limit) {
      newErrors.monthly_limit = 'Месячный лимит должен быть больше дневного';
    }

    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.priority = 'Приоритет должен быть от 1 до 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ submit: error.message || 'Произошла ошибка при создании токена' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedModels = () => {
    return formData.model_access.split(',').map(m => m.trim()).filter(Boolean);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Создание AI токена</h2>
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            onClick={onClose}
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Token Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Название токена *
                <span className="block text-xs text-gray-500 mt-1">Удобное название для идентификации</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Например: Main Production Token"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-150 ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : validationState.name?.isValid
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:ring-[#6334E5]/100 focus:border-[#6334E5]/100'
                  }`}
                  maxLength={50}
                />
                {validationState.name && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {validationState.name.isValid ?
                      <FiCheck className="text-green-600" size={16} /> :
                      <FiAlertCircle className="text-red-600" size={16} />
                    }
                  </div>
                )}
              </div>
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              {validationState.name?.message && !errors.name && (
                <p className={`text-sm mt-1 ${
                  validationState.name.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validationState.name.message}
                </p>
              )}
            </div>

            {/* API Token */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                API токен *
                <span className="block text-xs text-gray-500 mt-1">OpenAI API ключ (sk-...)</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.token}
                  onChange={(e) => handleInputChange('token', e.target.value)}
                  placeholder="sk-..."
                  className={`w-full px-3 py-2 pr-20 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-150 font-mono ${
                    errors.token
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : validationState.token?.isValid
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:ring-[#6334E5]/100 focus:border-[#6334E5]/100'
                  }`}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? 'Скрыть токен' : 'Показать токен'}
                  >
                    {showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                  {validationState.token && (
                    <div className="flex items-center">
                      {validationState.token.isValid ?
                        <FiCheck className="text-green-600" size={16} /> :
                        <FiAlertCircle className="text-red-600" size={16} />
                      }
                    </div>
                  )}
                </div>
              </div>
              {errors.token && <p className="text-sm text-red-600 mt-1">{errors.token}</p>}
              {validationState.token?.message && !errors.token && (
                <p className={`text-sm mt-1 ${
                  validationState.token.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validationState.token.message}
                </p>
              )}
            </div>

            {/* Available Models */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Доступные модели *
                <span className={styles.labelHint}>Выберите модели, поддерживаемые токеном</span>
              </label>
              <div className={styles.modelsGrid}>
                {availableModels.map(model => (
                  <div
                    key={model.id}
                    className={`${styles.modelOption} ${
                      getSelectedModels().includes(model.id) ? styles.selected : ''
                    }`}
                    onClick={() => handleModelToggle(model.id)}
                  >
                    <div className={styles.modelCheckbox}>
                      {getSelectedModels().includes(model.id) && <FiCheck size={14} />}
                    </div>
                    <div className={styles.modelInfo}>
                      <span className={styles.modelLabel}>{model.label}</span>
                      {model.popular && <span className={styles.popularBadge}>Популярная</span>}
                    </div>
                  </div>
                ))}
              </div>
              {errors.model_access && <div className={styles.errorText}>{errors.model_access}</div>}
            </div>

            {/* Daily Limit */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Дневной лимит *
                <span className={styles.labelHint}>Максимальное количество запросов в день</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => handleInputChange('daily_limit', parseInt(e.target.value) || 0)}
                  min="1"
                  max="1000000"
                  className={`${styles.input} ${
                    errors.daily_limit ? styles.inputError : 
                    validationState.daily_limit?.isValid ? styles.inputValid : ''
                  }`}
                />
                <span className={styles.inputSuffix}>запросов</span>
              </div>
              {errors.daily_limit && <div className={styles.errorText}>{errors.daily_limit}</div>}
            </div>

            {/* Monthly Limit */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Месячный лимит *
                <span className={styles.labelHint}>Максимальное количество запросов в месяц</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  value={formData.monthly_limit}
                  onChange={(e) => handleInputChange('monthly_limit', parseInt(e.target.value) || 0)}
                  min="1"
                  max="10000000"
                  className={`${styles.input} ${
                    errors.monthly_limit ? styles.inputError : 
                    validationState.monthly_limit?.isValid ? styles.inputValid : ''
                  }`}
                />
                <span className={styles.inputSuffix}>запросов</span>
              </div>
              {errors.monthly_limit && <div className={styles.errorText}>{errors.monthly_limit}</div>}
            </div>

            {/* Priority */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Приоритет *
                <span className={styles.labelHint}>Чем меньше число, тем выше приоритет (1-10)</span>
              </label>
              <div className={styles.prioritySelector}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                  className={styles.prioritySlider}
                />
                <div className={styles.priorityValue}>
                  <div className={styles.priorityDots}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`${styles.priorityDot} ${i < formData.priority ? styles.active : ''}`}
                      />
                    ))}
                  </div>
                  <span className={styles.priorityNumber}>{formData.priority}</span>
                </div>
              </div>
              {errors.priority && <div className={styles.errorText}>{errors.priority}</div>}
            </div>

            {/* Notes */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Заметки
                <span className={styles.labelHint}>Дополнительная информация о токене</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Описание назначения токена, ограничения и другая полезная информация..."
                rows={3}
                maxLength={500}
                className={styles.textarea}
              />
              <div className={styles.textareaCounter}>
                {formData.notes.length}/500
              </div>
            </div>

          </div>

          {/* Form Footer */}
          <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-200 justify-end">
            {errors.submit && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mr-auto">
                <FiAlertCircle className="text-red-600 mt-0.5" size={16} />
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2"
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Создание...' : 'Создать токен'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTokenModal;