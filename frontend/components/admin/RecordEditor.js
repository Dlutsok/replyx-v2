import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config/api';
import { FiX, FiSave, FiAlertCircle } from 'react-icons/fi';

const RecordEditor = ({ 
  isOpen, 
  onClose, 
  record, 
  tableName, 
  schema, 
  onSave,
  apiBaseUrl = `${API_URL}/api/admin/database`
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (record && isOpen) {
      // Инициализируем форму данными записи
      setFormData({ ...record });
      setError(null);
      setValidationErrors({});
    }
  }, [record, isOpen]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Очищаем ошибку валидации для этого поля
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    schema.columns.forEach(column => {
      const value = formData[column.name];

      // Проверка обязательных полей
      if (!column.nullable && column.name !== 'id' && (value === null || value === undefined || value === '')) {
        errors[column.name] = 'Обязательное поле';
      }

      // Проверка типов данных
      if (value !== null && value !== undefined && value !== '') {
        if (column.type.includes('Integer') && isNaN(parseInt(value))) {
          errors[column.name] = 'Должно быть целым числом';
        } else if (column.type.includes('Float') && isNaN(parseFloat(value))) {
          errors[column.name] = 'Должно быть числом';
        } else if (column.type.includes('Boolean') && 
                   value !== true && value !== false && 
                   value !== 'true' && value !== 'false') {
          errors[column.name] = 'Должно быть true или false';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      // Подготавливаем данные для отправки
      const dataToSend = { ...formData };
      
      // Очищаем данные от id если он есть (не нужен при обновлении)
      const { id, ...cleanData } = dataToSend;

      const response = await fetch(`${apiBaseUrl}/tables/${tableName}/records/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: cleanData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (onSave) {
        onSave(result.data);
      }

      onClose();

    } catch (err) {
      console.error('Ошибка сохранения записи:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (column) => {
    const value = formData[column.name];
    const hasError = validationErrors[column.name];

    const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      hasError ? 'border-red-300' : 'border-gray-300'
    }`;

    // Primary key поля только для чтения
    if (column.primary_key) {
      return (
        <div>
          <input
            type="text"
            value={value || ''}
            readOnly
            className={`${baseInputClass} bg-gray-100 cursor-not-allowed`}
          />
          <p className="mt-1 text-xs text-gray-500">Первичный ключ (только для чтения)</p>
        </div>
      );
    }

    // Boolean поля
    if (column.type.includes('Boolean')) {
      return (
        <div>
          <select
            value={value === null ? '' : String(value)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                handleInputChange(column.name, column.nullable ? null : false);
              } else {
                handleInputChange(column.name, val === 'true');
              }
            }}
            className={baseInputClass}
          >
            {column.nullable && <option value="">null</option>}
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      );
    }

    // DateTime поля
    if (column.type.includes('DateTime')) {
      const formatDateTimeForInput = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        } catch {
          return '';
        }
      };

      return (
        <div>
          <input
            type="datetime-local"
            value={formatDateTimeForInput(value)}
            onChange={(e) => {
              const val = e.target.value;
              handleInputChange(column.name, val ? new Date(val).toISOString() : null);
            }}
            className={baseInputClass}
          />
        </div>
      );
    }

    // Числовые поля
    if (column.type.includes('Integer') || column.type.includes('Float')) {
      return (
        <div>
          <input
            type="number"
            value={value === null ? '' : value}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                handleInputChange(column.name, column.nullable ? null : 0);
              } else {
                handleInputChange(column.name, column.type.includes('Integer') ? parseInt(val) : parseFloat(val));
              }
            }}
            step={column.type.includes('Float') ? '0.01' : '1'}
            className={baseInputClass}
          />
        </div>
      );
    }

    // Большие текстовые поля
    if (column.type.includes('Text')) {
      return (
        <div>
          <textarea
            value={value || ''}
            onChange={(e) => handleInputChange(column.name, e.target.value || null)}
            rows={4}
            className={baseInputClass}
          />
        </div>
      );
    }

    // JSON поля
    if (column.type.includes('JSON')) {
      return (
        <div>
          <textarea
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                handleInputChange(column.name, parsed);
              } catch {
                // Оставляем как есть для редактирования
                handleInputChange(column.name, e.target.value);
              }
            }}
            rows={6}
            className={`${baseInputClass} font-mono text-sm`}
            placeholder='{"key": "value"}'
          />
          <p className="mt-1 text-xs text-gray-500">JSON формат</p>
        </div>
      );
    }

    // Обычные строковые поля
    return (
      <div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleInputChange(column.name, e.target.value || null)}
          className={baseInputClass}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Редактировать запись в "{tableName}"
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <FiAlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Ошибка</span>
              </div>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.columns.map(column => (
              <div key={column.name} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {column.name}
                  {!column.nullable && !column.primary_key && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                
                <div className="text-xs text-gray-500 mb-2">
                  {column.type} {column.primary_key && '(PK)'} {column.foreign_key && '(FK)'}
                </div>
                
                {renderField(column)}
                
                {validationErrors[column.name] && (
                  <p className="text-sm text-red-600">{validationErrors[column.name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Нижняя панель */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RecordEditor;