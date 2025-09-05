import { useState, useEffect, useRef } from 'react';
import { FiTrendingUp, FiRefreshCw, FiBarChart, FiActivity } from 'react-icons/fi';

const MetricsChart = ({ metrics, loading, onRefresh, period, onPeriodChange }) => {
  const canvasRef = useRef(null);
  const [chartType, setChartType] = useState('messages'); // 'messages', 'response_time', 'satisfaction'
  const [isInteracting, setIsInteracting] = useState(false);

  // Мок данных для демонстрации трендов (в реальном проекте приходит из API)
  const generateChartData = () => {
    const data = {
      messages: {
        title: 'Сообщения по времени',
        color: '#6366f1',
        values: [],
        labels: []
      },
      response_time: {
        title: 'Время ответа',
        color: '#f59e0b', 
        values: [],
        labels: []
      },
      satisfaction: {
        title: 'Удовлетворенность',
        color: '#ec4899',
        values: [],
        labels: []
      }
    };

    // Генерируем данные на основе периода
    const pointsCount = period === 'day' ? 24 : period === 'week' ? 7 : 30;
    
    for (let i = 0; i < pointsCount; i++) {
      // Генерируем реалистичные данные с трендами
      const baseMessages = metrics?.totalMessages || 100;
      const baseResponseTime = metrics?.avgResponseTime || 5;
      const baseSatisfaction = metrics?.customerSatisfaction || 4.2;
      
      data.messages.values.push(Math.max(0, baseMessages + (Math.random() - 0.5) * 50));
      data.response_time.values.push(Math.max(0.5, baseResponseTime + (Math.random() - 0.5) * 3));
      data.satisfaction.values.push(Math.max(1, Math.min(5, baseSatisfaction + (Math.random() - 0.5) * 1)));
      
      // Генерируем подписи
      if (period === 'day') {
        data.messages.labels.push(`${i}:00`);
        data.response_time.labels.push(`${i}:00`);
        data.satisfaction.labels.push(`${i}:00`);
      } else if (period === 'week') {
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        data.messages.labels.push(days[i]);
        data.response_time.labels.push(days[i]);
        data.satisfaction.labels.push(days[i]);
      } else {
        data.messages.labels.push(`${i + 1}`);
        data.response_time.labels.push(`${i + 1}`);
        data.satisfaction.labels.push(`${i + 1}`);
      }
    }

    return data;
  };

  // Простая реализация Canvas-графика (альтернатива Chart.js)
  const drawSimpleChart = (canvas, data) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    const chartData = data[chartType];
    if (!chartData || !chartData.values.length) return;
    
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxValue = Math.max(...chartData.values);
    const minValue = Math.min(...chartData.values);
    const valueRange = maxValue - minValue || 1;
    
    // Рисуем оси
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Вертикальная ось
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    // Горизонтальная ось
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Рисуем сетку
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Рисуем линию графика
    if (chartData.values.length > 1) {
      ctx.strokeStyle = chartData.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      chartData.values.forEach((value, index) => {
        const x = padding + (chartWidth / (chartData.values.length - 1)) * index;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Рисуем точки
      ctx.fillStyle = chartData.color;
      chartData.values.forEach((value, index) => {
        const x = padding + (chartWidth / (chartData.values.length - 1)) * index;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Добавляем градиент под линией
      const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      gradient.addColorStop(0, chartData.color + '20');
      gradient.addColorStop(1, chartData.color + '05');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      chartData.values.forEach((value, index) => {
        const x = padding + (chartWidth / (chartData.values.length - 1)) * index;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(width - padding, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fill();
    }
    
    // Подписи значений
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    
    // Показываем только каждую 3-ю подпись для читаемости
    chartData.labels.forEach((label, index) => {
      if (index % Math.ceil(chartData.labels.length / 8) === 0) {
        const x = padding + (chartWidth / (chartData.values.length - 1)) * index;
        ctx.fillText(label, x, height - 15);
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;
    
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = canvas.offsetWidth / 2 + 'px';
    canvas.style.height = canvas.offsetHeight / 2 + 'px';
    
    const data = generateChartData();
    drawSimpleChart(canvas, data);
  }, [metrics, chartType, period, loading]);

  const chartTypes = [
    { id: 'messages', label: 'Сообщения', icon: FiBarChart, color: '#6366f1' },
    { id: 'response_time', label: 'Время ответа', icon: FiActivity, color: '#f59e0b' },
    { id: 'satisfaction', label: 'Удовлетворенность', icon: FiTrendingUp, color: '#ec4899' }
  ];

  const periods = [
    { id: 'day', label: 'День' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="flex space-x-2 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiTrendingUp className="mr-2 text-blue-600" />
          Аналитика производительности
        </h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Переключатели типа графика */}
      <div className="flex flex-wrap gap-2 mb-4">
        {chartTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setChartType(type.id)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              chartType === type.id
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <type.icon className="w-4 h-4 mr-2" style={{ color: type.color }} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Переключатели периода */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-600 mr-2">Период:</span>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={period === p.id ? { backgroundColor: '#7C3AED' } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* График */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-64 rounded-lg border border-gray-100"
          style={{ touchAction: 'none' }}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
        />
        
        {/* Показываем текущие значения при взаимодействии */}
        {isInteracting && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-lg">
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">
                {chartTypes.find(t => t.id === chartType)?.label}
              </div>
              <div className="text-gray-600">
                {chartType === 'messages' && `${metrics?.totalMessages || 0} сообщений`}
                {chartType === 'response_time' && `${metrics?.avgResponseTime || 0}с среднее время`}
                {chartType === 'satisfaction' && `${metrics?.customerSatisfaction || 0}/5 рейтинг`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Статистика под графиком */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
        {chartTypes.map((type) => {
          let value = 0;
          let change = 0;
          
          if (type.id === 'messages') {
            value = metrics?.totalMessages || 0;
            change = metrics?.changes?.totalMessages || 0;
          } else if (type.id === 'response_time') {
            value = metrics?.avgResponseTime || 0;
            change = metrics?.changes?.avgResponseTime || 0;
          } else if (type.id === 'satisfaction') {
            value = metrics?.customerSatisfaction || 0;
            change = metrics?.changes?.customerSatisfaction || 0;
          }
          
          return (
            <div key={type.id} className="text-center">
              <div className="flex items-center justify-center mb-1">
                <type.icon className="w-4 h-4 mr-1" style={{ color: type.color }} />
                <span className="text-sm font-medium text-gray-600">{type.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {type.id === 'satisfaction' ? value.toFixed(1) : Math.round(value)}
                {type.id === 'response_time' && 'с'}
              </div>
              <div className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}% за период
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MetricsChart;