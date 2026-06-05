import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublic =
    pathname === '/' ||
    pathname === '/pricing' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/auth/')

  const isProtected =
    pathname.startsWith('/dashboard') ||
    (pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/webhooks/') &&
      !pathname.startsWith('/api/auth/'))

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const res = NextResponse.redirect(loginUrl)
    applySecurityHeaders(res)
    return res
  }

  const res = isPublic || !isProtected ? NextResponse.next() : NextResponse.next()
  applySecurityHeaders(res)
  return res
})

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' *.anthropic.com *.supabase.co *.stripe.com"
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
