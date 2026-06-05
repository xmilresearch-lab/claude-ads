import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // PDF export — Phase 7 implementation
  void req
  return Response.json({ error: 'Not implemented' }, { status: 501 })
}
