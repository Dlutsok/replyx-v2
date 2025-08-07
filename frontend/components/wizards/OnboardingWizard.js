import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/components/OnboardingWizard.module.css';
import { 
  FiCheck, FiArrowRight, FiArrowLeft, FiX, FiUser, FiMessageSquare, 
  FiCpu, FiZap, FiTarget, FiPlay, FiStar, FiHeart, FiCoffee 
} from 'react-icons/fi';

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Добро пожаловать в ChatAI! 🎉",
    description: "Мы поможем вам создать вашего первого AI-ассистента за 3 минуты",
    icon: FiPlay,
    content: "welcome"
  },
  {
    id: 2,
    title: "Расскажите о себе",
    description: "Это поможет нам персонализировать ваш опыт",
    icon: FiUser,
    content: "profile"
  },
  {
    id: 3,
    title: "Выберите шаблон ассистента",
    description: "Готовые настройки для быстрого старта",
    icon: FiCpu,
    content: "template"
  },
  {
    id: 4,
    title: "Настройте личность",
    description: "Сделайте ассистента уникальным",
    icon: FiHeart,
    content: "personality"
  },
  {
    id: 5,
    title: "Готово! 🚀",
    description: "Ваш AI-ассистент готов к работе",
    icon: FiStar,
    content: "complete"
  }
];

const ASSISTANT_TEMPLATES = [
  {
    id: 'customer_support',
    name: 'Служба поддержки',
    description: 'Отвечает на вопросы клиентов, решает проблемы',
    icon: '🎧',
    popular: true,
    prompt: 'Ты — дружелюбный специалист службы поддержки. Помогаешь клиентам решать их вопросы быстро и эффективно.'
  },
  {
    id: 'sales_assistant',
    name: 'Продажи',
    description: 'Помогает с выбором товаров, консультирует',
    icon: '💼',
    popular: true,
    prompt: 'Ты — опытный консультант по продажам. Помогаешь клиентам выбрать подходящий товар или услугу.'
  },
  {
    id: 'info_assistant',
    name: 'Информационный',
    description: 'Предоставляет информацию о компании',
    icon: 'ℹ️',
    prompt: 'Ты — информационный ассистент. Предоставляешь актуальную информацию о компании и услугах.'
  },
  {
    id: 'booking_assistant',
    name: 'Бронирование',
    description: 'Помогает записаться на услуги',
    icon: '📅',
    prompt: 'Ты — ассистент для записи на услуги. Помогаешь клиентам выбрать удобное время и забронировать услугу.'
  },
  {
    id: 'custom',
    name: 'Свой вариант',
    description: 'Создать с нуля',
    icon: '⚡',
    prompt: 'Ты — полезный AI-ассистент. Отвечаешь на вопросы пользователей дружелюбно и профессионально.'
  }
];

