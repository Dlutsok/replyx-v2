import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheck, FiX, FiArrowRight, FiArrowLeft, FiUpload, FiLink, 
  FiMessageSquare, FiSettings, FiExternalLink, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiFile, FiSkipForward, FiCpu,
  FiSmartphone, FiMonitor, FiZap, FiBookOpen, FiSend,
  FiEye, FiCopy, FiPlay
} from 'react-icons/fi';
import styles from '../../styles/components/QuickAssistantWizard.module.css';

const QuickAssistantWizard = ({ isOpen, onClose, onComplete, onOpenSettings }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Состояние данных ассистента
  const [wizardData, setWizardData] = useState({
    name: '',
    template: 'support',
    customPrompt: '',
    aiModel: 'gpt-4o-mini',
    documents: [],
    integrationChannel: 'later',
    telegramToken: '',
    assistantId: null,
    embedCode: '',
    botUrl: '',
    isComplete: false
  });

  // Шаги мастера
  const steps = [
    {
      id: 1,
      title: "Основные настройки",
      description: "Название и настройка вашего ассистента",
      required: true,
      icon: <FiSettings />
    },
    {
      id: 2,
      title: "База знаний",
      description: "Загрузите документы для обучения (необязательно)",
      required: false,
      icon: <FiBookOpen />
    },
    {
      id: 3,
      title: "Интеграция",
      description: "Выберите, где будет работать ваш ассистент",
      required: true,
      icon: <FiZap />
    },
    {
      id: 4,
      title: "Готово!",
      description: "Ваш AI-ассистент создан и готов к работе",
      required: true,
      icon: <FiCheckCircle />
    }
  ];

  // Шаблоны промптов
  const promptTemplates = [
    {
      id: 'support',
      name: 'Служба поддержки',
      description: 'Помогает клиентам решать вопросы и проблемы',
      prompt: 'Вы — специалист службы поддержки. Предоставляете точную информацию по вопросам клиентов в вежливом и профессиональном стиле. Отвечаете кратко, информативно, стараетесь решить проблему клиента. ВАЖНО: Опирайтесь ТОЛЬКО на данные из базы знаний компании. Если информации нет — сообщите об этом прямо.'
    },
    {
      id: 'sales',
      name: 'Продажи',
      description: 'Консультирует по товарам и услугам',
      prompt: 'Вы — консультант по продажам. Помогаете клиентам выбрать подходящие товары и услуги, предоставляете информацию о ценах, характеристиках и преимуществах. Отвечаете в дружелюбном, но профессиональном тоне. ВАЖНО: Используйте ТОЛЬКО информацию из базы знаний компании.'
    },
    {
      id: 'faq',
      name: 'FAQ-помощник',
      description: 'Отвечает на часто задаваемые вопросы',
      prompt: 'Вы — FAQ-помощник. Отвечаете на часто задаваемые вопросы клиентов на основе базы знаний. Предоставляете четкие, структурированные ответы. При отсутствии информации в базе знаний честно сообщаете об этом.'
    },
    {
      id: 'universal',
      name: 'Универсальный',
      description: 'Подходит для любых задач',
      prompt: 'Вы — корпоративный AI-ассистент. Предоставляете точную информацию по вопросам компании в деловом стиле. Отвечаете кратко, информативно, без использования смайликов и чрезмерной эмоциональности. ВАЖНО: Опирайтесь ТОЛЬКО на данные из базы знаний компании. Если информации нет — сообщите об этом прямо.'
    }
  ];

  // Автосохранение
  const triggerAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (wizardData.assistantId && currentStep >= 1) {
        setAutoSaving(true);
        try {
          await updateAssistant();
        } catch (error) {
          console.error('Ошибка автосохранения:', error);
        }
        setAutoSaving(false);
      }
    }, 2000);
  };

  // Обновление данных
  const updateWizardData = (updates) => {
    // Автоматически обрезаем пробелы в токене
    if (updates.telegramToken) {
      updates.telegramToken = updates.telegramToken.trim();
    }
    setWizardData(prev => ({ ...prev, ...updates }));
    triggerAutoSave();
  };

  // API вызовы
  const createAssistant = async () => {
    const template = promptTemplates.find(t => t.id === wizardData.template);
    const response = await fetch('/api/assistants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: wizardData.name,
        ai_model: wizardData.aiModel,
        system_prompt: wizardData.customPrompt || template?.prompt || promptTemplates[3].prompt,
        is_active: true
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка создания ассистента');
    }

    return await response.json();
  };

  const updateAssistant = async () => {
    if (!wizardData.assistantId) return;

    const template = promptTemplates.find(t => t.id === wizardData.template);
    const response = await fetch(`/api/assistants/${wizardData.assistantId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: wizardData.name,
        ai_model: wizardData.aiModel,
        system_prompt: wizardData.customPrompt || template?.prompt,
        is_active: true
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка обновления ассистента');
    }

    return await response.json();
  };

  const uploadDocuments = async () => {
    if (wizardData.documents.length === 0) return;

    const uploadPromises = wizardData.documents.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assistant_id', wizardData.assistantId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      return response.ok;
    });

    const results = await Promise.all(uploadPromises);
    return results.every(result => result);
  };

  const createBotInstance = async () => {
    if (wizardData.integrationChannel !== 'telegram' || !wizardData.telegramToken) return;

    const response = await fetch('/api/bot-instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        platform: 'telegram',
        assistant_id: wizardData.assistantId,
        bot_token: wizardData.telegramToken
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка создания бота');
    }

    return await response.json();
  };

  const getEmbedCode = async () => {
    if (wizardData.integrationChannel !== 'website') return;

    const response = await fetch(`/api/assistants/${wizardData.assistantId}/embed-code`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Ошибка получения embed-кода');
    }

    const data = await response.json();
    return data.embed_code;
  };

  const validateTelegramToken = async (token) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      return data.ok ? data.result : null;
    } catch {
      return null;
    }
  };

  // Навигация по шагам
  const nextStep = async () => {
    if (currentStep === 1) {
      // Создаем ассистента на первом шаге
      if (!wizardData.name.trim()) {
        alert('Пожалуйста, введите название ассистента');
        return;
      }

      setIsLoading(true);
      try {
        const assistant = await createAssistant();
        updateWizardData({ assistantId: assistant.id });
      } catch (error) {
        alert('Ошибка создания ассистента: ' + error.message);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (currentStep === 2) {
      // Загружаем документы
      if (wizardData.documents.length > 0) {
        setIsLoading(true);
        try {
          await uploadDocuments();
        } catch (error) {
          alert('Ошибка загрузки документов: ' + error.message);
        }
        setIsLoading(false);
      }
    }

    if (currentStep === 3) {
      // Настраиваем интеграцию
      setIsLoading(true);
      try {
        if (wizardData.integrationChannel === 'telegram') {
          if (!wizardData.telegramToken.trim()) {
            alert('Введите токен Telegram бота');
            setIsLoading(false);
            return;
          }
          
          const botInfo = await validateTelegramToken(wizardData.telegramToken);
          if (!botInfo) {
            alert('Неверный токен Telegram бота');
            setIsLoading(false);
            return;
          }

          await createBotInstance();
          updateWizardData({ 
            botUrl: `https://t.me/${botInfo.username}`,
            isComplete: true
          });
        } else if (wizardData.integrationChannel === 'website') {
          const embedCode = await getEmbedCode();
          updateWizardData({ 
            embedCode,
            isComplete: true
          });
        } else {
          updateWizardData({ isComplete: true });
        }
      } catch (error) {
        alert('Ошибка настройки интеграции: ' + error.message);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    if (steps[currentStep - 1]?.required === false) {
      nextStep();
    }
  };

  const goToStep = (stepId) => {
    if (stepId <= currentStep || wizardData.assistantId) {
      setCurrentStep(stepId);
    }
  };

  // Очистка при закрытии
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <motion.div 
        className={styles.wizard}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Header с прогресс-баром */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
          
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Создание AI-ассистента</h2>
            <p className={styles.subtitle}>
              Настройте вашего ассистента за 3 простых шага
            </p>
          </div>

          {/* Автосохранение индикатор */}
          {autoSaving && (
            <div className={styles.autoSaving}>
              <FiRefreshCw size={14} className={styles.spinning} />
              <span>Сохранение...</span>
            </div>
          )}
        </div>

        {/* Прогресс-бар */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          <div className={styles.progressSteps}>
            {steps.map((step) => (
              <div
                key={step.id}
                className={`${styles.progressStep} ${
                  currentStep >= step.id ? styles.completed : ''
                } ${currentStep === step.id ? styles.active : ''}`}
                onClick={() => goToStep(step.id)}
              >
                <div className={styles.stepIcon}>
                  {currentStep > step.id ? <FiCheck size={12} /> : step.icon}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepDescription}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Контент шагов */}
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            {/* Шаг 1: Основные настройки */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>Основные настройки</h3>
                  <p>Дайте имя вашему ассистенту и выберите специализацию</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Название ассистента *
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Например: Помощник по продажам"
                    value={wizardData.name}
                    onChange={(e) => updateWizardData({ name: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Специализация
                  </label>
                  <div className={styles.templateGrid}>
                    {promptTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`${styles.templateCard} ${
                          wizardData.template === template.id ? styles.selected : ''
                        }`}
                        onClick={() => updateWizardData({ template: template.id })}
                      >
                        <h4>{template.name}</h4>
                        <p>{template.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Пользовательский промпт (необязательно)
                  </label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Опишите, как должен вести себя ваш ассистент..."
                    value={wizardData.customPrompt}
                    onChange={(e) => updateWizardData({ customPrompt: e.target.value })}
                    rows={4}
                  />
                </div>
              </motion.div>
            )}

            {/* Шаг 2: База знаний */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>База знаний</h3>
                  <p>Загрузите документы для обучения ассистента (можно пропустить)</p>
                </div>

                <div className={styles.uploadZone}>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.docx,.txt,.csv,.html,.json"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      updateWizardData({ documents: [...wizardData.documents, ...files] });
                    }}
                    className={styles.fileInput}
                  />
                  <label htmlFor="file-upload" className={styles.uploadLabel}>
                    <FiUpload size={32} />
                    <h4>Перетащите файлы сюда или нажмите для выбора</h4>
                    <p>Поддерживаются: PDF, DOCX, TXT, CSV, HTML, JSON</p>
                  </label>
                </div>

                {wizardData.documents.length > 0 && (
                  <div className={styles.fileList}>
                    <h4>Загруженные файлы ({wizardData.documents.length})</h4>
                    {wizardData.documents.map((file, index) => (
                      <div key={index} className={styles.fileItem}>
                        <FiFile size={16} />
                        <span>{file.name}</span>
                        <button
                          onClick={() => {
                            const newDocs = wizardData.documents.filter((_, i) => i !== index);
                            updateWizardData({ documents: newDocs });
                          }}
                          className={styles.removeFile}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Шаг 3: Интеграция */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>Где будет работать ваш ассистент?</h3>
                  <p>Выберите канал интеграции</p>
                </div>

                <div className={styles.integrationGrid}>
                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'telegram' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'telegram' })}
                  >
                    <FiSend size={32} />
                    <h4>Telegram бот</h4>
                    <p>Ваш ассистент будет отвечать в Telegram</p>
                  </div>

                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'website' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'website' })}
                  >
                    <FiMonitor size={32} />
                    <h4>Веб-виджет</h4>
                    <p>Чат-виджет для вашего сайта</p>
                  </div>

                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'later' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'later' })}
                  >
                    <FiSettings size={32} />
                    <h4>Настрою позже</h4>
                    <p>Сначала создать, потом подключить</p>
                  </div>
                </div>

                {wizardData.integrationChannel === 'telegram' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Токен Telegram бота *
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      value={wizardData.telegramToken}
                      onChange={(e) => updateWizardData({ telegramToken: e.target.value })}
                    />
                    <p className={styles.inputHint}>
                      Получить токен можно у <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">@BotFather</a>
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Шаг 4: Готово */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.successContent}>
                  <div className={styles.successHeader}>
                    <div className={styles.successIcon}>
                      <FiCheckCircle size={64} />
                    </div>
                    <h3>Ваш AI-ассистент готов!</h3>
                    <p>"{wizardData.name}" успешно создан и настроен</p>
                  </div>

                  {wizardData.integrationChannel === 'telegram' && wizardData.botUrl && (
                    <div className={styles.resultCard}>
                      <h4>Telegram бот</h4>
                      <div className={styles.resultLink}>
                        <span>{wizardData.botUrl}</span>
                        <button 
                          onClick={() => window.open(wizardData.botUrl, '_blank')}
                          className={styles.iconButton}
                        >
                          <FiExternalLink size={16} />
                        </button>
                        <button 
                          onClick={() => navigator.clipboard.writeText(wizardData.botUrl)}
                          className={styles.iconButton}
                        >
                          <FiCopy size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {wizardData.integrationChannel === 'website' && wizardData.embedCode && (
                    <div className={styles.resultCard}>
                      <h4>Код для сайта</h4>
                      <div className={styles.codeBlock}>
                        <code>{wizardData.embedCode}</code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(wizardData.embedCode)}
                          className={styles.copyButton}
                          title="Скопировать код"
                        >
                          <FiCopy size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {wizardData.integrationChannel === 'later' && (
                    <div className={styles.resultCard}>
                      <h4>Ассистент создан</h4>
                      <p>Вы можете настроить интеграцию позже в расширенных настройках</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer с кнопками */}
        <div className={styles.footer}>
          <div className={styles.footerButtons}>
            {currentStep > 1 && (
              <button
                className={styles.backButton}
                onClick={prevStep}
                disabled={isLoading}
              >
                <FiArrowLeft size={16} />
                Назад
              </button>
            )}

            <div className={styles.nextButtons}>
              {currentStep < 4 && !steps[currentStep - 1]?.required && (
                <button
                  className={styles.skipButton}
                  onClick={skipStep}
                  disabled={isLoading}
                >
                  <FiSkipForward size={16} />
                  Пропустить
                </button>
              )}
              {currentStep < 4 && (
                <button
                  className={styles.nextButton}
                  onClick={nextStep}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FiRefreshCw size={16} className={styles.spinning} />
                      Создание...
                    </>
                  ) : (
                    <>
                      {currentStep === 3 ? 'Завершить' : 'Далее'}
                      <FiArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>

            {currentStep === 4 && (
              <div className={styles.finalButtons}>
                <button
                  className={styles.settingsButton}
                  onClick={() => {
                    onOpenSettings?.(wizardData.assistantId);
                    onClose();
                  }}
                >
                  <FiSettings size={16} />
                  Расширенные настройки
                </button>
                <button
                  className={styles.testButton}
                  onClick={() => {
                    if (wizardData.botUrl) {
                      window.open(wizardData.botUrl, '_blank');
                    } else {
                      // Открыть тестовое окно чата
                      alert('Функция тестирования будет добавлена');
                    }
                  }}
                >
                  <FiPlay size={16} />
                  Протестировать
                </button>
                <button
                  className={styles.completeButton}
                  onClick={() => {
                    onComplete?.(wizardData);
                    onClose();
                  }}
                >
                  <FiCheckCircle size={16} />
                  Готово
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickAssistantWizard;