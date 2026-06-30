import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['view', 'save', 'ignore', 'note']),
  note: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {}

  switch (parsed.data.action) {
    case 'view':
      update.status = 'viewed'
      update.viewed_at = now
      break
    case 'save':
      update.status = 'saved'
      update.saved_at = now
      break
    case 'ignore':
      update.status = 'ignored'
      update.ignored_at = now
      break
    case 'note':
      update.builder_note = parsed.data.note ?? ''
      break
  }

  const { error } = await supabase
    .from('lead_matches')
    .update(update)
    .eq('id', matchId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: `lead_${parsed.data.action}`,
    entity_type: 'lead_match',
    entity_id: matchId,
  })

  return NextResponse.json({ success: true })
}
