import { 
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiCreditCard,
  FiPieChart, FiUsers, FiBarChart
} from 'react-icons/fi';

const RevenueAnalyticsPanel = ({ revenueData, formatters, isLoading }) => {
  // Получаем финансовые данные
  const stats = {
    total_revenue: revenueData?.total_revenue || 0,
    avg_order_value: revenueData?.transaction_stats?.topup_transactions > 0 
      ? (revenueData?.revenue_by_period?.current_period / revenueData?.transaction_stats?.topup_transactions) 
      : 0,
    paying_users: revenueData?.transaction_stats?.topup_transactions || 0,
    conversion_rate: revenueData?.balance_stats?.total_user_balance > 0 
      ? ((revenueData?.transaction_stats?.topup_transactions / (revenueData?.balance_stats?.total_user_balance || 1)) * 100) 
      : 0,
    revenue_growth: revenueData?.revenue_growth?.growth_rate || 0,
    aov_growth: 0, // Можно вычислить позже если нужно
    paying_users_growth: 0, // Можно вычислить позже если нужно
    conversion_growth: 0 // Можно вычислить позже если нужно
  };
  
  // Генерируем данные по дням (заглушка с реальной структурой)
  const dailyRevenue = revenueData?.daily_revenue || [];
  
  // Данные методов оплаты из API (без заглушек)
  const paymentMethods = revenueData?.payment_methods || [];
  
  const topSpenders = revenueData?.top_paying_users || [];

  // Компонент загрузки
  const LoadingCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="space-y-3">
        <div className="w-20 h-4 bg-gray-200 rounded"></div>
        <div className="w-16 h-8 bg-gray-200 rounded"></div>
        <div className="w-32 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  // Основные финансовые метрики
  const RevenueStats = () => {
    const revenueMetrics = [
      {
        key: 'total_revenue',
        title: 'Общая выручка',
        value: formatters.currency(stats.total_revenue),
        growth: stats.revenue_growth,
        icon: FiDollarSign,
        color: 'green'
      },
      {
        key: 'avg_order_value',
        title: 'Средний чек',
        value: formatters.currency(stats.avg_order_value),
        growth: stats.aov_growth,
        icon: FiCreditCard,
        color: 'blue'
      },
      {
        key: 'paying_users',
        title: 'Платящих пользователей',
        value: formatters.number(stats.paying_users),
        growth: stats.paying_users_growth,
        icon: FiUsers,
        color: 'purple'
      },
      {
        key: 'conversion_rate',
        title: 'Конверсия в покупку',
        value: formatters.percentage(stats.conversion_rate),
        growth: stats.conversion_growth,
        icon: FiTrendingUp,
        color: 'orange'
      }
    ];

    return (
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900">Финансовые показатели</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueMetrics.map(metric => {
            const isPositiveGrowth = (metric.growth || 0) > 0;
            const GrowthIcon = isPositiveGrowth ? FiTrendingUp : FiTrendingDown;
            const growthColorClass = isPositiveGrowth ? 'text-green-600' : 'text-red-600';

            return (
              <div key={metric.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                    <metric.icon size={16} className={`text-${metric.color}-600`} />
                  </div>
                  {metric.growth !== undefined && metric.growth !== 0 && (
                    <div className={`flex items-center gap-1 ${growthColorClass} text-xs font-medium`}>
                      <GrowthIcon size={12} />
                      {formatters.percentage(Math.abs(metric.growth))}
                    </div>
                  )}
                </div>
                <h5 className="text-sm font-medium text-gray-600 mb-1">{metric.title}</h5>
                <div className="text-xl font-bold text-gray-900">
                  {metric.value || '0'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // График ежедневной выручки
  const DailyRevenueChart = () => {
    const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue || 0));

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Ежедневная выручка</h4>
        {dailyRevenue.length > 0 ? (
          <div className="space-y-3">
            {dailyRevenue.map(day => {
              const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600 flex-shrink-0">
                    {formatters.date(day.date)}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-sm text-gray-900 text-right font-medium">
                    {formatters.currency(day.revenue || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiBarChart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по дням отсутствуют</p>
          </div>
        )}
      </div>
    );
  };

  // Методы оплаты
  const PaymentMethodsChart = () => {
    const totalPayments = paymentMethods.reduce((sum, method) => sum + (method.count || 0), 0);

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Методы оплаты</h4>
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map(method => {
              const percentage = totalPayments > 0 ? (method.count / totalPayments) * 100 : 0;
              
              return (
                <div key={method.method} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiCreditCard size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {method.method}
                      </div>
                      <div className="text-sm text-gray-500">
                        {method.count} транзакций
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatters.percentage(percentage)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatters.currency(method.amount || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiPieChart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по методам оплаты отсутствуют</p>
          </div>
        )}
      </div>
    );
  };

  // Топ клиентов по тратам
  const TopSpenders = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Топ клиентов по тратам</h4>
        {topSpenders.length > 0 ? (
          <div className="space-y-3">
            {topSpenders.map((spender, index) => (
              <div key={spender.user_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#6334E5]/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#6334E5]">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {spender.email?.split('@')[0] || 'Пользователь'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {spender.email}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatters.currency(spender.total_paid || 0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {spender.transaction_count || 0} транзакций
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiUsers size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по клиентам отсутствуют</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Финансовая аналитика
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Детальный анализ выручки, платежей и финансовых показателей
        </p>
      </div>

      {/* Финансовые показатели */}
      <RevenueStats />

      {/* Графики и детальная аналитика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <DailyRevenueChart />
        </div>
        <PaymentMethodsChart />
        <TopSpenders />
      </div>
    </div>
  );
};

export default RevenueAnalyticsPanel;