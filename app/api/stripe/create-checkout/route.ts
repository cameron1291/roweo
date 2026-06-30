import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createCheckoutSession, createLetterPackCheckout, type PlanKey, LETTER_PACKS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const body = await req.json().catch(() => ({}))
  const plan = (body.plan as PlanKey) ?? 'professional'
  const pack = body.pack as keyof typeof LETTER_PACKS | undefined

  try {
    if (pack) {
      const session = await createLetterPackCheckout(
        user.id,
        profile?.email ?? user.email ?? '',
        profile?.stripe_customer_id ?? '',
        pack
      )
      return NextResponse.json({ url: session.url })
    }

    const session = await createCheckoutSession(user.id, profile?.email ?? user.email ?? '', plan)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
