import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'How Roweo Works — DA Leads for Australian Builders',
  description: 'See the full Roweo flow: DA matched to your suburb, letter printed and posted, homeowner scans QR, you get notified, quote comes in. Built for Australian residential builders.',
}

export const dynamic = 'force-dynamic'

const TYPE_BADGE: Record<string, string> = {
  extension: 'bg-blue-500/20 text-blue-300',
  renovation: 'bg-purple-500/20 text-purple-300',
  new_dwelling: 'bg-green-500/20 text-green-300',
  granny_flat: 'bg-yellow-500/20 text-yellow-300',
  pool: 'bg-cyan-500/20 text-cyan-300',
  duplex: 'bg-orange-500/20 text-orange-300',
  other: 'bg-zinc-500/20 text-zinc-400',
}

const TYPE_LABELS: Record<string, string> = {
  new_dwelling: 'New Dwelling',
  extension: 'Extension',
  renovation: 'Renovation',
  granny_flat: 'Granny Flat',
  pool: 'Pool',
  duplex: 'Duplex',
  demolition: 'Demolition',
  other: 'Other',
}

const MOCK_DAS = [
  { suburb: 'Parramatta', state: 'NSW', project_type: 'extension', description: 'Alterations and additions — proposed second storey addition to existing dwelling', lodged_date: '2026-06-28', estimated_value_aud: 185000 },
  { suburb: 'Blacktown', state: 'NSW', project_type: 'new_dwelling', description: 'Construction of new single storey dwelling with double garage', lodged_date: '2026-06-27', estimated_value_aud: 420000 },
  { suburb: 'Penrith', state: 'NSW', project_type: 'granny_flat', description: 'Construction of secondary dwelling (granny flat) to rear of existing property', lodged_date: '2026-06-27', estimated_value_aud: 92000 },
  { suburb: 'Liverpool', state: 'NSW', project_type: 'renovation', description: 'Internal alterations — kitchen, bathrooms and living areas', lodged_date: '2026-06-26', estimated_value_aud: 88000 },
  { suburb: 'Campbelltown', state: 'NSW', project_type: 'pool', description: 'Construction of in-ground swimming pool and associated landscaping', lodged_date: '2026-06-25', estimated_value_aud: 58000 },
  { suburb: 'Castle Hill', state: 'NSW', project_type: 'extension', description: 'First floor addition and ground floor alterations to existing dwelling', lodged_date: '2026-06-25', estimated_value_aud: 260000 },
]

