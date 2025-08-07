import { FiX, FiMessageCircle, FiSmartphone, FiUser, FiMail } from 'react-icons/fi';
import styles from './DialogHeader.module.css';

const DialogHeader = ({ dialog, onClose }) => {
  const getDisplayName = () => {
    if (dialog.name) return dialog.name;
    if (dialog.first_name && dialog.last_name) return `${dialog.first_name} ${dialog.last_name}`;
    if (dialog.first_name) return dialog.first_name;
    if (dialog.telegram_username) return `@${dialog.telegram_username}`;
    return 'Неизвестный пользователь';
  };

  const getSourceInfo = () => {
    if (dialog.telegram_chat_id || dialog.telegram_username) {
      return {
        icon: <FiMessageCircle />,
        text: 'Telegram',
        detail: dialog.telegram_username ? `@${dialog.telegram_username}` : `ID: ${dialog.telegram_chat_id}`
      };
    }
    if (dialog.guest_id) {
      return {
        icon: <FiSmartphone />,
        text: 'Веб-чат',
        detail: `Guest ID: ${dialog.guest_id}`
      };
    }
    return {
      icon: <FiUser />,
      text: 'Неизвестный',
      detail: ''
    };
  };

  const getInitials = () => {
    const name = getDisplayName();
    if (name && name !== 'Неизвестный пользователь') {
      return name.charAt(0).toUpperCase();
    }
    if (dialog.email) {
      return dialog.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const sourceInfo = getSourceInfo();

  return (
    <div className={styles.dialogHeader}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {getInitials()}
        </div>
        <div className={styles.details}>
          <h2 className={styles.userName}>{getDisplayName()}</h2>
          {dialog.email && (
            <div className={styles.userEmail}>
              <FiMail />
              <span>{dialog.email}</span>
            </div>
          )}
          <div className={styles.sourceInfo}>
            {sourceInfo.icon}
            <span>{sourceInfo.text}</span>
            {sourceInfo.detail && <span className={styles.sourceDetail}>{sourceInfo.detail}</span>}
          </div>
        </div>
      </div>
      
      <button className={styles.closeButton} onClick={onClose}>
        <FiX />
      </button>
    </div>
  );
};

export default DialogHeader;