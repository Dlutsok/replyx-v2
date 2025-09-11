// API для просмотра логов системы (только для админов)

const getBackendUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const authToken = req.headers.authorization;

        if (!authToken) {
            return res.status(401).json({ detail: 'Authorization header required' });
        }

        const backendUrl = getBackendUrl();
        const { level, limit, offset } = req.query;
        
        const queryParams = new URLSearchParams();
        if (level) queryParams.append('level', level);
        if (limit) queryParams.append('limit', limit);
        if (offset) queryParams.append('offset', offset);
        
        const queryString = queryParams.toString();
        const url = `${backendUrl}/api/logs${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json',
            },
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