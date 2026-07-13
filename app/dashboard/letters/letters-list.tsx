'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Loader2, CheckCircle, QrCode } from 'lucide-react'

interface Letter {
  id: string
  status: string
  scan_count: number
  scanned_at: string | null
  letter_sent_at: string | null
  letter_approved_at: string | null
  qr_token: string
  development_applications: {
    suburb: string
    state: string
    project_type: string
    lodged_date: string | null
  }
}

function formatProjectType(type?: string) {
  if (!type) return 'Other'
  return type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

const STATUS_LABEL: Record<string, string> = {
  letter_approved: 'Awaiting print',
  printed: 'Printed',
  posted: 'Posted',
  scanned: 'Scanned',
}

export function LettersList({ letters }: { letters: Letter[] }) {
  const router = useRouter()
  const [outcomeMatch, setOutcomeMatch] = useState<Letter | null>(null)

  if (letters.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-gray-400">No letters approved yet. Approve a letter from the Leads tab to see it here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {letters.map(letter => {
          const da = letter.development_applications
          return (
            <Card key={letter.id} className="border-gray-200">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{da.suburb}, {da.state}</p>
                    <Badge variant="secondary" className="text-xs">{formatProjectType(da.project_type)}</Badge>
                    {letter.scan_count > 0 && (
                      <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                        <QrCode className="w-3 h-3" /> {letter.scan_count} scan{letter.scan_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {STATUS_LABEL[letter.status] ?? letter.status}
                    {letter.letter_approved_at && ` · approved ${new Date(letter.letter_approved_at).toLocaleDateString('en-AU')}`}
                  </p>
                </div>

                {['posted', 'scanned', 'printed'].includes(letter.status) && (
                  <Button size="sm" variant="secondary" className="text-xs shrink-0" onClick={() => setOutcomeMatch(letter)}>
                    Log outcome
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <LogOutcomeDialog
        letter={outcomeMatch}
        onClose={() => setOutcomeMatch(null)}
        onSaved={() => { setOutcomeMatch(null); router.refresh() }}
      />
    </>
  )
}

function LogOutcomeDialog({ letter, onClose, onSaved }: { letter: Letter | null; onClose: () => void; onSaved: () => void }) {
  const [outcomeType, setOutcomeType] = useState<'enquiry' | 'quote' | 'job_won'>('enquiry')
  const [revenue, setRevenue] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!letter) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/outcomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_match_id: letter.id,
        outcome_type: outcomeType,
        revenue_aud: outcomeType === 'job_won' && revenue ? Number(revenue) : null,
        project_description: description || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ?? 'Could not save outcome — please try again.')
      return
    }
    setRevenue('')
    setDescription('')
    setOutcomeType('enquiry')
    setSaveError(null)
    onSaved()
  }

  return (
    <Dialog open={!!letter} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log outcome</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcomeType} onValueChange={v => setOutcomeType(v as any)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enquiry">Enquiry received</SelectItem>
                <SelectItem value="quote">Quote provided</SelectItem>
                <SelectItem value="job_won">Job won</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {outcomeType === 'job_won' && (
            <div className="space-y-1.5">
              <Label>Revenue (AUD)</Label>
              <Input type="number" placeholder="e.g. 85000" value={revenue} onChange={e => setRevenue(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Project details (optional)</Label>
            <Input placeholder="Project details…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOutcomeType('enquiry'); setRevenue(''); setDescription(''); setSaveError(null); onClose() }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Save outcome</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
