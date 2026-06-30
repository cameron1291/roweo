'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Prospect {
  id: string
  status: string
  notes?: string
  phone_outcome?: string
  letter_body_text?: string
  letter_generated_at?: string
}

interface Props {
  prospect: Prospect
  statuses: string[]
}

export function ProspectActions({ prospect, statuses }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(prospect.status)
  const [notes, setNotes] = useState(prospect.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [generatingLetter, setGeneratingLetter] = useState(false)
  const [sendingInteractive, setSendingInteractive] = useState(false)
  const [sendingCold, setSendingCold] = useState(false)
  const [phoneOutcome, setPhoneOutcome] = useState(prospect.phone_outcome ?? '')
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      setMessage('Saved')
      router.refresh()
    } catch { setMessage('Error saving') }
    setSaving(false)
  }

  async function generateLetter() {
    setGeneratingLetter(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/generate-letter`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setMessage('Letter generated')
      router.refresh()
    } catch { setMessage('Letter generation failed') }
    setGeneratingLetter(false)
  }

  async function sendInteractiveEmail() {
    setSendingInteractive(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/send-interactive-email`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setMessage('Interactive email sent')
      router.refresh()
    } catch { setMessage('Email send failed') }
    setSendingInteractive(false)
  }

  async function sendColdEmail() {
    setSendingCold(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/send-cold-email`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setMessage('Cold email sent')
      router.refresh()
    } catch { setMessage('Email send failed') }
    setSendingCold(false)
  }

  async function logPhoneCall() {
    if (!phoneOutcome) return
    setMessage(null)
    try {
      await fetch(`/api/admin/prospects/${prospect.id}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event_type: 'phone_call', metadata: { outcome: phoneOutcome } }),
      })
      await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone_outcome: phoneOutcome }),
      })
      setMessage('Phone call logged')
      router.refresh()
    } catch { setMessage('Error logging call') }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-md">{message}</div>
      )}

      {/* Status */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Status</h3>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
        >
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Notes</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
          placeholder="Add notes..."
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Channel actions */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-white/5 space-y-2">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Actions</h3>
        <button
          onClick={generateLetter}
          disabled={generatingLetter}
          className="w-full py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          {generatingLetter ? 'Generating...' : prospect.letter_generated_at ? 'Regenerate letter' : 'Generate letter'}
        </button>
        {prospect.letter_generated_at && (
          <a
            href={`/api/admin/prospects/${prospect.id}/preview-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 transition-colors text-center"
          >
            Preview acquisition PDF
          </a>
        )}
        <button
          onClick={sendInteractiveEmail}
          disabled={sendingInteractive}
          className="w-full py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          {sendingInteractive ? 'Sending...' : 'Send interactive email'}
        </button>
        <button
          onClick={sendColdEmail}
          disabled={sendingCold}
          className="w-full py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          {sendingCold ? 'Sending...' : 'Send cold email'}
        </button>
      </div>

      {/* Phone log */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Log phone call</h3>
        <select
          value={phoneOutcome}
          onChange={e => setPhoneOutcome(e.target.value)}
          className="w-full bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Select outcome...</option>
          <option value="no_answer">No answer</option>
          <option value="not_interested">Not interested</option>
          <option value="interested">Interested</option>
          <option value="demo_booked">Demo booked</option>
        </select>
        <button
          onClick={logPhoneCall}
          disabled={!phoneOutcome}
          className="w-full py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          Log call
        </button>
      </div>
    </div>
  )
}
