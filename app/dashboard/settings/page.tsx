import { createClient } from '@/lib/supabase-server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: builder }, { data: profile }] = await Promise.all([
    supabase.from('builder_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
  ])

  if (!builder) return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm font-medium text-amber-800">Your profile isn&apos;t set up yet.</p>
      <p className="text-sm text-amber-700 mt-1">
        Complete onboarding to configure your account.{' '}
        <a href="/onboarding" className="underline font-medium">Go to onboarding →</a>
      </p>
    </div>
  )

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">Update your company details and lead matching preferences.</p>
      <SettingsForm builder={builder} plan={(profile?.plan ?? 'starter') as 'starter' | 'professional' | 'growth'} />
    </div>
  )
}
