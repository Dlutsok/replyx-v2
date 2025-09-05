import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import { 
  FiMessageCircle, FiGlobe 
} from 'react-icons/fi';

export default function ConversationsTab({ dialogs, loading, onDialogOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);
  
  const filteredDialogs = Array.isArray(dialogs) ? dialogs.filter(dialog => {
    const matchesSearch = !searchQuery || 
      dialog.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dialog.last_message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChannel = !selectedChannel || dialog.platform === selectedChannel;
    
    return matchesSearch && matchesChannel;
  }) : [];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Поиск по диалогам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedChannel || ''}
          onChange={(e) => setSelectedChannel(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Все каналы</option>
          <option value="telegram">Telegram</option>
          <option value="website">Веб-сайт</option>
        </select>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingIndicator message="Загрузка диалогов..." size="medium" />
        </div>
      ) : filteredDialogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FiMessageCircle size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedChannel ? 'Ничего не найдено' : 'Нет диалогов'}
          </h3>
          <p className="text-gray-600">
            {searchQuery || selectedChannel 
              ? 'Попробуйте изменить параметры поиска' 
              : 'Диалоги появятся после первого сообщения в чате'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Десктоп версия с таблицей */}
          <div className="hidden xl:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Канал
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Последнее сообщение
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDialogs.map((dialog) => (
                    <motion.tr
                      key={dialog.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onDialogOpen && onDialogOpen(dialog)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600">
                                {(dialog.user_name || dialog.telegram_chat_id || 'G').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {dialog.user_name || `Пользователь ${dialog.telegram_chat_id || dialog.id}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {dialog.telegram_username && `@${dialog.telegram_username}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {dialog.platform === 'telegram' ? (
                            <FiMessageCircle className="h-4 w-4 text-blue-500 mr-2" />
                          ) : (
                            <FiGlobe className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          <span className="text-sm text-gray-900">
                            {dialog.platform === 'telegram' ? 'Telegram' : 'Веб-сайт'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {dialog.last_message || 'Нет сообщений'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dialog.last_message_at ? new Date(dialog.last_message_at).toLocaleString('ru-RU') : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          dialog.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dialog.is_active ? 'Активный' : 'Закончен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDialogOpen && onDialogOpen(dialog);
                          }}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                        >
                          Открыть
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDialogs.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Отображается <span className="font-medium">{filteredDialogs.length}</span> из <span className="font-medium">{dialogs.length}</span> диалогов
                </div>
              </div>
            )}
          </div>

          {/* Мобильная версия с карточками */}
          <div className="xl:hidden space-y-3">
            {filteredDialogs.map((dialog) => (
              <motion.div
                key={dialog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onDialogOpen && onDialogOpen(dialog)}
              >
                {/* Верхняя часть - пользователь и статус */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {(dialog.user_name || dialog.telegram_chat_id || 'G').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {dialog.user_name || `Пользователь ${dialog.telegram_chat_id || dialog.id}`}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {dialog.telegram_username && `@${dialog.telegram_username}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      dialog.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dialog.is_active ? 'Активный' : 'Закончен'}
                    </span>
                  </div>
                </div>

                {/* Средняя часть - последнее сообщение */}
                <div className="mb-3">
                  <div className="text-sm text-gray-900 line-clamp-2">
                    {dialog.last_message || 'Нет сообщений'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dialog.last_message_at ? new Date(dialog.last_message_at).toLocaleString('ru-RU') : ''}
                  </div>
                </div>

                {/* Нижняя часть - канал и действия */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dialog.platform === 'telegram' ? (
                      <FiMessageCircle className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FiGlobe className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-xs text-gray-600">
                      {dialog.platform === 'telegram' ? 'Telegram' : 'Веб-сайт'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDialogOpen && onDialogOpen(dialog);
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    Открыть
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredDialogs.length > 0 && (
              <div className="text-center py-2">
                <div className="text-sm text-gray-500">
                  Показано <span className="font-medium">{filteredDialogs.length}</span> из <span className="font-medium">{dialogs.length}</span> диалогов
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}