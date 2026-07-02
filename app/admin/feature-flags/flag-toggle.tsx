'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function FlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const router = useRouter()
  const [current, setCurrent] = useState(enabled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    setCurrent(v => !v)
    await fetch(`/api/admin/feature-flags/${flagKey}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: !current }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={current ? 'Disable' : 'Enable'}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${current ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${current ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
