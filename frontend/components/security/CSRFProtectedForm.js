/**
 * 🛡️ CSRF PROTECTED FORM COMPONENT
 * Компонент формы с автоматической CSRF защитой
 */

import React, { forwardRef, useEffect, useState } from 'react';
import { useCSRFProtection, CSRFTokenInput } from '../../hooks/useCSRFProtection';

const CSRFProtectedForm = forwardRef(({
  children,
  onSubmit,
  action,
  method = 'POST',
  className,
  autoSubmit = false,
  showLoader = true,
  ...props
}, ref) => {
  const { 
    csrfToken, 
    isLoading: csrfLoading, 
    error: csrfError,
    submitFormWithCSRF,
    ensureToken 
  } = useCSRFProtection();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  // Обработчик отправки формы
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const form = event.target;
      const formData = new FormData(form);
      
      if (onSubmit) {
        // Пользовательский обработчик
        await onSubmit(event, formData);
      } else if (action) {
        // Автоматическая отправка на action URL
        const response = await submitFormWithCSRF(action, formData, {
          method: method,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // Можно добавить обработку успешного ответа
      }
      
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Предварительная загрузка CSRF токена
  useEffect(() => {
    if (!csrfToken) {
      ensureToken();
    }
  }, [csrfToken, ensureToken]);
  
  // Отображение ошибок
  if (csrfError) {
    return (
      <div className="csrf-error bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Ошибка безопасности</div>
        <div className="text-red-600 text-sm mt-1">
          Не удалось загрузить токен безопасности. Попробуйте обновить страницу.
        </div>
        <div className="text-xs text-red-500 mt-2">{csrfError}</div>
      </div>
    );
  }
  
  // Показывать лоадер пока загружается CSRF токен
  if (csrfLoading && showLoader) {
    return (
      <div className="csrf-loading bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Загрузка формы...</span>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {submitError && (
        <div className="form-error bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="text-red-800 font-medium text-sm">Ошибка отправки формы</div>
          <div className="text-red-600 text-sm mt-1">{submitError}</div>
        </div>
      )}
      
      <form
        ref={ref}
        className={className}
        onSubmit={handleSubmit}
        {...props}
      >
        {/* Скрытое поле с CSRF токеном */}
        <CSRFTokenInput />
        
        {/* Контент формы */}
        {typeof children === 'function' ? 
          children({ 
            isSubmitting, 
            csrfToken, 
            error: submitError 
          }) : 
          children
        }
        
        {/* Индикатор загрузки при отправке */}
        {isSubmitting && showLoader && (
          <div className="form-submitting absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-md">
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-600">Отправка...</span>
            </div>
          </div>
        )}
      </form>
    </>
  );
});

CSRFProtectedForm.displayName = 'CSRFProtectedForm';

export default CSRFProtectedForm;