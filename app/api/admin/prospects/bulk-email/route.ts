import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildInteractiveDemoEmail } from '@/lib/emails/interactive-demo-email'
import { getResend, FROM_EMAIL } from '@/lib/resend'
import { z } from 'zod'

export const maxDuration = 60

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
  auto_select: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  prospect_ids: z.array(z.string().uuid()).min(1).max(200).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { auto_select, limit, prospect_ids } = parsed.data
  const EXCLUDED_STATUSES = ['not_suitable', 'lost']

  let prospects
  let totalRemaining = 0

  if (auto_select) {
    // Server does its own selection — no client IDs needed
    const batchLimit = limit ?? 100
    const [batchResult, countResult] = await Promise.all([
      supabase
        .from('builder_prospects')
        .select('id, company_name, email, email_unsubscribed, demo_slug, service_suburbs, contact_name, interactive_email_sent_at')
        .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)
        .is('interactive_email_sent_at', null)
        .is('letter_printed_at', null)
        .not('email', 'is', null)
        .not('demo_slug', 'is', null)
        .not('email_unsubscribed', 'is', true)
        .order('completeness_score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batchLimit),
      supabase
        .from('builder_prospects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)
        .is('interactive_email_sent_at', null)
        .is('letter_printed_at', null)
        .not('email', 'is', null)
        .not('demo_slug', 'is', null)
        .not('email_unsubscribed', 'is', true),
    ])
    if (batchResult.error) {
      return NextResponse.json({ error: `DB error: ${batchResult.error.message}` }, { status: 500 })
    }
    prospects = batchResult.data ?? []
    totalRemaining = countResult.count ?? 0
  } else if (prospect_ids?.length) {
    // Manual selection — look up the provided IDs
    const { data, error: dbError } = await supabase
      .from('builder_prospects')
      .select('id, company_name, email, email_unsubscribed, demo_slug, service_suburbs, contact_name, interactive_email_sent_at')
      .in('id', prospect_ids)
    if (dbError) {
      return NextResponse.json({ error: `DB error: ${dbError.message}` }, { status: 500 })
    }
    // If provided IDs yield no results (stale client state), fall back to auto-select
    if (!data?.length) {
      const [batchResult, countResult] = await Promise.all([
        supabase
          .from('builder_prospects')
          .select('id, company_name, email, email_unsubscribed, demo_slug, service_suburbs, contact_name, interactive_email_sent_at')
          .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)
          .is('interactive_email_sent_at', null)
          .is('letter_printed_at', null)
          .not('email', 'is', null)
          .not('demo_slug', 'is', null)
          .not('email_unsubscribed', 'is', true)
          .order('completeness_score', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(100),
        supabase
          .from('builder_prospects')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', `(${EXCLUDED_STATUSES.map(s => `"${s}"`).join(',')})`)
          .is('interactive_email_sent_at', null)
          .is('letter_printed_at', null)
          .not('email', 'is', null)
          .not('demo_slug', 'is', null)
          .not('email_unsubscribed', 'is', true),
      ])
      prospects = batchResult.data ?? []
      totalRemaining = countResult.count ?? 0
    } else {
      prospects = data
    }
  } else {
    return NextResponse.json({ error: 'Provide prospect_ids or auto_select:true' }, { status: 400 })
  }

  if (!prospects.length) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: [], skippedReasons: {}, totalRemaining })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  let skipped = 0
  const failed: string[] = []
  const skippedReasons: Record<string, string> = {}

  type BatchItem = { prospectId: string; companyName: string; email: string; subject: string; html: string }
  const batch: BatchItem[] = []

  for (const prospect of prospects) {
    if (!prospect.email) { skipped++; skippedReasons[prospect.company_name as string] = 'no email'; continue }
    if (prospect.email_unsubscribed) { skipped++; skippedReasons[prospect.company_name as string] = 'unsubscribed'; continue }
    if (!prospect.demo_slug) { skipped++; skippedReasons[prospect.company_name as string] = 'no demo page'; continue }
    if (prospect.interactive_email_sent_at) {
      const sentAt = new Date(prospect.interactive_email_sent_at as string).getTime()
      if (Date.now() - sentAt < 7 * 24 * 60 * 60 * 1000) {
        skipped++; skippedReasons[prospect.company_name as string] = 'sent within last 7 days'; continue
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

    batch.push({ prospectId: prospect.id as string, companyName: prospect.company_name as string, email: prospect.email as string, subject, html })
  }

  if (batch.length === 0) {
    return NextResponse.json({ sent: 0, skipped, failed, skippedReasons, totalRemaining })
  }

  const resend = getResend()
  const { error: batchError } = await resend.batch.send(
    batch.map(b => ({ from: FROM_EMAIL, to: b.email, subject: b.subject, html: b.html }))
  )

  if (batchError) {
    return NextResponse.json({ error: batchError.message, sent: 0, skipped, failed: batch.map(b => b.companyName), skippedReasons }, { status: 500 })
  }

  const now = new Date().toISOString()
  const sentIds = batch.map(b => b.prospectId)

  await Promise.all([
    supabase.from('builder_prospects')
      .update({ interactive_email_sent_at: now, updated_at: now })
      .in('id', sentIds),
    supabase.from('prospect_events').insert(
      batch.map(b => ({
        prospect_id: b.prospectId,
        event_type: 'interactive_email_sent',
        channel: 'interactive_email',
        metadata: { email: b.email, subject: b.subject, bulk: true },
        occurred_at: now,
      }))
    ),
  ])

  return NextResponse.json({ sent: batch.length, skipped, failed, skippedReasons, totalRemaining: Math.max(0, totalRemaining - batch.length) })
}
