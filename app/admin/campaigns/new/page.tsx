'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CHANNELS = [
  { value: 'physical_letter', label: 'Physical Letter', desc: 'Print and post acquisition letters with a QR code linking to their demo page' },
  { value: 'interactive_email', label: 'Interactive Email', desc: 'Send a personalised email with a link to their private /demo/[slug] page' },
  { value: 'cold_email', label: 'Cold Email', desc: 'Send a plain-text cold email about Roweo' },
  { value: 'phone', label: 'Phone', desc: 'Manual outbound calls — outcomes logged per prospect' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('interactive_email')
  const [targetCount, setTargetCount] = useState(100)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!name || !channel) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description, channel, target_count: targetCount }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const data = await res.json()
      router.push(`/admin/campaigns/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating campaign')
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">New campaign</h1>

      {error && <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>}

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-500 mb-2">Campaign name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sydney extension builders — Q3 2026"
            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
            placeholder="Notes about this campaign..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-3">Channel</label>
          <div className="space-y-2">
            {CHANNELS.map(ch => (
              <label key={ch.value} className={`flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${channel === ch.value ? 'border-blue-500 bg-blue-950/30' : 'border-gray-200 bg-white hover:border-white/20'}`}>
                <input
                  type="radio"
                  name="channel"
                  value={ch.value}
                  checked={channel === ch.value}
                  onChange={() => setChannel(ch.value)}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{ch.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ch.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Target prospect count</label>
          <input
            type="number"
            value={targetCount}
            onChange={e => setTargetCount(parseInt(e.target.value) || 0)}
            min={1}
            max={1000}
            className="w-40 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={create}
            disabled={saving || !name}
            className="px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create campaign'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-md bg-gray-50 hover:bg-white/10 border border-gray-200 text-sm text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
