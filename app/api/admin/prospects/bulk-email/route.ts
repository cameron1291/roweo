import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildInteractiveDemoEmail } from '@/lib/emails/interactive-demo-email'
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

const bodySchema = z.object({
  prospect_ids: z.array(z.string().uuid()).min(1).max(200),
})

export async function POST(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { prospect_ids } = parsed.data

  const { data: prospects } = await supabase
    .from('builder_prospects')
    .select('id, company_name, email, email_unsubscribed, demo_slug, service_suburbs, contact_name, interactive_email_sent_at')
    .in('id', prospect_ids)

  if (!prospects?.length) return NextResponse.json({ error: 'No prospects found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'

  let sent = 0
  let skipped = 0
  const failed: string[] = []
  const skippedReasons: Record<string, string> = {}

  for (const prospect of prospects) {
    // Skip checks
    if (!prospect.email) {
      skipped++
      skippedReasons[prospect.company_name] = 'no email'
      continue
    }
    if (prospect.email_unsubscribed) {
      skipped++
      skippedReasons[prospect.company_name] = 'unsubscribed'
      continue
    }
    if (!prospect.demo_slug) {
      skipped++
      skippedReasons[prospect.company_name] = 'no demo page'
      continue
    }
    // Don't resend within 7 days
    if (prospect.interactive_email_sent_at) {
      const sentAt = new Date(prospect.interactive_email_sent_at).getTime()
      if (Date.now() - sentAt < 7 * 24 * 60 * 60 * 1000) {
        skipped++
        skippedReasons[prospect.company_name] = 'sent within last 7 days'
        continue
      }
    }

    const suburbs = (prospect.service_suburbs as string[]) ?? []
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

    const { error: sendError } = await sendEmail({
      to: prospect.email as string,
      subject,
      html,
    })

    if (sendError) {
      failed.push(prospect.company_name as string)
      continue
    }

    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('prospect_events').insert({
        prospect_id: prospect.id,
        event_type: 'interactive_email_sent',
        channel: 'interactive_email',
        metadata: { email: prospect.email, subject, bulk: true },
        occurred_at: now,
      }),
      supabase.from('builder_prospects').update({
        interactive_email_sent_at: now,
        updated_at: now,
      }).eq('id', prospect.id),
    ])

    sent++

    // 200ms delay between sends to stay within Resend rate limits
    if (sent < prospects.length) await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({ sent, skipped, failed, skippedReasons })
}
