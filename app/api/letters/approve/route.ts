import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { callDeepSeek } from '@/lib/deepseek'
import { z } from 'zod'

const schema = z.object({ match_id: z.string().uuid() })

const PROJECT_LABEL: Record<string, string> = {
  new_dwelling: 'a new dwelling',
  extension: 'an extension or addition',
  renovation: 'a renovation',
  pool: 'a pool',
  demolition: 'a demolition',
  commercial: 'a light commercial fitout',
  other: 'a development',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, plan')
    .eq('id', user.id)
    .single()

  if (!profile || !['active', 'past_due'].includes(profile.subscription_status ?? '')) {
    return NextResponse.json({ error: 'An active subscription is required to send letters' }, { status: 403 })
  }

  if (profile.plan === 'starter') {
    return NextResponse.json({ error: 'Your Starter plan doesn\'t include letters. Upgrade to Professional to send letters.' }, { status: 403 })
  }

  const { data: builderQuota } = await supabase
    .from('builder_profiles')
    .select('letters_remaining')
    .eq('user_id', user.id)
    .single()

  // Only block if quota is explicitly exhausted — NULL means not yet initialised (allow through)
  if (builderQuota?.letters_remaining !== null && builderQuota?.letters_remaining !== undefined && builderQuota.letters_remaining <= 0) {
    return NextResponse.json({ error: 'You\'ve used all your letters for this month. Top up in Billing or wait until your quota resets.' }, { status: 403 })
  }

  const { data: match } = await supabase
    .from('lead_matches')
    .select(`*, development_applications(*), builder_profiles(*)`)
    .eq('id', parsed.data.match_id)
    .eq('user_id', user.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const builder = match.builder_profiles
  if (!builder.letter_template_approved) {
    return NextResponse.json({ error: 'Approve your letter template in Settings before sending letters' }, { status: 400 })
  }

  const da = match.development_applications

  let letterBodyText = match.letter_body_text as string | null

  if (!letterBodyText) {
    const projectLabel = PROJECT_LABEL[da.project_type] ?? 'a development'
    const systemPrompt = `You write short, warm, professional cold-outreach letters from Australian builders to homeowners. Output exactly 3 paragraphs separated by a blank line. No greeting, no sign-off, no markdown — just the body paragraphs. Tone: professional, helpful, not pushy. Never guarantee outcomes. Australian English spelling.`
      const userPrompt = `Builder company: ${builder.company_name}
Builder tagline: ${builder.tagline ?? 'N/A'}
Homeowner's project: ${projectLabel} at ${da.suburb}, ${da.state}
Project description from DA: ${da.description ?? 'Not specified'}

Write the 3-paragraph letter body. Paragraph 1: mention noticing their DA and that the builder specialises in this project type. Paragraph 2: brief credibility statement (experience, quality, communication — keep generic since we don't have specific stats). Paragraph 3: offer a free no-obligation quote, mention scanning the QR code below.`

    letterBodyText = await callDeepSeek(systemPrompt, userPrompt, { maxTokens: 400, temperature: 0.6 })
  }

  const { error } = await supabase
    .from('lead_matches')
    .update({
      letter_body_text: letterBodyText,
      letter_generated_at: new Date().toISOString(),
      letter_approved_at: new Date().toISOString(),
      status: 'letter_approved',
      batch_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', parsed.data.match_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decrement quota — non-fatal if it fails (quota is advisory, not a hard lock)
  try { await supabase.rpc('add_letters', { p_user_id: user.id, p_amount: -1 }) } catch { /* non-fatal */ }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'letter_approved',
    entity_type: 'lead_match',
    entity_id: parsed.data.match_id,
  })

  return NextResponse.json({ success: true, letter_body_text: letterBodyText })
}
