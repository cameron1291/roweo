import { createServiceClient } from '@/lib/supabase-server'

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
  searchParams: Promise<{ state?: string; project_type?: string; suburb?: string }>
}) {
  const { state, project_type, suburb } = await searchParams
  const supabase = createServiceClient()

  let query = supabase
    .from('development_applications')
    .select('id, source, da_number, suburb, state, project_type, project_type_confidence, description, estimated_value_aud, lodged_date, status, ingested_at, council')
    .order('ingested_at', { ascending: false })
    .limit(100)

  if (state) query = query.eq('state', state)
  if (project_type) query = query.eq('project_type', project_type)
  if (suburb) query = query.ilike('suburb', `%${suburb}%`)

  const { data: das, count } = await query

  const totalResult = await supabase.from('development_applications').select('id', { count: 'exact', head: true })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Development Applications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{(totalResult.count ?? 0).toLocaleString()} total in database</p>
        </div>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <select name="state" defaultValue={state ?? ''} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white">
          <option value="">All states</option>
          <option value="NSW">NSW</option>
          <option value="ACT">ACT</option>
          <option value="VIC">VIC</option>
          <option value="QLD">QLD</option>
        </select>
        <select name="project_type" defaultValue={project_type ?? ''} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          name="suburb"
          defaultValue={suburb ?? ''}
          placeholder="Filter suburb..."
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 flex-1"
        />
        <button type="submit" className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded text-sm transition-colors">
          Filter
        </button>
        <a href="/admin/das" className="text-sm text-zinc-500 hover:text-white px-3 py-2 transition-colors">
          Clear
        </a>
      </form>

      <div className="bg-white/3 border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Address</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Value</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Lodged</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(das ?? []).map(da => (
              <tr key={da.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{da.suburb}, {da.state}</p>
                  <p className="text-xs text-zinc-500 truncate max-w-xs">{da.description?.slice(0, 80)}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">{TYPE_LABELS[da.project_type] ?? da.project_type}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {da.estimated_value_aud ? `$${(da.estimated_value_aud / 1000).toFixed(0)}k` : '—'}
                </td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{da.lodged_date}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{da.source?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${(da.project_type_confidence ?? 0) >= 0.8 ? 'bg-green-500/20 text-green-400' : (da.project_type_confidence ?? 0) >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                    {((da.project_type_confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
            {(!das || das.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No DAs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(das?.length ?? 0) === 100 && (
        <p className="text-xs text-zinc-600 mt-3 text-right">Showing first 100 results. Use filters to narrow down.</p>
      )}
    </div>
  )
}
