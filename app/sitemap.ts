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

// Only index the two live states at city/suburb level until VIC/QLD launch
const LIVE_STATES = ['nsw', 'act']

const PROJECT_TYPES = [
  'extension',
  'renovation',
  'new-dwelling',
  'granny-flat',
  'duplex',
  'pool',
  'knockdown-rebuild',
]

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

  // City-level hub pages (all states for future-proofing, but live states get higher priority)
  const cityPages: MetadataRoute.Sitemap = Object.entries(STATE_CITY).flatMap(([state, city]) => {
    const isLive = LIVE_STATES.includes(state)
    return [
      { url: `${base}/construction-leads/${state}/${city}`,       lastModified: now, changeFrequency: 'weekly' as const,  priority: isLive ? 0.85 : 0.5 },
      { url: `${base}/development-applications/${state}/${city}`, lastModified: now, changeFrequency: 'weekly' as const,  priority: isLive ? 0.75 : 0.4 },
      // Type-lead city pages — only live states
      ...isLive ? PROJECT_TYPES.map(type => ({
        url: `${base}/${type}-leads/${state}/${city}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })) : [],
    ]
  })

  let suburbPages: MetadataRoute.Sitemap = []
  let postcodePages: MetadataRoute.Sitemap = []
  let councilPages: MetadataRoute.Sitemap = []

  try {
    const supabase = createServiceClient()

    const [suburbsRes, postcodesRes, councilsRes] = await Promise.all([
      // Suburb pages — only live states with enough data
      supabase
        .from('suburbs')
        .select('name, slug, state, da_count')
        .gt('da_count', 3)
        .in('state', ['NSW', 'ACT'])
        .limit(10000),

      // Postcode pages
      supabase
        .from('postcodes')
        .select('postcode, state, slug, da_count')
        .gt('da_count', 3)
        .in('state', ['NSW', 'ACT'])
        .limit(5000),

      // Council pages
      supabase
        .from('councils')
        .select('slug, state, da_count')
        .gt('da_count', 5)
        .in('state', ['NSW', 'ACT'])
        .limit(500),
    ])

    if (suburbsRes.data) {
      suburbPages = suburbsRes.data.flatMap(s => {
        const state = s.state.toLowerCase()
        const city = STATE_CITY[state] ?? state
        return [
          {
            url: `${base}/construction-leads/${state}/${city}/${s.slug}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          },
          {
            url: `${base}/development-applications/${state}/${city}/${s.slug}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          },
        ]
      })
    }

    if (postcodesRes.data) {
      postcodePages = postcodesRes.data.map(p => ({
        url: `${base}/builder-leads/${p.slug ?? p.postcode}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      }))
    }

    if (councilsRes.data) {
      councilPages = councilsRes.data.map(c => ({
        url: `${base}/development-applications/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // Never block sitemap generation on DB errors
  }

  return [...staticPages, ...cityPages, ...suburbPages, ...postcodePages, ...councilPages]
}
