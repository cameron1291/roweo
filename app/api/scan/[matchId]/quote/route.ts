import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { sendQuoteRequestEmail } from '@/lib/emails'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createServiceClient()

  const { data: match } = await supabase
    .from('lead_matches')
    .select('id, user_id, builder_id, development_applications(suburb)')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase
    .from('lead_matches')
    .update({
      enquiry_name: parsed.data.name,
      enquiry_phone: parsed.data.phone,
      enquiry_email: parsed.data.email || null,
      enquiry_message: parsed.data.message || null,
      enquiry_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  await supabase.from('builder_outcomes').insert({
    user_id: match.user_id,
    builder_id: match.builder_id,
    lead_match_id: matchId,
    outcome_type: 'enquiry',
    project_description: parsed.data.message || null,
  })

  await supabase.from('notifications').insert({
    user_id: match.user_id,
    type: 'new_lead',
    title: `New quote request from ${parsed.data.name}`,
    body: `${parsed.data.name} (${parsed.data.phone}) requested a quote via your letter in ${(match as any).development_applications?.suburb ?? 'your service area'}.`,
    link: '/dashboard/letters',
  })

  // Send quote request email to the builder (look up their email)
  try {
    const { data: builderProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', match.user_id)
      .single()
    const suburb = (match as any).development_applications?.suburb ?? 'your service area'
    if (builderProfile?.email) {
      await sendQuoteRequestEmail(builderProfile.email, {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || undefined,
        message: parsed.data.message,
      }, suburb)
    }
  } catch {
    // Non-critical
  }

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New quote request: ${parsed.data.name}`,
      html: `<p>${parsed.data.name} (${parsed.data.phone}${parsed.data.email ? `, ${parsed.data.email}` : ''}) requested a quote.</p><p>${parsed.data.message ?? ''}</p>`,
    })
  } catch {
    // Non-critical
  }

  return NextResponse.json({ success: true })
}
