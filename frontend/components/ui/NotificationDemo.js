import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { DESIGN_TOKENS } from '../../constants/designSystem';

// Демонстрационный компонент для тестирования новой системы уведомлений
export default function NotificationDemo() {
  const { showSuccess, showError, showWarning, showInfo, showLoading, updateNotification } = useNotifications();

  const handleShowSuccess = () => {
    showSuccess('Операция выполнена успешно!', {
      title: 'Успех'
    });
  };

  const handleShowError = () => {
    showError('Произошла ошибка при выполнении операции', {
      title: 'Ошибка',
      duration: 8000
    });
  };

  const handleShowWarning = () => {
    showWarning('Внимание! Проверьте введенные данные', {
      title: 'Предупреждение'
    });
  };

  const handleShowInfo = () => {
    showInfo('Информация о новых возможностях системы', {
      title: 'Информация',
      action: {
        label: 'Подробнее',
        onClick: () => alert('Подробнее о новых возможностях')
      }
    });
  };

  const handleShowLoading = () => {
    const loadingId = showLoading('Загрузка данных...', {
      title: 'Обработка'
    });

    // Имитируем загрузку и обновляем уведомление
    setTimeout(() => {
      updateNotification(loadingId, {
        type: 'success',
        message: 'Данные успешно загружены!',
        title: 'Завершено',
        autoClose: true,
        duration: 3000
      });
    }, 3000);
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200">
      <h3 className={DESIGN_TOKENS.typography.cardTitle + ' mb-4'}>
        Демо: Система уведомлений ReplyX
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleShowSuccess}
          className={`${DESIGN_TOKENS.buttons.secondary} text-green-600 border-green-300 hover:border-green-500`}
        >
          ✅ Показать успех
        </button>

        <button
          onClick={handleShowError}
          className={`${DESIGN_TOKENS.buttons.secondary} text-red-600 border-red-300 hover:border-red-500`}
        >
          ❌ Показать ошибку
        </button>

        <button
          onClick={handleShowWarning}
          className={`${DESIGN_TOKENS.buttons.secondary} text-yellow-600 border-yellow-300 hover:border-yellow-500`}
        >
          ⚠️ Показать предупреждение
        </button>

        <button
          onClick={handleShowInfo}
          className={`${DESIGN_TOKENS.buttons.secondary} text-purple-600 border-purple-300 hover:border-purple-500`}
        >
          ℹ️ Показать информацию
        </button>

        <button
          onClick={handleShowLoading}
          className={`${DESIGN_TOKENS.buttons.secondary} text-gray-600 border-gray-300 hover:border-gray-500 sm:col-span-2`}
        >
          🔄 Показать загрузку
        </button>
      </div>

      <p className={DESIGN_TOKENS.typography.smallText + ' mt-4 text-center'}>
        Все уведомления в фирменном стиле ReplyX с анимациями
      </p>
    </div>
  );
}