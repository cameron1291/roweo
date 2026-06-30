import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CampaignActions } from './campaign-actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('acquisition_campaigns').select('name').eq('id', id).single()
  return { title: `${data?.name ?? 'Campaign'} — Admin` }
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [campaignRes, prospectsRes] = await Promise.all([
    supabase.from('acquisition_campaigns').select('*').eq('id', id).single(),
    supabase.from('prospect_events')
      .select('prospect_id, event_type, channel, occurred_at')
      .eq('campaign_id', id)
      .order('occurred_at', { ascending: false }),
  ])

  if (!campaignRes.data) notFound()
  const campaign = campaignRes.data

  // Funnel: count unique prospects at each stage
  const events = prospectsRes.data ?? []
  const byType = (type: string) => new Set(events.filter(e => e.event_type === type).map(e => e.prospect_id)).size
  const funnelStages = [
    { label: 'Prospects in campaign', count: campaign.prospect_count ?? 0 },
    { label: 'Email sent', count: byType('interactive_email_sent') + byType('cold_email_sent') },
    { label: 'Email opened', count: byType('email_opened') },
    { label: 'Demo page viewed', count: byType('page_viewed') },
    { label: 'CTA clicked', count: byType('cta_clicked') },
  ]

  return (
    <div className="p-8">
      <Link href="/admin/campaigns" className="text-xs text-zinc-500 hover:text-zinc-300 mb-4 block">← All campaigns</Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{campaign.name}</h1>
          {campaign.description && <p className="text-sm text-zinc-500 mt-1">{campaign.description}</p>}
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-zinc-600">{campaign.channel?.replace(/_/g, ' ')}</span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-600">{campaign.status}</span>
          </div>
        </div>
        <CampaignActions campaign={campaign} />
      </div>

      {/* Funnel */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-white/5 mb-8">
        <h2 className="text-sm font-medium text-zinc-300 mb-6">Conversion funnel</h2>
        <div className="flex gap-4">
          {funnelStages.map((stage, i) => {
            const prevCount = i === 0 ? stage.count : funnelStages[i - 1].count
            const pct = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0
            return (
              <div key={stage.label} className="flex-1 bg-zinc-800 rounded-lg p-4 relative">
                {i > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-zinc-700 text-lg">›</div>
                )}
                <p className="text-2xl font-semibold text-white">{stage.count}</p>
                <p className="text-xs text-zinc-500 mt-1">{stage.label}</p>
                {i > 0 && (
                  <p className="text-xs text-zinc-600 mt-2">{pct}% of previous</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent events */}
      {events.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h2 className="text-sm font-medium text-zinc-300">Recent events</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-xs text-zinc-600 uppercase">
                <th className="text-left px-5 py-3">Prospect</th>
                <th className="text-left px-5 py-3">Event</th>
                <th className="text-left px-5 py-3">Channel</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 30).map((ev, i) => (
                <tr key={i} className="border-b border-white/5 text-sm">
                  <td className="px-5 py-3">
                    <Link href={`/admin/prospects/${ev.prospect_id}`} className="text-zinc-400 hover:text-white text-xs font-mono">
                      {ev.prospect_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{ev.event_type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600">{ev.channel ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600">{new Date(ev.occurred_at).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
