import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import { PROJECT_TYPE_LABELS } from '@/lib/seo/get-location-data'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ postcode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postcode } = await params
  return {
    title: `Builder Leads for Postcode ${postcode} — Find DA Leads`,
    description: `Find homeowners in postcode ${postcode} who have lodged development applications. Roweo matches residential builders to real planning leads.`,
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

  return (
    <div className="bg-zinc-950 text-white">
      {postcodeData.da_count <= 3 && <meta name="robots" content="noindex" />}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-4">
          Builder Leads for Postcode {postcode}, {state}
        </h1>
        <p className="text-zinc-400 text-lg mb-4">
          {postcodeData.da_count} development applications lodged in postcode {postcode}.
          {suburbs.length > 0 && ` Covers ${suburbs.join(', ')}.`}
        </p>

        {das.length > 0 && (
          <div className="bg-white/3 border border-white/5 rounded-xl divide-y divide-white/5 mb-10">
            {das.map((da, i) => (
              <div key={i} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">
                      {PROJECT_TYPE_LABELS[da.project_type] ?? da.project_type}
                    </span>
                    <span className="text-xs text-zinc-600">{da.suburb}</span>
                  </div>
                  <p className="text-sm text-zinc-300">{da.description?.slice(0, 100)}{(da.description?.length ?? 0) > 100 ? '…' : ''}</p>
                </div>
                <p className="text-xs text-zinc-600 shrink-0">{da.lodged_date}</p>
              </div>
            ))}
          </div>
        )}

        {suburbs.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-medium text-zinc-500 mb-3">Suburbs in postcode {postcode}</h2>
            <div className="flex flex-wrap gap-2">
              {suburbs.map((s: string) => (
                <Link
                  key={s}
                  href={`/construction-leads/${state.toLowerCase()}/sydney/${s.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-xs border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-8">
          <h2 className="font-semibold mb-2">Get matched to leads in postcode {postcode}</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Roweo automatically matches you to DAs in your service suburbs and sends professional letters to homeowners. $299/month flat rate.
          </p>
          <Link href="/signup" className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Start free trial
          </Link>
        </div>
      </div>
    </div>
  )
}
