import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AddProspectModal } from './add-prospect-modal'
import { ProspectsTable } from './prospects-table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Prospects — Admin' }

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; business_type?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createServiceClient()
  const page = parseInt(params.page ?? '1')
  const pageSize = 100
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('builder_prospects')
    .select('id, company_name, website, email, phone, postal_address, employee_count_est, business_type, completeness_score, status, letter_generated_at, letter_posted_at, interactive_email_sent_at, phone_call_at, phone_outcome, interactive_letter_viewed_at, created_at', { count: 'exact' })
    .not('postal_address', 'is', null)
    .order('completeness_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.business_type) query = query.eq('business_type', params.business_type)
  if (params.q) query = query.ilike('company_name', `%${params.q}%`)

  const { data: prospects, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Build filter-preserving pagination href
  const pageHref = (p: number) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.status) qs.set('status', params.status)
    if (params.business_type) qs.set('business_type', params.business_type)
    qs.set('page', String(p))
    return `/admin/prospects?${qs.toString()}`
  }

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
          <h1 className="text-2xl font-semibold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-400 mt-1">Builder acquisition pipeline — Sydney, Newcastle, Central Coast NSW</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/campaigns/new"
            className="px-4 py-2 rounded-md bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 border border-gray-200 transition-colors"
          >
            New campaign
          </Link>
          <AddProspectModal />
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
          <div key={s.label} className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="get" className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search company name..."
          className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        <select name="status" defaultValue={params.status ?? ''} className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none">
          <option value="">All statuses</option>
          {['scraped','reviewed','approved','active','demo_booked','trial_started','paid','lost','not_suitable'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="business_type" defaultValue={params.business_type ?? ''} className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none">
          <option value="">All types</option>
          {['residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild', 'other'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 rounded-md bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          Filter
        </button>
        {(params.status || params.business_type || params.q) && (
          <Link href="/admin/prospects" className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-gray-900 transition-colors">
            Clear
          </Link>
        )}
      </form>

      <ProspectsTable prospects={prospects ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-3 py-1 rounded bg-gray-50 text-sm text-gray-500 hover:text-gray-900">← Prev</Link>
          )}
          <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="px-3 py-1 rounded bg-gray-50 text-sm text-gray-500 hover:text-gray-900">Next →</Link>
          )}
        </div>
      )}
    </div>
  )
}
