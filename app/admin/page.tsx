import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-lg p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const [
    lettersResult,
    dasResult,
    scansResult,
    activeResult,
    pastDueResult,
    dasNewResult,
    recentScraperResult,
    recentDasResult,
  ] = await Promise.all([
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('status', 'letter_approved'),
    supabase.from('development_applications').select('id', { count: 'exact', head: true }),
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).gt('scan_count', 0).gte('scanned_at', yesterday),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'past_due'),
    supabase.from('development_applications').select('id', { count: 'exact', head: true }).gte('ingested_at', yesterday),
    supabase.from('scraper_runs').select('source, started_at, status, das_new, errors').order('started_at', { ascending: false }).limit(5),
    supabase.from('development_applications').select('suburb, state, project_type, lodged_date, ingested_at').order('ingested_at', { ascending: false }).limit(20),
  ])

  const mrrAud = (activeResult.count ?? 0) * 299

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Founder Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <form method="GET">
          <button className="text-xs text-zinc-500 hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors">
            Refresh
          </button>
        </form>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Today&apos;s Operations</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Letters to print" value={lettersResult.count ?? 0} sub="status = letter_approved" />
          <StatCard label="New DAs (24h)" value={dasNewResult.count ?? 0} />
          <StatCard label="QR scans (24h)" value={scansResult.count ?? 0} />
          <StatCard label="Total DAs ingested" value={dasResult.count ?? 0} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Revenue</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="MRR (AUD)" value={`$${mrrAud.toLocaleString()}`} sub={`${activeResult.count ?? 0} active subscribers × $299`} />
          <StatCard label="Active builders" value={activeResult.count ?? 0} />
          <StatCard label="Past due" value={pastDueResult.count ?? 0} sub={pastDueResult.count ? 'Needs follow-up' : undefined} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Recent Scraper Runs</h2>
          <div className="bg-white/3 border border-white/5 rounded-lg divide-y divide-white/5">
            {(recentScraperResult.data ?? []).length === 0 && (
              <p className="text-sm text-zinc-500 p-4">No scraper runs yet.</p>
            )}
            {(recentScraperResult.data ?? []).map((run: any) => (
              <div key={run.started_at} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${run.status === 'done' ? 'bg-green-500/20 text-green-400' : run.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {run.status}
                  </span>
                  <span className="text-sm ml-2">{run.source}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{run.das_new} new DAs</p>
                  <p className="text-xs text-zinc-500">{new Date(run.started_at).toLocaleString('en-AU')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Latest DAs Ingested</h2>
          <div className="bg-white/3 border border-white/5 rounded-lg divide-y divide-white/5 overflow-hidden">
            {(recentDasResult.data ?? []).length === 0 && (
              <p className="text-sm text-zinc-500 p-4">No DAs yet.</p>
            )}
            {(recentDasResult.data ?? []).map((da: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm">{da.suburb}, {da.state}</p>
                  <p className="text-xs text-zinc-500">{da.project_type?.replace(/_/g, ' ')}</p>
                </div>
                <p className="text-xs text-zinc-600">{da.lodged_date}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
