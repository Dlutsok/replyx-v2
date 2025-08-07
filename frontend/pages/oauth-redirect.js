import { useEffect } from 'react';
import { useRouter } from 'next/router';
import API_CONFIG, { createApiUrl } from '../config/api';

export default function OAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const { token } = router.query;
    if (token) {
      localStorage.setItem('token', token);
      // Получаем роль пользователя
      fetch(createApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          localStorage.setItem('role', data.role || 'user');
          router.replace('/dashboard');
        })
        .catch(() => {
          localStorage.setItem('role', 'user');
          router.replace('/dashboard');
        });
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <div>Авторизация через Яндекс... Пожалуйста, подождите.</div>;
} 