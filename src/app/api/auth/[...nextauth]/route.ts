import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const DJANGO_URL = process.env.API_DJANGO_URL || 'http://django:8001'

async function exchangeGoogleForDjangoJWT(email: string, name: string, googleId: string) {
  const secret = process.env.NEXTAUTH_TO_DJANGO_SECRET
  if (!secret) return null
  try {
    const res = await fetch(`${DJANGO_URL}/api/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, google_id: googleId, secret }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const djangoToken = await exchangeGoogleForDjangoJWT(
          profile.email as string,
          (profile.name as string) || '',
          (profile.sub as string) || ''
        )
        if (djangoToken) {
          token.djangoAccessToken = djangoToken.access
          token.djangoRefreshToken = djangoToken.refresh
          token.djangoUser = djangoToken.user
        }
      }
      return token
    },
    async session({ session, token }) {
      session.djangoAccessToken = token.djangoAccessToken as string | undefined
      session.djangoRefreshToken = token.djangoRefreshToken as string | undefined
      session.djangoUser = token.djangoUser as typeof session.djangoUser
      return session
    }
  },
  pages: {
    signIn: '/login',
  }
})

export { handler as GET, handler as POST }
