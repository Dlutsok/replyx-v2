/**
 * Отдельный API клиент для системы умного прогресса
 * Не влияет на основную систему авторизации
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API клиент с авторизацией для smart progress
const smartProgressApi = {
  async request(method, endpoint, data = null, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Добавляем токен авторизации если он есть
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const config = {
      method: method.toUpperCase(),
      headers,
      ...options
    };
    
    if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = new Error(`HTTP Error: ${response.status}`);
      error.status = response.status;
      error.response = response;
      try {
        error.data = await response.json();
      } catch (e) {
        error.data = { message: response.statusText };
      }
      throw error;
    }
    
    try {
      const result = await response.json();
      return { data: result, status: response.status };
    } catch (e) {
      return { data: null, status: response.status };
    }
  },
  
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  },
  
  post(endpoint, data = null, options = {}) {
    return this.request('POST', endpoint, data, options);
  }
};

export default smartProgressApi;