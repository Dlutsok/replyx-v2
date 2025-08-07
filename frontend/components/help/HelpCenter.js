import React, { useState } from 'react';
import { 
  FiHelpCircle, FiBook, FiPlay, FiMessageSquare, FiSettings, 
  FiTrendingUp, FiChevronDown, FiChevronUp, FiExternalLink,
  FiVideo, FiFileText, FiUser, FiZap, FiCheckCircle
} from 'react-icons/fi';
import styles from '../../styles/components/HelpCenter.module.css';

const HelpCenter = ({ user }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const quickTips = [
    {
      id: 'first-bot',
      icon: FiUser,
      title: 'Создайте своего первого ассистента',
      description: 'Настройте AI-ассистента под ваши задачи',
      action: 'Создать ассистента',
      link: '/ai-assistant',
      completed: user?.first_assistant_created
    },
    {
      id: 'first-message',
      icon: FiMessageSquare,
      title: 'Отправьте первое сообщение',
      description: 'Протестируйте работу вашего ассистента',
      action: 'Перейти к диалогам',
      link: '/dialogs',
      completed: user?.first_message_sent
    },

  ];

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Быстрый старт',
      icon: FiPlay,
      items: [
        {
          title: 'Как создать первого ассистента?',
          content: 'Перейдите в раздел "AI-ассистент", выберите шаблон и настройте параметры вашего ассистента.',
          link: '/ai-assistant'
        },
        {
          title: 'Как обучить ассистента документам?',
          content: 'Загрузите ваши документы в разделе "Знания ассистента" для улучшения ответов.',
          link: '/ai-assistant'
        },
        {
          title: 'Как интегрировать ассистента на сайт?',
          content: 'Скопируйте код виджета из настроек и вставьте на ваш сайт.',
          link: '/ai-assistant'
        }
      ]
    },
    {
      id: 'settings',
      title: 'Настройки и конфигурация',
      icon: FiSettings,
      items: [
        {
          title: 'Как изменить модель AI?',
          content: 'В настройках ассистента используется модель GPT-3.5 Turbo.',
          link: '/ai-assistant'
        },
        {
          title: 'Как настроить тон общения?',
          content: 'Отредактируйте системный промпт для изменения стиля ответов ассистента.',
          link: '/ai-assistant'
        },
        {
          title: 'Как ограничить тематику ответов?',
          content: 'Используйте инструкции в системном промпте для фокусировки на определенных темах.',
          link: '/ai-assistant'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Аналитика и мониторинг',
      icon: FiTrendingUp,
      items: [

        {
          title: 'Как улучшить качество ответов?',
          content: 'Анализируйте диалоги и добавляйте новые документы в базу знаний.',
          link: '/dialogs'
        },

      ]
    }
  ];

  return (
    <div className={styles.helpCenter}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FiHelpCircle className={styles.mainIcon} />
          <div>
            <h2 className={styles.title}>Центр помощи</h2>
            <p className={styles.subtitle}>Быстрые инструкции и полезные советы</p>
          </div>
        </div>
      </div>

      {/* Быстрые задачи */}
      <div className={styles.quickTips}>
        <h3 className={styles.sectionTitle}>
          <FiZap className={styles.sectionIcon} />
          Быстрые задачи
        </h3>
        <div className={styles.tipsGrid}>
          {quickTips.map(tip => (
            <div key={tip.id} className={`${styles.tipCard} ${tip.completed ? styles.completed : ''}`}>
              <div className={styles.tipHeader}>
                {tip.icon === FiUser ? (
                  <FiUser className={styles.tipIcon} />
                ) : tip.icon === FiMessageSquare ? (
                  <FiMessageSquare className={styles.tipIcon} />
                ) : tip.icon === FiTrendingUp ? (
                  <FiTrendingUp className={styles.tipIcon} />
                ) : (
                  <FiUser className={styles.tipIcon} />
                )}
                {tip.completed && <FiCheckCircle className={styles.completedIcon} />}
              </div>
              <h4 className={styles.tipTitle}>{tip.title}</h4>
              <p className={styles.tipDescription}>{tip.description}</p>
              {!tip.completed && (
                <a href={tip.link} className={styles.tipButton}>
                  {tip.action}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Секции помощи */}
      <div className={styles.helpSections}>
        <h3 className={styles.sectionTitle}>
          <FiBook className={styles.sectionIcon} />
          База знаний
        </h3>
        
        {helpSections.map(section => (
          <div key={section.id} className={styles.helpSection}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection(section.id)}
            >
              <div className={styles.sectionInfo}>
                {section.icon === FiPlay ? (
                  <FiPlay className={styles.sectionIcon} />
                ) : section.icon === FiSettings ? (
                  <FiSettings className={styles.sectionIcon} />
                ) : section.icon === FiTrendingUp ? (
                  <FiTrendingUp className={styles.sectionIcon} />
                ) : (
                  <FiPlay className={styles.sectionIcon} />
                )}
                <span className={styles.sectionTitle}>{section.title}</span>
              </div>
              {expandedSection === section.id ? 
                <FiChevronUp className={styles.chevron} /> : 
                <FiChevronDown className={styles.chevron} />
              }
            </button>
            
            {expandedSection === section.id && (
              <div className={styles.sectionContent}>
                {section.items.map((item, index) => (
                  <div key={index} className={styles.helpItem}>
                    <h4 className={styles.itemTitle}>{item.title}</h4>
                    <p className={styles.itemContent}>{item.content}</p>
                    {item.link && (
                      <a href={item.link} className={styles.itemLink}>
                        Перейти <FiExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Дополнительные ресурсы */}
      <div className={styles.resources}>
        <h3 className={styles.sectionTitle}>
          <FiFileText className={styles.sectionIcon} />
          Дополнительные ресурсы
        </h3>
        <div className={styles.resourcesGrid}>
          <a href="/docs" className={styles.resourceCard}>
            <FiBook className={styles.resourceIcon} />
            <div>
              <h4>Полная документация</h4>
              <p>Подробные инструкции по всем функциям</p>
            </div>
            <FiExternalLink className={styles.linkIcon} />
          </a>
          <a href="mailto:support@chatai.com" className={styles.resourceCard}>
            <FiMessageSquare className={styles.resourceIcon} />
            <div>
              <h4>Техническая поддержка</h4>
              <p>Свяжитесь с нашей командой</p>
            </div>
            <FiExternalLink className={styles.linkIcon} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;