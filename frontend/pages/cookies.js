import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CookiesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/legal/cookies');
  }, [router]);

  return null;
}
