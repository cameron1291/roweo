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

  if (!builder) return null

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">Update your company details and lead matching preferences.</p>
      <SettingsForm builder={builder} plan={(profile?.plan ?? 'starter') as 'starter' | 'professional' | 'growth'} />
    </div>
  )
}
