import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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

  return (
    <div className="bg-zinc-950 text-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-8">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          {daCount > 0 ? `${daCount.toLocaleString()} DAs lodged in Sydney in the last 30 days` : 'Live DA data from NSW Planning Portal'}
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Find Sydney builders&apos; next jobs<br />
          <span className="text-blue-400">before anyone else does</span>
        </h1>

        <p className="text-zinc-400 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
          We match you to homeowners who have lodged development applications in your service area
          and send professional letters on your behalf — with QR tracking so you know exactly who&apos;s interested.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full sm:w-auto text-center"
          >
            Start free trial — $299/month
          </Link>
          <Link
            href="/demo"
            className="text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 px-6 py-3 rounded-lg transition-colors w-full sm:w-auto text-center"
          >
            See live demo →
          </Link>
        </div>
        <p className="text-xs text-zinc-600 mt-4">No contracts. Cancel any time. Letters posted within 2 business days.</p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-semibold text-center mb-12">How Roweo works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { n: '1', title: 'DA lodged', body: 'A homeowner in your service area lodges a development application at council.' },
            { n: '2', title: 'You get matched', body: 'We detect the DA, classify the project type, and match it to your service area preferences.' },
            { n: '3', title: 'Letter sent', body: 'A professional, branded letter with your logo goes to the property address — automatically or with your approval.' },
            { n: '4', title: 'Homeowner scans', body: 'The QR code takes them to your personalised landing page. You get an instant notification and a quote request.' },
          ].map(step => (
            <div key={step.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center mx-auto mb-4">
                {step.n}
              </div>
              <h3 className="font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="bg-white/3 border-y border-white/5 py-12">
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-semibold text-white">$299/mo</p>
            <p className="text-sm text-zinc-500 mt-1">Flat rate — no per-letter fees</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-white">2 days</p>
            <p className="text-sm text-zinc-500 mt-1">From DA lodgement to letter in the post</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-white">NSW + ACT</p>
            <p className="text-sm text-zinc-500 mt-1">Live DA data, updated daily</p>
          </div>
        </div>
      </section>

      {/* Vs Buildscout teaser */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white/3 border border-white/5 rounded-xl p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Built specifically for Australian builders</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>✓ Flat $299/month — not $2 per letter like Buildscout</li>
                <li>✓ Dedicated QR landing page with quote form (not just your website)</li>
                <li>✓ ROI tracking — see revenue generated by your letters</li>
                <li>✓ Fully self-serve — no demo call to see pricing</li>
                <li>✓ Australian councils, Australian suburb names, Australian compliance</li>
              </ul>
            </div>
            <div className="shrink-0">
              <Link
                href="/vs-buildscout"
                className="inline-block text-sm border border-white/10 hover:border-white/30 px-5 py-2.5 rounded-lg transition-colors"
              >
                Full comparison →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold mb-4">Ready to find your next job?</h2>
        <p className="text-zinc-400 mb-8">Set up in 20 minutes. First letter in the post within 2 business days.</p>
        <Link
          href="/signup"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Start free trial
        </Link>
        <p className="text-xs text-zinc-600 mt-4">$299/month AUD. No contracts. Cancel any time.</p>
      </section>
    </div>
  )
}
