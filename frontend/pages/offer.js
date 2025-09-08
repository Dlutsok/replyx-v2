import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OfferRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/legal/offer');
  }, [router]);

  return null;
}
