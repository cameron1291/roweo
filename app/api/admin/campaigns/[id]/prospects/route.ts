import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const svc = createServiceClient()
  const { data } = await svc.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return svc
}

// POST: add prospect_ids to campaign
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const svc = await requireAdmin()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { prospect_ids } = await req.json() as { prospect_ids: string[] }
  if (!prospect_ids?.length) return NextResponse.json({ error: 'No prospects' }, { status: 400 })

  // Insert prospect_events rows (ignore duplicates)
  const rows = prospect_ids.map(pid => ({
    prospect_id: pid,
    campaign_id: campaignId,
    event_type: 'added_to_campaign',
    channel: 'physical_letter',
    occurred_at: new Date().toISOString(),
  }))

  const { error } = await svc.from('prospect_events').upsert(rows, {
    onConflict: 'prospect_id,campaign_id,event_type',
    ignoreDuplicates: true,
  })

  if (error) {
    // Upsert may not be supported with this combination — fall back to insert with conflict ignore
    for (const row of rows) {
      await svc.from('prospect_events').insert(row)
    }
  }

  // Update prospect_count on campaign
  const { count } = await svc
    .from('prospect_events')
    .select('prospect_id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('event_type', 'added_to_campaign')

  await svc.from('acquisition_campaigns')
    .update({ prospect_count: count ?? 0 })
    .eq('id', campaignId)

  return NextResponse.json({ added: prospect_ids.length, total: count })
}
