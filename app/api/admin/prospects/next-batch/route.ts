import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['print', 'email']),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({
    type: searchParams.get('type'),
    limit: searchParams.get('limit') ?? '100',
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { type, limit } = parsed.data
  const EXCLUDED_STATUSES = ['not_suitable', 'lost']

  let batchQuery = serviceClient
    .from('builder_prospects')
    .select('id')
    .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)
    .order('completeness_score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  let countQuery = serviceClient
    .from('builder_prospects')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)

  if (type === 'print') {
    batchQuery = batchQuery
      .is('letter_printed_at', null)
      .not('postal_address', 'is', null)
    countQuery = countQuery
      .is('letter_printed_at', null)
      .not('postal_address', 'is', null)
  } else {
    batchQuery = batchQuery
      .is('interactive_email_sent_at', null)
      .is('letter_printed_at', null)      // don't email the same people already printed to
      .not('email', 'is', null)
      .not('demo_slug', 'is', null)
      .not('email_unsubscribed', 'is', true)
    countQuery = countQuery
      .is('interactive_email_sent_at', null)
      .is('letter_printed_at', null)
      .not('email', 'is', null)
      .not('demo_slug', 'is', null)
      .not('email_unsubscribed', 'is', true)
  }

  const [batchResult, countResult] = await Promise.all([batchQuery, countQuery])

  if (batchResult.error) {
    return NextResponse.json({ error: batchResult.error.message }, { status: 500 })
  }

  const ids = (batchResult.data ?? []).map(r => r.id as string)
  const totalRemaining = countResult.count ?? 0

  return NextResponse.json({ ids, total_remaining: totalRemaining })
}
