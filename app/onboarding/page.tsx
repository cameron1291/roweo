'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, X, Search, ChevronRight, ChevronLeft, Loader2, Upload, Eye } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface FormData {
  company_name: string
  phone: string
  website: string
  license_number: string
  logo_url: string
  brand_color: string
  tagline: string
  letter_greeting: string
  letter_sign_off: string
  service_suburbs: string[]
  service_states: string[]
  project_types: string[]
  min_value_aud: number
  max_value_aud: number | null
}

const PROJECT_TYPES = [
  { id: 'new_dwelling',  label: 'New Dwellings',      desc: 'New homes, townhouses, duplexes' },
  { id: 'extension',    label: 'Extensions',          desc: 'Additions, second storeys, decks' },
  { id: 'renovation',   label: 'Renovations',         desc: 'Internal works, kitchens, bathrooms' },
  { id: 'pool',         label: 'Pools & Spas',        desc: 'Swimming pools, spa installations' },
  { id: 'demolition',   label: 'Demolition',          desc: 'Full or partial demolition works' },
  { id: 'commercial',   label: 'Light Commercial',    desc: 'Shop fit-outs, small commercial' },
]

const STATES = ['NSW', 'ACT', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT']

const STEPS = [
  'Company',
  'Service Areas',
  'Project Types',
  'Value Range',
  'Letter Setup',
  'Preview & Approve',
]

// ── Component ──────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suburbQuery, setSuburbQuery] = useState('')
  const [suburbResults, setSuburbResults] = useState<{ name: string; state: string; postcode: string }[]>([])
  const [searchingSuburbs, setSearchingSuburbs] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [templateApproved, setTemplateApproved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    company_name: '',
    phone: '',
    website: '',
    license_number: '',
    logo_url: '',
    brand_color: '#3B6FDB',
    tagline: '',
    letter_greeting: 'Dear Homeowner',
    letter_sign_off: 'Kind regards',
    service_suburbs: [],
    service_states: ['NSW'],
    project_types: ['extension', 'renovation'],
    min_value_aud: 0,
    max_value_aud: null,
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── Suburb search ──
  async function searchSuburbs(q: string) {
    setSuburbQuery(q)
    if (q.length < 2) { setSuburbResults([]); return }
    setSearchingSuburbs(true)
    const res = await fetch(`/api/suburbs/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSuburbResults(data)
    setSearchingSuburbs(false)
  }

  function addSuburb(name: string, state: string) {
    const key = `${name}, ${state}`
    if (form.service_suburbs.includes(key)) return
    set('service_suburbs', [...form.service_suburbs, key])
    if (!form.service_states.includes(state)) {
      set('service_states', [...form.service_states, state])
    }
    setSuburbQuery('')
    setSuburbResults([])
  }

  function removeSuburb(key: string) {
    set('service_suburbs', form.service_suburbs.filter(s => s !== key))
  }

  function toggleProjectType(id: string) {
    set('project_types', form.project_types.includes(id)
      ? form.project_types.filter(t => t !== id)
      : [...form.project_types, id])
  }

  // ── Logo upload ──
  async function handleLogoUpload(file: File) {
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Logo must be PNG, JPG, or WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2 MB.')
      return
    }
    setError('')
    setLogoUploading(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const res = await fetch(`/api/builder/logo-upload-url?ext=${ext}`)
    const { signedUrl, publicUrl } = await res.json()
    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    set('logo_url', publicUrl)
    setLogoUploading(false)
  }

  function isValidHex(color: string) {
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color)
  }

  // ── Save profile (called before step 6 preview) ──
  async function saveProfile(approved: boolean) {
    setSaving(true)
    setError('')

    // Keep suburbs in "Suburb, STATE" format — the API splits on comma to resolve coords
    const states = [...new Set(form.service_suburbs.map(s => s.split(', ')[1]).filter(Boolean))]

    const res = await fetch('/api/builder/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        service_suburbs: form.service_suburbs,
        service_states: states.length ? states : form.service_states,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
      return false
    }

    if (approved) {
      // Mark letter template approved
      await fetch('/api/builder/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter_template_approved: true }),
      })
    }

    setSaving(false)
    return true
  }

  async function handleNextFromStep5() {
    const ok = await saveProfile(false)
    if (ok) setStep(6)
  }

  async function handleApprove() {
    const ok = await saveProfile(true)
    if (ok) {
      setTemplateApproved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  function openLetterPreview() {
    window.open('/api/letters/preview?preview=1', '_blank')
  }

  // ── Validation ──
  function canProceed() {
    switch (step) {
      case 1:
        return (
          form.company_name.trim().length > 0 &&
          form.phone.trim().length > 0 &&
          form.license_number.trim().length > 0
        )
      case 2: return form.service_suburbs.length > 0 || form.service_states.length > 0
      case 3: return form.project_types.length > 0
      case 4:
        if (form.min_value_aud < 0) return false
        if (form.max_value_aud !== null && form.max_value_aud <= form.min_value_aud) return false
        return true
      case 5: return isValidHex(form.brand_color)
      default: return false
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 ${active ? 'text-gray-900' : done ? 'text-blue-600' : 'text-gray-400'}`}>
                {done
                  ? <CheckCircle className="w-4 h-4 text-blue-400" />
                  : <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center border ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-400'}`}>{n}</span>
                }
                <span className={`text-xs hidden sm:inline ${active ? 'font-medium' : ''}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1" />}
            </div>
          )
        })}
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="p-6 space-y-5">

          {/* ── Step 1: Company details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your company</h2>
                <p className="text-sm text-gray-500 mt-1">This information appears on every letter you send to homeowners.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Company name *</Label>
                <Input placeholder="Smith Building Pty Ltd" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input placeholder="02 9123 4567" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input placeholder="smithbuilding.com.au" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Builder licence number *</Label>
                <Input placeholder="NSW BL 123456" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Step 2: Service suburbs ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Where do you work?</h2>
                <p className="text-sm text-gray-500 mt-1">Add the suburbs you service. We'll match DAs in these areas to your account.</p>
              </div>

              {/* Selected suburbs */}
              {form.service_suburbs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.service_suburbs.map(s => (
                    <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                      {s}
                      <button onClick={() => removeSuburb(s)} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Search suburbs… e.g. Parramatta"
                  value={suburbQuery}
                  onChange={e => searchSuburbs(e.target.value)}
                />
                {(suburbResults.length > 0 || searchingSuburbs) && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    {searchingSuburbs && (
                      <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                      </div>
                    )}
                    {suburbResults.map(s => (
                      <button
                        key={`${s.name}-${s.state}`}
                        onClick={() => addSuburb(s.name, s.state)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                      >
                        <span className="text-gray-900">{s.name}</span>
                        <span className="text-gray-500 text-xs">{s.state} {s.postcode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* State checkboxes */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Or filter by state to receive all DAs from that state:</p>
                <div className="flex flex-wrap gap-2">
                  {STATES.map(s => {
                    const live = s === 'NSW' || s === 'ACT'
                    return (
                      <button
                        key={s}
                        onClick={() => set('service_states', form.service_states.includes(s)
                          ? form.service_states.filter(x => x !== s)
                          : [...form.service_states, s]
                        )}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          form.service_states.includes(s)
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-gray-300 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {s}{!live && ' (coming soon)'}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-amber-600 mt-2">DA data is currently live for NSW and ACT only.</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Project types ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">What work do you take on?</h2>
                <p className="text-sm text-gray-500 mt-1">We only match DAs that match your selected project types.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PROJECT_TYPES.map(pt => {
                  const selected = form.project_types.includes(pt.id)
                  return (
                    <button
                      key={pt.id}
                      onClick={() => toggleProjectType(pt.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-sm font-medium ${selected ? "text-blue-700" : "text-gray-900"}`}>
                          {pt.label}
                        </span>
                        {selected && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{pt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Value range ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Minimum project value</h2>
                <p className="text-sm text-gray-500 mt-1">We'll filter out DAs below your threshold. Many DAs don't include a stated value — those are always included.</p>
              </div>
              <div className="space-y-2">
                <Label>Minimum estimated value (AUD)</Label>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    placeholder="0"
                    value={form.min_value_aud || ''}
                    onChange={e => set('min_value_aud', Number(e.target.value) || 0)}
                    className="max-w-xs"
                  />
                </div>
                <p className="text-xs text-gray-500">Common: $0 (all DAs), $50,000 (exclude minor works), $150,000 (medium projects+)</p>
              </div>
              <div className="space-y-2">
                <Label>Maximum estimated value (optional)</Label>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={50000}
                    placeholder="No limit"
                    value={form.max_value_aud ?? ''}
                    onChange={e => set('max_value_aud', e.target.value ? Number(e.target.value) : null)}
                    className="max-w-xs"
                  />
                </div>
                <p className="text-xs text-gray-500">Leave blank to receive all DAs above your minimum.</p>
                {form.max_value_aud !== null && form.max_value_aud <= form.min_value_aud && (
                  <p className="text-xs text-red-500">Maximum must be greater than minimum.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 5: Letter setup ── */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Customise your letter</h2>
                <p className="text-sm text-gray-500 mt-1">Your letter is the homeowner's first impression of your business.</p>
              </div>

              {/* Logo upload */}
              <div className="space-y-1.5">
                <Label>Company logo</Label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {form.logo_url
                    ? (
                      <div className="flex items-center justify-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.logo_url} alt="Logo" className="h-10 object-contain" />
                        <span className="text-sm text-gray-400">Click to replace</span>
                      </div>
                    )
                    : logoUploading
                      ? <div className="flex items-center justify-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</div>
                      : <div className="text-gray-500"><Upload className="w-5 h-5 mx-auto mb-1" /><p className="text-sm">Click to upload logo (PNG or JPG, max 2MB)</p></div>
                  }
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Brand colour */}
                <div className="space-y-1.5">
                  <Label>Brand colour</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.brand_color}
                      onChange={e => set('brand_color', e.target.value)}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={form.brand_color}
                      onChange={e => set('brand_color', e.target.value)}
                      placeholder="#3B6FDB"
                      className={`font-mono text-sm ${form.brand_color && !isValidHex(form.brand_color) ? 'border-red-400 focus:border-red-400' : ''}`}
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <Label>Tagline (optional)</Label>
                  <Input
                    placeholder="Quality builds, guaranteed"
                    value={form.tagline}
                    onChange={e => set('tagline', e.target.value)}
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Letter greeting</Label>
                  <Input
                    value={form.letter_greeting}
                    onChange={e => set('letter_greeting', e.target.value)}
                    placeholder="Dear Homeowner"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sign-off</Label>
                  <Input
                    value={form.letter_sign_off}
                    onChange={e => set('letter_sign_off', e.target.value)}
                    placeholder="Kind regards"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Preview & approve ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Preview your homeowner letter</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This is what homeowners in your area will receive after lodging a development application.
                  Review it and approve before we begin sending.
                </p>
              </div>

              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={openLetterPreview}
              >
                <Eye className="w-4 h-4" /> Open letter preview (PDF)
              </Button>

              <div className="rounded-lg border border-gray-200 p-4 space-y-2 bg-gray-50">
                <p className="text-sm text-gray-700 font-medium">Your letter includes:</p>
                <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>Your company logo and brand colours</li>
                  <li>The homeowner's property address and DA reference</li>
                  <li>A personalised introduction written for the specific project type</li>
                  <li>Your contact details: {[form.phone, form.website].filter(Boolean).join(' · ') || 'add in settings'}</li>
                  <li>A unique QR code linking to your profile and quote form</li>
                  <li>A legal compliance disclaimer</li>
                </ul>
              </div>

              {templateApproved
                ? (
                  <div className="flex items-center gap-2 text-green-600 justify-center">
                    <CheckCircle className="w-5 h-5" /> Letter approved! Redirecting to your dashboard…
                  </div>
                )
                : (
                  <Button
                    className="w-full"
                    onClick={handleApprove}
                    disabled={saving}
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Approve letter & go to dashboard'}
                  </Button>
                )
              }

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navigation */}
      {step <= 6 && !templateApproved && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {step < 6 && (
            <Button
              onClick={step === 5 ? handleNextFromStep5 : () => setStep(s => s + 1)}
              disabled={!canProceed() || saving}
              className="gap-1"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <>{step === 5 ? 'Save & preview letter' : 'Next'} <ChevronRight className="w-4 h-4" /></>
              }
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
