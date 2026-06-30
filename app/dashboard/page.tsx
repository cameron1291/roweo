import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, QrCode, MessageSquare, FileCheck, Trophy, DollarSign, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: builder } = await supabase
    .from('builder_profiles')
    .select('id, company_name, letter_template_approved')
    .eq('user_id', user.id)
    .single()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [lettersSentRes, scansRes, newLeadsRes, outcomesRes, recentLeadsRes] = await Promise.all([
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['posted', 'scanned']),
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('scan_count', 0),
    supabase.from('lead_matches').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'new').gte('created_at', oneWeekAgo),
    supabase.from('builder_outcomes').select('outcome_type, revenue_aud').eq('user_id', user.id),
    supabase.from('lead_matches')
      .select('id, status, scan_count, created_at, development_applications(suburb, project_type, description, lodged_date)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
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

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Welcome back{builder?.company_name ? `, ${builder.company_name}` : ''}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Here's how your letters are performing.</p>
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

      {/* Revenue hero */}
      {revenue > 0 && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-6">
            <p className="text-sm text-blue-300 mb-1">Generated through Roweo</p>
            <p className="text-4xl font-bold text-white">
              ${revenue.toLocaleString('en-AU')}
            </p>
            <p className="text-sm text-zinc-400 mt-1">in won jobs from {jobsWon} project{jobsWon !== 1 ? 's' : ''}</p>
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
        <StatCard icon={DollarSign} label="New leads (7d)" value={newLeads} />
      </div>

      {/* Recent leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white">Recent leads</h2>
          <Link href="/dashboard/leads" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <Card className="border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-zinc-500">No leads yet. New development applications matching your service area will appear here automatically.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead: any) => {
              const da = lead.development_applications
              return (
                <Card key={lead.id} className="border-white/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{da?.suburb}</p>
                        <Badge variant="secondary" className="text-xs">{formatProjectType(da?.project_type)}</Badge>
                        {lead.scan_count > 0 && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Scanned</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{da?.description}</p>
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

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="border-white/10">
      <CardContent className="p-3.5">
        <Icon className="w-4 h-4 text-zinc-500 mb-2" />
        <p className="text-xl font-semibold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </CardContent>
    </Card>
  )
}

function formatProjectType(type?: string) {
  if (!type) return 'Other'
  return type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}
