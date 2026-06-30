import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { z } from 'zod'

const schema = z.object({
  slug: z.string().min(1),
  event: z.enum(['page_viewed', 'scroll_depth', 'time_on_page', 'cta_clicked']),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Simple in-memory rate limiter per (slug, event) — resets on cold start
const rateLimitMap = new Map<string, number>()

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const { slug, event, metadata } = parsed.data

  // Rate limit: max 1 unique event type per slug per 10 minutes
  const rateLimitKey = `${slug}:${event}`
  const lastSeen = rateLimitMap.get(rateLimitKey) ?? 0
  const now = Date.now()
  if (now - lastSeen < 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  rateLimitMap.set(rateLimitKey, now)

  const supabase = createServiceClient()
  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('id, company_name, interactive_letter_viewed_at, interactive_cta_clicked_at')
    .eq('demo_slug', slug)
    .single()

  if (!prospect) return NextResponse.json({ ok: false }, { status: 404 })

  const nowIso = new Date().toISOString()

  await supabase.from('prospect_events').insert({
    prospect_id: prospect.id,
    event_type: event,
    channel: 'interactive_email',
    metadata: metadata ?? null,
    occurred_at: nowIso,
  })

  // Denorm update
  const updates: Record<string, string> = { updated_at: nowIso }
  if (event === 'page_viewed' && !prospect.interactive_letter_viewed_at) {
    updates.interactive_letter_viewed_at = nowIso
    // Notify admin on first view
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Demo page viewed — ${prospect.company_name}`,
      html: `<p>${prospect.company_name} just viewed their personalised demo page for the first time. <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'}/admin/prospects/${prospect.id}">View prospect →</a></p>`,
    }).catch(() => {})
  }
  if (event === 'cta_clicked' && !prospect.interactive_cta_clicked_at) {
    updates.interactive_cta_clicked_at = nowIso
  }

  await supabase.from('builder_prospects').update(updates).eq('id', prospect.id)

  return NextResponse.json({ ok: true })
}
