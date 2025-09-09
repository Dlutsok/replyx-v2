import { useState, useEffect } from 'react';
import { FiX, FiEye, FiEyeOff, FiCheck, FiAlertCircle, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import styles from '../../styles/components/EditTokenModal.module.css';

const EditTokenModal = ({ token, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: token?.name || '',
    model_access: token?.model_access || 'gpt-4o,gpt-4o-mini',
    daily_limit: token?.daily_limit || 10000,
    monthly_limit: token?.monthly_limit || 300000,
    priority: token?.priority || 3,
    is_active: token?.is_active !== undefined ? token.is_active : true,
    notes: token?.notes || ''
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
      setErrors({ submit: error.message || 'Произошла ошибка при обновлении токена' });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedModels = () => {
    return formData.model_access.split(',').map(m => m.trim()).filter(Boolean);
  };

  const calculateUsagePercentage = (usage, limit) => {
    return limit > 0 ? Math.round((usage || 0) / limit * 100) : 0;
  };

  const getUsageClass = (percentage) => {
    if (percentage >= 80) return styles.usageCritical;
    if (percentage >= 50) return styles.usageWarning;
    return styles.usageNormal;
  };

  const maskToken = (tokenStr) => {
    if (!tokenStr) return '';
    return tokenStr.substring(0, 8) + '...' + tokenStr.substring(tokenStr.length - 4);
  };

  const dailyUsage = token?.daily_usage || 0;
  const monthlyUsage = token?.monthly_usage || 0;
  const dailyPercentage = calculateUsagePercentage(dailyUsage, formData.daily_limit);
  const monthlyPercentage = calculateUsagePercentage(monthlyUsage, formData.monthly_limit);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Редактирование токена #{token?.id}
            </h2>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                {showToken ? token?.token : maskToken(token?.token)}
              </code>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? 'Скрыть токен' : 'Показать токен'}
              >
                {showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            onClick={onClose}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Current Usage Stats */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Текущее использование</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Использование за сегодня</span>
                <span className={`font-medium ${
                  dailyPercentage >= 80 ? 'text-red-600' :
                  dailyPercentage >= 50 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {dailyPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    dailyPercentage >= 80 ? 'bg-red-500' :
                    dailyPercentage >= 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {dailyUsage.toLocaleString()} из {formData.daily_limit.toLocaleString()}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Использование за месяц</span>
                <span className={`font-medium ${
                  monthlyPercentage >= 80 ? 'text-red-600' :
                  monthlyPercentage >= 50 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {monthlyPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    monthlyPercentage >= 80 ? 'bg-red-500' :
                    monthlyPercentage >= 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {monthlyUsage.toLocaleString()} из {formData.monthly_limit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-300px)]">
            {/* Active Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Статус токена</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.is_active ? 'Токен активен и используется' : 'Токен отключен'}
                </p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:ring-offset-2 ${
                  formData.is_active ? 'bg-[#6334E5]' : 'bg-gray-200'
                }`}
                onClick={() => handleInputChange('is_active', !formData.is_active)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

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
                      : 'border-gray-300 focus:ring-[#6334E5] focus:border-[#6334E5]'
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
            </div>

            {/* Available Models */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Доступные модели *
                <span className="block text-xs text-gray-500 mt-1">Модели, поддерживаемые токеном</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableModels.map(model => (
                  <button
                    key={model.id}
                    type="button"
                    className={`p-3 border rounded-lg text-left transition-all duration-150 ${
                      getSelectedModels().includes(model.id)
                        ? 'border-[#6334E5]/30 bg-[#6334E5]/10 text-[#6334E5]'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => handleModelToggle(model.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{model.label}</span>
                        {model.popular && (
                          <span className="px-2 py-0.5 bg-[#6334E5]/20 text-[#6334E5] text-xs rounded-full">
                            Популярная
                          </span>
                        )}
                      </div>
                      {getSelectedModels().includes(model.id) && (
                        <FiCheck className="text-[#6334E5]" size={16} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {errors.model_access && <p className="text-sm text-red-600 mt-1">{errors.model_access}</p>}
            </div>

            {/* Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Daily Limit */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Дневной лимит *
                  <span className="block text-xs text-gray-500 mt-1">Макс. запросов в день</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.daily_limit}
                    onChange={(e) => handleInputChange('daily_limit', parseInt(e.target.value) || 0)}
                    min="1"
                    max="1000000"
                    className={`w-full px-3 py-2 pr-16 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-150 ${
                      errors.daily_limit
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : validationState.daily_limit?.isValid
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-[#6334E5] focus:border-[#6334E5]'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    запросов
                  </span>
                </div>
                {errors.daily_limit && <p className="text-sm text-red-600 mt-1">{errors.daily_limit}</p>}
              </div>

              {/* Monthly Limit */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Месячный лимит *
                  <span className="block text-xs text-gray-500 mt-1">Макс. запросов в месяц</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.monthly_limit}
                    onChange={(e) => handleInputChange('monthly_limit', parseInt(e.target.value) || 0)}
                    min="1"
                    max="10000000"
                    className={`w-full px-3 py-2 pr-16 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-150 ${
                      errors.monthly_limit
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : validationState.monthly_limit?.isValid
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-[#6334E5] focus:border-[#6334E5]'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    запросов
                  </span>
                </div>
                {errors.monthly_limit && <p className="text-sm text-red-600 mt-1">{errors.monthly_limit}</p>}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Приоритет *
                <span className="block text-xs text-gray-500 mt-1">Чем меньше число, тем выше приоритет (1-10)</span>
              </label>
              <div className="space-y-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < formData.priority ? 'bg-[#6334E5]' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">Приоритет: {formData.priority}</span>
                </div>
              </div>
              {errors.priority && <p className="text-sm text-red-600 mt-1">{errors.priority}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Заметки
                <span className="block text-xs text-gray-500 mt-1">Дополнительная информация</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Описание назначения токена, ограничения и другая полезная информация..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 resize-none"
              />
              <div className="flex justify-end">
                <span className="text-xs text-gray-500">{formData.notes.length}/500</span>
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
            
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                type="submit"
                className={styles.saveButton}
                disabled={loading || Object.keys(errors).length > 0}
              >
                {loading ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    Сохранение...
                  </>
                ) : (
                  'Сохранить изменения'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTokenModal;