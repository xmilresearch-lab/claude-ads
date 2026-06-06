import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ referralCode: string }> }
): Promise<Response> {
  const { referralCode } = await params

  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true },
  })

  const destination = referrer ? '/signup' : '/signup'

  const response = Response.redirect(new URL(destination, process.env.NEXTAUTH_URL ?? 'http://localhost:3000'))

  // httpOnly: false so the signup flow can read it client-side via document.cookie
  response.headers.set(
    'Set-Cookie',
    `referredBy=${referralCode}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`
  )

  return response
}
