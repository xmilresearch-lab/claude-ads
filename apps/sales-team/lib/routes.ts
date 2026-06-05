/** Pure route classification helpers — no external imports, safe to test in vitest. */

export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/pricing' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/og/') ||
    pathname.startsWith('/api/email/')
  )
}

export function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/analyze') ||
    pathname.startsWith('/api/assistant') ||
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/billing')
  )
}
