import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocationData, PROJECT_TYPE_LABELS } from '@/lib/seo/get-location-data'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ state: string; city: string; suburb: string }> }

function capitalize(s: string) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suburb: suburbSlug, state, city } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()
  const title = `Construction Leads in ${suburb}, ${stateUpper} — Find DA Leads for Builders`
  const description = `Find homeowners who have lodged development applications in ${suburb}, ${stateUpper}. Roweo matches you to real DA leads and sends professional letters on your behalf.`
  return {
    title,
    description,
    alternates: { canonical: `/construction-leads/${state}/${city}/${suburbSlug}` },
  }
}

export default async function SuburbLeadsPage({ params }: Props) {
  const { suburb: suburbSlug, state, city } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()

  const data = await getLocationData(suburb, stateUpper)

  // noindex thin pages
  const noindex = data.daCount <= 3

  if (noindex && data.daCount === 0) notFound()

  return (
    <div className="bg-zinc-950 text-white">
      {noindex && (
        <meta name="robots" content="noindex" />
      )}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-600 mb-6">
          <Link href="/" className="hover:text-zinc-400">Roweo</Link>
          <span className="mx-2">›</span>
          <Link href={`/construction-leads/${state}/${city}`} className="hover:text-zinc-400">
            {capitalize(city)}, {stateUpper}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">{suburb}</span>
        </nav>

        <h1 className="text-3xl font-semibold mb-4">
          Construction Leads in {suburb}, {stateUpper}
        </h1>
        <p className="text-zinc-400 text-lg mb-10">
          {data.daCount > 0
            ? `${data.daCount} development applications on record in ${suburb} — ${data.daCount30d} lodged in the last 30 days.`
            : `Find homeowners planning construction projects in ${suburb}, ${stateUpper}.`}
        </p>

        {/* Stats bar */}
        {data.daCount > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.daCount}</p>
              <p className="text-xs text-zinc-500 mt-1">Total DAs on record</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.daCount30d}</p>
              <p className="text-xs text-zinc-500 mt-1">Lodged in last 30 days</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.topProjectTypes[0]?.type ? PROJECT_TYPE_LABELS[data.topProjectTypes[0].type] : '—'}</p>
              <p className="text-xs text-zinc-500 mt-1">Most common project type</p>
            </div>
          </div>
        )}

        {/* Recent DAs */}
        {data.recentDas.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-4">Recent development applications in {suburb}</h2>
            <div className="bg-white/3 border border-white/5 rounded-xl divide-y divide-white/5">
              {data.recentDas.map((da, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">
                        {PROJECT_TYPE_LABELS[da.project_type] ?? da.project_type}
                      </span>
                      <p className="text-sm mt-1.5 text-zinc-300">{da.description?.slice(0, 120)}{(da.description?.length ?? 0) > 120 ? '…' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-600">{da.lodged_date}</p>
                      {da.estimated_value_aud && (
                        <p className="text-sm text-zinc-400 mt-0.5">${(da.estimated_value_aud / 1000).toFixed(0)}k</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-700 mt-2">DA data sourced from NSW Planning Portal under CC BY 4.0. No homeowner personal details displayed.</p>
          </section>
        )}

        {/* CTA */}
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-8 mb-12">
          <h2 className="text-xl font-semibold mb-3">
            Get matched to construction leads in {suburb}
          </h2>
          <p className="text-zinc-400 mb-6">
            Set your service area to include {suburb} and Roweo will match you to every new DA that comes in.
            We print and post a professional letter to the property on your behalf within 2 business days.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Start free trial — $299/month
          </Link>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-6">Construction leads in {suburb} — FAQ</h2>
          <div className="space-y-5">
            {[
              {
                q: `How many construction leads are available in ${suburb}?`,
                a: `There are ${data.daCount} development applications on record in ${suburb}, with ${data.daCount30d} lodged in the last 30 days. This includes renovations, extensions, new dwellings, granny flats, and pool projects.`,
              },
              {
                q: `What types of projects are being approved in ${suburb}?`,
                a: data.topProjectTypes.length > 0
                  ? `The most common project types in ${suburb} are: ${data.topProjectTypes.map(t => PROJECT_TYPE_LABELS[t.type]).join(', ')}.`
                  : `${suburb} sees a mix of residential development application types including extensions, renovations, and new dwellings.`,
              },
              {
                q: `How does Roweo find construction leads in ${suburb}?`,
                a: `We ingest development application data directly from the NSW Planning Portal every 6 hours. When a homeowner in ${suburb} lodges a DA, we classify it, match it to your service preferences, and send a letter to the property within 2 business days.`,
              },
              {
                q: `Do I need to be a licensed builder to use Roweo?`,
                a: `Yes — all letters display your builder's licence number as required by Australian Consumer Law. Your licence number is set during onboarding.`,
              },
              {
                q: `What is a development application (DA)?`,
                a: `A development application is a formal request submitted by a homeowner to their local council for approval to build, extend, or renovate their property. In NSW, DAs are publicly available on the NSW Planning Portal.`,
              },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-medium mb-1.5">{faq.q}</h3>
                <p className="text-sm text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby suburbs */}
        {data.nearbySuburbs.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Nearby suburb leads</h2>
            <div className="flex flex-wrap gap-2">
              {data.nearbySuburbs.map(s => (
                <Link
                  key={s.name}
                  href={`/construction-leads/${s.state.toLowerCase()}/${city}/${s.slug}`}
                  className="text-xs border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-full transition-colors text-zinc-400 hover:text-white"
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
