import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import WidgetSettingsModal from '@/components/ui/WidgetSettingsModal';
import { EmbedCodeModal } from '@/components/ui';
import { API_URL } from '@/config/api';
import { useNotifications } from '@/hooks/useNotifications';
import {
  FiZap, FiRefreshCw, FiMessageCircle, FiGlobe, FiCheck, FiCopy, FiSettings
} from 'react-icons/fi';

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

  const activeChannels = Array.isArray(channels) ? channels.filter(ch => (ch.count ?? 0) > 0 || ch.active) : [];
  const assistantBots = Array.isArray(bots) ? bots.filter(b => b.assistant_id === assistant.id && b.is_active) : [];
  
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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
    </div>
  );
}