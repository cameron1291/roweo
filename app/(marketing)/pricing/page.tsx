import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — $299/month, flat rate',
  description: 'One simple plan. $299 AUD per month. No per-letter fees. No demo call required to see the price.',
}

export default function PricingPage() {
  return (
    <div className="bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-semibold text-center mb-4">Simple, transparent pricing</h1>
        <p className="text-zinc-400 text-center mb-12">
          One plan. One price. No per-letter fees. No contract.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most popular
          </div>

          <div className="flex items-end gap-1 mb-2">
            <span className="text-5xl font-semibold">$299</span>
            <span className="text-zinc-400 mb-2">/month AUD</span>
          </div>
          <p className="text-zinc-400 text-sm mb-8">Billed monthly. Cancel any time.</p>

          <ul className="space-y-3 text-sm mb-10">
            {[
              'Unlimited DA matches in your service area',
              'Unlimited letters sent per month',
              'Professional branded letter template (your logo, colours)',
              'QR tracking — know when homeowners scan',
              'Dedicated homeowner landing page with quote form',
              'Instant scan notifications via email',
              'ROI dashboard — track enquiries, quotes, jobs won',
              'NSW + ACT DA data, updated daily',
              'Letters printed and posted by Roweo within 2 business days',
              'Letter approval before sending',
              'Cancel any time — no lock-in',
            ].map(f => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="text-blue-400 mt-0.5">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Start free trial
          </Link>
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Are there any limits on how many letters I can send?',
                a: 'No. $299/month gives you unlimited letter sends within your service area. If 50 DAs come in this month, you get 50 letters — no extra cost.',
              },
              {
                q: 'Who prints and posts the letters?',
                a: 'We do, manually. You approve the letter template once during onboarding, then every new match gets a letter posted on your behalf within 2 business days.',
              },
              {
                q: 'What if there are no DAs in my area?',
                a: 'We only charge if there are matches. If we go a full month with no DA matches in your service area, contact us and we\'ll credit your account.',
              },
              {
                q: 'What states do you cover?',
                a: 'Currently NSW and ACT. Victoria, Queensland, and Western Australia are planned for Q4 2026.',
              },
              {
                q: 'Can I cancel at any time?',
                a: 'Yes. Cancel through your billing settings. You keep access until the end of your paid period.',
              },
              {
                q: 'Is this the same as Buildscout?',
                a: 'Buildscout charges per letter ($1.60–$2.00 each, plus postage). If you send 200 letters, you pay $400+ on top of a subscription. We charge one flat rate regardless of volume.',
              },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-medium mb-1.5">{faq.q}</h3>
                <p className="text-sm text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
