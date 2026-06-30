import { createServiceClient } from '@/lib/supabase-server'

export interface LocationData {
  suburb: string | null
  state: string | null
  postcode: string | null
  daCount: number
  daCount30d: number
  recentDas: {
    suburb: string
    project_type: string
    description: string | null
    lodged_date: string | null
    estimated_value_aud: number | null
  }[]
  topProjectTypes: { type: string; count: number }[]
  nearbySuburbs: { name: string; slug: string; state: string }[]
}

export async function getLocationData(
  suburb: string | null,
  state: string | null,
  projectType?: string,
): Promise<LocationData> {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  let daQuery = supabase
    .from('development_applications')
    .select('suburb, state, project_type, description, lodged_date, estimated_value_aud')
    .order('lodged_date', { ascending: false })
    .limit(10)

  let countQuery = supabase
    .from('development_applications')
    .select('id', { count: 'exact', head: true })

  let count30dQuery = supabase
    .from('development_applications')
    .select('id', { count: 'exact', head: true })
    .gte('lodged_date', thirtyDaysAgo)

  if (suburb) {
    daQuery = daQuery.ilike('suburb', suburb)
    countQuery = countQuery.ilike('suburb', suburb)
    count30dQuery = count30dQuery.ilike('suburb', suburb)
  }
  if (state) {
    daQuery = daQuery.eq('state', state)
    countQuery = countQuery.eq('state', state)
    count30dQuery = count30dQuery.eq('state', state)
  }
  if (projectType) {
    daQuery = daQuery.eq('project_type', projectType)
    countQuery = countQuery.eq('project_type', projectType)
    count30dQuery = count30dQuery.eq('project_type', projectType)
  }

  const [dasResult, countResult, count30dResult, nearbyResult] = await Promise.all([
    daQuery,
    countQuery,
    count30dQuery,
    suburb && state
      ? supabase
          .from('suburbs')
          .select('name, slug, state')
          .eq('state', state)
          .neq('name', suburb)
          .gt('da_count', 0)
          .order('da_count', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const das = dasResult.data ?? []

  // Tally project type counts from recent DAs
  const typeCounts: Record<string, number> = {}
  for (const da of das) {
    typeCounts[da.project_type] = (typeCounts[da.project_type] ?? 0) + 1
  }
  const topProjectTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([type, count]) => ({ type, count }))

  return {
    suburb,
    state,
    postcode: null,
    daCount: countResult.count ?? 0,
    daCount30d: count30dResult.count ?? 0,
    recentDas: das,
    topProjectTypes,
    nearbySuburbs: (nearbyResult.data ?? []) as any[],
  }
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling',
  extension: 'Extension',
  renovation: 'Renovation',
  granny_flat: 'Granny Flat',
  pool: 'Pool',
  demolition: 'Demolition',
  duplex: 'Duplex',
  commercial: 'Commercial',
  other: 'Other',
}

export const SEO_PROJECT_TYPES = [
  'construction',
  'extension',
  'renovation',
  'granny-flat',
  'new-dwelling',
  'duplex',
  'pool',
] as const

export type SeoProjectType = (typeof SEO_PROJECT_TYPES)[number]

export const SEO_TYPE_TO_DB: Record<SeoProjectType, string> = {
  construction: '',
  extension: 'extension',
  renovation: 'renovation',
  'granny-flat': 'granny_flat',
  'new-dwelling': 'new_dwelling',
  duplex: 'duplex',
  pool: 'pool',
}