export default function OnboardingWizard({ user, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    businessType: '',
    assistantName: '',
    selectedTemplate: null,
    personality: 'friendly'
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Анимация перехода между шагами
  const goToStep = (step) => {
    if (step === currentStep) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 200);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({ ...formData, selectedTemplate: template });
  };

  const createAssistant = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/assistants/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.assistantName || formData.selectedTemplate?.name || 'Мой ассистент',
          system_prompt: formData.selectedTemplate?.prompt || 'Ты — дружелюбный и полезный AI-ассистент.',
          ai_model: 'gpt-4o-mini'
        })
      });

      if (response.ok) {
        // Отмечаем онбординг как завершенный
        await fetch('http://localhost:8000/api/users/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        onComplete();
      } else {
        throw new Error('Ошибка создания ассистента');
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      alert('Произошла ошибка при создании ассистента');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (currentStep === ONBOARDING_STEPS.length) {
      createAssistant();
    } else {
      nextStep();
    }
  };

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS.find(s => s.id === currentStep);
    
    switch (step.content) {
      case 'welcome':
        return (
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeIcon}>
                              <FiPlay size={64} />
            </div>
            <h2>Добро пожаловать в ChatAI!</h2>
            <p>Мы создадим вашего первого AI-ассистента всего за несколько шагов.</p>
            <div className={styles.benefitsList}>
              <div className={styles.benefit}>
                <FiZap size={20} />
                <span>Быстрая настройка за 3 минуты</span>
              </div>
              <div className={styles.benefit}>
                <FiTarget size={20} />
                <span>Готовые шаблоны для вашей сферы</span>
              </div>
              <div className={styles.benefit}>
                <FiMessageSquare size={20} />
                <span>Сразу готов отвечать клиентам</span>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className={styles.profileContent}>
            <h2>Расскажите о вашем бизнесе</h2>
            <p>Это поможет подобрать подходящий шаблон ассистента</p>
            
            <div className={styles.inputGroup}>
              <label>Сфера деятельности</label>
              <select 
                value={formData.businessType} 
                onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                className={styles.select}
              >
                <option value="">Выберите сферу</option>
                <option value="ecommerce">Интернет-магазин</option>
                <option value="services">Услуги</option>
                <option value="education">Образование</option>
                <option value="healthcare">Медицина</option>
                <option value="restaurant">Ресторан/Кафе</option>
                <option value="beauty">Красота и здоровье</option>
                <option value="tech">IT и технологии</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Имя ассистента</label>
              <input
                type="text"
                placeholder="Например: Анна, Помощник, Консультант"
                value={formData.assistantName}
                onChange={(e) => setFormData({...formData, assistantName: e.target.value})}
                className={styles.input}
              />
            </div>
          </div>
        );

      case 'template':
        return (
          <div className={styles.templateContent}>
            <h2>Выберите шаблон ассистента</h2>
            <p>Готовые настройки для быстрого старта</p>
            
            <div className={styles.templatesGrid}>
              {ASSISTANT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`${styles.templateCard} ${
                    formData.selectedTemplate?.id === template.id ? styles.selected : ''
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  {template.popular && <div className={styles.popularBadge}>Популярный</div>}
                  <div className={styles.templateIcon}>{template.icon}</div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'personality':
        return (
          <div className={styles.personalityContent}>
            <h2>Настройте стиль общения</h2>
            <p>Как ваш ассистент должен общаться с клиентами?</p>
            
            <div className={styles.personalityOptions}>
              <div 
                className={`${styles.personalityCard} ${
                  formData.personality === 'friendly' ? styles.selected : ''
                }`}
                onClick={() => setFormData({...formData, personality: 'friendly'})}
              >
                <FiHeart size={32} />
                <h3>Дружелюбный</h3>
                <p>Теплое и личное общение</p>
              </div>
              
              <div 
                className={`${styles.personalityCard} ${
                  formData.personality === 'professional' ? styles.selected : ''
                }`}
                onClick={() => setFormData({...formData, personality: 'professional'})}
              >
                <FiUser size={32} />
                <h3>Профессиональный</h3>
                <p>Деловой и компетентный стиль</p>
              </div>
              
              <div 
                className={`${styles.personalityCard} ${
                  formData.personality === 'casual' ? styles.selected : ''
                }`}
                onClick={() => setFormData({...formData, personality: 'casual'})}
              >
                <FiCoffee size={32} />
                <h3>Неформальный</h3>
                <p>Расслабленное общение</p>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className={styles.completeContent}>
            <div className={styles.successIcon}>
              <FiCheck size={64} />
            </div>
            <h2>Поздравляем! 🎉</h2>
            <p>Ваш AI-ассистент готов к работе</p>
            
            <div className={styles.summaryCard}>
              <h3>Настройки ассистента:</h3>
              <div className={styles.summaryItem}>
                <strong>Имя:</strong> {formData.assistantName || 'AI-ассистент'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Шаблон:</strong> {formData.selectedTemplate?.name || 'Стандартный'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Стиль:</strong> {formData.personality === 'friendly' ? 'Дружелюбный' : 
                                          formData.personality === 'professional' ? 'Профессиональный' : 'Неформальный'}
              </div>
            </div>
            
            <div className={styles.nextSteps}>
              <h4>Что дальше?</h4>
              <ul>
                <li>Протестируйте ассистента в разделе "Диалоги"</li>
                <li>Загрузите документы для обучения</li>
                <li>Настройте интеграции с мессенджерами</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.onboardingOverlay}>
      <div className={styles.onboardingContainer}>
        {/* Заголовок с прогрессом */}
        <div className={styles.header}>
          <div className={styles.progress}>
            <div className={styles.progressSteps}>
              {ONBOARDING_STEPS.map((step, index) => (
                <div 
                  key={step.id}
                  className={`${styles.progressStep} ${
                    step.id <= currentStep ? styles.completed : ''
                  } ${step.id === currentStep ? styles.current : ''}`}
                >
                  <div className={styles.stepNumber}>
                    {step.id < currentStep ? <FiCheck size={16} /> : step.id}
                  </div>
                  <span className={styles.stepTitle}>{step.title}</span>
                </div>
              ))}
            </div>
            <div 
              className={styles.progressBar}
              style={{ width: `${(currentStep / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
          
          <button 
            className={styles.skipButton}
            onClick={onSkip}
          >
            <FiX size={20} />
            Пропустить
          </button>
        </div>

        {/* Контент шага */}
        <div className={`${styles.stepContent} ${isAnimating ? styles.animating : ''}`}>
          {renderStepContent()}
        </div>

        {/* Навигация */}
        <div className={styles.navigation}>
          {currentStep > 1 && (
            <button 
              className={styles.backButton}
              onClick={prevStep}
            >
              <FiArrowLeft size={20} />
              Назад
            </button>
          )}
          
          <div className={styles.spacer} />
          
          <button 
            className={styles.nextButton}
            onClick={handleComplete}
            disabled={isLoading || (currentStep === 3 && !formData.selectedTemplate)}
          >
            {isLoading ? (
              'Создаем...'
            ) : currentStep === ONBOARDING_STEPS.length ? (
              'Начать работу'
            ) : (
              <>
                Далее
                <FiArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 