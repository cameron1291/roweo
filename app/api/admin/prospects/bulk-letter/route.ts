import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { generateAcquisitionBatchPdf } from '@/lib/pdf/generate-letter'
import type { AcquisitionLetterProps } from '@/lib/pdf/acquisition-letter-document'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'

const schema = z.object({
  prospect_ids: z.array(z.string().uuid()).min(1).max(100),
})

const SYDNEY_SUBURBS = [
  'Parramatta','Blacktown','Liverpool','Penrith','Campbelltown','Hornsby','Ryde',
  'Sutherland','Randwick','Leichhardt','Newtown','Glebe','Balmain','Marrickville',
  'Ashfield','Strathfield','Auburn','Bankstown','Hurstville','Rockdale','Kogarah',
  'Manly','Dee Why','Frenchs Forest','Chatswood','Lane Cove','Mosman','Cremorne',
  'Bondi','Coogee','Maroubra','Cronulla','Miranda','Caringbah','Engadine',
  'Castle Hill','Baulkham Hills','Kellyville','Bella Vista','Norwest',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { prospect_ids } = parsed.data

  const { data: prospects } = await serviceClient
    .from('builder_prospects')
    .select('id, company_name, postal_address, service_suburbs, demo_slug')
    .in('id', prospect_ids)
    .not('status', 'in', '("not_suitable","lost")')

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ error: 'No valid prospects found' }, { status: 404 })
  }

  let logoDataUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch { /* skip if missing */ }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Collect every unique suburb across all prospects, then hit the DB once
  const allSuburbs = [...new Set((prospects as any[]).flatMap(p => (p.service_suburbs ?? []) as string[]))]

  const suburbDaCounts: Record<string, number> = {}
  if (allSuburbs.length > 0) {
    const { data: daRows } = await serviceClient
      .from('development_applications')
      .select('suburb')
      .in('suburb', allSuburbs)
      .gte('lodged_date', thirtyDaysAgo)
    for (const row of daRows ?? []) {
      suburbDaCounts[row.suburb] = (suburbDaCounts[row.suburb] ?? 0) + 1
    }
  }

  // Sydney-wide fallback for prospects whose specific suburbs aren't in the DB yet
  const { count: sydneyCount } = await serviceClient
    .from('development_applications')
    .select('id', { count: 'exact', head: true })
    .in('suburb', SYDNEY_SUBURBS)
    .gte('lodged_date', thirtyDaysAgo)
  const sydneyFallback = sydneyCount ?? 47

  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const APP_URL = rawUrl.includes('localhost') ? 'https://roweo.com.au' : rawUrl
  const letterDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const letterProps: AcquisitionLetterProps[] = (prospects as any[]).map(p => {
    const demoUrl = p.demo_slug ? `${APP_URL}/demo/${p.demo_slug}` : `${APP_URL}/demo`
    const suburbs: string[] = p.service_suburbs ?? []
    const serviceArea = suburbs.length > 0 ? suburbs.slice(0, 3).join(', ') : 'your service area'

    const dasThisMonth = suburbs.reduce((sum, s) => sum + (suburbDaCounts[s] ?? 0), 0)
    const matchingSuburbs = suburbs.filter(s => (suburbDaCounts[s] ?? 0) > 0).length

    return {
      prospectCompanyName: p.company_name,
      prospectAddress: p.postal_address ?? undefined,
      prospectSuburb: suburbs[0] ?? undefined,
      serviceArea,
      logoDataUrl,
      demoUrl,
      stats: {
        dasThisMonth: dasThisMonth > 0 ? dasThisMonth : sydneyFallback,
        matchingSuburbs: matchingSuburbs > 0 ? matchingSuburbs : (suburbs.length || 40),
        avgResponseRate: '2 days',
      },
      letterDate,
    }
  })

  const pdf = await generateAcquisitionBatchPdf(letterProps)

  const now = new Date().toISOString()
  await serviceClient
    .from('builder_prospects')
    .update({ letter_generated_at: now, letter_printed_at: now })
    .in('id', prospect_ids)

  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'acquisition_bulk_letter_generated',
    entity_type: 'builder_prospect',
    entity_id: null,
    metadata: { prospect_ids, count: prospects.length },
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="roweo-acquisition-letters-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
