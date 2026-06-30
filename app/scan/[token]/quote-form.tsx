'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle } from 'lucide-react'

export function QuoteForm({ matchId, brandColor }: { matchId: string; brandColor: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch(`/api/scan/${matchId}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <p className="text-sm">Thanks — your request has been sent. They'll be in touch soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-zinc-300">Your name</Label>
        <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Phone</Label>
          <Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-zinc-300">Tell us about your project (optional)</Label>
        <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
      </div>
      <Button type="submit" disabled={submitting} className="w-full" style={{ backgroundColor: brandColor }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request a free quote'}
      </Button>
    </form>
  )
}
