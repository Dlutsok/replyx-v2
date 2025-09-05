import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { FiCheck, FiMessageSquare, FiMessageCircle, FiCode, FiFileText } from 'react-icons/fi';
import startStyles from '../styles/pages/Start.module.css';
import { useStartPageAnalytics } from '../hooks/useStartPageAnalytics';
import { useSmartProgress } from '../hooks/useSmartProgress';

const StartPage = () => {
  const [completedTasks, setCompletedTasks] = useState([]);
  
  // Инициализация аналитики и умного прогресса
  const { trackPageView, trackStepClick, trackStepComplete, trackTaskAction } = useStartPageAnalytics();
  const { 
    progress, 
    isStepCompleted, 
    getStepStatus, 
    getNextStep, 
    isAllStepsCompleted, 
    markWidgetCopied,
    refreshProgress 
  } = useSmartProgress();

  const steps = [
    {
      id: 1,
      title: "Создайте ассистента",
      subtitle: "2 мин",
      description: "Настройте AI-ассистента с готовым шаблоном",
      icon: FiMessageSquare,
      actionUrl: '/ai-assistant',
      buttonText: "Создать"
    },
    {
      id: 2,
      title: "Загрузите документы",
      subtitle: "4 мин",
      description: "Добавьте файлы для обучения",
      icon: FiFileText,
      buttonText: "Загрузить"
    },
    {
      id: 3,
      title: "Установите виджет",
      subtitle: "5 мин",
      description: "Получите код и разместите на сайте",
      icon: FiCode,
      buttonText: "Получить код"
    },
    {
      id: 4,
      title: "Протестируйте",
      subtitle: "3 мин",
      description: "Проверьте работу в тестовом диалоге",
      icon: FiMessageCircle,
      buttonText: "Тестировать"
    }
  ];

  // Используем реальный прогресс вместо простого подсчета кликов
  const realProgress = progress.overall_progress;

  const handleTaskComplete = useCallback((taskId) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks(prev => [...prev, taskId]);
      // Отслеживание завершения шага
      trackStepComplete(taskId, {
        step_name: steps.find(s => s.id === taskId)?.title || 'Unknown step',
        total_completed: completedTasks.length + 1,
        progress_percent: Math.round(((completedTasks.length + 1) / steps.length) * 100)
      });
    }
  }, [completedTasks, trackStepComplete]);

  // Функция для получения первого созданного ассистента
  const getFirstAssistant = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch('/api/assistants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const assistants = await response.json();
        return assistants && assistants.length > 0 ? assistants[0] : null;
      }
    } catch (error) {
      console.error('Ошибка получения ассистентов:', error);
    }
    return null;
  }, []);

  // Функция для получения настроенного домена виджета
  const getWidgetDomain = useCallback(async () => {
    try {
      const assistant = await getFirstAssistant();
      if (!assistant) return null;
      
      // Получаем домены из widget_settings.allowedDomains или allowed_domains
      let domains = null;
      if (assistant.widget_settings?.allowedDomains) {
        domains = assistant.widget_settings.allowedDomains;
      } else if (assistant.allowed_domains) {
        domains = assistant.allowed_domains;
      }
      
      if (domains) {
        // Берём первый домен из списка (разделённого запятыми)
        const firstDomain = domains.split(',')[0].trim();
        if (firstDomain) {
          // Добавляем https:// если протокол не указан
          return firstDomain.startsWith('http') ? firstDomain : `https://${firstDomain}`;
        }
      }
    } catch (error) {
      console.error('Ошибка получения домена виджета:', error);
    }
    return null;
  }, [getFirstAssistant]);

  const handleTaskAction = useCallback(async (taskId, action) => {
    console.log(`Task ${taskId}, action: ${action}`);
    
    // Отслеживание действия пользователя
    const step = steps.find(s => s.id === taskId);
    const stepStatus = getStepStatus(taskId);
    
    trackTaskAction(taskId, action, {
      step_name: step?.title || 'Unknown step',
      button_text: step?.buttonText || 'Unknown action',
      target_url: step?.actionUrl || null,
      current_progress: realProgress,
      already_completed: stepStatus.completed
    });

    // Обработка действий для каждого шага
    if (taskId === 1 && action === 'primary') {
      // Переход к созданию ассистента
      window.location.href = '/ai-assistant';
    } else if (taskId === 2 && action === 'primary') {
      // Переход к загрузке документов - сначала получаем ассистента
      const assistant = await getFirstAssistant();
      if (assistant) {
        window.location.href = `/assistant/${assistant.id}?tab=knowledge`;
      } else {
        // Если ассистента нет, перенаправляем на создание
        window.location.href = '/ai-assistant';
      }
    } else if (taskId === 3 && action === 'primary') {
      // Переход к настройке виджета - сначала получаем ассистента
      const assistant = await getFirstAssistant();
      if (assistant) {
        window.location.href = `/assistant/${assistant.id}?tab=integrations`;
      } else {
        // Если ассистента нет, перенаправляем на создание
        window.location.href = '/ai-assistant';
      }
    } else if (taskId === 4 && action === 'primary') {
      // Переход к тестированию виджета на сайте
      const widgetDomain = await getWidgetDomain();
      if (widgetDomain) {
        window.open(widgetDomain, '_blank');
      } else {
        // Если домен не настроен, перенаправляем на настройку виджета
        const assistant = await getFirstAssistant();
        if (assistant) {
          window.location.href = `/assistant/${assistant.id}?tab=integrations`;
        } else {
          window.location.href = '/ai-assistant';
        }
      }
    }

    // После действия обновляем прогресс через небольшой интервал
    setTimeout(() => {
      refreshProgress();
    }, 1000);
  }, [trackTaskAction, realProgress, getStepStatus, refreshProgress, getFirstAssistant, getWidgetDomain]);


  // Отслеживание просмотра страницы при загрузке
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  // Обработчик клика по карточке шага
  const handleStepCardClick = useCallback((stepId) => {
    const step = steps.find(s => s.id === stepId);
    const stepStatus = getStepStatus(stepId);
    
    trackStepClick(stepId, {
      step_name: step?.title || 'Unknown step',
      is_completed: stepStatus.completed,
      is_next: getNextStep() === stepId,
      current_progress: realProgress,
      step_details: stepStatus.subtitle
    });
  }, [trackStepClick, getStepStatus, getNextStep, realProgress]);

  return (
    <>
      <Head>
        <title>Настройка ReplyX - Первые шаги</title>
        <meta name="description" content="Настройте AI-ассистента ReplyX за 15 минут" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="apple-mobile-web-app-title" content="ReplyX - Настройка" />
      </Head>

      <div className={startStyles.startContainer}>
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-screen-2xl mx-auto py-3 sm:py-4 md:py-6">

          {/* Header Section */}
          <div className={startStyles.headerSection}>
            <div className={startStyles.headerContent}>
              <div className={startStyles.titleSection}>
                <h1 className={startStyles.mainTitle}>Настройка ReplyX</h1>
                <p className={startStyles.mainSubtitle}>
                  Следуйте простым шагам для запуска вашего AI-ассистента
                </p>
              </div>
              <div className={startStyles.progressSection}>
                <div className={startStyles.progressWrapper}>
                  <div className={startStyles.progressBar}>
                    <div
                      className={startStyles.progressFill}
                      style={{ width: `${realProgress}%` }}
                    ></div>
                  </div>
                  <div className={startStyles.progressText}>
                    {progress.loading ? 'Загрузка...' : `${realProgress}% завершено`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className={startStyles.stepsGrid}>
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(step.id);
              const isCompleted = stepStatus.completed;
              const isNext = getNextStep() === step.id;
              const isLoading = progress.loading;
              
              // Проверяем доступность шага: первый шаг всегда доступен, остальные только после завершения предыдущего
              const isStepAccessible = step.id === 1 || isStepCompleted(step.id - 1);
              const shouldDisable = !isStepAccessible || isLoading;

              return (
                <div
                  key={step.id}
                  className={`${startStyles.stepCard} ${
                    isCompleted ? startStyles.stepCompleted :
                    isNext ? startStyles.stepNext : 
                    !isStepAccessible ? startStyles.stepDisabled : 
                    startStyles.stepPending
                  } ${isLoading ? startStyles.stepLoading : ''}`}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    opacity: shouldDisable && !isCompleted ? 0.5 : 1
                  }}
                  onClick={() => !shouldDisable && handleStepCardClick(step.id)}
                >
                  {/* Step Header */}
                  <div className={startStyles.stepHeader}>
                    <div className={startStyles.stepIcon}>
                      {isCompleted ? (
                        <FiCheck size={20} />
                      ) : (
                        <step.icon size={20} />
                      )}
                    </div>
                    <div className={startStyles.stepNumber}>{step.id}</div>
                  </div>

                  {/* Step Content */}
                  <div className={startStyles.stepContent}>
                    <h3 className={startStyles.stepTitle}>{stepStatus.title}</h3>
                    <p className={startStyles.stepSubtitle}>{stepStatus.subtitle}</p>
                    <p className={startStyles.stepDescription}>{step.description}</p>
                    
                    {/* Показываем детали для авторизованных пользователей */}
                    {progress.user_authenticated && (
                      <div className={startStyles.stepDetails}>
                        <small className={startStyles.stepDetailText}>
                          {isCompleted && progress.details && (
                            <>
                              {step.id === 1 && `${progress.details.assistants_count} ассистент(ов)`}
                              {step.id === 2 && `${progress.details.documents_count} документ(ов)`}
                              {step.id === 4 && `${progress.details.dialogs_count} диалог(ов)`}
                            </>
                          )}
                          {!isStepAccessible && !isCompleted && (
                            <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                              {step.id === 2 && 'Сначала создайте ассистента'}
                              {step.id === 3 && 'Сначала загрузите документы'}
                              {step.id === 4 && 'Сначала настройте виджет'}
                            </span>
                          )}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Step Actions */}
                  <div className={startStyles.stepActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!shouldDisable) {
                          handleTaskAction(step.id, 'primary');
                        }
                      }}
                      className={`${startStyles.stepButton} ${
                        isCompleted ? startStyles.stepButtonCompleted : 
                        shouldDisable ? startStyles.stepButtonDisabled :
                        startStyles.stepButtonActive
                      }`}
                      disabled={shouldDisable}
                    >
                      {isLoading ? 'Загрузка...' : 
                       isCompleted ? 'Завершено' : 
                       !isStepAccessible ? 'Недоступно' :
                       step.buttonText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion Message */}
          {isAllStepsCompleted() && (
            <div className={startStyles.completionSection}>
              <div className={startStyles.completionCard}>
                <div className={startStyles.completionIcon}>
                  <FiCheck size={24} />
                </div>
                <h3 className={startStyles.completionTitle}>Поздравляем!</h3>
                <p className={startStyles.completionText}>
                  Ваш AI-ассистент готов к работе. Теперь он может отвечать на вопросы клиентов 24/7.
                </p>
                <button
                  className={startStyles.completionButton}
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Перейти в панель управления
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StartPage;
