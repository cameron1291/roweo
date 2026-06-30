import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function ScraperPage() {
  const supabase = createServiceClient()

  const [runsResult, healthResult] = await Promise.all([
    supabase
      .from('scraper_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50),
    supabase
      .from('system_health_log')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(10),
  ])

  const runs = runsResult.data ?? []
  const healthLogs = healthResult.data ?? []

  const latestBySource: Record<string, any> = {}
  for (const run of runs) {
    if (!latestBySource[run.source]) latestBySource[run.source] = run
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">Scraper Log</h1>

      {Object.keys(latestBySource).length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {Object.entries(latestBySource).map(([source, run]) => {
            const ageMs = Date.now() - new Date(run.started_at).getTime()
            const ageH = ageMs / 3600000
            const isStale = ageH > 12
            return (
              <div key={source} className={`border rounded-lg p-4 ${isStale ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-white/3'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{source.replace('_', ' ')}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${run.status === 'done' ? 'bg-green-500/20 text-green-400' : run.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {run.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Last run: {new Date(run.started_at).toLocaleString('en-AU')}</p>
                <p className="text-xs text-zinc-500">Age: {ageH < 1 ? `${Math.round(ageMs / 60000)}m` : `${ageH.toFixed(1)}h`}{isStale ? ' ⚠️' : ''}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-zinc-400">{run.das_scraped} scraped</span>
                  <span className="text-xs text-zinc-400">{run.das_new} new</span>
                  <span className="text-xs text-zinc-400">{run.matches_created} matches</span>
                </div>
                {run.errors && <p className="text-xs text-red-400 mt-1 truncate">{run.errors}</p>}
              </div>
            )
          })}
        </div>
      )}

      {healthLogs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">System Health Log</h2>
          <div className="bg-white/3 border border-white/5 rounded-lg divide-y divide-white/5">
            {healthLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'ok' ? 'bg-green-500' : log.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-sm">{log.check_name}</span>
                  {log.message && <span className="text-xs text-zinc-500">{log.message}</span>}
                </div>
                <span className="text-xs text-zinc-600">{new Date(log.checked_at).toLocaleString('en-AU')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Run History</h2>
        <div className="bg-white/3 border border-white/5 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Scraped</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">New</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Matches</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Started</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {runs.map(run => {
                const duration = run.completed_at
                  ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                  : null
                return (
                  <tr key={run.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-300">{run.source?.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${run.status === 'done' ? 'bg-green-500/20 text-green-400' : run.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">{run.das_scraped}</td>
                    <td className="px-4 py-2.5 font-medium">{run.das_new}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{run.matches_created}</td>
                    <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(run.started_at).toLocaleString('en-AU')}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {duration !== null ? `${duration}s` : '—'}
                    </td>
                  </tr>
                )
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No scraper runs yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
