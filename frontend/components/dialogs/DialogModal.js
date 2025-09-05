import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiMessageCircle, FiGlobe } from 'react-icons/fi';
import MessageHistory from './MessageHistory';
import DialogFooter from './DialogFooter';
import styles from './DialogModal.module.css';
import { API_URL } from '../../config/api';
import { useNotifications } from '../../hooks/useNotifications';

const DialogModal = ({ 
  isOpen, 
  onClose, 
  dialogId, 
  initialDialog = null 
}) => {
  const [dialog, setDialog] = useState(initialDialog);
  const [messages, setMessages] = useState([]);
  const [isTakenOver, setIsTakenOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [takeoverLoading, setTakeoverLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const { showError } = useNotifications();
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  const maxReconnectAttempts = 5;
  const fallbackPollingInterval = 3000; // 3 секунды для fallback polling

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // WebSocket подключение и обработка сообщений
  const connectWebSocket = useCallback(() => {
    if (!dialogId || !token || !isOpen) return;

    // Закрываем существующее соединение
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    try {
      const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
      const wsHost = API_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws/dialogs/${dialogId}?token=${encodeURIComponent(token)}`;
      console.log('🔌 [DialogModal] Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [DialogModal] WebSocket connected');
        setWsConnected(true);
        setWsError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          let data;
          if (event.data === '__ping__') {
            // Отвечаем на ping
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('__pong__');
            }
            return;
          }

          try {
            data = JSON.parse(event.data);
          } catch {
            // Если не JSON, игнорируем
            return;
          }

          console.log('📨 [DialogModal] WebSocket message received:', data);

          // Обрабатываем новые сообщения
          if (data.id && data.sender && data.text) {
            console.log('📥 [DialogModal] Adding new message from WebSocket:', data);
            setMessages(prevMessages => {
              // Проверяем, есть ли уже такое сообщение
              const exists = prevMessages.some(msg => msg.id === data.id);
              if (exists) {
                console.log('⚠️ [DialogModal] Message already exists, skipping:', data.id);
                return prevMessages;
              }
              
              // Добавляем новое сообщение
              console.log('✅ [DialogModal] Message added to state:', data.id);
              return [...prevMessages, data];
            });
          }

          // Обрабатываем события handoff
          if (data.type === 'handoff_started') {
            setIsTakenOver(true);
          } else if (data.type === 'handoff_released') {
            setIsTakenOver(false);
          }

        } catch (err) {
          console.error('❌ [DialogModal] Error processing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [DialogModal] WebSocket error:', error);
        setWsError('Ошибка соединения');
      };

      ws.onclose = (event) => {
        console.log('🔌 [DialogModal] WebSocket closed:', event.code, event.reason);
        setWsConnected(false);
        websocketRef.current = null;

        // Переподключение при ошибках (кроме намеренного закрытия)
        if (isOpen && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`🔄 [DialogModal] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (isOpen && reconnectAttemptsRef.current >= maxReconnectAttempts) {
          // Переключаемся на fallback polling после исчерпания попыток
          console.log('⚠️ [DialogModal] WebSocket reconnection failed, switching to polling fallback');
          setUseFallback(true);
          startFallbackPolling();
        }
      };

    } catch (err) {
      console.error('❌ [DialogModal] Failed to create WebSocket:', err);
      setWsError('Не удалось подключиться');
    }
  }, [dialogId, token, isOpen]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Dialog modal closed');
      websocketRef.current = null;
    }

    setWsConnected(false);
    setWsError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Fallback polling для случаев, когда WebSocket не работает
  const startFallbackPolling = useCallback(() => {
    if (!dialogId || !token || pollingIntervalRef.current) return;

    console.log('🔄 [DialogModal] Starting fallback polling');
    
    const pollMessages = async () => {
      try {
        const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const messagesData = await response.json();
          setMessages(prevMessages => {
            // Обновляем только если есть новые сообщения
            if (messagesData.length !== prevMessages.length) {
              console.log(`🔄 [DialogModal] Polling update: ${prevMessages.length} -> ${messagesData.length} messages`);
              return messagesData;
            }
            return prevMessages;
          });
        }
      } catch (err) {
        console.error('❌ [DialogModal] Polling error:', err);
      }
    };

    // Первичный запрос
    pollMessages();
    
    // Устанавливаем интервал
    pollingIntervalRef.current = setInterval(pollMessages, fallbackPollingInterval);
  }, [dialogId, token]);

  const stopFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('⏹️ [DialogModal] Stopped fallback polling');
    }
  }, []);

  // Загрузка данных диалога
  const loadDialog = useCallback(async () => {
    if (!dialogId || !token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/dialogs/${dialogId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Диалог не найден');
      }

      const dialogData = await response.json();
      setDialog(dialogData);
      // Унифицированная логика: диалог считается перехваченным при статусах 'requested' или 'active'
      setIsTakenOver(dialogData.handoff_status === 'requested' || dialogData.handoff_status === 'active');
    } catch (err) {
      setError(err.message || 'Ошибка загрузки диалога');
    } finally {
      setLoading(false);
    }
  }, [dialogId, token]);

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    if (!dialogId || !token) return;

    try {
      setMessagesLoading(true);
      const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки сообщений');
      }

      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (err) {
      setMessageError(err.message || 'Ошибка загрузки сообщений');
    } finally {
      setMessagesLoading(false);
    }
  }, [dialogId, token]);

  // Перехват диалога
  const handleTakeover = async () => {
    if (!dialogId || !token) return;

    try {
      setTakeoverLoading(true);
      
      // Сначала проверяем текущий статус диалога
      const statusResponse = await fetch(`/api/dialogs/${dialogId}/handoff/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let currentStatus = 'none';
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        currentStatus = statusData.status;
        console.log('Current dialog handoff status:', currentStatus);
      }
      
      // Если диалог не в состоянии 'requested', сначала запрашиваем handoff
      if (currentStatus !== 'requested') {
        console.log('Dialog not in requested state, requesting handoff first...');
        const requestResponse = await fetch(`/api/dialogs/${dialogId}/handoff/request`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: 'manual',
            request_id: crypto.randomUUID()
          })
        });
        
        if (!requestResponse.ok) {
          const errorData = await requestResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Ошибка запроса handoff');
        }
        
        console.log('Handoff requested successfully');
      }
      
      // Теперь делаем takeover
      const takeoverResponse = await fetch(`/api/dialogs/${dialogId}/handoff/takeover`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!takeoverResponse.ok) {
        const errorData = await takeoverResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка перехвата диалога');
      }

      const responseData = await takeoverResponse.json();
      console.log('Takeover successful:', responseData);
      
      // Обновляем состояние на основе ответа от сервера
      setIsTakenOver(responseData.status === 'active');
      
      // Обновляем dialog данные если есть
      if (dialog) {
        setDialog({
          ...dialog,
          handoff_status: responseData.status,
          assigned_manager_id: responseData.assigned_manager?.id
        });
      }
    } catch (err) {
      console.error('Takeover error:', err);
      setError(err.message || 'Ошибка перехвата диалога');
    } finally {
      setTakeoverLoading(false);
    }
  };

  // Освобождение диалога
  const handleRelease = async () => {
    if (!dialogId || !token) return;

    try {
      setTakeoverLoading(true);
      const response = await fetch(`/api/dialogs/${dialogId}/handoff/release`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка освобождения диалога');
      }

      const responseData = await response.json();
      // Диалог освобожден - AI снова может отвечать
      setIsTakenOver(false);
      
      // Обновляем dialog данные если есть
      if (dialog) {
        setDialog({
          ...dialog,
          handoff_status: responseData.status,
          assigned_manager_id: null
        });
      }
    } catch (err) {
      setError(err.message || 'Ошибка освобождения диалога');
    } finally {
      setTakeoverLoading(false);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (messageText) => {
    console.log('🔄 [FRONTEND] Начинаем отправку сообщения от менеджера');
    console.log('🔄 [FRONTEND] Dialog ID:', dialogId);
    console.log('🔄 [FRONTEND] Token есть:', !!token);
    console.log('🔄 [FRONTEND] Текст сообщения:', messageText);

    if (!dialogId || !token || !messageText.trim()) {
      const errorMsg = !dialogId ? 'ID диалога не найден' :
                      !token ? 'Не авторизован' :
                      !messageText.trim() ? 'Текст сообщения пустой' : 'Неизвестная ошибка';
      console.error('❌ [FRONTEND] Отсутствуют обязательные параметры:', errorMsg);
      setMessageError(errorMsg);
      return;
    }

    try {
      setSendLoading(true);
      setMessageError('');

      const requestBody = {
        sender: 'manager',
        text: messageText
      };

      console.log('🔄 [FRONTEND] Данные запроса:', requestBody);
      console.log('🔄 [FRONTEND] URL запроса:', `/api/dialogs/${dialogId}/messages`);

      const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔄 [FRONTEND] Получен ответ:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [FRONTEND] Ошибка сервера:', errorData);

        let errorMessage = 'Ошибка отправки сообщения';
        if (response.status === 402) {
          errorMessage = 'Недостаточно средств на балансе для отправки сообщения';
        } else if (response.status === 403) {
          errorMessage = 'У вас нет прав на отправку сообщений в этом диалоге';
        } else if (response.status === 404) {
          errorMessage = 'Диалог не найден';
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('✅ [FRONTEND] Успешный ответ:', responseData);

      // Оптимистичное обновление: добавляем сообщение сразу, если WebSocket подключен
      // WebSocket может не успеть доставить обновление моментально
      if (wsConnected && responseData.id) {
        setMessages(prevMessages => {
          // Проверяем, есть ли уже такое сообщение
          const exists = prevMessages.some(msg => msg.id === responseData.id);
          if (!exists) {
            return [...prevMessages, responseData];
          }
          return prevMessages;
        });
      }

      // Перезагружаем сообщения только если WebSocket не подключен
      if (!wsConnected) {
        console.log('🔄 [FRONTEND] Перезагружаем сообщения (WebSocket не подключен)...');
        await loadMessages();
        console.log('✅ [FRONTEND] Сообщения перезагружены');
      } else {
        console.log('✅ [FRONTEND] Сообщение добавлено оптимистично');
      }
    } catch (err) {
      console.error('❌ [FRONTEND] Ошибка отправки:', err);
      const errorMessage = err.message || 'Произошла неизвестная ошибка при отправке сообщения';
      setMessageError(errorMessage);

      // Показываем уведомление пользователю
      showError(errorMessage, {
        title: 'Ошибка отправки сообщения'
      });

      throw err;
    } finally {
      setSendLoading(false);
    }
  };

  // Сброс состояния при закрытии
  const handleClose = () => {
    setMessages([]);
    setError('');
    setMessageError('');
    setIsTakenOver(false);
    setWsConnected(false);
    setWsError(null);
    setUseFallback(false);
    disconnectWebSocket();
    stopFallbackPolling();
    onClose();
  };

  // Клик по оверлею
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Управление WebSocket соединением
  useEffect(() => {
    if (isOpen && dialogId) {
      if (!useFallback) {
        // Устанавливаем WebSocket соединение
        connectWebSocket();
      } else {
        // Используем fallback polling
        startFallbackPolling();
      }
    } else {
      // Закрываем соединение при закрытии модала
      disconnectWebSocket();
      stopFallbackPolling();
    }

    // Cleanup при размонтировании
    return () => {
      disconnectWebSocket();
      stopFallbackPolling();
    };
  }, [isOpen, dialogId, useFallback, connectWebSocket, disconnectWebSocket, startFallbackPolling, stopFallbackPolling]);

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && dialogId) {
      if (!initialDialog) {
        loadDialog();
      } else {
        setDialog(initialDialog);
        // Унифицированная логика: диалог считается перехваченным при статусах 'requested' или 'active'
        setIsTakenOver(initialDialog.handoff_status === 'requested' || initialDialog.handoff_status === 'active');
      }
      loadMessages();
    }
  }, [isOpen, dialogId, initialDialog, loadDialog, loadMessages]);

  // Если диалог не найден
  if (isOpen && error && !dialog) {
    return createPortal(
      <div
        className={styles.modalOverlay}
        onClick={handleOverlayClick}
      >
        <div className={styles.errorModal}>
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button onClick={handleClose} className={styles.errorButton}>
            Закрыть
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.dialogModal}>
            {/* Floating close button in top-right corner */}
            <button
              className={styles.floatingClose}
              onClick={handleClose}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className={styles.dialogContent}>
            {loading || !dialog ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}>
                  ⟳
                </div>
                <p>Загрузка диалога...</p>
              </div>
            ) : (
              <div className={styles.modalBody}>
                {/* Левая колонка: чат */}
                <div className={styles.chatPane}>
                  {/* Индикатор статуса подключения */}
                  <div className={styles.connectionStatus}>
                    <div className={`${styles.statusDot} ${wsConnected ? styles.connected : useFallback ? styles.fallback : styles.disconnected}`} />
                    <span className={styles.statusText}>
                      {wsConnected 
                        ? 'Real-time подключено' 
                        : useFallback 
                          ? 'Режим опроса (fallback)' 
                          : wsError 
                            ? `Ошибка: ${wsError}` 
                            : 'Подключение...'
                      }
                    </span>
                  </div>
                  
                  <div className={styles.chatScroll}>
                    <MessageHistory
                      messages={messages}
                      loading={messagesLoading}
                      error={messageError}
                    />
                  </div>

                  <div className={styles.chatFooter}>
                    <DialogFooter
                      dialog={dialog}
                      isTakenOver={isTakenOver}
                      onTakeover={handleTakeover}
                      onRelease={handleRelease}
                      onSendMessage={handleSendMessage}
                      loading={takeoverLoading}
                      sendLoading={sendLoading}
                      error={messageError}
                    />
                  </div>
                </div>

                {/* Правая колонка: информация о клиенте и визите (визуал, без бэка) */}
                <aside className={styles.infoPane}>
                  <div className={styles.infoSection}>
                    <div className={styles.infoHeader}>О клиенте</div>
                    <div className={styles.clientCard}>
                      <div className={styles.clientRow}>
                        <div className={styles.avatarCircle}>{(dialog?.name || dialog?.telegram_username || 'Гость')?.[0] || '👤'}</div>
                        <div>
                          <div className={styles.clientName}>{dialog?.name || dialog?.telegram_username || 'Без имени'}</div>
                          <div className={styles.clientTag}>Новый</div>
                        </div>
                      </div>
                      <div className={styles.clientDesc}>Описание</div>
                      <div className={styles.inlineActions}>
                        <button className={styles.ghostButton}>Создать сделку</button>
                        <button className={styles.ghostButton}>Создать задачу</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoSection}>
                    <div className={styles.infoHeader}>О диалоге</div>
                    <div className={styles.infoCard}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Ник в Telegram</span>
                        <span className={styles.metaValue}>{dialog?.telegram_username ? `@${dialog.telegram_username}` : '—'}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Канал</span>
                        <span className={styles.metaValue}>
                          <div className="flex items-center gap-1">
                            {dialog?.channel_type === 'telegram' ? (
                              <>
                                <FiMessageCircle className="w-3 h-3" />
                                <span>Telegram</span>
                              </>
                            ) : (
                              <>
                                <FiGlobe className="w-3 h-3" />
                                <span>Сайт</span>
                              </>
                            )}
                          </div>
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Тема обращения</span>
                        <span className={styles.metaMuted}>Не указана</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoSection}>
                    <div className={styles.infoHeader}>Контакты</div>
                    <div className={styles.infoCard}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Email</span>
                        <span className={styles.metaValue}>{dialog?.email || '—'}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Телефон</span>
                        <span className={styles.metaValue}>{dialog?.phone || '—'}</span>
                      </div>
                      <button className={styles.linkButton}>Добавить телефон/почту</button>
                    </div>
                  </div>

                  <div className={styles.infoSection}>
                    <div className={styles.infoHeader}>Атрибуты</div>
                    <div className={styles.infoCard}>
                      <div className={styles.metaMuted}>Атрибутов нет</div>
                      <button className={styles.linkButton}>Добавить для сбора данных</button>
                    </div>
                  </div>

                  <div className={styles.infoSection}>
                    <div className={styles.infoHeader}>Подробнее о визите</div>
                    <div className={styles.infoCard}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Источники</span>
                        <span className={styles.metaValue}>Прямой вход</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Заходы</span>
                        <span className={styles.metaValue}>2-й заход</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Город</span>
                        <span className={styles.metaValue}>—</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}
            
            {error && (
              <div className={styles.errorNotification}>
                {error}
                <button onClick={() => setError('')}>✕</button>
              </div>
            )}
            </div>
      </div>
    </div>,
    document.body
  );
};

export default DialogModal;