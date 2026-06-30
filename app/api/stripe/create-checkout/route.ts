import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  try {
    const session = await createCheckoutSession(user.id, profile?.email ?? user.email ?? '')
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
