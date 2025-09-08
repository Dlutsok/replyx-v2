import React, { useState } from 'react';
import { 
  FiHelpCircle, FiBook, FiPlay, FiMessageSquare, FiSettings, 
  FiTrendingUp, FiChevronDown, FiChevronRight, FiExternalLink,
  FiVideo, FiFileText, FiUser, FiZap, FiCheckCircle, FiMail, FiPhone
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
      {/* Главная информация */}
      <div className={styles.mainSection}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Поддержка</h1>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot}></span>
            Все системы работают
          </div>
        </div>
        
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.activeTab}`}>Общая информация</button>
            <button className={styles.tab}>Контакты</button>
            <button className={styles.tab}>FAQ</button>
            <button className={styles.tab}>Статус системы</button>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className={styles.contentSection}>
        {/* Быстрые действия */}
        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Быстрые действия</h2>
          <div className={styles.actionsGrid}>
            {quickTips.map(tip => (
              <div key={tip.id} className={`${styles.actionCard} ${tip.completed ? styles.completed : ''}`}>
                <div className={styles.cardIcon}>
                  <tip.icon />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{tip.title}</h3>
                  <p className={styles.cardDescription}>{tip.description}</p>
                </div>
                {!tip.completed && (
                  <a href={tip.link} className={styles.cardButton}>
                    {tip.action}
                  </a>
                )}
                {tip.completed && <FiCheckCircle className={styles.completedIcon} />}
              </div>
            ))}
          </div>
        </div>

        {/* Каналы поддержки */}
        <div className={styles.supportChannels}>
          <h2 className={styles.sectionTitle}>Каналы поддержки</h2>
          <p className={styles.sectionDescription}>
            Выберите удобный способ связи с нашей службой поддержки
          </p>
          
          <div className={styles.channelsGrid}>
            <div className={styles.channelCard}>
              <div className={styles.channelIcon}>
                <FiMail />
              </div>
              <div className={styles.channelInfo}>
                <h3>Электронная почта</h3>
                <p>support@replyx.com</p>
              </div>
              <a href="mailto:support@replyx.com" className={styles.channelLink}>
                Написать
              </a>
            </div>
            
            <div className={styles.channelCard}>
              <div className={styles.channelIcon}>
                <FiMessageSquare />
              </div>
              <div className={styles.channelInfo}>
                <h3>Онлайн-чат</h3>
                <p>Ответим в течение 15 минут</p>
              </div>
              <button className={styles.channelLink}>
                Начать чат
              </button>
            </div>
            
            <div className={styles.channelCard}>
              <div className={styles.channelIcon}>
                <FiPhone />
              </div>
              <div className={styles.channelInfo}>
                <h3>Телефон</h3>
                <p>+7(993)334-99-13</p>
              </div>
              <a href="tel:+79933349913" className={styles.channelLink}>
                Позвонить
              </a>
            </div>
          </div>
        </div>

        {/* База знаний */}
        <div className={styles.knowledgeBase}>
          <h2 className={styles.sectionTitle}>База знаний</h2>
          
          <div className={styles.knowledgeSections}>
            {helpSections.map(section => (
              <div key={section.id} className={styles.knowledgeSection}>
                <button
                  className={styles.knowledgeHeader}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className={styles.knowledgeTitle}>
                    <section.icon className={styles.knowledgeIcon} />
                    <span>{section.title}</span>
                  </div>
                  <FiChevronRight 
                    className={`${styles.chevron} ${expandedSection === section.id ? styles.chevronExpanded : ''}`} 
                  />
                </button>
                
                {expandedSection === section.id && (
                  <div className={styles.knowledgeContent}>
                    {section.items.map((item, index) => (
                      <div key={index} className={styles.knowledgeItem}>
                        <h4>{item.title}</h4>
                        <p>{item.content}</p>
                        {item.link && (
                          <a href={item.link} className={styles.knowledgeLink}>
                            Подробнее
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;