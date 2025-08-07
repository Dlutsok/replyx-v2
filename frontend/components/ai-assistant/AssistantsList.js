import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCpu, 
  FiActivity, 
  FiMessageSquare, 
  FiEdit, 
  FiTrash2, 
  FiUsers, 
  FiPlus,
  FiSettings,
  FiMoreVertical
} from 'react-icons/fi';
import dashStyles from '../../styles/pages/Dashboard.module.css';
import styles from '../../styles/pages/AISettings.module.css';

const DropdownMenu = ({ assistant, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#64748b',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Дополнительно"
      >
        <FiMoreVertical size={16} />
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              backgroundColor: '#ffffff',
              border: '1px solid #f3f4f6',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              minWidth: '140px',
              padding: '8px 0'
            }}
          >
            <button
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(assistant);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <FiEdit size={14} />
              Редактировать
            </button>
            <button
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(assistant);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <FiTrash2 size={14} />
              Удалить
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};



const AssistantCard = ({ assistant, onSelect, onEdit, onDelete }) => (
  <motion.div 
    whileHover={{ 
      scale: 1.02,
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)"
    }}
    transition={{ duration: 0.2 }}
    onClick={() => onSelect(assistant)}
    style={{ 
      cursor: 'pointer',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '0',
      border: '1px solid #f1f5f9',
      overflow: 'visible',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 1
    }}
  >
    {/* Header with gradient background */}
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      position: 'relative',
      borderRadius: '0.75rem 0.75rem 0 0'
    }}>
      {/* Chat interface mockup */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: '10px',
          color: '#64748b',
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          {assistant.name}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '10px',
            color: '#64748b',
            alignSelf: 'flex-start',
            maxWidth: '80%'
          }}>
            Привет! Как дела?
          </div>
          <div style={{
            backgroundColor: '#4f46e5',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '10px',
            alignSelf: 'flex-end',
            maxWidth: '80%'
          }}>
            Отлично! Чем могу помочь?
          </div>
        </div>
      </div>
      
    </div>
    
    {/* Content section */}
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#0f172a', 
          margin: '0 0 4px 0' 
        }}>
          {assistant.name}
        </h3>
        <p style={{
          fontSize: '12px',
          color: '#64748b',
          margin: '0',
          lineHeight: '1.4'
        }}>
          Создан {new Date(assistant.created_at).toLocaleDateString('ru-RU')}
        </p>
      </div>
      
      {/* Status and stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span className={`${dashStyles.badge}`} style={{
          backgroundColor: assistant.is_active ? '#dcfce7' : '#fef2f2',
          borderColor: assistant.is_active ? '#bbf7d0' : '#fecaca',
          color: assistant.is_active ? '#166534' : '#991b1b',
          fontSize: '10px',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          {assistant.is_active ? 'Активен' : 'Неактивен'}
        </span>
        
        <DropdownMenu 
          assistant={assistant}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  </motion.div>
);

const CreateAssistantCard = ({ onCreate, creating, onQuickCreate }) => (
  <motion.div 
    className={dashStyles.metricCard}
    whileHover={{ 
      scale: 1.02,
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)"
    }}
    transition={{ duration: 0.2 }}
    style={{
      borderStyle: 'dashed',
      borderColor: '#d1d5db',
      cursor: 'pointer',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '160px'
    }}
    onClick={onQuickCreate}
  >
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '0.75rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#10b981',
      marginBottom: '16px'
    }}>
      <FiPlus size={24} />
    </div>
    
    <h3 style={{
      fontSize: '16px',
      fontWeight: '600',
      color: '#0f172a',
      margin: '0 0 8px 0'
    }}>
      Создать ассистента
    </h3>
    
    <p style={{
      fontSize: '13px',
      color: '#64748b',
      margin: '0 0 20px 0',
      lineHeight: '1.5'
    }}>
      Добавьте нового AI-ассистента
    </p>
    
    <div style={{ 
      display: 'flex', 
      gap: '8px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }}>
      <button
        style={{
          background: '#000000',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '0.75rem',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'background-color 0.2s'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onQuickCreate();
        }}
        disabled={creating}
        onMouseEnter={(e) => {
          if (!creating) e.target.style.backgroundColor = '#1f2937';
        }}
        onMouseLeave={(e) => {
          if (!creating) e.target.style.backgroundColor = '#000000';
        }}
      >
        <FiPlus size={14} />
        {creating ? 'Создание...' : 'Новый агент'}
      </button>
      
    </div>
  </motion.div>
);


export default function AssistantsList({ 
  assistants, 
  onSelectAssistant, 
  onEditAssistant, 
  onDeleteAssistant,
  onCreateAssistant,
  onQuickCreateAssistant,
  creating,
  totalDialogs
}) {
  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px' 
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#0f172a',
          margin: '0'
        }}>
          Ваши ассистенты
        </h2>
        <span style={{
          fontSize: '14px',
          color: '#64748b',
          fontWeight: '500',
          backgroundColor: '#f8fafc',
          padding: '8px 16px',
          borderRadius: '0.75rem',
          border: '1px solid #f1f5f9'
        }}>
          {assistants.length} {assistants.length === 1 ? 'ассистент' : 'ассистентов'}
        </span>
      </div>
      
      {/* Assistants Grid */}
      <div className={dashStyles.metricsGrid}>
        <CreateAssistantCard 
          onCreate={onCreateAssistant}
          creating={creating}
          onQuickCreate={onQuickCreateAssistant}
        />
        
        <AnimatePresence>
          {assistants.map(assistant => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onSelect={onSelectAssistant}
              onEdit={onEditAssistant}
              onDelete={onDeleteAssistant}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}