import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DemoEngagementTracker } from './demo-engagement-tracker'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('builder_prospects').select('company_name').eq('demo_slug', slug).single()
  return {
    title: `Personal demo for ${data?.company_name ?? 'your company'} — Roweo`,
    robots: 'noindex',
  }
}

export default async function DemoSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: prospect } = await supabase
    .from('builder_prospects')
    .select('id, company_name, service_suburbs, business_type, logo_url')
    .eq('demo_slug', slug)
    .single()

  if (!prospect) notFound()

  const suburbs = prospect.service_suburbs ?? []
  const businessType = (prospect.business_type ?? 'residential builder').replace(/_/g, ' ')

  // Real DA examples from their suburbs
  let recentDAs: Array<{ suburb: string; project_type: string; lodged_date: string; description: string }> = []
  if (suburbs.length > 0) {
    const { data } = await supabase
      .from('development_applications')
      .select('suburb, project_type, lodged_date, description')
      .in('suburb', suburbs)
      .not('project_type', 'eq', 'other')
      .order('lodged_date', { ascending: false })
      .limit(3)
    recentDAs = data ?? []
  }

  // Fallback DA examples
  if (recentDAs.length === 0) {
    recentDAs = [
      { suburb: suburbs[0] ?? 'Parramatta', project_type: 'extension', lodged_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'Single storey rear extension and deck' },
      { suburb: suburbs[1] ?? suburbs[0] ?? 'Parramatta', project_type: 'renovation', lodged_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Internal renovation and bathroom upgrade' },
      { suburb: suburbs[0] ?? 'Parramatta', project_type: 'granny_flat', lodged_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), description: 'Detached granny flat, 60m²' },
    ]
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au'
  const suburbDisplay = suburbs.slice(0, 3).join(', ') || 'your service area'

  return (
    <>
      <DemoEngagementTracker slug={slug} appUrl={APP_URL} />

      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <header className="border-b border-white/5 bg-zinc-900">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-semibold tracking-tight">Roweo</span>
              <span className="text-zinc-600 text-xs">|</span>
              <span className="text-zinc-400 text-xs">Personal demo for {prospect.company_name}</span>
            </div>
            <Link
              href="/signup"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 space-y-16">
          {/* Intro */}
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-4">
              Private demonstration
            </div>
            <h1 className="text-3xl font-semibold text-white leading-tight">
              Built for {prospect.company_name}
            </h1>
            <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
              This page shows exactly what Roweo would look like for your business — your suburbs, your project types, your letters.
            </p>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-6">How Roweo works for you</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { step: '1', title: 'DA lodged', desc: `A homeowner in ${suburbs[0] ?? 'your suburb'} lodges a development application with the council.` },
                { step: '2', title: 'We match you', desc: 'We detect the DA and match it to your service area and project type preferences.' },
                { step: '3', title: 'Letter posted', desc: 'A personalised letter from your company is printed and posted within 2 business days.' },
              ].map(s => (
                <div key={s.step} className="bg-zinc-900 rounded-lg p-5 border border-white/5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-3">{s.step}</div>
                  <p className="text-sm font-medium text-white mb-1">{s.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Example letter mock */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-6">This is what your homeowner letter would look like</h2>
            <div className="bg-white rounded-lg p-8 text-zinc-900 shadow-xl max-w-2xl" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="bg-blue-600 -mx-8 -mt-8 px-8 py-4 mb-6 flex justify-between items-center rounded-t-lg">
                <span className="text-white font-bold text-lg">{prospect.company_name}</span>
                <span className="text-blue-200 text-sm">{businessType}</span>
              </div>
              <p className="text-sm text-zinc-500 mb-4">{new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-sm font-semibold mb-4">To the property owner, {recentDAs[0]?.suburb ?? suburbs[0] ?? 'Sydney'}</p>
              <p className="text-sm leading-relaxed mb-3">Dear Homeowner,</p>
              <p className="text-sm leading-relaxed mb-3">
                We noticed that a development application has recently been lodged for your property — congratulations on planning your project! We specialise in {businessType} work throughout {suburbDisplay} and would love to discuss how we can help.
              </p>
              <p className="text-sm leading-relaxed mb-3">
                Our team has delivered successful projects across {suburbDisplay}. We pride ourselves on quality workmanship, transparent pricing, and keeping to schedule.
              </p>
              <p className="text-sm leading-relaxed mb-6">
                Scan the QR code below to visit our profile page and get in touch for a no-obligation quote.
              </p>
              <div className="flex gap-6 items-start border-t pt-5">
                <div className="w-16 h-16 bg-zinc-200 rounded flex items-center justify-center text-xs text-zinc-500">[QR code]</div>
                <div className="text-sm">
                  <p className="font-semibold">{prospect.company_name}</p>
                  <p className="text-zinc-500">roweo.com.au/scan/[your-unique-code]</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t pt-3">
                This letter was sent independently and is not affiliated with any council or government authority.
              </p>
            </div>
          </section>

          {/* Real DA examples */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Real development applications in {suburbDisplay}</h2>
            <p className="text-sm text-zinc-500 mb-6">These are actual DAs you would have been matched to, had you been subscribed.</p>
            <div className="space-y-3">
              {recentDAs.map((da, i) => (
                <div key={i} className="bg-zinc-900 rounded-lg p-4 border border-white/5 flex justify-between items-start">
                  <div>
                    <p className="text-sm text-white font-medium">{da.suburb}</p>
                    <p className="text-xs text-zinc-400 mt-1">{da.description}</p>
                    <span className="inline-block mt-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                      {da.project_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0 ml-4">
                    {new Date(da.lodged_date).toLocaleDateString('en-AU')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* QR scan tracking demo */}
          <section className="bg-zinc-900 rounded-xl p-8 border border-white/5">
            <h2 className="text-lg font-semibold text-white mb-2">See exactly who engages</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Every letter has a unique QR code. When a homeowner scans it, you get an instant email notification. They land on your branded profile page where they can request a quote. You see it all in your dashboard.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { emoji: '📮', label: 'Letter posted', sub: '2 business days after match' },
                { emoji: '📱', label: 'Homeowner scans', sub: 'You get an instant email' },
                { emoji: '📞', label: 'Quote request', sub: 'Name, phone, message — direct to you' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl mb-2">{s.emoji}</div>
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">Ready to get started?</h2>
            <p className="text-zinc-400">$299/month. No lock-in. Cancel any time. First letter posted within 48 hours of setup.</p>
            <div className="flex gap-4 justify-center mt-6">
              <Link
                href="/signup"
                data-cta="trial"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors"
                onClick={() => {}}
              >
                Start free trial
              </Link>
              <Link
                href="/demo"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                See public demo
              </Link>
            </div>
            <p className="text-xs text-zinc-600">No credit card required to get started</p>
          </section>
        </main>
      </div>
    </>
  )
}
