import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Roweo vs Buildscout — Honest Comparison for Australian Builders',
  description: 'Compare Roweo and Buildscout for Australian construction leads. Transparent pricing, Australian-first design, flat monthly fee vs per-letter pricing.',
}

function Row({ feature, roweo, buildscout }: { feature: string; roweo: string; buildscout: string }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-3 pr-6 text-sm text-zinc-300">{feature}</td>
      <td className="py-3 pr-6 text-sm font-medium text-blue-400">{roweo}</td>
      <td className="py-3 text-sm text-zinc-500">{buildscout}</td>
    </tr>
  )
}

export default function VsBuildscoutPage() {
  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-semibold mb-4">Roweo vs Buildscout</h1>
        <p className="text-zinc-400 mb-12">
          An honest comparison. We think Roweo is the better product for Australian builders — here&apos;s why.
        </p>

        <div className="overflow-x-auto mb-12">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 pr-6 text-xs font-medium text-zinc-500 uppercase tracking-widest"></th>
                <th className="text-left py-3 pr-6 text-xs font-medium text-blue-400 uppercase tracking-widest">Roweo</th>
                <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-widest">Buildscout</th>
              </tr>
            </thead>
            <tbody>
              <Row feature="Pricing model" roweo="$299/month flat — unlimited letters" buildscout="$1.60–$2.00 per letter + postage" />
              <Row feature="Price transparency" roweo="Shown upfront on website" buildscout="Hidden — requires booking a demo call" />
              <Row feature="QR landing page" roweo="Dedicated /scan/[token] page with quote form and scan tracking" buildscout="QR goes to your own website (generic, untracked)" />
              <Row feature="Australian identity" roweo="Built in Australia for Australian councils and builders" buildscout="UK product (Searchland Group) bolted onto .com.au" />
              <Row feature="Australian testimonials" roweo="Australian builders from launch" buildscout="UK testimonials only — no Australian customers" />
              <Row feature="Demo without sales call" roweo="Public /demo with live NSW DA data — no login required" buildscout="Requires booking a demo call to see anything" />
              <Row feature="Onboarding" roweo="Self-serve in 20 minutes" buildscout="Dedicated CSM required (days of delay)" />
              <Row feature="ROI tracking" roweo="Log enquiries, quotes, jobs won. See $ generated from letters." buildscout="None" />
              <Row feature="Suburb SEO pages" roweo="15,000+ programmatic suburb pages with live DA data" buildscout="Zero suburb pages — manual blog posts only" />
              <Row feature="Multi-stage campaigns" roweo="Letters at lodgement + letters at approval stage" buildscout="Multi-stage campaigns available" />
              <Row feature="Letter cost example (200 letters)" roweo="$299 total" buildscout="$320–$400 letters + postage on top of subscription" />
            </tbody>
          </table>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="font-semibold mb-3">Where Buildscout is ahead</h2>
          <p className="text-sm text-zinc-400 mb-3">
            In the spirit of honesty: Buildscout has been operating since 2020 and has more UK builder testimonials.
            They offer a map-based area drawing tool (we use suburb text selection). They have a postcard option
            and some council integrations we don&apos;t have yet.
          </p>
          <p className="text-sm text-zinc-400">
            That said, they have zero Australian customers, require a sales call to see pricing, charge per-letter,
            and their QR code just goes to your own website — not a dedicated tracked landing page.
            For Australian builders in 2026, we&apos;re the better product.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-4 rounded-lg transition-colors"
          >
            Try Roweo — $299/month, no demo call required
          </Link>
        </div>
      </div>
    </div>
  )
}
