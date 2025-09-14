import { NextResponse } from 'next/server'

/**
 * Нормализует домен для сравнения
 */
function normalizeDomain(domain) {
  if (!domain) return ""
  
  domain = domain.toLowerCase().trim()
  
  // Убираем протокол
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    try {
      const url = new URL(domain)
      domain = url.hostname
    } catch {
      // Fallback если URL невалидный
    }
  }
  
  // Убираем www. префикс
  if (domain.startsWith('www.')) {
    domain = domain.substring(4)
  }
  
  // Убираем trailing slash
  domain = domain.replace(/\/$/, '')
  
  return domain
}

/**
 * Парсит строку доменов в массив нормализованных доменов
 */
function parseAllowedDomains(domainsStr) {
  if (!domainsStr || !domainsStr.trim()) {
    return []
  }
  
  return domainsStr
    .split(',')
    .map(d => normalizeDomain(d.trim()))
    .filter(d => d.length > 0)
}

/**
 * Валидирует JWT токен виджета через backend API
 */
async function validateWidgetToken(token, request) {
  try {
    if (!token) {
      return null
    }

    // Определяем backend URL (приоритет: api из query → env → прод)
    const apiParam = request?.nextUrl?.searchParams?.get('api')
    const backendUrl = apiParam || process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'
    
    
    // Вызываем backend API для валидации токена
    const response = await fetch(`${backendUrl}/api/validate-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token
      })
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    
    if (!result.valid) {
      return null
    }

    
    return {
      valid: true,
      assistant_id: result.assistant_id,
      allowed_domains: result.allowed_domains || '',
      user_id: result.user_id
    }
    
  } catch (e) {
    return null
  }
}

/**
 * Генерирует CSP заголовок с разрешенными доменами
 */
function generateCSPHeader(allowedDomains, backendOriginOverride) {
  // Базовые разрешенные домены
  const baseDomains = ["'self'", "https://replyx.ru", "https://www.replyx.ru"]
  
  // Добавляем домены из токена
  for (const domain of allowedDomains) {
    // Добавляем https варианты
    baseDomains.push(`https://${domain}`)
    baseDomains.push(`https://www.${domain}`)
    
    // В dev режиме также разрешаем http
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || process.env.NODE_ENV === 'development') {
      baseDomains.push(`http://${domain}`)
    }
  }
  
  // Разрешаем backend origin для API запросов (dev/prod)
  let backendOrigin = backendOriginOverride || process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru'
  try {
    const u = new URL(backendOrigin)
    backendOrigin = `${u.protocol}//${u.host}`
  } catch (e) {
    backendOrigin = 'https://replyx.ru'
  }

  // Удаляем дубликаты
  const uniqueDomains = [...new Set(baseDomains)]
  const frameAncestors = uniqueDomains.join(' ')
  
  // Полный CSP заголовок для iframe
  return [
    `frame-ancestors ${frameAncestors}`,
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https: wss: ws: ${backendOrigin}`,
    "font-src 'self' https: data:"
  ].join('; ')
}

/**
 * Генерирует ограничительный CSP для невалидных токенов
 */
function generateRestrictiveCSP() {
  // В dev режиме разрешаем localhost для тестирования
  const frameAncestors = process.env.NODE_ENV === 'development' 
    ? "'self' http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000 https://stencom.ru https://www.stencom.ru"
    : "'self'";
  
  // Разрешаем unsafe-inline для Next.js в обоих режимах (production тоже требует для лендинга)
  const scriptSrc = "'self' 'unsafe-inline' 'unsafe-eval' https:";
    
  const styleSrc = "'self' 'unsafe-inline' https:";
    
  // Разрешаем базовые директивы для Next.js в обоих режимах
  const defaultSrc = "'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:";
    
  // Разрешаем подключения к API и WebSocket в обоих режимах
  const connectSrc = process.env.NODE_ENV === 'development'
    ? "'self' https: wss: ws: https://replyx.ru http://localhost:8000"
    : "'self' https: wss: ws: https://replyx.ru";
    
  return [
    `frame-ancestors ${frameAncestors}`,
    `default-src ${defaultSrc}`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc}`,
    "font-src 'self' https: data:"
  ].join('; ')
}

/**
 * Middleware для динамической генерации CSP заголовков для iframe страниц
 */
export async function middleware(request) {
  const { pathname, searchParams } = request.nextUrl
  
  // Проверяем, является ли это запросом к iframe странице
  if (!pathname.startsWith('/chat-iframe')) {
    return NextResponse.next()
  }
  
  
  // Получаем токен из query параметров
  const siteToken = searchParams.get('site_token')
  
  if (!siteToken) {
    // Применяем ограничительный CSP
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Валидируем токен через backend API
  const tokenInfo = await validateWidgetToken(siteToken, request)
  
  if (!tokenInfo || !tokenInfo.valid) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Парсим разрешенные домены
  const allowedDomains = parseAllowedDomains(tokenInfo.allowed_domains)
  
  if (allowedDomains.length === 0) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Генерируем динамический CSP
  // Если в URL iframe передан api, разрешим именно этот origin в connect-src
  const apiParam = searchParams.get('api')
  let backendOriginOverride = undefined
  if (apiParam) {
    try {
      const u = new URL(apiParam)
      backendOriginOverride = `${u.protocol}//${u.host}`
    } catch {}
  }

  const dynamicCSP = generateCSPHeader(allowedDomains, backendOriginOverride)
  
  
  // Продолжаем с динамическим CSP заголовком
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', dynamicCSP)
  
  // Убираем устаревший X-Frame-Options (оставляем только современный CSP)
  
  return response
}

// Настройки matcher для middleware
export const config = {
  matcher: [
    '/chat-iframe/:path*'
  ]
}