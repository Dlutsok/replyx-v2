'use client';

import { motion } from 'framer-motion';

// Иконки проблем
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const AlertCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

const CalendarXIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

// Иконки решений
const LightningIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const BrainIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const ClockCheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ProblemSection = () => {
  // Проблемы клиентов
  const problems = [
    {
      icon: ClockIcon,
      title: "Долгое ожидание",
      description: "4 часа — средний ответ, 70% клиентов уходят"
    },
    {
      icon: AlertCircleIcon,
      title: "Неточная информация",
      description: "Операторы знают только 30% о продукте"
    },
    {
      icon: CalendarXIcon,
      title: "Ограниченный график",
      description: "Поддержка работает только 8 часов в день"
    }
  ];

  // Решения ChatAI
  const solutions = [
    {
      icon: LightningIcon,
      title: "Мгновенный ответ",
      description: "0.8 секунды на любой запрос 24/7"
    },
    {
      icon: BrainIcon,
      title: "Полная экспертиза",
      description: "100% знаний о продуктах и услугах"
    },
    {
      icon: ClockCheckIcon,
      title: "Круглосуточно",
      description: "Без выходных и перерывов"
    }
  ];

  // Иконки для метрик
  const TrendingUpIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );

  const CurrencyDollarIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const ClockFastIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const Clock24Icon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  // Метрики результатов
  const metrics = [
    { icon: TrendingUpIcon, value: "95%", label: "довольных клиентов" },
    { icon: CurrencyDollarIcon, value: "80%", label: "экономии расходов" },
    { icon: ClockFastIcon, value: "0.8 сек", label: "время ответа" },
    { icon: Clock24Icon, value: "24/7", label: "без перерывов" }
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Компактный заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-3">
            Как ChatAI превращает каждое обращение в положительный опыт
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Сравните традиционную поддержку с решением ChatAI
          </p>
        </motion.div>

        {/* Основной блок без "коробок" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="bg-white rounded-xl p-6 lg:p-8"
        >
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Вертикальный разделитель */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 hidden lg:block transform -translate-x-1/2"></div>
            
            {/* Левая колонка: Проблемы */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Традиционная поддержка
              </h3>
              
              <div className="space-y-3">
                {problems.map((problem, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 w-6 h-6 text-red-500">
                      <problem.icon className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{problem.title}</div>
                      <div className="text-xs text-gray-600">{problem.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Правая колонка: Решения */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                ChatAI решение
              </h3>
              
              <div className="space-y-3">
                {solutions.map((solution, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 + 0.1 }}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-green-50 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 w-6 h-6 text-green-500">
                      <solution.icon className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{solution.title}</div>
                      <div className="text-xs text-gray-600">{solution.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Метрики в подвале */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <metric.icon className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-900">{metric.value}</span>
                <span className="text-gray-600">{metric.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;