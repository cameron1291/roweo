'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, Mail, ArrowRight } from 'lucide-react'

const PLAN_DISPLAY: Record<string, { name: string; price: string; description: string }> = {
  starter: { name: 'Starter', price: '$149/mo', description: 'DA alerts + dashboard + 10km radius' },
  professional: { name: 'Professional', price: '$249/mo', description: '20 letters/month + 20km radius' },
  growth: { name: 'Growth', price: '$349/mo', description: '50 letters/month + up to 50km radius' },
}

// Plans a given plan can upgrade to, in order
const UPGRADE_PATHS: Record<string, string[]> = {
  starter: ['professional', 'growth'],
  professional: ['growth'],
  growth: [],
}

const LETTER_PACKS = [
  { key: 'pack_20', label: '20 letters', price: '$59', priceNote: '$2.95 per letter' },
  { key: 'pack_50', label: '50 letters', price: '$129', priceNote: '$2.58 per letter' },
  { key: 'pack_100', label: '100 letters', price: '$239', priceNote: '$2.39 per letter' },
] as const

const REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'no_leads', label: 'Not enough leads in my area' },
  { id: 'enough_work', label: "Won enough work for now — I'll be back" },
  { id: 'missing_feature', label: 'Missing a feature I need' },
  { id: 'other', label: 'Other' },
]

interface Props {
  subscriptionStatus: string
  hasCustomer: boolean
  plan: string
  lettersRemaining: number
}

export function BillingPanel({ subscriptionStatus, hasCustomer, plan, lettersRemaining }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelled, setCancelled] = useState<string | null>(null)

  const planDisplay = PLAN_DISPLAY[plan] ?? PLAN_DISPLAY.professional
  const upgradePlans = UPGRADE_PATHS[plan] ?? []

  const statusBadge: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    past_due: { label: 'Payment failed', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    inactive: { label: 'Not subscribed', cls: 'bg-zinc-500/20 text-gray-500 border-zinc-500/30' },
  }
  const badge = statusBadge[subscriptionStatus] ?? statusBadge.inactive

  async function handleManageBilling() {
    setLoadingPortal(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    setLoadingPortal(false)
    if (data.url) window.location.href = data.url
  }

  async function handleSubscribe(targetPlan = 'professional') {
    setLoadingCheckout(true)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan }),
    })
    const data = await res.json()
    setLoadingCheckout(false)
    if (data.url) window.location.href = data.url
  }

  async function handleBuyPack(packKey: string) {
    setLoadingPack(packKey)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: packKey }),
    })
    const data = await res.json()
    setLoadingPack(null)
    if (data.url) window.location.href = data.url
  }

  async function handleConfirmCancel() {
    if (!reason) return
    setSubmitting(true)
    const res = await fetch('/api/cancel-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, detail }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setCancelled(data.access_until)
      setCancelOpen(false)
    }
  }

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'past_due'

  return (
    <div className="space-y-6">

      {/* Current plan */}
      <Card className="border-gray-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 font-medium">Roweo {planDisplay.name} Plan</p>
            <p className="text-xs text-gray-400 mt-0.5">{planDisplay.price} · billed monthly · {planDisplay.description}</p>
          </div>
          <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
        </CardContent>
      </Card>

      {/* Upgrade options — only shown for subscribed users on a lower tier */}
      {isSubscribed && upgradePlans.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Upgrade your plan</p>
          {upgradePlans.map(targetPlan => {
            const p = PLAN_DISPLAY[targetPlan]!
            return (
              <Card key={targetPlan} className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name} — {p.price}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSubscribe(targetPlan)}
                    disabled={loadingCheckout}
                    className="shrink-0"
                  >
                    {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Upgrade <ArrowRight className="w-3 h-3 ml-1" /></>}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {cancelled && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <CheckCircle className="w-4 h-4" />
          Subscription will end on {new Date(cancelled).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. You&apos;ll keep access until then.
        </div>
      )}

      {/* New subscriber — show plan picker */}
      {!isSubscribed && !cancelled && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Choose a plan</p>
          {(['starter', 'professional', 'growth'] as const).map(p => {
            const pd = PLAN_DISPLAY[p]!
            return (
              <Card key={p} className="border-gray-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pd.name} — {pd.price}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pd.description}</p>
                  </div>
                  <Button size="sm" onClick={() => handleSubscribe(p)} disabled={loadingCheckout} className="shrink-0">
                    {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        {isSubscribed && (
          <>
            {hasCustomer && (
              <Button variant="secondary" onClick={handleManageBilling} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Manage billing & invoices'}
              </Button>
            )}
            {!cancelled && (
              <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setCancelOpen(true)}>
                Cancel subscription
              </Button>
            )}
          </>
        )}
      </div>

      {/* Letter pack top-ups */}
      {isSubscribed && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Top up letters</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              You have <span className="text-gray-700 font-medium">{lettersRemaining} letter{lettersRemaining !== 1 ? 's' : ''}</span> remaining. Purchase additional letters below.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {LETTER_PACKS.map(pack => (
              <Card key={pack.key} className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{pack.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{pack.price}</p>
                  <p className="text-xs text-gray-400 mb-3">{pack.priceNote}</p>
                  <Button
                    size="sm"
                    className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-xs"
                    onClick={() => handleBuyPack(pack.key)}
                    disabled={loadingPack !== null}
                  >
                    {loadingPack === pack.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      `Buy ${pack.label}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you go — why are you cancelling?</DialogTitle>
            <DialogDescription>
              Your access will continue until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {REASONS.map(r => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                  reason === r.id ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-zinc-700 text-gray-700 hover:border-zinc-500'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {(reason === 'missing_feature' || reason === 'other') && (
            <Textarea
              placeholder="Tell us more…"
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep subscription</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={!reason || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
