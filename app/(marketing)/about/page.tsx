import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'About Roweo — DA Lead Alerts for Australian Builders',
  description: 'Roweo was built to give Australian residential builders a competitive edge — matching them to homeowners before a single quote has been requested.',
  openGraph: {
    title: 'About Roweo | Built for builders who are tired of chasing work',
    description: 'We ingest DA data from planning portals across Australia daily, match it to builders, and post a professional letter to the homeowner\'s door within two business days.',
    siteName: 'Roweo',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 bg-[#1B2A4A]">
        <Image
          src="/images/sean-pollock-PhYq704ffdA-unsplash.jpg"
          alt="Commercial buildings"
          fill
          className="object-cover object-center opacity-20"
          sizes="100vw"
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-4">About Roweo</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Built for builders who are tired of chasing work
          </h1>
          <p className="text-blue-200/70 mt-6 text-lg leading-relaxed">
            Roweo gives Australian residential builders a way to reach homeowners before anyone else — using publicly available development application data and professional physical mail.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="prose prose-gray max-w-none">
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6">Why we built Roweo</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Every day, hundreds of homeowners across Australia lodge development applications with their local council — for extensions, renovations, new homes, granny flats, and more. These DAs are public documents. They name the property, the project type, and the approximate value. They are the clearest possible signal that someone is ready to spend money on construction.
          </p>
          <p className="text-gray-600 leading-relaxed mb-5">
            And yet most builders never see them. They wait for referrals, compete on Hipages with a dozen other quotes, or spend money on ads that reach people who might be planning something someday. Roweo was built to change that.
          </p>
          <p className="text-gray-600 leading-relaxed mb-5">
            We ingest DA data from planning portals across Australia daily, classify each project by type, match it to builders based on their service area and specialisation, and post a professional branded letter to the homeowner's door within two business days. The homeowner gets a credible, personalised letter from a local builder before they've spoken to anyone. The builder gets a warm lead — with QR tracking to know who responded.
          </p>
          <p className="text-gray-600 leading-relaxed">
            The result: builders who use Roweo are first to the door, first to quote, and win more work at full margin — without cold calling, without ads, and without competing on price in a crowded marketplace.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1B2A4A] text-center mb-12">How we operate</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Transparent pricing',
                body: 'No hidden fees, no per-letter costs, no lock-in. One flat monthly subscription. Cancel any time.',
              },
              {
                title: 'Australian-built, Australian-focused',
                body: 'We use real Australian council DA data, Australian terminology, and Australian building industry knowledge. Not a UK product bolted onto a .com.au domain.',
              },
              {
                title: 'Self-serve by design',
                body: 'No demo call required to see pricing. No sales rep to get through. Set up in 20 minutes and be live the same day.',
              },
            ].map(v => (
              <div key={v.title} className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#1B2A4A] mb-4">Ready to try it?</h2>
        <p className="text-gray-500 mb-8">Set up takes 20 minutes. First lead within 24 hours.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors">
            Get started from $149/month
          </Link>
          <Link href="/demo" className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-8 py-3.5 rounded-lg transition-colors">
            See the demo →
          </Link>
        </div>
      </section>
    </>
  )
}
