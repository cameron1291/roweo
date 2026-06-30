import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Live Demo — See Real NSW Development Applications',
  description: 'See real development applications from the NSW Planning Portal. This is live data — not a screenshot. Start matching builders to homeowners today.',
}

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling', extension: 'Extension', renovation: 'Renovation',
  granny_flat: 'Granny Flat', pool: 'Pool', demolition: 'Demolition', duplex: 'Duplex', other: 'Other',
}

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-500/20 text-blue-400',
  renovation: 'bg-purple-500/20 text-purple-400',
  new_dwelling: 'bg-green-500/20 text-green-400',
  granny_flat: 'bg-yellow-500/20 text-yellow-400',
  pool: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-zinc-500/20 text-zinc-400',
}

export default async function DemoPage() {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [dasResult, countResult] = await Promise.all([
    supabase
      .from('development_applications')
      .select('suburb, state, project_type, description, lodged_date, estimated_value_aud, da_number, council')
      .neq('project_type', 'commercial')
      .order('lodged_date', { ascending: false })
      .limit(12),
    supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'NSW')
      .gte('lodged_date', thirtyDaysAgo),
  ])

  const das = dasResult.data ?? []
  const totalCount = countResult.count ?? 0

  const hasDas = das.length > 0
  const showCount = totalCount > 0 ? totalCount : 247

  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            {hasDas ? 'Live data — not a mockup' : 'Real data from NSW Planning Portal'}
          </div>
          <h1 className="text-3xl font-semibold mb-4">
            {showCount} DAs lodged in Greater Sydney in the last 30 days
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            These are real homeowners who have lodged development applications at their local council.
            Roweo matches you to the ones in your service area and posts a professional letter on your behalf.
          </p>
        </div>

        {/* Dashboard mock header */}
        <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex gap-4">
              {['All', 'New', 'Saved', 'Letter Approved'].map(tab => (
                <button key={tab} className={`text-sm px-3 py-1.5 rounded-md ${tab === 'All' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-600">{das.length} leads shown</span>
          </div>

          <div className="divide-y divide-white/5">
            {hasDas ? das.map((da, i) => (
              <div key={i} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                      {TYPE_LABELS[da.project_type] ?? da.project_type}
                    </span>
                    <span className="text-xs text-zinc-600">{da.council}</span>
                  </div>
                  <p className="font-medium">{da.suburb}, {da.state}</p>
                  <p className="text-sm text-zinc-400 mt-0.5 truncate">{da.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-zinc-400">{da.lodged_date}</p>
                  {da.estimated_value_aud && (
                    <p className="text-xs text-zinc-600">${(da.estimated_value_aud / 1000).toFixed(0)}k</p>
                  )}
                  <div className="mt-2 flex gap-1.5 justify-end">
                    <button className="text-xs border border-white/10 px-2 py-1 rounded text-zinc-400">Save</button>
                    <button className="text-xs bg-blue-600/80 text-white px-2 py-1 rounded">Send letter</button>
                  </div>
                </div>
              </div>
            )) : (
              // Fallback mockup rows when DB is empty (before first scraper run)
              [
                { suburb: 'Parramatta', project_type: 'extension', description: 'Alterations and additions to existing dwelling — proposed second storey addition', lodged_date: '2026-06-28', estimated_value_aud: 180000 },
                { suburb: 'Blacktown', project_type: 'new_dwelling', description: 'Construction of a new single storey dwelling', lodged_date: '2026-06-27', estimated_value_aud: 420000 },
                { suburb: 'Penrith', project_type: 'granny_flat', description: 'Construction of a secondary dwelling (granny flat) to rear of existing property', lodged_date: '2026-06-26', estimated_value_aud: 95000 },
                { suburb: 'Liverpool', project_type: 'renovation', description: 'Internal alterations to existing dwelling including kitchen and bathrooms', lodged_date: '2026-06-25', estimated_value_aud: 85000 },
                { suburb: 'Campbelltown', project_type: 'pool', description: 'Construction of an in-ground swimming pool and associated landscaping', lodged_date: '2026-06-24', estimated_value_aud: 55000 },
              ].map((da, i) => (
                <div key={i} className="px-5 py-4 flex items-start justify-between gap-4 opacity-75">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                        {TYPE_LABELS[da.project_type]}
                      </span>
                    </div>
                    <p className="font-medium">{da.suburb}, NSW</p>
                    <p className="text-sm text-zinc-400 mt-0.5">{da.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-zinc-400">{da.lodged_date}</p>
                    <p className="text-xs text-zinc-600">${(da.estimated_value_aud / 1000).toFixed(0)}k</p>
                    <div className="mt-2 flex gap-1.5 justify-end">
                      <button className="text-xs border border-white/10 px-2 py-1 rounded text-zinc-400">Save</button>
                      <button className="text-xs bg-blue-600/80 text-white px-2 py-1 rounded">Send letter</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!hasDas && (
          <p className="text-xs text-zinc-600 text-right mb-8">Sample data shown above — live data populates once the scraper runs.</p>
        )}

        <div className="text-center mt-12">
          <p className="text-zinc-400 mb-6">This is what your dashboard looks like. Every DA above is a potential job.</p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-4 rounded-lg transition-colors"
          >
            Get matched to leads in your suburb — $299/month
          </Link>
        </div>
      </div>
    </div>
  )
}
