import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const SCRAPERS = [
  {
    id: 'nsw_eplanning',
    label: 'NSW ePlanning Portal',
    description: 'Official NSW Planning Portal API — high quality, full descriptions',
    schedule: '6:00am + 6:00pm AEST',
    built: true,
  },
  {
    id: 'council_da',
    label: 'council-da.com (AU-wide)',
    description: 'Third-party aggregator covering 250+ councils across all states',
    schedule: '6:05am + 6:05pm AEST',
    built: true,
  },
  {
    id: 'act_portal',
    label: 'ACT Planning Portal',
    description: 'ACT Government planning portal — Playwright scraper (built, not yet scheduled)',
    schedule: 'Not scheduled',
    built: true,
    pending: true,
  },
  {
    id: 'vic_spear',
    label: 'VIC SPEAR Portal',
    description: 'SPEAR system used by ~70 Victorian councils — single Playwright scraper',
    schedule: 'Not built',
    built: false,
  },
  {
    id: 'qld_development_i',
    label: 'QLD Development.i',
    description: 'Queensland state-wide DA portal with public API',
    schedule: 'Not built',
    built: false,
  },
  {
    id: 'sa_plansa',
    label: 'SA PlanSA (eDAL)',
    description: 'South Australia planning portal — thin data for residential',
    schedule: 'Not built',
    built: false,
  },
]

function statusBadge(status: string) {
  if (status === 'done')    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Done</span>
  if (status === 'running') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Running</span>
  if (status === 'failed')  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">Failed</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">{status}</span>
}

function dot(run: any) {
  if (!run) return 'bg-gray-600'
  if (run.status === 'done')    return 'bg-green-500'
  if (run.status === 'running') return 'bg-blue-500 animate-pulse'
  if (run.status === 'failed')  return 'bg-red-500'
  return 'bg-yellow-500'
}

export default async function ScraperPage() {
  const supabase = createServiceClient()

  const [runsResult, healthResult] = await Promise.all([
    supabase
      .from('scraper_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(200),
    supabase
      .from('system_health_log')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(10),
  ])

  const runs = runsResult.data ?? []
  const healthLogs = healthResult.data ?? []

  // Group runs by source
  const runsBySource: Record<string, any[]> = {}
  for (const run of runs) {
    if (!runsBySource[run.source]) runsBySource[run.source] = []
    runsBySource[run.source].push(run)
  }

  const latestBySource: Record<string, any> = {}
  for (const [source, sourceRuns] of Object.entries(runsBySource)) {
    latestBySource[source] = sourceRuns[0]
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Scraper Status</h1>
          <p className="text-sm text-gray-400 mt-1">DA ingestion runs at 6:00am and 6:00pm AEST daily</p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          <p>Next run: {(() => {
            const now = new Date()
            const aest = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }))
            const h = aest.getHours()
            const next = h < 6 ? '6:00am' : h < 18 ? '6:00pm' : 'Tomorrow 6:00am'
            return next + ' AEST'
          })()}</p>
        </div>
      </div>

      {/* Per-scraper status cards */}
      <div className="space-y-4 mb-10">
        {SCRAPERS.map(scraper => {
          const latest = latestBySource[scraper.id]
          const history = runsBySource[scraper.id] ?? []
          const ageMs = latest ? Date.now() - new Date(latest.started_at).getTime() : null
          const ageH = ageMs ? ageMs / 3600000 : null
          const isStale = ageH !== null && ageH > 14

          return (
            <div key={scraper.id} className={`border rounded-xl overflow-hidden ${!scraper.built ? 'opacity-50' : ''}`}>
              {/* Header row */}
              <div className={`flex items-start justify-between px-5 py-4 border-b border-white/5 ${isStale ? 'bg-yellow-500/5' : 'bg-white/3'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${dot(latest)}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{scraper.label}</h3>
                      {!scraper.built && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Not built</span>
                      )}
                      {scraper.pending && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">Needs scheduling</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{scraper.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  {latest ? (
                    <>
                      {statusBadge(latest.status)}
                      <p className="text-xs text-gray-400 mt-1">
                        {ageH !== null && ageH < 1
                          ? `${Math.round((ageMs ?? 0) / 60000)}m ago`
                          : ageH !== null ? `${ageH.toFixed(1)}h ago` : ''}
                        {isStale && <span className="text-yellow-500 ml-1">⚠ stale</span>}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-600">No runs yet</span>
                  )}
                </div>
              </div>

              {/* Stats + schedule */}
              <div className="px-5 py-3 flex items-center gap-8">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Schedule</p>
                  <p className="text-xs font-medium text-gray-300">{scraper.schedule}</p>
                </div>
                {latest && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Last scraped</p>
                      <p className="text-xs font-medium">{(latest.das_scraped ?? 0).toLocaleString()} DAs</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">New</p>
                      <p className="text-xs font-medium text-green-400">+{(latest.das_new ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Matches created</p>
                      <p className="text-xs font-medium">{(latest.matches_created ?? 0).toLocaleString()}</p>
                    </div>
                    {latest.errors && (
                      <div className="ml-auto">
                        <p className="text-xs text-red-400 truncate max-w-xs">{
                          Array.isArray(latest.errors)
                            ? `${latest.errors.length} error(s)`
                            : String(latest.errors).slice(0, 80)
                        }</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Run history for this scraper */}
              {history.length > 1 && (
                <div className="border-t border-white/5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-5 py-2 text-gray-500 font-normal">Started</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-normal">Status</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-normal">Scraped</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-normal">New</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-normal">Matches</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-normal">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.slice(0, 8).map((run: any) => {
                        const dur = run.completed_at
                          ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                          : null
                        return (
                          <tr key={run.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-5 py-2 text-gray-400 whitespace-nowrap">
                              {new Date(run.started_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-4 py-2">{statusBadge(run.status)}</td>
                            <td className="px-4 py-2 text-gray-400">{(run.das_scraped ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-2 font-medium text-green-400">+{(run.das_new ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-gray-400">{run.matches_created ?? 0}</td>
                            <td className="px-4 py-2 text-gray-500">{dur !== null ? `${dur}s` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* System health log */}
      {healthLogs.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">System Health</h2>
          <div className="bg-white/3 border border-gray-100 rounded-xl divide-y divide-white/5">
            {healthLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'ok' ? 'bg-green-500' : log.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-sm">{log.check_name}</span>
                  {log.message && <span className="text-xs text-gray-400">{log.message}</span>}
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(log.checked_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
