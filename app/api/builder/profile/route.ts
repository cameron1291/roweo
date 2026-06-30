import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { sendOnboardingCompleteEmail } from '@/lib/emails'

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

  // Upsert builder_profiles (handles re-visiting onboarding)
  const { error } = await supabase
    .from('builder_profiles')
    .upsert({
      user_id: user.id,
      ...data,
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark onboarding complete (check if it was previously false)
  const { data: profile } = await supabase.from('profiles').select('onboarding_completed, email').eq('id', user.id).single()
  await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)

  if (profile && !profile.onboarding_completed && profile.email) {
    sendOnboardingCompleteEmail(profile.email).catch(() => {})
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
  const { error } = await supabase
    .from('builder_profiles')
    .update(body)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
