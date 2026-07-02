import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'
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

const TEMPLATES = {
  post_letter_no_scan: {
    subject: 'Did you receive our letter?',
    body: (company: string, demoUrl: string) => `
      <p>Hi,</p>
      <p>We recently sent a letter to ${company} about Roweo — we help builders find leads from development applications before competitors do.</p>
      <p>If you'd like to see how it works for your service area specifically, we've put together a quick demo: <a href="${demoUrl}" style="color:#3B6FDB">view it here</a>.</p>
      <p>— The Roweo team</p>
    `,
  },
  post_view_no_cta: {
    subject: 'Saw you viewed the demo — any questions?',
    body: (company: string, demoUrl: string) => `
      <p>Hi,</p>
      <p>We saw someone from ${company} viewed the demo page we put together for you. Happy to answer any questions about how it would work for your suburbs.</p>
      <p>If you're ready to try it: <a href="${demoUrl}" style="color:#3B6FDB">get started here</a> — from $149/month, no lock-in.</p>
      <p>— The Roweo team</p>
    `,
  },
  post_scan_no_trial: {
    subject: 'Ready to start getting DA leads?',
    body: (company: string, demoUrl: string) => `
      <p>Hi,</p>
      <p>We noticed you checked out the demo for ${company}. Whenever you're ready to start getting matched to development applications in your service area, it only takes 15 minutes to set up.</p>
      <p><a href="${demoUrl}" style="color:#3B6FDB">Start your trial</a> — from $149/month, cancel any time.</p>
      <p>— The Roweo team</p>
    `,
  },
}

const schema = z.object({
  template: z.enum(['post_letter_no_scan', 'post_view_no_cta', 'post_scan_no_trial']),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: prospect } = await supabase.from('builder_prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!prospect.email) return NextResponse.json({ error: 'No email address' }, { status: 400 })
  if (prospect.email_unsubscribed) return NextResponse.json({ error: 'Unsubscribed' }, { status: 400 })

  // Guard: don't re-send same followup type
  const { data: existingEvents } = await supabase
    .from('prospect_events')
    .select('id')
    .eq('prospect_id', id)
    .eq('event_type', `followup_${parsed.data.template}`)
    .limit(1)
  if (existingEvents?.length) return NextResponse.json({ error: 'Already sent this followup' }, { status: 409 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const demoUrl = prospect.demo_slug ? `${APP_URL}/demo/${prospect.demo_slug}` : `${APP_URL}/signup`
  const tmpl = TEMPLATES[parsed.data.template]

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1F2937;font-size:14px;line-height:1.6">
      ${tmpl.body(prospect.company_name, demoUrl)}
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="font-size:12px;color:#9CA3AF">
        Roweo · roweo.com.au · Sydney NSW, Australia<br>
        <a href="${APP_URL}/api/unsubscribe?id=${id}" style="color:#9CA3AF">Unsubscribe</a>
      </p>
    </div>
  `

  await sendEmail({ to: prospect.email, subject: tmpl.subject, html })

  const now = new Date().toISOString()
  await supabase.from('prospect_events').insert({
    prospect_id: id,
    event_type: `followup_${parsed.data.template}`,
    channel: 'cold_email',
    occurred_at: now,
  })

  return NextResponse.json({ success: true })
}
