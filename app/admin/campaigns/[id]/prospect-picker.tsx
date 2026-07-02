'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Prospect {
  id: string
  company_name: string
  website?: string
  fit_score?: number
  status: string
  business_type?: string
  service_suburbs?: string[]
  email?: string
  phone?: string
}

export function ProspectPicker({ campaignId, prospects }: { campaignId: string; prospects: Prospect[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(prospects.map(p => p.id)))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function addSelected() {
    if (!selected.size) return
    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/prospects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prospect_ids: [...selected] }),
      })
      const data = await res.json()
      setMessage(`Added ${data.added} prospects. ${data.total} total in campaign.`)
      setSelected(new Set())
      router.refresh()
    } catch {
      setMessage('Error adding prospects')
    }
    setAdding(false)
  }

  if (!prospects.length) {
    return (
      <div className="px-5 py-12 text-center text-gray-400 text-sm">
        No prospects match this filter. Try a different city or lower the minimum fit score.
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex gap-3 text-xs text-gray-500">
          <button onClick={selectAll} className="hover:text-gray-900 transition-colors">{selected.size === prospects.length ? '✓ All selected' : 'Select all'}</button>
          {selected.size > 0 && <button onClick={selectNone} className="hover:text-gray-900 transition-colors">Clear</button>}
          {selected.size > 0 && <span className="text-gray-700 font-medium">{selected.size} selected</span>}
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-gray-500">{message}</span>}
          <button
            onClick={addSelected}
            disabled={!selected.size || adding}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : `Add ${selected.size > 0 ? selected.size : ''} to campaign`}
          </button>
        </div>
      </div>

      {/* Prospect list */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
            <th className="w-10 px-5 py-3"></th>
            <th className="text-left px-5 py-3">Company</th>
            <th className="text-left px-5 py-3">Type</th>
            <th className="text-left px-5 py-3">Fit</th>
            <th className="text-left px-5 py-3">Contact</th>
            <th className="text-left px-5 py-3">Suburbs</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map(p => (
            <tr
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`border-b border-gray-100 cursor-pointer transition-colors text-sm ${selected.has(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <td className="px-5 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  onClick={e => e.stopPropagation()}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-5 py-3">
                <Link
                  href={`/admin/prospects/${p.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-gray-900 hover:text-blue-600 font-medium"
                >
                  {p.company_name}
                </Link>
                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="block text-xs text-gray-400 hover:text-gray-600 truncate max-w-40"
                  >
                    {p.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </td>
              <td className="px-5 py-3 text-xs text-gray-500">{p.business_type?.replace(/_/g, ' ') ?? '—'}</td>
              <td className="px-5 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(p.fit_score ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (p.fit_score ?? 0) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.fit_score ?? '?'}
                </span>
              </td>
              <td className="px-5 py-3 text-xs text-gray-500">
                {p.email && <span className="block">{p.email}</span>}
                {p.phone && <span className="block text-gray-400">{p.phone}</span>}
                {!p.email && !p.phone && <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-3 text-xs text-gray-400 max-w-32 truncate">
                {(p.service_suburbs ?? []).slice(0, 3).join(', ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
