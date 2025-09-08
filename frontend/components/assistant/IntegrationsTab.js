
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import WidgetSettingsModal from '@/components/ui/WidgetSettingsModal';
import { EmbedCodeModal } from '@/components/ui';
import { API_URL } from '@/config/api';
import { useNotifications } from '@/hooks/useNotifications';
import {
  FiZap, FiRefreshCw, FiMessageCircle, FiGlobe, FiCheck, FiCopy, FiSettings, FiPlus, FiX
} from 'react-icons/fi';
import { FaVk } from 'react-icons/fa';

export default function IntegrationsTab({ 
  channels, 
  bots, 
  assistant, 
  loading, 
  onRefreshData 
}) {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showWidgetSettingsModal, setShowWidgetSettingsModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [showTelegramBotModal, setShowTelegramBotModal] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [creatingBot, setCreatingBot] = useState(false);
  const [editingBot, setEditingBot] = useState(null);

  const activeChannels = Array.isArray(channels) ? channels.filter(ch => (ch.count ?? 0) > 0 || ch.active) : [];
  const assistantBots = Array.isArray(bots) ? bots.filter(b => b.assistant_id === assistant.id && b.is_active) : [];
  
  // Проверяем, есть ли уже Telegram бот для этого ассистента
  const hasTelegramBot = assistantBots.some(bot => bot.platform === 'telegram');
  
  // Сайт интеграция всегда включена по умолчанию
  const siteEnabled = true;

  // Функции для работы с поп-апом кода виджета
  const fetchEmbedCode = useCallback(async (assistant) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/assistants/${assistant.id}/embed-code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEmbedCode(data.embed_code);
        setShowEmbedModal(true);
      }
    } catch (error) {
      console.error('Error fetching embed code:', error);
      showError('Ошибка получения кода виджета', { title: 'Ошибка' });
    }
  }, []);

  const handleAssistantSelect = useCallback(async (assistant) => {
    await fetchEmbedCode(assistant);
  }, [fetchEmbedCode]);

  const handleCloseModal = useCallback(() => {
    setShowEmbedModal(false);
    setEmbedCode('');
  }, []);

  const handleShowEmbedCode = useCallback(() => {
    if (!assistant) return;
    
    // Проверяем, указаны ли домены
    if (!assistant.allowed_domains || assistant.allowed_domains.trim() === '') {
      // Показываем модальную подсказку
      setShowHintModal(true);
      return;
    }
    
    fetchEmbedCode(assistant);
  }, [assistant, fetchEmbedCode]);

  const handleEditBot = useCallback((bot) => {
    setEditingBot(bot);
    setTelegramBotToken(bot.bot_token || '');
    setShowTelegramBotModal(true);
  }, []);

  const handleShowWidgetSettings = useCallback(() => {
    setShowWidgetSettingsModal(true);
  }, []);

  const handleSaveWidgetSettings = useCallback((settings) => {
    // Обновляем данные после сохранения
    if (onRefreshData) {
      onRefreshData();
    }
  }, [onRefreshData]);

  const handleCloseWidgetSettings = useCallback((action) => {
    setShowWidgetSettingsModal(false);
    
    // Если пользователь нажал "показать embed код"
    if (action === 'showEmbedCode') {
      setTimeout(() => {
        fetchEmbedCode(assistant);
      }, 300);
    }
  }, [assistant, fetchEmbedCode]);

  const handleCreateTelegramBot = useCallback(async () => {
    if (!telegramBotToken.trim()) {
      showError('Введите токен Telegram бота', { title: 'Ошибка' });
      return;
    }

    setCreatingBot(true);

    try {
      const token = localStorage.getItem('token');
      const isEditing = !!editingBot;
      const url = isEditing 
        ? `${API_URL}/api/bot-instances/${editingBot.id}` 
        : `${API_URL}/api/bot-instances`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: 'telegram',
          assistant_id: assistant.id,
          bot_token: telegramBotToken.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setShowTelegramBotModal(false);
        setTelegramBotToken('');
        setEditingBot(null);
        showSuccess(`Telegram бот успешно ${isEditing ? 'обновлен' : 'создан'}!`, { title: 'Готово' });
        
        // Обновляем список интеграций
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка ${isEditing ? 'обновления' : 'создания'} бота`);
      }
    } catch (error) {
      console.error('Ошибка работы с Telegram ботом:', error);
      showError(`Ошибка ${editingBot ? 'обновления' : 'создания'} бота: ${error.message}`, { title: 'Ошибка' });
    } finally {
      setCreatingBot(false);
    }
  }, [telegramBotToken, assistant.id, showError, showSuccess, onRefreshData, editingBot]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Активные интеграции</h3>
          <p className="text-sm text-gray-600">Управляйте каналами общения с пользователями</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all duration-150 flex items-center gap-2 font-medium"
            onClick={() => setShowIntegrationsModal(true)}
          >
            <FiPlus size={16} />
            Добавить интеграцию
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 border border-solid border-gray-200/60 text-gray-600 bg-white rounded-2xl hover:bg-gray-50 hover:border-gray-200/70 transition-all duration-150 flex items-center gap-2"
            onClick={onRefreshData}
          >
            <FiRefreshCw size={16} />
            Обновить
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingIndicator message="Загрузка интеграций..." size="medium" />
        </div>
      ) : activeChannels.length === 0 && assistantBots.length === 0 && !siteEnabled ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center border border-solid border-gray-200/60">
            <FiZap size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет активных интеграций</h3>
          <p className="text-gray-600">Подключите Telegram/VK/Виджет, чтобы начать</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Интеграция сайта (виджет) - по умолчанию первая */}
          {siteEnabled && (
            <div key={`site-${assistant.id}`} className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60 hover:border-gray-200/70 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-solid border-green-200/60">
                    <FiGlobe size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Веб‑виджет</h4>
                    <p className="text-sm text-gray-600">site</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-medium bg-green-50 text-green-700 border border-solid border-green-200/60">
                    <FiCheck size={12} className="mr-1" />
                    Активен
                  </span>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleShowWidgetSettings}
                      className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-2xl transition-all duration-150 flex items-center gap-1 border border-solid border-gray-200/60"
                    >
                      <FiSettings size={12} />
                      Редактировать
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleShowEmbedCode}
                      className={`px-3 py-1 text-xs font-medium rounded-2xl transition-all duration-150 flex items-center gap-1 border ${
                        !assistant.allowed_domains || assistant.allowed_domains.trim() === ''
                          ? 'bg-gray-50 hover:bg-gray-100 text-gray-600 cursor-help border-gray-200/60'
                          : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                      }`}
                      title={!assistant.allowed_domains || assistant.allowed_domains.trim() === ''
                        ? 'Сначала настройте разрешенные домены'
                        : 'Получить код для вставки на сайт'}
                    >
                      <FiCopy size={12} />
                      {!assistant.allowed_domains || assistant.allowed_domains.trim() === ''
                        ? 'Настройте домены'
                        : 'Показать код'}
                    </motion.button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                {!assistant.allowed_domains || assistant.allowed_domains.trim() === '' ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-solid border-amber-200/60 rounded-2xl">
                    <div className="w-5 h-5 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <span className="text-amber-600 text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        Требуется настройка доменов
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Нажмите "Редактировать" и добавьте доменное имя вашего сайта для получения кода виджета
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-6 text-sm text-gray-600">
                    <span>Статус: настроен</span>
                    <span>Тип: JavaScript виджет</span>
                    <span>Домены: {assistant.allowed_domains}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Активные каналы (агрегировано по источникам диалогов) */}
          {activeChannels.map(ch => (
            <div key={`channel-${ch.type}`} className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60 hover:border-gray-200/70 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-solid border-blue-200/60">
                    {ch.type === 'telegram' ? (
                      <FiMessageCircle size={20} className="text-blue-600" />
                    ) : (
                      <FiGlobe size={20} className="text-green-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{ch.name || ch.type}</h4>
                    <p className="text-sm text-gray-600">{ch.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-medium bg-green-50 text-green-700 border border-solid border-green-200/60">
                    <FiCheck size={12} className="mr-1" />
                    Активна
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-2xl transition-all duration-150 flex items-center gap-1 border border-solid border-gray-200/60"
                  >
                    <FiSettings size={12} />
                    Редактировать
                  </motion.button>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-sm text-gray-600">
                {typeof ch.count === 'number' && <span>Диалогов: {ch.count}</span>}
                {ch.username && <span>Username: {ch.username}</span>}
                {ch.channel_id && <span>ID: {ch.channel_id}</span>}
              </div>
            </div>
          ))}

          {/* Активные боты, привязанные к ассистенту */}
          {assistantBots.map(bot => (
            <div key={`bot-${bot.id}`} className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60 hover:border-gray-200/70 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-solid border-purple-200/60">
                    <FiMessageCircle size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {bot.platform === 'telegram' ? 'Telegram Bot' : bot.platform}
                    </h4>
                    <p className="text-sm text-gray-600">assistant: {bot.assistant_name || assistant.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-medium bg-green-50 text-green-700 border border-solid border-green-200/60">
                    <FiCheck size={12} className="mr-1" />
                    Активен
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEditBot(bot)}
                    className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-2xl transition-all duration-150 flex items-center gap-1 border border-solid border-gray-200/60"
                  >
                    <FiSettings size={12} />
                    Редактировать
                  </motion.button>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-sm text-gray-600">
                <span>Платформа: {bot.platform}</span>
                {bot.created_at && <span>Создан: {new Date(bot.created_at).toLocaleDateString('ru-RU')}</span>}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Профессиональный модальный компонент для embed-кода */}
      <EmbedCodeModal
        isOpen={showEmbedModal}
        onClose={handleCloseModal}
        assistants={[assistant].filter(Boolean)}
        onAssistantSelect={handleAssistantSelect}
        selectedAssistant={assistant}
        embedCode={embedCode}
      />
      
      {/* Полноэкранный редактор виджета */}
      <WidgetSettingsModal
        isOpen={showWidgetSettingsModal}
        onClose={handleCloseWidgetSettings}
        onSave={handleSaveWidgetSettings}
        selectedAssistant={assistant}
        isFullscreen={true}
      />

      {/* Модальное окно подсказки для настройки доменов */}
      {showHintModal && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowHintModal(false);
              }
            }}
          >
            {/* Modal content */}
            <div
              className="bg-white rounded-2xl max-w-md w-full shadow-xl transform transition-all duration-300 ease-out scale-100 relative z-[10000] animate-in fade-in slide-in-from-bottom-4 border border-solid border-gray-200/60"
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-solid border-amber-200/60">
                    <FiSettings className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Настройка виджета
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Для получения кода веб-виджета необходимо сначала настроить разрешенные домены
                  </p>
                </div>

                <div className="bg-amber-50 border border-solid border-amber-200/60 rounded-2xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-solid border-amber-200/60">
                      <span className="text-amber-600 text-xs font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 mb-1">
                        Нажмите кнопку "Редактировать"
                      </p>
                      <p className="text-xs text-amber-700">
                        Откроются настройки виджета
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-solid border-blue-200/60 rounded-2xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-solid border-blue-200/60">
                      <span className="text-blue-600 text-xs font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Добавьте доменное имя сайта
                      </p>
                      <p className="text-xs text-blue-700">
                        Например: example.com или mysite.ru
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-solid border-green-200/60 rounded-2xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-solid border-green-200/60">
                      <span className="text-green-600 text-xs font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 mb-1">
                        Получите код виджета
                      </p>
                      <p className="text-xs text-green-700">
                        Кнопка "Показать код" станет активной
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowHintModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-2xl transition-all duration-150 border border-solid border-gray-200/60"
                  >
                    Понятно
                  </button>
                  <button
                    onClick={() => {
                      setShowHintModal(false);
                      handleShowWidgetSettings();
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 border border-solid border-purple-600"
                  >
                    <FiSettings size={16} />
                    Настроить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Модальное окно выбора интеграций */}
      {showIntegrationsModal && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowIntegrationsModal(false);
              }
            }}
          >
            {/* Modal content */}
            <div
              className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl transform transition-all duration-300 ease-out scale-100 relative z-[10000] animate-in fade-in slide-in-from-bottom-4 border border-solid border-gray-100/60 overflow-hidden"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Выберите тип интеграции
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Подключите ассистента к популярным платформам для общения с пользователями
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntegrationsModal(false)}
                    className="w-10 h-10 rounded-xl border border-gray-200/60 bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Telegram интеграция */}
                  <div
                    className={`bg-white border-2 border-gray-200/60 rounded-2xl p-4 transition-all duration-300 ${
                      hasTelegramBot 
                        ? 'opacity-60 cursor-not-allowed hover:opacity-70' 
                        : 'hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-lg cursor-pointer'
                    } group`}
                    onClick={() => {
                      if (!hasTelegramBot) {
                        setShowIntegrationsModal(false);
                        setShowTelegramBotModal(true);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border border-solid shadow-md transition-colors duration-300 overflow-hidden ${
                        hasTelegramBot 
                          ? 'bg-gray-100 border-gray-200/60' 
                          : 'bg-blue-500 border-blue-300 group-hover:bg-blue-600'
                      }`}>
                        <img
                          src="https://cdn1.telesco.pe/file/Pa3wyqwzUENlDaKQppGu6_NiPO4yv5h4UJmb8jZ3E2zX-JPj2rXhVDfcA82nuxTFJaDdACG3kS_mVsrWdHXgKRnjECZNIKitk7wMa9qwU5QTZNh9kVhpEf1G5Pd46ZBv28BEfh5Kidhoy3aM36Cl2tKARmKqKss3cMV5kdcmmRnas6gZy-RT35BxshHZ4nDeXhB8hVj8j2AA4LstIOtGbfOt6fFMKm1nDlqWdHHq2Knfm-icbIWjpKk6_nnKv0Lws4ZKcD3yfol9FV6crANYIKRHu_5vidxlwT65ONJo2LPg49f9aBG71yv-RbSVEvuaJNUeOY0AxDZXV0tgRHe1JQ.jpg"
                          alt="Telegram"
                          className={`w-full h-full object-cover ${hasTelegramBot ? 'grayscale' : ''}`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-base font-semibold mb-1 ${hasTelegramBot ? 'text-gray-400' : 'text-gray-900'}`}>
                          Telegram бот
                        </h4>
                        <p className={`text-xs mb-3 leading-tight ${hasTelegramBot ? 'text-gray-400' : 'text-gray-600'}`}>
                          Бот в Telegram для общения с пользователями
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {hasTelegramBot ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-solid border-blue-200/60">
                              <FiCheck size={12} className="mr-1" />
                              Подключено
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-solid border-green-200/60">
                              Популярно
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VKontakte (скоро) */}
                  <div className="bg-white border-2 border-gray-200/60 rounded-2xl p-4 opacity-60 cursor-not-allowed hover:opacity-70 transition-all duration-300">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-solid border-gray-200/60">
                        <FaVk size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-400 mb-1">VKontakte</h4>
                        <p className="text-gray-400 text-xs mb-3 leading-tight">
                          Сообщества и личные сообщения VK
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-solid border-orange-200">
                          Скоро
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Max (скоро) */}
                  <div className="bg-white border-2 border-gray-200/60 rounded-2xl p-4 opacity-60 cursor-not-allowed hover:opacity-70 transition-all duration-300">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-solid border-gray-200/60">
                        <svg width="20" height="20" viewBox="0 0 42 42" fill="none" className="text-gray-400">
                          <path fill="currentColor" fillRule="evenodd" d="M21.47 41.88c-4.11 0-6.02-.6-9.34-3-2.1 2.7-8.75 4.81-9.04 1.2 0-2.71-.6-5-1.28-7.5C1 29.5.08 26.07.08 21.1.08 9.23 9.82.3 21.36.3c11.55 0 20.6 9.37 20.6 20.91a20.6 20.6 0 0 1-20.49 20.67Zm.17-31.32c-5.62-.29-10 3.6-10.97 9.7-.8 5.05.62 11.2 1.83 11.52.58.14 2.04-1.04 2.95-1.95a10.4 10.4 0 0 0 5.08 1.81 10.7 10.7 0 0 0 11.19-9.97 10.7 10.7 0 0 0-10.08-11.1Z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-400 mb-1">Max</h4>
                        <p className="text-gray-400 text-xs mb-3 leading-tight">
                          Расширенные коммуникации
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-solid border-orange-200">
                          Скоро
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avito (скоро) */}
                  <div className="bg-white border-2 border-gray-200/60 rounded-2xl p-4 opacity-60 cursor-not-allowed hover:opacity-70 transition-all duration-300">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-solid border-gray-200/60">
                        <svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                          <circle cx="10.595" cy="5.225" r="3.325" fill="#965EEB"></circle>
                          <circle cx="22.245" cy="7.235" r="7.235" fill="#0AF"></circle>
                          <circle cx="8.9" cy="18.6" r="8.9" fill="#04E061"></circle>
                          <circle cx="24.325" cy="21.005" r="5.375" fill="#FF4053"></circle>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-400 mb-1">Avito</h4>
                        <p className="text-gray-400 text-xs mb-3 leading-tight">
                          Автоматизация общения с покупателями
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-solid border-orange-200">
                          Скоро
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Модальное окно настройки Telegram бота */}
      {showTelegramBotModal && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !creatingBot) {
                setShowTelegramBotModal(false);
                setTelegramBotToken('');
              }
            }}
          >
            {/* Modal content */}
            <div
              className="bg-white rounded-2xl max-w-xl w-full shadow-xl transform transition-all duration-300 ease-out scale-100 relative z-[10000] animate-in fade-in slide-in-from-bottom-4 border border-solid border-gray-200/60"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center border border-solid border-blue-200/60">
                      <FiMessageCircle size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {editingBot ? 'Редактировать Telegram бота' : 'Создать Telegram бота'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {editingBot ? 'Измените настройки бота' : 'Подключите ассистента к Telegram'}
                      </p>
                    </div>
                  </div>
                  {!creatingBot && (
                    <button
                      onClick={() => {
                        setShowTelegramBotModal(false);
                        setTelegramBotToken('');
                      }}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>

                {/* Инструкции */}
                <div className="mb-6 p-4 bg-blue-50 border border-solid border-blue-200/60 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-blue-800 mb-1">Получите токен бота</h5>
                      <p className="text-xs text-blue-700 leading-relaxed mb-2">
                        Откройте <strong>@BotFather</strong> в Telegram и создайте нового бота командой <code>/newbot</code>
                      </p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Скопируйте полученный токен (например: <code>123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Форма */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Токен Telegram бота *
                    </label>
                    <input
                      type="text"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150"
                      disabled={creatingBot}
                    />
                  </div>

                  {/* Дополнительная информация */}
                  <div className="p-4 bg-amber-50 border border-solid border-amber-200/60 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-amber-600 text-xs font-bold">⚠️</span>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-amber-800 mb-1">Важно</h5>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          Сохраните токен бота в надёжном месте. Не передавайте его третьим лицам — через токен можно управлять ботом.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Кнопки */}
                <div className="flex items-center justify-end gap-3 mt-6">
                  {!creatingBot && (
                    <button
                      onClick={() => {
                        setShowTelegramBotModal(false);
                        setTelegramBotToken('');
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-all duration-150 font-medium"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    onClick={handleCreateTelegramBot}
                    disabled={creatingBot || !telegramBotToken.trim()}
                    className={`px-6 py-2 text-white rounded-2xl font-medium transition-all duration-150 flex items-center gap-2 ${
                      creatingBot || !telegramBotToken.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 hover:shadow-md'
                    }`}
                  >
                    {creatingBot ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Создаём бота...
                      </>
                    ) : (
                      <>
                        <FiMessageCircle size={16} />
                        Создать бота
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}