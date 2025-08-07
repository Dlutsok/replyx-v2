// API endpoint для AI чат взаимодействия

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message, timestamp } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Отправляем сообщение на backend AI endpoint
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
        timestamp: timestamp,
        source: 'dashboard_chat'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      // Возвращаем fallback ответ
      return res.status(200).json({
        message: 'Спасибо за ваш вопрос! Я готов помочь вам с ChatAI MVP. Чем могу быть полезен?',
        buttons: [
          { label: 'Узнать о возможностях', action: 'show:features' },
          { label: 'Посмотреть тарифы', action: 'show:pricing' },
          { label: 'Оставить заявку', action: 'form:request' }
        ]
      });
    }

    const result = await response.json();
    
    return res.status(200).json({
      message: result.message || result.response || result.text,
      buttons: result.buttons || null,
      messageId: result.message_id || Date.now()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('AI Chat API error:', error);
    }
    
    // Возвращаем fallback ответ при ошибке
    return res.status(200).json({
      message: 'Привет! Я AI-ассистент ChatAI MVP. Как дела? Чем могу помочь?',
      buttons: [
        { label: 'Что такое ChatAI?', action: 'show:about' },
        { label: 'Создать бота', url: '/dashboard' },
        { label: 'Связаться с нами', action: 'form:contact' }
      ]
    });
  }
}