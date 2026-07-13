'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, X, Search, CheckCircle } from 'lucide-react'
import type { BuilderProfile } from '@/types/database'

const PROJECT_TYPES = [
  { id: 'new_dwelling', label: 'New Dwellings' },
  { id: 'extension', label: 'Extensions' },
  { id: 'renovation', label: 'Renovations' },
  { id: 'pool', label: 'Pools & Spas' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'commercial', label: 'Light Commercial' },
]

export function SettingsForm({ builder, plan }: { builder: BuilderProfile; plan: 'starter' | 'professional' | 'growth' }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suburbQuery, setSuburbQuery] = useState('')
  const [suburbResults, setSuburbResults] = useState<{ name: string; state: string }[]>([])
  const [radiusKm, setRadiusKm] = useState<number>((builder as any).service_radius_km ?? 25)
  const [radiusSaving, setRadiusSaving] = useState(false)

  const [form, setForm] = useState({
    company_name: builder.company_name,
    phone: builder.phone ?? '',
    website: builder.website ?? '',
    license_number: builder.license_number ?? '',
    service_suburbs: builder.service_suburbs,
    project_types: builder.project_types,
    min_value_aud: builder.min_value_aud,
    max_value_aud: builder.max_value_aud,
    auto_send: builder.auto_send,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function searchSuburbs(q: string) {
    setSuburbQuery(q)
    if (q.length < 2) { setSuburbResults([]); return }
    const res = await fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}`)
    setSuburbResults(await res.json())
  }

  function addSuburb(name: string) {
    if (!form.service_suburbs.includes(name)) {
      set('service_suburbs', [...form.service_suburbs, name])
    }
    setSuburbQuery('')
    setSuburbResults([])
  }

  function toggleProjectType(id: string) {
    set('project_types', (form.project_types.includes(id as any)
      ? form.project_types.filter(t => t !== id)
      : [...form.project_types, id]) as any)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
  }

  async function handleRadiusSave(km: number) {
    setRadiusSaving(true)
    await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_radius_km: km }),
    })
    setRadiusSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Company details</h2>
          <div className="space-y-1.5">
            <Label>Company name</Label>
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Licence number</Label>
            <Input value={form.license_number} onChange={e => set('license_number', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Service suburbs</h2>
          <div className="flex flex-wrap gap-2">
            {form.service_suburbs.map(s => (
              <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                {s}
                <button onClick={() => set('service_suburbs', form.service_suburbs.filter(x => x !== s))} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Add a suburb…" value={suburbQuery} onChange={e => searchSuburbs(e.target.value)} />
            {suburbResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-gray-100 border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                {suburbResults.map(s => (
                  <button key={s.name} onClick={() => addSuburb(`${s.name}, ${s.state}`)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-200 text-gray-900">
                    {s.name}, {s.state}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Project types</h2>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map(pt => {
              const selected = form.project_types.includes(pt.id as any)
              return (
                <button
                  key={pt.id}
                  onClick={() => toggleProjectType(pt.id)}
                  className={`text-left p-2.5 rounded-lg border text-sm flex items-center justify-between transition-colors ${
                    selected ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-zinc-700 text-gray-700 hover:border-zinc-500'
                  }`}
                >
                  {pt.label}
                  {selected && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Value range</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Minimum (AUD)</Label>
              <Input type="number" value={form.min_value_aud} onChange={e => set('min_value_aud', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Maximum (AUD)</Label>
              <Input type="number" value={form.max_value_aud ?? ''} placeholder="No limit" onChange={e => set('max_value_aud', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Auto-send letters</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {builder.letter_template_approved
                ? 'Automatically queue letters for matched leads without manual approval each time.'
                : 'Approve your letter template first to enable auto-send.'}
            </p>
          </div>
          <Switch
            checked={form.auto_send}
            disabled={!builder.letter_template_approved}
            onCheckedChange={v => set('auto_send', v)}
          />
        </CardContent>
      </Card>

      {/* Service radius — plan-gated */}
      {plan !== 'starter' && (
        <Card className="border-gray-200">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Service radius</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {plan === 'growth'
                    ? 'Your map shows DAs within this distance of your business.'
                    : 'Fixed at 20km on the Professional plan.'}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{radiusKm}km</span>
            </div>
            {plan === 'growth' ? (
              <div className="space-y-1">
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={radiusKm}
                  onChange={e => setRadiusKm(Number(e.target.value))}
                  onMouseUp={() => handleRadiusSave(radiusKm)}
                  onTouchEnd={() => handleRadiusSave(radiusKm)}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>10km</span>
                  <span>25km default</span>
                  <span>50km max</span>
                </div>
                {radiusSaving && <p className="text-xs text-gray-500">Saving…</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={25}
                  disabled
                  className="w-full accent-blue-500 opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  <Link href="/dashboard/settings/billing" className="text-blue-400 hover:text-blue-300">
                    Upgrade to Growth ($349/mo)
                  </Link>{' '}to expand your radius up to 50km and access more leads.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save changes'}
        </Button>
        {saved && <span className="text-sm text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saved</span>}
      </div>

      <ChangePasswordCard />
    </div>
  )
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setNewPassword('')
    setConfirm('')
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Change password</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}
          {saved && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Password updated.</p>}
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input id="confirm-pw" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same as above" autoComplete="new-password" />
          </div>
          <Button type="submit" variant="outline" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
