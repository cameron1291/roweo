import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return serviceClient
}

export async function GET(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '90d'
  const days = range === '30d' ? 30 : range === 'ytd' ? new Date().getDay() + 1 : 90
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('subscription_events')
    .select('event_type, amount_aud, occurred_at')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: true })

  // Group by month
  const byMonth: Record<string, { subscribed: number; cancelled: number; mrr: number }> = {}
  for (const ev of events ?? []) {
    const month = ev.occurred_at.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { subscribed: 0, cancelled: 0, mrr: 0 }
    if (ev.event_type === 'subscribed' || ev.event_type === 'reactivated') {
      byMonth[month].subscribed++
      byMonth[month].mrr += (ev.amount_aud ?? 29900) / 100
    }
    if (ev.event_type === 'cancelled') {
      byMonth[month].cancelled++
      byMonth[month].mrr -= 299
    }
  }

  const series = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))

  // Running MRR
  let runningMrr = 0
  const mrrSeries = series.map(s => {
    runningMrr = Math.max(0, runningMrr + s.mrr)
    return { month: s.month, mrr: runningMrr, new_customers: s.subscribed, churned: s.cancelled }
  })

  return NextResponse.json({ series: mrrSeries })
}
