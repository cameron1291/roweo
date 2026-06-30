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

const createSchema = z.object({
  company_name: z.string().min(1),
  website: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  postal_address: z.string().optional(),
  business_type: z.enum(['residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild', 'other']).optional(),
  source: z.enum(['manual', 'google_maps', 'directory', 'register']).default('manual'),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('builder_prospects')
    .select('*', { count: 'exact' })
    .order('fit_score', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const status = searchParams.get('status')
  const q = searchParams.get('q')
  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('company_name', `%${q}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const demoSlug = parsed.data.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 7)

  const { data, error } = await supabase.from('builder_prospects').insert({
    ...parsed.data,
    demo_slug: demoSlug,
    qr_token: crypto.randomUUID(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
