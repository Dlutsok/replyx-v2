import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiTrash2, FiAlertTriangle, FiSend, FiMessageSquare, FiMonitor } from 'react-icons/fi';
import WidgetSettingsModal from '../ui/WidgetSettingsModal';
import QuickAssistantWizard from '../wizards/QuickAssistantWizard';
import styles from '../../styles/pages/AISettings.module.css';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff',
              border: '1px solid #f3f4f6',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 1001,
              minWidth: size === 'small' ? '400px' : size === 'large' ? '800px' : '600px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 32px',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0'
              }}>
                {title}
              </h3>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.color = '#475569';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#64748b';
                }}
              >
                <FiX size={18} />
              </motion.button>
            </div>

            <div style={{
              padding: '32px'
            }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, description, itemName }) => {
  const [confirmationText, setConfirmationText] = React.useState('');
  const [isConfirmationValid, setIsConfirmationValid] = React.useState(false);

  React.useEffect(() => {
    setIsConfirmationValid(confirmationText.trim().toLowerCase() === 'я понимаю');
  }, [confirmationText]);

  React.useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsConfirmationValid(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 1003 }} onClick={onClose}>
                  <div
        className="bg-white rounded-xl border border-gray-200/50 w-full max-w-xl shadow-xl"
        style={{ zIndex: 1004 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200/50">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <FiAlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Удалить {itemName}?
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Подтверждение действия
            </p>
          </div>
        </div>

        {/* Содержимое */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Вы уверены, что хотите удалить своего ассистента?<br />
            Это действие невозможно отменить.
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Подтверждение
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Я понимаю"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6334E5]/100 focus:border-transparent"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500">
              Пожалуйста, введите <span className="font-medium">Я понимаю</span>, чтобы подтвердить
            </p>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
          >
            Отмена
          </button>

          <button
            onClick={handleConfirm}
            disabled={!isConfirmationValid}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-150 flex items-center gap-2 ${
              isConfirmationValid
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-md'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <FiTrash2 size={14} />
            Удалить
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default function ModalManager({
  modals,
  modalData,
  onCloseModal,
  // Assistant actions
  onDeleteAssistant,
  onCreateAssistant,
  // Bot actions  
  onDeleteBot,
  onCreateBot,
  onEditBot,
  botForm,
  onBotFormChange,
  creatingBot,
  // Widget settings
  widgetSettings,
  onWidgetSettingsChange,
  onSaveWidgetSettings,
  selectedAssistant
}) {
  return (
    <>
      {/* Delete Assistant Modal */}
      <ConfirmDeleteModal
        isOpen={modals.showDeleteAssistantModal}
        onClose={() => onCloseModal('showDeleteAssistantModal')}
        onConfirm={() => onDeleteAssistant(modalData.assistantToDelete?.id)}
        title="Удаление ассистента"
        description="Вы действительно хотите удалить этого ассистента? Это действие необратимо."
        itemName={modalData.assistantToDelete?.name}
      />

      {/* Delete Bot Modal */}
      <ConfirmDeleteModal
        isOpen={modals.showDeleteBotModal}
        onClose={() => onCloseModal('showDeleteBotModal')}
        onConfirm={() => onDeleteBot(modalData.botToDelete?.id)}
        title="Удаление бота"
        description="Вы действительно хотите удалить этого бота? Это действие необратимо."
        itemName={modalData.botToDelete?.name}
      />



      {/* Quick Assistant Wizard */}
      <QuickAssistantWizard
        isOpen={modals.showQuickWizard}
        onClose={() => onCloseModal('showQuickWizard')}
        onComplete={onCreateAssistant}
      />

      {/* Widget Settings Modal */}
      <WidgetSettingsModal
        isOpen={modals.showWidgetSettings}
        onClose={() => onCloseModal('showWidgetSettings')}
        selectedAssistant={selectedAssistant}
        settings={widgetSettings}
        onChange={onWidgetSettingsChange}
        onSave={onSaveWidgetSettings}
        isNew={modalData.isNewAssistantWidget}
      />

      {/* Bot Modal */}
      <Modal
        isOpen={modals.showBotModal}
        onClose={() => onCloseModal('showBotModal')}
        title={modalData.editingBot ? 'Редактировать бота' : 'Создать бота'}
        size="large"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Название бота
            </label>
            <input
              type="text"
              value={botForm.name || ''}
              onChange={(e) => onBotFormChange('name', e.target.value)}
              placeholder="Введите название бота..."
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
              Тип бота
            </label>
            <select
              value={botForm.type || ''}
              onChange={(e) => onBotFormChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '0.75rem',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s',
                outline: 'none',
                cursor: 'pointer'
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
              <option value="">Выберите тип</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Веб-сайт</option>
              <option value="mobile">Мобильное приложение</option>
            </select>
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
              value={botForm.description || ''}
              onChange={(e) => onBotFormChange('description', e.target.value)}
              placeholder="Описание бота..."
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

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '16px'
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                padding: '10px 20px',
                borderRadius: '0.75rem',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => onCloseModal('showBotModal')}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f1f5f9';
                e.target.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Отмена
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: creatingBot ? '#9ca3af' : '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '0.75rem',
                fontSize: '14px',
                fontWeight: '500',
                cursor: creatingBot ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                if (modalData.editingBot) {
                  onEditBot(modalData.editingBot.id, botForm);
                } else {
                  onCreateBot(botForm);
                }
                onCloseModal('showBotModal');
              }}
              disabled={creatingBot}
              onMouseEnter={(e) => {
                if (!creatingBot) e.target.style.backgroundColor = '#4338ca';
              }}
              onMouseLeave={(e) => {
                if (!creatingBot) e.target.style.backgroundColor = '#4f46e5';
              }}
            >
              {creatingBot ? 'Сохранение...' : (modalData.editingBot ? 'Сохранить' : 'Создать')}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Integrations Modal */}
      <Modal
        isOpen={modals.showIntegrationsModal}
        onClose={() => onCloseModal('showIntegrationsModal')}
        title="Интеграции"
        size="large"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '0.75rem',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.75rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#4f46e5'
              }}>
                <FiSend size={20} />
              </div>
              
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 8px 0'
              }}>
                Telegram Bot
              </h4>
              
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                Интегрируйте вашего ассистента с Telegram
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '0.75rem',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  onCloseModal('showIntegrationsModal');
                  // Здесь может быть логика настройки Telegram бота
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#4338ca';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4f46e5';
                }}
              >
                Настроить
              </motion.button>
            </div>

            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '0.75rem',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.75rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#10b981'
              }}>
                <FiMessageSquare size={20} />
              </div>
              
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 8px 0'
              }}>
                WhatsApp Business
              </h4>
              
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                Подключите ассистента к WhatsApp Business API
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '0.75rem',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  onCloseModal('showIntegrationsModal');
                  // Здесь может быть логика настройки WhatsApp
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#4338ca';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4f46e5';
                }}
              >
                Настроить
              </motion.button>
            </div>

            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '0.75rem',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.75rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#f59e0b'
              }}>
                <FiMonitor size={20} />
              </div>
              
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 8px 0'
              }}>
                Веб-виджет
              </h4>
              
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                Добавьте чат-виджет на ваш веб-сайт
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '0.75rem',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  onCloseModal('showIntegrationsModal');
                  // Открываем настройки виджета
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#4338ca';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4f46e5';
                }}
              >
                Настроить
              </motion.button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}