import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let totalUpdated = 0
  const BATCH = 500

  while (true) {
    const { data: records, error } = await serviceClient
      .from('builder_prospects')
      .select('id, company_name')
      .is('demo_slug', null)
      .limit(BATCH)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!records || records.length === 0) break

    const updates = records.map(r => {
      const slug = (r.company_name as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + (r.id as string).replace(/-/g, '').slice(0, 6)

      return serviceClient
        .from('builder_prospects')
        .update({ demo_slug: slug, qr_token: crypto.randomUUID() })
        .eq('id', r.id)
    })

    await Promise.all(updates)
    totalUpdated += records.length

    if (records.length < BATCH) break
  }

  return NextResponse.json({ updated: totalUpdated })
}
