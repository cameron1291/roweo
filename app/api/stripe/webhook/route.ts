import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getPlanByPriceId, LETTER_PACKS, PLANS } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { sendAccountSuspendedEmail, sendAccountReactivatedEmail, sendPaymentFailedEmail } from '@/lib/emails'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ received: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId) break

        // Handle letter pack purchase (one-time payment)
        if (session.mode === 'payment') {
          const pack = session.metadata?.pack as keyof typeof LETTER_PACKS | undefined
          if (!pack || !LETTER_PACKS[pack]) break
          const qty = LETTER_PACKS[pack].quantity
          // Atomic increment — avoids race condition if two webhooks fire concurrently
          await supabase.rpc('add_letters', { p_user_id: userId, p_amount: qty })
          break
        }

        if (session.mode !== 'subscription') break

        const planKey = session.metadata?.plan ?? 'professional'
        const { data: existingProfile } = await supabase.from('profiles').select('subscription_status, email').eq('id', userId).single()
        const isReactivation = existingProfile?.subscription_status === 'cancelled'

        // Retrieve subscription to get the price ID and amount
        const stripeSubscription = await getStripe().subscriptions.retrieve(session.subscription as string)
        const priceId = stripeSubscription.items.data[0]?.price.id
        const resolvedPlan = getPlanByPriceId(priceId) ?? planKey
        const amountAud = stripeSubscription.items.data[0]?.price.unit_amount ?? 0

        await supabase.from('profiles').update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          plan: resolvedPlan,
        }).eq('id', userId)

        // Initialise letter quota — Professional=20, Growth=50, Starter=0
        const lettersPerMonth = PLANS[resolvedPlan as keyof typeof PLANS]?.letters_per_month ?? 0
        await supabase.from('builder_profiles').update({
          letters_remaining: lettersPerMonth,
          letters_used_this_month: 0,
          quota_reset_at: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        }).eq('user_id', userId)

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: isReactivation ? 'reactivated' : 'subscribed',
          amount_aud: amountAud,
          stripe_event_id: event.id,
        })

        if (isReactivation && existingProfile?.email) {
          sendAccountReactivatedEmail(existingProfile.email).catch(() => {})
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_status: 'cancelled',
          plan: 'inactive',
        }).eq('stripe_subscription_id', sub.id)

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: 'cancelled',
          stripe_event_id: event.id,
        })

        const { data: p } = await supabase.from('profiles').select('email').eq('id', userId).single()
        if (p?.email) sendAccountSuspendedEmail(p.email).catch(() => {})
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : 'inactive'

        // Resolve plan from price ID so upgrades/downgrades via Stripe portal update the DB
        const priceId = sub.items.data[0]?.price.id
        const resolvedPlan = priceId ? getPlanByPriceId(priceId) : null

        await supabase.from('profiles').update({
          subscription_status: status,
          ...(resolvedPlan ? { plan: resolvedPlan } : {}),
        }).eq('stripe_subscription_id', sub.id)

        // Log the event for idempotency and audit trail
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()
        if (updatedProfile) {
          await supabase.from('subscription_events').insert({
            user_id: updatedProfile.id,
            event_type: 'subscription_updated',
            stripe_event_id: event.id,
          })
        }

        // Reset monthly letter quota on renewal (new billing period)
        // Detect renewal: current_period_end advanced — only reset if subscription is active
        if (status === 'active' && resolvedPlan) {
          const lettersPerMonth = PLANS[resolvedPlan]?.letters_per_month ?? 0
          if (lettersPerMonth > 0) {
            const newPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_subscription_id', sub.id)
              .single()
            if (profileRow) {
              const { data: bp } = await supabase
                .from('builder_profiles')
                .select('quota_reset_at')
                .eq('user_id', profileRow.id)
                .single()
              // Only reset if this is a new billing period (not just a plan change mid-cycle)
              if (!bp?.quota_reset_at || new Date(bp.quota_reset_at) < new Date(sub.current_period_end * 1000)) {
                await supabase.from('builder_profiles').update({
                  letters_remaining: lettersPerMonth,
                  letters_used_this_month: 0,
                  quota_reset_at: newPeriodEnd,
                }).eq('user_id', profileRow.id)
              }
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', profile.id)

        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: 'payment_failed',
          stripe_event_id: event.id,
        })

        // Notify builder
        if (profile.email) sendPaymentFailedEmail(profile.email).catch(() => {})
        // Notify admin
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `Payment failed — ${profile.full_name ?? profile.email}`,
          html: `<p>Payment failed for ${profile.full_name ?? 'builder'} (${profile.email}). Check Stripe for retry status.</p>`,
        })
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err)
    try {
      await supabase.from('webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
    } catch { /* best-effort */ }
    // Return 500 so Stripe retries — the idempotency check at the top of this
    // handler ensures a successful retry won't double-process the event
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
