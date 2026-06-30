import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Construction Leads for Sydney Builders — Development Application Alerts | Roweo',
  description: 'Get matched to homeowners who have lodged development applications in your area. Roweo sends a professional letter on your behalf and tracks who responds. From $149/month.',
}

async function getLiveDaCount() {
  try {
    const supabase = createServiceClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { count } = await supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'NSW')
      .gte('lodged_date', thirtyDaysAgo)
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function HomePage() {
  const daCount = await getLiveDaCount()
  const displayCount = daCount > 0 ? daCount.toLocaleString() : '200+'

  return (
    <>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          {displayCount} development applications lodged in Greater Sydney in the last 30 days
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-[#1B2A4A] leading-tight tracking-tight">
          Get to homeowners before<br className="hidden md:block" /> they start calling builders
        </h1>

        <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          When someone lodges a development application in your area, Roweo posts a professional letter
          to their door with your details and a QR code. You find out who responds and can be first to quote.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Link
            href="/signup"
            className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-7 py-3.5 rounded-lg transition-colors w-full sm:w-auto text-center"
          >
            Start from $149/month
          </Link>
          <Link
            href="/demo"
            className="text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-7 py-3.5 rounded-lg transition-colors w-full sm:w-auto text-center font-medium"
          >
            See live demo →
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">No contracts. Cancel any time. Letters posted within 2 business days.</p>
      </section>

      {/* Stats strip */}
      <section className="bg-gray-50 border-y border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-[#1B2A4A]">From $149</p>
            <p className="text-sm text-gray-500 mt-1">per month, flat rate</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1B2A4A]">2 days</p>
            <p className="text-sm text-gray-500 mt-1">from DA to letter in the post</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1B2A4A]">NSW + ACT</p>
            <p className="text-sm text-gray-500 mt-1">live DA data, updated daily</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-[#1B2A4A] text-center mb-3">How it works</h2>
        <p className="text-gray-500 text-center mb-14 max-w-xl mx-auto">From DA lodgement to letter in the homeowner's mailbox in two business days.</p>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            {
              n: '1',
              title: 'DA lodged at council',
              body: 'A homeowner in your area submits a development application — renovation, extension, new build, or granny flat.',
            },
            {
              n: '2',
              title: 'Matched to you',
              body: 'We classify the project type and match it to your service suburbs, project preferences, and value range.',
            },
            {
              n: '3',
              title: 'Letter posted',
              body: 'A professional letter with your logo, contact details, and a QR code goes to the property within 2 business days.',
            },
            {
              n: '4',
              title: 'You get notified',
              body: 'When they scan the QR you get an instant notification. They see your landing page and can request a quote directly.',
            },
          ].map(step => (
            <div key={step.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#1B2A4A] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                {step.n}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1B2A4A] text-center mb-14">Everything you need to win the job first</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Real DA data, updated daily',
                body: 'Every development application lodged at NSW and ACT councils, classified by project type and matched to your service area. You see exactly what\'s being planned near you.',
              },
              {
                title: 'Professional branded letters',
                body: 'Your logo, your colours, your phone number. We print and post the letter within 2 business days. No printing, no trips to the post office.',
              },
              {
                title: 'QR tracking — know who\'s interested',
                body: 'Every letter has a unique QR code. You know exactly who scanned it, which suburb, and when. No more posting into a void.',
              },
              {
                title: 'Instant quote requests',
                body: 'Homeowners can request a quote directly from the landing page. You get their name, number, and what they\'re planning — straight to your inbox.',
              },
              {
                title: 'ROI dashboard',
                body: 'Log the enquiries, quotes, and jobs won from your letters. See exactly how much revenue your Roweo subscription has generated.',
              },
              {
                title: 'Fully self-serve',
                body: 'Set up in 20 minutes. No demo call. No dedicated CSM. No lock-in. Approve your letter template, connect your service suburbs, and you\'re live.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vs Buildscout teaser */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-[#1B2A4A] rounded-2xl p-10 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-4">Built for Australian builders, not adapted from the UK</h2>
              <ul className="space-y-2.5 text-sm text-blue-200">
                {[
                  'Flat monthly fee — not $2 per letter like Buildscout',
                  'Dedicated QR landing page with quote form (not just your website URL)',
                  'ROI tracking — see the jobs and revenue your letters generated',
                  'No demo call to see pricing or sign up',
                  'Australian councils, Australian suburb names, Australian compliance',
                ].map(point => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0">
              <Link
                href="/vs-buildscout"
                className="inline-block text-sm border border-white/30 hover:border-white/60 text-white px-5 py-2.5 rounded-lg transition-colors"
              >
                Full comparison →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 border-t border-gray-100 py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1B2A4A] mb-4">Your next job is already at council</h2>
          <p className="text-gray-500 mb-8">Set up in 20 minutes. First DA match within 24 hours. First letter posted within 2 business days.</p>
          <Link
            href="/signup"
            className="inline-block bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-10 py-4 rounded-lg transition-colors text-lg"
          >
            Get started from $149/month
          </Link>
          <p className="text-sm text-gray-400 mt-4">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
