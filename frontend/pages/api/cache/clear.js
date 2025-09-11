// API для очистки кэша системы (только для админов)

const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const authToken = req.headers.authorization;

        if (!authToken) {
            return res.status(401).json({ detail: 'Authorization header required' });
        }

        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/cache/clear`, {
            method: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (response.ok) {
            res.status(200).json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        res.status(500).json({ detail: 'Ошибка соединения с сервером' });
    }
}