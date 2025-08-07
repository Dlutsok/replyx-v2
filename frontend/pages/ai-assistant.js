import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useModalState } from '../hooks/useModalState';
import AssistantsList from '../components/ai-assistant/AssistantsList';
import AssistantDetails from '../components/ai-assistant/AssistantDetails';
import ModalManager from '../components/ai-assistant/ModalManager';
import { DESIGN_TOKENS } from '../constants/designSystem';
import styles from '../styles/pages/AISettings.module.css';
import dashStyles from '../styles/pages/Dashboard.module.css';
import { 
  FiUser, FiCpu, FiStar, FiEye, FiEyeOff
} from 'react-icons/fi';

export default function AIAssistant() {
  // Аутентификация
  const { user } = useAuth();
  
  // Модальные окна
  const { modals, modalData, openModal, closeModal, closeAllModals } = useModalState();
  
  // Основное состояние
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Создание ассистента
  const [newAssistantName, setNewAssistantName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Настройки ассистента
  const [assistantSettings, setAssistantSettings] = useState({
    name: '',
    description: '',
    system_message: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  
  // База знаний
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Диалоги ассистента
  const [dialogs, setDialogs] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  
  // Боты и интеграции
  const [bots, setBots] = useState([]);
  const [creatingBot, setCreatingBot] = useState(false);
  const [botForm, setBotForm] = useState({
    name: '',
    type: '',
    description: ''
  });
  
  // Настройки виджета
  const [widgetSettings, setWidgetSettings] = useState({
    theme: 'light',
    position: 'bottom-right',
    welcomeMessage: 'Здравствуйте! Чем могу помочь?',
    avatar: '',
    primaryColor: DESIGN_TOKENS.colors.primary,
    fontSize: 'medium',
    language: 'ru',
    showTyping: true,
    showTimestamp: false,
    allowFileUpload: false
  });
  
  // Статистика
  const [stats, setStats] = useState({
    totalDialogs: 0,
    activeDialogs: 0,
    totalMessages: 0,
    avgRating: 0,
    responseTime: '0ms',
    successRate: '0%'
  });
  
  const [globalStats, setGlobalStats] = useState({
    totalDialogs: 0,
    activeUsers: 0,
    totalMessages: 0,
    avgResponseTime: '0ms',
    totalAssistants: 0,
    activeAssistants: 0
  });
  
  const [assistantStats, setAssistantStats] = useState({});
  const [toasts, setToasts] = useState([]);

  // Toast функции
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // API функции
  const loadAssistants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assistants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssistants(data);
        await loadStats();
      }
    } catch (error) {
      console.error('Ошибка загрузки ассистентов:', error);
      showToast('Ошибка загрузки ассистентов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/assistants/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGlobalStats(data.global);
        setAssistantStats(data.byAssistant);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const loadDialogs = async (assistantId) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}/dialogs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDialogs(data.dialogs);
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Ошибка загрузки диалогов:', error);
    }
  };

  const loadDocuments = async (assistantId) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}/documents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    }
  };

  // Обработчики событий
  const handleSelectAssistant = (assistant) => {
    setSelectedAssistant(assistant);
    setAssistantSettings({
      name: assistant.name,
      description: assistant.description || '',
      system_message: assistant.system_message || '',
      is_active: assistant.is_active
    });
    loadDialogs(assistant.id);
    loadDocuments(assistant.id);
    setStats(assistantStats[assistant.id] || {});
  };

  const handleBackToList = () => {
    setSelectedAssistant(null);
    setActiveTab('overview');
  };

  const handleCreateAssistant = () => {
    openModal('showBotSetupWizard');
  };

  const handleQuickCreateAssistant = () => {
    openModal('showQuickWizard');
  };

  const handleEditAssistant = (assistant) => {
    setSelectedAssistant(assistant);
    setAssistantSettings({
      name: assistant.name,
      description: assistant.description || '',
      system_message: assistant.system_message || '',
      is_active: assistant.is_active
    });
  };

  const handleDeleteAssistant = (assistant) => {
    openModal('showDeleteAssistantModal', { assistantToDelete: assistant });
  };

  const handleConfirmDeleteAssistant = async (assistantId) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setAssistants(prev => prev.filter(a => a.id !== assistantId));
        showToast('Ассистент удален');
        if (selectedAssistant?.id === assistantId) {
          handleBackToList();
        }
      }
    } catch (error) {
      console.error('Ошибка удаления ассистента:', error);
      showToast('Ошибка удаления ассистента', 'error');
    }
  };

  const handleToggleAssistant = async (assistantId, isActive) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        setAssistants(prev => prev.map(a => 
          a.id === assistantId ? { ...a, is_active: isActive } : a
        ));
        showToast(`Ассистент ${isActive ? 'активирован' : 'деактивирован'}`);
      }
    } catch (error) {
      console.error('Ошибка изменения статуса ассистента:', error);
      showToast('Ошибка изменения статуса ассистента', 'error');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedAssistant) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/assistants/${selectedAssistant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assistantSettings)
      });

      if (response.ok) {
        const updatedAssistant = await response.json();
        setSelectedAssistant(updatedAssistant);
        setAssistants(prev => prev.map(a => 
          a.id === selectedAssistant.id ? updatedAssistant : a
        ));
        showToast('Настройки сохранены');
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      showToast('Ошибка сохранения настроек', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = (field, value) => {
    setAssistantSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedAssistant) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/assistants/${selectedAssistant.id}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.ok) {
        const newDocument = await response.json();
        setDocuments(prev => [...prev, newDocument]);
        showToast('Документ загружен');
      }
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      showToast('Ошибка загрузки документа', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
        showToast('Документ удален');
      }
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      showToast('Ошибка удаления документа', 'error');
    }
  };

  const handleRefreshData = () => {
    if (selectedAssistant) {
      loadDialogs(selectedAssistant.id);
    }
    loadStats();
  };

  // Bot handlers
  const handleCreateBot = async (botData) => {
    try {
      setCreatingBot(true);
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(botData)
      });

      if (response.ok) {
        const newBot = await response.json();
        setBots(prev => [...prev, newBot]);
        showToast('Бот создан');
      }
    } catch (error) {
      console.error('Ошибка создания бота:', error);
      showToast('Ошибка создания бота', 'error');
    } finally {
      setCreatingBot(false);
    }
  };

  const handleEditBot = async (botId, botData) => {
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(botData)
      });

      if (response.ok) {
        const updatedBot = await response.json();
        setBots(prev => prev.map(b => b.id === botId ? updatedBot : b));
        showToast('Бот обновлен');
      }
    } catch (error) {
      console.error('Ошибка обновления бота:', error);
      showToast('Ошибка обновления бота', 'error');
    }
  };

  const handleDeleteBot = async (botId) => {
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setBots(prev => prev.filter(b => b.id !== botId));
        showToast('Бот удален');
      }
    } catch (error) {
      console.error('Ошибка удаления бота:', error);
      showToast('Ошибка удаления бота', 'error');
    }
  };

  const handleBotFormChange = (field, value) => {
    setBotForm(prev => ({ ...prev, [field]: value }));
  };

  // Widget handlers
  const handleWidgetSettingsChange = (field, value) => {
    setWidgetSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveWidgetSettings = () => {
    showToast('Настройки виджета сохранены');
    closeModal('showWidgetSettings');
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    loadAssistants();
  }, []);

  // Welcome Header component
  const WelcomeHeader = () => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
    };

    const [hiddenWidgets, setHiddenWidgets] = useState(new Set());
    const toggleWidget = (widgetId) => {
      setHiddenWidgets(prev => {
        const newSet = new Set(prev);
        if (newSet.has(widgetId)) {
          newSet.delete(widgetId);
        } else {
          newSet.add(widgetId);
        }
        return newSet;
      });
    };

    const availableWidgets = [
      { id: 'stats', title: 'Статистика' },
      { id: 'assistants', title: 'Ассистенты' }
    ];

    return (
      <div className={dashStyles.welcomeSection}>
        <div className={dashStyles.welcomeContent}>
          <div className={dashStyles.avatarSection}>
            <div className={dashStyles.avatar}>
              <FiCpu size={28} />
            </div>
            <div className={dashStyles.userInfo}>
              <h1 className={dashStyles.welcomeTitle}>
                {getGreeting()}, {user?.first_name || user?.email?.split('@')[0]}!
              </h1>
              <p className={dashStyles.welcomeSubtitle}>
                Управление AI-ассистентами и интеграциями
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className={`${dashStyles.badge} cursor-help`}>
                <FiStar size={16} />
                <span>AI Эксперт</span>
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {assistants.length} активных ассистентов
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Переключатель виджетов для мобильных устройств */}
        <div className="mt-6 md:hidden">
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  hiddenWidgets.has(widget.id)
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {hiddenWidgets.has(widget.id) ? <FiEyeOff className="w-3 h-3 mr-1" /> : <FiEye className="w-3 h-3 mr-1" />}
                {widget.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#fafbfc',
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #f3f4f6',
          borderRadius: '0.75rem',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #f3f4f6',
            borderTop: '3px solid #4f46e5',
            borderRadius: '50%',
            margin: '0 auto 24px',
            animation: 'spin 1s linear infinite'
          }} />
          
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#0f172a',
            margin: '0 0 8px 0'
          }}>
            Загрузка ассистентов
          </h3>
          
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '0'
          }}>
            Подождите, идет загрузка данных...
          </p>
          
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedAssistant ? (
        <AssistantDetails
          assistant={selectedAssistant}
          onBack={handleBackToList}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          assistantSettings={assistantSettings}
          onSettingsChange={handleSettingsChange}
          onSaveSettings={handleSaveSettings}
          saving={saving}
          documents={documents}
          onDocumentUpload={handleDocumentUpload}
          onDocumentDelete={handleDocumentDelete}
          uploading={uploading}
          dialogs={dialogs}
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          channels={channels}
          stats={stats}
          globalStats={globalStats}
          onRefreshData={handleRefreshData}
        />
      ) : (
        <AssistantsList
          assistants={assistants}
          onSelectAssistant={handleSelectAssistant}
          onEditAssistant={handleEditAssistant}
          onDeleteAssistant={handleDeleteAssistant}
          onToggleAssistant={handleToggleAssistant}
          onCreateAssistant={handleCreateAssistant}
          onQuickCreateAssistant={handleQuickCreateAssistant}
          creating={creating}
          newAssistantName={newAssistantName}
          setNewAssistantName={setNewAssistantName}
          assistantStats={assistantStats}
          channels={channels}
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          totalDialogs={globalStats.totalDialogs}
        />
      )}

      <ModalManager
        modals={modals}
        modalData={modalData}
        onCloseModal={closeModal}
        onDeleteAssistant={handleConfirmDeleteAssistant}
        onCreateAssistant={handleCreateAssistant}
        onDeleteBot={handleDeleteBot}
        onCreateBot={handleCreateBot}
        onEditBot={handleEditBot}
        botForm={botForm}
        onBotFormChange={handleBotFormChange}
        creatingBot={creatingBot}
        widgetSettings={widgetSettings}
        onWidgetSettingsChange={handleWidgetSettingsChange}
        onSaveWidgetSettings={handleSaveWidgetSettings}
        selectedAssistant={selectedAssistant}
      />

      {/* Toast notifications */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #f3f4f6',
                borderRadius: '0.75rem',
                padding: '16px 20px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '300px',
                maxWidth: '400px',
                borderLeftWidth: '4px',
                borderLeftColor: toast.type === 'error' ? '#dc2626' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: toast.type === 'error' ? '#fef2f2' : toast.type === 'warning' ? '#fef3c7' : '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: toast.type === 'error' ? '#dc2626' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
                fontSize: '12px'
              }}>
                {toast.type === 'error' ? '✕' : toast.type === 'warning' ? '!' : '✓'}
              </div>
              
              <div style={{
                fontSize: '14px',
                color: '#0f172a',
                fontWeight: '500',
                flex: 1,
                lineHeight: '1.4'
              }}>
                {toast.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}