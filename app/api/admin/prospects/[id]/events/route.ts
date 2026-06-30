import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return serviceClient
}

const schema = z.object({
  event_type: z.string().min(1),
  channel: z.string().optional(),
  campaign_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase
    .from('prospect_events')
    .select('*')
    .eq('prospect_id', id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase.from('prospect_events').insert({
    prospect_id: id,
    ...parsed.data,
    occurred_at: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
