import { createClient } from '@/lib/supabase-server'
import { BillingPanel } from './billing-panel'

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-1">Billing</h1>
      <p className="text-sm text-zinc-400 mb-6">Manage your subscription and payment details.</p>
      <BillingPanel
        subscriptionStatus={profile?.subscription_status ?? 'inactive'}
        hasCustomer={!!profile?.stripe_customer_id}
      />
    </div>
  )
}
