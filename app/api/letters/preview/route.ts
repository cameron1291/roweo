import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { generateLetterPdf } from '@/lib/pdf/generate-letter'

// Fake DA used for onboarding preview
const PREVIEW_DA = {
  daAddress: '14 Arcadia Street',
  daSuburb: 'Parramatta',
  daState: 'NSW',
  daPostcode: '2150',
  daDescription: 'Extension and alterations to existing dwelling including new first floor addition and rear ground floor extension',
  daProjectType: 'extension',
  daLodgedDate: '2026-06-15',
  daDaNumber: 'DA/2026/0847',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matchId = req.nextUrl.searchParams.get('match_id')
  const isPreview = req.nextUrl.searchParams.get('preview') === '1'

  let letterProps

  if (isPreview) {
    // Onboarding preview: use current builder profile + fake DA
    const { data: builder } = await supabase
      .from('builder_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!builder) return NextResponse.json({ error: 'Builder profile not found' }, { status: 404 })

    letterProps = {
      companyName: builder.company_name,
      logoUrl: builder.logo_url,
      brandColor: builder.brand_color,
      phone: builder.phone,
      website: builder.website,
      licenseNumber: builder.license_number,
      tagline: builder.tagline,
      letterGreeting: builder.letter_greeting,
      letterSignOff: builder.letter_sign_off,
      complianceDisclaimer: builder.letter_compliance_disclaimer,
      letterBodyText: PREVIEW_BODY,
      qrUrl: `${process.env.NEXT_PUBLIC_APP_URL}/demo`,
      ...PREVIEW_DA,
    }
  } else if (matchId) {
    // Real match preview
    const serviceClient = createServiceClient()
    const { data: match } = await serviceClient
      .from('lead_matches')
      .select(`*, development_applications(*), builder_profiles(*)`)
      .eq('id', matchId)
      .eq('user_id', user.id)
      .single()

    if (!match) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const da = match.development_applications
    const builder = match.builder_profiles

    letterProps = {
      companyName: builder.company_name,
      logoUrl: builder.logo_url,
      brandColor: builder.brand_color,
      phone: builder.phone,
      website: builder.website,
      licenseNumber: builder.license_number,
      tagline: builder.tagline,
      letterGreeting: builder.letter_greeting,
      letterSignOff: builder.letter_sign_off,
      complianceDisclaimer: builder.letter_compliance_disclaimer,
      daAddress: da.street_address ?? `${da.suburb}`,
      daSuburb: da.suburb,
      daState: da.state,
      daPostcode: da.postcode,
      daDescription: da.description ?? '',
      daProjectType: da.project_type,
      daLodgedDate: da.lodged_date,
      daDaNumber: da.da_number,
      letterBodyText: match.letter_body_text ?? PREVIEW_BODY,
      qrUrl: `${process.env.NEXT_PUBLIC_APP_URL}/scan/${match.qr_token}`,
    }
  } else {
    return NextResponse.json({ error: 'Provide match_id or preview=1' }, { status: 400 })
  }

  const pdf = await generateLetterPdf(letterProps)

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="letter-preview.pdf"',
      'Content-Length': String(pdf.length),
    },
  })
}

const PREVIEW_BODY = `We recently noticed that a development application has been lodged for your property at Parramatta for an extension and alterations. We specialise in exactly this type of project and would love the opportunity to be involved.

Our team has completed over 200 residential extensions and additions across Sydney, and we pride ourselves on delivering quality workmanship, clear communication, and builds that come in on time and on budget. We understand that home renovation can feel overwhelming — our job is to make it simple.

We would love to offer you a free, no-obligation quote based on your approved plans. Most quotes are returned within 48 hours. There's no pressure and no obligation — just honest, transparent pricing so you can make an informed decision about your project.`
