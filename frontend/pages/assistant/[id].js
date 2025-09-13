import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import { API_URL } from '@/config/api';
import {
  KnowledgeTab,
  IntegrationsTab,
  AnalyticsTab,
  SettingsTab
} from '@/components/assistant';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiEdit3, FiMessageCircle, FiBarChart2,
  FiSettings, FiCpu, FiGlobe, FiUpload, FiPlay,
  FiPause, FiActivity, FiUsers, FiX, FiCheckCircle, FiAlertCircle, FiShield, FiZap, FiClock
} from 'react-icons/fi';
import { useNotifications } from '../../hooks/useNotifications';
import styles from '../../styles/pages/AssistantPage.module.css';

export default function AssistantPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const [assistant, setAssistant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Дополнительные данные
  const [documents, setDocuments] = useState([]);
  const [bots, setBots] = useState([]);
  const [stats, setStats] = useState(null);
  const [channels, setChannels] = useState([]);
  
  // Состояния загрузки
  const [loadingData, setLoadingData] = useState({ documents: false, bots: false, stats: false });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const { showSuccess, showError } = useNotifications();
  
  // Настройки ассистента для редактирования
  const [assistantSettings, setAssistantSettings] = useState({
    name: '',
    description: '',
    system_prompt: '',
    ai_model: 'gpt-4o-mini',
    is_active: true,
    website_integration_enabled: false,
    enable_logging: true
  });
  
  // Загрузка данных ассистента
  useEffect(() => {
    if (!id || !user) return;

    fetchAssistant();
  }, [id, user]);

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: FiActivity },
    { id: 'knowledge', label: 'Знания', icon: FiUpload },
    { id: 'integrations', label:'Интеграции', icon: FiGlobe },
    { id: 'analytics', label: 'Аналитика', icon: FiBarChart2 },
    { id: 'settings', label: 'Настройки', icon: FiSettings }
  ];

  // Обработка URL параметров для автоматического переключения табов
  useEffect(() => {
    if (!router.isReady) return;

    const { tab } = router.query;
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
      // Не очищаем URL параметр, чтобы вкладка сохранялась при обновлении
    }
  }, [router.isReady, router.query, id, tabs]);

  // Добавление класса к body для специфичных стилей страницы ассистента
  useEffect(() => {
    document.body.classList.add('assistant-page');

    return () => {
      document.body.classList.remove('assistant-page');
    };
  }, []);
  
  
  const fetchAssistant = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/assistants/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Ассистент не найден');
          return;
        }
        throw new Error('Ошибка загрузки ассистента');
      }
      
      const data = await response.json();
      setAssistant(data);
      
      // Инициализируем настройки
      setAssistantSettings({
        name: data.name || '',
        description: data.description || '',
        system_prompt: data.system_prompt || '',
        ai_model: data.ai_model || 'gpt-4o-mini',
        is_active: data.is_active || false,
        website_integration_enabled: data.website_integration_enabled || false,
        enable_logging: data.enable_logging !== false
      });
      
      // Загружаем дополнительные данные
      await Promise.all([
        fetchDocuments(),
        fetchBots(),
        fetchStats()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка документов
  const fetchDocuments = async () => {
    try {
      setLoadingData(prev => ({ ...prev, documents: true }));
      setErrors(prev => ({ ...prev, documents: null }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/documents?assistant_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(Array.isArray(data.documents) ? data.documents : data);
      } else {
        throw new Error('Ошибка загрузки документов');
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, documents: err.message }));
    } finally {
      setLoadingData(prev => ({ ...prev, documents: false }));
    }
  };
  

  
  // Загрузка ботов
  const fetchBots = async () => {
    try {
      setLoadingData(prev => ({ ...prev, bots: true }));
      setErrors(prev => ({ ...prev, bots: null }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/bot-instances`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBots(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Ошибка загрузки ботов');
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, bots: err.message }));
    } finally {
      setLoadingData(prev => ({ ...prev, bots: false }));
    }
  };
  
  // Загрузка статистики
  const fetchStats = async () => {
    try {
      setLoadingData(prev => ({ ...prev, stats: true }));
      setErrors(prev => ({ ...prev, stats: null }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/assistants/${id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Статистика может быть недоступна - это не критичная ошибка
        setStats(null);
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, stats: err.message }));
    } finally {
      setLoadingData(prev => ({ ...prev, stats: false }));
    }
  };
  
  // Обновление всех данных (используется в кнопках обновления в разных вкладках)
  const refreshData = async () => {
    await Promise.all([
      fetchDocuments(),
      fetchBots(),
      fetchStats()
    ]);
  };
  
  // Обработчики для AssistantDetails
  const handleSettingsChange = (field, value) => {
    setAssistantSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/assistants/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantSettings)
      });
      
      if (response.ok) {
        const updatedAssistant = await response.json();
        setAssistant(updatedAssistant);
        // Обновляем настройки из ответа
        setAssistantSettings({
          name: updatedAssistant.name || '',
          description: updatedAssistant.description || '',
          system_prompt: updatedAssistant.system_prompt || '',
          ai_model: updatedAssistant.ai_model || 'gpt-4o-mini',
          is_active: updatedAssistant.is_active || false,
          website_integration_enabled: updatedAssistant.website_integration_enabled || false,
          enable_logging: updatedAssistant.enable_logging !== false
        });
        showSuccess('Настройки успешно сохранены');
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (err) {
      showError('Ошибка сохранения настроек: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assistant_id', id);
      
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        await fetchDocuments(); // Обновляем список
        showSuccess('Документ успешно загружен');
        // Очищаем input
        event.target.value = '';
      } else {
        // Пытаемся получить подробную информацию об ошибке
        let errorMessage = 'Ошибка загрузки документа';
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (jsonError) {
          // Если не удалось получить JSON, используем статус код
          errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      showError('Ошибка загрузки документа: ' + err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDocumentDelete = async (docId) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchDocuments(); // Обновляем список
        showSuccess('Документ успешно удален');
      } else {
        throw new Error('Ошибка удаления');
      }
    } catch (err) {
      showError('Ошибка удаления документа: ' + err.message);
    }
  };
  
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator message="Авторизация..." size="large" />
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator message="Загрузка ассистента..." size="large" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/ai-assistant">
            <button className="px-4 py-2 bg-[#6334E5] text-white rounded-lg hover:bg-[#5028c2]">
              Назад к ассистентам
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!assistant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Ассистент не найден</h1>
          <Link href="/ai-assistant">
            <button className="px-4 py-2 bg-[#6334E5] text-white rounded-lg hover:bg-[#5028c2]">
              Назад к ассистентам
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>{assistant.name} - ReplyX</title>
        <meta name="description" content={`Управление AI-ассистентом ${assistant.name}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>


      {/* Main Container - Two Column Layout */}
      <div className={styles.assistantLayoutContainer}>
        {/* Left Sidebar - Navigation */}
        <div className={styles.assistantSidebar}>
          {/* Navigation Menu */}
          <nav className={styles.assistantSidebarNav}>
            <ul className={styles.assistantSidebarNavList}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id} className={styles.assistantNavItem}>
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        // Обновляем URL с параметром активной вкладки
                        router.push(`/assistant/${id}?tab=${tab.id}`, undefined, { shallow: true });
                      }}
                      className={`${styles.assistantNavButton} ${
                        isActive ? styles.assistantNavButtonActive : styles.assistantNavButtonInactive
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        
        {/* Right Content Area - White with rounded corners */}
        <div className={styles.assistantContentArea}>
          {/* Page Header */}
          <div className={styles.assistantContentHeader}>
            <div className="flex items-center justify-between">
              <div>
                <Link href="/ai-assistant">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-150 mb-3 text-sm">
                    <FiArrowLeft size={16} />
                    Назад к ассистентам
                  </button>
                </Link>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#6334E5]/10 border border-solid border-[#6334E5]/30/60 flex items-center justify-center">
                    <FiCpu size={16} className="text-[#6334E5]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {assistant.name}
                    </h1>
                    <p className="text-sm text-gray-600">
                      {assistant.is_active ? 'Активен' : 'Неактивен'} • Создан {new Date(assistant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    router.push(`/assistant/${id}?tab=settings`, undefined, { shallow: true });
                  }}
                  className="px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium text-gray-600 bg-white border border-solid border-gray-200/60 rounded-[16px] hover:bg-gray-50 hover:border-gray-200/70 transition-all duration-150 flex items-center gap-1 sm:gap-2"
                >
                  <FiEdit3 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Редактировать</span>
                  <span className="sm:hidden">Править</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content Area - White Background */}
          <div className={styles.assistantContentMain}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  assistant={assistant}
                  stats={stats}
                  documents={Array.isArray(documents) ? documents : []}
                  bots={Array.isArray(bots) ? bots : []}
                  channels={Array.isArray(channels) ? channels : []}
                />
              )}
              

              
              {activeTab === 'knowledge' && (
                <KnowledgeTab 
                  documents={Array.isArray(documents) ? documents : []}
                  loading={loadingData.documents}
                  uploading={uploading}
                  error={errors.documents}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentDelete={handleDocumentDelete}
                  onRefreshData={fetchDocuments}
                  assistant={assistant}
                />
              )}
              
              {activeTab === 'integrations' && (
                <IntegrationsTab 
                  channels={Array.isArray(channels) ? channels : []}
                  bots={Array.isArray(bots) ? bots : []}
                  assistant={assistant}
                  loading={loadingData.bots}
                  error={errors.bots}
                  onRefreshData={fetchBots}
                />
              )}
              
              {activeTab === 'analytics' && (
                <AnalyticsTab 
                  stats={stats}
                  loading={loadingData.stats}
                  error={errors.stats}
                  onRefreshData={fetchStats}
                />
              )}
              
              {activeTab === 'settings' && (
                <SettingsTab 
                  assistant={assistant}
                  assistantSettings={assistantSettings}
                  onSettingsChange={handleSettingsChange}
                  onSaveSettings={handleSaveSettings}
                  saving={saving}
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

// Компонент обзора
const OverviewTab = ({ assistant, stats, documents, bots, channels }) => {
  // Форматирование чисел
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'к';
    }
    return num.toString();
  };

  // Расчет интеграций
  const integrationsCount = (channels?.length || 0) + (bots?.filter(b => b.assistant_id === assistant.id).length || 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section - Dashboard Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-6">
          {/* Левая часть - приветствие и информация */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-[#6334E5]/10 to-[#6334E5]/20 rounded-xl border border-[#6334E5]/30/60 flex items-center justify-center flex-shrink-0">
                <FiCpu size={18} className="text-[#6334E5] sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 mb-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words leading-tight">
                    Обзор ассистента {assistant.name}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {assistant.description || 'Управляйте вашим AI-ассистентом и отслеживайте его работу'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Метрики - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300 hover:shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
              <FiMessageCircle size={18} className="text-blue-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Диалогов</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(stats?.totalConversations || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300 hover:shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center">
              <FiUsers size={18} className="text-green-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Пользователей</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(stats?.activeUsers || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300 hover:shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-[#6334E5]/10 to-[#6334E5]/20 rounded-xl flex items-center justify-center">
              <FiUpload size={18} className="text-[#6334E5] sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Документов</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(documents?.length || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-150 hover:border-gray-300 hover:shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl flex items-center justify-center">
              <FiGlobe size={18} className="text-yellow-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Интеграций</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(integrationsCount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Информация об ассистенте - Professional Clean Design */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/30 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-[#6334E5]/10 to-[#6334E5]/20 rounded-xl flex items-center justify-center">
                <FiSettings size={18} className="text-[#6334E5]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Информация об ассистенте</h3>
                <p className="text-sm text-gray-500">Ключевые характеристики и статус</p>
              </div>
            </div>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              assistant.is_active
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                assistant.is_active ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              {assistant.is_active ? 'Активен' : 'Неактивен'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Основная информация */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div>
                <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">{assistant.name}</h4>
                <p className="text-gray-600 leading-relaxed text-xs sm:text-sm">
                  {assistant.description || 'AI-ассистент для автоматизации коммуникаций и обработки запросов'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Модель ИИ</label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#6334E5]/10 text-[#5028c2] border border-[#6334E5]/30">
                      <FiCpu size={10} className="mr-1" />
                      OpenAI
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Версия</label>
                  <span className="text-sm font-semibold text-gray-900">4.0</span>
                </div>
              </div>
            </div>

            {/* Техническая информация */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Технические детали</h5>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600">Создан</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      {new Date(assistant.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600">Обновлен</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      {new Date(assistant.updated_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs sm:text-sm text-gray-600">Статус</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      assistant.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        assistant.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      {assistant.is_active ? 'Активен' : 'Остановлен'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiShield size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Все данные защищены шифрованием</span>
            </div>
            <span className="text-xs text-gray-400">ID: {String(assistant.id || '').slice(-8)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};