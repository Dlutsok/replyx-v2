// API для работы с базой знаний Q&A
import { API_URL } from '../../../config/api';

export default async function handler(req, res) {
    const { method, query, body } = req;
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ detail: 'Not authenticated' });
    }

    try {
        let url = `${API_URL}/api/qa-knowledge`;
        
        // Добавляем query параметры для GET запросов
        if (method === 'GET' && Object.keys(query).length > 0) {
            const queryParams = new URLSearchParams(query).toString();
            url += `?${queryParams}`;
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: method !== 'GET' ? JSON.stringify(body) : undefined,
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