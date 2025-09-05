/**
 * Tests for WebSocket functionality in frontend components
 */

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.sentMessages = [];
    
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen({});
    }, 10);
  }
  
  send(data) {
    if (this.readyState === WebSocket.OPEN) {
      this.sentMessages.push(data);
    }
  }
  
  close(code, reason) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }
  
  // Test helper methods
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
  
  simulateError() {
    if (this.onerror) this.onerror(new Error('Connection failed'));
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket;
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Mock fetch for API calls
global.fetch = jest.fn();

describe('DialogModal WebSocket Tests', () => {
  let mockSetMessages, mockSetWsConnected, mockSetWsError;
  
  beforeEach(() => {
    mockSetMessages = jest.fn();
    mockSetWsConnected = jest.fn();
    mockSetWsError = jest.fn();
    
    // Reset fetch mock
    fetch.mockClear();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-jwt-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });
  
  test('WebSocket connection with correct URL format', () => {
    const API_URL = 'http://localhost:8000';
    const dialogId = 123;
    const token = 'mock-jwt-token';
    
    // Simulate connection logic from DialogModal
    const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/dialogs/${dialogId}?token=${encodeURIComponent(token)}`;
    
    const ws = new MockWebSocket(wsUrl);
    
    expect(ws.url).toBe('ws://localhost:8000/ws/dialogs/123?token=mock-jwt-token');
  });
  
  test('WebSocket message handling for direct messages', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    const messages = [];
    
    // Simulate message handler from DialogModal
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.id && data.sender && data.text) {
        // Check for duplicates
        const exists = messages.some(msg => msg.id === data.id);
        if (!exists) {
          messages.push(data);
        }
      }
    };
    
    // Wait for connection
    await new Promise(resolve => {
      ws.onopen = resolve;
    });
    
    // Simulate receiving a message
    const testMessage = {
      id: 456,
      sender: 'manager',
      text: 'Hello from operator',
      timestamp: '2025-01-15T10:30:00Z'
    };
    
    ws.simulateMessage(testMessage);
    
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(testMessage);
  });
  
  test('WebSocket message deduplication', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    const messages = [];
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.id && data.sender && data.text) {
        const exists = messages.some(msg => msg.id === data.id);
        if (!exists) {
          messages.push(data);
        }
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    const testMessage = {
      id: 456,
      sender: 'manager',
      text: 'Duplicate test',
      timestamp: '2025-01-15T10:30:00Z'
    };
    
    // Send same message twice
    ws.simulateMessage(testMessage);
    ws.simulateMessage(testMessage);
    
    // Should only have one message due to deduplication
    expect(messages).toHaveLength(1);
  });
  
  test('WebSocket ping/pong handling', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    
    ws.onmessage = (event) => {
      if (event.data === '__ping__') {
        ws.send('__pong__');
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Simulate ping from server
    ws.onmessage({ data: '__ping__' });
    
    expect(ws.sentMessages).toContain('__pong__');
  });
  
  test('WebSocket error handling and fallback', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    let errorOccurred = false;
    let fallbackActivated = false;
    
    ws.onerror = () => {
      errorOccurred = true;
    };
    
    ws.onclose = (event) => {
      if (event.code !== 1000) {
        // Simulate fallback activation
        fallbackActivated = true;
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Simulate error and close
    ws.simulateError();
    ws.close(1011, 'Server error');
    
    expect(errorOccurred).toBe(true);
    expect(fallbackActivated).toBe(true);
  });
});

describe('Chat-iframe WebSocket Tests', () => {
  test('Widget WebSocket URL formation', () => {
    const API_URL = 'http://localhost:8000';
    const dialogId = 123;
    const assistantId = 456;
    
    // Simulate widget connection logic
    const wsApiUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
    
    expect(wsUrl).toBe('ws://localhost:8000/ws/widget/dialogs/123?assistant_id=456');
  });
  
  test('Widget message handling excludes user messages', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/widget/dialogs/123');
    const messages = [];
    
    // Simulate chat-iframe message handler
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      if (data.type === 'typing_start') {
        // Handle typing indicator
        return;
      }
      
      // Direct message format - ignore user messages to prevent duplication
      if (data.id && data.sender && data.text && !data.message && !data.type && data.sender !== 'user') {
        const exists = messages.find(m => m.id === data.id);
        if (!exists) {
          messages.push(data);
        }
      }
      // Log ignored user messages
      else if (data.id && data.sender === 'user' && !data.message && !data.type) {
        console.log('Ignoring user message from WebSocket (handled optimistically):', data);
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Test user message (should be ignored)
    ws.simulateMessage({
      id: 1,
      sender: 'user',
      text: 'User message',
      timestamp: '2025-01-15T10:30:00Z'
    });
    
    // Test manager message (should be processed)
    ws.simulateMessage({
      id: 2,
      sender: 'manager',
      text: 'Operator response',
      timestamp: '2025-01-15T10:30:00Z'
    });
    
    // Should only have the manager message
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe('manager');
  });
  
  test('Widget typing indicators', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/widget/dialogs/123');
    let typing = false;
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'typing_start') {
        typing = true;
      } else if (data.type === 'typing_stop') {
        typing = false;
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Test typing start
    ws.simulateMessage({ type: 'typing_start' });
    expect(typing).toBe(true);
    
    // Test typing stop
    ws.simulateMessage({ type: 'typing_stop' });
    expect(typing).toBe(false);
  });
  
  test('Widget handoff events', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/widget/dialogs/123');
    let handoffStatus = 'none';
    const systemMessages = [];
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'handoff_requested') {
        handoffStatus = 'requested';
        systemMessages.push({
          id: `system-${Date.now()}`,
          sender: 'system',
          text: data.message || 'Переключаем ваш диалог на сотрудника',
          timestamp: new Date().toISOString(),
          system_type: 'handoff_requested'
        });
      } else if (data.type === 'handoff_started') {
        handoffStatus = 'active';
        systemMessages.push({
          id: `system-${Date.now()}`,
          sender: 'system',
          text: '✅ Оператор подключился',
          timestamp: new Date().toISOString(),
          system_type: 'handoff_started'
        });
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Test handoff request
    ws.simulateMessage({
      type: 'handoff_requested',
      message: 'Переключаем на оператора'
    });
    
    expect(handoffStatus).toBe('requested');
    expect(systemMessages).toHaveLength(1);
    expect(systemMessages[0].system_type).toBe('handoff_requested');
    
    // Test handoff started
    ws.simulateMessage({
      type: 'handoff_started',
      manager: { id: 1, name: 'John Doe' }
    });
    
    expect(handoffStatus).toBe('active');
    expect(systemMessages).toHaveLength(2);
    expect(systemMessages[1].system_type).toBe('handoff_started');
  });
});

describe('Optimistic Updates Tests', () => {
  test('Optimistic message addition and replacement', async () => {
    const messages = [];
    
    // Simulate sending message with optimistic update
    const sendMessage = async (text) => {
      // Add optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
        optimistic: true
      };
      messages.push(optimisticMessage);
      
      // Simulate API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user_message: {
            id: 123,
            sender: 'user',
            text,
            timestamp: '2025-01-15T10:30:00Z',
            delivered: true
          }
        })
      });
      
      try {
        const response = await fetch('/api/widget/dialogs/123/messages', {
          method: 'POST',
          body: JSON.stringify({ sender: 'user', text })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Replace optimistic message with real data
          const index = messages.findIndex(m => m.id === optimisticMessage.id);
          if (index !== -1) {
            messages[index] = { ...result.user_message };
          }
        }
      } catch (error) {
        // Remove optimistic message on error
        const index = messages.findIndex(m => m.id === optimisticMessage.id);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    };
    
    await sendMessage('Test message');
    
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(123);
    expect(messages[0].delivered).toBe(true);
    expect(messages[0].optimistic).toBeUndefined();
  });
  
  test('Optimistic message error handling', async () => {
    const messages = [];
    
    const sendMessage = async (text) => {
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text,
        optimistic: true
      };
      messages.push(optimisticMessage);
      
      // Simulate API error
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await fetch('/api/widget/dialogs/123/messages', {
          method: 'POST',
          body: JSON.stringify({ sender: 'user', text })
        });
      } catch (error) {
        // Remove optimistic message on error
        const index = messages.findIndex(m => m.id === optimisticMessage.id);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    };
    
    await sendMessage('Failed message');
    
    // Message should be removed due to error
    expect(messages).toHaveLength(0);
  });
});

describe('Cross-channel Communication Tests', () => {
  test('Admin to widget message flow', async () => {
    // Simulate admin WebSocket
    const adminWs = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    
    // Simulate widget WebSocket  
    const widgetWs = new MockWebSocket('ws://localhost:8000/ws/widget/dialogs/123');
    
    const widgetMessages = [];
    
    // Widget message handler
    widgetWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.id && data.sender && data.text && data.sender !== 'user') {
        const exists = widgetMessages.find(m => m.id === data.id);
        if (!exists) {
          widgetMessages.push(data);
        }
      }
    };
    
    await Promise.all([
      new Promise(resolve => { adminWs.onopen = resolve; }),
      new Promise(resolve => { widgetWs.onopen = resolve; })
    ]);
    
    // Simulate operator message from admin
    const operatorMessage = {
      id: 456,
      sender: 'manager',
      text: 'Hello from admin panel',
      timestamp: '2025-01-15T10:30:00Z'
    };
    
    // This would be sent by backend to widget
    widgetWs.simulateMessage(operatorMessage);
    
    expect(widgetMessages).toHaveLength(1);
    expect(widgetMessages[0]).toEqual(operatorMessage);
  });
  
  test('Widget to admin message flow', async () => {
    const adminWs = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    const adminMessages = [];
    
    // Admin message handler
    adminWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.id && data.sender && data.text) {
        const exists = adminMessages.some(msg => msg.id === data.id);
        if (!exists) {
          adminMessages.push(data);
        }
      }
    };
    
    await new Promise(resolve => { adminWs.onopen = resolve; });
    
    // Simulate user message that would come from widget via backend
    const userMessage = {
      id: 789,
      sender: 'user',
      text: 'Hello from widget',
      timestamp: '2025-01-15T10:30:00Z'
    };
    
    adminWs.simulateMessage(userMessage);
    
    expect(adminMessages).toHaveLength(1);
    expect(adminMessages[0]).toEqual(userMessage);
  });
});

describe('Fallback Polling Tests', () => {
  test('Automatic fallback to polling on WebSocket failure', async () => {
    let pollingActive = false;
    let pollCount = 0;
    
    // Mock polling function
    const startFallbackPolling = () => {
      pollingActive = true;
      
      const pollMessages = async () => {
        pollCount++;
        
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, sender: 'user', text: 'Message 1' },
            { id: 2, sender: 'assistant', text: 'Message 2' }
          ])
        });
        
        const response = await fetch('/api/dialogs/123/messages');
        if (response.ok) {
          const messages = await response.json();
          return messages;
        }
      };
      
      // Simulate polling interval
      const interval = setInterval(async () => {
        if (pollingActive) {
          await pollMessages();
        } else {
          clearInterval(interval);
        }
      }, 100); // Fast interval for testing
    };
    
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2;
    
    ws.onclose = (event) => {
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        // Switch to fallback
        startFallbackPolling();
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Simulate connection failures
    ws.close(1011, 'Server error');
    ws.close(1011, 'Server error');
    ws.close(1011, 'Server error');
    
    // Wait a bit for polling to start
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(pollingActive).toBe(true);
    expect(pollCount).toBeGreaterThan(0);
    
    // Stop polling
    pollingActive = false;
  });
});

describe('Performance Tests', () => {
  test('Handle rapid message reception', async () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    const messages = [];
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.id && data.sender && data.text) {
        const exists = messages.some(msg => msg.id === data.id);
        if (!exists) {
          messages.push(data);
        }
      }
    };
    
    await new Promise(resolve => { ws.onopen = resolve; });
    
    // Send many messages rapidly
    const numMessages = 100;
    for (let i = 0; i < numMessages; i++) {
      ws.simulateMessage({
        id: i,
        sender: 'manager',
        text: `Message ${i}`,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(messages).toHaveLength(numMessages);
    
    // Verify all messages are unique
    const uniqueIds = new Set(messages.map(m => m.id));
    expect(uniqueIds.size).toBe(numMessages);
  });
  
  test('Memory cleanup on component unmount', () => {
    const ws = new MockWebSocket('ws://localhost:8000/ws/dialogs/123');
    
    // Simulate component cleanup
    const cleanup = () => {
      ws.close(1000, 'Component unmounted');
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
    };
    
    cleanup();
    
    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(ws.onopen).toBeNull();
    expect(ws.onclose).toBeNull();
    expect(ws.onmessage).toBeNull();
    expect(ws.onerror).toBeNull();
  });
});