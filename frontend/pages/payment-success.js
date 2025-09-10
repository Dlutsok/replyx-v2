import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks';
import { FiCheck, FiArrowRight, FiCreditCard, FiRefreshCw } from 'react-icons/fi';

export default function PaymentSuccess() {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const processPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('OrderId') || urlParams.get('order');
        const paymentId = urlParams.get('PaymentId');
        const success = urlParams.get('Success') === 'true' || !urlParams.get('ErrorCode');
        
        if (!orderId) {
          setError('Не указан номер заказа');
          setIsProcessing(false);
          return;
        }

        // Отправляем информацию о результате платежа на backend
        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('success', success);
        if (paymentId) formData.append('payment_id', paymentId);

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

        if (!response.ok) {
          throw new Error('Ошибка обработки платежа');
        }

        const result = await response.json();

      } catch (error) {
        setError(error.message);
      } finally {
        setIsProcessing(false);
      }
    };

    if (router.isReady) {
      processPayment();
    }
  }, [router.isReady]);

  const handleGoToBalance = () => {
    router.push('/balance');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Оплата успешна - ReplyX</title>
        <meta name="description" content="Платеж успешно обработан" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#6334E5]/10 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="w-16 h-16 border-4 border-[#6334E5]/30 border-t-[#6334E5] rounded-full animate-spin"></div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Обрабатываем платеж...
              </h1>
              <p className="text-gray-600 mb-6">
                Пожалуйста, подождите, идет зачисление средств на ваш баланс
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <FiRefreshCw className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-red-900 mb-2">
                Ошибка обработки
              </h1>
              <p className="text-red-600 mb-6">
                {error}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleGoToBalance}
                  className="w-full bg-[#6334E5] text-white py-3 px-6 rounded-xl hover:bg-[#5028c2] transition-colors flex items-center justify-center gap-2"
                >
                  <FiCreditCard className="w-5 h-5" />
                  Перейти к балансу
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Платеж успешен!
              </h1>
              <p className="text-gray-600 mb-6">
                Средства зачислены на ваш баланс. Теперь вы можете использовать все возможности ReplyX.
              </p>
              
              <div className="bg-[#6334E5]/10 rounded-xl p-4 mb-6">
                <p className="text-sm text-[#4c1d95] font-medium">
                  🎉 Баланс успешно пополнен!
                </p>
                <p className="text-xs text-[#6334E5] mt-1">
                  Обновленный баланс будет отображен в личном кабинете
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGoToBalance}
                  className="w-full bg-[#6334E5] text-white py-3 px-6 rounded-xl hover:bg-[#5028c2] transition-colors flex items-center justify-center gap-2"
                >
                  <FiCreditCard className="w-5 h-5" />
                  Посмотреть баланс
                </button>
                
                <button
                  onClick={handleGoToDashboard}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FiArrowRight className="w-5 h-5" />
                  В личный кабинет
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Если у вас возникли вопросы, обратитесь в поддержку
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}