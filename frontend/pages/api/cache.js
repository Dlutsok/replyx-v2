// API для управления кэшем системы (только для админов)

const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export default async function handler(req, res) {
    try {
        const authToken = req.headers.authorization;

        if (!authToken) {
            return res.status(401).json({ detail: 'Authorization header required' });
        }

        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/cache`, {
            method: req.method,
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json',
            },
            ...(req.method !== 'GET' && { body: JSON.stringify(req.body) })
        });

        const data = await response.json();

        if (response.ok) {
            res.status(200).json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('Cache API error:', error);
        res.status(500).json({ detail: 'Ошибка соединения с сервером', error: error.message });
    }
}