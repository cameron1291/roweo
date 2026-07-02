import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { sendOnboardingCompleteEmail } from '@/lib/emails'
import { runInitialMatching } from '@/lib/matcher'

const schema = z.object({
  company_name: z.string().min(1),
  phone: z.string().optional(),
  website: z.string().optional(),
  license_number: z.string().optional(),
  logo_url: z.string().optional(),
  brand_color: z.string().default('#3B6FDB'),
  tagline: z.string().optional(),
  service_suburbs: z.array(z.string()).default([]),
  service_states: z.array(z.string()).default([]),
  project_types: z.array(z.string()).default([]),
  min_value_aud: z.number().default(0),
  max_value_aud: z.number().nullable().default(null),
  letter_greeting: z.string().default('Dear Homeowner'),
  letter_sign_off: z.string().default('Kind regards'),
  auto_send: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  // Resolve business location from first service suburb centroid
  let businessLat: number | null = null
  let businessLng: number | null = null
  if (data.service_suburbs.length > 0) {
    const firstSuburb = data.service_suburbs[0]
    // service_suburbs entries are "Suburb, STATE"
    const parts = firstSuburb.split(',')
    const suburbName = parts[0]?.trim()
    const suburbState = parts[1]?.trim() || data.service_states[0] || 'NSW'
    const { data: suburbRow } = await supabase
      .from('suburbs')
      .select('lat, lng')
      .eq('name', suburbName)
      .eq('state', suburbState)
      .not('lat', 'is', null)
      .single()
    if (suburbRow?.lat) {
      businessLat = suburbRow.lat
      businessLng = suburbRow.lng
    }
  }

  // Upsert builder_profiles (handles re-visiting onboarding)
  const { error } = await supabase
    .from('builder_profiles')
    .upsert({
      user_id: user.id,
      ...data,
      ...(businessLat !== null ? { business_lat: businessLat, business_lng: businessLng } : {}),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark onboarding complete (check if it was previously false)
  const { data: profile } = await supabase.from('profiles').select('onboarding_completed, email').eq('id', user.id).single()
  await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)

  if (profile && !profile.onboarding_completed && profile.email) {
    sendOnboardingCompleteEmail(profile.email).catch(() => {})
  }

  // Run initial matching against all existing DAs in their service area (async — don't block)
  if (data.service_suburbs.length > 0) {
    const { data: bp } = await supabase
      .from('builder_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (bp?.id) {
      runInitialMatching(
        bp.id, user.id,
        data.service_suburbs,
        data.project_types,
        data.min_value_aud,
        data.max_value_aud,
      ).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('builder_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // If suburbs changed, update business_lat/lng from first suburb centroid
  if (Array.isArray(body.service_suburbs) && body.service_suburbs.length > 0) {
    const firstSuburb = body.service_suburbs[0]
    const parts = firstSuburb.split(',')
    const suburbName = parts[0]?.trim()
    const suburbState = parts[1]?.trim() || 'NSW'
    const { data: suburbRow } = await supabase
      .from('suburbs')
      .select('lat, lng')
      .eq('name', suburbName)
      .eq('state', suburbState)
      .not('lat', 'is', null)
      .single()
    if (suburbRow?.lat) {
      body.business_lat = suburbRow.lat
      body.business_lng = suburbRow.lng
    }
  }

  const { error } = await supabase
    .from('builder_profiles')
    .update(body)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If service suburbs changed, re-run matching for any new areas
  if (Array.isArray(body.service_suburbs) && body.service_suburbs.length > 0) {
    const { data: bp } = await supabase
      .from('builder_profiles')
      .select('id, project_types, min_value_aud, max_value_aud')
      .eq('user_id', user.id)
      .single()
    if (bp?.id) {
      runInitialMatching(
        bp.id, user.id,
        body.service_suburbs,
        bp.project_types ?? [],
        bp.min_value_aud ?? 0,
        bp.max_value_aud ?? null,
      ).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
