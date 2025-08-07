import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheck, FiX, FiArrowRight, FiArrowLeft, FiUpload, FiLink, 
  FiEye, FiSettings, FiExternalLink, FiRefreshCw, FiCopy,
  FiCheckCircle, FiAlertCircle, FiFile, FiSkipForward, FiGlobe,
  FiCode, FiKey, FiDollarSign
} from 'react-icons/fi';
import styles from '../../styles/components/WebsiteSetupWizard.module.css';

const WebsiteSetupWizard = ({ isOpen, onClose, onComplete, selectedAssistant }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState({
    siteToken: '',
    embedCode: '',
    tokenGenerated: false,
    generating: false,
    filesUploaded: [],
    uploading: false,
    uploadCost: 0,
    testCompleted: false
  });

  const steps = [
    {
      id: 1,
      title: "Настройка виджета",
      description: "Получите токен и код для установки на сайт"
    },
    {
      id: 2,
      title: "База знаний",
      description: "Загрузите файлы для обучения ассистента"
    },
    {
      id: 3,
      title: "Проверка работы",
      description: "Протестируйте виджет на вашем сайте"
    }
  ];

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateTokenAndCode = async () => {
    if (!selectedAssistant) {
      alert('Ассистент не выбран');
      return;
    }

    setStepData(prev => ({ ...prev, generating: true }));
    
    try {
      // Получаем embed код для ассистента
      const response = await fetch(`/api/assistants/${selectedAssistant.id}/embed-code`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStepData(prev => ({ 
          ...prev, 
          siteToken: data.token,
          embedCode: data.embed_code,
          tokenGenerated: true,
          generating: false
        }));
      } else {
        alert('Ошибка генерации токена');
        setStepData(prev => ({ ...prev, generating: false }));
      }
    } catch (error) {
      alert('Ошибка генерации токена');
      setStepData(prev => ({ ...prev, generating: false }));
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      // Показываем уведомление
      const notification = document.createElement('div');
      notification.textContent = type === 'token' ? 'Токен скопирован!' : 'Код скопирован!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 0.75rem;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 2000);
    } catch (err) {
      alert('Не удалось скопировать в буфер обмена');
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = ['.pdf', '.docx', '.txt', '.csv', '.html', '.ics', '.json', '.ods', '.rtf', '.xml', '.xls', '.xlsx'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Валидация файлов
    const validFiles = [];
    let totalCost = 0;
    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        alert(`Файл ${file.name} имеет неподдерживаемый формат`);
        continue;
      }
      if (file.size > maxSize) {
        alert(`Файл ${file.name} слишком большой (максимум 10 МБ)`);
        continue;
      }
      validFiles.push(file);
      totalCost += 5; // 5 рублей за файл
    }

    if (validFiles.length === 0) return;

    setStepData(prev => ({ ...prev, uploading: true, uploadCost: totalCost }));
    
    try {
      const token = localStorage.getItem('token');
      const uploadedFiles = [];

      // Загружаем файлы по одному
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          uploadedFiles.push({
            name: file.name,
            id: result.id,
            status: 'success'
          });
        } else {
          const error = await response.json();
          uploadedFiles.push({
            name: file.name,
            status: 'error',
            error: error.detail || 'Ошибка загрузки'
          });
        }
      }

      setStepData(prev => ({ 
        ...prev, 
        filesUploaded: [...prev.filesUploaded, ...uploadedFiles],
        uploading: false
      }));

      // Показываем результат
      const successCount = uploadedFiles.filter(f => f.status === 'success').length;
      const errorCount = uploadedFiles.filter(f => f.status === 'error').length;
      
      if (successCount > 0) {
        alert(`Успешно загружено ${successCount} файл(ов) в базу знаний`);
      }
      if (errorCount > 0) {
        alert(`Ошибка загрузки ${errorCount} файл(ов)`);
      }

    } catch (error) {
      setStepData(prev => ({ ...prev, uploading: false }));
      alert('Ошибка загрузки файлов');
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const openTestDemo = () => {
    // Открываем демо страницу с виджетом
    const demoUrl = `/chat-iframe?assistant_id=${selectedAssistant?.id}&theme=blue`;
    window.open(demoUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <motion.div 
        className={styles.wizard}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2>Настройка интеграции с сайтом</h2>
          <p>Настройте виджет чата для вашего сайта в 3 простых шага</p>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Progress */}
        <div className={styles.progress}>
          {steps.map((step, index) => (
            <div key={step.id} className={styles.progressStep}>
              <div className={`${styles.progressCircle} ${
                currentStep > step.id ? styles.completed : 
                currentStep === step.id ? styles.active : styles.pending
              }`}>
                {currentStep > step.id ? <FiCheck /> : step.id}
              </div>
              <div className={styles.progressLabel}>
                <div className={styles.progressTitle}>{step.title}</div>
                <div className={styles.progressDescription}>{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`${styles.progressLine} ${
                  currentStep > step.id ? styles.completed : ''
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            {/* Step 1: Widget Setup */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.step}
              >
                <div className={styles.stepHeader}>
                  <h3>🌐 Настройка виджета</h3>
                  <p>Получите бессрочный токен и код для установки виджета на ваш сайт</p>
                </div>

                <div className={styles.widgetSetup}>
                  {!stepData.tokenGenerated ? (
                    <div className={styles.generateSection}>
                      <div className={styles.assistantInfo}>
                        <FiGlobe className={styles.assistantIcon} />
                        <div>
                          <h4>Ассистент: {selectedAssistant?.name}</h4>
                          <p>Будет создан виджет чата для этого ассистента</p>
                        </div>
                      </div>

                      <button 
                        className={styles.generateBtn}
                        onClick={generateTokenAndCode}
                        disabled={stepData.generating}
                      >
                        {stepData.generating ? (
                          <>
                            <FiRefreshCw className={styles.spin} />
                            Генерируем токен и код...
                          </>
                        ) : (
                          <>
                            <FiKey />
                            Сгенерировать токен и код
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.tokenSection}>
                      <div className={styles.successMessage}>
                        <FiCheckCircle className={styles.successIcon} />
                        <div>
                          <div className={styles.successTitle}>
                            Токен и код успешно сгенерированы!
                          </div>
                          <div className={styles.successText}>
                            Токен бессрочный и действует пока существует ассистент
                          </div>
                        </div>
                      </div>

                      {/* Site Token */}
                      <div className={styles.codeBlock}>
                        <div className={styles.codeHeader}>
                          <FiKey />
                          <span>Бессрочный site-токен</span>
                        </div>
                        <div className={styles.codeContent}>
                          <code>{stepData.siteToken}</code>
                          <button 
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(stepData.siteToken, 'token')}
                          >
                            <FiCopy />
                            Скопировать
                          </button>
                        </div>
                      </div>

                      {/* Embed Code */}
                      <div className={styles.codeBlock}>
                        <div className={styles.codeHeader}>
                          <FiCode />
                          <span>Embed-код для сайта</span>
                        </div>
                        <div className={styles.codeContent}>
                          <code>{stepData.embedCode}</code>
                          <button 
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(stepData.embedCode, 'code')}
                          >
                            <FiCopy />
                            Скопировать код
                          </button>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className={styles.instructions}>
                        <h4>📋 Инструкция по установке:</h4>
                        <ol>
                          <li>Скопируйте embed-код выше</li>
                          <li>Вставьте код в HTML вашего сайта перед закрывающим тегом <code>&lt;/body&gt;</code></li>
                          <li>После вставки чат-виджет появится в правом нижнем углу сайта</li>
                        </ol>
                        
                        <div className={styles.importantNote}>
                          <FiAlertCircle />
                          <div>
                            <strong>Важно:</strong> Токен бессрочный и менять его нужно только при смене ассистента или владельца.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Knowledge Base */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.step}
              >
                <div className={styles.stepHeader}>
                  <h3>📚 База знаний</h3>
                  <p>Загрузите файлы для обучения вашего ассистента</p>
                </div>

                <div className={styles.knowledgeSection}>
                  <div className={styles.uploadSection}>
                    <h4>Загрузка файлов</h4>
                    <p>Поддерживаемые форматы: PDF, DOCX, TXT, CSV, HTML, ICS, JSON, ODS, RTF, XML, XLS, XLSX</p>
                    <p>Максимальный размер файла: 10 МБ</p>
                    
                    <div className={styles.uploadArea}>
                      <input
                        type="file"
                        id="fileUpload"
                        multiple
                        accept=".pdf,.docx,.txt,.csv,.html,.ics,.json,.ods,.rtf,.xml,.xls,.xlsx"
                        onChange={handleFileUpload}
                        className={styles.fileInput}
                      />
                      <label htmlFor="fileUpload" className={styles.uploadLabel}>
                        {stepData.uploading ? (
                          <>
                            <FiRefreshCw className={styles.spin} />
                            Загружаем файлы...
                          </>
                        ) : (
                          <>
                            <FiUpload />
                            Выберите файлы
                          </>
                        )}
                      </label>
                    </div>

                    {stepData.uploadCost > 0 && (
                      <div className={styles.costInfo}>
                        <FiDollarSign />
                        <span>Стоимость загрузки: {stepData.uploadCost} ₽</span>
                      </div>
                    )}

                    {stepData.filesUploaded.length > 0 && (
                      <div className={styles.uploadedFiles}>
                        <h5>Загруженные файлы:</h5>
                        {stepData.filesUploaded.map((file, index) => (
                          <div key={index} className={styles.uploadedFile}>
                            <FiFile />
                            <span>{typeof file === 'string' ? file : file.name}</span>
                            {typeof file === 'object' && file.status === 'success' && (
                              <FiCheckCircle className={styles.fileSuccess} />
                            )}
                            {typeof file === 'object' && file.status === 'error' && (
                              <FiAlertCircle className={styles.fileError} title={file.error} />
                            )}
                            {typeof file === 'string' && (
                              <FiCheckCircle className={styles.fileSuccess} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.linksSection}>
                    <h4>Загрузка по ссылкам</h4>
                    <div className={styles.comingSoon}>
                      <FiLink />
                      <span>Скоро появится</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Testing */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.step}
              >
                <div className={styles.stepHeader}>
                  <h3>🧪 Проверка работы</h3>
                  <p>Протестируйте работу виджета перед запуском</p>
                </div>

                <div className={styles.testSection}>
                  <div className={styles.demoSection}>
                    <h4>Тестовая демонстрация</h4>
                    <p>Откройте демо-страницу с уже встроенным виджетом:</p>
                    
                    <button 
                      className={styles.demoBtn}
                      onClick={openTestDemo}
                    >
                      <FiExternalLink />
                      Открыть демо-страницу
                    </button>
                  </div>

                  <div className={styles.testInstructions}>
                    <h4>Инструкция по тестированию:</h4>
                    <ol>
                      <li>Откройте ваш сайт с установленным кодом</li>
                      <li>Кликните на иконку виджета в правом нижнем углу</li>
                      <li>Отправьте тестовое сообщение ассистенту</li>
                      <li>Убедитесь, что ответ пришел корректно</li>
                    </ol>
                  </div>

                  <div className={styles.testConfirmation}>
                    <label className={styles.checkbox}>
                      <input 
                        type="checkbox" 
                        checked={stepData.testCompleted}
                        onChange={(e) => setStepData(prev => ({ ...prev, testCompleted: e.target.checked }))}
                      />
                      <span className={styles.checkmark}></span>
                      Я протестировал виджет и он работает корректно
                    </label>
                  </div>

                  {stepData.testCompleted && (
                    <div className={styles.successMessage}>
                      <FiCheckCircle className={styles.successIcon} />
                      <div>
                        <div className={styles.successTitle}>
                          Отлично! Виджет готов к работе
                        </div>
                        <div className={styles.successText}>
                          Ваш сайт теперь оснащен AI-ассистентом
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            className={styles.prevBtn}
            onClick={handlePrevStep}
            disabled={currentStep === 1}
          >
            <FiArrowLeft />
            Назад
          </button>

          <div className={styles.stepCounter}>
            Шаг {currentStep} из {steps.length}
          </div>

          {currentStep < 3 ? (
            <>
              {currentStep === 2 && (
                <button 
                  className={styles.skipBtn}
                  onClick={handleNextStep}
                >
                  <FiSkipForward />
                  Пропустить
                </button>
              )}
              <button 
                className={styles.nextBtn}
                onClick={handleNextStep}
                disabled={currentStep === 1 && !stepData.tokenGenerated}
              >
                {currentStep === 2 ? 'Продолжить' : 'Далее'}
                <FiArrowRight />
              </button>
            </>
          ) : (
            <button 
              className={styles.completeBtn}
              onClick={() => {
                onComplete();
                onClose();
              }}
              disabled={!stepData.testCompleted}
            >
              <FiSettings />
              Перейти к настройкам бота
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WebsiteSetupWizard;