import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'How Roweo Works — DA Leads for Australian Builders',
  description: 'See the full Roweo flow: DA matched to your suburb, letter printed and posted, homeowner scans QR, you get notified, quote comes in. Built for Australian residential builders.',
  openGraph: {
    title: 'How Roweo Works | From DA lodged to quote request',
    description: 'Live DA data, professional letters in the post within 2 business days, QR tracking to know who responded. No cold calling, no ads.',
    siteName: 'Roweo',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-500/20 text-blue-300',
  renovation: 'bg-purple-500/20 text-purple-300',
  new_dwelling: 'bg-green-500/20 text-green-300',
  granny_flat: 'bg-yellow-500/20 text-yellow-300',
  pool: 'bg-cyan-500/20 text-cyan-300',
  duplex: 'bg-orange-500/20 text-orange-300',
  knockdown_rebuild: 'bg-red-500/20 text-red-300',
}

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling',
  extension: 'Extension',
  renovation: 'Renovation',
  granny_flat: 'Granny Flat',
  pool: 'Pool',
  duplex: 'Duplex',
  knockdown_rebuild: 'Knockdown Rebuild',
}

const MOCK_DAS = [
  { suburb: 'Parramatta', state: 'NSW', project_type: 'extension', description: 'Alterations and additions — proposed second storey addition to existing dwelling', lodged_date: '2026-07-01', estimated_value_aud: 185000 },
  { suburb: 'Castle Hill', state: 'NSW', project_type: 'extension', description: 'First floor addition and ground floor alterations including new master bedroom and ensuite', lodged_date: '2026-07-01', estimated_value_aud: 260000 },
  { suburb: 'Kellyville', state: 'NSW', project_type: 'new_dwelling', description: 'Construction of new two-storey dwelling with double garage and alfresco area', lodged_date: '2026-06-30', estimated_value_aud: 680000 },
  { suburb: 'Baulkham Hills', state: 'NSW', project_type: 'renovation', description: 'Alterations and additions — knockdown and rebuild of existing single storey dwelling', lodged_date: '2026-06-30', estimated_value_aud: 520000 },
  { suburb: 'Penrith', state: 'NSW', project_type: 'granny_flat', description: 'Construction of secondary dwelling (granny flat) to rear of existing property', lodged_date: '2026-06-29', estimated_value_aud: 148000 },
  { suburb: 'Blacktown', state: 'NSW', project_type: 'pool', description: 'Construction of in-ground swimming pool, decking, fencing and associated landscaping', lodged_date: '2026-06-29', estimated_value_aud: 72000 },
]

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Roweo',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://roweo.com.au',
  description: 'DA-matched construction lead generation for Australian residential builders. Monitors planning portals, posts branded letters, and tracks homeowner responses via QR code.',
  offers: [
    { '@type': 'Offer', name: 'Professional', price: '249', priceCurrency: 'AUD', billingIncrement: 'P1M' },
    { '@type': 'Offer', name: 'Growth', price: '349', priceCurrency: 'AUD', billingIncrement: 'P1M' },
  ],
  areaServed: 'Australia',
}

