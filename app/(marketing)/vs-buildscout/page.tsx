import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Roweo vs Buildscout — Which is Better for Australian Builders?',
  description: 'Buildscout charges per letter and requires a demo call to see pricing. Roweo is flat monthly, fully self-serve, and built specifically for Australian councils and suburbs.',
}

function Row({ feature, roweo, buildscout, roweoGood = true }: { feature: string; roweo: string; buildscout: string; roweoGood?: boolean }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3.5 pr-6 text-sm text-gray-600">{feature}</td>
      <td className="py-3.5 pr-6 text-sm font-medium text-[#1B2A4A]">{roweo}</td>
      <td className="py-3.5 text-sm text-gray-400">{buildscout}</td>
    </tr>
  )
}

export default function VsBuildscoutPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-4">Roweo vs Buildscout</h1>
        <p className="text-gray-500 mb-12 text-lg">
          An honest look at how the two products compare for Australian builders.
        </p>

        <div className="overflow-x-auto mb-12">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pr-6 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/3"></th>
                <th className="text-left py-3 pr-6 text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider">Roweo</th>
                <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Buildscout</th>
              </tr>
            </thead>
            <tbody>
              <Row feature="Pricing model" roweo="Monthly subscription from $149 — letters included in plan" buildscout="Per letter: $1.60–$2.00 each + postage, on top of a subscription" />
              <Row feature="200 letters — total cost" roweo="From $199/month (Professional plan includes 20 letters + letter packs available)" buildscout="$320–$400 in letter fees alone, plus the subscription fee" />
              <Row feature="Pricing transparency" roweo="Shown upfront on the website, no call needed" buildscout="Hidden — you have to book a demo call to see prices" />
              <Row feature="Built for Australia" roweo="Australian councils, Australian suburb names, Australian compliance" buildscout="International product — Australian coverage is newer" />
              <Row feature="Self-serve signup" roweo="Live in 20 minutes, no sales call required" buildscout="Requires a dedicated CSM and demo call before you can start" />
              <Row feature="QR landing page" roweo="Dedicated tracked page with quote form — you know who scanned it" buildscout="QR points to your own website — no tracking, no quote form" />
              <Row feature="Sign up without a demo" roweo="Yes — fully self-serve, live in 20 minutes" buildscout="No — requires a dedicated CSM and demo call first" />
              <Row feature="ROI tracking" roweo="Log enquiries, quotes, jobs won. See revenue from letters." buildscout="None" />
              <Row feature="Suburb SEO pages" roweo="15,000+ programmatic suburb pages with live DA data" buildscout="No suburb pages — only manual blog posts for city keywords" />
              <Row feature="Multi-stage campaigns" roweo="Letters at lodgement and again at DA approval" buildscout="Multi-stage available" />
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-7 mb-10">
          <h2 className="font-bold text-gray-900 mb-3">Where Buildscout does well</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Buildscout has been around since 2020 and has a map-based area drawing tool (we use suburb selection).
            They offer a postcard option and multi-stage campaigns. If you want to draw a custom polygon on a map
            rather than pick suburbs, they have that. For most builders though, suburb selection is simpler and works just as well.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/signup"
            className="inline-block bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-9 py-4 rounded-lg transition-colors"
          >
            Get started with Roweo — from $149/month
          </Link>
          <p className="text-sm text-gray-400 mt-3">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
