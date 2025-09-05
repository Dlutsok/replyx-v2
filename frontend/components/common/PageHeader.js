import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiUser } from 'react-icons/fi';
import { DESIGN_TOKENS } from '@/constants';

/**
 * PageHeader - Универсальный заголовок страницы
 * Соответствует дизайн-системе ChatAI MVP 11
 * Оптимизирован с React.memo для предотвращения лишних перерисовок
 */
const PageHeader = React.memo(({
  title,
  subtitle,
  icon: Icon,
  showAvatar = false,
  user,
  badge,
  actions,
  contextBar,
  className = ''
}) => {
  // Мемоизация приветствия - оно меняется только раз в час
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  }, []); // Пустой массив зависимостей - пересчет раз в час

  // Если есть пользователь и showAvatar, создаем персональное приветствие
  const displayTitle = showAvatar && user
    ? `${greeting}, ${user.first_name || user.email.split('@')[0]}!`
    : title;

  const displaySubtitle = showAvatar && user
    ? subtitle || 'Добро пожаловать в панель управления AI-ассистентом'
    : subtitle;

  return (
    <motion.div
      className={`${DESIGN_TOKENS.spacing.pageHeaderMb} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Основная секция заголовка */}
      <div className={`${DESIGN_TOKENS.layouts.pageHeader} ${showAvatar ? 'px-5 py-4 bg-white border border-gray-200 rounded-xl shadow-sm' : ''}`}>
        <div className="flex items-center space-x-4">
          {/* Аватар пользователя */}
          {showAvatar && (
            <div className={DESIGN_TOKENS.cards.avatar}>
              <FiUser size={28} className="text-purple-600" />
            </div>
          )}

          {/* Иконка страницы */}
          {Icon && !showAvatar && (
            <div className={DESIGN_TOKENS.cards.iconContainer}>
              <Icon size={24} />
            </div>
          )}

          {/* Текстовый контент */}
          <div>
            <h1 className={DESIGN_TOKENS.typography.pageTitle}>
              {displayTitle}
            </h1>
            {displaySubtitle && (
              <p className={`${showAvatar ? 'text-sm text-gray-600' : DESIGN_TOKENS.typography.pageSubtitle} mt-1`}>
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Правая часть с бейджем и действиями */}
        <div className="flex items-center space-x-4">
          {/* Бейдж (например, уровень пользователя) */}
          {badge && (
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center space-x-2">
              <span className="text-purple-600 text-sm font-medium">
                {badge}
              </span>
            </div>
          )}

          {/* Действия */}
          {actions}
        </div>
      </div>

      {/* Контекстная панель (фильтры, breadcrumbs, доп. статистика) */}
      {contextBar && (
        <div className={DESIGN_TOKENS.layouts.contextBar}>
          {contextBar}
        </div>
      )}
    </motion.div>
  );
});

export default PageHeader;