export default async function DemoPage() {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const ATTRACTIVE_TYPES = ['extension', 'new_dwelling', 'renovation', 'granny_flat', 'pool', 'duplex', 'knockdown_rebuild']

  const [dasResult, countResult] = await Promise.all([
    supabase
      .from('development_applications')
      .select('suburb, state, project_type, description, lodged_date, estimated_value_aud')
      .in('project_type', ATTRACTIVE_TYPES)
      .in('state', ['NSW', 'ACT'])
      .not('suburb', 'is', null)
      .neq('suburb', '')
      .neq('suburb', '.')
      .not('description', 'is', null)
      .neq('description', '')
      .gt('estimated_value_aud', 50000)
      .order('lodged_date', { ascending: false })
      .limit(6),
    supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .in('state', ['NSW', 'ACT'])
      .gte('lodged_date', thirtyDaysAgo),
  ])

  const dbDas = dasResult.data ?? []
  const displayDas = dbDas.length > 0 ? dbDas : MOCK_DAS
  const daCount = (countResult.count ?? 0) > 0 ? countResult.count! : 312

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      {/* Hero */}
      <section className="bg-white pt-16 pb-12 text-center px-6">
        <p className="text-sm font-medium text-[#1B2A4A] mb-4 tracking-wide uppercase">How it works</p>
        <h1 className="text-4xl font-bold text-[#1B2A4A] mb-4 max-w-2xl mx-auto leading-tight">
          From DA lodged to quote request — without lifting a finger
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
          Roweo watches the NSW planning portal, matches DAs to your service area, posts a letter to the homeowner, and tells you when they scan it.
        </p>
        <div className="inline-flex items-center gap-2 bg-[#1B2A4A]/5 border border-[#1B2A4A]/10 rounded-full px-5 py-2 text-sm font-medium text-[#1B2A4A]">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          {daCount.toLocaleString()} DAs lodged in NSW in the last 30 days
        </div>
      </section>

      {/* Step 1 — Dashboard */}
      <section className="bg-[#0B1220] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#1B2A4A] border border-white/10 text-white text-sm font-bold flex items-center justify-center">1</span>
            <div>
              <h2 className="text-xl font-bold text-white">A DA lands in your suburb — you see it the same day</h2>
              <p className="text-zinc-400 mt-1 text-sm">Roweo checks the NSW Planning Portal every few hours. New DAs are classified by project type and matched to builders covering that suburb.</p>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="bg-zinc-900 px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <span className="text-zinc-500 text-xs ml-2">roweo.com.au/dashboard/leads</span>
              </div>
              <span className="text-xs text-zinc-500">{displayDas.length} new leads this week</span>
            </div>
            <div className="flex">
              <div className="hidden md:flex flex-col gap-1 w-44 bg-zinc-950 p-3 border-r border-white/5">
                {['Dashboard', 'Leads', 'Letters', 'ROI tracker', 'Settings'].map((item, i) => (
                  <div key={item} className={`text-xs px-3 py-2 rounded-md ${i === 1 ? 'bg-white/10 text-white font-medium' : 'text-zinc-500'}`}>{item}</div>
                ))}
              </div>
              <div className="flex-1 bg-zinc-900">
                <div className="px-5 py-3 border-b border-white/5 flex gap-2">
                  {['All', 'New', 'Saved', 'Letter sent'].map((tab, i) => (
                    <button key={tab} className={`text-xs px-3 py-1.5 rounded-md font-medium ${i === 0 ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>{tab}</button>
                  ))}
                </div>
                {displayDas.map((da, i) => (
                  <div key={i} className={`px-5 py-4 flex items-start justify-between gap-4 border-b border-white/5 ${i === 0 ? 'bg-blue-500/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {i === 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">New</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[da.project_type] ?? TYPE_BADGE.other}`}>
                          {TYPE_LABELS[da.project_type] ?? da.project_type}
                        </span>
                      </div>
                      <p className="font-semibold text-white">{da.suburb}, {da.state}</p>
                      <p className="text-sm text-zinc-400 mt-0.5 truncate">{da.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-500">{da.lodged_date}</p>
                      {da.estimated_value_aud && (
                        <p className="text-xs text-zinc-400">${(da.estimated_value_aud / 1000).toFixed(0)}k est.</p>
                      )}
                      <div className="mt-2 flex gap-1.5 justify-end">
                        <button className="text-xs border border-white/10 text-zinc-400 px-2.5 py-1 rounded-md">Save</button>
                        <button className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md font-medium">Send letter</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 — The letter */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#1B2A4A] text-white text-sm font-bold flex items-center justify-center">2</span>
            <div>
              <h2 className="text-xl font-bold text-[#1B2A4A]">We print and post a letter to the homeowner — in your name</h2>
              <p className="text-gray-500 mt-1 text-sm">Approve your letter template once during setup. Every matched DA gets a letter printed and posted within 2 business days. You do nothing.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* ── REAL LETTER LAYOUT — matches the actual LetterDocument PDF ── */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-w-[420px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '9.5px' }}>

              {/* HEADER */}
              <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-200">
                {/* Logo placeholder — dashed box so builders see exactly where their logo goes */}
                <div className="border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center w-28 h-9 gap-0.5">
                  <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-4 4 4"/><circle cx="8.5" cy="14.5" r="1.5"/></svg>
                  <span className="text-[9px] text-gray-400 font-medium">Your Logo Here</span>
                </div>
                {/* Neighbourhood tag */}
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end mb-0.5">
                    <svg width="7" height="9" viewBox="0 0 10 12"><path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#3B6FDB"/></svg>
                    <span className="text-[8px] font-bold text-[#3B6FDB] uppercase tracking-wider">Your Neighbourhood</span>
                  </div>
                  <p className="text-[8px] text-gray-500 leading-tight text-right">Recent Development<br />Application Alert</p>
                </div>
              </div>

              {/* ADDRESS ZONE */}
              <div className="px-6 py-3">
                <p className="text-[7px] text-gray-400 uppercase tracking-wide mb-1">The Property Owner</p>
                <p className="text-[10px] font-bold text-[#1B2A4A] leading-snug">14 Paget Street<br />Parramatta NSW 2150</p>
              </div>

              {/* TWO-COLUMN BODY */}
              <div className="flex gap-3 px-6 pb-2">

                {/* LEFT COLUMN */}
                <div className="flex-1 min-w-0">
                  <p className="text-[8.5px] text-gray-500 mb-1.5">Hi there,</p>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight mb-1.5">
                    We noticed you&apos;re planning<br />something <span className="text-[#3B6FDB]">exciting.</span>
                  </p>
                  <div className="w-5 h-0.5 bg-[#3B6FDB] mb-2" />

                  <p className="text-[8.5px] text-gray-600 leading-relaxed mb-1.5">
                    A Development Application has recently been lodged for your property at:
                  </p>

                  {/* DA address box */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 flex items-start gap-1.5 mb-2">
                    <svg width="7" height="9" viewBox="0 0 10 12" className="shrink-0 mt-0.5"><path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#3B6FDB"/></svg>
                    <div>
                      <p className="text-[8.5px] font-bold text-gray-900 mb-0.5">14 Paget Street, Parramatta NSW</p>
                      <p className="text-[7.5px] text-gray-500 mb-0.5">Proposed second storey addition to existing dwelling</p>
                      <p className="text-[7.5px] text-gray-500">DA lodged: <span className="text-[#3B6FDB] font-bold">18 Jun 2026</span> · Ref: 2026/0412</p>
                    </div>
                  </div>

                  <p className="text-[8.5px] text-gray-600 leading-relaxed mb-1.5">
                    We&apos;ve completed over fifteen similar additions in Parramatta and know the council requirements well.
                  </p>
                  <p className="text-[8.5px] text-gray-600 leading-relaxed mb-2.5">
                    We&apos;d love to come out, review your plans, and give you a straight quote — no charge, no pressure.
                  </p>

                  {/* Feature rows */}
                  {[
                    { title: 'Licensed & insured', desc: 'Fully licensed, insured and highly rated by homeowners in your area.' },
                    { title: 'No-obligation quote', desc: "We'll review your plans and give you a straight quote — no pressure." },
                    { title: 'Fast response', desc: 'We reply to all enquiries the same day.' },
                  ].map(f => (
                    <div key={f.title} className="flex items-start gap-1.5 mb-1.5 pb-1.5 border-b border-gray-100">
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="6" height="5" viewBox="0 0 8 7"><path d="M1 3.5l2 2L7 1" stroke="#3B6FDB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-gray-900">{f.title}</p>
                        <p className="text-[7.5px] text-gray-500 leading-tight">{f.desc}</p>
                      </div>
                    </div>
                  ))}

                  {/* Handwritten-style note */}
                  <p className="text-[12px] text-[#1B2A4A] mb-0.5 mt-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>A note from us</p>
                  <div className="w-4 h-px bg-[#3B6FDB] mb-1.5" />
                  <p className="text-[8px] text-gray-600 leading-relaxed mb-1">
                    We know that getting the right builder makes all the difference. We&apos;re a local team and take real pride in our work. Scan the code — we&apos;d love to hear from you.
                  </p>
                  <p className="text-[12px] text-[#1B2A4A] mt-1.5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>— Bayside Building Co.</p>
                </div>

                {/* RIGHT COLUMN */}
                <div className="w-[100px] shrink-0">
                  {/* QR card */}
                  <div className="border border-[#3B6FDB] rounded p-2 text-center mb-2">
                    <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center mx-auto mb-1">
                      <svg width="12" height="12" viewBox="0 0 16 16"><path d="M2 7.5L8 2l6 5.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z" stroke="#3B6FDB" strokeWidth="1.2" fill="none"/><path d="M5.5 15V9.5h5V15" stroke="#3B6FDB" strokeWidth="1.2"/></svg>
                    </div>
                    <p className="text-[8px] font-bold text-[#1B2A4A] leading-tight mb-0.5">Ready for your<br />next step?</p>
                    <div className="w-3.5 h-px bg-[#3B6FDB] mx-auto mb-1.5" />
                    <p className="text-[7px] text-gray-500 leading-relaxed mb-1.5">Scan to view our work and get in touch directly.</p>
                    {/* QR code mock */}
                    <div className="w-14 h-14 mx-auto bg-white border border-gray-200 rounded p-1 mb-1 grid grid-cols-5 gap-px" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`rounded-[1px] ${[0,1,2,5,6,7,10,12,14,15,17,18,20,22,23,24].includes(i) ? 'bg-gray-900' : 'bg-white'}`} />
                      ))}
                    </div>
                    <p className="text-[6.5px] text-gray-400 italic">Scan me</p>
                    <p className="text-[6px] text-gray-300 mt-0.5">roweo.com.au/scan/…</p>
                  </div>

                  {/* Security badge */}
                  <div className="bg-[#1B2A4A] rounded p-1.5 flex items-start gap-1 mb-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#3B6FDB] flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="7" height="9" viewBox="0 0 10 12"><rect x="1" y="5" width="8" height="6" rx="1.5" stroke="white" strokeWidth="1"/><path d="M2.5 5V3.5a2.5 2.5 0 015 0V5" stroke="white" strokeWidth="1" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <p className="text-[7px] font-bold text-white mb-0.5">Your information is secure</p>
                      <p className="text-[6.5px] text-blue-200 leading-tight">We respect your privacy and will never share your details.</p>
                    </div>
                  </div>

                  {/* Supporting homeowners */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className="w-4.5 h-4.5 rounded-full border border-[#3B6FDB] flex items-center justify-center w-5 h-5">
                      <svg width="9" height="8" viewBox="0 0 12 11"><path d="M6 10S1 6.8 1 3.5A2.5 2.5 0 016 2a2.5 2.5 0 015 1.5C11 6.8 6 10 6 10z" fill="#3B6FDB"/></svg>
                    </div>
                    <p className="text-[7.5px] text-[#1B2A4A] text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>Proudly supporting<br />homeowners in your area.</p>
                  </div>
                </div>
              </div>

              {/* Compliance + footer bar */}
              <div className="px-6 pt-2 pb-2 border-t border-gray-100 text-center">
                <p className="text-[6px] text-gray-300 leading-relaxed mb-1">This letter was sent independently and is not affiliated with any local council or government authority.</p>
                <p className="text-[7px] text-gray-400">Powered by <span className="font-bold text-[#3B6FDB]">Roweo</span></p>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              {[
                { title: 'Your logo and brand colours', body: 'Upload your logo once. Every letter goes out on your letterhead — not ours.' },
                { title: 'Personalised to the DA type', body: 'Extension DA? The letter mentions extensions. Granny flat? Same again. Not a generic form letter.' },
                { title: 'Unique QR code tracked to you', body: 'Every letter has a unique QR. When the homeowner scans it, you get notified immediately.' },
                { title: 'Posted within 2 business days', body: 'We handle printing, folding, stuffing, stamping, and Australia Post. You approve once — done.' },
                { title: 'Compliance built in', body: 'Includes a clear council non-affiliation statement and sender identification on every letter.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-[#1B2A4A] font-bold text-lg shrink-0 leading-none mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 — Homeowner scans */}
      <section className="bg-[#0B1220] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#1B2A4A] border border-white/10 text-white text-sm font-bold flex items-center justify-center">3</span>
            <div>
              <h2 className="text-xl font-bold text-white">Homeowner scans the QR — lands on your dedicated page</h2>
              <p className="text-zinc-400 mt-1 text-sm">Not your generic website. A dedicated landing page with your profile, trade specialties, and a direct quote request form. Built to convert.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="w-60 bg-zinc-900 rounded-[30px] border-4 border-zinc-700 shadow-2xl overflow-hidden">
                <div className="bg-zinc-800 h-5 flex items-center justify-center">
                  <div className="w-14 h-1.5 bg-zinc-600 rounded-full" />
                </div>
                <div className="bg-white">
                  <div className="bg-[#1B2A4A] px-4 py-4 text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">BB</div>
                    <p className="text-white font-bold text-sm">Bayside Building Co.</p>
                    <p className="text-blue-200 text-xs mt-0.5">Parramatta · Lic 123456C</p>
                  </div>
                  <div className="px-4 py-4">
                    <div className="flex gap-0.5 mb-3 items-center">
                      {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}
                      <span className="text-xs text-gray-500 ml-1.5">4.9 · example profile</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">Residential extensions and second storey additions across Parramatta, Blacktown and the Hills District.</p>
                    <div className="space-y-1.5 mb-4">
                      {['Extensions & additions', 'Second storey', 'Knockdown rebuild'].map(s => (
                        <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 bg-[#1B2A4A] rounded-full shrink-0" />{s}
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#1B2A4A] text-white text-xs font-semibold text-center py-2.5 rounded-lg mb-2">
                      Request a free quote →
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1 border border-gray-200 text-gray-600 text-xs text-center py-2 rounded-lg">Call</div>
                      <div className="flex-1 border border-gray-200 text-gray-600 text-xs text-center py-2 rounded-lg">Email</div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-800 h-10 flex items-center justify-center gap-5">
                  <div className="w-3.5 h-3.5 border-2 border-zinc-600 rounded-full" />
                  <div className="w-3.5 h-3.5 border-2 border-zinc-600 rounded-sm" />
                  <div className="w-3.5 h-3.5 border-2 border-zinc-600" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              {[
                { title: 'Your profile, not a generic page', body: 'Shows your logo, trade areas, and specialties. Homeowners land here expecting to contact you — not browse a directory.' },
                { title: 'Quote form pre-filled with DA context', body: "Homeowner taps 'Request a quote' — their suburb and project type are already in the form from the DA." },
                { title: 'Quote request lands directly in your inbox', body: 'Name, number, project description — emailed to you the second they submit. No middleman, no lead marketplace.' },
                { title: 'Full engagement tracking', body: 'Dashboard shows scan time, how long they spent on the page, and whether they submitted a form or just browsed.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-blue-400 font-bold text-lg shrink-0 leading-none mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-sm text-zinc-400 mt-0.5">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 4 — Notification */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#1B2A4A] text-white text-sm font-bold flex items-center justify-center">4</span>
            <div>
              <h2 className="text-xl font-bold text-[#1B2A4A]">You are notified the moment your QR code is scanned</h2>
              <p className="text-gray-500 mt-1 text-sm">An email hits your inbox within seconds of a scan. Following up quickly while you are still front of mind gives you a clear advantage.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 max-w-md">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1B2A4A] rounded-full flex items-center justify-center text-white text-xs font-bold">R</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Roweo <span className="text-gray-400 font-normal">&lt;hello@roweo.com.au&gt;</span></p>
                    <p className="text-xs text-gray-400">to you</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">Just now</span>
                </div>
                <div className="px-5 py-5">
                  <p className="font-bold text-gray-900 text-base mb-4">Your letter was scanned in Parramatta</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-2">Scan details</p>
                    <div className="space-y-1.5 text-sm text-gray-700">
                      <p><span className="text-gray-400">Suburb:</span> Parramatta NSW 2150</p>
                      <p><span className="text-gray-400">Project:</span> Second storey addition</p>
                      <p><span className="text-gray-400">Scanned at:</span> 2:47 PM today</p>
                      <p><span className="text-gray-400">Time on page:</span> 2 min 14 sec</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Someone scanned your letter and spent over 2 minutes on your profile page — now is the time to follow up.</p>
                  <div className="bg-[#1B2A4A] text-white text-sm font-semibold text-center py-3 rounded-lg cursor-pointer">
                    View their quote request →
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 pt-2">
              {[
                'Email notification in your inbox within 10 seconds of the scan',
                'Dashboard shows scan time, how long they spent on your page, and scroll depth',
                'If they submit a quote request — their name, phone number, and project details land in your inbox',
                'Follow up the same afternoon while you are still front of mind',
              ].map((point, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#1B2A4A] text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <p className="text-sm text-gray-600 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 5 — ROI tracking */}
      <section className="bg-[#0B1220] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <span className="shrink-0 w-8 h-8 rounded-full bg-[#1B2A4A] border border-white/10 text-white text-sm font-bold flex items-center justify-center">5</span>
            <div>
              <h2 className="text-xl font-bold text-white">Log what you win — see your actual return</h2>
              <p className="text-zinc-400 mt-1 text-sm">When a letter turns into a job, log it in 10 seconds. The dashboard shows exactly how much revenue your letters have generated.</p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <p className="text-white font-semibold">ROI Tracker — last 90 days</p>
              <span className="text-xs text-zinc-500 italic">Illustrative example only</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  { label: 'Letters posted', value: '38', color: 'text-white' },
                  { label: 'QR scans', value: '9', color: 'text-blue-400' },
                  { label: 'Enquiries', value: '5', color: 'text-purple-400' },
                  { label: 'Quotes sent', value: '3', color: 'text-yellow-400' },
                  { label: 'Jobs won', value: '$620k', color: 'text-green-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-zinc-800 rounded-lg p-4 text-center">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Recent outcomes</p>
              <div className="space-y-2">
                {[
                  { suburb: 'Parramatta', type: 'Second storey addition', outcome: 'Job won', value: '$285,000', date: '14 Jun', dot: 'bg-green-500' },
                  { suburb: 'Castle Hill', type: 'Extension + renovation', outcome: 'Job won', value: '$335,000', date: '2 Jun', dot: 'bg-green-500' },
                  { suburb: 'Blacktown', type: 'New dwelling', outcome: 'Quote sent', value: null, date: '28 May', dot: 'bg-yellow-500' },
                  { suburb: 'Penrith', type: 'Granny flat', outcome: 'Enquiry', value: null, date: '19 May', dot: 'bg-blue-500' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 bg-zinc-800/50 rounded-lg px-4 py-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${row.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{row.suburb} — {row.type}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${row.outcome === 'Job won' ? 'bg-green-500/20 text-green-400' : row.outcome === 'Quote sent' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {row.outcome}
                    </span>
                    {row.value && <p className="text-sm font-bold text-green-400 shrink-0">{row.value}</p>}
                    <p className="text-xs text-zinc-500 shrink-0">{row.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1B2A4A] py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Start finding DA leads today</h2>
          <p className="text-blue-200 mb-8 text-lg">Setup takes 20 minutes. First letter goes out within 2 business days.</p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-10 py-4 rounded-lg transition-colors text-lg"
          >
            Get started — letters from $249/month
          </Link>
          <p className="text-blue-300 text-sm mt-4">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
