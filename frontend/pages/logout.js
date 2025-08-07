import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logout() {
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Полная очистка всех данных авторизации
      const keysToRemove = ['token', 'role', 'currentBalance', 'currentPlan', 'userId', 'userEmail'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Очистка всех cookies (если есть)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Перенаправление на landing страницу
      router.replace('/landing');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#6366f1'
    }}>
      Выходим из системы...
    </div>
  );
} 