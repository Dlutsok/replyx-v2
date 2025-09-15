import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { sanitizeTechnicalError } from '../../utils/apiErrorHandler';
import { 
  FiArrowLeft,
  FiSettings,
  FiFileText,
  FiUpload,
  FiTrash2,
  FiSave,
  FiRefreshCw,
  FiMessageSquare,
  FiUsers,
  FiActivity,
  FiStar,
  FiClock,
  FiCheckCircle,
  FiEye,
  FiEdit,
  FiBook,
  FiZap
} from 'react-icons/fi';
import styles from '../../styles/pages/AISettings.module.css';

export default function AssistantDetails({
  assistant,
  onBack,
  activeTab,
  onTabChange,
  assistantSettings,
  onSettingsChange,
  onSaveSettings,
  saving,
  documents,
  onDocumentUpload,
  onDocumentDelete,
  uploading,
  dialogs,
  selectedChannel,
  onChannelChange,
  channels,
  bots,
  stats,
  globalStats,
  onRefreshData
}) {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  // Local dirty state for settings
  const [dirty, setDirty] = useState(false);
  const [docPreview, setDocPreview] = useState({ isOpen: false, title: '', content: '', loading: false, isMarkdown: false });

  // Простой Markdown рендерер
  const MarkdownRenderer = ({ content }) => {
    const renderMarkdown = (text) => {
      // Сначала очищаем технические ошибки из контента
      const cleanContent = sanitizeTechnicalError(text);
      
      return cleanContent
        // Заголовки
        .replace(/^### (.*$)/gm, '<h3 style="color: #1e293b; margin: 24px 0 12px 0; font-size: 18px; font-weight: 600;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color: #1e293b; margin: 28px 0 16px 0; font-size: 22px; font-weight: 600;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="color: #1e293b; margin: 32px 0 20px 0; font-size: 26px; font-weight: 700;">$1</h1>')
        // Жирный текст
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
        // Курсив
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Ссылки
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #3b82f6; text-decoration: underline;">$1</a>')
        // Списки
        .replace(/^- (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        // Обернуть группы li в ul
        .replace(/(<li[^>]*>.*<\/li>)(\s*<li[^>]*>.*<\/li>)*/gs, '<ul style="margin: 12px 0; padding-left: 20px;">$&</ul>')
        // Переносы строк в абзацы
        .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">')
        // Обернуть весь контент в начальный параграф
        .replace(/^/, '<p style="margin: 12px 0; line-height: 1.6;">')
        .replace(/$/, '</p>');
    };

    return (
      <div
        className="font-sans leading-relaxed text-gray-700 max-w-full"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      ></div>
    );
  };

  const tabConfig = [
    { id: 'overview', label: 'Обзор', icon: <FiEye size={16} /> },
    { id: 'settings', label: 'Настройки', icon: <FiSettings size={16} /> },
    { id: 'documents', label: 'Документы', icon: <FiFileText size={16} /> },
    { id: 'integrations', label: 'Интеграции', icon: <FiZap size={16} /> }
  ];

  const renderOverview = () => (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
              <FiMessageSquare size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                ВСЕГО ДИАЛОГОВ
              </p>
              <div className="text-xl font-semibold text-gray-900">
                {stats?.totalDialogs || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
              <FiUsers size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ
              </p>
              <div className="text-xl font-semibold text-gray-900">
                {stats?.activeUsers || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
              <FiActivity size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                ВРЕМЯ ОТКЛИКА
              </p>
              <div className="text-xl font-semibold text-gray-900">
                {stats?.responseTime || '0ms'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
              <FiStar size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wide">
                СРЕДНЯЯ ОЦЕНКА
              </p>
              <div className="text-xl font-semibold text-gray-900">
                {stats?.avgRating || '0.0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Info */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация об ассистенте</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-600">Название</span>
            <span className="text-sm font-semibold text-gray-900">{assistant.name}</span>
          </div>
          <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-600">Статус</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-xl border ${
              assistant.is_active
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {assistant.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-600">Создан</span>
            <span className="text-sm font-semibold text-gray-900">{new Date(assistant.created_at).toLocaleString('ru-RU')}</span>
          </div>
          <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-600">Обновлен</span>
            <span className="text-sm font-semibold text-gray-900">{new Date(assistant.updated_at).toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
        <div className={styles.formRow}>
          <label>Название ассистента</label>
          <input
            type="text"
            value={assistantSettings.name || ''}
            onChange={(e) => { onSettingsChange('name', e.target.value); setDirty(true); }}
            placeholder="Введите название..."
          />
        </div>
        <div className={styles.formRow}>
          <label>Описание</label>
          <textarea
            value={assistantSettings.description || ''}
            onChange={(e) => { onSettingsChange('description', e.target.value); setDirty(true); }}
            placeholder="Описание ассистента..."
            rows={4}
          />
        </div>
        <div className={styles.formRow}>
          <label>Инструкция ассистенту (системное сообщение)</label>
          <textarea
            value={assistantSettings.system_prompt || ''}
            onChange={(e) => { onSettingsChange('system_prompt', e.target.value); setDirty(true); }}
            placeholder="Вы полезный AI-ассистент..."
            rows={6}
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={assistantSettings.is_active || false}
              onChange={(e) => { onSettingsChange('is_active', e.target.checked); setDirty(true); }}
              className="w-4 h-4 text-[#6334E5] bg-gray-100 border-gray-300 rounded focus:ring-[#6334E5] focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">Активировать ассистента</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: dirty && !saving ? 1.02 : 1 }}
            whileTap={{ scale: dirty && !saving ? 0.98 : 1 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              saving || !dirty
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#6334E5] text-white hover:bg-[#5028c2]'
            }`}
            onClick={() => { if (dirty && !saving) { onSaveSettings(); setDirty(false); } }}
            disabled={saving || !dirty}
          >
            <FiSave size={16} />
            {saving ? 'Сохранение...' : (dirty ? 'Сохранить настройки' : 'Нет изменений')}
          </motion.button>
          {dirty && <span className="text-xs text-gray-600">Есть несохранённые изменения</span>}
        </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.button
          whileHover={{ scale: uploading ? 1 : 1.02 }}
          whileTap={{ scale: uploading ? 1 : 0.98 }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#6334E5] text-white hover:bg-[#5028c2]'
          }`}
          onClick={() => {
            if (!assistant?.is_active) {
              showError('Ассистент неактивен. Активируйте его, чтобы загружать документы.', { title: 'Ошибка' });
              return;
            }
            document.getElementById('file-upload').click();
          }}
          disabled={uploading}
        >
          <FiUpload size={14} />
          {uploading ? 'Загрузка...' : 'Загрузить документ'}
        </motion.button>

        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={onDocumentUpload}
          accept=".txt,.pdf,.doc,.docx"
        />
      </div>


      <div className="mt-4">
        {documents.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-600">
              <FiBook size={32} />
            </div>

            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Нет загруженных документов
            </h3>

            <p className="text-sm text-gray-600">
              Загрузите документы или укажите сайт для индексации, чтобы пополнить базу знаний
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                    <FiFileText size={18} />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 m-0">{doc.filename}</h4>

                    <div className="text-xs text-gray-600 mt-1">
                      Загружен: {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('ru-RU') : '-'}
                      {doc.size ? ` • ${(doc.size/1024/1024).toFixed(2)} МБ` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-center mt-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-all"
                    onClick={async () => {
                      try {
                        // Определяем, является ли файл markdown (по расширению или содержимому "информация с сайта")
                        const isMarkdown = doc.filename.endsWith('.md') || doc.filename.includes('информация с сайта');

                        setDocPreview({ isOpen: true, title: doc.filename, content: '', loading: true, isMarkdown });
                        const resp = await fetch(`/api/documents/${doc.id}/text`, {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (resp.ok) {
                          const data = await resp.json();
                          setDocPreview({ isOpen: true, title: doc.filename, content: data.text || '', loading: false, isMarkdown });
                        } else {
                          setDocPreview({ isOpen: true, title: doc.filename, content: 'Не удалось получить текст документа', loading: false, isMarkdown });
                        }
                      } catch {
                        setDocPreview({ isOpen: true, title: doc.filename, content: 'Ошибка загрузки текста документа', loading: false, isMarkdown: false });
                      }
                    }}
                    title="Открыть текст"
                  >
                    Открыть
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-all"
                    onClick={async () => {
                      try {
                        setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: '', loading: true, isMarkdown: true });
                        const resp = await fetch(`/api/documents/${doc.id}/summary`, {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (resp.ok) {
                          const data = await resp.json();
                          const summaries = (data.summaries || []).map(s => `# Часть ${s.chunk}${s.is_overall ? ' (итог)' : ''}\n\n${s.summary}`).join('\n\n');
                          setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: summaries || 'Пусто', loading: false, isMarkdown: true });
                        } else {
                          setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: 'Не удалось выполнить анализ документа', loading: false, isMarkdown: true });
                        }
                      } catch {
                        setDocPreview({ isOpen: true, title: `Выжимка: ${doc.filename}`, content: 'Ошибка анализа документа', loading: false, isMarkdown: true });
                      }
                    }}
                    title="Сделать выжимку"
                  >
                    Выжимка
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    onClick={() => onDocumentDelete(doc.id)}
                    title="Удалить документ"
                  >
                    <FiTrash2 size={16} />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderIntegrations = () => {
    const activeChannels = Array.isArray(channels) ? channels.filter(ch => (ch.count ?? 0) > 0 || ch.active) : [];
    const assistantBots = Array.isArray(bots) ? bots.filter(b => b.assistant_id === assistant.id && b.is_active) : [];
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all"
            onClick={onRefreshData}
          >
            <FiRefreshCw size={14} /> Обновить
          </motion.button>
        </div>
        {activeChannels.length === 0 && assistantBots.length === 0 && !siteEnabled ? (
          <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-600">
              <FiZap size={24} />
            </div>
            <div className="text-base font-semibold text-gray-900 mb-1.5">Нет активных интеграций</div>
            <div className="text-sm text-gray-600">Подключите Telegram/VK/Виджет, чтобы начать</div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Активные каналы (агрегировано по источникам диалогов) */}
            {activeChannels.map(ch => (
              <div key={`channel-${ch.type}`} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{ch.name || ch.type}</h3>
                    <div className="text-sm text-gray-600">{ch.type}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Активна
                  </span>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  {typeof ch.count === 'number' && <span>Диалогов: {ch.count}</span>}
                  {ch.username && <span>Username: {ch.username}</span>}
                  {ch.channel_id && <span>ID: {ch.channel_id}</span>}
                </div>
              </div>
            ))}

            {/* Активные боты, привязанные к ассистенту */}
            {assistantBots.map(bot => (
              <div key={`bot-${bot.id}`} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{bot.platform === 'telegram' ? 'Telegram Bot' : bot.platform}</h3>
                    <div className="text-sm text-gray-600">assistant: {bot.assistant_name || assistant.name}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Активен
                  </span>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <span>Платформа: {bot.platform}</span>
                  {bot.created_at && <span>Создан: {new Date(bot.created_at).toLocaleDateString('ru-RU')}</span>}
                </div>
              </div>
            ))}

            {/* Интеграция сайта (виджет) */}
            {siteEnabled && (
              <div key={`site-${assistant.id}`} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Веб‑виджет</h3>
                    <div className="text-sm text-gray-600">site</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Активен
                  </span>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <span>Статус: включен</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={onBack}>
              <FiArrowLeft size={14} />
              Назад
            </button>
            <div className={styles.titleIcon}><FiZap size={16} /></div>
            <div className={styles.headerInfo}>
              <h1 className={styles.title}>{assistant.name}</h1>
              <span className={`${styles.assistantStatus} ${assistant.is_active ? styles.active : styles.inactive}`}>
                {assistant.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.refreshButton} onClick={onRefreshData}>
              <FiRefreshCw size={14} />
              <span>Обновить данные</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - sticky pills */}
      <div className="sticky top-0 z-20 bg-white mb-4 border-b border-gray-200">
        <div className="flex gap-2 p-1">
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#6334E5] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'integrations' && renderIntegrations()}
      </div>

      {docPreview.isOpen ? createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[102]" onClick={() => setDocPreview({ isOpen: false, title: '', content: '', loading: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 m-0">{docPreview.title}</h3>
              <button
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setDocPreview({ isOpen: false, title: '', content: '', loading: false })}
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              {docPreview.loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#6334E5] rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-600">Загрузка…</p>
                </div>
              ) : (
                docPreview.isMarkdown ? (
                  <MarkdownRenderer content={docPreview.content} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{docPreview.content || 'Пусто'}</pre>
                )
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

