'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const CONSENT_STORAGE_KEY = 'cookieConsent';

function getStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setStoredConsent(consent) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch (_) {}
}

function setCookie(name, value, days = 180) {
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (_) {}
}

export default function CookieConsent() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const isIframeRoute = router.pathname === '/chat-iframe';

  useEffect(() => {
    if (isIframeRoute) return; // не показываем в iframe
    const stored = getStoredConsent();
    if (!stored) {
      setOpen(true);
    } else {
      setPrefs(stored);
      setOpen(false);
    }
  }, [isIframeRoute]);

  const saveConsent = (nextPrefs) => {
    const finalPrefs = { ...nextPrefs, necessary: true };
    setPrefs(finalPrefs);
    setStoredConsent(finalPrefs);
    setCookie('cookie_consent', JSON.stringify(finalPrefs));
    setOpen(false);
    setShowPrefs(false);
  };

  const acceptAll = () => saveConsent({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => saveConsent({ necessary: true, analytics: false, marketing: false });

  if (!open || isIframeRoute) return null;

  return (
    <div className="fixed left-4 bottom-4 z-[1000]">
      <div className="w-[360px] max-w-[92vw] rounded-xl border border-purple-300 ring-1 ring-purple-200 bg-white/95 backdrop-blur-sm shadow-md shadow-purple-100">
        <div className="p-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Мы используем cookies</div>
            <div className="mt-1 text-xs text-gray-600">
              Cookies помогают улучшать сайт и анализировать трафик.{' '}
              <a className="underline hover:text-purple-600" href="/privacy">Политика конфиденциальности</a>.
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => setShowPrefs((v) => !v)} className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-600 text-xs">Настроить</button>
            <button onClick={acceptAll} className="ml-auto px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold" style={{ backgroundColor: '#7C3AED' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6C2BD9'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7C3AED'}>Принять все</button>
          </div>

          {showPrefs && (
            <div className="mt-3 rounded-xl border border-purple-200 bg-white p-3">
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-gray-300 text-purple-600" />
                  <span className="text-xs text-gray-800">Необходимые cookies (обязательные)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs.analytics}
                    onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-xs text-gray-800">Аналитика (улучшение продукта)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs.marketing}
                    onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-xs text-gray-800">Маркетинг (персонализированные предложения)</span>
                </label>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button onClick={() => setShowPrefs(false)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700">Отмена</button>
                <button onClick={() => saveConsent(prefs)} className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold" style={{ backgroundColor: '#7C3AED' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6C2BD9'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7C3AED'}>Сохранить</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


