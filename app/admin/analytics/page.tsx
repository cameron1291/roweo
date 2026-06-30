import { createServiceClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import { AnalyticsDashboard } from './analytics-dashboard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Analytics — Admin' }

export default async function AnalyticsPage() {
  const supabase = createServiceClient()

  // Parallel data fetching
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    revenueEvents,
    letterMatches,
    scanMatches,
    suburbStats,
    prospectFunnel,
    campaigns,
  ] = await Promise.all([
    supabase.from('subscription_events').select('event_type, amount_aud, occurred_at').gte('occurred_at', ninetyDaysAgo).order('occurred_at', { ascending: true }),
    supabase.from('lead_matches').select('status, batch_date, created_at').gte('created_at', ninetyDaysAgo).order('created_at', { ascending: true }),
    supabase.from('lead_matches').select('scan_count, scanned_at, created_at').gt('scan_count', 0).gte('created_at', ninetyDaysAgo),
    supabase.from('development_applications').select('suburb, project_type').gte('lodged_date', thirtyDaysAgo),
    supabase.from('prospect_events').select('prospect_id, event_type, channel, occurred_at').gte('occurred_at', ninetyDaysAgo),
    supabase.from('acquisition_campaigns').select('id, name, channel, status').order('created_at', { ascending: false }).limit(10),
  ])

  // Process suburb performance
  const suburbCounts: Record<string, number> = {}
  for (const da of suburbStats.data ?? []) {
    suburbCounts[da.suburb] = (suburbCounts[da.suburb] ?? 0) + 1
  }
  const topSuburbs = Object.entries(suburbCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([suburb, count]) => ({ suburb, count }))

  // Process project type breakdown
  const typeCounts: Record<string, number> = {}
  for (const da of suburbStats.data ?? []) {
    const t = da.project_type ?? 'other'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const projectTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))

  // Process letters by day
  const lettersByDay: Record<string, { generated: number; posted: number }> = {}
  for (const m of letterMatches.data ?? []) {
    const day = m.created_at.slice(0, 10)
    if (!lettersByDay[day]) lettersByDay[day] = { generated: 0, posted: 0 }
    lettersByDay[day].generated++
    if (m.status === 'posted' || m.status === 'scanned') lettersByDay[day].posted++
  }
  const lettersTimeline = Object.entries(lettersByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, data]) => ({ date, ...data }))

  // Process scans by day
  const scansByDay: Record<string, number> = {}
  for (const m of scanMatches.data ?? []) {
    if (!m.scanned_at) continue
    const day = m.scanned_at.slice(0, 10)
    scansByDay[day] = (scansByDay[day] ?? 0) + (m.scan_count ?? 1)
  }
  const scansTimeline = Object.entries(scansByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, scans]) => ({ date, scans }))

  // Process revenue MRR
  const mrrByMonth: Record<string, { new: number; churned: number; mrr: number }> = {}
  for (const ev of revenueEvents.data ?? []) {
    const month = ev.occurred_at.slice(0, 7)
    if (!mrrByMonth[month]) mrrByMonth[month] = { new: 0, churned: 0, mrr: 0 }
    if (ev.event_type === 'subscribed' || ev.event_type === 'reactivated') {
      mrrByMonth[month].new++
      mrrByMonth[month].mrr += 299
    }
    if (ev.event_type === 'cancelled') {
      mrrByMonth[month].churned++
      mrrByMonth[month].mrr -= 299
    }
  }
  let runningMrr = 0
  const revenueTimeline = Object.entries(mrrByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      runningMrr = Math.max(0, runningMrr + data.mrr)
      return { month, mrr: runningMrr, new_customers: data.new, churned: data.churned }
    })

  // Process acquisition funnel
  const events = prospectFunnel.data ?? []
  const channels = ['physical_letter', 'interactive_email', 'cold_email']
  const funnelData = channels.map(channel => {
    const ch = events.filter(e => e.channel === channel)
    const uniq = (type: string) => new Set(ch.filter(e => e.event_type === type).map(e => e.prospect_id)).size
    return {
      channel: channel.replace(/_/g, ' '),
      sent: uniq('interactive_email_sent') + uniq('cold_email_sent') + uniq('letter_generated'),
      opened: uniq('email_opened'),
      viewed: uniq('page_viewed'),
      clicked: uniq('cta_clicked'),
    }
  })

  return (
    <AnalyticsDashboard
      revenueTimeline={revenueTimeline}
      lettersTimeline={lettersTimeline}
      scansTimeline={scansTimeline}
      topSuburbs={topSuburbs}
      projectTypes={projectTypes}
      funnelData={funnelData}
      campaigns={campaigns.data ?? []}
    />
  )
}
