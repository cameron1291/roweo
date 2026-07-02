'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, Eye, Loader2, AlertCircle, Upload, X, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface LetterFields {
  letter_template_approved: boolean
  letter_greeting: string
  letter_sign_off: string
  letter_compliance_disclaimer: string
  brand_color: string
  logo_url: string | null
  tagline: string | null
  company_name: string
  letter_body_template: string | null
  letter_note: string | null
}

const DEFAULT_BODY = `My name is [your company name]. We're a [your specialty] working in your area, and we noticed you've recently lodged a development application with council.

We'd love to reach out early — before your project goes to tender. We know the area well and can usually provide a competitive, no-obligation quote within 24 hours of hearing from you.`

const DEFAULT_NOTE = `We know that getting the right builder makes all the difference. We're a local team and we take real pride in our work. Scan the code and take a look — we'd love to hear from you.

Wishing you all the best with your project!`

const LOCKED_ITEMS = [
  'Your DA reference and property address (inserted per letter)',
  '"Licensed & insured · No-obligation quote · Fast response" feature rows',
  'The QR code (unique per homeowner)',
  '"Powered by Roweo" footer and compliance disclaimer',
]

export function LetterApprovalCard({ builder }: { builder: LetterFields }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [approved, setApproved] = useState(builder.letter_template_approved)
  const [logoUrl, setLogoUrl] = useState<string | null>(builder.logo_url)
  const [bodyText, setBodyText] = useState(builder.letter_body_template ?? DEFAULT_BODY)
  const [noteText, setNoteText] = useState(builder.letter_note ?? DEFAULT_NOTE)
  const [error, setError] = useState<string | null>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2MB'); return }

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('builder-assets').upload(path, file, { upsert: true })
    if (uploadErr) { setError('Logo upload failed'); setUploading(false); return }
    const { data } = supabase.storage.from('builder-assets').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  async function save(approve: boolean) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/builder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logo_url: logoUrl,
        letter_body_template: bodyText,
        letter_note: noteText,
        ...(approve ? { letter_template_approved: true } : {}),
      }),
    })
    if (!res.ok) { setError('Save failed — please try again'); setSaving(false); return }
    setSaving(false)
    if (approve) setApproved(true)
    router.refresh()
  }

  function openPreview() {
    window.open('/api/letters/preview?preview=1', '_blank')
  }

  return (
    <div className="space-y-6">

      {/* Status banner */}
      {approved ? (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Letter template approved — letters will be sent automatically when a DA matches.
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Not yet approved. Letters won&apos;t send until you review and approve below.
        </div>
      )}

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Your logo</Label>
        <p className="text-xs text-gray-500">Shown at the top-left of every letter. PNG or JPG, under 2MB.</p>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo" className="h-12 w-auto max-w-[160px] object-contain rounded border border-gray-200 p-1 bg-white" />
              <button
                onClick={() => setLogoUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="h-12 w-40 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 bg-gray-50">
              No logo uploaded
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload logo'}
          </Button>
        </div>
      </div>

      {/* Body paragraph */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Main paragraph</Label>
        <p className="text-xs text-gray-500">
          This is the core of your letter. Introduce your company, mention your specialty, and invite the homeowner to get in touch. Keep it natural and personal — this lands in someone&apos;s letterbox.
        </p>
        <Textarea
          value={bodyText}
          onChange={e => setBodyText(e.target.value)}
          rows={6}
          className="text-sm resize-none"
          placeholder={DEFAULT_BODY}
        />
        <p className="text-xs text-gray-400">
          Tip: mention your specialty, e.g. &quot;renovation specialist&quot;, &quot;extension builder&quot;, or &quot;granny flat experts&quot;.
        </p>
      </div>

      {/* Note from us */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">A note from us <span className="font-normal text-gray-400">(optional)</span></Label>
        <p className="text-xs text-gray-500">A short personal closing message. Shown in handwriting style below the main content.</p>
        <Textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
      </div>

      {/* Locked items */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <Lock className="w-3.5 h-3.5" /> Fixed in every letter
        </div>
        {LOCKED_ITEMS.map(item => (
          <div key={item} className="flex items-start gap-2 text-xs text-gray-500">
            <span className="text-gray-300 mt-0.5">—</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="outline" onClick={openPreview} className="gap-2">
          <Eye className="w-4 h-4" /> Preview PDF
        </Button>
        <Button variant="ghost" onClick={() => save(false)} disabled={saving || uploading}>
          Save draft
        </Button>
        <Button onClick={() => save(true)} disabled={saving || uploading} className="bg-[#1B2A4A] hover:bg-[#243660]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {approved ? 'Save & re-approve' : 'Approve letter template'}
        </Button>
      </div>
    </div>
  )
}
