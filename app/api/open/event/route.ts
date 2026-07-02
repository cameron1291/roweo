import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { slug, event } = await req.json()
  if (!slug || !event) return NextResponse.json({ ok: false })

  const supabase = createServiceClient()
  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('id')
    .eq('demo_slug', slug)
    .single()

  if (!prospect) return NextResponse.json({ ok: false })

  // Dedupe: only log first occurrence per event type per day
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('prospect_events')
    .select('id')
    .eq('prospect_id', prospect.id)
    .eq('event_type', event)
    .gte('occurred_at', since)
    .maybeSingle()

  if (!existing) {
    await supabase.from('prospect_events').insert({
      prospect_id: prospect.id,
      event_type: event,
      channel: 'interactive_email',
      occurred_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ ok: true })
}
