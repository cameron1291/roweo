import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Bell, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Notifications — Roweo' }

const TYPE_STYLES: Record<string, { label: string; dot: string }> = {
  new_lead: { label: 'New lead', dot: 'bg-blue-400' },
  letter_scanned: { label: 'Letter scanned', dot: 'bg-emerald-400' },
  payment_failed: { label: 'Payment failed', dot: 'bg-red-400' },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const items = notifications ?? []
  const unreadIds = items.filter(n => !n.read).map(n => n.id)

  // Mark all as read
  if (unreadIds.length > 0) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        {unreadIds.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
            {unreadIds.length} new
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-10 h-10 text-gray-200 mb-4" />
          <p className="text-sm text-gray-400">No notifications yet.</p>
          <p className="text-xs text-gray-300 mt-1">You&apos;ll be notified here when homeowners scan your letters or new leads come in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100">
          {items.map(n => {
            const style = TYPE_STYLES[n.type] ?? { label: n.type, dot: 'bg-gray-300' }
            const isNew = unreadIds.includes(n.id)
            const content = (
              <div className={`px-5 py-4 flex items-start gap-3 ${isNew ? 'bg-blue-50/50' : ''}`}>
                <div className="mt-1.5 shrink-0">
                  {isNew
                    ? <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    : <CheckCircle className="w-3.5 h-3.5 text-gray-200" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-0.5">
                    <span className="text-xs font-medium text-gray-400">{style.label}</span>
                    <span className="text-xs text-gray-300 shrink-0">
                      {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                </div>
              </div>
            )

            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-gray-50 transition-colors">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
