import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const now = new Date()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/demo`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  // Suburb pages (only those with > 3 DAs for quality indexing)
  let suburbPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createServiceClient()
    const { data: suburbs } = await supabase
      .from('suburbs')
      .select('name, slug, state, da_count')
      .gt('da_count', 3)
      .limit(10000)

    if (suburbs) {
      suburbPages = suburbs.flatMap(s => {
        const state = s.state.toLowerCase()
        const city = state === 'nsw' ? 'sydney' : state === 'act' ? 'canberra' : state
        const slug = s.slug
        return [
          {
            url: `${base}/construction-leads/${state}/${city}/${slug}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          },
          {
            url: `${base}/development-applications/${state}/${city}/${slug}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          },
        ]
      })
    }
  } catch {
    // Never let sitemap generation crash
  }

  return [...staticPages, ...suburbPages]
}
