'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Check, Package } from 'lucide-react'

interface MatchRow {
  id: string
  batch_date: string | null
  status: string
  qr_token: string
  development_applications: any
  builder_profiles: any
}

export function PrintQueueClient({ batches }: { batches: [string, MatchRow[]][] }) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [posting, setPosting] = useState<string[]>([])
  const [postedDates, setPostedDates] = useState<Set<string>>(new Set())

  if (batches.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No letters awaiting print.</p>
        <p className="text-sm mt-1">Letters appear here once builders approve them.</p>
      </div>
    )
  }

  async function generateBatchPdf(batchDate: string, matchIds: string[]) {
    setGenerating(batchDate)
    try {
      const res = await fetch('/api/admin/batch-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_date: batchDate }),
      })
      if (!res.ok) throw new Error('PDF generation failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `letters-${batchDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate PDF. Check console.')
      console.error(err)
    } finally {
      setGenerating(null)
    }
  }

  async function markPosted(batchDate: string, matchIds: string[]) {
    setPosting(matchIds)
    try {
      const res = await fetch('/api/admin/mark-posted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_ids: matchIds }),
      })
      if (res.ok) {
        setPostedDates(prev => new Set([...prev, batchDate]))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPosting([])
    }
  }

  return (
    <div className="space-y-8">
      {batches.map(([date, matches]) => {
        const matchIds = matches.map(m => m.id)
        const isPosted = postedDates.has(date)
        const approvedCount = matches.filter(m => m.status === 'letter_approved').length

        return (
          <div key={date} className="bg-white/3 border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="font-medium">
                  {date === 'Unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {matches.length} letter{matches.length !== 1 ? 's' : ''} — {approvedCount} pending print
                </p>
              </div>
              <div className="flex gap-2">
                {!isPosted && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateBatchPdf(date, matchIds)}
                      disabled={generating === date}
                    >
                      {generating === date ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Download PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => markPosted(date, matchIds)}
                      disabled={posting.length > 0}
                    >
                      {posting.length > 0 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Mark all posted
                    </Button>
                  </>
                )}
                {isPosted && (
                  <span className="text-sm text-green-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Marked as posted
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {matches.map(m => {
                const da = m.development_applications as any
                const builder = m.builder_profiles as any
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{da?.suburb}, {da?.state}</p>
                      <p className="text-xs text-zinc-500">{da?.street_address} · {da?.project_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{builder?.company_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${m.status === 'letter_approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
