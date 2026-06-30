import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { callClaude } from '@/lib/claude'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return serviceClient
}

const SYSTEM_PROMPT = `You are writing acquisition letters for Roweo, an Australian B2B SaaS that helps residential builders find leads via development applications (DAs). Write persuasively and professionally in Australian English. Be direct and specific. No fluff. The letter goes to building company owners.`

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: prospect } = await supabase.from('builder_prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch recent real DAs from their service suburbs
  const suburbs = prospect.service_suburbs ?? []
  let recentDAs: Array<{ suburb: string; project_type: string; lodged_date: string }> = []
  if (suburbs.length > 0) {
    const { data } = await supabase
      .from('development_applications')
      .select('suburb, project_type, lodged_date, description')
      .in('suburb', suburbs)
      .not('project_type', 'eq', 'other')
      .order('lodged_date', { ascending: false })
      .limit(5)
    recentDAs = data ?? []
  }

  const daContext = recentDAs.length > 0
    ? recentDAs.map(da => `- ${da.suburb}: ${da.project_type?.replace(/_/g, ' ')} (${new Date(da.lodged_date).toLocaleDateString('en-AU')})`).join('\n')
    : 'No DA data available yet for this builder\'s service area.'

  const userPrompt = `Write a 3-paragraph acquisition letter for a builder company called "${prospect.company_name}".

Context about this company:
- Business type: ${prospect.business_type?.replace(/_/g, ' ') ?? 'residential builder'}
- Service suburbs: ${suburbs.join(', ') || 'Sydney area'}
- AI summary: ${prospect.ai_summary ?? 'Residential building company'}

Recent development applications in their service area:
${daContext}

Write 3 short paragraphs:

Paragraph 1 (Opening): Reference a specific recent trend in their service suburbs using the DA data above. Mention the volume of work happening near them. Be specific — name a suburb and project type. Do not start with "Dear" or any salutation (the letter template handles that).

Paragraph 2 (Value proposition): Explain what Roweo does: we match builders to development applications as soon as they're lodged, generate a personalised letter to the property owner, and post it within 2 business days — before any other builder even knows about the project. Flat subscription, no per-lead fees.

Paragraph 3 (Call to action): Ask them to scan the QR code on this letter to see a personalised demo page we've built specifically for ${prospect.company_name}. Keep it conversational. One sentence, direct close.

Return ONLY the three paragraphs, no headings, no sign-off, no salutation.`

  const letterBody = await callClaude(SYSTEM_PROMPT, userPrompt, { maxTokens: 600, temperature: 0.7 })

  await supabase.from('builder_prospects').update({
    letter_body_text: letterBody,
    letter_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await supabase.from('prospect_events').insert({
    prospect_id: id,
    event_type: 'letter_generated',
    channel: 'physical_letter',
    occurred_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, letter_body_text: letterBody })
}
