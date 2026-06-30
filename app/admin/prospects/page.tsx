import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Prospects — Admin' }

const STATUS_STYLES: Record<string, string> = {
  scraped: 'bg-zinc-800 text-zinc-400',
  reviewed: 'bg-blue-950 text-blue-400',
  approved: 'bg-indigo-950 text-indigo-400',
  active: 'bg-violet-950 text-violet-400',
  demo_booked: 'bg-cyan-950 text-cyan-400',
  trial_started: 'bg-yellow-950 text-yellow-400',
  paid: 'bg-emerald-950 text-emerald-400',
  lost: 'bg-red-950 text-red-400',
  not_suitable: 'bg-zinc-900 text-zinc-600',
}

function fitBadge(score: number) {
  if (score >= 70) return 'bg-emerald-950 text-emerald-400'
  if (score >= 40) return 'bg-yellow-950 text-yellow-400'
  return 'bg-zinc-800 text-zinc-500'
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; business_type?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createServiceClient()
  const page = parseInt(params.page ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('builder_prospects')
    .select('id, company_name, website, email, business_type, fit_score, status, interactive_letter_viewed_at, cold_email_sent_at, letter_posted_at, created_at', { count: 'exact' })
    .order('fit_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.business_type) query = query.eq('business_type', params.business_type)
  if (params.q) query = query.ilike('company_name', `%${params.q}%`)

  const { data: prospects, count } = await query

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Stats
  const [total, active, demoViewed, paid] = await Promise.all([
    supabase.from('builder_prospects').select('id', { count: 'exact', head: true }),
    supabase.from('builder_prospects').select('id', { count: 'exact', head: true }).in('status', ['active', 'demo_booked', 'trial_started']),
    supabase.from('builder_prospects').select('id', { count: 'exact', head: true }).not('interactive_letter_viewed_at', 'is', null),
    supabase.from('builder_prospects').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Prospects</h1>
          <p className="text-sm text-zinc-500 mt-1">Builder acquisition pipeline</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/campaigns/new"
            className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-sm text-zinc-300 border border-white/10 transition-colors"
          >
            New campaign
          </Link>
          <form action="/api/admin/prospects" method="post">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
            >
              + Add prospect
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total prospects', value: total.count ?? 0 },
          { label: 'In pipeline', value: active.count ?? 0 },
          { label: 'Demo page viewed', value: demoViewed.count ?? 0 },
          { label: 'Converted (paid)', value: paid.count ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-lg p-4 border border-white/5">
            <p className="text-2xl font-semibold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="get" className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search company name..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <select name="status" defaultValue={params.status ?? ''} className="bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="business_type" defaultValue={params.business_type ?? ''} className="bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All types</option>
          {['residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild', 'other'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 rounded-md bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-colors">
          Filter
        </button>
        {(params.status || params.business_type || params.q) && (
          <Link href="/admin/prospects" className="px-4 py-2 rounded-md text-sm text-zinc-500 hover:text-white transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-zinc-900 rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Fit</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Letter</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Demo viewed</th>
            </tr>
          </thead>
          <tbody>
            {(prospects ?? []).map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/prospects/${p.id}`} className="text-white hover:text-blue-400 font-medium text-sm">
                    {p.company_name}
                  </Link>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-zinc-600 hover:text-zinc-400 truncate max-w-40">
                      {p.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{p.business_type?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fitBadge(p.fit_score ?? 0)}`}>
                    {p.fit_score ?? '?'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.letter_posted_at ? new Date(p.letter_posted_at).toLocaleDateString('en-AU') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.cold_email_sent_at ? new Date(p.cold_email_sent_at).toLocaleDateString('en-AU') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.interactive_letter_viewed_at ? (
                    <span className="text-emerald-400">{new Date(p.interactive_letter_viewed_at).toLocaleDateString('en-AU')}</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {(prospects ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-zinc-600 text-sm">
                  No prospects yet. Run the Google Maps scraper to populate the pipeline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="px-3 py-1 rounded bg-white/5 text-sm text-zinc-400 hover:text-white">← Prev</Link>
          )}
          <span className="px-3 py-1 text-sm text-zinc-600">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}`} className="px-3 py-1 rounded bg-white/5 text-sm text-zinc-400 hover:text-white">Next →</Link>
          )}
        </div>
      )}
    </div>
  )
}
