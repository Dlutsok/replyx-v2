/**
 * useWebSocketStable - Production-ready WebSocket хук для React
 * 
 * Возможности:
 * - Декоррелированный jitter вместо простого exponential backoff
 * - ACK+deduplication для гарантированной доставки
 * - Детерминированные close codes с умными переподключениями
 * - Network/visibility awareness
 * - Heartbeat management
 * - Message queuing во время disconnection
 * - Token refresh integration
 * - Comprehensive error handling
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// WebSocket Close Codes (синхронизировано с backend)
const WSCloseCodes = {
  // RFC 6455 стандартные коды
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  INTERNAL_ERROR: 1011,
  ABNORMAL_CLOSURE: 1006,
  
  // Кастомные коды приложения (4000-4999)
  AUTH_EXPIRED: 4001,
  AUTH_FAILED: 4002,
  FORBIDDEN_DOMAIN: 4003,
  NOT_FOUND: 4004,
  RATE_LIMITED: 4008,
  CONFLICT_CONNECTION: 4009,
}

// Конфигурация
const CONFIG = {
  maxReconnectAttempts: 8,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  heartbeatIntervalMs: 25000,
  ackTimeoutMs: 10000,
  messageQueueMaxSize: 100,
  visibilityReconnectDelayMs: 2000,
}

/**
 * Политики переподключения для close codes
 */
function getReconnectPolicy(code) {
  const noReconnectCodes = new Set([
    WSCloseCodes.NORMAL_CLOSURE,
    WSCloseCodes.PROTOCOL_ERROR, 
    WSCloseCodes.AUTH_FAILED,
    WSCloseCodes.FORBIDDEN_DOMAIN,
    WSCloseCodes.NOT_FOUND
  ])
  
  if (noReconnectCodes.has(code)) {
    return 'no'
  }
  
  if (code === WSCloseCodes.AUTH_EXPIRED) {
    return 'refresh'  // Refresh token → reconnect
  }
  
  if (code === WSCloseCodes.CONFLICT_CONNECTION) {
    return 'immediate'  // Быстрый reconnect
  }
  
  if (code === WSCloseCodes.RATE_LIMITED) {
    return 'rate_limited'  // Увеличенная задержка для rate limit
  }
  
  // Все остальные коды - backoff reconnect
  return 'backoff'
}

/**
 * Генератор декоррелированного jitter
 * Более устойчив к thundering herd чем exponential backoff
 */
function createDecorrelatedJitter(baseMs = 1000, maxMs = 30000) {
  let lastDelay = baseMs
  
  return {
    reset() {
      lastDelay = baseMs
    },
    
    next() {
      // Decorrelated jitter formula: random(base, lastDelay * 3)
      const nextDelay = Math.min(
        maxMs,
        Math.floor(Math.random() * (lastDelay * 3 - baseMs)) + baseMs
      )
      lastDelay = nextDelay
      return nextDelay
    },
    
    current() {
      return lastDelay
    }
  }
}

/**
 * Менеджер ACK для отслеживания доставки сообщений
 */
