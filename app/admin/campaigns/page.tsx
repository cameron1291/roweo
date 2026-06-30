import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Campaigns — Admin' }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  active: 'bg-blue-950 text-blue-400',
  completed: 'bg-emerald-950 text-emerald-400',
}

const CHANNEL_LABELS: Record<string, string> = {
  physical_letter: 'Physical Letter',
  interactive_email: 'Interactive Email',
  cold_email: 'Cold Email',
  phone: 'Phone',
}

export default async function CampaignsPage() {
  const supabase = createServiceClient()

  const { data: campaigns } = await supabase
    .from('acquisition_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Multi-channel prospect acquisition campaigns</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
        >
          + New campaign
        </Link>
      </div>

      <div className="space-y-3">
        {(campaigns ?? []).map(c => (
          <Link
            key={c.id}
            href={`/admin/campaigns/${c.id}`}
            className="block bg-zinc-900 rounded-lg p-5 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-white font-medium">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {c.status}
                  </span>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {CHANNEL_LABELS[c.channel] ?? c.channel}
                  </span>
                </div>
                {c.description && <p className="text-sm text-zinc-500">{c.description}</p>}
              </div>
              <div className="text-right shrink-0 ml-6">
                <p className="text-white font-semibold">{c.prospect_count ?? 0}<span className="text-zinc-500 font-normal text-sm"> / {c.target_count ?? '?'}</span></p>
                <p className="text-xs text-zinc-600 mt-1">prospects</p>
              </div>
            </div>
            <div className="flex gap-6 mt-3 text-xs text-zinc-600">
              <span>Created {new Date(c.created_at).toLocaleDateString('en-AU')}</span>
              {c.started_at && <span>Started {new Date(c.started_at).toLocaleDateString('en-AU')}</span>}
              {c.completed_at && <span>Completed {new Date(c.completed_at).toLocaleDateString('en-AU')}</span>}
            </div>
          </Link>
        ))}
        {(campaigns ?? []).length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-sm">No campaigns yet.</p>
            <Link href="/admin/campaigns/new" className="text-sm text-blue-500 hover:text-blue-400 mt-2 inline-block">Create your first campaign →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
