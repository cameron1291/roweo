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

const patchSchema = z.object({
  status: z.enum(['draft', 'active', 'completed']).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  prospect_count: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'active') updates.started_at = new Date().toISOString()
  if (parsed.data.status === 'completed') updates.completed_at = new Date().toISOString()

  const { data, error } = await supabase.from('acquisition_campaigns').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('acquisition_campaigns').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