export default async function DemoPage() {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [dasResult, countResult] = await Promise.all([
    supabase
      .from('development_applications')
      .select('suburb, state, project_type, description, lodged_date, estimated_value_aud')
      .neq('project_type', 'commercial')
      .order('lodged_date', { ascending: false })
      .limit(6),
    supabase
      .from('development_applications')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'NSW')
      .gte('lodged_date', thirtyDaysAgo),
  ])

  const dbDas = dasResult.data ?? []
  const displayDas = dbDas.length > 0 ? dbDas : MOCK_DAS
  const daCount = (countResult.count ?? 0) > 0 ? countResult.count! : 312

  return (
    <>
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
            {/* Letter mock — clean professional layout, no coloured header */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-w-md" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="px-7 pt-6 pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between mb-0">
                  {/* Logo placeholder — left aligned */}
                  <div className="w-28 h-9 bg-[#1B2A4A] rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold tracking-wide">BAYSIDE BUILDING</span>
                  </div>
                  {/* Sender details — right aligned */}
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-800">Bayside Building Co.</p>
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">0412 345 678<br />baysidebuilding.com.au<br />Lic. No. 123456C</p>
                    <p className="text-xs text-gray-400 mt-1">30 June 2026</p>
                  </div>
                </div>
              </div>
              <div className="px-7 py-5">
                {/* Recipient address — window envelope position */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">The Property Owner</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">14 Paget Street<br />Parramatta NSW 2150</p>
                </div>
                {/* RE line */}
                <div className="border-l-2 border-[#1B2A4A] pl-3 py-1 mb-4">
                  <p className="text-xs font-semibold text-gray-800">RE: Second Storey Extension — 14 Paget Street, Parramatta</p>
                  <p className="text-xs text-gray-400 mt-0.5">DA No. 2025/0412 · Lodged 18 June 2026</p>
                </div>
                <p className="text-sm text-gray-700 mb-3">Dear Homeowner,</p>
                <p className="text-sm leading-relaxed text-gray-700 mb-3">We noticed your application for a second storey addition has been lodged with City of Parramatta Council and wanted to reach out before you start calling builders.</p>
                <p className="text-sm leading-relaxed text-gray-700 mb-3">We have completed fifteen similar additions in Parramatta over the past three years and know the council requirements well. We are happy to come out, review your plans, and give you a straight quote — no charge, no pressure.</p>
                <p className="text-sm leading-relaxed text-gray-700 mb-4">Scan the QR code below to see our profile and get in touch. We usually respond the same day.</p>
                <p className="text-sm text-gray-700 mb-4">Kind regards,<br /><span className="font-semibold text-gray-900">Bayside Building Co.</span><br /><span className="text-xs text-gray-400">0412 345 678 · baysidebuilding.com.au · Lic. No. 123456C</span></p>
                {/* QR block — clean border, no fill */}
                <div className="border border-gray-200 rounded p-3 flex items-center gap-4">
                  <div className="w-16 h-16 flex-shrink-0 grid grid-cols-5 grid-rows-5 gap-px p-1 bg-white border border-gray-200 rounded">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${[0,1,2,5,10,12,14,15,20,22,23,24,6,7,8,17,18,19].includes(i) ? 'bg-gray-900' : 'bg-white'}`} />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Scan to view our profile &amp; request a quote</p>
                    <p className="text-xs text-gray-400 mt-1">roweo.com.au/scan/bayside-abc123</p>
                  </div>
                </div>
                <p className="text-xs text-gray-300 mt-4 pt-3 border-t border-gray-100 leading-relaxed">This letter was sent independently by the builder named above and is not affiliated with any council or government authority. ABN 31 683 026 924</p>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              {[
                { title: 'Your logo and brand colours', body: 'Upload your logo once. Every letter goes out on your letterhead — not ours.' },
                { title: 'Personalised to the DA type', body: 'Extension DA? The letter mentions extensions. Granny flat? Same again. Not a generic form letter.' },
                { title: 'Unique QR code tracked to you', body: 'Every letter has a unique QR. When the homeowner scans it, you get notified immediately.' },
                { title: 'Posted within 2 business days', body: 'We handle printing, folding, stuffing, stamping, and Australia Post. You approve once — done.' },
                { title: 'Compliance built in', body: 'Includes the council non-affiliation disclaimer required under Australian Consumer Law.' },
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
                      <span className="text-xs text-gray-500 ml-1.5">4.9 (23 reviews)</span>
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
              <h2 className="text-xl font-bold text-[#1B2A4A]">You are notified the moment they scan</h2>
              <p className="text-gray-500 mt-1 text-sm">An email hits your inbox within seconds. First builder to call a homeowner after they express interest wins more often than not.</p>
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
                  <p className="text-sm text-gray-600 mb-4">This homeowner spent over 2 minutes on your profile page and scrolled to the bottom. They know who you are — now is the time to follow up.</p>
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
              <span className="text-xs text-zinc-500">Bayside Building Co.</span>
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
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start getting leads from DAs?</h2>
          <p className="text-blue-200 mb-8 text-lg">Setup takes 20 minutes. First letter goes out within 2 business days.</p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-gray-100 text-[#1B2A4A] font-bold px-10 py-4 rounded-lg transition-colors text-lg"
          >
            Get started from $149/month
          </Link>
          <p className="text-blue-300 text-sm mt-4">No contracts. Cancel any time.</p>
        </div>
      </section>
    </>
  )
}
