import { useState } from 'react';
import { extractLinks, isUrlSafe, truncateLinkText, getLinkIcon } from '../../utils/linkExtractor';
import styles from './MessageLinks.module.css';

/**
 * Компонент для отображения ссылок из сообщений в виде кнопок
 * @param {Object} props - Пропсы компонента
 * @param {string} props.messageText - Текст сообщения для извлечения ссылок
 * @param {string} props.sender - Отправитель сообщения ('assistant', 'user', 'manager')
 * @param {boolean} props.compact - Компактное отображение (по умолчанию false)
 */
const MessageLinks = ({ messageText, sender = 'assistant', compact = false }) => {
  const [clickedLinks, setClickedLinks] = useState(new Set());
  
  // Извлекаем ссылки из текста сообщения
  const links = extractLinks(messageText);
  
  // Если ссылок нет, не рендерим компонент
  if (!links || links.length === 0) {
    return null;
  }
  
  // Фильтруем только безопасные ссылки
  const safeLinks = links.filter(link => isUrlSafe(link.url));
  
  if (safeLinks.length === 0) {
    return null;
  }
  
  // Обработчик клика по ссылке
  const handleLinkClick = (link) => {
    // Отмечаем ссылку как нажатую
    setClickedLinks(prev => new Set([...prev, link.url]));
    
    // Открываем ссылку в новой вкладке
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };
  
  // Определяем стили в зависимости от отправителя
  const containerClass = sender === 'user' 
    ? `${styles.linksContainer} ${styles.userLinks}`
    : `${styles.linksContainer} ${styles.assistantLinks}`;
  
  return (
    <div className={containerClass}>
      <div className={`${styles.linksWrapper} ${compact ? styles.compact : ''}`}>
        {safeLinks.map((link, index) => {
          const isClicked = clickedLinks.has(link.url);
          const linkText = truncateLinkText(link.text, compact ? 25 : 40);
          const icon = getLinkIcon(link.url);
          
          return (
            <button
              key={`${link.url}-${index}`}
              className={`${styles.linkButton} ${isClicked ? styles.clicked : ''} ${compact ? styles.compactButton : ''}`}
              onClick={() => handleLinkClick(link)}
              title={`Открыть: ${link.url}`}
              type="button"
            >
              <span className={styles.linkIcon}>{icon}</span>
              <span className={styles.linkText}>{linkText}</span>
              <span className={styles.externalIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15,3 21,3 21,9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MessageLinks;
