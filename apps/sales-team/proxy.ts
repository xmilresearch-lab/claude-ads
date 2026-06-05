import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isPublicRoute, isProtectedRoute } from '@/lib/routes'

export { isPublicRoute, isProtectedRoute }

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' *.anthropic.com *.supabase.co *.stripe.com"
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
}
