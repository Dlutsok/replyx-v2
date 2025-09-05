import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiDollarSign, FiCheckCircle, FiClock, FiCreditCard } from 'react-icons/fi';
import { Card, Group, Text, Badge, Progress, Skeleton, Box } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { DESIGN_TOKENS } from '@/constants';

/**
 * MetricCard - Карточка с метрикой/статистикой
 * Соответствует дизайн-системе ChatAI MVP 11 с градиентными значениями
 * Оптимизирована с React.memo для предотвращения лишних перерисовок
 */
const MetricCard = React.memo(({
  title,
  value,
  unit = '',
  icon: Icon,
  trend = null,
  trendDirection = null, // 'up' | 'down' | 'neutral'
  description,
  isLoading = false,
  onClick,
  className = '',
  progressValue = null, // значение от 0 до 100 для прогресс-бара
  variant = 'default' // 'default' | 'compact'
}) => {
  // Мемоизация расчетов тренда для предотвращения лишних вычислений
  const trendData = useMemo(() => {
    const finalTrendDirection = trendDirection || (() => {
      if (!trend) return 'neutral';
      const numericTrend = parseFloat(trend.replace(/[^-\d.]/g, ''));
      if (numericTrend > 0) return 'up';
      if (numericTrend < 0) return 'down';
      return 'neutral';
    })();

    return {
      direction: finalTrendDirection,
      icon: {
        up: IconTrendingUp,
        down: IconTrendingDown,
        neutral: IconMinus
      }[finalTrendDirection],
      color: {
        up: 'green',
        down: 'red',
        neutral: 'gray'
      }[finalTrendDirection]
    };
  }, [trend, trendDirection]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" className={className}>
        <Skeleton height={20} width={120} mb="md" />
        <Skeleton height={32} width={80} mb="sm" />
        <Skeleton height={16} width={100} />
      </Card>
    );
  }

  const content = (
    <>
      {/* Заголовок с иконкой */}
      <Group mb="md">
        {Icon && (
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#f3f0ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={20} color="#7C3AED" />
          </Box>
        )}
        <Text size="sm" c="dimmed">{title}</Text>
      </Group>

      {/* Значение метрики */}
      <Text
        size="xl"
        fw={700}
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        {value}{unit && <Text component="span" size="sm" c="dimmed" ml={4}>{unit}</Text>}
      </Text>

      {/* Описание */}
      {description && (
        <Text size="sm" c="dimmed" mt="xs">
          {description}
        </Text>
      )}

      {/* Прогресс-бар */}
      {progressValue !== null && (
        <Progress
          value={Math.min(100, Math.max(0, progressValue))}
          color="violet"
          size="sm"
          mt="md"
        />
      )}

      {/* Тренд */}
      {trend && (
        <Group mt="xs" gap="xs">
          <trendData.icon size={16} color={trendData.color === 'green' ? '#16a34a' : trendData.color === 'red' ? '#dc2626' : '#6b7280'} />
          <Text size="sm" c={trendData.color} fw={500}>
            {trend}
          </Text>
        </Group>
      )}
    </>
  );

  // Анимация карточки
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  };

  const hoverVariants = onClick ? {
    whileHover: { y: -2, transition: { duration: 0.2 } },
    whileTap: { scale: 0.98 }
  } : {};

  if (onClick) {
    return (
      <motion.div
        onClick={onClick}
        style={{ cursor: 'pointer' }}
        {...cardVariants}
        {...hoverVariants}
      >
        <Card shadow="sm" padding="lg" radius="md" className={className}>
          {content}
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...cardVariants}>
      <Card shadow="sm" padding="lg" radius="md" className={className}>
        {content}
      </Card>
    </motion.div>
  );
});

// Добавляем displayName для лучшей отладки
MetricCard.displayName = 'MetricCard';

// Компактная версия для мест с ограниченным пространством
export const CompactMetricCard = ({ title, value, icon: Icon, trend }) => (
  <MetricCard
    title={title}
    value={value}
    icon={Icon}
    trend={trend}
    variant="compact"
    className="p-4"
  />
);

export default MetricCard;

// Демонстрационный компонент для показа преимуществ новой версии
export const MetricCardDemo = () => {
  const demoMetrics = [
    {
      title: "Вы сэкономили",
      value: "24,500₽",
      icon: FiDollarSign,
      trend: "+15.2%",
      description: "За последние 30 дней"
    },
    {
      title: "Сообщений обработано",
      value: "1,247",
      icon: FiCheckCircle,
      trend: "+8.1%",
      description: "Активных диалогов"
    },
    {
      title: "Время ответа",
      value: "0.8с",
      icon: FiClock,
      trend: "-0.2с",
      description: "Среднее время"
    },
    {
      title: "Баланс",
      value: "1,250₽",
      icon: FiCreditCard,
      trend: "+2.5%",
      description: "Доступно для оплаты"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {demoMetrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          trend={metric.trend}
          description={metric.description}
        />
      ))}
    </div>
  );
};