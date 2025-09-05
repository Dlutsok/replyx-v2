import React, { useState, useEffect } from 'react';
import { 
  FiX, FiArrowRight, FiArrowLeft, FiCheck, FiZap, FiMessageSquare, 
  FiSettings, FiUser, FiFileText, FiPlay, FiCheckCircle, FiInfo,
  FiSun, FiTarget, FiTrendingUp, FiUsers, FiHeart, FiCpu,
  FiMic, FiEye, FiBook, FiShield
} from 'react-icons/fi';
import styles from '../../styles/components/BotCreationWizard.module.css';
import { useNotifications } from '../../hooks/useNotifications';

const BotCreationWizard = ({ isOpen, onClose, onComplete, user }) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [currentStep, setCurrentStep] = useState(1);
  const [botData, setBotData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    personality: 'helpful',
    language: 'ru',
    industry: '',
    useCase: '',
    tone: 'friendly',
    expertise: [],
    integrations: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [createdBotId, setCreatedBotId] = useState(null);
  const [currentExample, setCurrentExample] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Цель и назначение',
      subtitle: 'Определим, что будет делать ваш AI-ассистент',
      icon: FiTarget,
      fields: ['name', 'industry', 'useCase']
    },
    {
      id: 2,
      title: 'Личность и стиль',
      subtitle: 'Настроим характер и манеру общения бота',
      icon: FiHeart,
      fields: ['personality', 'tone', 'expertise']
    },
    {
      id: 3,
      title: 'Детальная настройка',
      subtitle: 'Создадим описание и системную инструкцию',
      icon: FiCpu,
      fields: ['description', 'systemPrompt']
    },
    {
      id: 4,
      title: 'Создание и запуск',
      subtitle: 'Запустим вашего AI-ассистента',
      icon: FiPlay,
      fields: []
    },
    {
      id: 5,
      title: 'Где будет работать ассистент',
      subtitle: 'Выберите способы использования бота',
      icon: FiZap,
      fields: ['integrations']
    }
  ];

  const industries = [
    { value: 'sales', label: 'Продажи', icon: '💼', description: 'Помощь в продажах, лидогенерация' },
    { value: 'support', label: 'Поддержка', icon: '🎧', description: 'Клиентская поддержка, FAQ' },
    { value: 'education', label: 'Образование', icon: '📚', description: 'Обучение, консультации' },
    { value: 'healthcare', label: 'Медицина', icon: '🏥', description: 'Медицинские консультации' },
    { value: 'retail', label: 'Ритейл', icon: '🛍️', description: 'Помощь покупателям' },
    { value: 'finance', label: 'Финансы', icon: '💰', description: 'Финансовое консультирование' },
    { value: 'realestate', label: 'Недвижимость', icon: '🏠', description: 'Помощь с недвижимостью' },
    { value: 'other', label: 'Другое', icon: '⚡', description: 'Другая сфера деятельности' }
  ];

  const useCases = {
    sales: [
      { value: 'lead_qualification', label: 'Квалификация лидов', description: 'Определение качества потенциальных клиентов' },
      { value: 'product_consultation', label: 'Консультации по товарам', description: 'Помощь в выборе продуктов' },
      { value: 'appointment_booking', label: 'Запись на встречи', description: 'Организация встреч с менеджерами' }
    ],
    support: [
      { value: 'faq_assistant', label: 'FAQ помощник', description: 'Ответы на частые вопросы' },
      { value: 'technical_support', label: 'Техподдержка', description: 'Решение технических проблем' },
      { value: 'order_tracking', label: 'Отслеживание заказов', description: 'Информация о статусе заказов' }
    ],
    education: [
      { value: 'tutor', label: 'Персональный репетитор', description: 'Индивидуальное обучение' },
      { value: 'course_assistant', label: 'Помощник по курсам', description: 'Сопровождение обучения' },
      { value: 'exam_prep', label: 'Подготовка к экзаменам', description: 'Помощь в подготовке к тестам' }
    ],
    healthcare: [
      { value: 'symptom_checker', label: 'Проверка симптомов', description: 'Первичная оценка симптомов' },
      { value: 'appointment_scheduler', label: 'Запись к врачу', description: 'Организация медицинских приемов' },
      { value: 'medication_reminder', label: 'Напоминания о лекарствах', description: 'Контроль приема препаратов' }
    ],
    retail: [
      { value: 'personal_shopper', label: 'Персональный шоппер', description: 'Помощь в выборе товаров' },
      { value: 'size_consultant', label: 'Консультант по размерам', description: 'Подбор правильного размера' },
      { value: 'style_advisor', label: 'Стилист-консультант', description: 'Советы по стилю и моде' }
    ],
    finance: [
      { value: 'budget_planner', label: 'Планировщик бюджета', description: 'Помощь в планировании финансов' },
      { value: 'investment_advisor', label: 'Инвестиционный советник', description: 'Консультации по инвестициям' },
      { value: 'loan_assistant', label: 'Помощник по кредитам', description: 'Информация о кредитных продуктах' }
    ],
    realestate: [
      { value: 'property_search', label: 'Поиск недвижимости', description: 'Помощь в поиске объектов' },
      { value: 'valuation_assistant', label: 'Оценка стоимости', description: 'Предварительная оценка объектов' },
      { value: 'market_analyst', label: 'Анализ рынка', description: 'Информация о рынке недвижимости' }
    ],
    other: [
      { value: 'general_assistant', label: 'Универсальный помощник', description: 'Помощь в различных вопросах' },
      { value: 'custom_solution', label: 'Индивидуальное решение', description: 'Создание под конкретные задачи' }
    ]
  };

  const personalities = [
    { 
      value: 'helpful', 
      label: 'Дружелюбный помощник', 
      icon: '😊',
      description: 'Теплый, отзывчивый, всегда готов помочь',
      example: 'Привет! Я рад тебя видеть! Расскажи, чем могу помочь? 😊'
    },
    { 
      value: 'professional', 
      label: 'Деловой эксперт', 
      icon: '💼',
      description: 'Компетентный, четкий, профессиональный',
      example: 'Здравствуйте! Готов предоставить профессиональную консультацию по вашему вопросу.'
    },
    { 
      value: 'creative', 
      label: 'Креативный партнер', 
      icon: '🎨',
      description: 'Творческий, вдохновляющий, нестандартный',
      example: 'Вау! Какая интересная задача! Давайте найдем креативное решение! ✨'
    },
    { 
      value: 'analytical', 
      label: 'Аналитический ум', 
      icon: '📊',
      description: 'Логичный, структурированный, детальный',
      example: 'Проанализируем ситуацию пошагово. Рассмотрим данные и найдем оптимальное решение.'
    },
    { 
      value: 'mentor', 
      label: 'Мудрый наставник', 
      icon: '🎓',
      description: 'Терпеливый, обучающий, мотивирующий',
      example: 'Отличный вопрос! Давайте разберем это вместе, и ты поймешь принцип.'
    },
    { 
      value: 'energetic', 
      label: 'Энергичный мотиватор', 
      icon: '⚡',
      description: 'Активный, вдохновляющий, позитивный',
      example: 'Давайте действовать! У нас все получится! Вперед к достижению целей! 🚀'
    }
  ];

  const tones = [
    { value: 'friendly', label: 'Дружелюбный', description: 'Теплый и приветливый' },
    { value: 'formal', label: 'Формальный', description: 'Вежливый и официальный' },
    { value: 'casual', label: 'Неформальный', description: 'Расслабленный и простой' },
    { value: 'enthusiastic', label: 'Воодушевленный', description: 'Энергичный и мотивирующий' }
  ];

  const expertiseAreas = [
    { value: 'customer_service', label: 'Обслуживание клиентов', icon: '🤝' },
    { value: 'sales_techniques', label: 'Техники продаж', icon: '📈' },
    { value: 'product_knowledge', label: 'Знание продуктов', icon: '📦' },
    { value: 'technical_support', label: 'Техническая поддержка', icon: '🔧' },
    { value: 'marketing', label: 'Маркетинг', icon: '📢' },
    { value: 'analytics', label: 'Аналитика', icon: '📊' },
    { value: 'psychology', label: 'Психология общения', icon: '🧠' },
    { value: 'negotiation', label: 'Переговоры', icon: '🤝' }
  ];

  const integrationOptions = [
    {
      value: 'website_widget',
      label: 'Виджет на сайт',
      icon: '🌐',
      description: 'Встроить чат-бота на ваш сайт',
      difficulty: 'Легко',
      time: '5 минут',
      features: ['Готовый код', 'Настройка дизайна', 'Аналитика']
    },
    {
      value: 'telegram',
      label: 'Telegram бот',
      icon: '💬',
      description: 'Создать бота в Telegram',
      difficulty: 'Средне',
      time: '10 минут',
      features: ['Автоматическая настройка', 'Уведомления', 'Группы']
    },
    {
      value: 'whatsapp',
      label: 'WhatsApp Business',
      icon: '📱',
      description: 'Интеграция с WhatsApp Business',
      difficulty: 'Средне',
      time: '15 минут',
      features: ['API интеграция', 'Автоответы', 'Каталог']
    },
    {
      value: 'vk',
      label: 'ВКонтакте',
      icon: '🔵',
      description: 'Бот для сообществ ВК',
      difficulty: 'Средне',
      time: '10 минут',
      features: ['Группы и страницы', 'Клавиатуры', 'Рассылки']
    },
    {
      value: 'api',
      label: 'API интеграция',
      icon: '⚙️',
      description: 'Подключить через API',
      difficulty: 'Сложно',
      time: '30+ минут',
      features: ['REST API', 'Webhooks', 'Документация']
    },
    {
      value: 'iframe',
      label: 'Встроенный чат',
      icon: '💻',
      description: 'Iframe для встраивания',
      difficulty: 'Легко',
      time: '2 минуты',
      features: ['Готовый код', 'Адаптивный', 'Кастомизация']
    }
  ];

  const examples = [
    {
      industry: 'sales',
      useCase: 'lead_qualification',
      name: 'СейлсБот Про',
      description: 'Профессиональный помощник по продажам, который квалифицирует лидов, консультирует по продуктам и помогает закрывать сделки.',
      personality: 'professional',
      tone: 'friendly'
    },
    {
      industry: 'support',
      useCase: 'faq_assistant',
      name: 'СаппортГений',
      description: 'Умный помощник техподдержки, который мгновенно отвечает на вопросы клиентов и решает типичные проблемы.',
      personality: 'helpful',
      tone: 'friendly'
    },
    {
      industry: 'education',
      useCase: 'tutor',
      name: 'УчительAI',
      description: 'Персональный репетитор, который объясняет сложные темы простым языком и помогает в обучении.',
      personality: 'mentor',
      tone: 'friendly'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsCompleted(false);
      setCreatedBotId(null);
      setBotData({
        name: '',
        description: '',
        systemPrompt: '',
        personality: 'helpful',
        language: 'ru',
        industry: '',
        useCase: '',
        tone: 'friendly',
        expertise: [],
        integrations: []
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % examples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field, value) => {
    setBotData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExpertiseToggle = (expertise) => {
    setBotData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(expertise)
        ? prev.expertise.filter(e => e !== expertise)
        : [...prev.expertise, expertise]
    }));
  };

  const handleIntegrationToggle = (integration) => {
    setBotData(prev => ({
      ...prev,
      integrations: prev.integrations.includes(integration)
        ? prev.integrations.filter(i => i !== integration)
        : [...prev.integrations, integration]
    }));
  };

  const useExample = (example) => {
    setBotData(prev => ({
      ...prev,
      ...example
    }));
  };

  const getSystemPromptForBot = () => {
    const selectedPersonality = personalities.find(p => p.value === botData.personality);
    const selectedIndustry = industries.find(i => i.value === botData.industry);
    const selectedUseCase = useCases[botData.industry]?.find(u => u.value === botData.useCase);
    
    let prompt = `Ты ${selectedPersonality?.label.toLowerCase()} в сфере "${selectedIndustry?.label}". `;
    
    if (selectedUseCase) {
      prompt += `Твоя основная задача: ${selectedUseCase.description}. `;
    }
    
    prompt += `\n\nТвой стиль общения: ${botData.tone === 'friendly' ? 'дружелюбный и теплый' : 
                                        botData.tone === 'formal' ? 'вежливый и официальный' :
                                        botData.tone === 'casual' ? 'неформальный и простой' :
                                        'энергичный и мотивирующий'}. `;
    
    if (botData.expertise.length > 0) {
      const expertiseLabels = botData.expertise.map(e => 
        expertiseAreas.find(ea => ea.value === e)?.label
      ).join(', ');
      prompt += `\n\nТвои области экспертизы: ${expertiseLabels}. `;
    }
    
    prompt += `\n\nВсегда помогай пользователю достичь его целей, будь внимательным к деталям и предлагай конкретные решения.`;
    
    return prompt;
  };

  const handleCreateBot = async () => {
    setIsCreating(true);
    
    try {
      const token = localStorage.getItem('token');
      const systemPrompt = botData.systemPrompt || getSystemPromptForBot();
      
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: botData.name,
          description: botData.description,
          system_prompt: systemPrompt,
          personality: botData.personality,
          language: botData.language
        })
      });

      if (response.ok) {
        const newBot = await response.json();
        setCreatedBotId(newBot.id);
        setIsCompleted(true);
        
        // Отмечаем первого бота как созданного
        try {
          await fetch('/api/users/onboarding/mark-bot-created', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (onboardingError) {
          console.warn('Ошибка при обновлении статуса онбординга:', onboardingError);
        }
        
      } else {
        const errorData = await response.text();
        console.error('Ошибка API:', errorData);
        throw new Error(`Ошибка создания бота: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Ошибка создания бота:', error);
      showError('Произошла ошибка при создании бота. Попробуйте еще раз.', { title: 'Ошибка создания' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return botData.name.trim() && botData.industry && botData.useCase;
      case 2:
        return botData.personality && botData.tone;
      case 3:
        return botData.description.trim();
      case 4:
        return true;
      case 5:
        return botData.integrations.length > 0;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>Создание AI-ассистента</h2>
            <p className={styles.subtitle}>
              Настройте умного помощника под ваши задачи за 5 простых шагов
            </p>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.progressBar}>
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`${styles.progressStep} ${
                step.id <= currentStep ? styles.active : ''
              } ${step.id < currentStep ? styles.completed : ''}`}
            >
              <div className={styles.stepNumber}>
                {step.id < currentStep ? <FiCheck size={16} /> : step.id}
              </div>
              <span className={styles.stepLabel}>{step.title}</span>
            </div>
          ))}
        </div>

        <div className={styles.content}>
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FiTarget className={styles.stepIcon} />
                <div>
                  <h3 className={styles.stepTitle}>Цель и назначение</h3>
                  <p className={styles.stepDescription}>
                    Определим, в какой сфере будет работать ваш AI-ассистент и какие задачи решать
                  </p>
                </div>
              </div>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiSun className={styles.labelIcon} />
                    Сфера деятельности *
                  </label>
                  <div className={styles.industryGrid}>
                    {industries.map((industry) => (
                      <div
                        key={industry.value}
                        className={`${styles.industryCard} ${
                          botData.industry === industry.value ? styles.selected : ''
                        }`}
                        onClick={() => handleInputChange('industry', industry.value)}
                      >
                        <div className={styles.industryIcon}>{industry.icon}</div>
                        <h4 className={styles.industryTitle}>{industry.label}</h4>
                        <p className={styles.industryDescription}>{industry.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {botData.industry && (
                  <div className={styles.field}>
                    <label className={styles.label}>
                      <FiTarget className={styles.labelIcon} />
                      Основная задача *
                    </label>
                    <div className={styles.useCaseGrid}>
                      {useCases[botData.industry]?.map((useCase) => (
                        <div
                          key={useCase.value}
                          className={`${styles.useCaseCard} ${
                            botData.useCase === useCase.value ? styles.selected : ''
                          }`}
                          onClick={() => handleInputChange('useCase', useCase.value)}
                        >
                          <h4 className={styles.useCaseTitle}>{useCase.label}</h4>
                          <p className={styles.useCaseDescription}>{useCase.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiUser className={styles.labelIcon} />
                    Имя AI-ассистента *
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Например: СейлсБот Про, СаппортГений, УчительAI"
                    value={botData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                  <div className={styles.hint}>
                    <FiInfo size={14} />
                    Выберите запоминающееся имя, которое отражает функцию бота
                  </div>
                </div>

                {examples.length > 0 && (
                  <div className={styles.exampleCard}>
                    <div className={styles.exampleHeader}>
                      <FiSun className={styles.exampleIcon} />
                      <span>Пример настройки</span>
                    </div>
                    <div className={styles.exampleContent}>
                      <h4>{examples[currentExample].name}</h4>
                      <p>{examples[currentExample].description}</p>
                      <button 
                        className={styles.useExampleButton}
                        onClick={() => useExample(examples[currentExample])}
                      >
                        Использовать этот пример
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FiHeart className={styles.stepIcon} />
                <div>
                  <h3 className={styles.stepTitle}>Личность и стиль общения</h3>
                  <p className={styles.stepDescription}>
                    Настроим характер бота - от дружелюбного помощника до строгого эксперта
                  </p>
                </div>
              </div>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiHeart className={styles.labelIcon} />
                    Тип личности *
                  </label>
                  <div className={styles.personalityGrid}>
                    {personalities.map((personality) => (
                      <div
                        key={personality.value}
                        className={`${styles.personalityCard} ${
                          botData.personality === personality.value ? styles.selected : ''
                        }`}
                        onClick={() => handleInputChange('personality', personality.value)}
                      >
                        <div className={styles.personalityIcon}>{personality.icon}</div>
                        <h4 className={styles.personalityTitle}>{personality.label}</h4>
                        <p className={styles.personalityDescription}>{personality.description}</p>
                        <div className={styles.personalityExample}>
                          <strong>Пример:</strong> "{personality.example}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiMic className={styles.labelIcon} />
                    Стиль общения *
                  </label>
                  <div className={styles.toneGrid}>
                    {tones.map((tone) => (
                      <div
                        key={tone.value}
                        className={`${styles.toneCard} ${
                          botData.tone === tone.value ? styles.selected : ''
                        }`}
                        onClick={() => handleInputChange('tone', tone.value)}
                      >
                        <h4 className={styles.toneTitle}>{tone.label}</h4>
                        <p className={styles.toneDescription}>{tone.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiCpu className={styles.labelIcon} />
                    Области экспертизы (необязательно)
                  </label>
                  <div className={styles.expertiseGrid}>
                    {expertiseAreas.map((expertise) => (
                      <div
                        key={expertise.value}
                        className={`${styles.expertiseCard} ${
                          botData.expertise.includes(expertise.value) ? styles.selected : ''
                        }`}
                        onClick={() => handleExpertiseToggle(expertise.value)}
                      >
                        <span className={styles.expertiseIcon}>{expertise.icon}</span>
                        <span className={styles.expertiseLabel}>{expertise.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.hint}>
                    <FiInfo size={14} />
                    Выберите области, в которых бот должен быть особенно компетентным
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FiCpu className={styles.stepIcon} />
                <div>
                  <h3 className={styles.stepTitle}>Детальная настройка</h3>
                  <p className={styles.stepDescription}>
                    Опишем функции бота и создадим системную инструкцию для оптимальной работы
                  </p>
                </div>
              </div>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiFileText className={styles.labelIcon} />
                    Подробное описание *
                  </label>
                  <textarea
                    className={styles.textarea}
                    placeholder={`Опишите, что умеет ваш бот:
• Какие вопросы отвечает
• Какие задачи решает  
• Как помогает пользователям
• Какой результат дает

Пример: "Помогает посетителям магазина выбрать подходящий товар, отвечает на вопросы о характеристиках, сравнивает варианты и предлагает альтернативы. Умеет работать с каталогом из 5000+ товаров."`}
                    value={botData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                  />
                  <div className={styles.hint}>
                    <FiInfo size={14} />
                    Подробное описание поможет боту лучше понимать свои задачи
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiSettings className={styles.labelIcon} />
                    Инструкция ассистенту (системное сообщение, необязательно)
                  </label>
                  <div className={styles.promptPreview}>
                    <div className={styles.promptPreviewHeader}>
                      <FiEye size={16} />
                      <span>Автоматически сгенерированная инструкция:</span>
                    </div>
                    <div className={styles.promptPreviewContent}>
                      {getSystemPromptForBot()}
                    </div>
                  </div>
                  <textarea
                    className={styles.textarea}
                    placeholder="Если хотите, напишите свою инструкцию или отредактируйте автоматическую..."
                    value={botData.systemPrompt}
                    onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                    rows={4}
                  />
                  <div className={styles.hint}>
                    <FiInfo size={14} />
                    Оставьте пустым для использования автоматической инструкции или напишите свою
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && !isCompleted && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FiPlay className={styles.stepIcon} />
                <div>
                  <h3 className={styles.stepTitle}>Создание и запуск</h3>
                  <p className={styles.stepDescription}>
                    Проверим настройки и создадим вашего AI-ассистента
                  </p>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <h4 className={styles.summaryTitle}>🤖 Итоговые настройки бота</h4>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <strong>🏷️ Имя:</strong> {botData.name}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>🏢 Сфера:</strong> {industries.find(i => i.value === botData.industry)?.label}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>🎯 Задача:</strong> {useCases[botData.industry]?.find(u => u.value === botData.useCase)?.label}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>😊 Личность:</strong> {personalities.find(p => p.value === botData.personality)?.label}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>🗣️ Стиль:</strong> {tones.find(t => t.value === botData.tone)?.label}
                  </div>
                  {botData.expertise.length > 0 && (
                    <div className={styles.summaryItem}>
                      <strong>🧠 Экспертиза:</strong> {botData.expertise.length} областей
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.launchCard}>
                <div className={styles.launchHeader}>
                  <FiZap className={styles.launchIcon} />
                  <div>
                    <h4>Настройки готовы!</h4>
                    <p>На следующем шаге выберите способы интеграции бота</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FiZap className={styles.stepIcon} />
                <div>
                  <h3 className={styles.stepTitle}>Каналы работы ассистента</h3>
                  <p className={styles.stepDescription}>
                    Выберите, как пользователи будут общаться с вашим AI-ассистентом
                  </p>
                </div>
              </div>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <FiZap className={styles.labelIcon} />
                    Выберите каналы работы ассистента *
                  </label>
                  <div className={styles.integrationGrid}>
                    {integrationOptions.map((integration) => (
                      <div
                        key={integration.value}
                        className={`${styles.integrationCard} ${
                          botData.integrations.includes(integration.value) ? styles.selected : ''
                        }`}
                        onClick={() => handleIntegrationToggle(integration.value)}
                      >
                        <div className={styles.integrationHeader}>
                          <div className={styles.integrationIcon}>{integration.icon}</div>
                          <div className={styles.integrationInfo}>
                            <h4 className={styles.integrationTitle}>{integration.label}</h4>
                            <p className={styles.integrationDescription}>{integration.description}</p>
                          </div>
                        </div>
                        <div className={styles.integrationMeta}>
                          <div className={styles.integrationDifficulty}>
                            <span className={`${styles.difficultyBadge} ${styles[integration.difficulty.toLowerCase()]}`}>
                              {integration.difficulty}
                            </span>
                            <span className={styles.integrationTime}>⏱️ {integration.time}</span>
                          </div>
                          <div className={styles.integrationFeatures}>
                            {integration.features.map((feature, index) => (
                              <span key={index} className={styles.featureTag}>
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.hint}>
                    <FiInfo size={14} />
                    Можно выбрать несколько каналов. Настройка будет доступна после создания бота.
                  </div>
                </div>

                {botData.integrations.length > 0 && (
                  <div className={styles.integrationPreview}>
                    <h4>🚀 Выбранные интеграции:</h4>
                    <div className={styles.selectedIntegrations}>
                      {botData.integrations.map((integrationValue) => {
                        const integration = integrationOptions.find(opt => opt.value === integrationValue);
                        return (
                          <div key={integrationValue} className={styles.selectedIntegration}>
                            <span className={styles.selectedIcon}>{integration.icon}</span>
                            <span className={styles.selectedLabel}>{integration.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className={styles.integrationNote}>
                      После создания бота вы получите подробные инструкции по настройке каждого канала.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isCompleted && (
            <div className={styles.stepContent}>
              <div className={styles.successContent}>
                <div className={styles.successIcon}>
                  <FiCheckCircle size={64} />
                </div>
                <h3 className={styles.successTitle}>🎉 AI-ассистент успешно создан!</h3>
                <p className={styles.successDescription}>
                  Поздравляем! Ваш AI-ассистент "<strong>{botData.name}</strong>" готов к работе.
                  Теперь он может общаться с пользователями и решать поставленные задачи.
                </p>
                
                <div className={styles.successStats}>
                  <div className={styles.successStat}>
                    <FiUsers size={24} />
                    <span>Готов к общению</span>
                  </div>
                  <div className={styles.successStat}>
                    <FiCpu size={24} />
                    <span>Обучен задачам</span>
                  </div>
                  <div className={styles.successStat}>
                    <FiShield size={24} />
                    <span>Безопасен</span>
                  </div>
                </div>
                
                <div className={styles.successActions}>
                  <a 
                    href="/dialogs" 
                    className={styles.testButton}
                  >
                    <FiMessageSquare size={16} />
                    Протестировать бота
                  </a>
                  <a 
                    href="/ai-assistant" 
                    className={styles.settingsButton}
                  >
                    <FiSettings size={16} />
                    Дополнительные настройки
                  </a>
                </div>

                <div className={styles.nextStepsCard}>
                  <h4>🚀 Что делать дальше?</h4>
                  <ul>
                    <li><FiMessageSquare size={16} /> Протестируйте бота в разделе "Диалоги"</li>
                    <li><FiBook size={16} /> Загрузите документы для обучения в разделе "AI-ассистент"</li>
                    <li><FiTrendingUp size={16} /> Следите за статистикой в разделе "Аналитика"</li>
                    <li><FiUsers size={16} /> Интегрируйте бота на сайт или в мессенджеры</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {currentStep > 1 && !isCompleted && (
              <button 
                className={styles.prevButton}
                onClick={handlePrev}
              >
                <FiArrowLeft size={16} />
                Назад
              </button>
            )}
          </div>
          
          <div className={styles.footerRight}>
            {!isCompleted && currentStep < 5 && (
              <button 
                className={`${styles.nextButton} ${!isStepValid(currentStep) ? styles.disabled : ''}`}
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
              >
                Далее
                <FiArrowRight size={16} />
              </button>
            )}
            
            {!isCompleted && currentStep === 5 && (
              <button 
                className={`${styles.createButton} ${!isStepValid(currentStep) ? styles.disabled : ''}`}
                onClick={handleCreateBot}
                disabled={!isStepValid(currentStep) || isCreating}
              >
                {isCreating ? (
                  <>
                    <div className={styles.spinner}></div>
                    Создаем AI-ассистента...
                  </>
                ) : (
                  <>
                    <FiZap size={20} />
                    Создать AI-ассистента
                  </>
                )}
              </button>
            )}
            
            {isCompleted && (
              <button 
                className={styles.completeButton}
                onClick={handleComplete}
              >
                <FiCheck size={16} />
                Завершить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotCreationWizard;