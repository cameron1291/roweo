import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocationData, PROJECT_TYPE_LABELS } from '@/lib/seo/get-location-data'

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

type Props = { params: Promise<{ state: string; city: string; suburb: string }> }

function capitalize(s: string) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suburb: suburbSlug, state } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()
  return {
    title: `Development Applications ${suburb} ${stateUpper} — Recent DA Lodgements`,
    description: `Browse recent development applications lodged in ${suburb}, ${stateUpper}. See project types, lodgement dates and estimated values. Updated daily from Australian planning portals.`,
    alternates: { canonical: `/development-applications/${state}/${suburbSlug}/${suburbSlug}` },
  }
}

export default async function DevelopmentApplicationsSuburbPage({ params }: Props) {
  const { suburb: suburbSlug, state, city } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()

  const data = await getLocationData(suburb, stateUpper)

  if (data.daCount === 0) notFound()

  const noindex = data.daCount <= 3

  return (
    <div className={noindex ? 'hidden' : ''}>
      {noindex && <meta name="robots" content="noindex" />}

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <nav className="max-w-5xl mx-auto px-6 text-xs text-gray-400 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-700">Roweo</Link>
          <span>›</span>
          <Link href={`/development-applications/${state}/${city}`} className="hover:text-gray-700">
            {capitalize(city)}, {stateUpper}
          </Link>
          <span>›</span>
          <span className="text-gray-600">{suburb}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] mb-3">
            Development Applications in {suburb}, {stateUpper}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {data.daCount30d > 0
              ? `${data.daCount30d} DAs lodged in ${suburb} in the last 30 days. ${data.daCount} total on record.`
              : `${data.daCount} development application${data.daCount === 1 ? '' : 's'} on record in ${suburb}.`}{' '}
            Data sourced from Australian government planning portals, updated daily.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{data.daCount}</p>
            <p className="text-xs text-gray-500 mt-1">Total applications</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{data.daCount30d}</p>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{data.topProjectTypes.length || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Project types</p>
          </div>
        </div>

        {/* Project type breakdown */}
        {data.topProjectTypes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-[#1B2A4A] mb-3">Project types in {suburb}</h2>
            <div className="flex flex-wrap gap-2">
              {data.topProjectTypes.map(t => (
                <span key={t.type} className={`text-sm px-3 py-1.5 rounded-full font-medium ${TYPE_BADGE[t.type] ?? TYPE_BADGE.other}`}>
                  {PROJECT_TYPE_LABELS[t.type] ?? t.type} ({t.count})
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Recent DAs */}
        {data.recentDas.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">Recent applications in {suburb}</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {data.recentDas.map((da, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                        {PROJECT_TYPE_LABELS[da.project_type] ?? da.project_type}
                      </span>
                      <p className="text-sm mt-1.5 text-gray-700 truncate">
                        {da.description?.slice(0, 130)}{(da.description?.length ?? 0) > 130 ? '…' : ''}
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
            <p className="text-xs text-gray-400 mt-2">
              DA data sourced from Australian government planning portals under open government licences. No homeowner personal details displayed.
            </p>
          </section>
        )}

        {/* Builder CTA */}
        <div className="bg-[#1B2A4A] rounded-xl p-8 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Are you a builder working in {suburb}?</h2>
          <p className="text-blue-200 text-sm mb-5 max-w-lg">
            Roweo matches you to every new DA in your service area and posts a letter to the homeowner in your name within 2 business days. From $149/month, no lock-in.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Get started from $149/month
          </Link>
        </div>

        {/* Nearby suburbs */}
        {data.nearbySuburbs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Nearby suburbs</h2>
            <div className="flex flex-wrap gap-2">
              {data.nearbySuburbs.map(s => (
                <Link
                  key={s.name}
                  href={`/development-applications/${s.state.toLowerCase()}/${city}/${s.slug}`}
                  className="text-xs border border-gray-200 hover:border-[#1B2A4A] text-gray-500 hover:text-[#1B2A4A] px-3 py-1.5 rounded-full transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
