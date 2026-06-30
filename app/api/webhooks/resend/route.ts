import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const eventType = body.type as string
  const emailId = body.data?.email_id as string | undefined
  const to = body.data?.to?.[0] as string | undefined

  if (!emailId || !to) return NextResponse.json({ ok: true })

  const supabase = createServiceClient()

  // Find prospect by email address
  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('id, company_name, interactive_email_opened_at, cold_email_opened_at')
    .eq('email', to)
    .single()

  if (!prospect) return NextResponse.json({ ok: true })

  const now = new Date().toISOString()

  if (eventType === 'email.opened') {
    await supabase.from('builder_prospects').update({
      interactive_email_opened_at: prospect.interactive_email_opened_at ?? now,
      updated_at: now,
    }).eq('id', prospect.id)

    await supabase.from('prospect_events').insert({
      prospect_id: prospect.id,
      event_type: 'email_opened',
      channel: 'interactive_email',
      metadata: { resend_email_id: emailId },
      occurred_at: now,
    })

    if (!prospect.interactive_email_opened_at) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Demo email opened by ${prospect.company_name}`,
        html: `<p>${prospect.company_name} just opened the interactive demo email. <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'}/admin/prospects/${prospect.id}">View prospect →</a></p>`,
      }).catch(() => {})
    }
  }

  if (eventType === 'email.clicked') {
    await supabase.from('builder_prospects').update({
      cold_email_opened_at: prospect.cold_email_opened_at ?? now,
      updated_at: now,
    }).eq('id', prospect.id)

    await supabase.from('prospect_events').insert({
      prospect_id: prospect.id,
      event_type: 'email_cta_clicked',
      channel: 'cold_email',
      metadata: { resend_email_id: emailId, url: body.data?.click?.link ?? null },
      occurred_at: now,
    })
  }

  return NextResponse.json({ ok: true })
}
