import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Roweo vs Buildscout — DA Lead Comparison for Australian Builders',
  description: 'How Roweo compares to Buildscout for Australian residential builders. Transparent pricing, Australian-first data, self-serve setup, and suburb-level SEO Buildscout cannot match.',
  openGraph: {
    title: 'Roweo vs Buildscout | The honest comparison',
    description: 'Flat monthly plans vs per-letter billing. Australian DA data vs UK product. Public pricing vs demo-gated. See how Roweo stacks up.',
    siteName: 'Roweo',
    type: 'website',
  },
}

const ROWS = [
  {
    feature: 'Pricing model',
    roweo: 'Monthly plan with letter allowance included. Extra packs optional.',
    buildscout: 'Per-letter billing. Standard $2.00/letter, Growth $1.80, Pro $1.60. 200 letters = $400.',
    winner: 'roweo',
  },
  {
    feature: 'Pricing transparency',
    roweo: 'Prices shown publicly on /pricing. No sales call required.',
    buildscout: 'Pricing requires booking a demo call. Not visible on their website.',
    winner: 'roweo',
  },
  {
    feature: 'Australian DA data',
    roweo: 'NSW and ACT government planning portals, ingested daily. VIC and QLD launching soon.',
    buildscout: 'UK-based product (part of Searchland Group). Australian coverage is unproven.',
    winner: 'roweo',
  },
  {
    feature: 'Self-serve onboarding',
    roweo: 'Set up in 20 minutes. No demo call, no sales rep, no waiting.',
    buildscout: 'Requires a dedicated CSM to onboard. Not self-serve.',
    winner: 'roweo',
  },
  {
    feature: 'Public demo',
    roweo: 'Live demo at /demo — real DA data, sample letter, no login required.',
    buildscout: 'No public demo. Must book a call to see the product.',
    winner: 'roweo',
  },
  {
    feature: 'QR tracking + landing page',
    roweo: 'Each letter has a unique QR code. Homeowner scans → dedicated landing page → instant builder notification → quote form.',
    buildscout: 'QR links to the builder\'s own website. No dedicated landing page, no scan notification.',
    winner: 'roweo',
  },
  {
    feature: 'ROI tracking',
    roweo: 'Builders log enquiries, quotes, and jobs won. Dashboard shows revenue generated from letters.',
    buildscout: 'No ROI tracking built in.',
    winner: 'roweo',
  },
  {
    feature: 'Suburb-level SEO pages',
    roweo: '15,000+ programmatic suburb, postcode, council, and project-type pages with live DA data.',
    buildscout: 'Blog-only content. No suburb-level pages. Zero long-tail search coverage.',
    winner: 'roweo',
  },
  {
    feature: 'Map-based area drawing',
    roweo: 'Suburb list selection with radius map. Polygon drawing coming soon.',
    buildscout: 'Map polygon drawing for service area selection.',
    winner: 'buildscout',
  },
  {
    feature: 'Multi-stage campaigns',
    roweo: 'Single letter at DA lodgement. Approval-stage letters on the roadmap.',
    buildscout: 'Letters at lodgement and approval — two-touch campaigns.',
    winner: 'buildscout',
  },
  {
    feature: 'Australian identity',
    roweo: 'Built in Australia. Uses Australian council terminology, DA numbering, and planning language.',
    buildscout: 'UK product with UK testimonials. .com.au domain doesn\'t change where the data and team are.',
    winner: 'roweo',
  },
]

export default function VsBuildscoutPage() {
  return (
    <>
      <section className="bg-[#1B2A4A] py-20 px-6 text-center">
        <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-4">Honest comparison</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
          Roweo vs Buildscout
        </h1>
        <p className="text-blue-200/70 text-lg max-w-2xl mx-auto">
          Two products trying to solve the same problem for Australian builders. Here is how they compare — factually, not spin.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 pr-6 text-gray-500 font-semibold w-1/4">Feature</th>
                <th className="text-left py-4 px-4 text-[#1B2A4A] font-bold w-[37.5%]">
                  <span className="flex items-center gap-2">
                    Roweo
                    <span className="text-xs font-normal text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">NSW & ACT live</span>
                  </span>
                </th>
                <th className="text-left py-4 px-4 text-gray-600 font-semibold w-[37.5%]">Buildscout</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                  <td className="py-4 pr-6 font-medium text-gray-700 align-top">{row.feature}</td>
                  <td className={`py-4 px-4 align-top leading-relaxed ${row.winner === 'roweo' ? 'text-gray-900' : 'text-gray-500'}`}>
                    {row.winner === 'roweo' && (
                      <span className="inline-block w-4 h-4 rounded-full bg-green-500/20 text-green-600 text-xs font-bold mr-1.5 text-center leading-4">✓</span>
                    )}
                    {row.roweo}
                  </td>
                  <td className={`py-4 px-4 align-top leading-relaxed ${row.winner === 'buildscout' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {row.winner === 'buildscout' && (
                      <span className="inline-block w-4 h-4 rounded-full bg-green-500/20 text-green-600 text-xs font-bold mr-1.5 text-center leading-4">✓</span>
                    )}
                    {row.buildscout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 p-5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 leading-relaxed">
          <strong className="text-gray-700">A note on fairness:</strong> Buildscout is a legitimate product with real UK customers. We have noted where they have features we are still building (map polygon drawing, multi-stage campaigns). Our advantage is pricing transparency, Australian-first data, self-serve setup, and suburb-level SEO that will compound over time.
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-100 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-8 text-center">Where Roweo wins decisively</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Flat pricing you can plan around',
                body: 'Per-letter billing makes your monthly cost unpredictable. A busy month with 200 letters costs $400 extra with Buildscout. With Roweo, your plan includes letters and the cost doesn\'t change.',
              },
              {
                title: 'Built for how Australians build',
                body: 'Australian DA terminology, Australian council names, Australian postcode system. Not a UK product that\'s been translated for a .com.au domain.',
              },
              {
                title: 'You see everything before you pay',
                body: 'Public pricing. Public demo with live data. No "book a call to see the product." If Roweo isn\'t right for you, you know before you spend a dollar.',
              },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#1B2A4A] mb-4">Try it before you commit to anything</h2>
        <p className="text-gray-500 mb-8">
          See the live demo — real DAs from NSW and ACT, the actual letter homeowners receive, and what you&apos;d see in your dashboard. No login required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/demo" className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors">
            See the live demo
          </Link>
          <Link href="/pricing" className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-8 py-3.5 rounded-lg transition-colors">
            View pricing →
          </Link>
        </div>
      </section>
    </>
  )
}
