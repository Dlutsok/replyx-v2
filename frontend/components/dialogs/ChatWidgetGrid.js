import { motion } from 'framer-motion';
import { FiGrid, FiList } from 'react-icons/fi';
import ChatWidgetCard from './ChatWidgetCard';
import DialogTable from './DialogTable';
import styles from './ChatWidgetGrid.module.css';

const ChatWidgetGrid = ({ 
  dialogs, 
  bots, 
  onDialogOpen,
  viewMode = 'widgets',
  onViewModeChange
}) => {

  if (dialogs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>💬</div>
        <h3>Нет диалогов</h3>
        <p>Диалоги появятся здесь, когда пользователи начнут общение с вашими ассистентами</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Переключатель режима просмотра */}
      <div className={styles.viewToggle}>
        <div className={styles.toggleButtons}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'widgets' ? styles.active : ''}`}
            onClick={() => onViewModeChange('widgets')}
          >
            <FiGrid />
            <span>Виджеты</span>
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'table' ? styles.active : ''}`}
            onClick={() => onViewModeChange('table')}
          >
            <FiList />
            <span>Таблица</span>
          </button>
        </div>
      </div>

      {/* Контент */}
      {viewMode === 'widgets' ? (
        <motion.div 
          className={styles.widgetsGrid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {dialogs.map((dialog, index) => (
            <ChatWidgetCard
              key={dialog.id}
              dialog={dialog}
              bots={bots}
              onOpen={onDialogOpen}
              index={index}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DialogTable 
            dialogs={dialogs}
            bots={bots}
            onDialogOpen={onDialogOpen}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ChatWidgetGrid;