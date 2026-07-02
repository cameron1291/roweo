import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { generateBatchPdf } from '@/lib/pdf/generate-letter'
import type { LetterProps } from '@/lib/pdf/letter-document'
import { z } from 'zod'

const schema = z.object({ batch_date: z.string() })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { batch_date } = parsed.data

  // Fetch all approved matches for this batch date
  const { data: matches } = await serviceClient
    .from('lead_matches')
    .select(`
      id, qr_token, letter_body_text,
      development_applications(suburb, state, postcode, street_address, da_number, description, project_type, lodged_date),
      builder_profiles(company_name, logo_url, brand_color, phone, website, license_number, tagline, letter_greeting, letter_sign_off, letter_compliance_disclaimer)
    `)
    .eq('batch_date', batch_date)
    .eq('status', 'letter_approved')

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: 'No approved letters for this batch date' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'

  const letterProps: LetterProps[] = matches.map((m: any) => {
    const da = m.development_applications ?? {}
    const builder = m.builder_profiles ?? {}
    return {
      companyName: builder.company_name ?? '',
      logoUrl: builder.logo_url,
      brandColor: builder.brand_color ?? '#3B6FDB',
      phone: builder.phone ?? '',
      website: builder.website ?? '',
      licenseNumber: builder.license_number ?? '',
      tagline: builder.tagline ?? '',
      letterGreeting: builder.letter_greeting ?? 'Dear Homeowner',
      letterSignOff: builder.letter_sign_off ?? 'Kind regards',
      complianceDisclaimer: builder.letter_compliance_disclaimer ?? '',
      daAddress: da.street_address ?? '',
      daSuburb: da.suburb ?? '',
      daState: da.state ?? '',
      daPostcode: da.postcode ?? '',
      daDescription: da.description ?? '',
      daProjectType: da.project_type ?? 'other',
      daLodgedDate: da.lodged_date ?? '',
      daDaNumber: da.da_number ?? '',
      letterBodyText: m.letter_body_text ?? '',
      qrUrl: `${appUrl}/scan/${m.qr_token}`,
      letterDate: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    }
  })

  const pdf = await generateBatchPdf(letterProps)

  // Mark all as printed
  await serviceClient
    .from('lead_matches')
    .update({ status: 'printed' })
    .eq('batch_date', batch_date)
    .eq('status', 'letter_approved')

  // Audit log
  await serviceClient.from('audit_logs').insert({
    user_id: user.id,
    action: 'batch_pdf_generated',
    entity_type: 'lead_match',
    entity_id: null,
    metadata: { batch_date, count: matches.length },
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="letters-${batch_date}.pdf"`,
    },
  })
}
