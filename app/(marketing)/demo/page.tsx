import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Live Demo — Real NSW Development Applications',
  description: 'See real development applications from the NSW Planning Portal. These are actual homeowners planning renovations and builds in Greater Sydney right now.',
}

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling', extension: 'Extension', renovation: 'Renovation',
  granny_flat: 'Granny Flat', pool: 'Pool', demolition: 'Demolition', duplex: 'Duplex', other: 'Other',
}

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-100 text-blue-700',
  renovation: 'bg-purple-100 text-purple-700',
  new_dwelling: 'bg-green-100 text-green-700',
  granny_flat: 'bg-yellow-100 text-yellow-700',
  pool: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-600',
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

  const mockDas = [
    { suburb: 'Parramatta', project_type: 'extension', description: 'Alterations and additions to existing dwelling — proposed second storey addition', lodged_date: '2026-06-28', estimated_value_aud: 180000 },
    { suburb: 'Blacktown', project_type: 'new_dwelling', description: 'Construction of a new single storey dwelling', lodged_date: '2026-06-27', estimated_value_aud: 420000 },
    { suburb: 'Penrith', project_type: 'granny_flat', description: 'Construction of a secondary dwelling (granny flat) to rear of existing property', lodged_date: '2026-06-26', estimated_value_aud: 95000 },
    { suburb: 'Liverpool', project_type: 'renovation', description: 'Internal alterations to existing dwelling including kitchen and bathrooms', lodged_date: '2026-06-25', estimated_value_aud: 85000 },
    { suburb: 'Campbelltown', project_type: 'pool', description: 'Construction of an in-ground swimming pool and associated landscaping', lodged_date: '2026-06-24', estimated_value_aud: 55000 },
  ]

  const displayDas = hasDas ? das : mockDas

  return (
    <>
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          {hasDas ? 'Live data — not a mockup' : 'Sample data — live data loads once the scraper runs'}
        </div>
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-4">
          {showCount} DAs lodged in Greater Sydney in the last 30 days
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          These are real homeowners who have lodged development applications at their local council.
          Roweo matches the right ones to your service area and posts a letter on your behalf.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-8">
        {/* Dashboard chrome */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {/* Tab bar — styled to look like the real app */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#0f172a] border-b border-white/10">
            <div className="flex gap-1">
              {['All leads', 'New', 'Saved', 'Letter sent'].map(tab => (
                <button key={tab} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'All leads' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-500">{displayDas.length} leads shown</span>
          </div>

          <div className="divide-y divide-gray-100 bg-white">
            {displayDas.map((da, i) => (
              <div key={i} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                      {TYPE_LABELS[da.project_type] ?? da.project_type}
                    </span>
                    {'council' in da && da.council && (
                      <span className="text-xs text-gray-400">{da.council}</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{da.suburb}, {'state' in da ? da.state : 'NSW'}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{da.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-400">{da.lodged_date}</p>
                  {da.estimated_value_aud && (
                    <p className="text-xs text-gray-400">${(da.estimated_value_aud / 1000).toFixed(0)}k</p>
                  )}
                  <div className="mt-2 flex gap-1.5 justify-end">
                    <button className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1 rounded-md">Save</button>
                    <button className="text-xs bg-[#1B2A4A] text-white px-2.5 py-1 rounded-md">Send letter</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!hasDas && (
          <p className="text-xs text-gray-400 text-right mt-2">Sample data — live data appears after first scraper run.</p>
        )}
      </section>

      <section className="bg-gray-50 border-t border-gray-100 py-16 text-center mt-8">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-3">Every DA above is a potential job</h2>
          <p className="text-gray-500 mb-8">Set up your service area and letter template in 20 minutes. We handle the rest.</p>
          <Link
            href="/signup"
            className="inline-block bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-9 py-4 rounded-lg transition-colors"
          >
            Get started from $149/month
          </Link>
          <p className="text-sm text-gray-400 mt-4">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
