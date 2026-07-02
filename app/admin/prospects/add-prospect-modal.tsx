'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddProspectModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    company_name: '',
    website: '',
    email: '',
    phone: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function close() {
    setOpen(false)
    setError(null)
    setForm({ company_name: '', website: '', email: '', phone: '', notes: '' })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'manual' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to add prospect')
      }
      close()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
      >
        + Add prospect
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Add prospect manually</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Company name *</label>
                <input
                  required
                  value={form.company_name}
                  onChange={e => set('company_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="ABC Builders Pty Ltd"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Website</label>
                <input
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="https://abcbuilders.com.au"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="info@..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="02 9876 5432"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                  placeholder="Referral from..., met at..."
                />
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 py-2 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.company_name.trim()}
                  className="flex-1 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
