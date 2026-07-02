import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const STATE_CITY: Record<string, string> = {
  nsw: 'sydney',
  vic: 'melbourne',
  qld: 'brisbane',
  act: 'canberra',
  sa: 'adelaide',
  wa: 'perth',
  tas: 'hobart',
  nt: 'darwin',
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                      lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/pricing`,         lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/demo`,            lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/about`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/legal/privacy`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/terms`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/spam`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // City-level hub pages
  const cityPages: MetadataRoute.Sitemap = Object.entries(STATE_CITY).flatMap(([state, city]) => [
    { url: `${base}/construction-leads/${state}/${city}`,       lastModified: now, changeFrequency: 'weekly' as const,  priority: 0.85 },
    { url: `${base}/development-applications/${state}/${city}`, lastModified: now, changeFrequency: 'weekly' as const,  priority: 0.75 },
  ])

  // Suburb pages — only index those with enough DA data to be non-thin
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
        const city = STATE_CITY[state] ?? state
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
    // Never block sitemap generation on DB errors
  }

  return [...staticPages, ...cityPages, ...suburbPages]
}