function createAckManager() {
  const pendingAcks = new Map()
  const processedMessages = new Set()
  
  return {
    // Отправляет сообщение с ожиданием ACK
    sendWithAck(ws, message, onAckReceived, onAckTimeout) {
      const messageId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      
      const messageWithAck = {
        ...message,
        messageId,
        requiresAck: true,
        timestamp: Date.now()
      }
      
      // Сохраняем в pending
      const timeoutId = setTimeout(() => {
        pendingAcks.delete(messageId)
        onAckTimeout?.(messageId, messageWithAck)
      }, CONFIG.ackTimeoutMs)
      
      pendingAcks.set(messageId, {
        message: messageWithAck,
        onAckReceived,
        onAckTimeout,
        timeoutId,
        sentAt: Date.now()
      })
      
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(messageWithAck))
      }
      
      return messageId
    },
    
    // Обрабатывает входящий ACK
    handleAck(messageId) {
      const pending = pendingAcks.get(messageId)
      if (pending) {
        clearTimeout(pending.timeoutId)
        pendingAcks.delete(messageId)
        processedMessages.add(messageId)
        pending.onAckReceived?.(messageId, pending.message)
        return true
      }
      return false
    },
    
    // Проверяет, было ли сообщение обработано (deduplication)
    isProcessed(messageId) {
      return processedMessages.has(messageId)
    },
    
    // Очищает устаревшие ACK (вызывается при cleanup)
    cleanup() {
      for (const [messageId, pending] of pendingAcks) {
        clearTimeout(pending.timeoutId)
      }
      pendingAcks.clear()
      
      // Оставляем только последние 1000 processed messages
      if (processedMessages.size > 1000) {
        const processed = Array.from(processedMessages)
        processedMessages.clear()
        processed.slice(-500).forEach(id => processedMessages.add(id))
      }
    },
    
    // Добавляет сообщение в processed (для ACK входящих)
    markAsProcessed(messageId) {
      processedMessages.add(messageId)
    },
    
    getStats() {
      return {
        pendingAcks: pendingAcks.size,
        processedMessages: processedMessages.size
      }
    }
  }
}

/**
 * Production-ready useWebSocketStable хук
 */
