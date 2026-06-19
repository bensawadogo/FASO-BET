import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fasobet.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/history`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/bankroll`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/premium`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/coupon`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002'
    const res = await fetch(`${apiUrl}/api/predictions/worldcup2026/`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return staticPages
    const matches = await res.json()
    if (!Array.isArray(matches)) return staticPages

    const matchPages: MetadataRoute.Sitemap = matches.map((m: any) => ({
      url: `${baseUrl}/match/${m.id}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }))
    return [...staticPages, ...matchPages]
  } catch {
    return staticPages
  }
}
