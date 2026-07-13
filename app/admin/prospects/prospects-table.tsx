'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, Mail, CheckSquare, Square, Printer, Wand2 } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  scraped: 'bg-gray-100 text-gray-500',
  reviewed: 'bg-blue-950 text-blue-400',
  approved: 'bg-indigo-950 text-indigo-400',
  active: 'bg-violet-950 text-violet-400',
  demo_booked: 'bg-cyan-950 text-cyan-400',
  trial_started: 'bg-yellow-950 text-yellow-400',
  paid: 'bg-emerald-950 text-emerald-400',
  lost: 'bg-red-950 text-red-400',
  not_suitable: 'bg-white text-gray-400 border border-gray-200',
}

const OUTCOME_STYLES: Record<string, string> = {
  no_answer: 'bg-gray-100 text-gray-500',
  not_interested: 'bg-red-50 text-red-500',
  interested: 'bg-yellow-50 text-yellow-600',
  demo_booked: 'bg-emerald-50 text-emerald-600',
}

function completenessBadge(score: number) {
  if (score >= 80) return 'bg-emerald-950 text-emerald-400'
  if (score >= 60) return 'bg-blue-950 text-blue-400'
  if (score >= 40) return 'bg-yellow-950 text-yellow-400'
  return 'bg-gray-100 text-gray-400'
}

function Tick({ at, label }: { at: string | null | undefined; label: string }) {
  if (!at) return <span className="text-gray-300 select-none">·</span>
  return (
    <span
      title={`${label}: ${new Date(at).toLocaleDateString('en-AU')}`}
      className="text-emerald-500 font-semibold cursor-default"
    >
      ✓
    </span>
  )
}

export type ProspectRow = {
  id: string
  company_name: string
  website: string | null
  email: string | null
  phone: string | null
  postal_address: string | null
  business_type: string | null
  employee_count_est: string | null
  completeness_score: number | null
  status: string
  letter_generated_at: string | null
  letter_posted_at: string | null
  interactive_email_sent_at: string | null
  phone_call_at: string | null
  phone_outcome: string | null
  interactive_letter_viewed_at: string | null
  created_at: string
}

interface Props {
  prospects: ProspectRow[]
}

