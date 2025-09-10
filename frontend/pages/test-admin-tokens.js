import { useState, useEffect } from 'react';

const TestAdminTokensPage = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authStatus, setAuthStatus] = useState('checking');

  useEffect(() => {
    testAuth();
  }, []);

  const testAuth = async () => {
    setAuthStatus('logging-in');
    
    try {
      // 1. Login first
      const loginResponse = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=morooz99@yandex.ru&password=admin123'
      });
      
      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
      }
      
      const loginData = await loginResponse.json();
      const token = loginData.access_token;
      localStorage.setItem('token', token);
      setAuthStatus('logged-in');
      
      // 2. Test /api/me
      const meResponse = await fetch('http://localhost:8000/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!meResponse.ok) {
        throw new Error(`/api/me failed: ${meResponse.status}`);
      }
      
      const userData = await meResponse.json();
      setAuthStatus('user-verified');
      
      // 3. Test AI tokens API
      const tokensResponse = await fetch('http://localhost:8000/api/admin/ai-tokens', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokensResponse.ok) {
        throw new Error(`AI tokens API failed: ${tokensResponse.status}`);
      }
      
      const tokensData = await tokensResponse.json();
      setTokens(tokensData);
      setAuthStatus('success');
      
    } catch (error) {
      setError(error.message);
      setAuthStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (authStatus) {
      case 'checking': return '#fbbf24';
      case 'logging-in': return '#3b82f6';
      case 'logged-in': return '#10b981';
      case 'user-verified': return '#8b5cf6';
      case 'success': return '#059669';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (authStatus) {
      case 'checking': return 'Проверка...';
      case 'logging-in': return 'Авторизация...';
      case 'logged-in': return 'Вход выполнен';
      case 'user-verified': return 'Пользователь проверен';
      case 'success': return 'Токены загружены!';
      case 'error': return 'Ошибка!';
      default: return 'Неизвестно';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Тест загрузки AI токенов</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: getStatusColor() 
            }}
          ></div>
          <span style={{ fontWeight: 'bold' }}>Статус: {getStatusText()}</span>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee2e2', 
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#991b1b'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      <div>
        <h2>AI Токены ({tokens.length})</h2>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {tokens.map(token => (
              <div key={token.id} style={{ 
                padding: '15px', 
                border: '1px solid #d1d5db', 
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>{token.name}</h3>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: token.is_active ? '#d1fae5' : '#fee2e2',
                    color: token.is_active ? '#065f46' : '#991b1b'
                  }}>
                    {token.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  <div>ID: {token.id} | Приоритет: {token.priority}</div>
                  <div>Модели: {token.models ? token.models.join(', ') : 'N/A'}</div>
                  <div>
                    Использование: {token.daily_usage || 0} / {token.daily_limit || 0} в день
                    ({(token.daily_usage_percent || 0).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAdminTokensPage;