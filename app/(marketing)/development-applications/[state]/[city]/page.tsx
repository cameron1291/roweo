import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const revalidate = 86400

const STATE_NAMES: Record<string, string> = {
  nsw: 'New South Wales', vic: 'Victoria', qld: 'Queensland',
  sa: 'South Australia', wa: 'Western Australia', tas: 'Tasmania',
  nt: 'Northern Territory', act: 'Australian Capital Territory',
}

const CITY_NAMES: Record<string, string> = {
  sydney: 'Sydney', melbourne: 'Melbourne', brisbane: 'Brisbane',
  canberra: 'Canberra', adelaide: 'Adelaide', perth: 'Perth',
  hobart: 'Hobart', darwin: 'Darwin',
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

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling', extension: 'Extension', renovation: 'Renovation',
  granny_flat: 'Granny Flat', pool: 'Pool', duplex: 'Duplex',
  demolition: 'Demolition', other: 'Other',
}

type Props = { params: Promise<{ state: string; city: string }> }

function capitalize(s: string) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city } = await params
  const cityName = CITY_NAMES[city] ?? capitalize(city)
  const stateName = STATE_NAMES[state] ?? state.toUpperCase()
  return {
    title: `Development Applications ${cityName} — Recent DAs Lodged | Roweo`,
    description: `Browse development applications lodged across ${cityName}, ${stateName}. Real DA data from Australian government planning portals — updated daily. Find suburbs with the most construction activity.`,
    alternates: { canonical: `/development-applications/${state}/${city}` },
    openGraph: {
      title: `Development Applications ${cityName} | Roweo`,
      description: `Real DA data for ${cityName}. Browse by suburb to see how many applications are being lodged in your area.`,
      siteName: 'Roweo',
      type: 'website',
    },
  }
}

export default async function DevelopmentApplicationsCityPage({ params }: Props) {
  const { state, city } = await params
  const stateUpper = state.toUpperCase()
  const cityName = CITY_NAMES[city] ?? capitalize(city)
  const stateName = STATE_NAMES[state] ?? stateUpper
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const supabase = createServiceClient()

  const [dasResult, countResult, suburbsResult] = await Promise.all([
    supabase
      .from('development_applications')
      .select('suburb, project_type, description, lodged_date, estimated_value_aud')
      .eq('state', stateUpper)
      .neq('project_type', 'commercial')
      .order('lodged_date', { ascending: false })
      .limit(10),
    supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .eq('state', stateUpper)
      .gte('lodged_date', thirtyDaysAgo),
    supabase
      .from('suburbs')
      .select('name, slug, da_count')
      .eq('state', stateUpper)
      .gt('da_count', 0)
      .order('da_count', { ascending: false })
      .limit(24),
  ])

  const recentDas = dasResult.data ?? []
  const daCount = countResult.count ?? 0
  const suburbs = suburbsResult.data ?? []

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Development Applications ${cityName}, ${stateName}`,
    description: `Browse development applications lodged across ${cityName}, ${stateName}. Real DA data updated daily from Australian government planning portals.`,
    url: `https://roweo.com.au/development-applications/${state}/${city}`,
    isPartOf: { '@type': 'WebSite', name: 'Roweo', url: 'https://roweo.com.au' },
    about: {
      '@type': 'Service',
      name: 'DA Lead Matching for Builders',
      provider: { '@type': 'Organization', name: 'Roweo', url: 'https://roweo.com.au' },
      areaServed: `${cityName}, ${stateName}, Australia`,
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <nav className="max-w-5xl mx-auto px-6 text-xs text-gray-400 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-700">Roweo</Link>
          <span>›</span>
          <span className="text-gray-600">Development applications {cityName}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] mb-3">
            Development Applications in {cityName}, {stateUpper}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {daCount > 0
              ? `${daCount.toLocaleString()} development applications lodged across ${stateName} in the last 30 days. Browse by suburb to see where the most construction activity is happening.`
              : `Browse development applications lodged in ${cityName} by suburb. Real DA data sourced from Australian government planning portals.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{daCount > 0 ? daCount.toLocaleString() : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">DAs in {stateUpper} last 30 days</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">{suburbs.length > 0 ? suburbs.length : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Suburbs with DA activity</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">Daily</p>
            <p className="text-xs text-gray-500 mt-1">Data updated</p>
          </div>
        </div>

        {/* Recent DAs */}
        {recentDas.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">
              Recent development applications in {stateName}
            </h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {recentDas.map((da, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                          {TYPE_LABELS[da.project_type] ?? da.project_type}
                        </span>
                        <span className="text-xs text-gray-400">{da.suburb}</span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
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

        {/* Suburb grid */}
        {suburbs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">
              Development applications by suburb in {cityName}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {suburbs.map(s => (
                <Link
                  key={s.slug}
                  href={`/development-applications/${state}/${city}/${s.slug}`}
                  className="flex items-center justify-between bg-gray-50 hover:bg-[#1B2A4A] hover:text-white border border-gray-200 hover:border-[#1B2A4A] rounded-lg px-4 py-3 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 group-hover:text-white">{s.name}</span>
                  <span className="text-xs text-gray-400 group-hover:text-blue-200">{s.da_count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Builder CTA */}
        <div className="bg-[#1B2A4A] rounded-xl p-8 mb-12 text-white">
          <h2 className="text-xl font-bold mb-3">
            Get matched to {cityName} DA leads automatically
          </h2>
          <p className="text-blue-200 mb-6 max-w-xl">
            Roweo watches the planning portal so you don't have to. When a new DA lands in your service suburbs, we post a letter to the homeowner in your name within 2 business days. No printing, no postage, no effort.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-7 py-3 rounded-lg transition-colors"
          >
            Get started from $149/month
          </Link>
          <p className="text-blue-300 text-sm mt-3">No contracts. Cancel any time.</p>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-[#1B2A4A] mb-6">
            Development applications {cityName} — common questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: `What is a development application (DA)?`,
                a: `A DA is a formal application to local council for approval to build, extend, or renovate a property. Once lodged, it becomes publicly available on the relevant state planning portal. In ${stateName}, DAs are published on the ${stateUpper === 'NSW' ? 'NSW Planning Portal' : stateUpper === 'ACT' ? 'ACT Planning Portal' : `${stateName} planning portal`}.`,
              },
              {
                q: `How current is the DA data?`,
                a: `Roweo ingests new DAs from government planning portals daily. Most DAs appear in our system within 24 hours of being lodged with council.`,
              },
              {
                q: `Are homeowner names or contact details shown?`,
                a: `No. We show suburb, project type, lodgement date, and estimated value only. Homeowner names and addresses are never displayed on public pages.`,
              },
              {
                q: `Can I get email alerts for new DAs in my suburb?`,
                a: `Yes — that's exactly what Roweo does for builders. Sign up, set your service suburbs and project preferences, and we'll match every new DA to your account and post a letter to the homeowner in your name.`,
              },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
