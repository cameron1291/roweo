import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import { PROJECT_TYPE_LABELS } from '@/lib/seo/get-location-data'

export const dynamic = 'force-dynamic'

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-100 text-blue-700',
  renovation: 'bg-purple-100 text-purple-700',
  new_dwelling: 'bg-green-100 text-green-700',
  granny_flat: 'bg-yellow-100 text-yellow-700',
  pool: 'bg-cyan-100 text-cyan-700',
  duplex: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
}

type Props = { params: Promise<{ postcode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postcode } = await params
  if (!/^\d{4}$/.test(postcode)) return {}
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('postcodes')
    .select('da_count')
    .eq('postcode', postcode)
    .single()
  return {
    title: `Builder Leads Postcode ${postcode} — DA Leads for Builders | Roweo`,
    description: `Find homeowners planning extensions, renovations and new builds in postcode ${postcode}. Roweo matches residential builders to development applications and posts letters on your behalf.`,
    robots: (data?.da_count ?? 0) <= 3 ? { index: false } : undefined,
    openGraph: {
      title: `Builder Leads Postcode ${postcode} | Roweo`,
      description: `Development applications in postcode ${postcode}. Get matched and have a letter posted to the homeowner within 2 business days.`,
      siteName: 'Roweo',
      type: 'website',
    },
  }
}

export default async function PostcodeLeadsPage({ params }: Props) {
  const { postcode } = await params
  if (!/^\d{4}$/.test(postcode)) notFound()

  const supabase = createServiceClient()
  const [postcodeResult, dasResult] = await Promise.all([
    supabase
      .from('postcodes')
      .select('postcode, state, suburbs, da_count')
      .eq('postcode', postcode)
      .single(),
    supabase
      .from('development_applications')
      .select('suburb, state, project_type, description, lodged_date, estimated_value_aud')
      .eq('postcode', postcode)
      .order('lodged_date', { ascending: false })
      .limit(10),
  ])

  const postcodeData = postcodeResult.data
  if (!postcodeData || postcodeData.da_count === 0) notFound()

  const das = dasResult.data ?? []
  const suburbs = postcodeData.suburbs ?? []
  const state = postcodeData.state
  const citySlug = state === 'NSW' ? 'sydney' : state === 'VIC' ? 'melbourne' : state === 'QLD' ? 'brisbane' : state === 'ACT' ? 'canberra' : state.toLowerCase()

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <nav className="max-w-5xl mx-auto px-6 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-700">Roweo</Link>
          <span className="mx-1.5">›</span>
          <span className="text-gray-600">Builder leads {postcode}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] mb-3">
            Builder Leads — Postcode {postcode}, {state}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {postcodeData.da_count} development application{postcodeData.da_count === 1 ? '' : 's'} on record in postcode {postcode}.
            {suburbs.length > 0 && ` Covers ${suburbs.join(', ')}.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{postcodeData.da_count}</p>
            <p className="text-xs text-gray-500 mt-1">Total applications</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{suburbs.length || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Suburbs covered</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">2 days</p>
            <p className="text-xs text-gray-500 mt-1">Letter turnaround</p>
          </div>
        </div>

        {/* Recent DAs */}
        {das.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">
              Recent DAs in postcode {postcode}
            </h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {das.map((da, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                          {PROJECT_TYPE_LABELS[da.project_type] ?? da.project_type}
                        </span>
                        <span className="text-xs text-gray-400">{da.suburb}</span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {da.description?.slice(0, 120)}{(da.description?.length ?? 0) > 120 ? '…' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{da.lodged_date}</p>
                      {da.estimated_value_aud && (
                        <p className="text-sm text-gray-500 mt-0.5">${(da.estimated_value_aud / 1000).toFixed(0)}k</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Suburbs in this postcode */}
        {suburbs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Suburbs in postcode {postcode}
            </h2>
            <div className="flex flex-wrap gap-2">
              {suburbs.map((s: string) => (
                <Link
                  key={s}
                  href={`/construction-leads/${state.toLowerCase()}/${citySlug}/${s.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-xs border border-gray-200 hover:border-[#1B2A4A] text-gray-500 hover:text-[#1B2A4A] px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-[#1B2A4A] rounded-xl p-8 text-white">
          <h2 className="font-bold text-xl mb-2">Get matched to leads in postcode {postcode}</h2>
          <p className="text-blue-200 text-sm mb-5 max-w-lg">
            Roweo matches you to every new DA in your service suburbs and posts a professional letter to the homeowner within 2 business days. From $149/month, no lock-in.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Get started from $149/month
          </Link>
          <p className="text-blue-300 text-sm mt-3">No contracts. Cancel any time.</p>
        </div>
      </div>
    </>
  )
}
