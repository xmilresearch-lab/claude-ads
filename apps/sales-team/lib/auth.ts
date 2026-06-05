import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import type { Tier } from '@/lib/ratelimit'

// SERVER-ONLY — never import this file from client components
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@salestea.ai',
    }),
    // Dev-only credentials provider — never in production
    ...(process.env.NODE_ENV === 'development'
      ? [
          Credentials({
            credentials: {
              email: { label: 'Email', type: 'email' },
            },
            async authorize(credentials) {
              if (typeof credentials?.email !== 'string') return null
              return prisma.user.findUnique({ where: { email: credentials.email } })
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    session({ session, user }) {
      const dbUser = user as {
        id: string
        tier: Tier
        analysisCount: number
        stripeCustomerId: string | null
      }
      session.user.id = dbUser.id
      session.user.tier = dbUser.tier
      session.user.analysisCount = dbUser.analysisCount
      session.user.stripeCustomerId = dbUser.stripeCustomerId ?? null
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
})
