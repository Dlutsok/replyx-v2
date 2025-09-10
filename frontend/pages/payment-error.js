import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks';
import { FiX, FiArrowLeft, FiCreditCard, FiAlertCircle } from 'react-icons/fi';

export default function PaymentError() {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  
  useEffect(() => {
    const processPaymentError = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('OrderId') || urlParams.get('order');
        const errorCode = urlParams.get('ErrorCode');
        const errorMessage = urlParams.get('Message') || urlParams.get('ErrorMessage');
        
        setErrorDetails({
          orderId,
          errorCode,
          errorMessage: errorMessage || 'Неизвестная ошибка'
        });

        // Уведомляем backend о неудачном платеже
        if (orderId) {
          const formData = new FormData();
          formData.append('order_id', orderId);
          formData.append('success', false);
          formData.append('error_message', errorMessage || `Код ошибки: ${errorCode}`);

          const headers = {};
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/payments/complete-payment', {
            method: 'POST',
            body: formData,
            headers: headers
          });

          if (response.ok) {
          }
        }

      } catch (error) {
      } finally {
        setIsProcessing(false);
      }
    };

    if (router.isReady) {
      processPaymentError();
    }
  }, [router.isReady]);

  const handleTryAgain = () => {
    router.push('/balance');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const getErrorMessage = () => {
    if (!errorDetails) return 'Произошла ошибка при обработке платежа';
    
    const { errorCode, errorMessage } = errorDetails;
    
    // Расшифровываем частые коды ошибок Т-Банк
    const commonErrors = {
      '101': 'Недостаточно средств на карте',
      '116': 'Превышен лимит на карте',
      '117': 'Неверный код CVV',
      '206': 'Карта заблокирована банком',
      '300': 'Платеж отклонен банком',
      '9999': 'Системная ошибка. Попробуйте позже'
    };
    
    return commonErrors[errorCode] || errorMessage || 'Неизвестная ошибка';
  };

  return (
    <>
      <Head>
        <title>Ошибка оплаты - ReplyX</title>
        <meta name="description" content="Произошла ошибка при обработке платежа" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Обрабатываем результат...
              </h1>
              <p className="text-gray-600 mb-6">
                Анализируем причину ошибки
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <FiX className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Платеж не прошел
              </h1>
              
              <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Причина ошибки:
                    </p>
                    <p className="text-sm text-red-700">
                      {getErrorMessage()}
                    </p>
                    {errorDetails?.errorCode && (
                      <p className="text-xs text-red-600 mt-2">
                        Код ошибки: {errorDetails.errorCode}
                      </p>
                    )}
                    {errorDetails?.orderId && (
                      <p className="text-xs text-red-600">
                        Номер заказа: {errorDetails.orderId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  💡 Что делать дальше:
                </p>
                <ul className="text-xs text-blue-700 text-left space-y-1">
                  <li>• Проверьте данные карты</li>
                  <li>• Убедитесь в достаточности средств</li>
                  <li>• Попробуйте другую карту</li>
                  <li>• Обратитесь в ваш банк</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full bg-[#6334E5] text-white py-3 px-6 rounded-xl hover:bg-[#5028c2] transition-colors flex items-center justify-center gap-2"
                >
                  <FiCreditCard className="w-5 h-5" />
                  Попробовать снова
                </button>
                
                <button
                  onClick={handleGoToDashboard}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FiArrowLeft className="w-5 h-5" />
                  Вернуться в кабинет
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Если проблема повторяется, обратитесь в поддержку ReplyX
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}