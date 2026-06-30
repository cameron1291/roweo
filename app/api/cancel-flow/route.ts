import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  reason: z.enum(['too_expensive', 'no_leads', 'enough_work', 'missing_feature', 'other']),
  detail: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  // Cancel at period end, not immediately
  const subscription = await getStripe().subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  await supabase.from('churn_feedback').insert({
    user_id: user.id,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  })

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'subscription_cancel_requested',
    entity_type: 'subscription',
    entity_id: profile.stripe_subscription_id,
    metadata: { reason: parsed.data.reason },
  })

  const currentPeriodEnd = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000).toISOString()
    : null

  return NextResponse.json({ success: true, access_until: currentPeriodEnd })
}
