import React, { useState, useCallback, useMemo } from 'react';
import { FiMessageSquare, FiUpload, FiSettings, FiBarChart, FiCopy, FiExternalLink, FiZap, FiChevronRight } from 'react-icons/fi';
import { EmbedCodeModal } from '../ui';
import { useNotifications } from '../../hooks/useNotifications';

const QuickActions = React.memo(({ assistants, onRefresh }) => {
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [embedCode, setEmbedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const { showError } = useNotifications();

  const handleCreateAssistant = useCallback(() => {
    window.location.href = '/ai-assistant';
  }, []);

  const handleUploadDocuments = useCallback(() => {
    window.location.href = '/ai-assistant';
  }, []);

  const handleViewAnalytics = useCallback(() => {
    window.location.href = '/usage';
  }, []);

  const handleGetEmbedCode = useCallback(async () => {
    if (assistants.length === 0) {
      window.location.href = '/ai-assistant';
      return;
    }

    if (assistants.length === 1) {
      await fetchEmbedCode(assistants[0]);
    } else {
      // Показать модальное окно выбора ассистента
      setShowEmbedModal(true);
    }
  }, [assistants]);

  // Мемоизация массива действий для предотвращения пересоздания при каждом рендере
  const quickActionItems = useMemo(() => [
    {
      id: 'create-assistant',
      title: 'Создать ассистента',
      description: 'AI-помощник',
      icon: FiMessageSquare,
      iconBg: 'bg-[#6334E5]/10',
      iconColor: 'text-[#6334E5]',
      action: handleCreateAssistant
    },
    {
      id: 'upload-documents',
      title: 'Загрузить документы',
      description: 'База знаний',
      icon: FiUpload,
      iconBg: 'bg-[#6334E5]/10',
      iconColor: 'text-[#6334E5]',
      action: handleUploadDocuments
    },
    {
      id: 'view-analytics',
      title: 'Аналитика',
      description: 'Статистика',
      icon: FiBarChart,
      iconBg: 'bg-[#6334E5]/10',
      iconColor: 'text-[#6334E5]',
      action: handleViewAnalytics
    },
    {
      id: 'get-embed-code',
      title: 'Код для сайта',
      description: 'Веб-виджет',
      icon: FiZap,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-700',
      action: handleGetEmbedCode
    }
  ], [handleCreateAssistant, handleUploadDocuments, handleViewAnalytics, handleGetEmbedCode]);

  const fetchEmbedCode = useCallback(async (assistant) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/assistants/${assistant.id}/embed-code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEmbedCode(data.embed_code);
        setSelectedAssistant(assistant);
        setShowEmbedModal(true);
      }
    } catch (error) {
      console.error('Error fetching embed code:', error);
      showError('Ошибка получения кода виджета', {
        title: 'Ошибка'
      });
    }
  }, []);

  const handleAssistantSelect = useCallback(async (assistant) => {
    await fetchEmbedCode(assistant);
  }, [fetchEmbedCode]);

  const handleCloseModal = useCallback(() => {
    setShowEmbedModal(false);
    setSelectedAssistant(null);
    setEmbedCode('');
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
      {/* Заголовок */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-3 xl:gap-4 mb-3 sm:mb-4 md:mb-4 lg:mb-5 xl:mb-6">
        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-[#6334E5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiZap className="text-[#6334E5]" size={12} />
        </div>
        <h3 className="text-base sm:text-base md:text-lg lg:text-lg xl:text-xl font-semibold text-gray-900">Быстрые действия</h3>
      </div>

      {/* Навигационные карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2 sm:gap-3 md:gap-3 lg:gap-4 xl:gap-5">
        {/* Создать ассистента */}
        <div
          onClick={handleCreateAssistant}
          className="bg-gray-50 rounded-xl p-2 sm:p-3 md:p-3 lg:p-4 xl:p-5 border border-gray-200 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/5 transition-all duration-200 cursor-pointer group active:scale-[0.98] sm:active:scale-100"
        >
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3 mb-1 sm:mb-1 md:mb-2 lg:mb-2 xl:mb-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors flex-shrink-0">
              <FiMessageSquare className="text-[#6334E5]" size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">Создать ассистента</h3>
              <p className="text-sm text-gray-500 leading-tight">Новый AI-помощник</p>
            </div>
          </div>
          <div className="flex items-center text-sm text-[#6334E5] font-medium">
            Начать <FiChevronRight className="ml-1" size={10} />
          </div>
        </div>

        {/* Загрузить документы */}
        <div
          onClick={handleUploadDocuments}
          className={`bg-gray-50 rounded-xl p-2 sm:p-3 md:p-3 lg:p-4 xl:p-5 border transition-all duration-200 cursor-pointer group active:scale-[0.98] sm:active:scale-100 ${
            assistants.length > 0
              ? 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              : 'border-gray-100 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3 mb-1 sm:mb-1 md:mb-2 lg:mb-2 xl:mb-2">
            <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              assistants.length > 0
                ? 'bg-emerald-100 group-hover:bg-emerald-200 text-emerald-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              <FiUpload size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-sm truncate ${
                assistants.length > 0 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Загрузить документы
              </h3>
              <p className="text-sm text-gray-500 leading-tight">
                {assistants.length > 0 ? 'База знаний' : 'Сначала создайте ассистента'}
              </p>
            </div>
          </div>
          <div className={`flex items-center text-sm font-medium ${
            assistants.length > 0 ? 'text-emerald-600' : 'text-gray-400'
          }`}>
            {assistants.length > 0 ? 'Загрузить' : 'Недоступно'} <FiChevronRight className="ml-1" size={10} />
          </div>
        </div>

        {/* Аналитика */}
        <div
          onClick={handleViewAnalytics}
          className="bg-gray-50 rounded-xl p-2 sm:p-3 md:p-3 lg:p-4 xl:p-5 border border-gray-200 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/5 transition-all duration-200 cursor-pointer group active:scale-[0.98] sm:active:scale-100"
        >
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3 mb-1 sm:mb-1 md:mb-2 lg:mb-2 xl:mb-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-[#6334E5]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6334E5]/20 transition-colors flex-shrink-0">
              <FiBarChart className="text-[#6334E5]" size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">Аналитика</h3>
              <p className="text-sm text-gray-500 leading-tight">Статистика работы</p>
            </div>
          </div>
          <div className="flex items-center text-sm text-[#6334E5] font-medium">
            Посмотреть <FiChevronRight className="ml-1" size={10} />
          </div>
        </div>

        {/* Код для сайта */}
        <div
          onClick={handleGetEmbedCode}
          className={`bg-gray-50 rounded-xl p-2 sm:p-3 md:p-3 lg:p-4 xl:p-5 border transition-all duration-200 cursor-pointer group active:scale-[0.98] sm:active:scale-100 ${
            assistants.length > 0
              ? 'border-gray-200 hover:border-[#6334E5]/30 hover:bg-[#6334E5]/5'
              : 'border-gray-100 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3 mb-1 sm:mb-1 md:mb-2 lg:mb-2 xl:mb-2">
            <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              assistants.length > 0
                ? 'bg-[#6334E5]/10 group-hover:bg-[#6334E5]/20 text-[#6334E5]'
                : 'bg-gray-100 text-gray-400'
            }`}>
              <FiZap size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-sm truncate ${
                assistants.length > 0 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Код для сайта
              </h3>
              <p className="text-sm text-gray-500 leading-tight">
                {assistants.length > 0 ? 'Веб-виджет' : 'Сначала создайте ассистента'}
              </p>
            </div>
          </div>
          <div className={`flex items-center text-sm font-medium ${
            assistants.length > 0 ? 'text-[#6334E5]' : 'text-gray-400'
          }`}>
            {assistants.length > 0 ? 'Получить' : 'Недоступно'} <FiChevronRight className="ml-1" size={10} />
          </div>
        </div>
      </div>

      {/* Профессиональный модальный компонент для embed-кода */}
      <EmbedCodeModal
        isOpen={showEmbedModal}
        onClose={handleCloseModal}
        assistants={assistants}
        onAssistantSelect={handleAssistantSelect}
        selectedAssistant={selectedAssistant}
        embedCode={embedCode}
      />
    </div>
  );
});

// Добавляем displayName для лучшей отладки
QuickActions.displayName = 'QuickActions';

export default QuickActions;