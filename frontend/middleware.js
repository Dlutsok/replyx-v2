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
      console.warn("CSP Middleware: Токен не предоставлен")
      return null
    }

    // Определяем backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    console.log(`CSP Middleware: Валидация токена через ${backendUrl}/api/validate-widget-token`)
    
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
      console.warn(`CSP Middleware: Backend вернул ошибку: ${response.status}`)
      return null
    }

    const result = await response.json()
    
    if (!result.valid) {
      console.warn(`CSP Middleware: Токен невалидный: ${result.reason}`)
      return null
    }

    console.log(`CSP Middleware: Токен валидный для assistant_id=${result.assistant_id}`)
    
    return {
      valid: true,
      assistant_id: result.assistant_id,
      allowed_domains: result.allowed_domains || '',
      user_id: result.user_id
    }
    
  } catch (e) {
    console.error(`CSP Middleware: Ошибка валидации токена: ${e.message}`)
    return null
  }
}

/**
 * Генерирует CSP заголовок с разрешенными доменами
 */
function generateCSPHeader(allowedDomains) {
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
  let backendOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  try {
    const u = new URL(backendOrigin)
    backendOrigin = `${u.protocol}//${u.host}`
  } catch (e) {
    backendOrigin = 'http://localhost:8000'
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
    "font-src 'self' https:"
  ].join('; ')
}

/**
 * Генерирует ограничительный CSP для невалидных токенов
 */
function generateRestrictiveCSP() {
  return [
    "frame-ancestors 'self'",
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'"
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
  
  console.log(`🛡️ CSP Middleware: Обрабатываю iframe запрос: ${pathname}`)
  
  // Получаем токен из query параметров
  const siteToken = searchParams.get('site_token')
  
  if (!siteToken) {
    console.warn("CSP Middleware: site_token отсутствует в query параметрах")
    // Применяем ограничительный CSP
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Валидируем токен через backend API
  const tokenInfo = await validateWidgetToken(siteToken, request)
  
  if (!tokenInfo || !tokenInfo.valid) {
    console.warn("CSP Middleware: Токен невалидный, применяю ограничительный CSP")
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Парсим разрешенные домены
  const allowedDomains = parseAllowedDomains(tokenInfo.allowed_domains)
  
  if (allowedDomains.length === 0) {
    console.warn("CSP Middleware: Нет разрешенных доменов, применяю ограничительный CSP")
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', generateRestrictiveCSP())
    return response
  }
  
  // Генерируем динамический CSP
  const dynamicCSP = generateCSPHeader(allowedDomains)
  
  console.log(`✅ CSP Middleware: Разрешенные домены для assistant_id=${tokenInfo.assistant_id}: ${allowedDomains.join(', ')}`)
  console.log(`CSP заголовок: ${dynamicCSP}`)
  
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