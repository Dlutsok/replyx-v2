'use client';

import { motion } from 'framer-motion';

// Профессиональные tech иконки с outline стилем
const PuzzlePieceIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.369 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
  </svg>
);

const ChartBarIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const RocketIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const CpuChipIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-16.5 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
  </svg>
);

const TechSection = () => {
  const technologies = [
    {
      icon: PuzzlePieceIcon,
      title: "Конструктор ассистентов",
      description: "Создание AI-помощников без кода",
      color: "#7C4DFF",
      accentColor: "bg-purple-50 border-purple-200"
    },
    {
      icon: ChartBarIcon,
      title: "Аналитика в реальном времени",
      description: "Метрики качества и производительности",
      color: "#3B82F6",
      accentColor: "bg-blue-50 border-blue-200"
    },
    {
      icon: UsersIcon,
      title: "AI + Human гибрид",
      description: "Умное распределение между ботом и операторами",
      color: "#10B981",
      accentColor: "bg-green-50 border-green-200"
    },
    {
      icon: RocketIcon,
      title: "Мгновенное развёртывание",
      description: "От настройки до запуска за 5 минут",
      color: "#F59E0B",
      accentColor: "bg-amber-50 border-amber-200"
    },
    {
      icon: CpuChipIcon,
      title: "GPT-4 под капотом",
      description: "Самая современная AI модель для понимания контекста",
      color: "#8B5CF6",
      accentColor: "bg-violet-50 border-violet-200"
    }
  ];

  return (
    <section className="py-12 bg-gray-50 relative overflow-hidden">
      {/* Декоративная сетка в фоне */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23000000' fill-opacity='1'%3e%3ccircle cx='30' cy='30' r='1.5'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
        }}></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Заголовок секции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            Технологии, которые делают{' '}
            <span className="text-purple-600">ChatAI лидером рынка</span>
          </h2>
        </motion.div>

        {/* Tech Flow Timeline */}
        <div className="relative">
          {/* Центральная линия */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-blue-200 to-green-200 transform -translate-x-0.5 hidden lg:block"></div>
          
          {/* Tech элементы */}
          <div className="space-y-6 lg:space-y-8">
            {technologies.map((tech, index) => {
              const isLeft = index % 2 === 0;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.1, 
                    ease: "easeOut"
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className={`relative flex items-center group cursor-pointer ${
                    isLeft 
                      ? 'lg:flex-row lg:justify-end lg:pr-8' 
                      : 'lg:flex-row-reverse lg:justify-end lg:pl-8'
                  }`}
                >
                  {/* Соединительная точка */}
                  <div className="absolute left-1/2 top-1/2 w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 hidden lg:block z-10">
                    <div 
                      className="w-4 h-4 rounded-full shadow-lg border-2 border-white transition-all duration-300 group-hover:scale-125"
                      style={{ backgroundColor: tech.color }}
                    >
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: tech.color }}></div>
                    </div>
                  </div>

                  {/* Контентная карточка */}
                  <div className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 transition-all duration-300 group-hover:shadow-lg max-w-md w-full lg:max-w-sm ${tech.accentColor}`}>
                    {/* Иконка и заголовок */}
                    <div className="flex items-start space-x-4 mb-3">
                      <div 
                        className="w-6 h-6 flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                        style={{ color: tech.color }}
                      >
                        <tech.icon className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {tech.title}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Описание */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {tech.description}
                    </p>

                    {/* Декоративный элемент */}
                    <div 
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                      style={{ backgroundColor: tech.color }}
                    ></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Мобильная версия */}
        <div className="lg:hidden mt-8">
          <div className="space-y-4">
            {technologies.map((tech, index) => (
              <motion.div
                key={`mobile-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`bg-white rounded-xl p-4 shadow-sm border-2 ${tech.accentColor}`}
              >
                <div className="flex items-start space-x-3">
                  <tech.icon 
                    className="w-6 h-6 flex-shrink-0" 
                    style={{ color: tech.color }}
                    strokeWidth={1.5} 
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base mb-1">
                      {tech.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {tech.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Компонент для создания декоративной линии соединения
const ConnectionLine = ({ from, to, color }) => {
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <defs>
        <linearGradient id={`gradient-${from}-${to}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
          <stop offset="50%" style={{ stopColor: color, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.2 }} />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${from.y - 20} ${to.x} ${to.y}`}
        stroke={`url(#gradient-${from}-${to})`}
        strokeWidth="2"
        fill="none"
        className="animate-pulse"
      />
    </svg>
  );
};

export default TechSection;