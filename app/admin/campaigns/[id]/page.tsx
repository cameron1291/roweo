import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CampaignActions } from './campaign-actions'
import { ProspectPicker } from './prospect-picker'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('acquisition_campaigns').select('name').eq('id', id).single()
  return { title: `${data?.name ?? 'Campaign'} — Admin` }
}

const STATUS_BADGE: Record<string, string> = {
  scraped: 'bg-gray-100 text-gray-500',
  reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  active: 'bg-violet-100 text-violet-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ city?: string; minfit?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const cityFilter = sp.city ?? 'Sydney'
  const minFit = parseInt(sp.minfit ?? '40')

  const supabase = createServiceClient()

  const [campaignRes, eventsRes] = await Promise.all([
    supabase.from('acquisition_campaigns').select('*').eq('id', id).single(),
    supabase.from('prospect_events')
      .select('prospect_id, event_type, channel, occurred_at')
      .eq('campaign_id', id)
      .order('occurred_at', { ascending: false }),
  ])

  if (!campaignRes.data) notFound()
  const campaign = campaignRes.data
  const events = eventsRes.data ?? []

  // Get all prospect_ids already added to this campaign
  const addedIds = new Set(
    events.filter(e => e.event_type === 'added_to_campaign').map(e => e.prospect_id)
  )

  // Fetch added prospects with full details
  let addedProspects: any[] = []
  if (addedIds.size > 0) {
    const { data } = await supabase
      .from('builder_prospects')
      .select('id, company_name, website, fit_score, status, business_type, service_suburbs, letter_generated_at, letter_posted_at, email, phone')
      .in('id', [...addedIds])
      .order('fit_score', { ascending: false })
    addedProspects = data ?? []
  }

  // Fetch available prospects to add — filtered by city/suburb and min fit score
  let availableQuery = supabase
    .from('builder_prospects')
    .select('id, company_name, website, fit_score, status, business_type, service_suburbs, email, phone')
    .not('status', 'in', '(not_suitable,paid,lost)')
    .gte('fit_score', minFit)
    .order('fit_score', { ascending: false })
    .limit(200)
  if (addedIds.size > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${[...addedIds].join(',')})`)
  }
  const { data: available } = await availableQuery

  // Filter by city if service_suburbs contains anything related to cityFilter
  const cityLower = cityFilter.toLowerCase()
  const filteredAvailable = (available ?? []).filter(p => {
    const suburbs = (p.service_suburbs ?? []) as string[]
    if (!suburbs.length) {
      // No suburbs set — include if fit_score is high enough
      return p.fit_score >= 60
    }
    return suburbs.some((s: string) => s.toLowerCase().includes(cityLower) || cityLower.includes(s.toLowerCase()))
  })

  // Funnel counts
  const byType = (type: string) => new Set(events.filter(e => e.event_type === type).map(e => e.prospect_id)).size
  const funnelStages = [
    { label: 'In campaign', count: addedIds.size },
    { label: 'Letter generated', count: addedProspects.filter(p => p.letter_generated_at).length },
    { label: 'Letter posted', count: addedProspects.filter(p => p.letter_posted_at).length },
    { label: 'Email sent', count: byType('interactive_email_sent') + byType('cold_email_sent') },
    { label: 'Demo viewed', count: byType('page_viewed') },
  ]

  const CITY_AREAS = [
    'Sydney', 'Parramatta', 'Inner West', 'Eastern Suburbs', 'North Shore',
    'Northern Beaches', 'Sutherland', 'Blacktown', 'Penrith', 'Liverpool',
    'Campbelltown', 'Hornsby', 'Ryde', 'Chatswood', 'Manly',
    'Newcastle', 'Lake Macquarie', 'Maitland',
    'Central Coast', 'Gosford', 'Wyong',
    'Wollongong', 'Illawarra',
  ]

  return (
    <div className="p-8">
      <Link href="/admin/campaigns" className="text-xs text-gray-400 hover:text-gray-700 mb-4 block">← All campaigns</Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
          {campaign.description && <p className="text-sm text-gray-400 mt-1">{campaign.description}</p>}
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-gray-600">{campaign.channel?.replace(/_/g, ' ')}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">{campaign.status}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">{addedIds.size} prospects added</span>
          </div>
        </div>
        <CampaignActions campaign={campaign} />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-lg p-6 border border-gray-100 mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-6">Funnel</h2>
        <div className="flex gap-4">
          {funnelStages.map((stage, i) => {
            const prevCount = i === 0 ? stage.count : funnelStages[i - 1].count
            const pct = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0
            return (
              <div key={stage.label} className="flex-1 bg-gray-50 rounded-lg p-4 relative">
                {i > 0 && <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">›</div>}
                <p className="text-2xl font-semibold text-gray-900">{stage.count}</p>
                <p className="text-xs text-gray-400 mt-1">{stage.label}</p>
                {i > 0 && <p className="text-xs text-gray-500 mt-2">{pct}%</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Prospects in campaign */}
      {addedProspects.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">{addedProspects.length} prospects in this campaign</h2>
            <span className="text-xs text-gray-400">{addedProspects.filter(p => p.letter_generated_at).length} letters generated · {addedProspects.filter(p => p.letter_posted_at).length} posted</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Company</th>
                <th className="text-left px-5 py-3">Fit</th>
                <th className="text-left px-5 py-3">Letter</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addedProspects.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/admin/prospects/${p.id}`} className="text-gray-900 hover:text-blue-600 font-medium text-sm">
                      {p.company_name}
                    </Link>
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-400 hover:text-gray-600 truncate max-w-48">
                        {p.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(p.fit_score ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (p.fit_score ?? 0) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.fit_score ?? '?'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {p.letter_posted_at ? <span className="text-emerald-600">Posted</span>
                      : p.letter_generated_at ? <span className="text-blue-600">Generated</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {p.email ? <span className="text-gray-600">{p.email}</span> : <span className="text-gray-300">no email</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/prospects/${p.id}`} className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1 transition-colors">
                        View
                      </Link>
                      {p.letter_generated_at && (
                        <a href={`/api/admin/prospects/${p.id}/preview-pdf`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 transition-colors">
                          Preview PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add prospects section */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Add prospects to campaign</h2>
            <span className="text-xs text-gray-400">{filteredAvailable.length} available in {cityFilter}</span>
          </div>
          {/* City filter */}
          <form method="get" className="flex gap-2">
            <select name="city" defaultValue={cityFilter} className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 focus:outline-none">
              {CITY_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select name="minfit" defaultValue={minFit.toString()} className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 focus:outline-none">
              <option value="0">All scores</option>
              <option value="30">Fit ≥ 30</option>
              <option value="40">Fit ≥ 40</option>
              <option value="60">Fit ≥ 60</option>
              <option value="70">Fit ≥ 70</option>
            </select>
            <button type="submit" className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-200 transition-colors">
              Filter
            </button>
          </form>
        </div>

        <ProspectPicker
          campaignId={id}
          prospects={filteredAvailable.slice(0, 100)}
        />
      </div>
    </div>
  )
}
