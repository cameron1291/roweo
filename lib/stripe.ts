import Stripe from 'stripe'

export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    amount: 14900,
    currency: 'aud',
    letters_per_month: 0,
    description: 'DA alerts, dashboard, search and saved filters.',
  },
  professional: {
    name: 'Professional',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    amount: 24900,
    currency: 'aud',
    letters_per_month: 20,
    description: 'Everything in Starter + 20 letters/month + QR tracking.',
  },
  growth: {
    name: 'Growth',
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    amount: 34900,
    currency: 'aud',
    letters_per_month: 50,
    description: 'Everything in Professional + 50 letters/month + expanded radius.',
  },
} as const

export type PlanKey = keyof typeof PLANS

export const LETTER_PACKS = {
  pack_20: { priceId: process.env.STRIPE_LETTERS_20_PRICE_ID!, quantity: 20, amount: 5900 },
  pack_50: { priceId: process.env.STRIPE_LETTERS_50_PRICE_ID!, quantity: 50, amount: 12900 },
  pack_100: { priceId: process.env.STRIPE_LETTERS_100_PRICE_ID!, quantity: 100, amount: 23900 },
} as const

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as PlanKey
  }
  return null
}

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-06-24.dahlia',
    })
  }
  return _stripe
}

export async function createCheckoutSession(userId: string, email: string, plan: PlanKey = 'professional') {
  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  })
}

export async function createLetterPackCheckout(userId: string, email: string, customerId: string | undefined, pack: keyof typeof LETTER_PACKS) {
  const stripe = getStripe()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: LETTER_PACKS[pack].priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?letters=added`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    metadata: { userId, pack },
  })
}

export async function createBillingPortalSession(customerId: string) {
  const stripe = getStripe()
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  })
}
