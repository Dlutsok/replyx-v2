import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useModalState } from '@/hooks';
import { useNotifications } from '../hooks/useNotifications';
import { AssistantsList, AssistantDetails, ModalManager } from '@/components/ai-assistant';
import { PageHeader, MetricCard, StandardCard } from '@/components/common';
import { DESIGN_TOKENS } from '@/constants';
import { sanitizeTechnicalError } from '@/utils/apiErrorHandler';
import styles from '../styles/pages/AISettings.module.css';
import dashStyles from '../styles/pages/Dashboard.module.css';
import { 
  FiCpu, FiStar, FiPlus, FiSettings
} from 'react-icons/fi';

export default function AIAssistant() {
  // Аутентификация и роутинг
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useNotifications();
  
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
    system_prompt: '',
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

  const loadBots = async () => {
    try {
      const response = await fetch('/api/bot-instances', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBots(Array.isArray(data) ? data : []);
      }
    } catch (error) {
    }
  };

  const loadAssistantSettings = async (assistantId) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}/settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAssistant(prev => prev ? { ...prev, ...data } : data);
      }
    } catch (e) {
    }
  };
  
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
      const cleanMessage = sanitizeTechnicalError(error.message || 'Ошибка загрузки ассистентов');
      showError(cleanMessage, 'ASSISTANTS_LOAD_ERROR');
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
    }
  };

  // Обработчики событий
  const handleSelectAssistant = (assistant) => {
    // Перенаправляем на новую страницу ассистента
    router.push(`/assistant/${assistant.id}`);
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
  
  // Обработчик завершения создания ассистента
  const handleAssistantCreated = async (wizardData) => {
    if (wizardData.assistantId) {
      // Закрываем все модальные окна
      closeAllModals();
      
      // Обновляем список ассистентов
      await loadAssistants();
      
      // Перенаправляем на страницу созданного ассистента
      router.push(`/assistant/${wizardData.assistantId}`);
    }
  };

  const handleEditAssistant = (assistant) => {
    setSelectedAssistant(assistant);
    setAssistantSettings({
      name: assistant.name,
      description: assistant.description || '',
      system_prompt: assistant.system_prompt || '',
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
        showSuccess('Ассистент удален', 'ASSISTANT_DELETE_SUCCESS');
        if (selectedAssistant?.id === assistantId) {
          handleBackToList();
        }
      } else if (response.status === 403) {
        showError('Удаление доступно только владельцу организации', 'ASSISTANT_DELETE_PERMISSION_ERROR');
      }
    } catch (error) {
      showError('Ошибка удаления ассистента', 'ASSISTANT_DELETE_ERROR');
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
        showSuccess(`Ассистент ${isActive ? 'активирован' : 'деактивирован'}`, isActive ? 'ASSISTANT_ACTIVATE_SUCCESS' : 'ASSISTANT_DEACTIVATE_SUCCESS');
      }
    } catch (error) {
      showError('Ошибка изменения статуса ассистента', 'ASSISTANT_STATUS_ERROR');
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
        showSuccess('Настройки сохранены', 'ASSISTANT_SETTINGS_SAVE_SUCCESS');
      }
    } catch (error) {
      showError('Ошибка сохранения настроек', 'ASSISTANT_SETTINGS_SAVE_ERROR');
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
      formData.append('assistant_id', selectedAssistant.id);

      const response = await fetch(`/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.status === 402) {
        showError('Недостаточно средств на балансе. Перейдите в раздел Баланс для пополнения.', 'INSUFFICIENT_BALANCE_ERROR');
      } else if (response.ok) {
        const newDocument = await response.json();
        setDocuments(prev => [...prev, newDocument]);
        showSuccess('Документ загружен', 'DOCUMENT_UPLOAD_SUCCESS');
      }
    } catch (error) {
      const cleanMessage = sanitizeTechnicalError(error.message || 'Ошибка загрузки документа');
      showError(cleanMessage, 'DOCUMENT_UPLOAD_ERROR');
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
        showSuccess('Документ удален', 'DOCUMENT_DELETE_SUCCESS');
      }
    } catch (error) {
      showError('Ошибка удаления документа', 'DOCUMENT_DELETE_ERROR');
    }
  };

  const handleRefreshData = () => {
    if (selectedAssistant) {
      loadDialogs(selectedAssistant.id);
      loadDocuments(selectedAssistant.id);
      loadAssistantSettings(selectedAssistant.id);
    }
    loadStats();
    loadBots();
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
        showSuccess('Бот создан', 'BOT_CREATE_SUCCESS');
      }
    } catch (error) {
      const cleanMessage = sanitizeTechnicalError(error.message || 'Ошибка создания бота');
      showError(cleanMessage, 'BOT_CREATE_ERROR');
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
        showSuccess('Бот обновлен', 'BOT_UPDATE_SUCCESS');
      }
    } catch (error) {
      showError('Ошибка обновления бота', 'BOT_UPDATE_ERROR');
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
        showSuccess('Бот удален', 'BOT_DELETE_SUCCESS');
      }
    } catch (error) {
      showError('Ошибка удаления бота', 'BOT_DELETE_ERROR');
    }
  };

  const handleBotFormChange = (field, value) => {
    setBotForm(prev => ({ ...prev, [field]: value }));
  };

  // Widget handlers
  const handleWidgetSettingsChange = (field, value) => {
    setWidgetSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveWidgetSettings = async (newSettings) => {
    if (!selectedAssistant) return;
    
    try {
      // Обновляем selectedAssistant с новыми настройками персонализации
      const updatedAssistant = {
        ...selectedAssistant,
        operator_name: newSettings.operatorName,
        business_name: newSettings.businessName,
        avatar_url: newSettings.avatarUrl,
        widget_theme: newSettings.theme,
        widget_settings: {
          allowedDomains: newSettings.allowedDomains || ''
        }
      };
      
      setSelectedAssistant(updatedAssistant);
      
      // Также обновляем в основном списке ассистентов
      setAssistants(prev => prev.map(a => 
        a.id === selectedAssistant.id ? updatedAssistant : a
      ));
      
      showSuccess('Настройки виджета сохранены', 'WIDGET_SETTINGS_SAVE_SUCCESS');
      closeModal('showWidgetSettings');
    } catch (error) {
      showError('Ошибка сохранения настроек', 'WIDGET_SETTINGS_SAVE_ERROR');
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    loadAssistants();
    loadBots();
  }, []);

  // Обработка URL параметров для автоматического выбора ассистента и таба
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const assistantIdParam = urlParams.get('assistant');
    const tabParam = urlParams.get('tab');
    
    if (assistantIdParam && assistants.length > 0) {
      const assistant = assistants.find(a => a.id.toString() === assistantIdParam);
      if (assistant) {
        // Вместо выбора ассистента на текущей странице, перенаправляем на новую страницу
        const targetUrl = `/assistant/${assistantIdParam}${tabParam ? `?tab=${tabParam}` : ''}`;
        router.push(targetUrl);
        return;
      }
    }
  }, [assistants, router]);

  // Welcome Header component - унифицированный под минималистичный стиль dashboard
  const WelcomeHeader = () => {
    return (
      <div className={dashStyles.welcomeSection}>
        <div className={dashStyles.welcomeContent}>
          <div className={dashStyles.avatarSection}>
            <div className={dashStyles.avatar}>
              <FiCpu size={24} />
            </div>
            <div className={dashStyles.userInfo}>
              <h1 className={dashStyles.welcomeTitle}>AI-Ассистенты</h1>
              <p className={dashStyles.welcomeSubtitle}>
                Управление и настройка ассистентов
              </p>
            </div>
          </div>

          <div className={dashStyles.badge}>
            <FiStar size={14} />
            <span>{assistants.length} ассистентов</span>
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
        backgroundColor: '#ffffff',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #f3f4f6',
          borderRadius: '0.75rem',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '2px solid #f3f4f6',
            borderTop: '2px solid #6b7280',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />

          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#0f172a',
            margin: '0 0 6px 0'
          }}>
            Загрузка ассистентов
          </h3>

          <p style={{
            fontSize: '13px',
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
    <div>
      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 animate-fade-in rounded-2xl min-h-[90vh] flex flex-col">
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
      </div>

      <ModalManager
        modals={modals}
        modalData={modalData}
        onCloseModal={closeModal}
        onDeleteAssistant={handleConfirmDeleteAssistant}
        onCreateAssistant={handleAssistantCreated}
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

    </div>
  );
}