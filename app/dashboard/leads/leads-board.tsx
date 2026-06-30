'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, X, Send, Loader2, Eye } from 'lucide-react'

interface Lead {
  id: string
  status: string
  scan_count: number
  builder_note: string | null
  created_at: string
  trigger_stage: string
  development_applications: {
    suburb: string
    state: string
    project_type: string
    description: string | null
    lodged_date: string | null
    estimated_value_aud: number | null
    da_number: string | null
  }
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'saved', label: 'Saved' },
  { id: 'letter_approved', label: 'Letter Approved' },
  { id: 'sent', label: 'Sent' },
  { id: 'ignored', label: 'Ignored' },
]

function formatProjectType(type?: string) {
  if (!type) return 'Other'
  return type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export function LeadsBoard({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [tab, setTab] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  function filterLeads(t: string) {
    if (t === 'all') return leads
    if (t === 'sent') return leads.filter(l => ['printed', 'posted', 'scanned'].includes(l.status))
    return leads.filter(l => l.status === t)
  }

  async function doAction(matchId: string, action: 'view' | 'save' | 'ignore') {
    setBusyId(matchId)
    await fetch(`/api/leads/${matchId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusyId(null)
    router.refresh()
  }

  async function approveLetter(matchId: string) {
    setBusyId(matchId)
    const res = await fetch('/api/letters/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId }),
    })
    setBusyId(null)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Could not approve letter')
      return
    }
    router.refresh()
  }

  return (
    <Tabs defaultValue="all" onValueChange={v => setTab(v as string)}>
      <TabsList>
        {TABS.map(t => (
          <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
        ))}
      </TabsList>

      {TABS.map(t => (
        <TabsContent key={t.id} value={t.id} className="mt-4">
          <LeadList
            leads={filterLeads(t.id)}
            busyId={busyId}
            onView={id => doAction(id, 'view')}
            onSave={id => doAction(id, 'save')}
            onIgnore={id => doAction(id, 'ignore')}
            onApproveLetter={approveLetter}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function LeadList({
  leads, busyId, onView, onSave, onIgnore, onApproveLetter,
}: {
  leads: Lead[]
  busyId: string | null
  onView: (id: string) => void
  onSave: (id: string) => void
  onIgnore: (id: string) => void
  onApproveLetter: (id: string) => void
}) {
  if (leads.length === 0) {
    return (
      <Card className="border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-zinc-500">No leads in this category.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {leads.map(lead => {
        const da = lead.development_applications
        const busy = busyId === lead.id
        return (
          <Card key={lead.id} className="border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{da.suburb}, {da.state}</p>
                    <Badge variant="secondary" className="text-xs">{formatProjectType(da.project_type)}</Badge>
                    {lead.trigger_stage === 'approval' && <Badge variant="outline" className="text-xs">DA Approved</Badge>}
                    {lead.scan_count > 0 && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Scanned ×{lead.scan_count}</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{da.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                    {da.lodged_date && <span>Lodged {new Date(da.lodged_date).toLocaleDateString('en-AU')}</span>}
                    {da.da_number && <span>{da.da_number}</span>}
                    {da.estimated_value_aud && <span>${da.estimated_value_aud.toLocaleString('en-AU')}</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 capitalize">{lead.status.replace('_', ' ')}</Badge>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {lead.status === 'new' && (
                  <Button size="sm" variant="ghost" onClick={() => onView(lead.id)} disabled={busy} className="gap-1 text-xs h-7">
                    <Eye className="w-3 h-3" /> Mark viewed
                  </Button>
                )}
                {!['saved', 'letter_approved', 'printed', 'posted', 'scanned'].includes(lead.status) && (
                  <Button size="sm" variant="ghost" onClick={() => onSave(lead.id)} disabled={busy} className="gap-1 text-xs h-7">
                    <Bookmark className="w-3 h-3" /> Save
                  </Button>
                )}
                {!['ignored', 'letter_approved', 'printed', 'posted', 'scanned'].includes(lead.status) && (
                  <Button size="sm" variant="ghost" onClick={() => onIgnore(lead.id)} disabled={busy} className="gap-1 text-xs h-7 text-zinc-500">
                    <X className="w-3 h-3" /> Ignore
                  </Button>
                )}
                {!['letter_approved', 'printed', 'posted', 'scanned', 'ignored'].includes(lead.status) && (
                  <Button size="sm" onClick={() => onApproveLetter(lead.id)} disabled={busy} className="gap-1 text-xs h-7">
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Approve & queue letter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
