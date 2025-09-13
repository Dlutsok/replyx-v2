import { motion } from 'framer-motion';
import { LoadingIndicator } from '@/components/common/LoadingComponents';
import { 
  FiActivity, FiMessageCircle, FiUsers, FiClock, FiStar, FiBarChart2, FiTrendingUp
} from 'react-icons/fi';

export default function AnalyticsTab({ stats, loading, onRefreshData }) {
  const metrics = [
    {
      label: 'Всего диалогов',
      value: stats?.totalDialogs || 0,
      icon: FiMessageCircle,
      color: 'blue',
      change: stats?.dialogsChange || 0
    },
    {
      label: 'Активные пользователи',
      value: stats?.activeUsers || 0,
      icon: FiUsers,
      color: 'green',
      change: stats?.usersChange || 0
    },
    {
      label: 'Время отклика',
      value: stats?.responseTime || '0ms',
      icon: FiClock,
      color: 'purple',
      change: stats?.responseTimeChange || 0
    },
    {
      label: 'Средняя оценка',
      value: stats?.avgRating || '0.0',
      icon: FiStar,
      color: 'yellow',
      change: stats?.ratingChange || 0
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border border-solid border-blue-200/60',
      green: 'bg-green-50 text-green-600 border border-solid border-green-200/60',
      purple: 'bg-[#6334E5]/10 text-[#6334E5] border border-solid border-[#6334E5]/30',
      yellow: 'bg-yellow-50 text-yellow-600 border border-solid border-yellow-200/60'
    };
    return colors[color] || colors.blue;
  };

  const formatChange = (change) => {
    if (!change || change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <FiTrendingUp size={12} className={`mr-1 ${isPositive ? '' : 'rotate-180'}`} />
        {Math.abs(change)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingIndicator message="Загрузка аналитики..." size="medium" />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60 hover:border-gray-200/70 transition-all duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getColorClasses(metric.color)}`}>
                      <Icon size={20} />
                    </div>
                    {formatChange(metric.change)}
                  </div>

                  <div className="mt-4">
                    <div className="text-2xl font-semibold text-gray-900">
                      {metric.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {metric.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Chart */}
            <div className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Использование по дням</h4>
                <FiBarChart2 className="text-gray-400" size={20} />
              </div>

              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200/60 rounded-2xl">
                <div className="text-center text-gray-500">
                  <FiBarChart2 size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>График будет доступен позже</p>
                  <p className="text-sm">Интеграция с системой аналитики</p>
                </div>
              </div>
            </div>

            {/* Response Time Chart */}
            <div className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Время отклика</h4>
                <FiClock className="text-gray-400" size={20} />
              </div>

              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200/60 rounded-2xl">
                <div className="text-center text-gray-500">
                  <FiClock size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>График времени отклика</p>
                  <p className="text-sm">Статистика по производительности</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Последняя активность</h4>

            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 py-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{activity.message}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(activity.timestamp).toLocaleString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiActivity size={32} className="mx-auto mb-3 text-gray-300" />
                <p>Нет активности для отображения</p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-white p-6 rounded-2xl border border-solid border-gray-200/60">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Сводка за период</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
                <div className="text-2xl font-semibold text-gray-900">{stats?.totalMessages || 0}</div>
                <div className="text-sm text-gray-600">Сообщений</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
                <div className="text-2xl font-semibold text-gray-900">{stats?.avgSessionDuration || '0м'}</div>
                <div className="text-sm text-gray-600">Длительность сессии</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
                <div className="text-2xl font-semibold text-gray-900">{stats?.satisfactionRate || '0%'}</div>
                <div className="text-sm text-gray-600">Удовлетворенность</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gray-50/50 border border-solid border-gray-200/40 hover:bg-gray-50 hover:border-gray-200/60 transition-all duration-150">
                <div className="text-2xl font-semibold text-gray-900">{stats?.resolvedIssues || 0}</div>
                <div className="text-sm text-gray-600">Решено вопросов</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}