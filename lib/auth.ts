import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      onboarding_complete?: boolean
      monthly_income?: number
      risk_appetite?: number
    }
  }
  interface User {
    id: string
    onboarding_complete?: boolean
    monthly_income?: number
    risk_appetite?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    onboarding_complete?: boolean
    monthly_income?: number
    risk_appetite?: number
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, onboarding_complete: true, monthly_income: true, risk_appetite: true },
          })

          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                avatar_url: user.image,
                google_id: profile?.sub,
                auth_provider: 'google',
              },
            })
            user.id = existing.id
            user.onboarding_complete = existing.onboarding_complete
            user.monthly_income = existing.monthly_income
            user.risk_appetite = existing.risk_appetite
          } else {
            const created = await prisma.user.create({
              data: {
                name: user.name ?? 'User',
                email: user.email!,
                avatar_url: user.image,
                google_id: profile?.sub,
                auth_provider: 'google',
                monthly_income: 0,
                onboarding_complete: false,
              },
            })
            user.id = created.id
            user.onboarding_complete = false
            user.monthly_income = 0
            user.risk_appetite = 3
          }
        } catch (err) {
          console.error('signIn error:', err)
          return false
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.onboarding_complete = user.onboarding_complete
        token.monthly_income = user.monthly_income
        token.risk_appetite = user.risk_appetite
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id
      session.user.onboarding_complete = token.onboarding_complete
      session.user.monthly_income = token.monthly_income
      session.user.risk_appetite = token.risk_appetite
      return session
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
