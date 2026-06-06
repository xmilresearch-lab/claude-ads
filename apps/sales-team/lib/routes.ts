/** Pure route classification helpers — no external imports, safe to test in vitest. */

export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/pricing' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/og/') ||
    pathname.startsWith('/api/unsubscribe') ||
    pathname.startsWith('/api/email/')
  )
}

export function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/analyze') ||
    pathname.startsWith('/api/assistant') ||
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/billing') ||
    pathname.startsWith('/api/referral') ||
    pathname.startsWith('/api/analyses') ||
    pathname.startsWith('/api/export')
  )
}
