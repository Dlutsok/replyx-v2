import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FiX, FiRefreshCw, FiMessageSquare, FiCheckCircle, FiUserCheck, FiMessageCircle, FiSmartphone, FiHeadphones, FiUser } from 'react-icons/fi';
import styles from '../../styles/pages/Dialogs.module.css';
import { STATUS_ALL, STATUS_ACTIVE, STATUS_TAKEN_OVER, STATUS_HANDOFF_REQUESTED, STATUS_HANDOFF_ACTIVE } from '../../constants/dialogStatus';

const AssistantIcon = ({ botType }) => {
  switch(botType) {
    case 'telegram': return <FiMessageCircle className={styles.botIcon} />;
    case 'website': return <FiSmartphone className={styles.botIcon} />;
    case 'whatsapp': return <FiSmartphone className={styles.botIcon} />;
    default: return <FiMessageCircle className={styles.botIcon} />;
  }
};

const FiltersPanel = ({ 
  isOpen, 
  onClose, 
  channels, 
  selectedChannel, 
  onChannelChange,
  bots,
  selectedBot,
  onBotChange,
  dialogs,
  statusFilter,
  onStatusFilterChange,
  onClearFilters
}) => {
  const getStatusCount = (status) => {
    switch(status) {
      case STATUS_ACTIVE: return dialogs.filter(d => d.is_taken_over !== 1 && d.auto_response).length;
      case STATUS_TAKEN_OVER: return dialogs.filter(d => d.is_taken_over === 1).length;
      case STATUS_HANDOFF_REQUESTED: return dialogs.filter(d => d.handoff_status === 'requested').length;
      case STATUS_HANDOFF_ACTIVE: return dialogs.filter(d => d.handoff_status === 'active').length;
      default: return dialogs.length;
    }
  };

  const statusOptions = [
    { key: STATUS_ALL, label: 'Все диалоги', icon: FiMessageSquare },
    { key: STATUS_ACTIVE, label: 'Активные', icon: FiCheckCircle },
    { key: STATUS_TAKEN_OVER, label: 'Перехваченные', icon: FiUserCheck },
    { key: STATUS_HANDOFF_REQUESTED, label: 'Нужен оператор', icon: FiHeadphones },
    { key: STATUS_HANDOFF_ACTIVE, label: 'У оператора', icon: FiUser }
  ];

  const getDialogCountForBot = (botAssistantId) => {
    return dialogs.filter(dialog => dialog.assistant_id === botAssistantId).length;
  };

  const filtersPanelContent = (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.filtersPanelOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`${styles.filtersPanel} ${isOpen ? styles.open : ''}`}
        initial={{ transform: 'translateX(100%)' }}
        animate={{ transform: isOpen ? 'translateX(0%)' : 'translateX(100%)' }}
        transition={{
          type: 'tween',
          duration: 0.3,
          ease: 'easeInOut'
        }}
        style={{ willChange: 'transform' }}
      >
        <div className={styles.filtersPanelHeader}>
          <h3>Фильтры</h3>
          <button onClick={onClose} className={styles.closePanelBtn}>
            <FiX />
          </button>
        </div>
        
        <div className={styles.filtersPanelContent}>
          {/* Статус диалогов */}
          <div className={styles.filterSection}>
            <h4>Статус диалогов</h4>
            <div className={styles.filterOptions}>
              {statusOptions.map(option => {
                const Icon = option.icon;
                const count = getStatusCount(option.key);
                return (
                  <button
                    key={option.key}
                    className={`${styles.filterOption} ${statusFilter === option.key ? styles.active : ''}`}
                    onClick={() => onStatusFilterChange(option.key)}
                  >
                    <Icon className={styles.filterOptionIcon} />
                    <span className={styles.filterOptionLabel}>{option.label}</span>
                    <span className={styles.filterOptionCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Каналы */}
          <div className={styles.filterSection}>
            <h4>Каналы</h4>
            <div className={styles.filterOptions}>
              <button
                className={`${styles.filterOption} ${!selectedChannel ? styles.active : ''}`}
                onClick={() => onChannelChange(null)}
              >
                <FiMessageSquare className={styles.filterOptionIcon} />
                <span className={styles.filterOptionLabel}>Все каналы</span>
                <span className={styles.filterOptionCount}>{dialogs.length}</span>
              </button>
              
              {channels.map(channel => (
                <button
                  key={channel.type}
                  className={`${styles.filterOption} ${selectedChannel === channel.type ? styles.active : ''}`}
                  onClick={() => onChannelChange(channel.type)}
                >
                  <AssistantIcon botType={channel.type} />
                  <span className={styles.filterOptionLabel}>{channel.name}</span>
                  <span className={styles.filterOptionCount}>{channel.count}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Ассистенты */}
          <div className={styles.filterSection}>
            <h4>Ассистенты</h4>
            <div className={styles.filterOptions}>
              <button
                className={`${styles.filterOption} ${!selectedBot ? styles.active : ''}`}
                onClick={() => onBotChange(null)}
              >
                <FiMessageSquare className={styles.filterOptionIcon} />
                <span className={styles.filterOptionLabel}>Все ассистенты</span>
                <span className={styles.filterOptionCount}>{dialogs.length}</span>
              </button>
              
              {bots.map(bot => {
                const dialogCount = getDialogCountForBot(bot.assistant_id);
                return (
                  <button
                    key={bot.id}
                    className={`${styles.filterOption} ${selectedBot === bot.assistant_id ? styles.active : ''} ${dialogCount === 0 ? styles.disabled : ''}`}
                    onClick={() => dialogCount > 0 ? onBotChange(bot.assistant_id) : null}
                  >
                    <AssistantIcon botType={bot.platform} />
                    <span className={styles.filterOptionLabel}>{bot.assistant_name}</span>
                    <span className={styles.filterOptionCount}>{dialogCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className={styles.filtersPanelFooter}>
          {/* Кнопка "Применить" для мобильных устройств */}
          <button
            className={`${styles.applyFiltersBtn} ${styles.mobileOnly}`}
            onClick={onClose}
          >
            <FiCheckCircle />
            Применить
          </button>

          <button
            className={styles.clearFiltersBtn}
            onClick={onClearFilters}
          >
            <FiRefreshCw />
            Сбросить фильтры
          </button>
        </div>
      </motion.div>
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(filtersPanelContent, document.body)
    : null;
};

export default FiltersPanel;