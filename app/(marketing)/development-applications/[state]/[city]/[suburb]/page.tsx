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
  const { suburb: suburbSlug, state } = await params
  const suburb = capitalize(suburbSlug)
  const stateUpper = state.toUpperCase()
  return {
    title: `Development Applications in ${suburb}, ${stateUpper} — Recent DAs`,
    description: `Browse recent development applications lodged in ${suburb}, ${stateUpper}. See project types, lodgement dates, and how to connect with homeowners planning projects.`,
    alternates: { canonical: `/development-applications/${state}/${capitalize(suburbSlug).toLowerCase()}/${suburbSlug}` },
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
    <div className="bg-zinc-950 text-white">
      {noindex && <meta name="robots" content="noindex" />}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <nav className="text-xs text-zinc-600 mb-6">
          <Link href="/" className="hover:text-zinc-400">Roweo</Link>
          <span className="mx-2">›</span>
          <Link href={`/development-applications/${state}/${city}`} className="hover:text-zinc-400">
            {capitalize(city)}, {stateUpper}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">{suburb}</span>
        </nav>

        <h1 className="text-3xl font-semibold mb-4">
          Development Applications in {suburb}, {stateUpper}
        </h1>
        <p className="text-zinc-400 text-lg mb-10">
          {data.daCount} development applications lodged in {suburb} — {data.daCount30d} in the last 30 days.
          Data sourced from the NSW Planning Portal, updated daily.
        </p>

        {data.daCount > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.daCount}</p>
              <p className="text-xs text-zinc-500 mt-1">Total applications</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.daCount30d}</p>
              <p className="text-xs text-zinc-500 mt-1">Last 30 days</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold">{data.topProjectTypes.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Project types lodged</p>
            </div>
          </div>
        )}

        {data.recentDas.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Recent applications in {suburb}</h2>
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
                    <p className="text-xs text-zinc-600 shrink-0">{da.lodged_date}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-700 mt-2">
              Data sourced from NSW Planning Portal under CC BY 4.0. Homeowner personal details are not displayed.
            </p>
          </section>
        )}

        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-8 mb-10">
          <h2 className="font-semibold mb-2">Are you a builder in {suburb}?</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Roweo matches you to every new DA in your service area and posts a professional letter to the property on your behalf.
            $299/month, flat rate.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Start free trial
          </Link>
        </div>

        {data.nearbySuburbs.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Nearby suburbs</h2>
            <div className="flex flex-wrap gap-2">
              {data.nearbySuburbs.map(s => (
                <Link
                  key={s.name}
                  href={`/development-applications/${s.state.toLowerCase()}/${city}/${s.slug}`}
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