export default function useWebSocketStable({
  url,
  protocols = [],
  enabled = true,
  onMessage,
  onError,
  onOpen,
  onClose,
  onReconnectAttempt,
  onTokenRefreshNeeded,
  shouldReconnect = true,
  debug = false
}) {
  const [connectionState, setConnectionState] = useState('disconnected')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastError, setLastError] = useState(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [messageQueue, setMessageQueue] = useState([])
  const [debugInfo, setDebugInfo] = useState('')
  
  // State для инициации переподключения (вместо ref)
  const [reconnectTrigger, setReconnectTrigger] = useState(0)
  
  // Refs для стабильных ссылок
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const heartbeatTimeoutRef = useRef(null)
  const ackManagerRef = useRef(createAckManager())
  const jitterGeneratorRef = useRef(createDecorrelatedJitter(CONFIG.baseDelayMs, CONFIG.maxDelayMs))
  const lastPongRef = useRef(Date.now())
  const isIntentionalCloseRef = useRef(false)
  
  // URL change detector
  const lastUrlRef = useRef(url)
  
  const log = useCallback((message, level = 'info') => {
    if (debug) {
      console[level](`[useWebSocketStable] ${message}`)
    }
    if (level === 'info' || level === 'warn' || level === 'error') {
      setDebugInfo(message)
    }
  }, [debug])
  
  // Очистка ресурсов
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      // Помечаем как intentional close, чтобы избежать reconnect
      isIntentionalCloseRef.current = true
      wsRef.current.close(WSCloseCodes.NORMAL_CLOSURE, 'Component unmounting')
      wsRef.current = null
    }
    
    ackManagerRef.current.cleanup()
  }, [])
  
  // Heartbeat management
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('__ping__')
        lastPongRef.current = Date.now()
        
        // Проверяем pong timeout
        setTimeout(() => {
          if (Date.now() - lastPongRef.current > CONFIG.heartbeatIntervalMs + 5000) {
            log('Heartbeat timeout - closing connection', 'warn')
            wsRef.current?.close(WSCloseCodes.GOING_AWAY, 'Heartbeat timeout')
          }
        }, 5000)
      }
      
      startHeartbeat() // Рекурсивно запускаем следующий heartbeat
    }, CONFIG.heartbeatIntervalMs)
  }, [log])
  
  // Отправка сообщения с ACK
  const sendMessageWithAck = useCallback((message, options = {}) => {
    const {
      onAckReceived,
      onAckTimeout,
      queueIfDisconnected = true
    } = options
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return ackManagerRef.current.sendWithAck(
        wsRef.current,
        message,
        onAckReceived,
        onAckTimeout
      )
    } else if (queueIfDisconnected) {
      // Добавляем в очередь для отправки при reconnect
      setMessageQueue(prev => {
        const newQueue = [...prev, { message, options }]
        return newQueue.slice(-CONFIG.messageQueueMaxSize) // Ограничиваем размер очереди
      })
      log('Message queued for delivery', 'debug')
      return null
    }
    
    log('Cannot send message - WebSocket not connected', 'warn')
    return null
  }, [log])
  
  // Обычная отправка сообщения (без ACK)
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message))
      return true
    } else {
      log('Cannot send message - WebSocket not connected', 'warn')
      return false
    }
  }, [log])
  
  // Функция переподключения
  const reconnect = useCallback((delay = 0, reason = 'Manual reconnect') => {
    log(`Reconnecting in ${delay}ms: ${reason}`)
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectTrigger(prev => prev + 1) // Trigger reconnection
    }, delay)
  }, [log])
  
  // WebSocket connection effect
  useEffect(() => {
    if (!enabled || !url) {
      cleanup()
      setConnectionState('disconnected')
      return
    }
    
    // Детект изменения URL
    if (lastUrlRef.current !== url) {
      log(`URL changed from ${lastUrlRef.current} to ${url} - reconnecting`)
      lastUrlRef.current = url
      jitterGeneratorRef.current.reset()
      setReconnectAttempts(0)
    }
    
    isIntentionalCloseRef.current = false
    setConnectionState('connecting')
    setLastError(null)
    log(`Attempting connection to ${url}`)
    
    try {
      const ws = new WebSocket(url, protocols)
      wsRef.current = ws
      
      ws.onopen = (event) => {
        log('✅ WebSocket connected successfully')
        setConnectionState('connected')
        setReconnectAttempts(0)
        jitterGeneratorRef.current.reset()
        startHeartbeat()
        onOpen?.(event)
        
        // Отправляем сообщения из очереди
        if (messageQueue.length > 0) {
          log(`Sending ${messageQueue.length} queued messages`)
          messageQueue.forEach(({ message, options }) => {
            sendMessageWithAck(message, options)
          })
          setMessageQueue([])
        }
      }
      
      ws.onmessage = (event) => {
        try {
          // Обработка системных сообщений
          if (event.data === '__pong__') {
            lastPongRef.current = Date.now()
            log('Heartbeat pong received', 'debug')
            return
          }
          
          // Парсинг JSON сообщений
          let messageData
          try {
            messageData = JSON.parse(event.data)
          } catch {
            // Если не JSON, передаем как есть
            onMessage?.(event)
            return
          }
          
          // Обработка ACK сообщений
          if (messageData.type === 'ack' && messageData.messageId) {
            ackManagerRef.current.handleAck(messageData.messageId)
            log(`ACK received for message ${messageData.messageId}`, 'debug')
            return
          }
          
          // Дедупликация входящих сообщений
          if (messageData.messageId && ackManagerRef.current.isProcessed(messageData.messageId)) {
            log(`Duplicate message ignored: ${messageData.messageId}`, 'debug')
            return
          }
          
          // Отправка ACK для входящих сообщений, которые требуют подтверждения
          if (messageData.requiresAck && messageData.messageId) {
            ws.send(JSON.stringify({
              type: 'ack',
              messageId: messageData.messageId
            }))
            ackManagerRef.current.markAsProcessed(messageData.messageId)
          }
          
          onMessage?.({ ...event, data: event.data, parsedData: messageData })
          
        } catch (error) {
          log(`Message processing error: ${error.message}`, 'error')
          onError?.(error)
        }
      }
      
      ws.onerror = (event) => {
        log(`WebSocket error occurred`, 'error')
        setLastError(event)
        onError?.(event)
      }
      
      ws.onclose = (event) => {
        setConnectionState('disconnected')
        
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
          heartbeatTimeoutRef.current = null
        }
        
        log(`WebSocket closed with code ${event.code}: ${event.reason || 'No reason'}`)
        onClose?.(event)
        
        // Если это intentional close, не переподключаемся
        if (isIntentionalCloseRef.current) {
          log('Intentional close - not reconnecting')
          return
        }
        
        if (!shouldReconnect) {
          log('Reconnection disabled - staying disconnected')
          return
        }
        
        // Определяем политику переподключения
        const policy = getReconnectPolicy(event.code)
        
        switch (policy) {
          case 'no':
            log(`Close code ${event.code} - no reconnection needed`)
            return
            
          case 'refresh':
            log('Token refresh needed')
            onTokenRefreshNeeded?.()
            setTimeout(() => {
              if (enabled) setReconnectTrigger(prev => prev + 1)
            }, 2000)
            return
            
          case 'immediate':
            log('Immediate reconnection')
            setTimeout(() => {
              if (enabled) setReconnectTrigger(prev => prev + 1)
            }, 100)
            return
            
          case 'rate_limited':
            log('Rate limited - using extended delay')
            const rateLimitDelay = Math.min(30000, jitterGeneratorRef.current.current() * 2)
            const rateLimitAttempts = reconnectAttempts + 1
            
            setReconnectAttempts(rateLimitAttempts)
            onReconnectAttempt?.(rateLimitAttempts, rateLimitDelay)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (enabled) {
                setReconnectTrigger(prev => prev + 1)
              }
            }, rateLimitDelay)
            return
            
          case 'backoff':
          default:
            if (reconnectAttempts >= CONFIG.maxReconnectAttempts) {
              log(`Max reconnection attempts (${CONFIG.maxReconnectAttempts}) reached`)
              setLastError(new Error(`Connection failed after ${CONFIG.maxReconnectAttempts} attempts`))
              return
            }
            
            const nextDelay = jitterGeneratorRef.current.next()
            const newAttempts = reconnectAttempts + 1
            
            log(`Reconnect attempt ${newAttempts}/${CONFIG.maxReconnectAttempts} in ${Math.round(nextDelay/1000)}s`)
            
            setReconnectAttempts(newAttempts)
            onReconnectAttempt?.(newAttempts, nextDelay)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (enabled) {
                setReconnectTrigger(prev => prev + 1)
              }
            }, nextDelay)
        }
      }
      
    } catch (error) {
      log(`WebSocket creation error: ${error.message}`, 'error')
      setConnectionState('error')
      setLastError(error)
      onError?.(error)
    }
    
    return cleanup
    
  }, [url, protocols, enabled, reconnectTrigger, shouldReconnect, onMessage, onError, onOpen, onClose, onReconnectAttempt, onTokenRefreshNeeded, cleanup, startHeartbeat, sendMessageWithAck, log, messageQueue, reconnectAttempts])
  
  // Network awareness
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (enabled && connectionState === 'disconnected') {
        log('Network back online - attempting reconnection')
        setTimeout(() => {
          setReconnectTrigger(prev => prev + 1)
        }, CONFIG.visibilityReconnectDelayMs)
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      log('Network went offline')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled, connectionState, log])
  
  // Visibility awareness
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled && connectionState === 'disconnected') {
        log('Tab became visible - checking connection')
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            log('Connection lost while tab was hidden - reconnecting')
            setReconnectTrigger(prev => prev + 1)
          }
        }, CONFIG.visibilityReconnectDelayMs)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, connectionState, log])
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])
  
  return {
    // Connection state
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isDisconnected: connectionState === 'disconnected',
    
    // Network awareness
    isOnline,
    
    // Error state
    lastError,
    
    // Reconnection state
    reconnectAttempts,
    canReconnect: reconnectAttempts < CONFIG.maxReconnectAttempts,
    
    // Message functions
    sendMessage,
    sendMessageWithAck,
    
    // Control functions
    reconnect: () => reconnect(0, 'Manual reconnect'),
    disconnect: () => {
      isIntentionalCloseRef.current = true
      wsRef.current?.close(WSCloseCodes.NORMAL_CLOSURE, 'Manual disconnect')
    },
    
    // State info
    messageQueueLength: messageQueue.length,
    debugInfo,
    
    // Stats (для debugging)
    stats: {
      ackManager: ackManagerRef.current.getStats(),
      jitterDelay: jitterGeneratorRef.current.current(),
      lastPong: lastPongRef.current,
      reconnectTrigger: reconnectTrigger
    }
  }
}