import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import { API_URL } from '@/config/api';
import { useNotifications } from '@/hooks/useNotifications';
import { sanitizeTechnicalError } from '@/utils/apiErrorHandler';
import { 
  FiFileText, FiTrash2, FiUpload, FiBook, FiEye, FiRefreshCw,
  FiHelpCircle, FiGlobe, FiDatabase, FiChevronDown, FiChevronRight, FiSettings,
  FiPlus, FiEdit3, FiX
} from 'react-icons/fi';

// Компонент спиннера с таймером для выжимки
function ExtractionSpinner() {
  const [timeLeft, setTimeLeft] = useState(15);
  const [showExtended, setShowExtended] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!showExtended) {
      setShowExtended(true);
    }
  }, [timeLeft, showExtended]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  
  // Если время истекло, показываем пульсирующий круг
  const strokeDashoffset = timeLeft > 0 
    ? circumference - (timeLeft / 15) * circumference 
    : 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative w-24 h-24">
        {/* Фоновый круг */}
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#8b5cf6"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={timeLeft > 0 
              ? "transition-all duration-1000 ease-in-out" 
              : "animate-pulse"
            }
          />
        </svg>
        
        {/* Центральный счётчик */}
        <div className="absolute inset-0 flex items-center justify-center">
          {timeLeft > 0 ? (
            <span className="text-xl font-bold text-[#6334E5]">{timeLeft}</span>
          ) : (
            <span className="text-lg font-bold text-[#6334E5]">∞</span>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-gray-900 font-medium">Создание выжимки...</p>
        {showExtended ? (
          <div className="space-y-1">
            <p className="text-sm text-amber-600 font-medium">Нам потребуется немножко больше времени</p>
            <p className="text-sm text-gray-500">Документ оказался сложнее обычного</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Анализируем документ</p>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeTab({ 
  documents, 
  loading, 
  uploading, 
  onDocumentUpload, 
  onDocumentDelete,
  onRefreshData,
  assistant 
}) {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [docPreview, setDocPreview] = useState({ isOpen: false, title: '', content: '', loading: false, isMarkdown: false, isExtracting: false });
  const [summaryStatuses, setSummaryStatuses] = useState({}); // {docId: {status: 'processing'|'completed', loading: boolean}}
  const [expandedCategories, setExpandedCategories] = useState({ documents: true }); // {categoryId: boolean} - документы открыты по умолчанию
  const [uploadModal, setUploadModal] = useState(false);

  // Q&A состояния
  const [qaKnowledge, setQaKnowledge] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaModal, setQaModal] = useState({ isOpen: false, mode: 'create', item: null });

  // Фильтруем документы по типу
  const regularDocs = Array.isArray(documents) ? documents.filter(doc => 
    !doc.filename.includes('информация с сайта') && 
    !doc.filename.startsWith('website_')
  ) : [];
  
  const websiteDocs = Array.isArray(documents) ? documents.filter(doc => 
    doc.filename.includes('информация с сайта') || 
    doc.filename.startsWith('website_')
  ) : [];

  // Категории знаний
  const knowledgeCategories = [
    {
      id: 'documents',
      title: 'Документы',
      description: 'Загруженные документы для обучения ассистента',
      icon: FiFileText,
      count: regularDocs.length,
      color: 'blue',
      documents: regularDocs
    },
    {
      id: 'qa',
      title: 'Q&A',
      description: 'Содержание вопросов и ответов',
      icon: FiHelpCircle,
      count: qaKnowledge.length,
      color: 'purple',
      documents: []
    }
  ];

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Функция для проверки статуса выжимки
  const checkSummaryStatus = async (docId) => {
    try {
      const resp = await fetch(`${API_URL}/api/documents/${docId}/summary-status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.status; // 'processing' или 'completed'
      }
    } catch (error) {
    }
    return 'completed'; // По умолчанию считаем завершенным, чтобы показать кнопку
  };

  // Проверяем статусы выжимки для всех документов при загрузке
  useEffect(() => {
    if (documents && documents.length > 0) {
      const checkAllStatuses = async () => {
        const newStatuses = {};
        for (const doc of documents) {
          const status = await checkSummaryStatus(doc.id);
          newStatuses[doc.id] = {
            status,
            loading: status === 'processing'
          };
        }
        setSummaryStatuses(newStatuses);
      };
      checkAllStatuses();
    }
  }, [documents]);

  // Периодическая проверка статусов для документов в процессе обработки
  useEffect(() => {
    const processingDocs = Object.entries(summaryStatuses).filter(
      ([_, status]) => status.status === 'processing'
    );

    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      const updatedStatuses = { ...summaryStatuses };
      let hasUpdates = false;

      for (const [docId] of processingDocs) {
        const status = await checkSummaryStatus(parseInt(docId));
        if (status === 'completed') {
          updatedStatuses[docId] = { status: 'completed', loading: false };
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setSummaryStatuses(updatedStatuses);
      }
    }, 3000); // Проверяем каждые 3 секунды

    return () => clearInterval(interval);
  }, [summaryStatuses]);

  // Загрузка Q&A данных
  const loadQAKnowledge = async () => {
    if (!assistant) return;
    
    try {
      setQaLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }

      const resp = await fetch(`${API_URL}/api/qa-knowledge?assistant_id=${assistant.id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setQaKnowledge(data);
      } else {
        const error = await resp.text();
        
        if (resp.status === 401) {
          // Можно добавить логику для перенаправления на логин
        }
      }
    } catch (error) {
    } finally {
      setQaLoading(false);
    }
  };

  // Загружаем Q&A при изменении ассистента
  useEffect(() => {
    loadQAKnowledge();
  }, [assistant]);

  // Функции для работы с Q&A
  const handleQACreate = () => {
    setQaModal({ isOpen: true, mode: 'create', item: null });
  };

  const handleQAEdit = (item) => {
    setQaModal({ isOpen: true, mode: 'edit', item });
  };

  const handleQADelete = async (itemId) => {
    if (!confirm('Удалить эту Q&A запись?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('Ошибка авторизации', { title: 'Ошибка' });
        return;
      }

      const resp = await fetch(`${API_URL}/api/qa-knowledge/${itemId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (resp.ok) {
        await loadQAKnowledge(); // Перезагружаем список
      } else {
        const error = await resp.text();
        showError(`Не удалось удалить Q&A запись: ${error}`, { title: 'Ошибка' });
      }
    } catch (error) {
      showError('Ошибка при удалении Q&A записи', { title: 'Ошибка' });
    }
  };

  const handleQASave = async (formData) => {
    try {
      const url = qaModal.mode === 'create' 
        ? '/api/qa-knowledge'
        : `/api/qa-knowledge/${qaModal.item.id}`;
        
      const method = qaModal.mode === 'create' ? 'POST' : 'PUT';
      
      const payload = {
        ...formData,
        assistant_id: assistant.id
      };

      const resp = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        setQaModal({ isOpen: false, mode: 'create', item: null });
        await loadQAKnowledge(); // Перезагружаем список
      } else {
        const error = await resp.json();
        showError(`Ошибка: ${error.detail || 'Не удалось сохранить Q&A запись'}`, { title: 'Ошибка' });
      }
    } catch (error) {
      showError('Ошибка при сохранении Q&A записи', { title: 'Ошибка' });
    }
  };

  // Функции для работы с документами
  const handleDocumentPreview = async (doc) => {
    try {
      const isMarkdown = doc.filename.endsWith('.md') || doc.filename.includes('информация с сайта');
      setDocPreview({ isOpen: true, title: doc.filename, content: '', loading: true, isMarkdown, isExtracting: false });
      
      const resp = await fetch(`${API_URL}/api/documents/${doc.id}/text`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setDocPreview({ isOpen: true, title: doc.filename, content: data.text || '', loading: false, isMarkdown, isExtracting: false });
      } else {
        setDocPreview({ isOpen: true, title: doc.filename, content: 'Не удалось получить текст документа', loading: false, isMarkdown, isExtracting: false });
      }
    } catch {
      setDocPreview({ isOpen: true, title: doc.filename, content: 'Ошибка загрузки текста документа', loading: false, isMarkdown: false, isExtracting: false });
    }
  };

  const handleDocumentSummary = async (doc) => {
    try {
      setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: '', loading: true, isMarkdown: true, isExtracting: true });
      
      const resp = await fetch(`${API_URL}/api/documents/${doc.id}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        const summaries = (data.summaries || [])
          .map(s => {
            // Используем централизованную функцию для очистки технических ошибок
            const cleanSummary = sanitizeTechnicalError(s.summary);
            return `# Часть ${s.chunk}${s.is_overall ? ' (итог)' : ''}\n\n${cleanSummary}`;
          })
          .join('\n\n');
        setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: summaries || 'Пусто', loading: false, isMarkdown: true, isExtracting: false });
      } else {
        setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: 'У нас возникли небольшие технические проблемы. Пожалуйста, попробуйте позже.', loading: false, isMarkdown: true, isExtracting: false });
      }
    } catch {
      setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: 'У нас возникли небольшие технические проблемы. Пожалуйста, попробуйте позже.', loading: false, isMarkdown: true, isExtracting: false });
    }
  };


  const MarkdownRenderer = ({ content }) => {
    const renderMarkdown = (text) => {
      // Сначала очищаем технические ошибки из контента
      const cleanContent = sanitizeTechnicalError(text);
      
      return cleanContent
        .replace(/^### (.*$)/gm, '<h3 style="color: #1e293b; margin: 24px 0 12px 0; font-size: 18px; font-weight: 600;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color: #1e293b; margin: 28px 0 16px 0; font-size: 22px; font-weight: 600;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="color: #1e293b; margin: 32px 0 20px 0; font-size: 26px; font-weight: 700;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #3b82f6; text-decoration: underline;">$1</a>')
        .replace(/^- (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/(<li[^>]*>.*<\/li>)(\s*<li[^>]*>.*<\/li>)*/gs, '<ul style="margin: 12px 0; padding-left: 20px;">$&</ul>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
        .replace(/^/, '<p style="margin: 12px 0; line-height: 1.6;">')
        .replace(/$/, '</p>');
    };

    return (
      <div
        className="font-sans leading-relaxed text-gray-700 max-w-full prose prose-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    );
  };

  // Функция для рендеринга модальных окон через портал
  const renderModals = () => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <>
        {/* Upload Modal */}
        {uploadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[102] p-4">
            <div className="bg-white rounded-xl max-w-md w-full mx-4">
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Загрузить документ</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
                  <FiUpload size={24} className="sm:w-[32px] sm:h-[32px] mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                    Выберите файл для загрузки или перетащите его сюда
                  </p>
                  <input
                    type="file"
                    id="document-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onDocumentUpload(e);
                        setUploadModal(false);
                      }
                    }}
                    accept=".txt,.pdf,.doc,.docx"
                  />
                  <button
                    onClick={() => document.getElementById('document-upload').click()}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-lg transition-colors text-sm sm:text-base"
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : 'Выбрать файл'}
                  </button>
                </div>
                <div className="mt-3 sm:mt-4 text-sm text-gray-500">
                  Поддерживаемые форматы: PDF, DOC, DOCX, TXT
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setUploadModal(false)}
                  className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Q&A Modal */}
        {qaModal.isOpen && (
          <QAModal
            isOpen={qaModal.isOpen}
            mode={qaModal.mode}
            item={qaModal.item}
            onClose={() => setQaModal({ isOpen: false, mode: 'create', item: null })}
            onSave={handleQASave}
          />
        )}

        {/* Document Preview Modal */}
        {docPreview.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[102] p-2 sm:p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden mx-2 sm:mx-0">
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">{docPreview.title}</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-light flex-shrink-0 w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center"
                  onClick={() => setDocPreview({ isOpen: false, title: '', content: '', loading: false, isMarkdown: false, isExtracting: false })}
                >
                  ×
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-auto max-h-[calc(85vh-120px)] sm:max-h-[60vh]">
                {docPreview.loading ? (
                  docPreview.isExtracting ? (
                    <ExtractionSpinner />
                  ) : (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <LoadingIndicator message="Загрузка..." size="medium" />
                    </div>
                  )
                ) : (
                  docPreview.isMarkdown ? (
                    <div className="prose prose-sm sm:prose-base max-w-none">
                      <MarkdownRenderer content={docPreview.content} />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">{docPreview.content || 'Пусто'}</pre>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </>,
      document.body
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingIndicator message="Загрузка знаний..." size="medium" />
          </div>
        ) : (
                    <div className="space-y-3 sm:space-y-4">
            {knowledgeCategories.map(category => {
              const Icon = category.icon;
              const isExpanded = expandedCategories[category.id];
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600',
                green: 'bg-green-50 text-green-600',
                purple: 'bg-[#6334E5]/10 text-[#6334E5]',
                orange: 'bg-orange-50 text-orange-600'
              };

              return (
                <div
                  key={category.id}
                  className="bg-white border border-gray-200 rounded-lg sm:rounded-xl"
                >
                  <div
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Иконка */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="sm:w-[18px] sm:h-[18px] text-[#6334E5]" />
                        </div>

                        {/* Контент */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{category.title}</h3>
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-sm bg-gray-100 text-gray-600 rounded-lg w-fit">
                              {category.count} {category.count === 1 ? 'элемент' : category.count < 5 ? 'элемента' : 'элементов'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      {/* Кнопки управления */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <button
                          className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (category.id === 'documents') {
                              setUploadModal(true);
                            } else if (category.id === 'qa') {
                              handleQACreate();
                            }
                          }}
                        >
                          {category.id === 'qa' ? <FiPlus size={12} className="sm:w-[14px] sm:h-[14px]" /> : <FiUpload size={12} className="sm:w-[14px] sm:h-[14px]" />}
                          <span className="hidden sm:inline">Добавить</span>
                          <span className="sm:hidden">+</span>
                        </button>

                        {/* Иконка раскрытия */}
                        <div className="w-7 h-7 sm:w-auto sm:h-auto">
                          {isExpanded ? (
                            <FiChevronDown size={18} className="sm:w-[20px] sm:h-[20px] text-gray-400" />
                          ) : (
                            <FiChevronRight size={18} className="sm:w-[20px] sm:h-[20px] text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                
                {/* Раскрывающийся контент */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="p-4 sm:p-6 bg-gray-50">
                      {category.id === 'qa' ? (
                        /* Q&A содержимое */
                        qaLoading ? (
                          <div className="text-center py-8">
                            <LoadingIndicator />
                          </div>
                        ) : qaKnowledge && qaKnowledge.length > 0 ? (
                          <div className="grid gap-3 sm:gap-4">
                            {qaKnowledge.map(qa => (
                              <div key={qa.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#6334E5]/10 border border-[#6334E5]/30 flex items-center justify-center flex-shrink-0">
                                      <FiHelpCircle size={14} className="sm:w-[16px] sm:h-[16px] text-[#6334E5]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                                        {qa.question}
                                      </h4>
                                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {qa.answer}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                                        {qa.category && (
                                          <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-sm bg-[#6334E5]/20 text-[#6334E5] rounded-full">
                                            {qa.category}
                                          </span>
                                        )}
                                        <span className="text-sm text-gray-400">
                                          {qa.importance}/10
                                        </span>
                                        {qa.usage_count > 0 && (
                                          <span className="text-sm text-gray-400 hidden sm:inline">
                                            {qa.usage_count} раз
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <button
                                      className="p-2 sm:p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                      onClick={() => handleQAEdit(qa)}
                                      title="Редактировать"
                                    >
                                      <FiEdit3 size={14} className="sm:w-[14px] sm:h-[14px]" />
                                    </button>
                                    <button
                                      className="p-2 sm:p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
                                      onClick={() => handleQADelete(qa.id)}
                                      title="Удалить"
                                    >
                                      <FiTrash2 size={14} className="sm:w-[14px] sm:h-[14px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FiHelpCircle size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">
                              Пока нет Q&A записей
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Добавьте вопросы и ответы для улучшения качества ответов ассистента
                            </p>
                          </div>
                        )
                      ) : (
                        /* Содержимое для документов и веб-страниц */
                        category.documents && category.documents.length > 0 ? (
                          <div className="grid gap-3 sm:gap-4">
                            {category.documents.map(doc => (
                              <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                      <FiFileText size={14} className="sm:w-[16px] sm:h-[16px] text-[#6334E5]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                                        {doc.filename}
                                      </h4>
                                      <div className="text-sm text-gray-500 mt-1">
                                        {doc.upload_date ?
                                          `${new Date(doc.upload_date).toLocaleDateString('ru-RU')}` :
                                          'Дата неизвестна'
                                        }
                                        {doc.size && ` • ${(doc.size/1024/1024).toFixed(1)} МБ`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <button
                                      className="px-2 py-1 sm:px-3 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
                                      onClick={() => handleDocumentPreview(doc)}
                                    >
                                      <span className="hidden sm:inline">Открыть</span>
                                      <span className="sm:hidden">👁️</span>
                                    </button>
                                    <button
                                      className="px-2 py-1 sm:px-3 text-sm bg-[#6334E5]/10 hover:bg-[#6334E5]/20 text-[#6334E5] rounded-lg border border-[#6334E5]/30 transition-colors"
                                      onClick={() => handleDocumentSummary(doc)}
                                    >
                                      <span className="hidden sm:inline">Выжимка</span>
                                      <span className="sm:hidden">📄</span>
                                    </button>
                                    <button
                                      className="p-1 sm:p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                                      onClick={() => onDocumentDelete(doc.id)}
                                      title="Удалить"
                                    >
                                      <FiTrash2 size={14} className="sm:w-[14px] sm:h-[14px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Icon size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">
                              В этой категории пока нет элементов
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Элементы будут отображаться здесь после добавления
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>

    {/* Рендеринг модальных окон через портал */}
    {renderModals()}
  </>);
}

// Tooltip Component for Q&A Modal
function InfoTooltip({ text, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex ml-1"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <FiHelpCircle 
        size={16} 
        className="text-gray-400 hover:text-[#6334E5] cursor-help transition-colors duration-150"
      />
      {isVisible && (
        <div className={`absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg max-w-xs whitespace-normal ${
          position === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' :
          position === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' :
          position === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' :
          'left-full ml-2 top-1/2 transform -translate-y-1/2'
        }`}>
          <div className="text-center leading-relaxed">{text}</div>
          <div className={`absolute w-0 h-0 ${
            position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900' :
            position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900' :
            position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900' :
            'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900'
          }`} />
        </div>
      )}
    </div>
  );
}

// Importance Slider Component with Visual Indicators
function ImportanceSlider({ value, onChange }) {
  const getImportanceColor = (level) => {
    if (level >= 9) return 'bg-red-500';
    if (level >= 7) return 'bg-orange-500';
    if (level >= 5) return 'bg-yellow-500';
    if (level >= 3) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getImportanceLabel = (level) => {
    if (level >= 9) return 'Критическая';
    if (level >= 7) return 'Высокая';
    if (level >= 5) return 'Средняя';
    if (level >= 3) return 'Низкая';
    return 'Минимальная';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {getImportanceLabel(value)}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getImportanceColor(value)}`}>
          {value}/10
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, ${getImportanceColor(value)} 0%, ${getImportanceColor(value)} ${(value-1)*11.11}%, #e5e7eb ${(value-1)*11.11}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

// Q&A Modal Component
function QAModal({ isOpen, mode, item, onClose, onSave }) {
  const [question, setQuestion] = useState(item?.question || '');
  const [answer, setAnswer] = useState(item?.answer || '');
  const [category, setCategory] = useState(item?.category || '');
  const [keywords, setKeywords] = useState(item?.keywords || '');
  const [importance, setImportance] = useState(item?.importance || 10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setQuestion(item.question || '');
      setAnswer(item.answer || '');
      setCategory(item.category || '');
      setKeywords(item.keywords || '');
      setImportance(item.importance || 10);
    } else {
      setQuestion('');
      setAnswer('');
      setCategory('');
      setKeywords('');
      setImportance(10);
    }
  }, [item]);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      showError('Пожалуйста, заполните обязательные поля: вопрос и ответ', { title: 'Ошибка валидации' });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || null,
        keywords: keywords.trim() || null,
        importance
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Используем портал для рендеринга модального окна
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[102] p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 mx-2 sm:mx-0">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#6334E5]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiHelpCircle size={16} className="text-[#6334E5] sm:w-[20px] sm:h-[20px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {mode === 'create' ? 'Добавить Q&A' : 'Редактировать Q&A'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                {mode === 'create' ? 'Создайте новую пару вопрос-ответ' : 'Измените существующую запись'}
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150 flex-shrink-0"
            onClick={onClose}
          >
            <FiX size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-180px)]">
          <div className="space-y-4 sm:space-y-6">
            {/* Вопрос */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                Вопрос
                <span className="text-red-500 ml-1">*</span>
                <InfoTooltip
                  text="Сформулируйте вопрос так, как его могут задать пользователи. Используйте естественную речь."
                  position="top"
                />
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Как мне оплатить услугу?"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent resize-none transition-all duration-150 text-sm sm:text-base"
                rows={2}
                required
              />
            </div>

            {/* Ответ */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                Ответ
                <span className="text-red-500 ml-1">*</span>
                <InfoTooltip
                  text="Дайте полный и понятный ответ. Можете использовать форматирование markdown."
                  position="top"
                />
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Вы можете оплатить услугу через..."
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent resize-none transition-all duration-150 text-sm sm:text-base"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Категория */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Категория
                  <InfoTooltip
                    text="Группируйте связанные вопросы по категориям для удобной навигации."
                    position="top"
                  />
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Оплата и тарифы"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 text-sm sm:text-base"
                />
              </div>

              {/* Важность */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Приоритет в поиске
                  <InfoTooltip
                    text="Высокий приоритет (8-10) - ИИ чаще будет использовать этот ответ. Низкий приоритет (1-3) - только при точном совпадении."
                    position="top"
                  />
                </label>
                <ImportanceSlider
                  value={importance}
                  onChange={setImportance}
                />
              </div>
            </div>

            {/* Ключевые слова */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                Ключевые слова
                <InfoTooltip
                  text="Добавьте синонимы и альтернативные формулировки через запятую. Это поможет ИИ лучше находить ваши ответы."
                  position="top"
                />
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="оплата, платеж, деньги, счет, карта"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all duration-150 text-sm sm:text-base"
              />
              <div className="text-xs text-gray-500 mt-2">
                Разделяйте ключевые слова запятыми. Например: оплата, платеж, банк
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:px-6 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg sm:rounded-xl transition-all duration-150 h-10 sm:h-11 flex items-center justify-center"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2.5 sm:px-6 text-sm font-medium bg-[#6334E5] hover:bg-[#5028c2] text-white rounded-lg sm:rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed h-10 sm:h-11 flex items-center justify-center"
            disabled={!question.trim() || !answer.trim() || saving}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Сохранение...
              </>
            ) : (
              mode === 'create' ? 'Добавить Q&A' : 'Сохранить изменения'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}