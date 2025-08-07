import React, { useState } from 'react';
import { 
  FiX, FiRocket, FiMessageSquare, FiSettings, FiBook, 
  FiChevronRight, FiCheckCircle 
} from 'react-icons/fi';
import styles from '../../styles/components/QuickStart.module.css';

const QuickStart = ({ user, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'create-bot',
      title: 'Создайте своего первого ИИ-ассистента',
      description: 'Начните с создания ИИ-бота для вашего бизнеса',
      action: 'Создать бота',
      link: '/ai-assistant',
      completed: user?.first_bot_created
    },
    {
      id: 'first-chat',
      title: 'Протестируйте вашего ассистента',
      description: 'Отправьте первое сообщение и проверьте работу',
      action: 'Открыть чат',
      link: '/dialogs',
      completed: user?.first_message_sent
    },
    {
      id: 'configure',
      title: 'Настройте параметры бота',
      description: 'Тонкая настройка поведения и стиля общения',
      action: 'Настроить',
      link: '/ai-assistant',
      completed: false
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const getStepIcon = (stepIndex, completed) => {
    if (completed) {
      return <FiCheckCircle className={styles.completedIcon} />;
    }
    
    switch (stepIndex) {
      case 0:
        return <FiRocket className={styles.icon} />;
      case 1:
        return <FiMessageSquare className={styles.icon} />;
      case 2:
        return <FiSettings className={styles.icon} />;
      default:
        return <FiRocket className={styles.icon} />;
    }
  };

  return (
    <div className={styles.quickStart}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FiRocket className={styles.mainIcon} />
          <div>
            <h3 className={styles.title}>Быстрый старт</h3>
            <p className={styles.subtitle}>
              Завершено: {completedSteps} из {steps.length} шагов
            </p>
          </div>
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          <FiX size={20} />
        </button>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`${styles.step} ${index === currentStep ? styles.active : ''} ${step.completed ? styles.completed : ''}`}
            >
              <div className={styles.stepIcon}>
                {getStepIcon(index, step.completed)}
              </div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDescription}>{step.description}</p>
                {!step.completed && index === currentStep && (
                  <a href={step.link} className={styles.stepButton}>
                    {step.action}
                    <FiChevronRight size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.navigation}>
          <button 
            className={styles.navButton}
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Предыдущий
          </button>
          <div className={styles.stepIndicators}>
            {steps.map((step, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentStep ? styles.active : ''} ${step.completed ? styles.completed : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
          <button 
            className={styles.navButton}
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
          >
            Следующий
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <a href="/docs" className={styles.helpLink}>
          <FiBook size={16} />
          Полная документация
        </a>
      </div>
    </div>
  );
};

export default QuickStart;