'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle } from 'lucide-react'

const REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'no_leads', label: 'Not enough leads in my area' },
  { id: 'enough_work', label: "Won enough work for now — I'll be back" },
  { id: 'missing_feature', label: 'Missing a feature I need' },
  { id: 'other', label: 'Other' },
]

export function BillingPanel({ subscriptionStatus, hasCustomer }: { subscriptionStatus: string; hasCustomer: boolean }) {
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelled, setCancelled] = useState<string | null>(null)

  const statusBadge: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    past_due: { label: 'Payment failed', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    inactive: { label: 'Not subscribed', cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  }
  const badge = statusBadge[subscriptionStatus] ?? statusBadge.inactive

  async function handleManageBilling() {
    setLoadingPortal(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    setLoadingPortal(false)
    if (data.url) window.location.href = data.url
  }

  async function handleSubscribe() {
    setLoadingCheckout(true)
    const res = await fetch('/api/stripe/create-checkout', { method: 'POST' })
    const data = await res.json()
    setLoadingCheckout(false)
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

  return (
    <div className="space-y-4">
      <Card className="border-white/10">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Roweo Builder Plan</p>
            <p className="text-xs text-zinc-500 mt-0.5">$299/month AUD · billed monthly</p>
          </div>
          <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
        </CardContent>
      </Card>

      {cancelled && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <CheckCircle className="w-4 h-4" />
          Subscription will end on {new Date(cancelled).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. You'll keep access until then.
        </div>
      )}

      <div className="flex items-center gap-3">
        {subscriptionStatus === 'active' || subscriptionStatus === 'past_due' ? (
          <>
            {hasCustomer && (
              <Button variant="secondary" onClick={handleManageBilling} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Manage billing & invoices'}
              </Button>
            )}
            <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
          </>
        ) : (
          <Button onClick={handleSubscribe} disabled={loadingCheckout}>
            {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe — $299/mo AUD'}
          </Button>
        )}
      </div>

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
                  reason === r.id ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
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
