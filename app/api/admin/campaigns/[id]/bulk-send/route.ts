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

const schema = z.object({
  channel: z.enum(['interactive_email', 'cold_email']),
})

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: campaign } = await supabase.from('acquisition_campaigns').select('*').eq('id', id).single()
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch prospects that are in this campaign (via prospect_events with campaign_id)
  // and haven't been sent to yet for this channel
  const sentEventType = parsed.data.channel === 'interactive_email' ? 'interactive_email_sent' : 'cold_email_sent'

  const { data: alreadySent } = await supabase
    .from('prospect_events')
    .select('prospect_id')
    .eq('campaign_id', id)
    .eq('event_type', sentEventType)

  const alreadySentIds = new Set((alreadySent ?? []).map(e => e.prospect_id))

  const { data: prospects } = await supabase
    .from('builder_prospects')
    .select('id, company_name, email, service_suburbs, demo_slug, email_unsubscribed')
    .in('status', ['approved', 'active', 'demo_booked', 'trial_started'])
    .not('email', 'is', null)

  const eligible = (prospects ?? []).filter(p => !p.email_unsubscribed && !alreadySentIds.has(p.id))

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  let sent = 0
  const errors: string[] = []

  for (const prospect of eligible.slice(0, campaign.target_count ?? 100)) {
    try {
      const demoUrl = prospect.demo_slug ? `${APP_URL}/demo/${prospect.demo_slug}` : `${APP_URL}/demo`

      let subject: string, html: string
      if (parsed.data.channel === 'interactive_email') {
        subject = `A personal demonstration prepared for ${prospect.company_name}`
        html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1F2937"><p style="font-size:14px;color:#374151;line-height:1.6">We've built a private demo page specifically for ${prospect.company_name} showing exactly what your future homeowner customers would receive from your letters.</p><p style="margin:24px 0"><a href="${demoUrl}" style="display:inline-block;background:#3B6FDB;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:14px">View your personal demo →</a></p><hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"><p style="font-size:12px;color:#9CA3AF">Roweo · roweo.com.au · <a href="${APP_URL}/api/unsubscribe?id=${prospect.id}" style="color:#9CA3AF">Unsubscribe</a></p></div>`
      } else {
        const suburbs = (prospect.service_suburbs ?? []).slice(0, 2).join(' and ')
        subject = `Construction leads for ${suburbs || 'your area'}`
        html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1F2937;font-size:14px;line-height:1.6"><p>Hi,</p><p>I'm reaching out because we help residential builders${suburbs ? ` in ${suburbs}` : ''} find leads from development applications before competitors do.</p><p>From $149/month — no per-lead fees. <a href="${APP_URL}/demo" style="color:#3B6FDB">See how it works</a>.</p><p>— The Roweo team</p><hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"><p style="font-size:12px;color:#9CA3AF">Roweo · roweo.com.au · <a href="${APP_URL}/api/unsubscribe?id=${prospect.id}" style="color:#9CA3AF">Unsubscribe</a></p></div>`
      }

      await sendEmail({ to: prospect.email!, subject, html })

      const now = new Date().toISOString()
      const updateField = parsed.data.channel === 'interactive_email' ? 'interactive_email_sent_at' : 'cold_email_sent_at'
      await supabase.from('builder_prospects').update({ [updateField]: now, updated_at: now }).eq('id', prospect.id)
      await supabase.from('prospect_events').insert({ prospect_id: prospect.id, campaign_id: id, event_type: sentEventType, channel: parsed.data.channel, occurred_at: now })

      sent++
      await sleep(200) // Resend rate limit buffer
    } catch (e) {
      errors.push(prospect.id)
    }
  }

  // Note: prospect_count tracks prospects added to campaign (managed by add-prospect route), not emails sent

  return NextResponse.json({ sent, errors: errors.length, total: eligible.length })
}
