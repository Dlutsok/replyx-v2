import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config/api';
import { 
  FiEdit3, 
  FiTrash2, 
  FiPlus, 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight,
  FiRefreshCw,
  FiDownload
} from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner';

const DataTable = ({ 
  tableName, 
  schema, 
  onEdit, 
  onCreate, 
  onDelete,
  apiBaseUrl = `${API_URL}/api/admin/database`
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Состояние для поиска и фильтрации
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Состояние для выбранных записей
  const [selectedRows, setSelectedRows] = useState(new Set());

  const fetchData = async () => {
    if (!tableName) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const requestBody = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || null,
        filter_field: filterField || null,
        filter_value: filterValue || null,
        sort_field: sortField || null,
        sort_order: sortOrder
      };

      const response = await fetch(`${apiBaseUrl}/tables/${tableName}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || []);
      setPagination(result.pagination || {});

    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при изменении параметров
  useEffect(() => {
    fetchData();
  }, [tableName, pagination.page, pagination.limit, searchTerm, filterField, filterValue, sortField, sortOrder]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRowSelect = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row.id)));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/tables/${tableName}/records/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления записи');
      }

      // Обновляем данные
      await fetchData();
      
      if (onDelete) {
        onDelete(id);
      }

    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedRows.size} записей?`)) {
      return;
    }

    // Удаляем записи по одной (можно оптимизировать добавив bulk delete на бэкенд)
    for (const id of selectedRows) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${apiBaseUrl}/tables/${tableName}/records/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error(`Ошибка удаления записи ${id}:`, err);
      }
    }

    setSelectedRows(new Set());
    await fetchData();
  };

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 text-xs rounded ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'true' : 'false'}
        </span>
      );
    }

    if (column && column.type && column.type.includes('DateTime')) {
      try {
        const date = new Date(value);
        return date.toLocaleString('ru-RU');
      } catch {
        return String(value);
      }
    }

    if (typeof value === 'string' && value.length > 50) {
      return (
        <div className="group relative">
          <div className="truncate">{value.substring(0, 50)}...</div>
          <div className="invisible group-hover:visible absolute z-10 bg-gray-900 text-white text-sm rounded p-2 top-8 left-0 max-w-xs break-words shadow-lg">
            {value}
          </div>
        </div>
      );
    }

    return String(value);
  };

  const getTypeColor = (type) => {
    if (type.includes('Integer')) return 'text-blue-600';
    if (type.includes('String') || type.includes('Text')) return 'text-green-600';
    if (type.includes('DateTime')) return 'text-purple-600';
    if (type.includes('Boolean')) return 'text-orange-600';
    if (type.includes('Float')) return 'text-cyan-600';
    return 'text-gray-600';
  };

  if (!schema || !schema.columns) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Выберите таблицу для просмотра данных</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Заголовок и управление */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Данные таблицы "{tableName}"
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              onClick={() => onCreate && onCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiPlus className="w-4 h-4" />
              Создать
            </button>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Поиск по всем полям..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Поле для фильтра</option>
            {schema.columns.map(column => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Значение фильтра"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            disabled={!filterField}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Массовые действия */}
        {selectedRows.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-800">
              Выбрано записей: {selectedRows.size}
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              <FiTrash2 className="w-4 h-4" />
              Удалить выбранные
            </button>
          </div>
        )}
      </div>

      {/* Таблица данных */}
      <div className="overflow-x-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600">Загрузка данных...</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Попробовать еще раз
            </button>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            Данные не найдены
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {schema.columns.map(column => (
                  <th
                    key={column.name}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column.name)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.name}</span>
                      <span className={`text-xs ${getTypeColor(column.type)}`}>
                        {column.type}
                      </span>
                      {sortField === column.name && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <motion.tr
                  key={row.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`hover:bg-gray-50 ${selectedRows.has(row.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  {schema.columns.map(column => (
                    <td key={column.name} className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      {formatCellValue(row[column.name], column)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => onEdit && onEdit(row)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Редактировать"
                      >
                        <FiEdit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Удалить"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Пагинация */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Показано {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total} записей
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="w-4 h-4" />
              Назад
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-600">
              Страница {pagination.page} из {pagination.pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Далее
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;