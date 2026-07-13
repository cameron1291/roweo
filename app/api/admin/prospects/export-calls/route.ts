import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') ?? '100'), 200)
  const EXCLUDED = ['not_suitable', 'lost']

  const { data: prospects, error } = await serviceClient
    .from('builder_prospects')
    .select('id, company_name, phone, email, website, postal_address, service_suburbs, business_type, employee_count_est, completeness_score, status')
    .not('status', 'in', `(${EXCLUDED.map(s => `"${s}"`).join(',')})`)
    .not('phone', 'is', null)
    .is('phone_call_at', null)
    .order('completeness_score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!prospects?.length) return NextResponse.json({ error: 'No prospects with phone numbers found' }, { status: 404 })

  const headers = ['Company', 'Phone', 'Email', 'Website', 'Address', 'Suburbs', 'Type', 'Employees', 'Score', 'Status']

  const rows = prospects.map(p => [
    p.company_name ?? '',
    p.phone ?? '',
    p.email ?? '',
    p.website ?? '',
    p.postal_address ?? '',
    ((p.service_suburbs as string[]) ?? []).join(' | '),
    (p.business_type as string ?? '').replace(/_/g, ' '),
    p.employee_count_est ?? '',
    p.completeness_score ?? '',
    p.status ?? '',
  ])

  const escape = (val: unknown) => {
    const s = String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="roweo-call-list-${date}.csv"`,
    },
  })
}
