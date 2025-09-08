import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiCheck, FiCreditCard, FiArrowLeft } from 'react-icons/fi';

export default function PaymentSuccess() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    // Получаем данные о платеже из URL параметров
    const { orderId, amount } = router.query;
    if (orderId) {
      setPaymentData({
        orderId,
        amount: amount || '—'
      });

      // Отправляем событие об обновлении баланса
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('balanceUpdated', {
          detail: { shouldReload: true }
        });
        window.dispatchEvent(event);
      }
    } else if (router.isReady) {
      // Если нет параметров и роутер готов - это прямой заход
      setPaymentData({
        orderId: null,
        amount: null,
        directAccess: true
      });
    }
  }, [router.query, router.isReady]);

  return (
    <>
      <Head>
        <title>Оплата успешна - ReplyX</title>
        <meta name="description" content="Ваш платеж был успешно обработан" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Иконка успеха */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {paymentData?.directAccess ? 'Страница успешной оплаты' : 'Оплата успешна!'}
            </h1>
            <p className="text-gray-600">
              {paymentData?.directAccess 
                ? 'На эту страницу вы попадаете после успешной оплаты через Тинькофф.'
                : 'Ваш платеж был успешно обработан. Баланс будет обновлен в течение нескольких минут.'
              }
            </p>
          </div>

          {/* Детали платежа */}
          {paymentData && !paymentData.directAccess && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <FiCreditCard className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Детали платежа</span>
              </div>
              
              {paymentData.amount !== '—' && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Сумма:</span>
                  <span className="font-semibold text-gray-900">{paymentData.amount}₽</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Номер заказа:</span>
                <span className="font-mono text-sm text-gray-900 break-all">
                  {paymentData.orderId}
                </span>
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="space-y-3">
            <Link href="/balance">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                Перейти к балансу
              </button>
            </Link>
            
            <Link href="/">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                <FiArrowLeft className="w-4 h-4" />
                На главную
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}