// API endpoint для инициализации контекста AI ассистента

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, context, timestamp } = req.body;

    if (!sessionId || !context) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Отправляем контекст на backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/ai/initialize-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        context: context,
        timestamp: timestamp
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      // Не останавливаем работу при ошибке инициализации контекста
      return res.status(200).json({ 
        success: false,
        message: 'Context initialization failed but session can continue',
        details: errorData 
      });
    }

    const result = await response.json();
    
    return res.status(200).json({
      success: true,
      message: 'Context initialized successfully',
      sessionId: sessionId
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Context initialization API error:', error);
    }
    // Возвращаем успех даже при ошибке, чтобы не блокировать работу чата
    return res.status(200).json({ 
      success: false,
      message: 'Context initialization failed but session can continue',
      details: error.message 
    });
  }
}