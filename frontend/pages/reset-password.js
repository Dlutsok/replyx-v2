import { useState } from 'react';
import PublicLayout from '../components/layout/PublicLayout';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Здесь должен быть реальный запрос к API
    setMessage('Пароль успешно изменён!');
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: 400, margin: '0 auto', padding: 32 }}>
        <h1>Сброс пароля</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Новый пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 16 }}
          />
          <button type="submit" style={{ width: '100%', padding: 10 }}>Сохранить</button>
        </form>
        {message && <p style={{ marginTop: 16 }}>{message}</p>}
              </div>
    </PublicLayout>
  );
} 