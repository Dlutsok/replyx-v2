import { FiMessageSquare } from 'react-icons/fi';
import DialogTable from './DialogTable';
import styles from '../../styles/pages/Dialogs.module.css';

const ChatWidgetGrid = ({ 
  dialogs, 
  bots, 
  onDialogOpen
}) => {

  if (dialogs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <FiMessageSquare className="text-gray-400" />
        </div>
        <h3>Нет диалогов</h3>
        <p>Диалоги появятся здесь, когда пользователи начнут общение с вашими ассистентами</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <DialogTable 
        dialogs={dialogs}
        bots={bots}
        onDialogOpen={onDialogOpen}
      />
    </div>
  );
};

export default ChatWidgetGrid;