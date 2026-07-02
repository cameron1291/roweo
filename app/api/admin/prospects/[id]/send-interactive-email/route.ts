import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildInteractiveDemoEmail } from '@/lib/emails/interactive-demo-email'
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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!prospect.email) return NextResponse.json({ error: 'No email address on file' }, { status: 400 })
  if (prospect.email_unsubscribed) return NextResponse.json({ error: 'Prospect has unsubscribed' }, { status: 400 })
  if (!prospect.demo_slug) return NextResponse.json({ error: 'No demo page generated yet — create a demo slug first' }, { status: 400 })

  // Guard against resending within 24h
  const { data: recentSend } = await supabase
    .from('prospect_events')
    .select('id')
    .eq('prospect_id', id)
    .eq('event_type', 'interactive_email_sent')
    .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle()

  if (recentSend) {
    return NextResponse.json({ error: 'Interactive email already sent in the last 24 hours' }, { status: 409 })
  }

  const suburbs = (prospect.service_suburbs as string[]) ?? []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const openUrl = `${appUrl}/open/${prospect.demo_slug}`
  const demoUrl = `${appUrl}/demo/${prospect.demo_slug}`
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${prospect.id}`

  const { subject, html } = buildInteractiveDemoEmail({
    companyName: prospect.company_name as string,
    contactName: (prospect.contact_name as string | null) ?? null,
    suburbs: suburbs.length > 0 ? suburbs : ['your area'],
    openUrl,
    demoUrl,
    unsubscribeUrl,
    appUrl,
  })

  const { error: sendError } = await sendEmail({ to: prospect.email as string, subject, html })

  if (sendError) {
    console.error('Resend error:', sendError)
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
  }

  const now = new Date().toISOString()

  await Promise.all([
    supabase.from('prospect_events').insert({
      prospect_id: id,
      event_type: 'interactive_email_sent',
      channel: 'interactive_email',
      metadata: { email: prospect.email, subject },
      occurred_at: now,
    }),
    supabase.from('builder_prospects').update({
      interactive_email_sent_at: now,
      updated_at: now,
    }).eq('id', id),
  ])

  return NextResponse.json({ ok: true, sentTo: prospect.email })
}
