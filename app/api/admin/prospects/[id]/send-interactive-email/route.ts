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
  const demoUrl = prospect.demo_slug ? `${APP_URL}/demo/${prospect.demo_slug}` : `${APP_URL}/demo`

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1F2937">
      <p style="font-size:15px;font-weight:600;color:#111827">A personal demonstration, prepared for ${prospect.company_name}</p>
      <p style="font-size:14px;color:#374151;line-height:1.6">
        We've built a private page specifically for ${prospect.company_name} — showing you exactly what your future homeowner customers would receive from your letters, using your service suburbs and project types.
      </p>
      <p style="margin:24px 0">
        <a href="${demoUrl}" style="display:inline-block;background:#3B6FDB;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:14px">
          View your personal demo →
        </a>
      </p>
      <p style="font-size:13px;color:#6B7280">Takes 2 minutes to view. No login required.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="font-size:12px;color:#9CA3AF">
        Roweo · Sydney NSW, Australia · roweo.com.au<br>
        <a href="${APP_URL}/api/unsubscribe?id=${id}" style="color:#9CA3AF">Unsubscribe</a>
      </p>
    </div>
  `

  await sendEmail({
    to: prospect.email,
    subject: `A personal demonstration prepared for ${prospect.company_name}`,
    html,
  })

  const now = new Date().toISOString()
  await supabase.from('builder_prospects').update({
    interactive_email_sent_at: now,
    updated_at: now,
  }).eq('id', id)

  await supabase.from('prospect_events').insert({
    prospect_id: id,
    event_type: 'interactive_email_sent',
    channel: 'interactive_email',
    occurred_at: now,
  })

  return NextResponse.json({ success: true })
}
