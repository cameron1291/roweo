'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthErrorRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const error = params.get('error')
    const code = params.get('error_code')
    if (!error) return

    // Supabase lands expired/invalid auth links on the Site URL with these params.
    // Redirect to a page that can show a helpful message instead.
    if (code === 'otp_expired' || error === 'access_denied') {
      router.replace('/forgot-password?error=link_expired')
    }
  }, [params, router])

  return null
}
