import { useState } from 'react';
import { FiPlus, FiMessageSquare, FiUpload, FiSettings, FiBarChart, FiCopy, FiExternalLink, FiZap } from 'react-icons/fi';

const QuickActions = ({ assistants, onRefresh }) => {
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [embedCode, setEmbedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const quickActionItems = [
    {
      id: 'create-assistant',
      title: 'Создать ассистента',
      description: 'Новый AI-ассистент',
      icon: FiMessageSquare,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => window.location.href = '/ai-assistant'
    },
    {
      id: 'upload-documents',
      title: 'Загрузить документы',
      description: 'Добавить знания',
      icon: FiUpload,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => window.location.href = '/ai-assistant'
    },
    {
      id: 'view-analytics',
      title: 'Аналитика',
      description: 'Статистика',
      icon: FiBarChart,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => window.location.href = '/usage'
    },
    {
      id: 'get-embed-code',
      title: 'Код виджета',
      description: 'Embed-код',
      icon: FiZap,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => handleGetEmbedCode()
    }
  ];

  const handleGetEmbedCode = async () => {
    if (assistants.length === 0) {
      alert('Сначала создайте ассистента');
      return;
    }

    if (assistants.length === 1) {
      await fetchEmbedCode(assistants[0]);
    } else {
      // Показать модальное окно выбора ассистента
      setShowEmbedModal(true);
    }
  };

  const fetchEmbedCode = async (assistant) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/assistants/${assistant.id}/embed-code`, {
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
      alert('Ошибка получения кода виджета');
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const closeEmbedModal = () => {
    setShowEmbedModal(false);
    setSelectedAssistant(null);
    setEmbedCode('');
    setCopySuccess(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiZap className="mr-2 text-yellow-500" />
          Быстрые действия
        </h3>
      </div>

      {/* Сетка действий */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActionItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className="group p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left bg-white hover:bg-gray-50 h-[140px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center transition-colors`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors mb-2 text-sm leading-tight">
                {item.title}
              </h4>
              <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors leading-relaxed">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Дополнительные быстрые ссылки */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.location.href = '/dialogs'}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiExternalLink className="w-4 h-4 mr-2" />
            Все диалоги
          </button>
          
          <button
            onClick={() => window.location.href = '/balance'}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiExternalLink className="w-4 h-4 mr-2" />
            Пополнить баланс
          </button>
          
          <button
            onClick={() => window.location.href = '/profile'}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiSettings className="w-4 h-4 mr-2" />
            Настройки
          </button>
        </div>
      </div>

      {/* Модальное окно embed-кода */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {embedCode ? 'Код веб-виджета' : 'Выберите ассистента'}
                </h3>
                <button
                  onClick={closeEmbedModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!embedCode ? (
                // Выбор ассистента
                <div className="space-y-3">
                  <p className="text-gray-600 mb-4">
                    Выберите ассистента для получения кода веб-виджета:
                  </p>
                  {assistants.map((assistant) => (
                    <button
                      key={assistant.id}
                      onClick={() => fetchEmbedCode(assistant)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{assistant.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            AI модель: {assistant.ai_model || 'gpt-4o-mini'}
                          </p>
                        </div>
                        <FiExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                // Показ embed-кода
                <div>
                  {selectedAssistant && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-1">
                        Ассистент: {selectedAssistant.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Скопируйте код ниже и вставьте его на ваш сайт перед закрывающим тегом &lt;/body&gt;
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={embedCode}
                      readOnly
                      className="w-full h-32 p-4 text-sm font-mono bg-gray-100 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={copyEmbedCode}
                      className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        copySuccess
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <FiCopy className="w-4 h-4 mr-1 inline" />
                      {copySuccess ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Настройка виджета</h5>
                    <p className="text-sm text-blue-800 mb-3">
                      Вы можете настроить внешний вид виджета в настройках ассистента.
                    </p>
                    <button
                      onClick={() => {
                        closeEmbedModal();
                        window.location.href = `/ai-assistant?assistant_id=${selectedAssistant.id}`;
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiSettings className="w-4 h-4 mr-2" />
                      Настроить виджет
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={closeEmbedModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;