import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import Credentials from 'next-auth/providers/credentials'
import { Resend as ResendClient } from 'resend'
import { prisma } from '@/lib/prisma'
import type { Tier } from '@prisma/client'

// SERVER-ONLY — never import this file from client components

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    updateAge: 24 * 60 * 60,    // re-encode once per day
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),

    Resend({
      apiKey: process.env.RESEND_API_KEY ?? '',
      from: FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        const client = new ResendClient(process.env.RESEND_API_KEY ?? '')
        const { error } = await client.emails.send({
          from: FROM,
          to: identifier,
          subject: 'Your sign-in link — $100M AI Sales Team',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030712;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:48px auto;padding:40px 32px;background:#0f172a;border:1px solid #1e293b;border-radius:12px">
    <div style="margin-bottom:32px">
      <span style="display:inline-block;background:#2563eb;color:#fff;font-size:13px;font-weight:700;padding:4px 12px;border-radius:6px;letter-spacing:0.04em">$100M AI SALES TEAM</span>
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f1f5f9">Sign in to your account</h1>
    <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6">Click the button below to sign in. This link expires in <strong style="color:#94a3b8">10 minutes</strong> and can only be used once.</p>
    <a href="${url}" style="display:block;text-align:center;background:#f97316;color:#fff;font-size:16px;font-weight:600;padding:14px 24px;border-radius:8px;text-decoration:none">Sign In →</a>
    <p style="margin:24px 0 0;font-size:13px;color:#475569;text-align:center">If you didn't request this, you can safely ignore this email.</p>
    <hr style="margin:28px 0;border:none;border-top:1px solid #1e293b">
    <p style="margin:0;font-size:12px;color:#334155;text-align:center">Or copy this link: <span style="color:#60a5fa;word-break:break-all">${url}</span></p>
  </div>
</body>
</html>`,
        })
        if (error) throw new Error(`[auth] Resend error: ${JSON.stringify(error)}`)
      },
    }),

    // Dev-only credentials provider — never in production
    ...(process.env.NODE_ENV === 'development'
      ? [
          Credentials({
            credentials: { email: { label: 'Email', type: 'email' } },
            async authorize(credentials) {
              if (typeof credentials?.email !== 'string') return null
              return prisma.user.findUnique({ where: { email: credentials.email } })
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, fetch custom fields from DB and embed in token
      if ((trigger === 'signIn' || trigger === 'signUp') && user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tier: true, analysisCount: true, stripeCustomerId: true, teamId: true },
        })
        token.id = user.id
        token.tier = dbUser?.tier ?? 'FREE'
        token.analysisCount = dbUser?.analysisCount ?? 0
        token.stripeCustomerId = dbUser?.stripeCustomerId ?? null
        token.teamId = dbUser?.teamId ?? null
      }
      return token
    },

    session({ session, token }) {
      session.user.id = (token.id as string | undefined) ?? ''
      session.user.tier = ((token.tier as Tier | undefined) ?? 'FREE')
      session.user.analysisCount = (token.analysisCount as number | undefined) ?? 0
      session.user.stripeCustomerId = (token.stripeCustomerId as string | null | undefined) ?? null
      session.user.teamId = (token.teamId as string | null | undefined) ?? null
      return session
    },
  },

  events: {
    createUser({ user }) {
      // Fire-and-forget: schedule 5-email Soap Opera Sequence via QStash
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      fetch(`${baseUrl}/api/email/sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          ...(user.name ? { name: user.name } : {}),
          secret: process.env.INTERNAL_API_SECRET,
        }),
      }).catch((err) => console.error('[auth] email sequence schedule failed:', err))
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})
