const ACCESS_TOKEN_KEY  = 'fasobet_access'
const REFRESH_TOKEN_KEY = 'fasobet_refresh'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Expire dans moins de 60 secondes → considéré expiré
    return payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refresh) return null
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_DJANGO_URL}/api/token/refresh/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      }
    )
    if (!res.ok) { clearTokens(); return null }
    const data = await res.json()
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
    return data.access as string
  } catch {
    clearTokens()
    return null
  }
}
