import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiX, FiAlertCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

export default function PaymentError() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    // Получаем данные о платеже из URL параметров
    const { orderId, amount, errorCode, errorMessage } = router.query;
    if (orderId || errorCode || errorMessage) {
      setPaymentData({
        orderId: orderId || '—',
        amount: amount || '—',
        errorCode: errorCode || '—',
        errorMessage: errorMessage || 'Произошла ошибка при обработке платежа'
      });
    } else if (router.isReady) {
      // Если нет параметров и роутер готов - это прямой заход
      setPaymentData({
        orderId: null,
        amount: null,
        directAccess: true
      });
    }
  }, [router.query, router.isReady]);

  const handleRetryPayment = () => {
    router.push('/balance');
  };

  return (
    <>
      <Head>
        <title>Ошибка оплаты - ReplyX</title>
        <meta name="description" content="Произошла ошибка при обработке вашего платежа" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Иконка ошибки */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiX className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {paymentData?.directAccess ? 'Страница ошибки оплаты' : 'Ошибка оплаты'}
            </h1>
            <p className="text-gray-600">
              {paymentData?.directAccess 
                ? 'На эту страницу вы попадаете при ошибке оплаты через Тинькофф.'
                : 'К сожалению, не удалось обработать ваш платеж. Попробуйте еще раз или обратитесь в поддержку.'
              }
            </p>
          </div>

          {/* Детали ошибки */}
          {paymentData && !paymentData.directAccess && (
            <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <FiAlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">Детали ошибки</span>
              </div>
              
              <div className="space-y-2 text-sm">
                {paymentData.errorMessage !== 'Произошла ошибка при обработке платежа' && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Ошибка:</span>
                    <span className="text-red-600 text-right max-w-xs break-words">
                      {paymentData.errorMessage}
                    </span>
                  </div>
                )}
                
                {paymentData.errorCode !== '—' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Код ошибки:</span>
                    <span className="font-mono text-red-600">{paymentData.errorCode}</span>
                  </div>
                )}
                
                {paymentData.orderId !== '—' && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Номер заказа:</span>
                    <span className="font-mono text-xs text-gray-900 text-right max-w-xs break-all">
                      {paymentData.orderId}
                    </span>
                  </div>
                )}
                
                {paymentData.amount !== '—' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Сумма:</span>
                    <span className="font-semibold text-gray-900">{paymentData.amount}₽</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
            
            <Link href="/">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                <FiArrowLeft className="w-4 h-4" />
                На главную
              </button>
            </Link>
          </div>

          {/* Контактная информация */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Если проблема повторяется, свяжитесь с нашей поддержкой:
            </p>
            <p className="text-sm font-semibold text-purple-600 mt-1">
              support@replyx.ru
            </p>
          </div>
        </div>
      </div>
    </>
  );
}