'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: string
  status: string
  channel: string
}

export function CampaignActions({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setUpdating(true)
    setMessage(null)
    try {
      await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setMessage(`Status updated to ${status}`)
      router.refresh()
    } catch { setMessage('Error') }
    setUpdating(false)
  }

  async function bulkSend() {
    if (!confirm(`Send ${campaign.channel.replace(/_/g, ' ')} to all prospects in this campaign? This cannot be undone.`)) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/bulk-send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: campaign.channel }),
      })
      const data = await res.json()
      setMessage(`Sent to ${data.sent} prospects`)
      router.refresh()
    } catch { setMessage('Error sending') }
    setSending(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {message && <span className="text-xs text-gray-500">{message}</span>}
      <div className="flex gap-2">
        {campaign.status === 'draft' && (
          <button
            onClick={() => updateStatus('active')}
            disabled={updating}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors disabled:opacity-50"
          >
            Activate campaign
          </button>
        )}
        {campaign.status === 'active' && (
          <>
            {(campaign.channel === 'interactive_email' || campaign.channel === 'cold_email') && (
              <button
                onClick={bulkSend}
                disabled={sending}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send to all prospects'}
              </button>
            )}
            <button
              onClick={() => updateStatus('completed')}
              disabled={updating}
              className="px-4 py-2 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors disabled:opacity-50"
            >
              Mark complete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
