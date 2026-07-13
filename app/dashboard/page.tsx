import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, QrCode, MessageSquare, FileCheck, Trophy, Bell, ArrowRight } from 'lucide-react'
import { MapSection } from './map/map-section'
import { getSuburbLatLng, SYDNEY_FALLBACK } from '@/lib/suburb-centroids'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: builder } = await supabase
    .from('builder_profiles')
    .select('id, company_name, letter_template_approved, business_lat, business_lng, service_radius_km, service_suburbs, service_states')
    .eq('user_id', user.id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [lettersSentRes, scansRes, newLeadsRes, outcomesRes, recentLeadsRes, mapLeadsRes] = await Promise.all([
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['posted', 'scanned']),
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('scan_count', 0),
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'new').gte('matched_at', oneWeekAgo),
    supabase.from('builder_outcomes').select('outcome_type, revenue_aud').eq('user_id', user.id),
    supabase.from('lead_matches')
      .select('id, status, scan_count, matched_at, development_applications(suburb, project_type, description, lodged_date)')
      .eq('user_id', user.id)
      .order('matched_at', { ascending: false })
      .limit(5),
    // Map: all matched DAs — coordinates resolved below via suburb centroid lookup
    builder?.id
      ? supabase.from('lead_matches')
          .select('id, status, development_applications(id, suburb, state, project_type, description, lat, lng)')
          .eq('user_id', user.id)
          .limit(40)
      : Promise.resolve({ data: [] }),
  ])

  const lettersSent = lettersSentRes.count ?? 0
  const scans = scansRes.count ?? 0
  const newLeads = newLeadsRes.count ?? 0
  const outcomes = outcomesRes.data ?? []
  const enquiries = outcomes.filter(o => o.outcome_type === 'enquiry').length
  const quotes = outcomes.filter(o => o.outcome_type === 'quote').length
  const jobsWon = outcomes.filter(o => o.outcome_type === 'job_won').length
  const revenue = outcomes.filter(o => o.outcome_type === 'job_won').reduce((s, o) => s + (o.revenue_aud ?? 0), 0)
  const recentLeads = recentLeadsRes.data ?? []
  const plan = (profile?.plan ?? 'starter') as 'starter' | 'professional' | 'growth'

  // Plan-based radius caps
  const defaultRadius = plan === 'starter' ? 10 : plan === 'professional' ? 20 : 25
  const maxRadius = plan === 'starter' ? 10 : plan === 'professional' ? 20 : 50
  const effectiveRadius = Math.min(builder?.service_radius_km ?? defaultRadius, maxRadius)

  // Resolve builder location — DB value preferred, fall back to first service suburb centroid
  let builderLat: number = SYDNEY_FALLBACK[0]
  let builderLng: number = SYDNEY_FALLBACK[1]
  if (builder?.business_lat && builder?.business_lng) {
    builderLat = builder.business_lat
    builderLng = builder.business_lng
  } else if (builder?.service_suburbs?.length) {
    const firstSuburb = (builder.service_suburbs as string[])[0].split(',')[0].trim()
    const state = ((builder.service_states as string[] | null)?.[0] ?? 'NSW').trim()
    const coords = getSuburbLatLng(firstSuburb, state)
    if (coords) { builderLat = coords[0]; builderLng = coords[1] }
  }

  // Build matched DAs for map — use DB lat/lng when present, otherwise suburb centroid
  const mapLeads = (mapLeadsRes.data ?? []) as any[]
  const matchedDasForMap = mapLeads
    .map((m: any) => {
      const da = m.development_applications
      if (!da) return null
      let lat = da.lat as number | null
      let lng = da.lng as number | null
      if (!lat && da.suburb) {
        const coords = getSuburbLatLng(da.suburb, da.state ?? 'NSW')
        if (coords) { lat = coords[0]; lng = coords[1] }
      }
      if (!lat) return null
      return {
        id: da.id as string,
        match_id: m.id as string,
        lat,
        lng: lng!,
        suburb: da.suburb as string,
        project_type: da.project_type as string,
        description: da.description as string | null,
        status: m.status as string,
      }
    })
    .filter(Boolean) as any[]

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome back{builder?.company_name ? `, ${builder.company_name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's how your letters are performing.</p>
      </div>

      {!builder?.letter_template_approved && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-amber-400">Your letter template isn't approved yet — leads won't be sent until you approve it.</p>
            <Link href="/dashboard/settings/letter">
              <Button size="sm" variant="outline" className="text-xs border-amber-500/40 text-amber-400">Review letter</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* DA Map — top of dashboard */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900">Your area</h2>
          {plan !== 'starter' && (
            <p className="text-xs text-gray-400">
              {matchedDasForMap.length} matched DA{matchedDasForMap.length !== 1 ? 's' : ''} near you
              {plan === 'growth' ? ' · drag radius slider to expand' : ''}
            </p>
          )}
        </div>
        <MapSection
          builderLat={builderLat}
          builderLng={builderLng}
          radiusKm={effectiveRadius}
          plan={plan}
          matchedDas={matchedDasForMap}
        />
      </div>

      {/* Revenue hero */}
      {revenue > 0 && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-6">
            <p className="text-sm text-blue-300 mb-1">Generated through Roweo</p>
            <p className="text-4xl font-bold text-gray-900">
              ${revenue.toLocaleString('en-AU')}
            </p>
            <p className="text-sm text-gray-500 mt-1">in won jobs from {jobsWon} project{jobsWon !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Mail} label="Letters sent" value={lettersSent} />
        <StatCard icon={QrCode} label="QR scans" value={scans} />
        <StatCard icon={MessageSquare} label="Enquiries" value={enquiries} />
        <StatCard icon={FileCheck} label="Quotes" value={quotes} />
        <StatCard icon={Trophy} label="Jobs won" value={jobsWon} />
        <StatCard icon={Bell} label="New leads (7d)" value={newLeads} />
      </div>

      {/* Recent leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Recent leads</h2>
          <Link href="/dashboard/leads" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <EmptyLeadsState letterApproved={builder?.letter_template_approved ?? false} />
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead: any) => {
              const da = lead.development_applications
              return (
                <Card key={lead.id} className="border-gray-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{da?.suburb}</p>
                        <Badge variant="secondary" className="text-xs">{formatProjectType(da?.project_type)}</Badge>
                        {lead.scan_count > 0 && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Scanned</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{da?.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 capitalize">{lead.status.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyLeadsState({ letterApproved }: { letterApproved: boolean }) {
  const steps = [
    {
      done: true,
      label: 'Account created',
      sub: 'You\'re signed in and ready to go.',
    },
    {
      done: letterApproved,
      label: 'Letter template approved',
      sub: letterApproved
        ? 'Your branded letter is ready to send.'
        : 'Review your letter design so we can start posting.',
      href: letterApproved ? undefined : '/dashboard/settings/letter',
      cta: 'Review letter →',
    },
    {
      done: false,
      label: 'First DA match',
      sub: 'Once your template is approved, matching DAs appear here automatically — usually within 24 hours.',
    },
    {
      done: false,
      label: 'First letter posted',
      sub: 'We print and post your branded letter to the homeowner within 2 business days.',
    },
    {
      done: false,
      label: 'First QR scan',
      sub: 'You\'ll get an instant notification when the homeowner scans your letter.',
    },
  ]

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <p className="text-sm font-semibold text-gray-900 mb-1">Getting started</p>
        <p className="text-xs text-gray-400 mb-6">Here's what happens between now and your first lead.</p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${step.done ? 'bg-green-500/20' : 'bg-gray-100'}`}>
                {step.done ? (
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{step.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.sub}</p>
                {step.href && (
                  <Link href={step.href} className="text-xs text-[#1B2A4A] font-medium hover:underline mt-1 inline-block">
                    {step.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-3.5">
        <Icon className="w-4 h-4 text-gray-400 mb-2" />
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </CardContent>
    </Card>
  )
}

function formatProjectType(type?: string) {
  if (!type) return 'Other'
  return type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}
