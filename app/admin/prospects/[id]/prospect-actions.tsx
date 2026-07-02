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
  const [sendingFollowup, setSendingFollowup] = useState(false)
  const [followupTemplate, setFollowupTemplate] = useState('post_letter_no_scan')
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessage(err.error ?? 'Email send failed')
      } else {
        setMessage('Interactive email sent')
        router.refresh()
      }
    } catch { setMessage('Email send failed') }
    setSendingInteractive(false)
  }

  async function sendColdEmail() {
    setSendingCold(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/send-cold-email`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessage(err.error ?? 'Email send failed')
      } else {
        setMessage('Cold email sent')
        router.refresh()
      }
    } catch { setMessage('Email send failed') }
    setSendingCold(false)
  }

  async function sendFollowup() {
    setSendingFollowup(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/send-followup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ template: followupTemplate }),
      })
      if (!res.ok) throw new Error()
      setMessage('Follow-up email sent')
      router.refresh()
    } catch { setMessage('Follow-up send failed') }
    setSendingFollowup(false)
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
        <div className="bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded-md">{message}</div>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Status</h3>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none"
        >
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Notes</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
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
      <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
        <button
          onClick={generateLetter}
          disabled={generatingLetter}
          className="w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {generatingLetter ? 'Generating...' : prospect.letter_generated_at ? 'Regenerate letter' : 'Generate letter'}
        </button>
        {prospect.letter_generated_at && (
          <a
            href={`/api/admin/prospects/${prospect.id}/preview-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors text-center"
          >
            Preview acquisition PDF
          </a>
        )}
        <button
          onClick={sendInteractiveEmail}
          disabled={sendingInteractive}
          className="w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {sendingInteractive ? 'Sending...' : 'Send interactive email'}
        </button>
        <button
          onClick={sendColdEmail}
          disabled={sendingCold}
          className="w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {sendingCold ? 'Sending...' : 'Send cold email'}
        </button>
      </div>

      {/* Follow-up email */}
      <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Send follow-up</h3>
        <select
          value={followupTemplate}
          onChange={e => setFollowupTemplate(e.target.value)}
          className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none"
        >
          <option value="post_letter_no_scan">After letter — no scan yet</option>
          <option value="post_view_no_cta">Demo viewed — no CTA click</option>
          <option value="post_scan_no_trial">Scanned but no trial started</option>
        </select>
        <button
          onClick={sendFollowup}
          disabled={sendingFollowup}
          className="w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {sendingFollowup ? 'Sending...' : 'Send follow-up email'}
        </button>
      </div>

      {/* Phone log */}
      <div className="bg-white rounded-lg p-4 border border-gray-100 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Log phone call</h3>
        <select
          value={phoneOutcome}
          onChange={e => setPhoneOutcome(e.target.value)}
          className="w-full bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none"
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
          className="w-full py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          Log call
        </button>
      </div>
    </div>
  )
}
