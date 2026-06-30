import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()

  const [scraperResult, queueResult] = await Promise.all([
    supabase
      .from('scraper_runs')
      .select('started_at, status')
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('lead_matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'letter_approved'),
  ])

  const lastRun = scraperResult.data
  const daSyncHoursAgo = lastRun
    ? Math.round((Date.now() - new Date(lastRun.started_at).getTime()) / 3600000)
    : null

  const isOk = daSyncHoursAgo === null || daSyncHoursAgo < 12

  return NextResponse.json({
    status: isOk ? 'ok' : 'warning',
    da_sync_hours_ago: daSyncHoursAgo,
    queue_pending: queueResult.count ?? 0,
    scraper_status: lastRun?.status ?? 'never_run',
  })
}
