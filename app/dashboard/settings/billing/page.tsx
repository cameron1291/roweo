import { createClient } from '@/lib/supabase-server'
import { BillingPanel } from './billing-panel'

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, builderRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id, plan')
      .eq('id', user.id)
      .single(),
    supabase
      .from('builder_profiles')
      .select('letters_remaining')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">Manage your subscription and payment details.</p>
      <BillingPanel
        subscriptionStatus={profileRes.data?.subscription_status ?? 'inactive'}
        hasCustomer={!!profileRes.data?.stripe_customer_id}
        plan={(profileRes.data?.plan ?? 'professional') as string}
        lettersRemaining={builderRes.data?.letters_remaining ?? 0}
      />
    </div>
  )
}
