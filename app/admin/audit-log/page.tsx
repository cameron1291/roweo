import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Audit Log — Admin' }

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createServiceClient()
  const page = parseInt(params.page ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, user_id, ip_address, created_at, metadata', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params.action) query = query.eq('action', params.action)

  const { data: logs, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-1">{(count ?? 0).toLocaleString()} total events</p>
        </div>
        {params.action && (
          <Link href="/admin/audit-log" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Clear filter
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">When</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(logs ?? []).map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/audit-log?action=${log.action}`}
                    className="font-mono text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded transition-colors"
                  >
                    {log.action}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {log.entity_type && <span>{log.entity_type}</span>}
                  {log.entity_id && (
                    <span className="text-gray-300 ml-1 font-mono">{String(log.entity_id).slice(0, 8)}…</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                  {log.user_id ? String(log.user_id).slice(0, 8) + '…' : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  No audit events yet. Admin actions (batch PDF, mark posted, etc.) will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {page > 1 && (
            <Link href={`?${params.action ? `action=${params.action}&` : ''}page=${page - 1}`} className="px-3 py-1.5 rounded border border-gray-200 text-sm text-gray-500 hover:text-gray-900 transition-colors">← Prev</Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-400">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`?${params.action ? `action=${params.action}&` : ''}page=${page + 1}`} className="px-3 py-1.5 rounded border border-gray-200 text-sm text-gray-500 hover:text-gray-900 transition-colors">Next →</Link>
          )}
        </div>
      )}
    </div>
  )
}