export function ProspectsTable({ prospects }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [emailResult, setEmailResult] = useState<{ sent: number; skipped: number; failed: string[]; error?: string } | null>(null)
  const [batchInfo, setBatchInfo] = useState<{ type: 'print' | 'email'; remaining: number } | null>(null)
  const [isEmailPending, startEmailTransition] = useTransition()
  const [isPrintPending, startPrintTransition] = useTransition()
  const [isAutoSelectPending, startAutoSelectTransition] = useTransition()

  const selectableIds = prospects
    .filter(p => !['not_suitable', 'lost'].includes(p.status))
    .map(p => p.id)

  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableIds))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkSend() {
    setEmailResult(null)
    setBatchInfo(null)
    const toSend = Array.from(selected)
    if (toSend.length === 0) return
    startEmailTransition(async () => {
      try {
        const res = await fetch('/api/admin/prospects/bulk-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_ids: toSend }),
        })
        const text = await res.text()
        let data: { sent: number; skipped: number; failed: string[]; error?: string }
        try {
          data = JSON.parse(text)
        } catch {
          data = { sent: 0, skipped: 0, failed: [], error: `Server error ${res.status} — check Vercel logs` }
        }
        if (!res.ok && !data.error) data.error = `Request failed (${res.status})`
        setEmailResult(data)
        setSelected(new Set())
      } catch (err) {
        setEmailResult({ sent: 0, skipped: 0, failed: [], error: err instanceof Error ? err.message : 'Network error — try again' })
      }
    })
  }

  function handleBulkPrint() {
    setBatchInfo(null)
    startPrintTransition(async () => {
      try {
        const res = await fetch('/api/admin/prospects/bulk-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_ids: Array.from(selected) }),
        })
        if (!res.ok) throw new Error('PDF generation failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `roweo-acquisition-letters-${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        setSelected(new Set())
      } catch (err) {
        alert('Failed to generate PDF. Check console.')
        console.error(err)
      }
    })
  }

  function handleAutoSelect(type: 'print' | 'email') {
    setEmailResult(null)
    setBatchInfo(null)
    startAutoSelectTransition(async () => {
      const res = await fetch(`/api/admin/prospects/next-batch?type=${type}&limit=100`)
      const data = await res.json()
      if (!res.ok || !data.ids) return
      setSelected(new Set(data.ids as string[]))
      setBatchInfo({ type, remaining: data.total_remaining as number })
    })
  }

  return (
    <>
      {/* Auto-select bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Auto-select next 100:</span>
        <button
          onClick={() => handleAutoSelect('print')}
          disabled={isAutoSelectPending || isPrintPending || isEmailPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {isAutoSelectPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Wand2 className="w-3.5 h-3.5 text-gray-400" />
          }
          For print
        </button>
        <button
          onClick={() => handleAutoSelect('email')}
          disabled={isAutoSelectPending || isPrintPending || isEmailPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors disabled:opacity-50"
        >
          {isAutoSelectPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Wand2 className="w-3.5 h-3.5 text-gray-400" />
          }
          For email
        </button>
      </div>

      {/* Batch info banner */}
      {batchInfo && (
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800 flex items-center justify-between">
          <span>
            <span className="font-semibold">{selected.size} prospects</span> selected for {batchInfo.type} —{' '}
            <span className="text-blue-600">{batchInfo.remaining.toLocaleString()} total remaining in queue</span>
          </span>
          <button onClick={() => { setSelected(new Set()); setBatchInfo(null) }} className="text-blue-400 hover:text-blue-700 text-xs ml-4">Clear</button>
        </div>
      )}

      {/* Bulk action bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-blue-500" />
              : <Square className="w-4 h-4" />
            }
            {allSelected ? 'Deselect all' : `Select all (${selectableIds.length})`}
          </button>
          {selected.size > 0 && (
            <span className="text-sm text-blue-600 font-medium">{selected.size} selected</span>
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkPrint}
              disabled={isPrintPending || isEmailPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {isPrintPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Printer className="w-4 h-4" /> Print letters ({selected.size})</>
              }
            </button>
            <button
              onClick={handleBulkSend}
              disabled={isEmailPending || isPrintPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {isEmailPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Mail className="w-4 h-4" /> Send emails ({selected.size})</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Result banner */}
      {emailResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${emailResult.error ? 'bg-red-50 border-red-200 text-red-800' : (emailResult.failed?.length ?? 0) > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {emailResult.error
            ? <span className="font-medium">Error: {emailResult.error}</span>
            : <>
                <span className="font-medium">{emailResult.sent} sent</span>
                {emailResult.skipped > 0 && <span className="ml-2 text-gray-500">· {emailResult.skipped} skipped (no email / already sent)</span>}
                {(emailResult.failed?.length ?? 0) > 0 && <span className="ml-2 text-red-600">· {emailResult.failed.length} failed: {emailResult.failed.slice(0, 3).join(', ')}{emailResult.failed.length > 3 ? '…' : ''}</span>}
              </>
          }
        </div>
      )}

      {/* Funnel key */}
      <div className="flex items-center gap-6 mb-4 text-xs text-gray-400">
        <span><span className="text-emerald-500 font-semibold">✓</span> = done</span>
        <span><span className="text-gray-300">·</span> = not yet</span>
        <span className="text-gray-300">|</span>
        <span>Letter: <em>generated / posted</em></span>
        <span>Email: <em>interactive letter sent</em></span>
        <span>Call: <em>outcome logged</em></span>
        <span>Demo: <em>page viewed</em></span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-8" />
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Employees</th>
              <th className="text-left px-4 py-3" title="Data completeness score 0–100%">Complete</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3" title="Letter generated / letter posted">Letter</th>
              <th className="text-left px-4 py-3" title="Interactive email sent">Email</th>
              <th className="text-left px-4 py-3" title="Phone call outcome">Call</th>
              <th className="text-left px-4 py-3" title="Demo page viewed">Demo</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map(p => {
              const canSelect = !['not_suitable', 'lost'].includes(p.status)
              const isSelected = selected.has(p.id)
              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    {canSelect ? (
                      <button onClick={() => toggle(p.id)} className="flex items-center justify-center">
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-blue-500" />
                          : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                        }
                      </button>
                    ) : (
                      <span className="w-4 h-4 block" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/prospects/${p.id}`} className="text-gray-900 hover:text-blue-600 font-medium text-sm">
                      {p.company_name}
                    </Link>
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-400 hover:text-gray-600 truncate max-w-44">
                        {p.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {p.email && (
                      <span className="block text-xs text-blue-400 mt-0.5">{p.email}</span>
                    )}
                    {p.phone && (
                      <span className="block text-xs text-gray-500">{p.phone}</span>
                    )}
                    {p.postal_address && (
                      <span className="block text-xs text-gray-400 truncate max-w-44">{p.postal_address}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.business_type?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.employee_count_est ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {p.employee_count_est === '1' ? 'Sole trader' : `${p.employee_count_est} staff`}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${completenessBadge(p.completeness_score ?? 0)}`}>
                      {p.completeness_score ?? 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Tick at={p.letter_generated_at} label="Letter generated" />
                      <span className="text-gray-200 text-xs">/</span>
                      <Tick at={p.letter_posted_at} label="Letter posted" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Tick at={p.interactive_email_sent_at} label="Interactive email sent" />
                  </td>
                  <td className="px-4 py-3">
                    {p.phone_call_at ? (
                      <span
                        title={`Called ${new Date(p.phone_call_at).toLocaleDateString('en-AU')}`}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${OUTCOME_STYLES[p.phone_outcome ?? ''] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {(p.phone_outcome ?? 'logged').replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm select-none">·</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Tick at={p.interactive_letter_viewed_at} label="Demo page viewed" />
                  </td>
                </tr>
              )
            })}
            {prospects.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-gray-400 text-sm">
                  No prospects match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
