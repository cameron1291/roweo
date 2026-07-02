import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling',
  extension: 'Extension',
  renovation: 'Renovation',
  granny_flat: 'Granny Flat',
  pool: 'Pool',
  demolition: 'Demolition',
  duplex: 'Duplex',
  commercial: 'Commercial',
  other: 'Other',
}

export default async function DAsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; project_type?: string; suburb?: string; page?: string }>
}) {
  const { state, project_type, suburb, page: pageParam } = await searchParams
  const supabase = createServiceClient()
  const page = parseInt(pageParam ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('development_applications')
    .select('id, source, da_number, suburb, state, project_type, project_type_confidence, description, estimated_value_aud, lodged_date, council', { count: 'exact' })
    .order('ingested_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (state) query = query.eq('state', state)
  if (project_type) query = query.eq('project_type', project_type)
  if (suburb) query = query.ilike('suburb', `%${suburb}%`)

  const { data: das, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  const totalResult = await supabase.from('development_applications').select('id', { count: 'exact', head: true })

  // Build filter query string for pagination links
  const filterParams = new URLSearchParams()
  if (state) filterParams.set('state', state)
  if (project_type) filterParams.set('project_type', project_type)
  if (suburb) filterParams.set('suburb', suburb)
  const filterStr = filterParams.toString()
  const pageHref = (p: number) => `/admin/das?${filterStr ? filterStr + '&' : ''}page=${p}`

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Development Applications</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(totalResult.count ?? 0).toLocaleString()} total in database</p>
        </div>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <select name="state" defaultValue={state ?? ''} className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900">
          <option value="">All states</option>
          <option value="NSW">NSW</option>
          <option value="ACT">ACT</option>
          <option value="VIC">VIC</option>
          <option value="QLD">QLD</option>
        </select>
        <select name="project_type" defaultValue={project_type ?? ''} className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          name="suburb"
          defaultValue={suburb ?? ''}
          placeholder="Filter suburb..."
          className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 flex-1"
        />
        <button type="submit" className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded text-sm transition-colors border border-gray-200">
          Filter
        </button>
        <a href="/admin/das" className="text-sm text-gray-400 hover:text-gray-900 px-3 py-2 transition-colors">
          Clear
        </a>
      </form>

      <div className="bg-white/3 border border-gray-100 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Address</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Value</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Lodged</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(das ?? []).map(da => (
              <tr key={da.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{da.suburb}, {da.state}</p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{da.description?.slice(0, 80)}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{TYPE_LABELS[da.project_type] ?? da.project_type}</td>
                <td className="px-4 py-3 text-gray-700">
                  {da.estimated_value_aud ? `$${(da.estimated_value_aud / 1000).toFixed(0)}k` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{da.lodged_date}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{da.source?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${(da.project_type_confidence ?? 0) >= 0.8 ? 'bg-green-500/20 text-green-400' : (da.project_type_confidence ?? 0) >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-gray-500'}`}>
                    {((da.project_type_confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
            {(!das || das.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No DAs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          {count ? `Showing ${offset + 1}–${Math.min(offset + pageSize, count)} of ${count.toLocaleString()}` : ''}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">← Prev</Link>
            )}
            <span className="px-3 py-1.5 text-gray-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">Next →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
