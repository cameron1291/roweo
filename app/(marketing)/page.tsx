import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Roweo — Development Intelligence for Australian Builders',
  description: 'Get matched to homeowners who have lodged development applications in your area. Roweo sends a professional letter on your behalf and tracks who responds. From $149/month.',
  openGraph: {
    title: 'Your next job is already at council. | Roweo',
    description: 'Roweo matches Australian builders to homeowners who have just lodged a DA — and posts a branded letter to their door before a single quote has been requested.',
    siteName: 'Roweo',
    type: 'website',
  },
}

async function getLiveDaCount() {
  try {
    const supabase = createServiceClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { count } = await supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .gte('lodged_date', thirtyDaysAgo)
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function HomePage() {
  const daCount = await getLiveDaCount()
  const displayCount = daCount > 0 ? daCount.toLocaleString() : '300+'

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/daniel-mccullough-HtBlQdxfG9k-unsplash.jpg"
          alt="Builder reviewing construction plans"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Overlay: navy with slight gradient to let image breathe */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B2A4A]/90 via-[#1B2A4A]/75 to-[#1B2A4A]/50" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 bg-blue-500/15 border border-blue-400/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              {displayCount} DAs lodged across Australia in the last 30 days
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
              Your next job is<br />already at council.
            </h1>

            <p className="text-lg md:text-xl text-blue-100/80 mt-6 leading-relaxed max-w-xl">
              Roweo monitors new Development Applications, matches them to your service area, and posts branded letters to homeowners before they start calling builders.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mt-10">
              <Link
                href="/signup"
                className="bg-white hover:bg-blue-50 text-[#1B2A4A] font-bold px-8 py-4 rounded-lg transition-colors text-base shadow-lg"
              >
                Start from $149/month
              </Link>
              <Link
                href="/demo"
                className="text-white hover:text-blue-200 border border-white/30 hover:border-white/50 px-8 py-4 rounded-lg transition-colors text-base font-medium"
              >
                See live demo →
              </Link>
            </div>

            <p className="text-sm text-blue-200/50 mt-5">No contracts. Cancel any time. Letters posted within 2 business days.</p>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: displayCount, label: 'DAs matched in last 30 days' },
              { value: '2 days', label: 'DA lodged to letter in the post' },
              { value: 'From $149', label: 'Monthly plans, no lock-in' },
              { value: 'NSW & ACT', label: 'VIC & QLD coming soon' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-[#1B2A4A]">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B2A4A]">From DA lodgement to letter in two days</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">No cold calling. No chasing referrals. Just a steady stream of warm leads from homeowners who are actively planning a project.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Steps */}
          <div className="space-y-8">
            {[
              {
                n: '01',
                title: 'Homeowner lodges a DA at council',
                body: 'Someone in your service area submits a development application — a renovation, extension, new build, or granny flat. This is a legally lodged document: the project is real, planned, and moving through council.',
              },
              {
                n: '02',
                title: 'We match it to your account',
                body: 'Roweo classifies the project type and matches it to your service suburbs, project preferences, and minimum value threshold. Only relevant leads reach you. Currently covering NSW and ACT — VIC and QLD launching soon.',
              },
              {
                n: '03',
                title: 'A branded letter goes to the door',
                body: 'Your logo, your phone number, your message. We print and post the letter within 2 business days. No printing, no post office, no effort on your end.',
              },
              {
                n: '04',
                title: 'You find out who\'s interested',
                body: 'Every letter has a unique QR code. When the homeowner scans it, you get an instant notification. They land on your profile page and can request a quote in under 2 minutes.',
              },
            ].map(step => (
              <div key={step.n} className="flex gap-5">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#1B2A4A] text-white text-xs font-bold flex items-center justify-center">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] shadow-2xl">
            <Image
              src="/images/ej-yao-D46mXLsQRJw-unsplash.jpg"
              alt="Construction cranes at dusk"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-white font-semibold text-lg">First builder to the door wins the quote.</p>
              <p className="text-blue-200/70 text-sm mt-1">Roweo gets you there before your competitors even know the job exists.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DARK SECTION WITH CONSTRUCTION IMAGE ─────────────────── */}
      <section className="relative overflow-hidden py-24">
        <Image
          src="/images/danist-soh-8Gg2Ne_uTcM-unsplash.jpg"
          alt="Construction site with cranes"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1B2A4A]/85" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-3">Why Roweo works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Built for builders who want to win work — not chase it</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Physical mail cuts through',
                body: 'A letter to the door has no spam filter, no algorithm, and no competition. It sits on the bench until they\'re ready to call. Digital ads don\'t do that.',
              },
              {
                title: 'DA data means intent is real',
                body: 'These aren\'t people browsing renovation ideas on Pinterest. A DA is a lodged document with council. The project is real, planned, and moving through council.',
              },
              {
                title: 'QR tracking shows you who\'s warm',
                body: 'Every letter has a unique QR code. When the homeowner scans it, you\'re notified instantly. You know exactly who responded, which suburb, and when.',
              },
              {
                title: 'Monthly allowance, predictable ROI',
                body: 'Your plan includes a set number of letters per month. Top up with extra packs if you need more. No surprise bills, no per-lead fees.',
              },
              {
                title: 'Self-serve in 20 minutes',
                body: 'No demo call, no salesperson, no waiting. Sign up, set your suburbs and project types, approve your letter template, and you\'re live.',
              },
              {
                title: 'ROI tracking built in',
                body: 'Log the enquiries, quotes, and jobs won from your letters. See the revenue Roweo has generated for your business — the number that keeps the subscription running.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-blue-200/60 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES DETAIL ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xl order-2 md:order-1">
            <Image
              src="/images/sven-mieke-fteR0e2BzKo-unsplash.jpg"
              alt="Architectural blueprints"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B2A4A]/40 to-transparent" />
          </div>

          {/* Text */}
          <div className="order-1 md:order-2">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Real DA data</p>
            <h2 className="text-3xl font-bold text-[#1B2A4A] mb-6">Every development application lodged in your area</h2>
            <div className="space-y-5">
              {[
                { title: 'Updated daily — NSW and ACT live', body: 'DA data from NSW and ACT government planning portals, ingested daily. Victoria and Queensland launching soon.' },
                { title: 'Classified by project type', body: 'Extensions, renovations, new dwellings, granny flats, pools. We filter out the projects you don\'t want and surface only the ones you do.' },
                { title: 'Matched to your suburbs', body: 'Set exactly which suburbs and postcodes you service. We only show you DAs in your work area, at or above your minimum project value.' },
                { title: 'Automatic — no manual work', body: 'Once set up, Roweo runs itself. New DAs matched → letter generated → posted. You just check your notifications.' },
              ].map(f => (
                <div key={f.title} className="flex gap-3">
                  <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#1B2A4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ───────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Why Roweo</p>
            <h2 className="text-3xl font-bold text-[#1B2A4A]">A smarter way to win residential work</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Without Roweo</p>
              <div className="space-y-4">
                {[
                  'Chase referrals and hope the phone rings',
                  'Spend hours on Facebook groups and Hipages',
                  'Compete on price with 10 other builders who saw the same ad',
                  'Find out about the job after the homeowner has already started calling',
                  'No way to know which marketing is actually working',
                ].map(p => (
                  <div key={p} className="flex gap-3 text-sm text-gray-500">
                    <span className="text-red-400 shrink-0 font-bold mt-0.5">✕</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1B2A4A] rounded-2xl p-8 text-white">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-6">With Roweo</p>
              <div className="space-y-4">
                {[
                  'Letter arrives before the homeowner has called anyone',
                  'Monthly letter allowance — extra packs available, no surprise bills',
                  'Know exactly who scanned your letter and when',
                  'Professional branded letter does the selling for you',
                  'ROI dashboard shows revenue generated from each letter',
                ].map(p => (
                  <div key={p} className="flex gap-3 text-sm text-blue-100/80">
                    <span className="text-blue-400 shrink-0 font-bold mt-0.5">✓</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA WITH IMAGE ─────────────────────────────────── */}
      <section className="relative overflow-hidden py-32">
        <Image
          src="/images/c-dustin-91AQt9p4Mo8-unsplash.jpg"
          alt="Construction site"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B2A4A]/80 via-[#1B2A4A]/80 to-[#1B2A4A]/90" />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Your next job is already at council.
          </h2>
          <p className="text-blue-200/70 mt-6 text-lg">
            Set up in 20 minutes. First DA match within 24 hours. First letter posted within 2 business days.
          </p>
          <Link
            href="/signup"
            className="inline-block mt-10 bg-white hover:bg-blue-50 text-[#1B2A4A] font-bold px-10 py-4 rounded-lg transition-colors text-lg shadow-xl"
          >
            Get started from $149/month
          </Link>
          <p className="text-sm text-blue-200/40 mt-4">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
