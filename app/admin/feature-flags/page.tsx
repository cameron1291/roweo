import { createServiceClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import { FlagToggle } from './flag-toggle'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Feature Flags — Admin' }

const FLAG_DOCS: Record<string, string> = {
  multi_stage_campaigns: 'Letters at DA lodgement AND approval stage',
  postcard_letters: 'A5 postcard PDF option alongside letters',
  team_permissions: 'Multi-user builder accounts with roles',
  surveyor_mode: 'DA leads for surveyors and engineers',
  ai_auto_body_text: 'Auto-generate letter body via DeepSeek',
  roi_tracking: 'Builder outcome logging (enquiries, quotes, won jobs)',
}

export default async function FeatureFlagsPage() {
  const supabase = createServiceClient()
  const { data: flags } = await supabase.from('feature_flags').select('*').order('key')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-gray-400 mt-1">Toggle features without redeploying. Changes take effect immediately.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100">
        {(flags ?? []).map(flag => (
          <div key={flag.key} className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-mono font-medium text-gray-900">{flag.key}</p>
              <p className="text-xs text-gray-400 mt-0.5">{flag.description ?? FLAG_DOCS[flag.key] ?? ''}</p>
              {(flag.enabled_for_user_ids?.length ?? 0) > 0 && (
                <p className="text-xs text-blue-500 mt-0.5">Beta: enabled for {flag.enabled_for_user_ids.length} user(s)</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-medium ${flag.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                {flag.enabled ? 'On' : 'Off'}
              </span>
              <FlagToggle flagKey={flag.key} enabled={flag.enabled} />
            </div>
          </div>
        ))}
        {(flags ?? []).length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No feature flags yet. Add rows to the <span className="font-mono">feature_flags</span> table in Supabase.
          </p>
        )}
      </div>
    </div>
  )
}
