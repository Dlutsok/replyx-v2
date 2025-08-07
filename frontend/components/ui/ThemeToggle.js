import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from './ThemeProvider';
import styles from '../../styles/components/ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      className={`${styles.themeToggle} ${theme === 'dark' ? styles.dark : ''}`}
      onClick={toggleTheme}
      aria-label={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
      title={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
    >
      <div className={styles.toggleTrack}>
        <div className={styles.toggleThumb}>
          {theme === 'light' ? (
            <FiSun size={14} />
          ) : (
            <FiMoon size={14} />
          )}
        </div>
      </div>
    </button>
  );
}