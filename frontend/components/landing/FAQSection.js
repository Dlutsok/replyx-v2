'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiPlus, FiMinus, FiMessageSquare, FiClock, FiShield, FiDollarSign, FiSettings, FiUsers, FiX, FiSend, FiMail } from 'react-icons/fi';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import SectionWrapper from '../common/SectionWrapper';

// Кастомные стили для FAQ анимаций
const faqCustomStyles = `
  @keyframes faq-glow {
    0%, 100% {
      box-shadow: 0 0 0 rgba(99, 52, 229, 0.1);
    }
    50% {
      box-shadow: 0 0 20px rgba(99, 52, 229, 0.2);
    }
  }

  .faq-item-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .faq-item-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(99, 52, 229, 0.1);
  }

  .faq-icon-glow {
    transition: all 0.3s ease;
  }

  .faq-icon-glow:hover {
    animation: faq-glow 2s ease-in-out infinite;
  }
`;

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(0); // Первый вопрос открыт по умолчанию
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  // Применяем кастомные стили
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = faqCustomStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Успешная отправка
        setIsModalOpen(false);
        setFormData({ name: '', phone: '', message: '' });
        // Можно добавить уведомление об успехе
        alert('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 2 часов.');
      } else {
        // Ошибка от сервера
        setSubmitError(result.message || 'Произошла ошибка при отправке формы');
      }
    } catch (error) {
      setSubmitError('Не удалось отправить форму. Проверьте подключение к интернету и попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      icon: FiClock,
      question: "Как быстро можно запустить ReplyX в работу?",
      answer: "Настройка занимает всего 5-15 минут. Вы загружаете базу знаний о своих продуктах, настраиваете основные сценарии, и ReplyX готов отвечать клиентам. Наша команда поможет с интеграцией бесплатно."
    },
    {
      icon: FiDollarSign,
      question: "Действительно ли оплата только за сообщения без абонентской платы?",
      answer: "Да, никаких ежемесячных платежей! Вы платите только 5₽ за каждое сообщение, которое обрабатывает ReplyX. Если клиентов нет — не платите ничего. Это честно и выгодно для малого и среднего бизнеса."
    },
    {
      icon: FiShield,
      question: "Безопасно ли передавать данные клиентов ReplyX?",
      answer: "Абсолютно безопасно. Все данные хранятся на российских серверах с полным соответствием 152-ФЗ. Используем шифрование AES-256, регулярные аудиты безопасности. Ваши данные никогда не передаются третьим лицам."
    },
    {
      icon: FiMessageSquare,
      question: "Что происходит, если ReplyX не может ответить на вопрос?",
      answer: "ReplyX умно передаёт сложные запросы живым операторам со всем контекстом беседы. Клиент получает уведомление, что с ним свяжется специалист. Это происходит в 5-8% случаев, остальные 92-95% запросов решаются автоматически."
    },
    {
      icon: FiSettings,
      question: "Можно ли настроить ReplyX под специфику нашего бизнеса?",
      answer: "Конечно! ReplyX изучает вашу базу знаний, прайс-листы, политики компании. Вы можете настроить тон общения, добавить специальные сценарии, интегрировать с вашей CRM. Система адаптируется под любую отрасль."
    },
    {
      icon: FiUsers,
      question: "Заменит ли ReplyX всех наших операторов?",
      answer: "Нет, цель ReplyX — помочь команде, а не заменить её. Он берёт на себя рутинные вопросы (95% запросов), а сложные случаи передаёт специалистам. Это позволяет операторам заниматься действительно важными задачами."
    }
  ];

  return (
    <SectionWrapper bg="white" className="pt-16 pb-20 relative">
      {/* Десктопная версия */}
      <div className="hidden lg:block">
        {/* Фоновые декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#6334E5]/20 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-40 right-16 w-24 h-24 bg-gradient-to-br from-blue-100/15 to-transparent rounded-full blur-xl"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-[#6334E5]/30 to-transparent rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10">
          <SectionWrapper.Header
            title="Часто задаваемые вопросы"
            subtitle="Отвечаем на главные вопросы о внедрении и использовании ReplyX"
          />

        {/* FAQ список */}
        <div className="max-w-[1200px] mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="mb-4"
            >
              <div
                className={`bg-white border-2 rounded-2xl transition-all duration-300 overflow-hidden faq-item-hover ${
                  openFAQ === index
                    ? 'border-[#6334E5]/30 shadow-xl'
                    : 'border-gray-100 hover:border-[#6334E5]/20 shadow-md'
                }`}
              >
                {/* Вопрос */}
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? -1 : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between group transition-all duration-200"
                >
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`${DESIGN_TOKENS.icons.large} rounded-2xl flex items-center justify-center transition-all duration-300 faq-icon-glow ${
                      openFAQ === index
                        ? 'bg-[#6334E5]/10 text-[#6334E5] shadow-lg'
                        : 'bg-white border border-gray-200 text-gray-500 group-hover:bg-[#6334E5]/10 group-hover:text-[#6334E5] group-hover:border-[#6334E5]/30'
                    }`}>
                      <faq.icon size={22} />
                    </div>
                    <h3 className={`${DESIGN_TOKENS.typography.cardTitle} transition-colors ${
                      openFAQ === index ? 'text-[#6334E5]' : 'text-gray-900'
                    }`}>
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`ml-4 transition-all duration-300 ${
                    openFAQ === index
                      ? 'text-[#6334E5] rotate-180'
                      : 'text-gray-400 group-hover:text-[#6334E5]'
                  }`}>
                    {openFAQ === index ? <FiMinus size={22} /> : <FiPlus size={22} />}
                  </div>
                </button>

                {/* Ответ */}
                <motion.div
                  initial={false}
                  animate={openFAQ === index ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6">
                    <div className="pl-16">
                      <p className={DESIGN_TOKENS.typography.bodyText + ' leading-relaxed text-gray-700'}>
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Креативный блок обратной связи */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 relative text-center"
        >
          {/* Декоративные элементы */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-[#6334E5]/30 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-indigo-400/50 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Основной текст */}
            <div className="mb-8">
              <h3 className="text-2xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-[#6334E5] via-blue-600 to-[#6334E5] bg-clip-text text-transparent">
                  Остались вопросы?
                </span>
              </h3>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Наша команда поддержки готова помочь с внедрением ReplyX и ответить на все ваши вопросы
              </p>
            </div>

            {/* Минималистичные кнопки */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-[#6334E5] to-blue-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#6334E5] to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-3">
                  <FiMail className="w-5 h-5" />
                  Написать нам
                  <FiSend className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group px-8 py-4 border-2 border-[#6334E5]/30 text-[#6334E5] font-semibold rounded-2xl hover:bg-[#6334E5]/10 hover:border-[#6334E5]/40 transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  <FiMessageSquare className="w-5 h-5" />
                  Онлайн-чат
                </span>
              </motion.button>
            </div>

            {/* Статус доступности */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Отвечаем в течение 2 часов</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Консультация бесплатная</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#6334E5] rounded-full"></div>
                <span>Работаем 24/7</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Модальное окно формы обратной связи */}
        <AnimatePresence>
          {isModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 z-10"
                  >
                    <FiX className="w-5 h-5 text-gray-500" />
                  </button>

                  {/* Форма */}
                  <div className="px-6 pt-6 pb-2 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Связаться с нами</h3>
                    <p className="text-gray-600 text-sm">Мы ответим в течение 2 часов</p>
                  </div>
                <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ваше имя
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 bg-white"
                      placeholder="Иван Петров"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 bg-white"
                      placeholder="+7(993)334-99-13"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сообщение
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 resize-none bg-white"
                      placeholder="Опишите ваш вопрос..."
                    />
                  </div>

                  {submitError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#6334E5] to-blue-600 text-white font-medium py-3 px-6 rounded-[0.9rem] hover:from-[#6334E5] hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Отправка...
                        </>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          Отправить сообщение
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </motion.div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Мобильная версия */}
      <div className="block lg:hidden">
        {/* Фоновые декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-16 left-6 w-20 h-20 bg-gradient-to-br from-[#6334E5]/20 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 right-8 w-16 h-16 bg-gradient-to-br from-blue-100/15 to-transparent rounded-full blur-xl"></div>
          <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-gradient-to-br from-[#6334E5]/30 to-transparent rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10">
          {/* Заголовок секции */}
          <div className="text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Часто задаваемые вопросы
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mt-3 leading-relaxed">
              Отвечаем на главные вопросы о внедрении и использовании ReplyX
            </p>
          </div>

          {/* FAQ список */}
          <div className="max-w-[1200px] mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="mb-3"
              >
                <div
                  className={`bg-white border-2 rounded-xl transition-all duration-300 overflow-hidden faq-item-hover ${
                    openFAQ === index
                      ? 'border-[#6334E5]/30 shadow-lg'
                      : 'border-gray-100 hover:border-[#6334E5]/20 shadow-sm'
                  }`}
                >
                  {/* Вопрос */}
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? -1 : index)}
                    className="w-full px-4 py-4 text-left flex items-center justify-between group transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 faq-icon-glow ${
                        openFAQ === index
                          ? 'bg-[#6334E5]/10 text-[#6334E5]'
                          : 'bg-white border border-gray-200 text-gray-500 group-hover:bg-[#6334E5]/10 group-hover:text-[#6334E5] group-hover:border-[#6334E5]/30'
                      }`}>
                        <faq.icon size={16} />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 transition-colors flex-1 leading-tight">
                        {faq.question}
                      </h3>
                    </div>
                    <div className={`ml-3 transition-all duration-300 ${
                      openFAQ === index
                        ? 'text-[#6334E5] rotate-180'
                        : 'text-gray-400 group-hover:text-[#6334E5]'
                    }`}>
                      {openFAQ === index ? <FiMinus size={18} /> : <FiPlus size={18} />}
                    </div>
                  </button>

                  {/* Ответ */}
                  <motion.div
                    initial={false}
                    animate={openFAQ === index ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="pl-11">
                        <p className="text-sm text-gray-600 leading-relaxed text-gray-700">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Финальный CTA блок */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 relative text-center"
          >
            {/* Декоративные элементы */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-[#6334E5]/30 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
              <div className="absolute bottom-1/4 left-1/2 w-0.5 h-0.5 bg-indigo-400/50 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
            </div>

            <div className="relative z-10 max-w-3xl mx-auto">
              {/* Основной текст */}
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-[#6334E5] via-blue-600 to-[#6334E5] bg-clip-text text-transparent">
                    Остались вопросы?
                  </span>
                </h3>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Наша команда поддержки готова помочь с внедрением ReplyX и ответить на все ваши вопросы
                </p>
              </div>

              {/* Кнопки */}
              <div className="flex flex-col gap-4 justify-center items-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsModalOpen(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-[#6334E5] to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden text-base w-full max-w-xs"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6334E5] to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <FiMail className="w-4 h-4" />
                    Написать нам
                    <FiSend className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group px-6 py-3 border-2 border-[#6334E5]/30 text-[#6334E5] font-semibold rounded-xl hover:bg-[#6334E5]/10 hover:border-[#6334E5]/40 transition-all duration-300 text-base w-full max-w-xs"
                >
                  <span className="flex items-center justify-center gap-2">
                    <FiMessageSquare className="w-4 h-4" />
                    Онлайн-чат
                  </span>
                </motion.button>
              </div>

              {/* Статус доступности */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-6 flex flex-col items-center gap-3 text-sm text-gray-500"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Отвечаем в течение 2 часов</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Консультация бесплатная</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#6334E5] rounded-full"></div>
                  <span>Работаем 24/7</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Модальное окно формы обратной связи */}
          <AnimatePresence>
            {isModalOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 z-10"
                    >
                      <FiX className="w-5 h-5 text-gray-500" />
                    </button>

                    {/* Форма */}
                    <div className="px-6 pt-6 pb-2 text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Связаться с нами</h3>
                      <p className="text-gray-600 text-sm">Мы ответим в течение 2 часов</p>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ваше имя
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 bg-white"
                          placeholder="Иван Петров"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Телефон
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 bg-white"
                          placeholder="+7(993)334-99-13"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Сообщение
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6334E5] focus:border-[#6334E5] transition-all duration-200 resize-none bg-white"
                          placeholder="Опишите ваш вопрос..."
                        />
                      </div>

                      {submitError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                          {submitError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-[#6334E5] to-blue-600 text-white font-medium py-3 px-6 rounded-[0.9rem] hover:from-[#6334E5] hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-2">
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Отправка...
                            </>
                          ) : (
                            <>
                              <FiSend className="w-4 h-4" />
                              Отправить сообщение
                            </>
                          )}
                        </span>
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default FAQSection;