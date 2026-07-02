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

type Props = { params: Promise<{ state: string; city: string }> }

function capitalize(s: string) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city } = await params
  const cityName = CITY_NAMES[city] ?? capitalize(city)
  const stateName = STATE_NAMES[state] ?? state.toUpperCase()
  return {
    title: `Construction Leads ${cityName} — DA Leads for Builders | Roweo`,
    description: `Find homeowners planning renovations, extensions and builds across ${cityName}. Roweo matches residential builders to real development applications and posts letters on your behalf. From $149/month.`,
    alternates: { canonical: `/construction-leads/${state}/${city}` },
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

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling', extension: 'Extension', renovation: 'Renovation',
  granny_flat: 'Granny Flat', pool: 'Pool', duplex: 'Duplex',
  demolition: 'Demolition', other: 'Other',
}

export default async function CityLeadsPage({ params }: Props) {
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
  const isLive = ['nsw', 'act'].includes(state)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Roweo', item: 'https://roweo.com.au' },
      { '@type': 'ListItem', position: 2, name: 'Construction Leads', item: 'https://roweo.com.au/construction-leads' },
      { '@type': 'ListItem', position: 3, name: cityName, item: `https://roweo.com.au/construction-leads/${state}/${city}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <nav className="max-w-5xl mx-auto px-6 text-xs text-gray-400 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-700">Roweo</Link>
          <span>›</span>
          <span className="text-gray-600">Construction leads {cityName}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Coming-soon notice for non-live states */}
        {!isLive && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 mb-8">
            <p className="font-semibold text-amber-800 mb-1">{stateName} — coming soon</p>
            <p className="text-sm text-amber-700 mb-3">
              Roweo is currently live in NSW and ACT. {stateName} is on our roadmap — sign up and we&apos;ll email you as soon as your state goes live.
            </p>
            <Link href="/signup" className="text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
              Join the waitlist →
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] mb-3">
            Construction Leads in {cityName}, {stateUpper}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {daCount > 0
              ? `${daCount.toLocaleString()} development applications lodged across ${stateName} in the last 30 days. Each one is a homeowner who hasn't chosen a builder yet.`
              : `Roweo matches residential builders across ${cityName} to homeowners planning extensions, renovations, and new dwellings via development application data.`}
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
            <p className="text-xs text-gray-500 mt-1">Suburbs with active leads</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-[#1B2A4A]">2 days</p>
            <p className="text-xs text-gray-500 mt-1">Letter turnaround</p>
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
              Construction leads by suburb in {cityName}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {suburbs.map(s => (
                <Link
                  key={s.slug}
                  href={`/construction-leads/${state}/${city}/${s.slug}`}
                  className="flex items-center justify-between bg-gray-50 hover:bg-[#1B2A4A] hover:text-white border border-gray-200 hover:border-[#1B2A4A] rounded-lg px-4 py-3 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 group-hover:text-white">{s.name}</span>
                  <span className="text-xs text-gray-400 group-hover:text-blue-200">{s.da_count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-[#1B2A4A] rounded-xl p-8 mb-12 text-white">
          <h2 className="text-xl font-bold mb-3">
            Start getting leads from {cityName} DAs
          </h2>
          <p className="text-blue-200 mb-6 max-w-xl">
            Choose the suburbs you work in. We match you to every new DA that comes in for your project types and post a professional letter to the homeowner within 2 business days. No lock-in.
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
        <section className="mb-6">
          <h2 className="text-lg font-bold text-[#1B2A4A] mb-6">
            Construction leads {cityName} — common questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: `How does Roweo find construction leads in ${cityName}?`,
                a: `Roweo pulls development application data from government planning portals across Australia including ${stateName}. When a homeowner lodges a DA, we classify the project type, match it to your service suburbs and trade preferences, and post a letter to their property within 2 business days.`,
              },
              {
                q: `What kind of projects can I get leads for in ${cityName}?`,
                a: `Roweo covers all residential DA types: extensions and second storey additions, ground floor renovations, new dwellings, granny flats, duplexes, and pool installations. You set which project types you want to see and we filter accordingly.`,
              },
              {
                q: `Do I have to commit to a long-term plan?`,
                a: `No. All plans are month-to-month with no lock-in contract. Cancel any time through your billing settings and you keep access until the end of your paid period.`,
              },
              {
                q: `How fast do letters go out after a DA is lodged?`,
                a: `Within 2 business days of you approving the lead. DA lodged Monday, letter in the homeowner's mailbox by Wednesday or Thursday. Most other builders are only just finding out about the DA when your letter arrives.`,
              },
              {
                q: `What is a development application (DA)?`,
                a: `A DA is a formal application to local council for approval to build, extend, or renovate a property. Once lodged, it becomes publicly available on the relevant state planning portal. Homeowners who lodge a DA are actively planning a project and are typically looking for builders within a few months.`,
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
