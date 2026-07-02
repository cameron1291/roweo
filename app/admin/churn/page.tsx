import { createServiceClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Churn Feedback — Admin' }

const REASON_LABELS: Record<string, string> = {
  too_expensive: 'Too expensive',
  no_leads: 'Not enough leads',
  enough_work: 'Won enough work',
  missing_feature: 'Missing feature',
  other: 'Other',
}

export default async function ChurnPage() {
  const supabase = createServiceClient()

  const [feedbackRes, allRes] = await Promise.all([
    supabase
      .from('churn_feedback')
      .select('id, reason, detail, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('churn_feedback').select('reason'),
  ])

  const feedback = feedbackRes.data ?? []
  const all = allRes.data ?? []

  const reasonCounts: Record<string, number> = {}
  for (const f of all) {
    const r = f.reason ?? 'other'
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1
  }
  const sorted = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Churn Feedback</h1>
        <p className="text-sm text-gray-400 mt-1">{all.length} cancellation{all.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {/* Reason breakdown */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {sorted.map(([reason, count]) => (
            <div key={reason} className="bg-white rounded-lg p-4 border border-gray-100">
              <p className="text-2xl font-semibold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-1">{REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-300 mt-0.5">{all.length > 0 ? Math.round((count / all.length) * 100) : 0}% of cancellations</p>
            </div>
          ))}
        </div>
      )}

      {/* Individual feedback */}
      <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100">
        {feedback.map(f => (
          <div key={f.id} className="px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                {REASON_LABELS[f.reason ?? 'other'] ?? (f.reason ?? 'other').replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(f.created_at).toLocaleDateString('en-AU')}
              </span>
            </div>
            {f.detail && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.detail}</p>}
          </div>
        ))}
        {feedback.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No churn feedback yet. Responses from the cancellation survey will appear here.
          </p>
        )}
      </div>
    </div>
  )
}
