import { useState } from 'react';
import styles from '../../styles/components/ProfileDropdown.module.css';
import { FiUser, FiLock, FiLogOut } from 'react-icons/fi';

export default function ProfileDropdown({ userName, userEmail, onClose, onChangePassword, onLogout }) {
  const handleChangePassword = () => {
    onChangePassword();
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <div className={styles.dropdown}>
      {/* Информация о пользователе */}
      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          <FiUser className={styles.avatarIcon} />
        </div>
        <div className={styles.userDetails}>
          <div className={styles.userName}>{userName}</div>
          <div className={styles.userEmail}>{userEmail}</div>
        </div>
      </div>

      {/* Разделитель */}
      <div className={styles.separator}></div>

      {/* Действия */}
      <div className={styles.actions}>
        <button 
          className={styles.actionButton}
          onClick={handleChangePassword}
        >
          <FiLock className={styles.actionIcon} />
          Изменить пароль
        </button>
        
        <button 
          className={styles.actionButton}
          onClick={handleLogout}
        >
          <FiLogOut className={styles.actionIcon} />
          Выйти
        </button>
      </div>
    </div>
  );
}