import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../hooks/useAuth';
import {
  FiHelpCircle, FiBook, FiPlay, FiMessageSquare, FiSettings,
  FiStar, FiCheckCircle, FiMail, FiPhone,
  FiVideo, FiFileText, FiZap, FiExternalLink, FiChevronRight,
  FiArrowRight, FiTarget, FiClock, FiShield
} from 'react-icons/fi';
import dashStyles from '../styles/pages/Dashboard.module.css';

export default function HelpCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };



  // Быстрые действия для обучения
  const quickActions = [
    {
      title: 'Создать первого ассистента',
      description: 'Настройте AI-помощника под ваши задачи',
      icon: FiZap,
      link: '/ai-assistant',
      color: 'purple'
    },
    {
      title: 'Изучить документацию',
      description: 'Познакомьтесь с возможностями платформы',
      icon: FiBook,
      link: '#documentation',
      color: 'blue'
    },
    {
      title: 'Посмотреть видео-уроки',
      description: 'Видеоинструкции по основным функциям',
      icon: FiPlay,
      link: '#videos',
      color: 'green'
    },
    {
      title: 'Связаться с поддержкой',
      description: 'Получите персональную помощь',
      icon: FiMessageSquare,
      link: '#support',
      color: 'orange'
    }
  ];

  // Учебные материалы
  const learningMaterials = [
    {
      id: 'getting-started',
      title: 'Быстрый старт',
      icon: FiPlay,
      description: 'Основы работы с платформой',
      level: 'Начальный',
      duration: '15 мин',
      items: [
        {
          title: 'Создание первого ассистента',
          content: 'Пошаговое руководство по настройке вашего первого AI-помощника. Узнайте, как выбрать подходящий шаблон и настроить параметры.',
          link: '/ai-assistant'
        },
        {
          title: 'Загрузка документов',
          content: 'Как добавить документы в базу знаний ассистента для улучшения качества ответов.',
          link: '/ai-assistant'
        },
        {
          title: 'Тестирование ассистента',
          content: 'Как протестировать работу вашего ассистента и убедиться в корректности ответов.',
          link: '/dialogs'
        }
      ]
    },
    {
      id: 'advanced-features',
      title: 'Продвинутые возможности',
      icon: FiSettings,
      description: 'Расширенные настройки и функции',
      level: 'Продвинутый',
      duration: '30 мин',
      items: [
        {
          title: 'Настройка системного промпта',
          content: 'Как создавать эффективные инструкции для AI, чтобы получить более точные и релевантные ответы.',
          link: '/ai-assistant'
        },
        {
          title: 'Интеграция с сайтом',
          content: 'Добавление чат-виджета на ваш сайт для взаимодействия с посетителями.',
          link: '/ai-assistant'
        },
        {
          title: 'Аналитика и метрики',
          content: 'Отслеживание эффективности ваших ассистентов и анализ диалогов.',
          link: '/usage'
        }
      ]
    },
    {
      id: 'best-practices',
      title: 'Лучшие практики',
      icon: FiTarget,
      description: 'Рекомендации по использованию',
      level: 'Эксперт',
      duration: '25 мин',
      items: [
        {
          title: 'Оптимизация ответов',
          content: 'Как улучшить качество ответов AI через правильную подготовку данных и инструкций.',
          link: '/ai-assistant'
        },
        {
          title: 'Управление диалогами',
          content: 'Эффективное управление множеством одновременных диалогов с пользователями.',
          link: '/dialogs'
        },
        {
          title: 'Масштабирование решений',
          content: 'Как использовать платформу для крупных проектов с множеством ассистентов.',
          link: '/ai-assistant'
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className={dashStyles.loadingContainer}>
        <FiHelpCircle className={dashStyles.loadingSpinner} />
        <span>Загрузка центра помощи...</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Центр помощи - ReplyX</title>
        <meta name="description" content="Центр помощи ReplyX. Обучающие материалы, инструкции и поддержка по работе с AI-ассистентами." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 animate-fade-in rounded-2xl">
        {/* Welcome Section - Dashboard Style */}
        <div className={dashStyles.welcomeSection}>
          <div className={dashStyles.welcomeContent}>
            <div className={dashStyles.avatarSection}>
              <div className={dashStyles.avatar}>
                <FiHelpCircle size={28} />
              </div>
              <div className={dashStyles.userInfo}>
                <h1 className={dashStyles.welcomeTitle}>Центр помощи</h1>
                <p className={dashStyles.welcomeSubtitle}>
                  Все что нужно знать для работы с ReplyX - инструкции, руководства и полезные советы
                </p>
              </div>
            </div>

            <div className={dashStyles.badge}>
              <FiStar size={16} />
              <span>Онлайн поддержка</span>
            </div>
          </div>
        </div>



        {/* Quick Actions - Dashboard Cards Style */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Быстрые действия */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-purple-600" size={16} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Быстрые действия</h3>
            </div>

            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 bg-${action.color}-50 rounded-lg flex items-center justify-center`}>
                    <action.icon className={`text-${action.color}-600`} size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                  <FiArrowRight className="text-gray-400" size={16} />
                </div>
              ))}
            </div>
          </div>

          {/* Каналы поддержки */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                <FiMessageSquare className="text-green-600" size={16} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Каналы поддержки</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <FiMessageSquare className="text-green-600" size={16} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Онлайн-чат</p>
                  <p className="text-xs text-gray-600">Ответим в течение 15 минут</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <FiMail className="text-blue-600" size={16} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Электронная почта</p>
                  <p className="text-xs text-gray-600">support@replyx.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                <FiPhone className="text-orange-600" size={16} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Телефон</p>
                  <p className="text-xs text-gray-600">+7 (495) 000-00-00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <FiBook className="text-indigo-600" size={16} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">База знаний</h3>
              <p className="text-sm text-gray-600">Инструкции и руководства по работе с платформой</p>
            </div>
          </div>

          <div className="space-y-4">
            {learningMaterials.map(section => (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      {React.createElement(section.icon, {
                        className: "text-purple-600",
                        size: 20
                      })}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">{section.title}</h4>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <span className="text-gray-500">{section.level}</span>
                      <div className="text-gray-400">{section.duration}</div>
                    </div>
                    <FiChevronRight
                      className={`transition-transform ${expandedSection === section.id ? 'rotate-90' : ''}`}
                      size={20}
                    />
                  </div>
                </button>

                {expandedSection === section.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {section.items.map((item, index) => (
                      <div key={index} className="p-4 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-2">{item.title}</h5>
                            <p className="text-sm text-gray-600 mb-3">{item.content}</p>
                            <a
                              href={item.link}
                              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                              Подробнее
                              <FiExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <FiShield size={16} />
              <span>Безопасные платежи</span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock size={16} />
              <span>Круглосуточная поддержка</span>
            </div>
            <div className="flex items-center gap-2">
              <FiStar size={16} />
              <span>Высокое качество сервиса</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 