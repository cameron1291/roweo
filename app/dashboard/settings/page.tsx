import { createClient } from '@/lib/supabase-server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: builder } = await supabase
    .from('builder_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!builder) return null

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-1">Company settings</h1>
      <p className="text-sm text-zinc-400 mb-6">Update your company details and lead matching preferences.</p>
      <SettingsForm builder={builder} />
    </div>
  )
}
