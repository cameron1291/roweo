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
  const campaignId = searchParams.get('campaign_id')

  let query = supabase.from('prospect_events').select('prospect_id, event_type, channel')
  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data: events } = await query

  const channels = ['physical_letter', 'interactive_email', 'cold_email', 'phone']
  const stages = ['letter_generated', 'interactive_email_sent', 'cold_email_sent', 'email_opened', 'page_viewed', 'cta_clicked', 'demo_booked']

  const result: Record<string, Record<string, number>> = {}
  for (const channel of channels) {
    result[channel] = {}
    const channelEvents = (events ?? []).filter(e => e.channel === channel)
    for (const stage of stages) {
      result[channel][stage] = new Set(channelEvents.filter(e => e.event_type === stage).map(e => e.prospect_id)).size
    }
  }

  return NextResponse.json(result)
}
