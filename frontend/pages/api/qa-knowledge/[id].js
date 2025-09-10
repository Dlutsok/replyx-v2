// API для работы с конкретной записью Q&A
import { API_URL } from '../../../config/api';

export default async function handler(req, res) {
    const { method, query } = req;
    const { id } = query;
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ detail: 'Not authenticated' });
    }

    if (!id) {
        return res.status(400).json({ detail: 'ID is required' });
    }

    try {
        const url = `${API_URL}/api/qa-knowledge/${id}`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.json();

        if (response.ok) {
            res.status(response.status).json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        res.status(500).json({ detail: 'Ошибка соединения с сервером' });
    }
}