// API для получения статистики использования AI токенов (только для админов)
import { API_URL } from '../../../../config/api';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { tokenId } = req.query;
        const authToken = req.headers.authorization;

        if (!authToken) {
            return res.status(401).json({ detail: 'Authorization header required' });
        }

        const response = await fetch(`${API_URL}/api/admin/ai-tokens/${tokenId}/usage`, {
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