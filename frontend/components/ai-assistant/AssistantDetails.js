import { useState } from 'react';
import { motion } from 'framer-motion';
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
import dashStyles from '../../styles/pages/Dashboard.module.css';
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
  stats,
  globalStats,
  onRefreshData
}) {
  const tabConfig = [
    { id: 'overview', label: 'Обзор', icon: <FiEye size={16} /> },
    { id: 'settings', label: 'Настройки', icon: <FiSettings size={16} /> },
    { id: 'documents', label: 'Документы', icon: <FiFileText size={16} /> },
    { id: 'dialogs', label: 'Диалоги', icon: <FiMessageSquare size={16} /> }
  ];

  const renderOverview = () => (
    <div>
      {/* Stats Grid */}
      <div className={dashStyles.metricsGrid} style={{ marginBottom: '32px' }}>
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon} style={{ color: '#8b5cf6' }}>
              <FiMessageSquare />
            </div>
            <div>
              <p className={dashStyles.metricTitle}>ВСЕГО ДИАЛОГОВ</p>
              <p className={dashStyles.metricValue}>{stats?.totalDialogs || 0}</p>
            </div>
          </div>
        </div>
        
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon} style={{ color: '#3b82f6' }}>
              <FiUsers />
            </div>
            <div>
              <p className={dashStyles.metricTitle}>АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ</p>
              <p className={dashStyles.metricValue}>{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon} style={{ color: '#10b981' }}>
              <FiActivity />
            </div>
            <div>
              <p className={dashStyles.metricTitle}>ВРЕМЯ ОТКЛИКА</p>
              <p className={dashStyles.metricValue}>{stats?.responseTime || '0ms'}</p>
            </div>
          </div>
        </div>
        
        <div className={dashStyles.metricCard}>
          <div className={dashStyles.metricHeader}>
            <div className={dashStyles.metricIcon} style={{ color: '#f59e0b' }}>
              <FiStar />
            </div>
            <div>
              <p className={dashStyles.metricTitle}>СРЕДНЯЯ ОЦЕНКА</p>
              <p className={dashStyles.metricValue}>{stats?.avgRating || '0.0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Info */}
      <div 
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #f3f4f6',
          borderRadius: '0.75rem',
          padding: '32px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#e5e7eb';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
          e.target.style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = '#f3f4f6';
          e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#0f172a',
          marginBottom: '24px',
          margin: '0 0 24px 0'
        }}>
          Информация об ассистенте
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#64748b' 
            }}>
              Название:
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#0f172a' 
            }}>
              {assistant.name}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#64748b' 
            }}>
              Статус:
            </span>
            <span style={{
              backgroundColor: assistant.is_active ? '#dcfce7' : '#fef2f2',
              borderColor: assistant.is_active ? '#bbf7d0' : '#fecaca',
              color: assistant.is_active ? '#166534' : '#991b1b',
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '0.75rem',
              border: '1px solid'
            }}>
              {assistant.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#64748b' 
            }}>
              Создан:
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#0f172a' 
            }}>
              {new Date(assistant.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#64748b' 
            }}>
              Обновлен:
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#0f172a' 
            }}>
              {new Date(assistant.updated_at).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div 
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        borderRadius: '0.75rem',
        padding: '32px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = '#e5e7eb';
        e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
        e.target.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = '#f3f4f6';
        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#0f172a',
        margin: '0 0 32px 0'
      }}>
        Настройки ассистента
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Название ассистента
          </label>
          <input
            type="text"
            value={assistantSettings.name || ''}
            onChange={(e) => onSettingsChange('name', e.target.value)}
            placeholder="Введите название..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '0.75rem',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Описание
          </label>
          <textarea
            value={assistantSettings.description || ''}
            onChange={(e) => onSettingsChange('description', e.target.value)}
            placeholder="Описание ассистента..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '0.75rem',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Системное сообщение
          </label>
          <textarea
            value={assistantSettings.system_message || ''}
            onChange={(e) => onSettingsChange('system_message', e.target.value)}
            placeholder="Вы полезный AI-ассистент..."
            rows={6}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '0.75rem',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '0.75rem',
          border: '1px solid #f1f5f9'
        }}>
          <input
            type="checkbox"
            checked={assistantSettings.is_active || false}
            onChange={(e) => onSettingsChange('is_active', e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              accentColor: '#4f46e5',
              cursor: 'pointer'
            }}
          />
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            cursor: 'pointer'
          }}>
            Активировать ассистента
          </label>
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: saving ? '#9ca3af' : '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '0.75rem',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onClick={onSaveSettings}
            disabled={saving}
            onMouseEnter={(e) => {
              if (!saving) e.target.style.backgroundColor = '#4338ca';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.target.style.backgroundColor = '#4f46e5';
            }}
          >
            <FiSave size={16} />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </motion.button>
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div 
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        borderRadius: '0.75rem',
        padding: '32px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = '#e5e7eb';
        e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
        e.target.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = '#f3f4f6';
        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#0f172a',
          margin: '0'
        }}>
          Документы базы знаний
        </h3>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: uploading ? '#9ca3af' : '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '0.75rem',
            fontSize: '13px',
            fontWeight: '500',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onClick={() => document.getElementById('file-upload').click()}
          disabled={uploading}
          onMouseEnter={(e) => {
            if (!uploading) e.target.style.backgroundColor = '#4338ca';
          }}
          onMouseLeave={(e) => {
            if (!uploading) e.target.style.backgroundColor = '#4f46e5';
          }}
        >
          <FiUpload size={14} />
          {uploading ? 'Загрузка...' : 'Загрузить документ'}
        </motion.button>
        
        <input
          id="file-upload"
          type="file"
          style={{ display: 'none' }}
          onChange={onDocumentUpload}
          accept=".txt,.pdf,.doc,.docx"
        />
      </div>
      
      <div>
        {documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '2px dashed #e2e8f0'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '0.75rem',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#64748b'
            }}>
              <FiBook size={32} />
            </div>
            
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#0f172a',
              margin: '0 0 8px 0'
            }}>
              Нет загруженных документов
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0'
            }}>
              Загрузите документы для обучения ассистента
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '0.75rem',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '0.75rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5'
                  }}>
                    <FiFileText size={18} />
                  </div>
                  
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#0f172a',
                      marginBottom: '2px'
                    }}>
                      {doc.name}
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      Загружен: {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    color: '#dc2626',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => onDocumentDelete(doc.id)}
                  title="Удалить документ"
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <FiTrash2 size={16} />
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDialogs = () => (
    <div 
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        borderRadius: '0.75rem',
        padding: '32px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = '#e5e7eb';
        e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
        e.target.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = '#f3f4f6';
        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#0f172a',
          margin: '0'
        }}>
          История диалогов
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <select 
            value={selectedChannel || ''} 
            onChange={(e) => onChannelChange(e.target.value || null)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '0.75rem',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="">Все каналы</option>
            {channels.map(channel => (
              <option key={channel.type} value={channel.type}>
                {channel.name} ({channel.count})
              </option>
            ))}
          </select>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '8px 16px',
              borderRadius: '0.75rem',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onClick={onRefreshData}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f1f5f9';
              e.target.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <FiRefreshCw size={14} />
            Обновить
          </motion.button>
        </div>
      </div>
      
      <div>
        {dialogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '2px dashed #e2e8f0'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '0.75rem',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#64748b'
            }}>
              <FiMessageSquare size={32} />
            </div>
            
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#0f172a',
              margin: '0 0 8px 0'
            }}>
              Нет диалогов
            </h3>
            
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0'
            }}>
              Диалоги с пользователями будут отображаться здесь
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dialogs.map(dialog => (
              <div key={dialog.id} style={{
                padding: '20px 24px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '0.75rem',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5'
                    }}>
                      <FiUsers size={16} />
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#0f172a'
                      }}>
                        Пользователь #{dialog.user_id}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FiClock size={12} />
                      {new Date(dialog.created_at).toLocaleString('ru-RU')}
                    </span>
                    
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: dialog.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: dialog.status === 'completed' ? '#166534' : '#f59e0b',
                      padding: '4px 8px',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {dialog.status === 'completed' ? <FiCheckCircle size={10} /> : <FiActivity size={10} />}
                      {dialog.status === 'completed' ? 'Завершен' : 'Активен'}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '13px',
                  color: '#64748b',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <span>{dialog.message_count} сообщений</span>
                  
                  {dialog.rating && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#f59e0b'
                    }}>
                      <FiStar size={12} />
                      {dialog.rating}/5
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={dashStyles.dashboardContainer}>
      {/* Header */}
      <div 
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #f3f4f6',
          borderRadius: '0.75rem',
          padding: '24px 32px',
          marginBottom: '32px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#e5e7eb';
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
          e.target.style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = '#f3f4f6';
          e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '10px 16px',
              borderRadius: '0.75rem',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onClick={onBack}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f1f5f9';
              e.target.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <FiArrowLeft size={14} />
            Назад к списку
          </motion.button>
          
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 4px 0'
            }}>
              {assistant.name}
            </h1>
            <span style={{
              backgroundColor: assistant.is_active ? '#dcfce7' : '#fef2f2',
              borderColor: assistant.is_active ? '#bbf7d0' : '#fecaca',
              color: assistant.is_active ? '#166534' : '#991b1b',
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 12px',
              borderRadius: '0.75rem',
              border: '1px solid'
            }}>
              {assistant.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs - Exact Dashboard Style */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '32px'
      }}>
        {tabConfig.map(tab => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? '#0ea5e9' : 'transparent'}`,
              padding: '16px 24px',
              fontWeight: '500',
              color: activeTab === tab.id ? '#0ea5e9' : '#4b5563',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              outline: 'none'
            }}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#111827';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#4b5563';
              }
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              color: 'inherit'
            }}>
              {tab.icon}
            </span>
            <span style={{
              color: 'inherit',
              whiteSpace: 'nowrap'
            }}>
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'dialogs' && renderDialogs()}
      </div>
    </div>
  );
}