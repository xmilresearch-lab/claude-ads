import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Content Queue — AI Platform' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
