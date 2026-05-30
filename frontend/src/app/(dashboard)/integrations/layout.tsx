import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Integrations — AI Platform' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
