import React from 'react';
import Link from 'next/link';
import { useSmartProgress } from '../../hooks/useSmartProgress';
import styles from '../../styles/components/OnboardingBanner.module.css';

const OnboardingBanner = ({ onComplete, assistants = [] }) => {
  // Используем систему умного прогресса
  const { progress, isStepCompleted, isAllStepsCompleted } = useSmartProgress();
  
  const handleCompleteOnboarding = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Используем реальные данные из системы умного прогресса
  const totalSteps = 4; // У нас 4 шага, не 5
  const completedSteps = [
    isStepCompleted(1), // Создать ассистента
    isStepCompleted(2), // Загрузить документы
    isStepCompleted(3), // Установить виджет
    isStepCompleted(4), // Протестировать
  ].filter(Boolean).length;
  
  const realProgress = progress.overall_progress || 0;
  const circumference = 2 * Math.PI * 20; // r=20
  const strokeDashoffset = circumference - (circumference * realProgress) / 100;
  
  // Шаги онбординга с реальными проверками состояния
  const steps = [
    { id: 1, title: "Создать AI-ассистента", completed: isStepCompleted(1), timeEstimate: 2 },
    { id: 2, title: "Загрузить документы", completed: isStepCompleted(2), timeEstimate: 4 },
    { id: 3, title: "Установить виджет на сайт", completed: isStepCompleted(3), timeEstimate: 5 },
    { id: 4, title: "Протестировать в диалоге", completed: isStepCompleted(4), timeEstimate: 3 }
  ];
  
  // Найти следующий незавершенный шаг
  const nextStep = steps.find(step => !step.completed);

  return (
    <div className={styles.onboardingBanner}>
      <div className={styles.contentWrapper}>
        {/* Левая часть - круговой прогресс */}
        <div className={styles.progressSection}>
          <div className={styles.progressContainer}>
            <svg className={styles.svgProgress} viewBox="0 0 48 48">
              {/* Фоновый круг */}
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="transparent"
                stroke="#ffffff"
                strokeWidth="4"
                className={styles.progressBackground}
              />
              {/* Прогресс круг */}
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="transparent"
                stroke="#34b857"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={styles.progressCircle}
              />
            </svg>
            {/* Текст в центре */}
            <div className={styles.progressText}>
              <span className={styles.progressLabel}>{completedSteps}/{totalSteps}</span>
            </div>
          </div>
        </div>

        {/* Средняя часть - текст */}
        <div className={styles.textSection}>
          <h2 className={styles.title}>
            {isAllStepsCompleted() 
              ? 'Настройка завершена!' 
              : 'Завершите настройку ReplyX'
            }
          </h2>
          <p className={styles.description}>
            {isAllStepsCompleted() 
              ? 'Ваш AI-ассистент готов автоматизировать общение с клиентами!'
              : completedSteps > 0 
                ? 'Давайте доведём дело до конца и запустим автоматизацию!'
                : progress.loading 
                  ? 'Загружаем ваши данные...'
                  : 'Давайте настроим вас так, чтобы вы могли радовать своих клиентов.'
            }
          </p>
          
          {/* Показываем детали прогресса для авторизованных пользователей */}
          {progress.user_authenticated && progress.details && (
            <div className={styles.progressDetails}>
              <small className={styles.detailText}>
                {progress.details.assistants_count > 0 && `${progress.details.assistants_count} ассистент(ов) • `}
                {progress.details.documents_count > 0 && `${progress.details.documents_count} документ(ов) • `}
                {progress.details.dialogs_count > 0 && `${progress.details.dialogs_count} диалог(ов)`}
              </small>
            </div>
          )}
        </div>

        {/* Правая часть - кнопка */}
        <div className={styles.buttonSection}>
          <Link href="/start">
            <button
              className={styles.actionButton}
              disabled={progress.loading}
            >
              {progress.loading 
                ? 'Загрузка...'
                : isAllStepsCompleted() 
                  ? 'Просмотреть настройки' 
                  : completedSteps > 0 
                    ? 'Продолжить настройку'
                    : 'Начать настройку'
              }
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OnboardingBanner;

