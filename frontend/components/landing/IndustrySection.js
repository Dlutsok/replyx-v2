'use client';

import { motion } from 'framer-motion';

// Минималистичные иконки для отраслей
const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const BankIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
  </svg>
);

const AcademicCapIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443a55.381 55.381 0 0 1 5.25 2.882V15" />
  </svg>
);

const HeartIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
);

const HomeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const TruckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 1-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 1-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V13.5m-6 8.25c0-1.286.033-2.562.1-3.837m-.1 3.837a24.301 24.301 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 5.765 8.25 9.75 12.015 9.75 16.5c0 .621.504 1.125 1.125 1.125m6.375-3.125V21h4.125c.621 0 1.125-.504 1.125-1.125v-4.5m0 0h-.375A12.937 12.937 0 0 1 12 9.75c-2.883 0-5.647.751-8.006 2.085C2.618 14.049 1.5 16.794 1.5 19.731V21" />
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9Z" />
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.616-.438.992v.248c0 .376.145.751.438.992l1.003.827c.424.35.534.955.26 1.431l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.616.437-.992v-.248c0-.376-.145-.751-.437-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const IndustrySection = () => {
  const industries = [
    {
      icon: ShoppingBagIcon,
      title: "E-commerce",
      description: "Статус заказов, возвраты, товары",
      bgColor: "from-slate-500 to-slate-600",
      hoverColor: "group-hover:from-slate-600 group-hover:to-slate-700",
      height: "tall"
    },
    {
      icon: AcademicCapIcon,
      title: "Образование",
      description: "Расписание, курсы, задания",
      bgColor: "from-sky-400 to-sky-500",
      hoverColor: "group-hover:from-sky-500 group-hover:to-sky-600",
      height: "medium"
    },
    {
      icon: HeartIcon,
      title: "Медицина",
      description: "Запись, анализы, справки",
      bgColor: "from-rose-400 to-rose-500",
      hoverColor: "group-hover:from-rose-500 group-hover:to-rose-600",
      height: "short"
    },
    {
      icon: HomeIcon,
      title: "Недвижимость",
      description: "Объекты, просмотры, документы",
      bgColor: "from-amber-400 to-amber-500",
      hoverColor: "group-hover:from-amber-500 group-hover:to-amber-600",
      height: "medium"
    },
    {
      icon: TruckIcon,
      title: "Логистика",
      description: "Доставка, трекинг, склады",
      bgColor: "from-orange-400 to-orange-500",
      hoverColor: "group-hover:from-orange-500 group-hover:to-orange-600",
      height: "short"
    },
    {
      icon: PhoneIcon,
      title: "Телеком",
      description: "Тарифы, подключения, техподдержка",
      bgColor: "from-indigo-400 to-indigo-500",
      hoverColor: "group-hover:from-indigo-500 group-hover:to-indigo-600",
      height: "medium"
    },
    {
      icon: GlobeIcon,
      title: "Туризм",
      description: "Туры, билеты, отели",
      bgColor: "from-teal-400 to-teal-500",
      hoverColor: "group-hover:from-teal-500 group-hover:to-teal-600",
      height: "short"
    },
    {
      icon: SettingsIcon,
      title: "Настроить под вашу сферу",
      description: "5 минут и готово",
      bgColor: "from-gray-500 to-gray-600",
      hoverColor: "group-hover:from-gray-600 group-hover:to-gray-700",
      height: "tall",
      isCustom: true
    }
  ];

  const getHeightClass = (height) => {
    switch (height) {
      case 'tall':
        return 'min-h-[180px]';
      case 'medium':
        return 'min-h-[140px]';
      case 'short':
      default:
        return 'min-h-[120px]';
    }
  };

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
            ChatAI для вашей отрасли
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Независимо от сферы — мгновенные ответы 24/7
          </p>
        </motion.div>

        {/* Адаптивный Layout - грид на десктопе, горизонтальный скролл на мобильных */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {industries.map((industry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
              whileHover={{ scale: 1.03, y: -8 }}
              className={`group cursor-pointer ${getHeightClass(industry.height)}`}
            >
              <div className={`bg-gradient-to-br ${industry.bgColor} ${industry.hoverColor} rounded-3xl p-6 h-full flex flex-col justify-between text-white shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden`}>
                {/* Современный фоновый паттерн */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white transform translate-x-16 -translate-y-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white transform -translate-x-12 translate-y-12"></div>
                </div>
                
                {/* Световой эффект */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Содержимое */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Верхняя часть */}
                  <div className="flex-1">
                    {/* Стильная иконка */}
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300 border border-white/10 shadow-lg">
                      <industry.icon className="w-8 h-8 text-white drop-shadow-sm" />
                    </div>
                    
                    {/* Заголовок */}
                    <h3 className="font-bold text-white text-xl mb-3 leading-tight group-hover:scale-105 transition-transform duration-300">
                      {industry.title}
                    </h3>
                  </div>
                  
                  {/* Описание внизу */}
                  <p className="text-white/85 text-sm leading-relaxed font-medium mt-auto">
                    {industry.description}
                  </p>
                </div>

                {/* Специальный индикатор */}
                {industry.isCustom && (
                  <div className="absolute top-5 right-5 w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse shadow-sm"></div>
                  </div>
                )}

                {/* Элегантная подсветка */}
                <div className="absolute inset-0 rounded-3xl ring-1 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Мобильный горизонтальный скролл */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ width: `${industries.length * 280 + (industries.length - 1) * 16}px` }}>
            {industries.map((industry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                className="group cursor-pointer flex-shrink-0 w-64 h-40"
              >
                <div className={`bg-gradient-to-br ${industry.bgColor} ${industry.hoverColor} rounded-3xl p-5 h-full flex flex-col justify-between text-white shadow-xl relative overflow-hidden`}>
                  {/* Фоновый паттерн */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white transform translate-x-12 -translate-y-12"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white transform -translate-x-8 translate-y-8"></div>
                  </div>
                  
                  {/* Содержимое */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Верх */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                        <industry.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-white text-lg leading-tight">
                        {industry.title}
                      </h3>
                    </div>
                    
                    {/* Описание */}
                    <p className="text-white/85 text-sm leading-relaxed font-medium mt-auto">
                      {industry.description}
                    </p>
                  </div>

                  {/* Индикатор кастомизации */}
                  {industry.isCustom && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Мобильная кнопка */}
        <div className="block md:hidden mt-6">
          <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-300">
            Настроить под мою сферу
          </button>
        </div>
      </div>
    </section>
  );
};

export default IndustrySection;