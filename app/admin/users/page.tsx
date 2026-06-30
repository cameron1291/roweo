import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  past_due: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  inactive: 'bg-zinc-500/20 text-zinc-400',
}

export default async function UsersPage() {
  const supabase = createServiceClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id, email, subscription_status, created_at,
      builder_profiles(company_name, service_suburbs, project_types, letters_sent_count)
    `)
    .neq('role', 'admin')
    .order('created_at', { ascending: false })

  const matchCounts: Record<string, number> = {}
  if (profiles && profiles.length > 0) {
    const userIds = profiles.map(p => p.id)
    const { data: matches } = await supabase
      .from('lead_matches')
      .select('user_id')
      .in('user_id', userIds)

    for (const m of matches ?? []) {
      matchCounts[m.user_id] = (matchCounts[m.user_id] ?? 0) + 1
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Builder Accounts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{profiles?.length ?? 0} total</p>
        </div>
      </div>

      <div className="bg-white/3 border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Builder</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Matches</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Letters sent</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Service areas</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(profiles ?? []).map(profile => {
              const builder = (profile as any).builder_profiles as any
              const statusStyle = STATUS_STYLES[profile.subscription_status] ?? STATUS_STYLES.inactive
              return (
                <tr key={profile.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{builder?.company_name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{profile.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusStyle}`}>
                      {profile.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{matchCounts[profile.id] ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-300">{builder?.letters_sent_count ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {(builder?.service_suburbs as string[] ?? []).slice(0, 3).join(', ')}
                    {(builder?.service_suburbs?.length ?? 0) > 3 && ` +${builder.service_suburbs.length - 3}`}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {new Date(profile.created_at).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              )
            })}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No builder accounts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
