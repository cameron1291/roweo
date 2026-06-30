import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — DA Leads for Australian Builders from $149/month',
  description: 'Starter from $149/month. Professional with 20 letters/month from $199/month. Growth with expanded search radius from $249/month. No contracts.',
}

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 149,
    description: 'Find leads and manage your own outreach.',
    letters: null,
    highlighted: false,
    features: [
      'DA matches in your service area, updated daily',
      'Builder dashboard — leads, filters, saved searches',
      'NSW + ACT DA data',
      'Email notifications on new matches',
      'Analytics — match volume and suburb trends',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 199,
    description: 'The plan most builders choose.',
    letters: 20,
    highlighted: true,
    features: [
      'Everything in Starter',
      '20 personalised letters posted per month',
      'Professional branded letters (your logo, colours)',
      'QR tracking — know when homeowners scan',
      'Dedicated homeowner landing page with quote form',
      'Instant scan notifications',
      'ROI dashboard — track enquiries, quotes, jobs won',
      'Letters printed and posted within 2 business days',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 249,
    description: 'For builders covering multiple suburbs.',
    letters: 20,
    highlighted: false,
    features: [
      'Everything in Professional',
      'Expanded search radius (50 km vs 20 km)',
      'Priority matching on high-value DAs',
      '20 personalised letters per month included',
    ],
  },
]

const LETTER_PACKS = [
  { qty: 20, price: 59 },
  { qty: 50, price: 129 },
  { qty: 100, price: 239 },
]

export default function PricingPage() {
  return (
    <>
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-500 mb-12 max-w-xl mx-auto">
          No per-letter fees on your subscription. No demo call to see prices. No contracts.
        </p>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 text-left">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`relative rounded-xl p-7 border ${
                plan.highlighted
                  ? 'border-[#1B2A4A] shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1B2A4A] text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  Most popular
                </div>
              )}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-[#1B2A4A]">${plan.price}</span>
                <span className="text-gray-400 mb-1.5 text-sm">/month AUD</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{plan.description}</p>
              {plan.letters ? (
                <p className="text-sm text-blue-600 font-semibold mb-6">{plan.letters} letters/month included</p>
              ) : (
                <p className="text-sm text-gray-300 mb-6">No letters included</p>
              )}
              <ul className="space-y-2.5 text-sm mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[#1B2A4A] mt-0.5 shrink-0 font-bold">✓</span>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${plan.key}`}
                className={`block text-center font-semibold py-2.5 rounded-lg transition-colors ${
                  plan.highlighted
                    ? 'bg-[#1B2A4A] hover:bg-[#243660] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        {/* Letter packs */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 mb-16 text-left">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Need more letters?</h2>
          <p className="text-gray-500 text-sm mb-6">
            Top up your monthly quota any time. One-time purchase, added to your account instantly.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {LETTER_PACKS.map(pack => (
              <div key={pack.qty} className="bg-white rounded-xl p-5 border border-gray-200 text-center">
                <p className="text-2xl font-bold text-[#1B2A4A] mb-1">{pack.qty}</p>
                <p className="text-xs text-gray-400 mb-3">additional letters</p>
                <p className="font-bold text-blue-600">${pack.price}</p>
                <p className="text-xs text-gray-400 mt-0.5">one-time</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Letter packs require an active Professional or Growth subscription.</p>
        </div>

        {/* FAQs */}
        <div className="text-left">
          <h2 className="text-xl font-bold text-[#1B2A4A] mb-8">Common questions</h2>
          <div className="space-y-7">
            {[
              {
                q: 'What counts as a letter?',
                a: 'Each personalised letter we print and post to a homeowner uses one letter from your monthly quota. Starter plan doesn\'t include letters — you use the lead data to do your own outreach.',
              },
              {
                q: 'What if I use all my letters before the month is up?',
                a: 'Buy a letter pack to top up instantly. Packs don\'t expire. You can also upgrade to Growth if you\'re consistently sending more than 20 letters a month.',
              },
              {
                q: 'Who prints and posts the letters?',
                a: 'We do. You approve your letter template once during setup. After that, every new DA match gets a letter printed and posted to the homeowner within 2 business days.',
              },
              {
                q: 'What states do you cover?',
                a: 'Currently NSW and ACT. Victoria and Queensland are coming in Q4 2026.',
              },
              {
                q: 'What\'s the difference between Professional and Growth?',
                a: 'Growth adds a 50 km search radius (vs 20 km on Professional) and priority matching on high-value DAs. Good for builders covering multiple suburbs or in regional areas with fewer DAs nearby.',
              },
              {
                q: 'Can I cancel at any time?',
                a: 'Yes. Cancel through your billing settings. You keep access until the end of your billing period. No lock-in, no cancellation fees.',
              },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
