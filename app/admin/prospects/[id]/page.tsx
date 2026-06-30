import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProspectActions } from './prospect-actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('builder_prospects').select('company_name').eq('id', id).single()
  return { title: `${data?.company_name ?? 'Prospect'} — Admin` }
}

const STATUSES = ['scraped', 'reviewed', 'approved', 'active', 'demo_booked', 'trial_started', 'paid', 'lost', 'not_suitable']

const CHANNEL_EVENTS = [
  { label: 'Letter generated', field: 'letter_generated_at' },
  { label: 'Letter printed', field: 'letter_printed_at' },
  { label: 'Letter posted', field: 'letter_posted_at' },
  { label: 'Interactive email sent', field: 'interactive_email_sent_at' },
  { label: 'Interactive email opened', field: 'interactive_email_opened_at' },
  { label: 'Demo page viewed', field: 'interactive_letter_viewed_at' },
  { label: 'Demo CTA clicked', field: 'interactive_cta_clicked_at' },
  { label: 'Cold email sent', field: 'cold_email_sent_at' },
  { label: 'Cold email opened', field: 'cold_email_opened_at' },
  { label: 'Cold email CTA clicked', field: 'cold_email_cta_clicked_at' },
  { label: 'Phone call', field: 'phone_call_at' },
  { label: 'Demo booked', field: 'demo_booked_at' },
  { label: 'Trial started', field: 'trial_started_at' },
  { label: 'Paid', field: 'paid_at' },
] as const

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [prospectRes, eventsRes] = await Promise.all([
    supabase.from('builder_prospects').select('*').eq('id', id).single(),
    supabase.from('prospect_events').select('*').eq('prospect_id', id).order('occurred_at', { ascending: false }).limit(50),
  ])

  if (!prospectRes.data) notFound()

  const p = prospectRes.data
  const events = eventsRes.data ?? []

  const timeline = CHANNEL_EVENTS
    .map(e => ({ ...e, value: p[e.field] }))
    .filter(e => e.value)
    .sort((a, b) => new Date(a.value).getTime() - new Date(b.value).getTime())

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/prospects" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← All prospects</Link>
          <h1 className="text-2xl font-semibold text-white">{p.company_name}</h1>
          <div className="flex gap-3 mt-1 text-sm text-zinc-500">
            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">{p.website.replace(/^https?:\/\//, '')}</a>}
            {p.email && <span>{p.email}</span>}
            {p.phone && <span>{p.phone}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-2xl font-semibold text-white">{p.fit_score ?? '?'}<span className="text-sm text-zinc-500">/100</span></span>
          <span className="text-xs text-zinc-500">Fit score</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — actions */}
        <div className="space-y-4">
          <ProspectActions prospect={p} statuses={STATUSES} />
        </div>

        {/* Middle column — details */}
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Company details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Business type</dt>
                <dd className="text-zinc-300">{p.business_type?.replace(/_/g, ' ') ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">ABN</dt>
                <dd className="text-zinc-300">{p.abn ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Source</dt>
                <dd className="text-zinc-300">{p.source ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Postal address</dt>
                <dd className="text-zinc-300 text-right max-w-40">{p.postal_address ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Service suburbs</dt>
                <dd className="text-zinc-300 text-right max-w-40">{(p.service_suburbs ?? []).join(', ') || '—'}</dd>
              </div>
            </dl>
          </div>

          {p.ai_summary && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">AI summary</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{p.ai_summary}</p>
            </div>
          )}

          {p.fit_reasons?.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Fit reasons</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                {p.fit_reasons.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-500">+</span>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {p.demo_slug && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Demo page</h3>
              <a
                href={`/demo/${p.demo_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                /demo/{p.demo_slug}
              </a>
            </div>
          )}

          {p.notes && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Notes</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
        </div>

        {/* Right column — timeline */}
        <div>
          {timeline.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5 mb-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Contact timeline</h3>
              <div className="space-y-3">
                {timeline.map((e) => (
                  <div key={e.field} className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">{e.label}</span>
                    <span className="text-xs text-zinc-500">{new Date(e.value).toLocaleDateString('en-AU')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Event log</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="flex gap-3">
                    <span className="text-xs text-zinc-600 shrink-0">{new Date(ev.occurred_at).toLocaleDateString('en-AU')}</span>
                    <span className="text-xs text-zinc-400">{ev.event_type.replace(/_/g, ' ')}</span>
                    {ev.channel && <span className="text-xs text-zinc-600">·{ev.channel}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
