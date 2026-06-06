/**
 * POST /api/auth/verify-turnstile
 * Verifies a Cloudflare Turnstile challenge token server-side.
 * Called client-side before magic link / OAuth sign-in.
 * No auth required — this IS the pre-auth step.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
})

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Missing token' }, { status: 400 })
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    // In development without keys configured: pass through
    if (process.env.NODE_ENV === 'development') {
      return Response.json({ success: true })
    }
    return Response.json({ success: false, error: 'Turnstile not configured' }, { status: 500 })
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: parsed.data.token,
  })

  const verifyRes = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body,
  })

  const result = (await verifyRes.json()) as { success: boolean; 'error-codes'?: string[] }

  if (!result.success) {
    return Response.json({ success: false, error: 'Challenge failed' }, { status: 400 })
  }

  return Response.json({ success: true })
}
