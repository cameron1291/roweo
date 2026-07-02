import { createServiceClient } from '@/lib/supabase-server'

const NINETY_DAYS_AGO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().split('T')[0]
}

/**
 * Match a builder against all existing DAs in their service suburbs.
 * Called on onboarding completion and on service area updates.
 * Runs async — does not block the response.
 */
export async function runInitialMatching(
  builderId: string,
  userId: string,
  serviceSuburbs: string[],
  projectTypes: string[],
  minValueAud: number = 0,
  maxValueAud: number | null = null,
): Promise<number> {
  if (!serviceSuburbs.length) return 0

  const sb = createServiceClient()

  // Normalise suburbs — strip state suffix if present ("Parramatta, NSW" → "Parramatta")
  const suburbs = serviceSuburbs.map(s => s.split(',')[0].trim())

  // Fetch DAs from last 90 days in matching suburbs
  const { data: das, error } = await sb
    .from('development_applications')
    .select('id, suburb, project_type, estimated_value_aud, status')
    .in('suburb', suburbs)
    .gte('lodged_date', NINETY_DAYS_AGO())
    .limit(500)

  if (error || !das?.length) return 0

  let created = 0

  for (const da of das) {
    // Project type filter (if builder has preferences set)
    if (projectTypes.length > 0 && !projectTypes.includes(da.project_type)) continue

    // Value range filter
    if (da.estimated_value_aud !== null) {
      if (minValueAud > 0 && da.estimated_value_aud < minValueAud) continue
      if (maxValueAud !== null && da.estimated_value_aud > maxValueAud) continue
    }

    // Skip if match already exists
    const { data: existing } = await sb
      .from('lead_matches')
      .select('id')
      .eq('da_id', da.id)
      .eq('builder_id', builderId)
      .eq('trigger_stage', 'lodgement')
      .maybeSingle()

    if (existing) continue

    const reasons: string[] = [`Suburb ${da.suburb} is in your service area`]
    if (da.project_type) reasons.push(`Project type: ${da.project_type.replace(/_/g, ' ')}`)

    const { error: insertError } = await sb.from('lead_matches').insert({
      da_id: da.id,
      builder_id: builderId,
      user_id: userId,
      status: 'new',
      match_reasons: reasons,
      trigger_stage: 'lodgement',
      qr_token: crypto.randomUUID(),
      matched_at: new Date().toISOString(),
    })

    if (!insertError) created++
  }

  return created
}
