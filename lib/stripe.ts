import Stripe from 'stripe'

export const PLANS = {
  BUILDER: {
    name: 'Builder',
    priceId: process.env.STRIPE_BUILDER_PRICE_ID!,
    amount: 29900, // $299 AUD in cents
    currency: 'aud',
  },
} as const

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-06-24.dahlia',
    })
  }
  return _stripe
}

export async function createCheckoutSession(userId: string, email: string) {
  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: PLANS.BUILDER.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  })
}

export async function createBillingPortalSession(customerId: string) {
  const stripe = getStripe()
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  })
}
