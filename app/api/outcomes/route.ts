import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({
  lead_match_id: z.string().uuid().nullable().optional(),
  outcome_type: z.enum(['enquiry', 'quote', 'job_won']),
  revenue_aud: z.number().int().nullable().optional(),
  project_description: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: builder } = await supabase
    .from('builder_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!builder) return NextResponse.json({ error: 'Builder profile not found' }, { status: 404 })

  const { error } = await supabase.from('builder_outcomes').insert({
    user_id: user.id,
    builder_id: builder.id,
    lead_match_id: parsed.data.lead_match_id ?? null,
    outcome_type: parsed.data.outcome_type,
    revenue_aud: parsed.data.revenue_aud ?? null,
    project_description: parsed.data.project_description ?? null,
    notes: parsed.data.notes ?? null,
    occurred_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'outcome_logged',
    entity_type: 'builder_outcome',
    metadata: { outcome_type: parsed.data.outcome_type, revenue_aud: parsed.data.revenue_aud },
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: outcomes } = await supabase
    .from('builder_outcomes')
    .select('outcome_type, revenue_aud')
    .eq('user_id', user.id)

  const stats = {
    enquiries: outcomes?.filter(o => o.outcome_type === 'enquiry').length ?? 0,
    quotes: outcomes?.filter(o => o.outcome_type === 'quote').length ?? 0,
    jobsWon: outcomes?.filter(o => o.outcome_type === 'job_won').length ?? 0,
    revenueAud: outcomes
      ?.filter(o => o.outcome_type === 'job_won')
      .reduce((sum, o) => sum + (o.revenue_aud ?? 0), 0) ?? 0,
  }

  return NextResponse.json(stats)
}
