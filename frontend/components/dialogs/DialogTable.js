import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiSmartphone } from 'react-icons/fi';
import styles from '../../styles/pages/Dialogs.module.css';
import { 
  getInitials, 
  getUserDisplayName, 
  getUserSubtitle, 
  getChannelName, 
  getChannelType,
  toLocal 
} from '../../utils/dialogHelpers';

const AssistantIcon = ({ botType }) => {
  switch(botType) {
    case 'telegram': return <FiMessageCircle className={styles.botIcon} />;
    case 'website': return <FiSmartphone className={styles.botIcon} />;
    case 'whatsapp': return <FiSmartphone className={styles.botIcon} />;
    default: return <FiMessageCircle className={styles.botIcon} />;
  }
};

const DialogTable = ({ dialogs, bots, onDialogOpen }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dialogsTable}>
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Канал</th>
            <th>Ассистент</th>
            <th>Последнее сообщение</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {dialogs.map((dialog, index) => (
              <motion.tr
                key={dialog.id}
                className={styles.dialogRow}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onDialogOpen(dialog)}
                whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
              >
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.avatar}>
                      {getInitials(dialog)}
                    </div>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>
                        {getUserDisplayName(dialog)}
                        {/* Status indicators */}
                        {dialog.is_taken_over === 1 && (
                          <span className={`${styles.statusBadge} ${styles.takenOver}`}>
                            Перехвачен
                          </span>
                        )}
                        {dialog.is_taken_over !== 1 && dialog.auto_response && (
                          <span className={`${styles.statusBadge} ${styles.active}`}>
                            Активен
                          </span>
                        )}
                      </div>
                      <div className={styles.userSub}>
                        {getUserSubtitle(dialog)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.botCell}>
                    <AssistantIcon botType={getChannelType(dialog)} />
                    <span>{getChannelName(dialog)}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.botCell}>
                    <AssistantIcon botType={(() => {
                      const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
                      return bot ? bot.platform : 'unknown';
                    })()} />
                    <span>
                      {(() => {
                        const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
                        return bot ? bot.assistant_name : 'Неизвестный ассистент';
                      })()}
                    </span>
                  </div>
                </td>
                <td className={styles.timeCell}>
                  <div className={styles.timeInfo}>
                    <span className={styles.time}>{toLocal(dialog.last_message_at)}</span>
                    <span className={styles.date}>
                      {new Date(dialog.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td>
                  <button
                    className={styles.openBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDialogOpen(dialog);
                    }}
                  >
                    Открыть
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};

export default DialogTable;