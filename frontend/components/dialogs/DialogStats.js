import { motion } from 'framer-motion';
import { FiMessageCircle, FiCheckCircle, FiUserCheck, FiClock } from 'react-icons/fi';
import styles from '../../styles/pages/Dialogs.module.css';

const DialogStats = ({ stats, onStatClick }) => (
  <div className={styles.compactStats}>
    <motion.div 
      className={`${styles.compactStatItem} ${styles.clickable}`}
      whileHover={{ scale: 1.02 }}
      onClick={() => onStatClick('all')}
    >
      <div className={`${styles.statIcon} ${styles.purple}`}>
        <FiMessageCircle />
      </div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{stats.totalDialogs}</div>
        <div className={styles.statLabel}>Всего диалогов</div>
      </div>
    </motion.div>
    
    <motion.div 
      className={`${styles.compactStatItem} ${styles.clickable}`}
      whileHover={{ scale: 1.02 }}
      onClick={() => onStatClick('active')}
    >
      <div className={`${styles.statIcon} ${styles.green}`}>
        <FiCheckCircle />
      </div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{stats.activeDialogs}</div>
        <div className={styles.statLabel}>Активные</div>
      </div>
    </motion.div>
    
    <motion.div 
      className={`${styles.compactStatItem} ${styles.clickable}`}
      whileHover={{ scale: 1.02 }}
      onClick={() => onStatClick('taken_over')}
    >
      <div className={`${styles.statIcon} ${styles.yellow}`}>
        <FiUserCheck />
      </div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{stats.takenOverDialogs}</div>
        <div className={styles.statLabel}>Перехвачены</div>
      </div>
    </motion.div>
    
    <div className={styles.compactStatItem}>
      <div className={`${styles.statIcon} ${styles.blue}`}>
        <FiClock />
      </div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{stats.avgResponse}</div>
        <div className={styles.statLabel}>Время ответа</div>
      </div>
    </div>
  </div>
);

export default DialogStats;