import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({ match_ids: z.array(z.string().uuid()).min(1) })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const now = new Date().toISOString()
  await serviceClient
    .from('lead_matches')
    .update({ status: 'posted', letter_sent_at: now })
    .in('id', parsed.data.match_ids)

  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'letters_marked_posted',
    entity_type: 'lead_match',
    entity_id: null,
    metadata: { match_ids: parsed.data.match_ids, count: parsed.data.match_ids.length },
  })

  return NextResponse.json({ success: true, count: parsed.data.match_ids.length })
}
