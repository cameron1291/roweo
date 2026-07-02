import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return serviceClient
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: prospect } = await supabase.from('builder_prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!prospect.email) return NextResponse.json({ error: 'No email address for this prospect' }, { status: 400 })
  if (prospect.email_unsubscribed) return NextResponse.json({ error: 'Prospect has unsubscribed' }, { status: 400 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const suburbs = (prospect.service_suburbs ?? []).slice(0, 2).join(' and ')
  const suburbLine = suburbs ? ` in ${suburbs}` : ''

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1F2937">
      <p style="font-size:14px;color:#374151;line-height:1.6">Hi,</p>
      <p style="font-size:14px;color:#374151;line-height:1.6">
        I'm reaching out because we help residential builders${suburbLine} find leads before their competitors — by matching them to development applications as soon as they're lodged with the council.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6">
        When a homeowner lodges a DA, we generate a personalised letter from your company and post it to the property within 2 business days. The letter includes a unique QR code so you know when they engage. Flat monthly subscription — no per-lead fees.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6">
        Worth a look? <a href="${APP_URL}/demo" style="color:#3B6FDB">See a live example here</a>.
      </p>
      <p style="font-size:14px;color:#374151">— The Roweo team</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="font-size:12px;color:#9CA3AF">
        Roweo · Sydney NSW, Australia · roweo.com.au<br>
        <a href="${APP_URL}/api/unsubscribe?id=${id}" style="color:#9CA3AF">Unsubscribe</a>
      </p>
    </div>
  `

  const { error: sendError } = await sendEmail({
    to: prospect.email,
    subject: `Construction leads for ${suburbs || 'your service area'}`,
    html,
  })

  if (sendError) {
    console.error('Resend error:', sendError)
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }

  const now = new Date().toISOString()
  await supabase.from('builder_prospects').update({
    cold_email_sent_at: now,
    updated_at: now,
  }).eq('id', id)

  await supabase.from('prospect_events').insert({
    prospect_id: id,
    event_type: 'cold_email_sent',
    channel: 'cold_email',
    occurred_at: now,
  })

  return NextResponse.json({ success: true })
}
