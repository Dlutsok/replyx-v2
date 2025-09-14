import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheck, FiX, FiArrowRight, FiArrowLeft, FiUpload, FiLink, 
  FiMessageSquare, FiSettings, FiExternalLink, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiFile, FiSkipForward, FiCpu,
  FiSmartphone, FiMonitor, FiZap, FiBookOpen, FiSend,
  FiHeadphones, FiShoppingBag, FiHelpCircle, FiGrid,
  FiEye, FiCopy, FiPlay
} from 'react-icons/fi';
import styles from '../../styles/components/QuickAssistantWizard.module.css';
import InlineNotice from '../common/InlineNotice';
import { useNotifications } from '../../hooks/useNotifications';

const templateIconMap = {
  support: FiHeadphones,
  sales: FiShoppingBag,
  faq: FiHelpCircle,
  universal: FiGrid
};

const QuickAssistantWizard = ({ isOpen, onClose, onComplete, onOpenSettings }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [ingestingWebsite, setIngestingWebsite] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const telegramValidateTimeoutRef = useRef(null);
  const [telegramValidation, setTelegramValidation] = useState({ status: 'idle', botUsername: '' });
  const [showBalanceInline, setShowBalanceInline] = useState(false);
  const { showSuccess, showError, showWarning } = useNotifications();

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
    websiteUrl: '',
    isComplete: false
  });

  // Шаги мастера (упрощенная последовательность из плана)
  const steps = [
    {
      id: 1,
      title: 'Основное',
      description: 'Название и системное сообщение',
      required: true
    },
    {
      id: 2,
      title: 'Каналы',
      description: 'Выбор канала (Telegram / Сайт / Позже)',
      required: true
    },
    {
      id: 3,
      title: 'Документы',
      description: 'Необязательно: загрузите файлы',
      required: false
    },
    {
      id: 4,
      title: 'Готово',
      description: 'Ассистент создан',
      required: true
    }
  ];

  // Шаблоны системных инструкций
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
      name: 'FAQ‑ассистент',
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
    // Триггерим автосохранение ТОЛЬКО при изменении полей ассистента
    const shouldAutoSave = (
      Object.prototype.hasOwnProperty.call(updates, 'name') ||
      Object.prototype.hasOwnProperty.call(updates, 'aiModel') ||
      Object.prototype.hasOwnProperty.call(updates, 'customPrompt')
    );
    if (shouldAutoSave) {
      triggerAutoSave();
    }
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
    // Формируем payload только с валидными полями
    const payload = {
      ai_model: wizardData.aiModel,
      system_prompt: wizardData.customPrompt || template?.prompt,
      is_active: true
    };
    const trimmedName = (wizardData.name || '').trim();
    const NAME_RE = /^[a-zA-Zа-яА-Я0-9\s\-_.]+$/;
    if (trimmedName && NAME_RE.test(trimmedName)) {
      payload.name = trimmedName;
    }

    const response = await fetch(`/api/assistants/${wizardData.assistantId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
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

      if (response.status === 402) {
        setShowBalanceInline(true);
        return false;
      }

      return response.ok;
    });

    const results = await Promise.all(uploadPromises);
    return results.every(result => result);
  };

  const importWebsite = async () => {
    const url = (wizardData.websiteUrl || '').trim();
    if (!url) return true;
    try {
      const response = await fetch(`/api/assistants/${wizardData.assistantId}/ingest-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url
        })
      });
      if (response.status === 402) {
        setShowBalanceInline(true);
        return false;
      }
      if (response.ok) {
        const result = await response.json();
        return result; // Возвращаем полный результат
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleWebsiteIngest = async () => {
    if (!wizardData.assistantId) {
      showWarning('Сначала создайте ассистента на предыдущих шагах');
      return;
    }
    const url = (wizardData.websiteUrl || '').trim();
    if (!url) {
      showWarning('Укажите URL страницы');
      return;
    }
    try {
      // Быстрая проверка URL
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Некорректный URL');
    } catch {
      showError('Некорректный URL');
      return;
    }
    setIngestingWebsite(true);
    try {
      const result = await importWebsite();
      if (result && result.ok) {
        showSuccess(`Страница проиндексирована!\n\nДокумент: ${result.doc_id}\nСимволов: ${result.chars_indexed}`, {
          title: 'Готово ✓'
        });
      } else if (result === true) {
        // Случай когда URL пустой
        return;
      } else {
        showError('Не удалось проиндексировать страницу');
      }
    } finally {
      setIngestingWebsite(false);
    }
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
        showWarning('Пожалуйста, введите название ассистента');
        return;
      }

      setIsLoading(true);
      try {
        const assistant = await createAssistant();
        updateWizardData({ assistantId: assistant.id });
      } catch (error) {
        showError('Ошибка создания ассистента: ' + error.message);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (currentStep === 2) {
      // Настраиваем канал работы ассистента
      setIsLoading(true);
      try {
        if (wizardData.integrationChannel === 'telegram') {
          if (!wizardData.telegramToken.trim()) {
            showWarning('Введите токен Telegram бота');
            setIsLoading(false);
            return;
          }
          const botInfo = await validateTelegramToken(wizardData.telegramToken);
          if (!botInfo) {
            showError('Неверный токен Telegram бота');
            setIsLoading(false);
            return;
          }
          await createBotInstance();
          updateWizardData({ botUrl: `https://t.me/${botInfo.username}` });
        } else if (wizardData.integrationChannel === 'website') {
          // Веб-виджет настраивается позже в настройках ассистента
          // Не генерируем embed-код на этом этапе
        }
      } catch (error) {
        showError('Ошибка настройки интеграции: ' + error.message);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (currentStep === 3) {
      // Импорт сайта (если указан) и загрузка документов
      setIsLoading(true);
      try {
        if (wizardData.assistantId) {
          await importWebsite();
        }
        if (wizardData.documents.length > 0) {
          await uploadDocuments();
        }
        updateWizardData({ isComplete: true });
      } catch (error) {
        // inline notice уже показан при 402
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

  const wizardContent = (
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

        {/* Компактные табы с аккуратным индикатором */}
        <div className={styles.progressContainer}>
          <div className={styles.tabs}>
            <div
              className={styles.tabIndicator}
              style={{
                left: `calc(${currentStep - 1} * (100% / ${steps.length}))`,
                width: `calc(100% / ${steps.length})`
              }}
            />
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`${styles.tabItem} ${currentStep === step.id ? styles.active : ''}`}
                onClick={() => goToStep(step.id)}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        {/* Контент шагов */}
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            {/* Шаг 1: Основное */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>Основное</h3>
                  <p>Дайте название и при необходимости задайте системное сообщение. Можно изменить позже.</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Название *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Например: Клиентский ассистент"
                    value={wizardData.name}
                    onChange={(e) => updateWizardData({ name: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Шаблоны инструкций</label>
                  <div className={styles.templateGrid}>
                    {promptTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`${styles.templateCard} ${
                          wizardData.template === template.id ? styles.selected : ''
                        }`}
                        onClick={() => updateWizardData({ template: template.id })}
                      >
                        <div className={styles.templateHeader}>
                          <span className={styles.templateIcon} aria-hidden>
                            {(() => { const Icon = templateIconMap[template.id] || FiGrid; return <Icon size={14} />; })()}
                          </span>
                          <h4 className={styles.templateTitle}>{template.name}</h4>
                        </div>
                        <p className={styles.templateDesc}>{template.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Инструкция ассистенту (системное сообщение) — необязательно</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Кратко опишите стиль и правила ответа. Можно оставить пустым."
                    value={wizardData.customPrompt}
                    onChange={(e) => updateWizardData({ customPrompt: e.target.value })}
                    rows={4}
                  />
                </div>
              </motion.div>
            )}

            {/* Шаг 2: Где будет работать */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>Каналы</h3>
                  <p>Выберите, где пользователи будут общаться с ассистентом</p>
                </div>

                <div className={styles.integrationGrid}>
                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'telegram' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'telegram' })}
                  >
                    <div className={styles.integrationHeader}>
                      <span className={styles.integrationIcon}><FiSend size={16} /></span>
                      <h4 className={styles.integrationTitle}>Telegram бот</h4>
                    </div>
                    <p className={styles.integrationDesc}>Чат в Telegram. Нужен токен бота из @BotFather.</p>
                  </div>

                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'website' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'website' })}
                  >
                    <div className={styles.integrationHeader}>
                      <span className={styles.integrationIcon}><FiMonitor size={16} /></span>
                      <h4 className={styles.integrationTitle}>Веб‑виджет</h4>
                    </div>
                    <p className={styles.integrationDesc}>Кнопка и окно чата на вашем сайте.</p>
                  </div>

                  <div
                    className={`${styles.integrationCard} ${
                      wizardData.integrationChannel === 'later' ? styles.selected : ''
                    }`}
                    onClick={() => updateWizardData({ integrationChannel: 'later' })}
                  >
                    <div className={styles.integrationHeader}>
                      <span className={styles.integrationIcon}><FiSettings size={16} /></span>
                      <h4 className={styles.integrationTitle}>Настрою позже</h4>
                    </div>
                    <p className={styles.integrationDesc}>Можно вернуться к настройке в любое время</p>
                  </div>
                </div>

                {wizardData.integrationChannel === 'website' && (
                  <div className={styles.inlineNoticeInfo}>
                    Для настройки веб-виджета перейдите в настройки ассистента после его создания
                  </div>
                )}

                {wizardData.integrationChannel === 'telegram' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Токен Telegram бота *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      value={wizardData.telegramToken}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateWizardData({ telegramToken: value });
                        setTelegramValidation({ status: value.trim() ? 'checking' : 'idle', botUsername: '' });
                        if (telegramValidateTimeoutRef.current) clearTimeout(telegramValidateTimeoutRef.current);
                        if (value.trim()) {
                          telegramValidateTimeoutRef.current = setTimeout(async () => {
                            const result = await validateTelegramToken(value.trim());
                            if (result && result.username) {
                              setTelegramValidation({ status: 'valid', botUsername: result.username });
                            } else {
                              setTelegramValidation({ status: 'invalid', botUsername: '' });
                            }
                          }, 500);
                        }
                      }}
                    />
                    <p className={styles.inputHint}>
                      Получить токен у <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">@BotFather</a>
                    </p>
                    {telegramValidation.status === 'checking' && (
                      <p className={styles.inputHint}>Проверяем токен…</p>
                    )}
                    {telegramValidation.status === 'valid' && (
                      <p className={styles.successText}>Токен валиден. Бот: @
                        <span style={{ fontWeight: 600 }}>{telegramValidation.botUsername}</span>
                      </p>
                    )}
                    {telegramValidation.status === 'invalid' && (
                      <p className={styles.errorText}>Токен недействителен. Проверьте и попробуйте снова.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Шаг 3: Документы (необязательно) */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.stepContent}
              >
                <div className={styles.stepHeader}>
                  <h3>Документы <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginLeft: 8 }}>(необязательно)</span></h3>
                  <p>Загрузите файлы, которые будут использоваться ассистентом для ответов</p>
                </div>

                {showBalanceInline && (
                  <div className={styles.inlineNoticeError} role="alert">
                    Недостаточно средств на балансе.{' '}
                    <button className={styles.linkButton} onClick={() => { window.location.href = '/balance'; }}>Перейти к балансу</button>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>URL страницы для добавления в знания (по желанию)</label>
                  <input
                    type="url"
                    className={styles.input}
                    placeholder="https://example.com/page"
                    value={wizardData.websiteUrl}
                    onChange={(e) => updateWizardData({ websiteUrl: e.target.value })}
                  />
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Мы проиндексируем только эту страницу и добавим её в базу знаний ассистента
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className={styles.nextButton}
                      onClick={handleWebsiteIngest}
                      disabled={ingestingWebsite || !wizardData.websiteUrl || !wizardData.assistantId}
                      title={!wizardData.assistantId ? 'Сначала создайте ассистента' : ''}
                    >
                      {ingestingWebsite ? (
                        <>
                          <FiRefreshCw size={16} className={styles.spinning} />
                          Индексируем страницу...
                        </>
                      ) : (
                        <>
                          <FiLink size={16} />
                          Индексировать страницу
                        </>
                      )}
                    </button>
                  </div>
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
                    <h4>Выбранные файлы ({wizardData.documents.length})</h4>
                    <p className={styles.inputHint}>Файлы будут использоваться как база знаний этого ассистента.</p>
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

                  {wizardData.integrationChannel === 'website' && (
                    <div className={styles.resultCard}>
                      <h4>Веб-виджет</h4>
                      <p>Для настройки и получения кода веб-виджета перейдите в настройки ассистента. Там вы сможете настроить внешний вид, домены и другие параметры виджета.</p>
                      <div style={{ marginTop: '16px' }}>
                        <button
                          className={styles.settingsButton}
                          onClick={() => {
                            window.location.href = `/assistant/${wizardData.assistantId}`;
                          }}
                          style={{ fontSize: '14px', padding: '8px 12px' }}
                        >
                          <FiSettings size={16} />
                          Перейти к настройкам
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
                    window.location.href = `/ai-assistant?assistant_id=${wizardData.assistantId}`;
                  }}
                >
                  <FiSettings size={16} />
                  Открыть ассистента
                </button>
                {wizardData.integrationChannel === 'telegram' && (
                  <button
                    className={styles.testButton}
                    onClick={() => {
                      if (wizardData.botUrl) {
                        window.open(wizardData.botUrl, '_blank');
                      }
                    }}
                  >
                    <FiPlay size={16} />
                    Открыть в Telegram
                  </button>
                )}
                {/* Убраны: кнопка "Скопировать код" и "Документы ассистента" из футера */}
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

        {/* Inline notice 402 добавлен в шаге Документы */}
      </motion.div>
    </div>
  );

  return createPortal(wizardContent, document.body);
};

export default QuickAssistantWizard;