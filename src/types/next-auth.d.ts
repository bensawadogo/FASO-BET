import 'next-auth'

declare module 'next-auth' {
  interface Session {
    djangoAccessToken?: string
    djangoRefreshToken?: string
    djangoUser?: {
      id: number
      email: string
      username: string
      first_name: string
    }
  }

  interface JWT {
    djangoAccessToken?: string
    djangoRefreshToken?: string
    djangoUser?: Session['djangoUser']
  }
}
