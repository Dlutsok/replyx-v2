// API endpoint для отправки сообщений администраторам из чата поддержки

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guestId, message, timestamp } = req.body;

    if (!guestId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Отправляем сообщение на backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/support/send-to-admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_id: guestId,
        message: message,
        timestamp: timestamp,
        source: 'dashboard_chat'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ 
        error: 'Failed to send message to backend',
        details: errorData 
      });
    }

    const result = await response.json();
    
    return res.status(200).json({
      success: true,
      message: 'Message sent to administrators',
      messageId: result.message_id || Date.now()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Support API error:', error);
    }
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}