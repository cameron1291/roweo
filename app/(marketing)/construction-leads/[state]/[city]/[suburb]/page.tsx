import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocationData, PROJECT_TYPE_LABELS } from '@/lib/seo/get-location-data'

export const dynamic = 'force-dynamic'

const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland',
  SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania',
  NT: 'Northern Territory', ACT: 'Australian Capital Territory',
}

type Props = { params: Promise<{ state: string; city: string; suburb: string }> }

function capitalize(s: string) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suburb: suburbSlug, state, city } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()
  return {
    title: `Construction Leads ${suburb} ${stateUpper} — DA Leads for Builders`,
    description: `Find homeowners planning renovations, extensions and new builds in ${suburb}. Roweo matches you to development applications and posts letters on your behalf. From $149/month.`,
    alternates: { canonical: `/construction-leads/${state}/${city}/${suburbSlug}` },
  }
}

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-100 text-blue-700',
  renovation: 'bg-purple-100 text-purple-700',
  new_dwelling: 'bg-green-100 text-green-700',
  granny_flat: 'bg-yellow-100 text-yellow-700',
  pool: 'bg-cyan-100 text-cyan-700',
  duplex: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
}

export default async function SuburbLeadsPage({ params }: Props) {
  const { suburb: suburbSlug, state, city } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()
  const stateName = STATE_NAMES[stateUpper] ?? stateUpper
  const cityName = capitalize(city)

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
          <Link href={`/construction-leads/${state}/${city}`} className="hover:text-gray-700">
            {cityName}
          </Link>
          <span>›</span>
          <span className="text-gray-600">{suburb}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] mb-3">
            Construction Leads in {suburb}, {stateUpper}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {data.daCount30d > 0
              ? `${data.daCount30d} development applications lodged in ${suburb} in the last 30 days. Each one is a homeowner planning a project who hasn't chosen a builder yet.`
              : `${data.daCount} development applications on record in ${suburb}. Roweo matches you to new DAs as they come in and sends a letter to the homeowner within 2 business days.`}
          </p>
        </div>

        {/* Stats */}
        {data.daCount > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-[#1B2A4A]">{data.daCount30d || data.daCount}</p>
              <p className="text-xs text-gray-500 mt-1">{data.daCount30d > 0 ? 'DAs last 30 days' : 'Total DAs on record'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-[#1B2A4A]">{data.daCount}</p>
              <p className="text-xs text-gray-500 mt-1">Total applications</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-[#1B2A4A]">
                {data.topProjectTypes[0]?.type ? PROJECT_TYPE_LABELS[data.topProjectTypes[0].type] : 'Mixed'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Most common project</p>
            </div>
          </div>
        )}

        {/* Recent DAs */}
        {data.recentDas.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">
              Recent development applications in {suburb}
            </h2>
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
              DA data sourced from Australian government planning portals under open government licences. Property addresses and owner details are not displayed.
            </p>
          </section>
        )}

        {/* CTA */}
        <div className="bg-[#1B2A4A] rounded-xl p-8 mb-12 text-white">
          <h2 className="text-xl font-bold mb-3">
            Get matched to {suburb} construction leads
          </h2>
          <p className="text-blue-200 mb-6 max-w-xl">
            Set {suburb} as your service area and every new DA that comes in gets a letter posted to the homeowner in your name. Setup takes 20 minutes. First letter goes out within 2 business days.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-7 py-3 rounded-lg transition-colors"
          >
            Start from $149/month
          </Link>
          <p className="text-blue-300 text-sm mt-3">No contracts. Cancel any time.</p>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-[#1B2A4A] mb-6">
            Construction leads in {suburb} — common questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: `How many construction leads are available in ${suburb}?`,
                a: `There ${data.daCount === 1 ? 'is' : 'are'} ${data.daCount} development application${data.daCount === 1 ? '' : 's'} on record in ${suburb}${data.daCount30d > 0 ? `, with ${data.daCount30d} lodged in the last 30 days` : ''}. This includes extensions, renovations, new dwellings, granny flats, and other residential projects.`,
              },
              {
                q: `What types of projects are being lodged in ${suburb}?`,
                a: data.topProjectTypes.length > 0
                  ? `The most common project types in ${suburb} are ${data.topProjectTypes.map(t => PROJECT_TYPE_LABELS[t.type]).join(', ')}. Roweo lets you filter by project type so you only see the work you want.`
                  : `${suburb} sees a range of residential DA types including extensions, renovations, granny flats, and new dwellings.`,
              },
              {
                q: `How does Roweo get construction leads in ${suburb}?`,
                a: `Roweo ingests development application data from government planning portals across Australia. When a homeowner in ${suburb} lodges a DA, we classify the project type, match it to your suburb and trade preferences, and post a letter to their property within 2 business days of you approving it.`,
              },
              {
                q: `Do I need a builder's licence to use Roweo?`,
                a: `Yes. Every letter includes your builder's licence number as required under Australian Consumer Law. You enter your licence number during the 20-minute setup — no letter goes out without it.`,
              },
              {
                q: `What is a development application (DA)?`,
                a: `A DA is a formal application submitted to local council for permission to build, extend, or renovate a property. Once lodged, the application is publicly available on the relevant state planning portal. Most homeowners who lodge a DA are actively looking for a builder within 3–6 months.`,
              },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby suburbs */}
        {data.nearbySuburbs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Nearby suburbs
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.nearbySuburbs.map(s => (
                <Link
                  key={s.name}
                  href={`/construction-leads/${s.state.toLowerCase()}/${city}/${s.slug}`}
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
