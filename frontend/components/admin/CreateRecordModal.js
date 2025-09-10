import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config/api';
import { FiX, FiPlus, FiAlertCircle } from 'react-icons/fi';

const CreateRecordModal = ({ 
  isOpen, 
  onClose, 
  tableName, 
  schema, 
  onCreate,
  apiBaseUrl = `${API_URL}/api/admin/database`
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen && schema) {
      // Инициализируем форму значениями по умолчанию
      const initialData = {};
      
      schema.columns.forEach(column => {
        if (column.primary_key) {
          // Первичные ключи обычно auto-increment, оставляем пустыми
          return;
        }
        
        if (column.default) {
          // Используем значение по умолчанию
          if (column.default.includes('now()') || column.default.includes('datetime.utcnow')) {
            initialData[column.name] = new Date().toISOString();
          } else {
            initialData[column.name] = column.default;
          }
        } else if (!column.nullable) {
          // Для обязательных полей устанавливаем значения по умолчанию по типу
          if (column.type.includes('Boolean')) {
            initialData[column.name] = false;
          } else if (column.type.includes('Integer') || column.type.includes('Float')) {
            initialData[column.name] = 0;
          } else if (column.type.includes('String') || column.type.includes('Text')) {
            initialData[column.name] = '';
          }
        }
      });
      
      setFormData(initialData);
      setError(null);
      setValidationErrors({});
    }
  }, [isOpen, schema]);

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

      // Пропускаем первичные ключи (обычно auto-increment)
      if (column.primary_key) return;

      // Проверка обязательных полей
      if (!column.nullable && (value === null || value === undefined || value === '')) {
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

  const handleCreate = async () => {
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
      
      // Удаляем пустые значения для nullable полей
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] === '') {
          const column = schema.columns.find(col => col.name === key);
          if (column && column.nullable) {
            dataToSend[key] = null;
          }
        }
      });

      const response = await fetch(`${apiBaseUrl}/tables/${tableName}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: dataToSend })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (onCreate) {
        onCreate(result.data);
      }

      onClose();

    } catch (err) {
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

    // Primary key поля пропускаем (обычно auto-increment)
    if (column.primary_key) {
      return (
        <div>
          <input
            type="text"
            value="Автоматически"
            readOnly
            className={`${baseInputClass} bg-gray-100 cursor-not-allowed`}
          />
          <p className="mt-1 text-xs text-gray-500">Генерируется автоматически</p>
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
          <p className="mt-1 text-xs text-gray-500">
            Оставьте пустым для текущего времени (если применимо)
          </p>
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
            placeholder={column.nullable ? "Оставьте пустым для null" : "0"}
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
            placeholder={column.nullable ? "Оставьте пустым для null" : "Введите текст"}
          />
        </div>
      );
    }

    // JSON поля
    if (column.type.includes('JSON')) {
      return (
        <div>
          <textarea
            value={value ? (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                handleInputChange(column.name, column.nullable ? null : {});
                return;
              }
              
              try {
                const parsed = JSON.parse(val);
                handleInputChange(column.name, parsed);
              } catch {
                // Оставляем как строку для дальнейшего редактирования
                handleInputChange(column.name, val);
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
          placeholder={column.nullable ? "Оставьте пустым для null" : "Введите значение"}
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
            Создать запись в "{tableName}"
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

          {/* Подсказка */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Подсказка:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Поля отмеченные * являются обязательными</li>
                  <li>Первичные ключи (PK) генерируются автоматически</li>
                  <li>Внешние ключи (FK) должны ссылаться на существующие записи</li>
                  <li>Для nullable полей можно оставить значение пустым</li>
                </ul>
              </div>
            </div>
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
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FiPlus className="w-4 h-4" />
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateRecordModal;