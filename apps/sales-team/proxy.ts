import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isPublicRoute, isProtectedRoute } from '@/lib/routes'

export { isPublicRoute, isProtectedRoute }

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Next.js requires unsafe-eval; unsafe-inline for injected styles/scripts
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
      // Turnstile renders in an iframe
      "frame-src https://challenges.cloudflare.com",
      "connect-src 'self' https://*.anthropic.com https://*.supabase.co https://*.stripe.com wss://*.supabase.co",
      "img-src 'self' data: https: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join('; ')
  )
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (isProtectedRoute(pathname) && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const res = NextResponse.redirect(loginUrl)
    applySecurityHeaders(res)
    return res
  }

  const res = NextResponse.next()
  applySecurityHeaders(res)
  return res
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-).*)',
  ],
}
