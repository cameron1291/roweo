import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DemoEngagementTracker } from './demo-engagement-tracker'
import { Logo } from '@/components/logo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('builder_prospects').select('company_name').eq('demo_slug', slug).single()
  return {
    title: `Roweo — prepared for ${data?.company_name ?? 'your company'}`,
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
  const BUSINESS_TYPE_LABEL: Record<string, string> = {
    renovation: 'renovation specialist',
    extension: 'extension specialist',
    granny_flat: 'granny flat specialist',
    residential: 'residential builder',
    custom: 'custom home builder',
    knockdown_rebuild: 'knockdown rebuild specialist',
    other: 'local builder',
  }
  const businessType = BUSINESS_TYPE_LABEL[prospect.business_type ?? ''] ?? 'local builder'

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

  if (recentDAs.length === 0) {
    recentDAs = [
      { suburb: suburbs[0] ?? 'Parramatta', project_type: 'extension', lodged_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'Single storey rear extension and deck' },
      { suburb: suburbs[1] ?? suburbs[0] ?? 'Parramatta', project_type: 'renovation', lodged_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Internal renovation and bathroom upgrade' },
      { suburb: suburbs[0] ?? 'Parramatta', project_type: 'granny_flat', lodged_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), description: 'Detached granny flat, 60m²' },
    ]
  }

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au').includes('localhost')
    ? 'https://roweo.com.au'
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://roweo.com.au')

  const suburbDisplay = suburbs.slice(0, 3).join(', ') || 'your service area'
  const suburb1 = suburbs[0] ?? 'your suburb'
  const da = recentDAs[0]

  return (
    <>
      <DemoEngagementTracker slug={slug} appUrl={APP_URL} />

      <div className="min-h-screen bg-gray-50 text-gray-900">

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
            <Logo height={28} href="/" />
            <Link
              href="/signup"
              data-cta="header"
              className="bg-[#1B2A4A] hover:bg-[#243660] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">

          {/* Intro */}
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#3B6FDB] mb-3">Prepared for {prospect.company_name}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] leading-tight mb-4">
              This is the letter a homeowner in {suburb1} receives about your business.
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
              Every time someone lodges a DA in your service area, Roweo posts them a professional letter on your behalf — the week it hits council, before anyone else has knocked on the door.
            </p>
            <Link
              href="/signup"
              data-cta="hero"
              className="inline-flex items-center justify-center bg-[#1B2A4A] hover:bg-[#243660] text-white font-bold text-base px-8 py-4 rounded-lg transition-colors w-full sm:w-auto"
            >
              Start sending letters — from $149/mo
            </Link>
            <p className="text-xs text-gray-400 mt-3">No lock-in · First letters posted within 2 business days</p>
          </div>

          {/* Letter */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-10">

            {/* Letter top bar */}
            <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100">
              {/* Logo placeholder */}
              <div className="border-2 border-dashed border-[#3B6FDB]/30 rounded-lg px-4 py-3 flex items-center gap-2.5 bg-[#3B6FDB]/5">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="1" y="1" width="26" height="26" rx="3" stroke="#3B6FDB" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M14 8l6 5v8H8V13l6-5z" stroke="#3B6FDB" strokeWidth="1.2" fill="none"/>
                </svg>
                <div>
                  <p className="text-xs font-bold text-[#3B6FDB] uppercase tracking-wide leading-none">Your Logo</p>
                  <p className="text-xs text-[#3B6FDB]/60 leading-none mt-0.5">Here</p>
                </div>
              </div>

              {/* Neighbourhood tag */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 mb-0.5">
                  <svg width="11" height="13" viewBox="0 0 11 13" fill="none"><path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5s4.5-5.125 4.5-8.5C10 2.015 7.985 0 5.5 0zm0 6.125A1.625 1.625 0 115.5 2.875a1.625 1.625 0 010 3.25z" fill="#3B6FDB"/></svg>
                  <p className="text-xs font-bold text-[#3B6FDB] uppercase tracking-wider">Your Neighbourhood</p>
                </div>
                <p className="text-xs text-gray-500 leading-snug">Recent Development<br />Application Alert</p>
              </div>
            </div>

            {/* Envelope window address — positioned after header for DL window alignment */}
            <div className="px-6 pt-5 pb-0">
              <div className="text-sm text-[#1B2A4A] leading-relaxed">
                <p>The Property Owner</p>
                <p className="font-medium">{da?.suburb ?? suburb1} NSW</p>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-col sm:flex-row">

              {/* Left — letter body */}
              <div className="flex-1 px-6 py-5">
                <p className="text-sm text-gray-600 mb-3">Hi there,</p>

                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3">
                  We noticed you&apos;re planning<br />something <span className="text-[#3B6FDB]">exciting.</span>
                </h2>
                <div className="w-8 h-0.5 bg-[#3B6FDB] mb-4" />

                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  A Development Application has recently been lodged for your property at:
                </p>

                {/* DA address box */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex gap-3 items-start mb-4">
                  <svg className="mt-0.5 shrink-0" width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M7 0C4.515 0 2.5 2.015 2.5 4.5c0 3.375 4.5 11.5 4.5 11.5s4.5-8.125 4.5-11.5C11.5 2.015 9.485 0 7 0zm0 6.125A1.625 1.625 0 115.375 4.5 1.625 1.625 0 017 6.125z" fill="#3B6FDB"/></svg>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{da?.description ?? 'Residential project, ' + suburb1 + ' NSW'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">DA lodged: <span className="text-[#3B6FDB] font-semibold">{da ? new Date(da.lodged_date).toLocaleDateString('en-AU') : new Date().toLocaleDateString('en-AU')}</span></p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-2">
                  My name is <strong className="text-gray-800">{prospect.company_name}</strong>. We&apos;re a {businessType} based in {suburbDisplay}, and we specialise in exactly the kind of project you&apos;re planning.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  We noticed your DA at council and wanted to reach out early — before your project goes to tender. We know your area well and would love to give you a competitive quote.
                </p>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {[
                    {
                      icon: <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3z" fill="none" stroke="#3B6FDB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>,
                      title: 'Licensed & insured',
                      desc: 'Fully licensed, insured and highly rated by homeowners in the area.',
                    },
                    {
                      icon: <><path d="M8 2L3 4v4c0 3.1 2.1 6 5 7 2.9-1 5-3.9 5-7V4L8 2z" fill="none" stroke="#3B6FDB" strokeWidth="1.4" strokeLinecap="round"/><path d="M6 8l1.5 1.5L10 6" stroke="#3B6FDB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></>,
                      title: 'No-obligation quote',
                      desc: 'We\'ll come out, review your plans and give you a straight quote — no pressure.',
                    },
                    {
                      icon: <><path d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1z" fill="none" stroke="#3B6FDB" strokeWidth="1.4"/><path d="M5 8h6M5 11h3" stroke="#3B6FDB" strokeWidth="1.4" strokeLinecap="round"/></>,
                      title: 'Fast response',
                      desc: 'We reply to all enquiries the same day and can usually meet within the week.',
                    },
                  ].map(f => (
                    <div key={f.title} className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
                      <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center shrink-0 bg-white">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">{f.icon}</svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{f.title}</p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Handwritten note */}
                <div className="mb-4">
                  <p className="text-lg text-[#1B2A4A] mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>A note from us</p>
                  <div className="w-8 h-0.5 bg-[#3B6FDB] mb-3" />
                  <p className="text-sm text-gray-600 leading-relaxed mb-2">
                    We know that getting the right builder makes all the difference. We&apos;re a local team and we take real pride in our work. Scan the code and take a look — we&apos;d love to hear from you.
                  </p>
                  <p className="text-sm text-gray-600 mb-4">Wishing you all the best with your project!</p>
                  <p className="text-xl text-[#1B2A4A]" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>— {prospect.company_name}</p>
                </div>
              </div>

              {/* Right — QR panel */}
              <div className="sm:w-48 shrink-0 flex flex-col gap-4 px-5 py-6 sm:border-l border-t sm:border-t-0 border-gray-100">

                {/* QR box */}
                <div className="border-2 border-[#3B6FDB]/30 rounded-xl p-4 flex flex-col items-center text-center bg-[#3B6FDB]/5">
                  {/* House icon */}
                  <div className="w-10 h-10 rounded-full bg-white border border-[#3B6FDB]/20 flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#3B6FDB" strokeWidth="1.4" fill="none"/><path d="M7 18v-7h6v7" stroke="#3B6FDB" strokeWidth="1.4"/></svg>
                  </div>
                  <p className="text-sm font-bold text-[#1B2A4A] leading-snug mb-1">Ready for your<br />next step?</p>
                  <div className="w-8 h-0.5 bg-[#3B6FDB] mb-3" />
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Scan the QR code below to view our work and <strong>get in touch with us directly.</strong>
                  </p>

                  {/* QR with corner brackets */}
                  <div className="relative mb-2">
                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#3B6FDB] rounded-tl" />
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#3B6FDB] rounded-tr" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#3B6FDB] rounded-bl" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#3B6FDB] rounded-br" />
                    <div className="w-28 h-28 bg-white rounded flex items-center justify-center p-2">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="32" height="32" rx="2" fill="#1B2A4A"/>
                        <rect x="48" y="0" width="32" height="32" rx="2" fill="#1B2A4A"/>
                        <rect x="0" y="48" width="32" height="32" rx="2" fill="#1B2A4A"/>
                        <rect x="8" y="8" width="16" height="16" fill="white"/>
                        <rect x="56" y="8" width="16" height="16" fill="white"/>
                        <rect x="8" y="56" width="16" height="16" fill="white"/>
                        <rect x="12" y="12" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="60" y="12" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="12" y="60" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="48" y="48" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="60" y="48" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="72" y="48" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="48" y="60" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="72" y="60" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="48" y="72" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="60" y="72" width="8" height="8" fill="#1B2A4A"/>
                        <rect x="72" y="72" width="8" height="8" fill="#1B2A4A"/>
                      </svg>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 italic mt-3">Scan me</p>
                </div>

                {/* Security note */}
                <div className="flex gap-2.5 items-start bg-[#1B2A4A] rounded-xl p-3">
                  <div className="w-7 h-7 rounded-full bg-[#3B6FDB] flex items-center justify-center shrink-0">
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="7" rx="1.5" stroke="white" strokeWidth="1.3"/><path d="M3 6V4a3 3 0 016 0v2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Your information is secure</p>
                    <p className="text-xs text-blue-200/70 leading-snug mt-0.5">We respect your privacy and will never share your details.</p>
                  </div>
                </div>

                {/* Supporting homeowners */}
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <div className="w-8 h-8 rounded-full bg-[#3B6FDB]/10 border border-[#3B6FDB]/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12.5S1 9 1 4.5A3.5 3.5 0 017 2a3.5 3.5 0 016 2.5C13 9 7 12.5 7 12.5z" fill="#3B6FDB"/></svg>
                  </div>
                  <p className="text-xs text-[#1B2A4A] text-center" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Proudly supporting<br />homeowners in your area.</p>
                </div>
              </div>
            </div>

            {/* Letter footer */}
            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center gap-1.5 bg-gray-50">
              <span className="text-xs text-gray-400">Powered by</span>
              <span className="text-xs font-bold text-[#3B6FDB]">Roweo</span>
            </div>
          </div>

          {/* Real DAs */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1 text-center">Real DAs in {suburbDisplay} right now</p>
            <p className="text-center text-gray-500 text-sm mb-4">Each one is a homeowner who could have received your letter.</p>
            <div className="space-y-2">
              {recentDAs.map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg px-4 py-3.5 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-[#1B2A4A]">{item.suburb}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.description}</p>
                    <span className="inline-block mt-1.5 text-xs bg-[#3B6FDB]/10 text-[#3B6FDB] px-2 py-0.5 rounded-full font-medium capitalize">
                      {item.project_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3 mt-0.5">
                    {new Date(item.lodged_date).toLocaleDateString('en-AU')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5 text-center">How it works</p>
            <div className="space-y-5">
              {[
                { n: '1', title: 'DA lodged at council', body: `A homeowner in ${suburb1} submits a development application. Roweo detects it within 24 hours.` },
                { n: '2', title: 'Letter written and posted', body: `A professional letter from ${prospect.company_name} is printed and posted within 2 business days — before competitors even know the job exists.` },
                { n: '3', title: 'Homeowner gets in touch', body: 'They scan the QR, land on your profile, and send an enquiry. You get an instant notification with their name, number, and project details.' },
              ].map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#1B2A4A] text-white text-sm font-bold flex items-center justify-center shrink-0">{s.n}</div>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-[#1B2A4A] mb-0.5">{s.title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bg-[#1B2A4A] rounded-xl px-7 py-9 text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-3">For {prospect.company_name}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-3">
              Your next client already has<br className="hidden sm:block" /> plans at council.
            </h2>
            <p className="text-sm text-blue-200/80 mb-7 leading-relaxed max-w-xs mx-auto">
              Roweo puts your letter in front of homeowners in {suburbDisplay} the week they lodge their DA — before they&apos;ve asked anyone for a quote.
            </p>
            <Link
              href="/signup"
              data-cta="bottom"
              className="inline-flex items-center justify-center w-full sm:w-auto bg-white text-[#1B2A4A] font-bold text-base px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get started — from $149/month
            </Link>
            <p className="text-xs text-blue-200/40 mt-4">No lock-in · First letters posted within 2 business days of sign-up</p>
          </div>

        </main>

        <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Roweo Pty Ltd · ABN 31 683 026 924 ·{' '}
          <Link href="/legal/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
          {' '}·{' '}
          <Link href="/legal/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
        </footer>
      </div>
    </>
  )
}
