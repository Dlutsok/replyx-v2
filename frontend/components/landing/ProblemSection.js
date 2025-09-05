'use client';

import { motion } from 'framer-motion';
import { DESIGN_TOKENS } from '../../constants/designSystem';
import { FiCheck } from 'react-icons/fi';
import SectionWrapper from '../common/SectionWrapper';

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

// Новые иконки для дополнительных сравнений
const DollarIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 015.836 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
  </svg>
);

const ScaleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941M2.25 18l5.94-2.28M2.25 18l2.28 5.941" />
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

// Новые иконки решений
const SavingsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Иконки для метрик (перемещены вверх для избежания ошибок инициализации)
const TrendingUpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const ExpandIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

// Иконка для метрики удовлетворенности клиентов
const HeartIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);



const ProblemSection = () => {
  // Пары «до → после» для сравнения
  const comparisons = [
    {
      left: { icon: ClockIcon, title: 'Долгое ожидание — клиенты теряют интерес', description: 'Средний ответ — 4 часа' },
      right: { icon: LightningIcon, title: 'Мгновенный ответ — довольные клиенты', description: '2,7 секунды на любой запрос' }
    },
    {
      left: { icon: AlertCircleIcon, title: 'Неточная информация', description: 'Только 30% знаний у операторов' },
      right: { icon: BrainIcon, title: 'Полная экспертиза', description: '100% знаний о продуктах и услугах' }
    },
    {
      left: { icon: CalendarXIcon, title: 'Ограниченный график', description: 'Поддержка всего 8 часов в день' },
      right: { icon: ClockCheckIcon, title: 'Круглосуточно', description: 'Работаем 24/7 без выходных и праздников' }
    },
    {
      left: { icon: DollarIcon, title: 'Высокие затраты на поддержку', description: 'Зарплаты операторов, обучение' },
      right: { icon: SavingsIcon, title: 'Экономия до 70%', description: 'Снижение операционных расходов' }
    },
    {
      left: { icon: TrendingDownIcon, title: 'Упущенные продажи', description: 'Из-за медленной обработки запросов' },
      right: { icon: TrendingUpIcon, title: 'Конверсия +30%', description: 'Благодаря быстрой поддержке' }
    },
    {
      left: { icon: ScaleIcon, title: 'Ограниченная масштабируемость', description: 'Зависит от количества операторов' },
      right: { icon: ExpandIcon, title: 'Неограниченная масштабируемость', description: 'Без дополнительных затрат' }
    },

  ];

  // Иконки для метрик

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

  const ShieldCheckIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9l4-4-4-4z" />
    </svg>
  );
  
  const RocketIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );

  // Метрики результатов
  const metrics = [
    { icon: TrendingUpIcon, value: '98%', label: 'точность ответов' },
    { icon: ClockFastIcon, value: '15 мин', label: 'время внедрения' },
    { icon: RocketIcon, value: '10x', label: 'быстрее конкурентов' },
    { icon: HeartIcon, value: '95%', label: 'довольных клиентов' }
  ];

  return (
    <SectionWrapper id="solutions">
      <SectionWrapper.Header
        className="mt-20"
        title={
          <>
            Каждое обращение — быстрый и точный ответ с <span className={DESIGN_TOKENS.colors.primary}>ReplyX</span>
          </>
        }
        subtitle="Полная автоматизация поддержки без потери качества"
      />

      {/* Заголовки колонок */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        className="hidden xl:grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-sm font-semibold text-gray-700">До ReplyX</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-sm font-semibold text-gray-700">С ReplyX</span>
        </div>
      </motion.div>

      {/* Ряды сравнения */}
      <div className="relative">
        {/* Мобильная версия - квадратики */}
        <div className="block xl:hidden">
          <div className="grid grid-cols-2 gap-3">
            {comparisons.flatMap((row, rowIndex) => [
              <motion.div
                key={`left-${rowIndex}`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: rowIndex * 0.1 }}
                className="h-28 rounded-lg border border-red-200 bg-red-50/60 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden"
              >
                <row.left.icon className="w-6 h-6 text-red-600 mb-1 flex-shrink-0" />
                <div className="text-xs font-semibold text-gray-900 mb-0.5 leading-tight">{row.left.title}</div>
                <div className="text-xs text-gray-600 leading-tight">{row.left.description}</div>
                {/* Крестик в углу */}
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </motion.div>,
              <motion.div
                key={`right-${rowIndex}`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: rowIndex * 0.1 + 0.05 }}
                className="h-28 rounded-lg border border-green-200 bg-green-50/60 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden"
              >
                <row.right.icon className="w-6 h-6 text-green-600 mb-1 flex-shrink-0" />
                <div className="text-xs font-semibold text-gray-900 mb-0.5 leading-tight">{row.right.title}</div>
                <div className="text-xs text-gray-600 leading-tight">{row.right.description}</div>
                {/* Галочка в углу */}
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                  <FiCheck size={10} />
                </div>
              </motion.div>
            ])}
          </div>
        </div>

        {/* Десктопная версия - оригинальная */}
        <div className="hidden xl:block">
          <div className="space-y-3">
            {comparisons.map((row, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Левая карточка */}
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3 relative overflow-visible">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">{row.left.title}</div>
                    <div className="text-xs text-gray-600">{row.left.description}</div>
                  </div>
                  {/* Крестик справа */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>

                {/* Правая карточка */}
                <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/50 p-3 relative overflow-visible">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">{row.right.title}</div>
                    <div className="text-xs text-gray-600">{row.right.description}</div>
                  </div>
                  {/* Галочка справа */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                    <FiCheck size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Метрики результата (внутри той же карточки) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="mt-6 rounded-xl py-8 px-6 bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-400 border border-purple-300"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <metric.icon className={`${DESIGN_TOKENS.icons.medium} text-white`} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-xl">{metric.value}</span>
                <span className="text-white/80 text-xs leading-tight">{metric.label}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </SectionWrapper>
  );
};

export default ProblemSection;