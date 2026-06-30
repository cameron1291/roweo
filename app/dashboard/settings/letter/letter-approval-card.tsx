'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Eye, Loader2, AlertCircle } from 'lucide-react'

interface LetterFields {
  letter_template_approved: boolean
  letter_greeting: string
  letter_sign_off: string
  letter_compliance_disclaimer: string
  brand_color: string
  logo_url: string | null
  tagline: string | null
}

export function LetterApprovalCard({ builder }: { builder: LetterFields }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [approved, setApproved] = useState(builder.letter_template_approved)
  const [form, setForm] = useState({
    letter_greeting: builder.letter_greeting,
    letter_sign_off: builder.letter_sign_off,
  })

  function openPreview() {
    window.open('/api/letters/preview?preview=1', '_blank')
  }

  async function handleApprove() {
    setSaving(true)
    await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, letter_template_approved: true }),
    })
    setSaving(false)
    setApproved(true)
    router.refresh()
  }

  async function handleSaveOnly() {
    setSaving(true)
    await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {approved ? (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" /> Letter template approved — auto-send is available.
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4" /> Not approved yet. Letters won't be sent until you approve.
        </div>
      )}

      <Card className="border-white/10">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Greeting</Label>
              <Input value={form.letter_greeting} onChange={e => setForm(f => ({ ...f, letter_greeting: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sign-off</Label>
              <Input value={form.letter_sign_off} onChange={e => setForm(f => ({ ...f, letter_sign_off: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Compliance disclaimer</Label>
            <p className="text-xs text-zinc-500 leading-relaxed">{builder.letter_compliance_disclaimer}</p>
            <p className="text-xs text-zinc-600">This disclaimer is required and cannot be removed.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={openPreview} className="gap-2">
          <Eye className="w-4 h-4" /> Preview letter
        </Button>
        <Button variant="ghost" onClick={handleSaveOnly} disabled={saving}>
          Save without approving
        </Button>
        <Button onClick={handleApprove} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : approved ? 'Re-approve letter' : 'Approve letter'}
        </Button>
      </div>
    </div>
  )
}
